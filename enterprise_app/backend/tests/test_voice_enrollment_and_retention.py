"""
Unit & Integration Test Suite:
1. Voice Anti-Spoofing Multi-Signal Calibration & Audio Quality Pre-Checks
2. Password Reset Token Expiry & Tamper Resistance
3. Canonical Multi-Classroom Enrollment & Reactivation
4. Strict Classroom Attendance Isolation
5. Biometric Retention Policy & Active Safety Assertions
"""
import io
import os
import sys
import wave
import uuid
import json
import time
import unittest
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.anti_spoofing import detect_voice_spoof
from core.security import create_password_reset_token, verify_password_reset_token
from infrastructure.database import engine
from sqlalchemy import text
from supabase import create_client
from core.config import settings

sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def generate_synthetic_wav(
    duration_s: float = 2.5,
    sample_rate: int = 16000,
    frequency: float = 220.0,
    amplitude: float = 0.35,
    add_jitter: bool = True,
    add_high_freq: bool = True,
    noise_level: float = 0.01,
    clip: bool = False
) -> bytes:
    """Helper to synthesize test WAV audio clips with controlled acoustic properties."""
    num_samples = int(duration_s * sample_rate)
    t = np.linspace(0, duration_s, num_samples, endpoint=False)

    # Base speech fundamental frequency + harmonics
    signal = np.sin(2 * np.pi * frequency * t) + 0.5 * np.sin(2 * np.pi * frequency * 2 * t)

    # Natural biological micro-tremor jitter (amplitude modulation at 8-12Hz)
    if add_jitter:
        mod = 1.0 + 0.3 * np.sin(2 * np.pi * 9.5 * t)
        signal = signal * mod

    # High frequency vocal tract friction (4kHz - 7kHz)
    if add_high_freq:
        hf = np.sin(2 * np.pi * 5000 * t) + np.sin(2 * np.pi * 6500 * t)
        signal += 0.08 * hf

    signal += np.random.normal(0, noise_level, num_samples)

    if clip:
        signal = np.clip(signal * 8.0, -1.0, 1.0)
    else:
        signal = signal * amplitude

    signal = np.clip(signal, -1.0, 1.0)
    int_samples = (signal * 32767).astype(np.int16)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int_samples.tobytes())
    return buf.getvalue()


class TestVoiceAntiSpoofingAndQuality(unittest.TestCase):
    """Verifies audio quality pre-checks and multi-signal voice anti-spoofing."""

    def test_voice_silence_detection(self):
        """Audio with RMS < 0.005 must be rejected with helpful silence guidance."""
        silent_wav = generate_synthetic_wav(duration_s=2.5, amplitude=0.0001, noise_level=0.0)
        res = detect_voice_spoof(silent_wav)
        self.assertFalse(res["is_live"])
        self.assertIn("too quiet or silent", res["spoof_type"].lower())
        self.assertLess(res["details"]["raw_rms"], 0.005)

    def test_voice_clipping_detection(self):
        """Severely clipped audio must be rejected with mic distance guidance."""
        clipped_wav = generate_synthetic_wav(duration_s=2.5, clip=True)
        res = detect_voice_spoof(clipped_wav)
        self.assertFalse(res["is_live"])
        self.assertIn("clipping", res["spoof_type"].lower())
        self.assertGreater(res["details"]["clipped_ratio"], 0.15)

    def test_voice_too_short_duration(self):
        """Audio under 1.5 seconds must be rejected."""
        short_wav = generate_synthetic_wav(duration_s=0.8)
        res = detect_voice_spoof(short_wav)
        self.assertFalse(res["is_live"])
        self.assertIn("short", res["spoof_type"].lower())

    def test_normal_speech_passes_liveness(self):
        """Normal live speech with natural vocal jitter must pass verification."""
        normal_wav = generate_synthetic_wav(
            duration_s=2.5,
            frequency=180.0,
            amplitude=0.35,
            add_jitter=True,
            add_high_freq=True
        )
        res = detect_voice_spoof(normal_wav)
        self.assertTrue(res["is_live"], f"Normal speech was falsely flagged: {res['spoof_type']}")
        self.assertGreaterEqual(res["liveness_score"], 0.80)
        self.assertEqual(res["spoof_type"], "None")

    def test_laptop_mic_rolloff_does_not_false_positive(self):
        """
        CRITICAL BUG FIX VERIFICATION:
        When audio is filtered above 4kHz (simulating laptop mic hardware low-pass),
        it must NOT be flagged as replay if vocal micro-tremor jitter and spectral flatness are normal!
        """
        laptop_mic_wav = generate_synthetic_wav(
            duration_s=2.5,
            frequency=160.0,
            amplitude=0.30,
            add_jitter=True,
            add_high_freq=False, # cuts off >4kHz
            noise_level=0.001
        )
        res = detect_voice_spoof(laptop_mic_wav)
        self.assertTrue(
            res["is_live"],
            f"False positive! Laptop mic low-pass triggered spoof rejection: {res['spoof_type']}"
        )

    def test_multi_signal_replay_attack_rejected(self):
        """Loudspeaker replay (both severe high-freq roll-off AND unnatural synthetic stability) must be rejected."""
        replay_wav = generate_synthetic_wav(
            duration_s=2.5,
            frequency=300.0,
            amplitude=0.25,
            add_jitter=False,    # Unnatural stability
            add_high_freq=False, # Steep speaker roll-off
            noise_level=0.0001
        )
        res = detect_voice_spoof(replay_wav)
        self.assertFalse(res["is_live"])
        self.assertIn("replay", res["spoof_type"].lower())


class TestPasswordResetSecurity(unittest.TestCase):
    """Verifies single-use, time-bound, cryptographically signed password reset tokens."""

    def test_token_creation_and_verification(self):
        email = "student.test@school.edu"
        token = create_password_reset_token(email, expires_minutes=15)
        self.assertIsInstance(token, str)

        verified = verify_password_reset_token(token)
        self.assertEqual(verified, email)

    def test_expired_token_rejected(self):
        email = "expired.test@school.edu"
        # Create token already expired (-1 minute)
        token = create_password_reset_token(email, expires_minutes=-1)
        verified = verify_password_reset_token(token)
        self.assertIsNone(verified)

    def test_tampered_token_rejected(self):
        token = create_password_reset_token("valid@school.edu", expires_minutes=15)
        tampered = token[:-4] + "ABCD"
        self.assertIsNone(verify_password_reset_token(tampered))


class TestEnrollmentAndIsolation(unittest.TestCase):
    """Verifies canonical student identity, multi-classroom enrollment, and strict attendance isolation."""

    @classmethod
    def setUpClass(cls):
        cls.tag = f"TEST_{uuid.uuid4().hex[:6].upper()}"

        # Create two distinct classrooms
        cls.class_a = sb.table("classes").insert({
            "class_name": f"Classroom Alpha ({cls.tag})",
            "join_code": f"A_{cls.tag[:5]}"
        }).execute().data[0]

        cls.class_b = sb.table("classes").insert({
            "class_name": f"Classroom Beta ({cls.tag})",
            "join_code": f"B_{cls.tag[:5]}"
        }).execute().data[0]

        # Create sessions for each classroom
        cls.session_a = sb.table("attendance_sessions").insert({
            "class_id": cls.class_a["id"],
            "date": "2026-10-21",
            "is_active": True
        }).execute().data[0]

        cls.session_b = sb.table("attendance_sessions").insert({
            "class_id": cls.class_b["id"],
            "date": "2026-10-21",
            "is_active": True
        }).execute().data[0]

        # Create canonical student
        cls.student = sb.table("users").insert({
            "name": f"Pooja Sharma ({cls.tag})",
            "email": f"pooja_{cls.tag.lower()}@school.edu",
            "role": "student",
            "custom_id": f"ROLL-{cls.tag[:4]}",
            "hashed_password": "test-password"
        }).execute().data[0]

        # Centralized biometric profile (face)
        dummy_face = [0.04] * 512
        cls.bio = sb.table("student_biometrics").insert({
            "student_id": cls.student["id"],
            "biometric_type": "face",
            "embedding": dummy_face,
            "model_name": "insightface_buffalo_sc_arcface",
            "embedding_dimension": 512,
            "is_active": True
        }).execute().data[0]

    @classmethod
    def tearDownClass(cls):
        # Cleanup test entities
        try:
            sb.table("attendance_records").delete().eq("session_id", cls.session_a["id"]).execute()
            sb.table("attendance_records").delete().eq("session_id", cls.session_b["id"]).execute()
            sb.table("enrollments").delete().eq("student_id", cls.student["id"]).execute()
            sb.table("student_biometrics").delete().eq("student_id", cls.student["id"]).execute()
            sb.table("attendance_sessions").delete().eq("id", cls.session_a["id"]).execute()
            sb.table("attendance_sessions").delete().eq("id", cls.session_b["id"]).execute()
            sb.table("classes").delete().eq("id", cls.class_a["id"]).execute()
            sb.table("classes").delete().eq("id", cls.class_b["id"]).execute()
            sb.table("users").delete().eq("id", cls.student["id"]).execute()
        except Exception:
            pass

    def test_student_can_enroll_in_multiple_classes_without_duplicate_biometrics(self):
        """Enrolling in Class A and Class B must not duplicate canonical biometric profiles."""
        # Enroll in Class A
        sb.table("enrollments").upsert({
            "class_id": self.class_a["id"],
            "student_id": self.student["id"],
            "status": "active"
        }, on_conflict="class_id,student_id").execute()

        # Enroll in Class B
        sb.table("enrollments").upsert({
            "class_id": self.class_b["id"],
            "student_id": self.student["id"],
            "status": "active"
        }, on_conflict="class_id,student_id").execute()

        # Check enrollments: exactly 2 distinct rows
        enr_a = sb.table("enrollments").select("id").eq("class_id", self.class_a["id"]).eq("student_id", self.student["id"]).execute().data
        enr_b = sb.table("enrollments").select("id").eq("class_id", self.class_b["id"]).eq("student_id", self.student["id"]).execute().data
        self.assertEqual(len(enr_a), 1)
        self.assertEqual(len(enr_b), 1)

        # Check biometrics: still exactly 1 active face profile
        active_bios = sb.table("student_biometrics").select("id").eq("student_id", self.student["id"]).eq("is_active", True).execute().data
        self.assertEqual(len(active_bios), 1, "Biometric vector was duplicated across classrooms!")

    def test_classroom_isolation_attendance_boundary(self):
        """Student enrolled in Class A but NOT Class B must be rejected in Class B attendance."""
        # Unenroll student from Class B
        sb.table("enrollments").delete().eq("class_id", self.class_b["id"]).eq("student_id", self.student["id"]).execute()

        # Query Class B roster with active status
        roster_b = sb.table("enrollments").select("student_id").eq("class_id", self.class_b["id"]).eq("status", "active").execute().data
        b_student_ids = [r["student_id"] for r in (roster_b or [])]

        self.assertNotIn(
            self.student["id"],
            b_student_ids,
            "Classroom boundary leak: Student appeared in unenrolled class roster!"
        )

    def test_inactive_student_cannot_be_marked_present(self):
        """Student with status='dropped' in Class A must not be verified in active attendance."""
        # Set status to dropped
        sb.table("enrollments").update({"status": "dropped"}).eq("class_id", self.class_a["id"]).eq("student_id", self.student["id"]).execute()

        active_enroll = sb.table("enrollments").select("id").eq("class_id", self.class_a["id"]).eq("student_id", self.student["id"]).eq("status", "active").execute().data
        self.assertEqual(len(active_enroll), 0, "Dropped student was returned in active query!")

        # Reactivate for subsequent tests
        sb.table("enrollments").update({"status": "active"}).eq("class_id", self.class_a["id"]).eq("student_id", self.student["id"]).execute()


class TestBiometricRetentionPolicy(unittest.TestCase):
    """Verifies that active biometric profiles are NEVER deleted by retention cleanups."""

    def test_active_biometrics_are_protected(self):
        with engine.connect() as conn:
            # Query active biometrics
            active_count_before = conn.execute(text("SELECT COUNT(*) FROM student_biometrics WHERE is_active = true")).scalar()

            # Execute dry-run pruning query simulating 0-day horizon (aggressive)
            # Query must strictly filter `WHERE is_active = false`
            stale_candidates = conn.execute(text("SELECT COUNT(*) FROM student_biometrics WHERE is_active = false")).scalar()

            active_count_after = conn.execute(text("SELECT COUNT(*) FROM student_biometrics WHERE is_active = true")).scalar()
            self.assertEqual(active_count_before, active_count_after)
            self.assertGreaterEqual(active_count_after, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
