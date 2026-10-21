import json
import base64
from datetime import datetime, date, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from supabase import create_client, Client

from infrastructure.database import get_db
from domain.models.attendance import AttendanceRecord, Enrollment, Class, StudentBiometric, AttendanceSession
from domain.models.user import User
from core.config import settings
from core.face_utils import encode_face_from_bytes, find_best_face_match, extract_face_info
from core.voice_utils import encode_voice_from_bytes
from core.anti_spoofing import detect_face_spoof, detect_voice_spoof

router = APIRouter()

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


# ── Manual Attendance Endpoints (with Classroom Membership Validation) ─────
class AttendanceCreate(BaseModel):
    class_id: str
    student_id: str
    status: str = "Present"
    notes: Optional[str] = None
    session_id: Optional[str] = None


@router.post("/")
def mark_manual_attendance(data: AttendanceCreate, db: Session = Depends(get_db)):
    """
    Mark manual attendance with strict classroom membership verification.
    """
    sb = get_supabase()

    # 1. Verify classroom exists
    cls = sb.table("classes").select("id").eq("id", data.class_id).maybe_single().execute()
    if not cls.data:
        raise HTTPException(status_code=404, detail="Classroom not found.")

    # 2. Strict Classroom Membership Check
    enrollment = sb.table("enrollments").select("id, status").eq("class_id", data.class_id).eq("student_id", data.student_id).eq("status", "active").maybe_single().execute()
    if not enrollment.data:
        raise HTTPException(status_code=400, detail="Student is not an active member of this classroom.")

    # 3. Resolve Session
    target_session_id = data.session_id
    if target_session_id:
        sess = sb.table("attendance_sessions").select("id, class_id").eq("id", target_session_id).maybe_single().execute()
        if not sess.data or sess.data["class_id"] != data.class_id:
            raise HTTPException(status_code=400, detail="Session does not belong to this classroom.")
    else:
        active_sess = sb.table("attendance_sessions").select("id").eq("class_id", data.class_id).eq("is_active", True).limit(1).execute()
        if active_sess.data:
            target_session_id = active_sess.data[0]["id"]
        else:
            ins = sb.table("attendance_sessions").insert({
                "class_id": data.class_id,
                "date": str(date.today()),
                "is_active": True
            }).execute()
            target_session_id = ins.data[0]["id"]

    # 4. Upsert attendance record
    rec = sb.table("attendance_records").upsert({
        "session_id": target_session_id,
        "student_id": data.student_id,
        "method": "manual"
    }, on_conflict="session_id,student_id").execute()

    record_data = rec.data[0] if (rec and rec.data) else {}

    return {
        "status": "success",
        "state": "verified",
        "session_id": target_session_id,
        "student_id": data.student_id,
        "class_id": data.class_id,
        "record": {
            "id": record_data.get("id"),
            "session_id": target_session_id,
            "student_id": data.student_id,
            "marked_at": record_data.get("marked_at") or datetime.now(timezone.utc).isoformat(),
            "method": "manual"
        }
    }


def fetch_one(query):
    try:
        res = query.limit(1).execute()
        if res and res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass
    return None


# ── AI Biometric Face Scanning Endpoint (Strict Classroom Isolation) ─────
@router.post("/scan-face")
async def scan_face(
    class_id: str = Form(...),
    session_id: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """
    Scans a webcam frame for classroom attendance.
    Strictly isolated:
    1. Validates classroom existence and session ownership.
    2. Retrieves active memberships for THIS classroom only.
    3. Loads active biometric profiles from student_biometrics for ONLY those students.
    4. Rejects frames with anti-spoofing presentation attack consensus or multiple competing faces.
    5. Matches candidate against only classroom members.
    6. Records attendance strictly for this classroom's session.
    """
    file_bytes = await file.read()
    sb = get_supabase()

    # 1. Validate Classroom
    classroom = fetch_one(sb.table("classes").select("id, class_name").eq("id", class_id))
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")
    class_name = classroom["class_name"]

    # 2. Validate Session belongs strictly to this classroom
    target_session_id = session_id
    if target_session_id:
        sess = fetch_one(sb.table("attendance_sessions").select("id, class_id, is_active").eq("id", target_session_id))
        if not sess:
            raise HTTPException(status_code=404, detail="Attendance session not found.")
        if sess["class_id"] != class_id:
            raise HTTPException(
                status_code=400,
                detail="Security Violation: Attendance session does not belong to the requested classroom."
            )
    else:
        sess_res = sb.table("attendance_sessions").select("id").eq("class_id", class_id).eq("is_active", True).order("created_at", desc=True).limit(1).execute()
        sessions = sess_res.data or []
        if not sessions:
            insert_res = sb.table("attendance_sessions").insert({
                "class_id": class_id,
                "date": str(date.today()),
                "is_active": True
            }).execute()
            sessions = insert_res.data or []
        if not sessions:
            raise HTTPException(status_code=500, detail="Could not retrieve or create a classroom session.")
        target_session_id = sessions[0]["id"]

    # 3. STRICT CLASSROOM ISOLATION: Retrieve active memberships for THIS classroom only
    mem_res = sb.table("enrollments").select("student_id").eq("class_id", class_id).eq("status", "active").execute()
    memberships = mem_res.data or []
    if not memberships:
        return {
            "matched": False,
            "detail": "Classroom isolation: No students are currently enrolled in this classroom."
        }

    enrolled_student_ids = list({m["student_id"] for m in memberships if m.get("student_id")})

    # 4. Load Active Biometric Templates for ONLY those enrolled students from student_biometrics
    bio_res = sb.table("student_biometrics").select("student_id, embedding").in_("student_id", enrolled_student_ids).eq("biometric_type", "face").eq("is_active", True).execute()
    biometrics_rows = bio_res.data or []

    known_encodings = []
    student_ids = []
    found_student_ids = set()

    for b in biometrics_rows:
        enc = b.get("embedding")
        if isinstance(enc, str):
            try:
                enc = json.loads(enc)
            except Exception:
                continue
        if enc and len(enc) == 512:
            known_encodings.append(enc)
            student_ids.append(b["student_id"])
            found_student_ids.add(b["student_id"])

    # Fallback to legacy enrollments table for any enrolled student not yet in student_biometrics
    missing_ids = list(set(enrolled_student_ids) - found_student_ids)
    if missing_ids:
        leg_res = sb.table("enrollments").select("student_id, face_encoding").eq("class_id", class_id).in_("student_id", missing_ids).execute()
        for leg in (leg_res.data or []):
            enc = leg.get("face_encoding")
            if isinstance(enc, str):
                try:
                    enc = json.loads(enc)
                except Exception:
                    continue
            if enc and len(enc) == 512:
                known_encodings.append(enc)
                student_ids.append(leg["student_id"])

    if not known_encodings:
        return {
            "matched": False,
            "detail": "Classroom isolation: Enrolled students in this class have not yet registered face biometrics."
        }

    # 5. Extract Face Information & Multiple-Face Ambiguity Check
    face_info = extract_face_info(file_bytes)
    candidate_encoding = face_info.get("embedding")
    if not candidate_encoding:
        return {
            "state": "rejected",
            "matched": False,
            "detail": "No face detected in the frame. Please look directly at the camera."
        }

    if face_info.get("ambiguous_multiple"):
        return {
            "state": "rejected",
            "matched": False,
            "multiple_faces": True,
            "detail": "Multiple students detected in frame. Please ensure only one student stands in front of the camera."
        }

    # 6. Authoritative Presentation-Attack Detection (MiniFASNet-V2 + Optical Consensus)
    # A face match ALONE must NEVER prove liveness or mark attendance.
    face_box = face_info.get("box")
    liveness_check = detect_face_spoof(file_bytes, bbox=face_box)

    if not liveness_check["is_live"]:
        return {
            "state": liveness_check["state"],
            "matched": False,
            "spoof_detected": liveness_check["state"] == "spoof_suspected",
            "review_required": liveness_check["state"] == "review_required",
            "spoof_type": liveness_check["spoof_type"],
            "liveness_score": liveness_check["liveness_score"],
            "model_live_prob": liveness_check.get("model_live_prob", 0.0),
            "model_replay_prob": liveness_check.get("model_replay_prob", 0.0),
            "detail": f"Presentation Security Alert: {liveness_check['spoof_type']}"
        }

    # 7. Perform Vector Search Matching against ONLY enrolled classroom members
    best_idx, score = find_best_face_match(known_encodings, candidate_encoding)
    if best_idx == -1:
        return {
            "state": "rejected",
            "matched": False,
            "detail": "Face not recognized among enrolled students of this classroom."
        }

    matched_student_id = student_ids[best_idx]

    # Redundant isolation verification
    if matched_student_id not in enrolled_student_ids:
        return {
            "state": "rejected",
            "matched": False,
            "detail": "Security Violation: Candidate is not an active member of this classroom."
        }

    # 8. Fetch student display metadata
    user = fetch_one(sb.table("users").select("name, custom_id").eq("id", matched_student_id))
    student_name = user.get("name") if user else "Student"
    custom_id = user.get("custom_id") if user else ""

    # 9. Record Attendance Transactionally in Database (Idempotent per session)
    persisted_record = {}
    try:
        upsert_res = sb.table("attendance_records").upsert({
            "session_id": target_session_id,
            "student_id": matched_student_id,
            "method": "face"
        }, on_conflict="session_id,student_id").execute()
        if upsert_res and upsert_res.data:
            persisted_record = upsert_res.data[0]
    except Exception as e:
        print("[Attendance Warning] Upsert exception:", e)

    return {
        "state": "verified",
        "matched": True,
        "student_id": matched_student_id,
        "name": student_name,
        "roll_number": custom_id,
        "score": round(score, 3),
        "class_id": class_id,
        "classroom_name": class_name,
        "session_id": target_session_id,
        "liveness_score": liveness_check["liveness_score"],
        "record": {
            "id": persisted_record.get("id"),
            "session_id": target_session_id,
            "student_id": matched_student_id,
            "marked_at": persisted_record.get("marked_at") or datetime.now(timezone.utc).isoformat(),
            "method": "face"
        }
    }


# ── AI Biometric Voice Scanning Endpoint (Strict Classroom Isolation) ────
@router.post("/scan-voice")
async def scan_voice(
    class_id: str = Form(...),
    session_id: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """
    Scans a microphone WAV clip for voiceprint attendance.
    Strictly isolated:
    1. Validates classroom and session ownership.
    2. Retrieves active memberships for THIS classroom only.
    3. Loads voice templates from student_biometrics for ONLY those students.
    4. Anti-replay verification.
    5. Cosine matching against only classroom candidates.
    6. Records attendance strictly for this classroom's session.
    """
    file_bytes = await file.read()
    sb = get_supabase()

    # 1. Validate Classroom
    classroom = fetch_one(sb.table("classes").select("id, class_name").eq("id", class_id))
    if not classroom:
        raise HTTPException(status_code=404, detail="Classroom not found.")
    class_name = classroom["class_name"]

    # 2. Validate Session belongs strictly to this classroom
    target_session_id = session_id
    if target_session_id:
        sess = fetch_one(sb.table("attendance_sessions").select("id, class_id, is_active").eq("id", target_session_id))
        if not sess or sess["class_id"] != class_id:
            raise HTTPException(
                status_code=400,
                detail="Security Violation: Attendance session does not belong to the requested classroom."
            )
    else:
        sess_res = sb.table("attendance_sessions").select("id").eq("class_id", class_id).eq("is_active", True).order("created_at", desc=True).limit(1).execute()
        sessions = sess_res.data or []
        if not sessions:
            insert_res = sb.table("attendance_sessions").insert({
                "class_id": class_id,
                "date": str(date.today()),
                "is_active": True
            }).execute()
            sessions = insert_res.data or []
        if not sessions:
            raise HTTPException(status_code=500, detail="Could not retrieve class session.")
        target_session_id = sessions[0]["id"]

    # 3. Retrieve active memberships for THIS classroom only
    mem_res = sb.table("enrollments").select("student_id").eq("class_id", class_id).eq("status", "active").execute()
    memberships = mem_res.data or []
    if not memberships:
        return {
            "matched": False,
            "detail": "Classroom isolation: No students are currently enrolled in this classroom."
        }

    enrolled_student_ids = list({m["student_id"] for m in memberships if m.get("student_id")})

    # 4. Anti-Spoofing Audio Replay Check
    voice_liveness = detect_voice_spoof(file_bytes)
    if not voice_liveness["is_live"] and voice_liveness["spoof_type"] not in ["Audio clip too short or corrupt (< 0.5s)", "None"]:
        return {
            "matched": False,
            "spoof_detected": True,
            "spoof_type": voice_liveness["spoof_type"],
            "detail": f"Voice Spoofing Rejected: {voice_liveness['spoof_type']}"
        }

    # 5. Encode candidate voice audio
    candidate_encoding = encode_voice_from_bytes(file_bytes)
    if not candidate_encoding:
        raise HTTPException(status_code=400, detail="Could not process voice audio. Ensure WAV format and speak clearly.")

    # 6. Load Active Voice Profiles for enrolled students from student_biometrics
    bio_res = sb.table("student_biometrics").select("student_id, embedding").in_("student_id", enrolled_student_ids).eq("biometric_type", "voice").eq("is_active", True).execute()
    biometrics_rows = bio_res.data or []

    known_encodings = []
    student_ids = []
    found_student_ids = set()

    for b in biometrics_rows:
        enc = b.get("embedding")
        if isinstance(enc, str):
            try:
                enc = json.loads(enc)
            except Exception:
                continue
        if enc and len(enc) == len(candidate_encoding):
            known_encodings.append(enc)
            student_ids.append(b["student_id"])
            found_student_ids.add(b["student_id"])

    # Fallback to legacy enrollments table if needed
    missing_ids = list(set(enrolled_student_ids) - found_student_ids)
    if missing_ids:
        leg_res = sb.table("enrollments").select("student_id, voice_encoding").eq("class_id", class_id).in_("student_id", missing_ids).execute()
        for leg in (leg_res.data or []):
            enc = leg.get("voice_encoding")
            if isinstance(enc, str):
                try:
                    enc = json.loads(enc)
                except Exception:
                    continue
            if enc and len(enc) == len(candidate_encoding):
                known_encodings.append(enc)
                student_ids.append(leg["student_id"])

    if not known_encodings:
        return {
            "matched": False,
            "detail": "Classroom isolation: Enrolled students in this class have not yet registered voice biometrics."
        }

    # 7. Find best match (Highest Cosine Similarity among classroom candidates)
    import numpy as np
    candidate = np.array(candidate_encoding, dtype=np.float32)
    c_norm = np.linalg.norm(candidate)

    best_idx = -1
    best_score = 0.0

    for idx, known_enc in enumerate(known_encodings):
        known = np.array(known_enc, dtype=np.float32)
        if len(known) != len(candidate):
            continue
        sim = float(np.dot(known, candidate) / (np.linalg.norm(known) * c_norm + 1e-8))
        if sim >= 0.70 and sim > best_score:
            best_score = sim
            best_idx = idx

    if best_idx == -1:
        return {"matched": False, "detail": "Voice not recognized among enrolled students of this classroom."}

    matched_student_id = student_ids[best_idx]

    if matched_student_id not in enrolled_student_ids:
        return {"matched": False, "detail": "Security Violation: Candidate is not an active member of this classroom."}

    user = fetch_one(sb.table("users").select("name, custom_id").eq("id", matched_student_id))
    student_name = user.get("name") if user else "Student"
    custom_id = user.get("custom_id") if user else ""

    persisted_record = {}
    try:
        upsert_res = sb.table("attendance_records").upsert({
            "session_id": target_session_id,
            "student_id": matched_student_id,
            "method": "voice"
        }, on_conflict="session_id,student_id").execute()
        if upsert_res and upsert_res.data:
            persisted_record = upsert_res.data[0]
    except Exception as e:
        print("[Attendance Warning] Voice upsert notice:", e)

    return {
        "state": "verified",
        "matched": True,
        "student_id": matched_student_id,
        "name": student_name,
        "roll_number": custom_id,
        "score": round(best_score, 3),
        "class_id": class_id,
        "classroom_name": class_name,
        "session_id": target_session_id,
        "record": {
            "id": persisted_record.get("id"),
            "session_id": target_session_id,
            "student_id": matched_student_id,
            "marked_at": persisted_record.get("marked_at") or datetime.now(timezone.utc).isoformat(),
            "method": "voice"
        }
    }
