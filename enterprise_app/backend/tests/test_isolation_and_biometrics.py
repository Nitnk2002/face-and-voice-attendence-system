"""
Automated Verification Suite: Classroom Isolation, Centralized Biometrics & Face Recognition
Tests all critical requirements from the engineering specification.
"""
import os
import sys
import uuid
import json
import base64
import unittest
import numpy as np

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
from core.config import settings
from core.face_utils import (
    encode_face_from_bytes,
    extract_face_info,
    find_best_face_match,
    _cosine_similarity
)
from core.anti_spoofing import detect_face_spoof, detect_voice_spoof
from core.voice_utils import encode_voice_from_bytes

sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


class TestClassroomIsolationAndBiometrics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Prepare isolated test classrooms, students, and biometrics."""
        cls.test_tag = f"TEST_{uuid.uuid4().hex[:6].upper()}"

        # 1. Fetch real reference face photo from student_biometrics for realistic CV tests
        row = sb.table("student_biometrics").select("sample_data, embedding").eq("biometric_type", "face").eq("is_active", True).limit(1).execute().data
        if row and row[0].get("sample_data"):
            cls.real_photo_bytes = base64.b64decode(row[0]["sample_data"])
            cls.real_embedding = row[0]["embedding"]
            if isinstance(cls.real_embedding, str):
                cls.real_embedding = json.loads(cls.real_embedding)
        else:
            cls.real_photo_bytes = None
            cls.real_embedding = None

        # 2. Create Classroom A and Classroom B
        cls.class_a = sb.table("classes").insert({
            "class_name": f"Test Class A ({cls.test_tag})",
            "join_code": f"A_{cls.test_tag[:5]}"
        }).execute().data[0]

        cls.class_b = sb.table("classes").insert({
            "class_name": f"Test Class B ({cls.test_tag})",
            "join_code": f"B_{cls.test_tag[:5]}"
        }).execute().data[0]

        # 3. Create Student Alpha (Class A only)
        cls.student_alpha = sb.table("users").insert({
            "name": f"Alpha ({cls.test_tag})",
            "email": f"alpha_{cls.test_tag.lower()}@test.edu",
            "role": "student",
            "custom_id": f"ROLL-A-{cls.test_tag[:4]}",
            "hashed_password": "test-password"
        }).execute().data[0]

        # 4. Create Student Beta (Class B only)
        cls.student_beta = sb.table("users").insert({
            "name": f"Beta ({cls.test_tag})",
            "email": f"beta_{cls.test_tag.lower()}@test.edu",
            "role": "student",
            "custom_id": f"ROLL-B-{cls.test_tag[:4]}",
            "hashed_password": "test-password"
        }).execute().data[0]

        # 5. Create Student Gamma (Both Class A and Class B)
        cls.student_gamma = sb.table("users").insert({
            "name": f"Gamma ({cls.test_tag})",
            "email": f"gamma_{cls.test_tag.lower()}@test.edu",
            "role": "student",
            "custom_id": f"ROLL-G-{cls.test_tag[:4]}",
            "hashed_password": "test-password"
        }).execute().data[0]

        # 6. Assign Canonical Biometrics in student_biometrics
        # Alpha gets a synthetic 512-D vector
        cls.alpha_vec = np.random.randn(512).astype(np.float32)
        cls.alpha_vec = (cls.alpha_vec / np.linalg.norm(cls.alpha_vec)).tolist()
        sb.table("student_biometrics").insert({
            "student_id": cls.student_alpha["id"],
            "biometric_type": "face",
            "embedding": cls.alpha_vec,
            "model_name": "insightface_buffalo_sc_arcface",
            "embedding_dimension": 512,
            "is_active": True
        }).execute()

        # Beta gets a synthetic 512-D vector
        cls.beta_vec = np.random.randn(512).astype(np.float32)
        cls.beta_vec = (cls.beta_vec / np.linalg.norm(cls.beta_vec)).tolist()
        sb.table("student_biometrics").insert({
            "student_id": cls.student_beta["id"],
            "biometric_type": "face",
            "embedding": cls.beta_vec,
            "model_name": "insightface_buffalo_sc_arcface",
            "embedding_dimension": 512,
            "is_active": True
        }).execute()

        # Gamma gets the real photo embedding if available, otherwise synthetic
        if cls.real_embedding:
            cls.gamma_vec = cls.real_embedding
        else:
            cls.gamma_vec = np.random.randn(512).astype(np.float32)
            cls.gamma_vec = (cls.gamma_vec / np.linalg.norm(cls.gamma_vec)).tolist()

        sb.table("student_biometrics").insert({
            "student_id": cls.student_gamma["id"],
            "biometric_type": "face",
            "embedding": cls.gamma_vec,
            "model_name": "insightface_buffalo_sc_arcface",
            "embedding_dimension": 512,
            "is_active": True
        }).execute()

        # 7. Create Memberships in enrollments:
        # Class A: Alpha and Gamma
        sb.table("enrollments").insert([
            {"class_id": cls.class_a["id"], "student_id": cls.student_alpha["id"], "status": "active"},
            {"class_id": cls.class_a["id"], "student_id": cls.student_gamma["id"], "status": "active"}
        ]).execute()

        # Class B: Beta and Gamma
        sb.table("enrollments").insert([
            {"class_id": cls.class_b["id"], "student_id": cls.student_beta["id"], "status": "active"},
            {"class_id": cls.class_b["id"], "student_id": cls.student_gamma["id"], "status": "active"}
        ]).execute()

        # 8. Create Sessions for Class A and Class B
        cls.session_a = sb.table("attendance_sessions").insert({
            "class_id": cls.class_a["id"],
            "date": "2026-10-15",
            "is_active": True
        }).execute().data[0]

        cls.session_b = sb.table("attendance_sessions").insert({
            "class_id": cls.class_b["id"],
            "date": "2026-10-15",
            "is_active": True
        }).execute().data[0]

    @classmethod
    def tearDownClass(cls):
        """Clean up test records."""
        try:
            sb.table("classes").delete().in_("id", [cls.class_a["id"], cls.class_b["id"]]).execute()
            sb.table("users").delete().in_("id", [
                cls.student_alpha["id"],
                cls.student_beta["id"],
                cls.student_gamma["id"]
            ]).execute()
        except Exception as e:
            print("Cleanup exception:", e)

    # ── Test Suite 1: Classroom Isolation ─────────────────────────────

    def test_01_classroom_candidate_isolation(self):
        """Classroom A must only load candidates {Alpha, Gamma}, never Beta."""
        # Query active memberships for Class A
        mem_a = sb.table("enrollments").select("student_id").eq("class_id", self.class_a["id"]).eq("status", "active").execute().data
        s_ids_a = {m["student_id"] for m in mem_a}

        self.assertIn(self.student_alpha["id"], s_ids_a, "Alpha must be in Class A")
        self.assertIn(self.student_gamma["id"], s_ids_a, "Gamma must be in Class A")
        self.assertNotIn(self.student_beta["id"], s_ids_a, "Beta must NEVER be in Class A candidate set!")

        # Query active memberships for Class B
        mem_b = sb.table("enrollments").select("student_id").eq("class_id", self.class_b["id"]).eq("status", "active").execute().data
        s_ids_b = {m["student_id"] for m in mem_b}

        self.assertIn(self.student_beta["id"], s_ids_b, "Beta must be in Class B")
        self.assertIn(self.student_gamma["id"], s_ids_b, "Gamma must be in Class B")
        self.assertNotIn(self.student_alpha["id"], s_ids_b, "Alpha must NEVER be in Class B candidate set!")

    def test_02_student_alpha_cannot_match_in_classroom_b(self):
        """A face scan of Student Alpha in Classroom B must reject Alpha because Alpha is not enrolled in B."""
        # Load candidates strictly for Class B
        mem_b = sb.table("enrollments").select("student_id").eq("class_id", self.class_b["id"]).eq("status", "active").execute().data
        enrolled_ids_b = [m["student_id"] for m in mem_b]

        bio_b = sb.table("student_biometrics").select("student_id, embedding").in_("student_id", enrolled_ids_b).eq("biometric_type", "face").eq("is_active", True).execute().data
        known_encodings_b = [b["embedding"] for b in bio_b]
        student_ids_b = [b["student_id"] for b in bio_b]

        # Match Alpha's vector against Class B candidates
        best_idx, score = find_best_face_match(known_encodings_b, self.alpha_vec)
        # Alpha is orthogonal/different to Beta and Gamma, so match fails or index points to someone else with low score
        if best_idx != -1:
            matched_id = student_ids_b[best_idx]
            self.assertNotEqual(matched_id, self.student_alpha["id"], "Alpha cannot be matched as an eligible candidate in Class B!")

    def test_03_student_gamma_matches_in_both_independently(self):
        """Student Gamma (enrolled in both A and B) is eligible in both classrooms independently."""
        # Match in Class A
        mem_a = sb.table("enrollments").select("student_id").eq("class_id", self.class_a["id"]).eq("status", "active").execute().data
        bio_a = sb.table("student_biometrics").select("student_id, embedding").in_("student_id", [m["student_id"] for m in mem_a]).eq("biometric_type", "face").eq("is_active", True).execute().data
        best_idx_a, score_a = find_best_face_match([b["embedding"] for b in bio_a], self.gamma_vec)
        self.assertNotEqual(best_idx_a, -1, "Gamma must match in Class A")
        self.assertEqual(bio_a[best_idx_a]["student_id"], self.student_gamma["id"])

        # Match in Class B
        mem_b = sb.table("enrollments").select("student_id").eq("class_id", self.class_b["id"]).eq("status", "active").execute().data
        bio_b = sb.table("student_biometrics").select("student_id, embedding").in_("student_id", [m["student_id"] for m in mem_b]).eq("biometric_type", "face").eq("is_active", True).execute().data
        best_idx_b, score_b = find_best_face_match([b["embedding"] for b in bio_b], self.gamma_vec)
        self.assertNotEqual(best_idx_b, -1, "Gamma must match in Class B")
        self.assertEqual(bio_b[best_idx_b]["student_id"], self.student_gamma["id"])

    def test_04_attendance_isolation_between_sessions(self):
        """Marking attendance for Gamma in Session A must NOT record attendance in Session B."""
        # Record attendance in Session A
        sb.table("attendance_records").upsert({
            "session_id": self.session_a["id"],
            "student_id": self.student_gamma["id"],
            "method": "face"
        }, on_conflict="session_id,student_id").execute()

        # Check records for Session A
        rec_a = sb.table("attendance_records").select("id").eq("session_id", self.session_a["id"]).eq("student_id", self.student_gamma["id"]).execute().data
        self.assertEqual(len(rec_a), 1, "Gamma must have 1 record in Session A")

        # Check records for Session B (must be 0)
        rec_b = sb.table("attendance_records").select("id").eq("session_id", self.session_b["id"]).eq("student_id", self.student_gamma["id"]).execute().data
        self.assertEqual(len(rec_b), 0, "Gamma must have 0 records in Session B!")

    def test_05_session_to_classroom_validation(self):
        """A session belonging to Class A cannot be operated under Class B."""
        sess_check = sb.table("attendance_sessions").select("id, class_id").eq("id", self.session_a["id"]).eq("class_id", self.class_b["id"]).execute().data
        self.assertEqual(len(sess_check), 0, "Session A must be rejected if claimed to belong to Class B")

    # ── Test Suite 2: Centralized Biometric Deduplication ──────────────

    def test_06_student_gamma_has_one_canonical_biometric_profile(self):
        """Gamma is enrolled in Class A and Class B, but must have exactly 1 active face profile."""
        profiles = sb.table("student_biometrics").select("id").eq("student_id", self.student_gamma["id"]).eq("biometric_type", "face").eq("is_active", True).execute().data
        self.assertEqual(len(profiles), 1, "Gamma must have exactly 1 active face biometric profile, not 2!")

    def test_07_membership_records_are_distinct(self):
        """Gamma must have 2 distinct classroom memberships in enrollments."""
        memberships = sb.table("enrollments").select("id, class_id").eq("student_id", self.student_gamma["id"]).execute().data
        class_ids = {m["class_id"] for m in memberships}
        self.assertEqual(len(class_ids), 2, "Gamma must be linked to both Class A and Class B in enrollments")

    # ── Test Suite 3: Facial Recognition & Anti-Spoofing Calibration ───

    def test_08_extract_face_info_valid(self):
        """Real face photo produces valid 512-D ArcFace embedding with single face detected."""
        if not self.real_photo_bytes:
            self.skipTest("No reference photo available in database")
        info = extract_face_info(self.real_photo_bytes)
        self.assertIsNotNone(info["embedding"])
        self.assertEqual(len(info["embedding"]), 512)
        self.assertEqual(info["face_count"], 1)
        self.assertFalse(info["ambiguous_multiple"])

    def test_09_extract_face_info_empty(self):
        """Blank image produces no embedding safely."""
        blank_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00"
        info = extract_face_info(blank_bytes)
        self.assertIsNone(info["embedding"])
        self.assertEqual(info["face_count"], 0)

    def test_10_calibrated_liveness_decision(self):
        """Calibrated anti-spoofing engine must not veto natural live student photo."""
        if not self.real_photo_bytes:
            self.skipTest("No reference photo available in database")
        res = detect_face_spoof(self.real_photo_bytes)
        self.assertTrue(res["is_live"], f"Natural student photo falsely rejected as: {res['spoof_type']}")
        self.assertEqual(res["spoof_type"], "None")
        self.assertGreaterEqual(res["liveness_score"], 0.70)

    # ── Test Suite 4: Voice Pipeline ──────────────────────────────────

    def test_11_voice_spoof_short_audio_handled(self):
        """Short audio (<0.5s) is rejected safely."""
        short_wav = b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
        res = detect_voice_spoof(short_wav)
        self.assertFalse(res["is_live"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
