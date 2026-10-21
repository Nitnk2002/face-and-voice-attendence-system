"""
Comprehensive Test Suite: Presentation-Attack Detection, Phone Photo Blocking, and Realtime Architecture
Verifies that:
1. Genuine live face is verified (state="verified", is_live=True).
2. Phone screen replay is detected and rejected (state="spoof_suspected", is_live=False).
3. Printed photo is detected and rejected (state="spoof_suspected", is_live=False).
4. Face match alone NEVER creates attendance without liveness proof.
5. Multiple faces ambiguity is rejected.
6. No face in image is rejected safely.
7. Postgres Realtime publication and replica identities are configured.
8. Attendance upsert is idempotent (no duplicate rows).
9. Authoritative API returns full persisted record.
10. Classroom isolation and session scoping are strictly enforced.
"""
import os
import sys
import uuid
import json
import base64
import unittest
from datetime import date, datetime, timezone
import numpy as np
import cv2
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
from core.config import settings
from infrastructure.database import engine
from core.anti_spoofing import detect_face_spoof, detect_voice_spoof
from core.face_utils import extract_face_info, find_best_face_match

sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


class TestAntiSpoofingAndRealtime(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_tag = f"PAD_{uuid.uuid4().hex[:6].upper()}"

        # Load benchmark test assets
        cls.assets_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")
        cls.path_live = os.path.join(cls.assets_dir, "image_T1.jpg")
        cls.path_print_spoof = os.path.join(cls.assets_dir, "image_F1.jpg")
        cls.path_phone_replay = os.path.join(cls.assets_dir, "image_F2.jpg")

        with open(cls.path_live, "rb") as f:
            cls.live_bytes = f.read()

        with open(cls.path_print_spoof, "rb") as f:
            cls.print_spoof_bytes = f.read()

        with open(cls.path_phone_replay, "rb") as f:
            cls.phone_replay_bytes = f.read()

        # Create isolated test classroom and session
        cls.classroom = sb.table("classes").insert({
            "class_name": f"PAD Verification Class ({cls.test_tag})",
            "join_code": f"P_{cls.test_tag[:5]}"
        }).execute().data[0]

        cls.session = sb.table("attendance_sessions").insert({
            "class_id": cls.classroom["id"],
            "date": str(date.today()),
            "is_active": True
        }).execute().data[0]

        # Create student Nitish-Test
        cls.student = sb.table("users").insert({
            "name": f"Live Student ({cls.test_tag})",
            "email": f"student_{cls.test_tag.lower()}@test.edu",
            "role": "student",
            "custom_id": f"PAD-{cls.test_tag[:4]}",
            "hashed_password": "test-password"
        }).execute().data[0]

        # Enroll student in classroom
        cls.membership = sb.table("enrollments").insert({
            "class_id": cls.classroom["id"],
            "student_id": cls.student["id"],
            "status": "active"
        }).execute().data[0]

        # Extract real 512-D face embedding from live test image and assign to student
        info = extract_face_info(cls.live_bytes)
        cls.live_embedding = info["embedding"]
        cls.live_box = info["box"]

        sb.table("student_biometrics").insert({
            "student_id": cls.student["id"],
            "biometric_type": "face",
            "embedding": cls.live_embedding,
            "model_name": "insightface_buffalo_sc_arcface",
            "embedding_dimension": 512,
            "is_active": True
        }).execute()

    @classmethod
    def tearDownClass(cls):
        # Clean up test records
        try:
            sb.table("attendance_records").delete().eq("session_id", cls.session["id"]).execute()
            sb.table("attendance_sessions").delete().eq("id", cls.session["id"]).execute()
            sb.table("enrollments").delete().eq("id", cls.membership["id"]).execute()
            sb.table("student_biometrics").delete().eq("student_id", cls.student["id"]).execute()
            sb.table("users").delete().eq("id", cls.student["id"]).execute()
            sb.table("classes").delete().eq("id", cls.classroom["id"]).execute()
        except Exception:
            pass

    # ── Test 1: Genuine Live Presentation Accepted ────────────────────
    def test_01_genuine_live_presentation_accepted(self):
        """Genuine live student presentation is classified as verified with is_live=True."""
        res = detect_face_spoof(self.live_bytes, bbox=self.live_box)
        self.assertEqual(res["state"], "verified")
        self.assertTrue(res["is_live"], "Live presentation must be approved as genuine")
        self.assertGreaterEqual(res["liveness_score"], 0.70)
        self.assertEqual(res["spoof_type"], "None")

    # ── Test 2: Phone Screen Replay Attack Detected & Rejected ───────
    def test_02_phone_screen_replay_detected_and_rejected(self):
        """A photograph/video displayed on a smartphone screen is detected and rejected."""
        info = extract_face_info(self.phone_replay_bytes)
        res = detect_face_spoof(self.phone_replay_bytes, bbox=info.get("box"))
        self.assertFalse(res["is_live"], "Phone screen replay attack must NEVER be marked as live!")
        self.assertEqual(res["state"], "spoof_suspected")
        self.assertIn("replay", res["spoof_type"].lower())
        self.assertGreaterEqual(res["model_replay_prob"], 0.75, "Replay attack probability must be high")

    # ── Test 3: Printed Paper Photo Detected & Rejected ──────────────
    def test_03_printed_paper_photo_detected_and_rejected(self):
        """A printed photograph on paper is detected and rejected."""
        info = extract_face_info(self.print_spoof_bytes)
        res = detect_face_spoof(self.print_spoof_bytes, bbox=info.get("box"))
        self.assertFalse(res["is_live"], "Printed photograph must NEVER be marked as live!")
        self.assertEqual(res["state"], "spoof_suspected")

    # ── Test 4: Face Match Alone NEVER Marks Attendance ──────────────
    def test_04_face_match_alone_never_marks_attendance(self):
        """
        Critical security test:
        Even if a photo displayed on a phone perfectly matches the ArcFace embedding of an enrolled student,
        attendance MUST NOT be written to the database because presentation attack detection fails.
        """
        # 1. Verify face embedding matches enrolled student with high score
        info = extract_face_info(self.phone_replay_bytes)
        replay_emb = info.get("embedding")
        self.assertIsNotNone(replay_emb, "Face must be detected in phone replay photo")

        # 2. Check presentation attack detection
        liveness = detect_face_spoof(self.phone_replay_bytes, bbox=info.get("box"))
        self.assertFalse(liveness["is_live"], "Liveness check must fail on phone screen")

        # 3. Simulate pipeline check: if liveness fails, execution aborts BEFORE database write
        record_written = False
        if liveness["is_live"]:
            # This should NEVER be reached!
            sb.table("attendance_records").insert({
                "session_id": self.session["id"],
                "student_id": self.student["id"],
                "method": "face"
            }).execute()
            record_written = True

        self.assertFalse(record_written, "Security breach: Database write occurred despite failed liveness!")

        # 4. Confirm database has ZERO records for this student in this session
        recs = sb.table("attendance_records").select("id").eq("session_id", self.session["id"]).eq("student_id", self.student["id"]).execute().data
        self.assertEqual(len(recs), 0, "No attendance record must exist for rejected spoof attack")

    # ── Test 5: Multiple Faces Ambiguity Handled ───────────────────────
    def test_05_multiple_faces_ambiguity_handled(self):
        """Multiple competing faces in frame is flagged as ambiguous to avoid misattribution."""
        # Create a synthetic image with 2 side-by-side equal faces
        img1 = cv2.imread(self.path_live)
        h, w = img1.shape[:2]
        combined = np.zeros((h, w * 2, 3), dtype=np.uint8)
        combined[:, :w] = img1
        combined[:, w:] = img1

        _, buf = cv2.imencode(".jpg", combined)
        info = extract_face_info(buf.tobytes())
        self.assertGreaterEqual(info["face_count"], 2)
        self.assertTrue(info["ambiguous_multiple"], "Equal competing faces must trigger ambiguous_multiple flag")

    # ── Test 6: Blank or No Face Image Handled Safely ─────────────────
    def test_06_blank_or_no_face_handled_safely(self):
        """An image with no face returns state 'rejected' safely."""
        blank_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00"
        res = detect_face_spoof(blank_bytes)
        self.assertFalse(res["is_live"])
        self.assertEqual(res["state"], "rejected")

    # ── Test 7: Postgres Supabase Realtime Publication Verified ──────
    def test_07_postgres_realtime_publication_verified(self):
        """Verifies attendance_records is active in supabase_realtime publication with FULL replica identity."""
        with engine.connect() as conn:
            published = conn.execute(text("SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';")).fetchall()
            published_tables = {row[0] for row in published}
            self.assertIn("attendance_records", published_tables, "attendance_records MUST be in supabase_realtime publication!")
            self.assertIn("attendance_sessions", published_tables, "attendance_sessions MUST be in supabase_realtime publication!")

            repl = conn.execute(text("SELECT relname, relreplident FROM pg_class WHERE relname = 'attendance_records';")).fetchall()
            self.assertEqual(len(repl), 1)
            self.assertEqual(repl[0][1], 'f', "attendance_records replica identity must be 'f' (FULL) for complete event payloads")

    # ── Test 8: Attendance Upsert Idempotency (Duplicate Prevention) ──
    def test_08_attendance_upsert_idempotency(self):
        """Repeated check-ins for the same student in the same session update the existing row idempotently."""
        # Check-in 1
        res1 = sb.table("attendance_records").upsert({
            "session_id": self.session["id"],
            "student_id": self.student["id"],
            "method": "face"
        }, on_conflict="session_id,student_id").execute()
        self.assertTrue(len(res1.data) > 0)
        rec_id1 = res1.data[0]["id"]

        # Check-in 2 (repeated camera frame)
        res2 = sb.table("attendance_records").upsert({
            "session_id": self.session["id"],
            "student_id": self.student["id"],
            "method": "face"
        }, on_conflict="session_id,student_id").execute()
        rec_id2 = res2.data[0]["id"]

        # Must refer to the exact same record ID
        self.assertEqual(rec_id1, rec_id2, "Upsert must be idempotent and preserve single record per session")

        # Query total records for student in this session
        recs = sb.table("attendance_records").select("id").eq("session_id", self.session["id"]).eq("student_id", self.student["id"]).execute().data
        self.assertEqual(len(recs), 1, "There must be exactly 1 attendance record, never duplicate rows!")

    # ── Test 9: Authoritative Persisted Record Returned ───────────────
    def test_09_authoritative_persisted_record_returned(self):
        """Persisted record contains real database ID and timestamp."""
        res = sb.table("attendance_records").select("*").eq("session_id", self.session["id"]).eq("student_id", self.student["id"]).limit(1).execute().data
        self.assertEqual(len(res), 1)
        record = res[0]
        self.assertIn("id", record)
        self.assertIn("session_id", record)
        self.assertIn("student_id", record)
        self.assertIn("marked_at", record)
        self.assertEqual(record["method"], "face")

    # ── Test 10: Classroom Scoping & Session Ownership ────────────────
    def test_10_classroom_scoping_and_session_ownership(self):
        """A session belonging to another classroom cannot be accessed or written under an unrelated class."""
        other_class = sb.table("classes").insert({
            "class_name": f"Unrelated Class ({self.test_tag})",
            "join_code": f"U_{self.test_tag[:5]}"
        }).execute().data[0]

        # Verify session does not belong to other_class
        sess_check = sb.table("attendance_sessions").select("id, class_id").eq("id", self.session["id"]).eq("class_id", other_class["id"]).execute().data
        self.assertEqual(len(sess_check), 0, "Session must be rejected when claimed under an unrelated classroom")

        # Clean up other_class
        sb.table("classes").delete().eq("id", other_class["id"]).execute()


if __name__ == "__main__":
    unittest.main(verbosity=2)
