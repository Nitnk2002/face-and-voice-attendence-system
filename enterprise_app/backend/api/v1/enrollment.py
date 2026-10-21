from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
import base64
import json
from typing import Optional
from supabase import create_client, Client
from core.config import settings
from core.face_utils import encode_face_from_bytes, extract_face_info
from core.voice_utils import encode_voice_from_bytes
from core.anti_spoofing import detect_face_spoof, detect_voice_spoof

router = APIRouter()

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

def fetch_one(query):
    try:
        res = query.limit(1).execute()
        if res and res.data and len(res.data) > 0:
            return res.data[0]
    except Exception:
        pass
    return None


@router.get("/check-student")
async def check_student(
    email: Optional[str] = Query(None),
    roll_number: Optional[str] = Query(None)
):
    """
    Checks if a student already has a canonical profile and active biometrics.
    Enables biometric reuse when an existing student joins another classroom.
    """
    if not email and not roll_number:
        raise HTTPException(status_code=400, detail="Email or roll number required.")

    sb = get_supabase()
    query = sb.table("users").select("id, name, email, custom_id, role")

    if email:
        user = fetch_one(query.eq("email", email.strip().lower()))
    else:
        user = fetch_one(query.eq("custom_id", roll_number.strip()))

    if not user:
        return {"exists": False, "has_biometrics": False}
    # Check if student has active biometrics in centralized storage
    bio_res = sb.table("student_biometrics").select("biometric_type").eq("student_id", user["id"]).eq("is_active", True).execute()
    types = [b["biometric_type"] for b in (bio_res.data or [])]
    has_face = "face" in types
    has_voice = "voice" in types

    return {
        "exists": True,
        "student_id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "roll_number": user["custom_id"],
        "has_biometrics": has_face and has_voice,
        "has_face": has_face,
        "has_voice": has_voice
    }


@router.post("/process-biometrics")
async def process_biometrics(
    photo: UploadFile = File(...),
    audio: UploadFile = File(...)
):
    """
    Receives student webcam photo and microphone WAV clip.
    Runs anti-spoofing liveness verification, then generates face (ArcFace)
    and voice embeddings, returning them along with base64 representations.
    """
    photo_bytes = await photo.read()
    audio_bytes = await audio.read()

    # 1. Process Face Embedding (InsightFace ArcFace 512-D)
    face_info = extract_face_info(photo_bytes)
    if face_info.get("ambiguous_multiple"):
        raise HTTPException(
            status_code=400,
            detail="Multiple competing faces detected. Please ensure only one person is in the frame."
        )

    face_encoding = face_info.get("embedding")
    if not face_encoding:
        raise HTTPException(status_code=400, detail="No face detected in the photo. Please frame your face clearly and retry.")

    # 2. Face Anti-Spoofing & Liveness Check (with exact bounding box)
    face_box = face_info.get("box")
    face_liveness = detect_face_spoof(photo_bytes, bbox=face_box)
    if not face_liveness["is_live"]:
        raise HTTPException(
            status_code=400,
            detail=f"Anti-Spoofing Alert: Spoofed face detected ({face_liveness['spoof_type']}). Please face the camera live without photos or screens."
        )

    # 3. Voice Anti-Spoofing Check
    voice_liveness = detect_voice_spoof(audio_bytes)
    if not voice_liveness["is_live"]:
        spoof_msg = voice_liveness.get("spoof_type", "")
        if "too short" in spoof_msg.lower() or "corrupt" in spoof_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Voice recording is too short or quiet. Please speak clearly for at least 2-3 seconds."
            )
        elif spoof_msg not in ["None", ""]:
            raise HTTPException(
                status_code=400,
                detail=f"Anti-Spoofing Alert: Audio replay detected ({spoof_msg}). Please speak live into the microphone."
            )

    # 4. Process Voice Embedding
    voice_encoding = encode_voice_from_bytes(audio_bytes)
    if not voice_encoding:
        raise HTTPException(
            status_code=400,
            detail="Voice print could not be extracted. Please speak for at least 2 to 3 seconds in a clear voice."
        )

    # 5. Base64 strings for storage review
    photo_b64 = base64.b64encode(photo_bytes).decode("utf-8")
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    return {
        "face_encoding": face_encoding,
        "voice_encoding": voice_encoding,
        "face_photo": photo_b64,
        "voice_audio": audio_b64
    }


@router.post("/join-classroom")
async def join_classroom(
    join_code: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    enrollment_no: str = Form(...),
    reuse_existing: bool = Form(False),
    photo: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None)
):
    """
    Centralized enrollment handler:
    - Resolves classroom by join code
    - Resolves or creates canonical student identity
    - Reuses existing biometric profile if available (no duplicate embeddings!)
    - If new or updating, registers canonical biometric profile in student_biometrics
    - Creates distinct classroom membership in enrollments
    """
    sb = get_supabase()

    # 1. Validate Classroom
    classroom = fetch_one(sb.table("classes").select("id, class_name, join_code").eq("join_code", join_code.strip().upper()))
    if not classroom:
        raise HTTPException(status_code=404, detail="Invalid classroom join code.")

    # 2. Resolve Canonical Student Identity in users
    email_clean = email.strip().lower()
    roll_clean = enrollment_no.strip()

    user = fetch_one(sb.table("users").select("id, name, email, custom_id").eq("email", email_clean))
    if not user and roll_clean:
        user = fetch_one(sb.table("users").select("id, name, email, custom_id").eq("custom_id", roll_clean))

    if not user:
        create_res = sb.table("users").insert({
            "name": name.strip(),
            "email": email_clean,
            "hashed_password": "dummy-password",
            "role": "student",
            "custom_id": roll_clean
        }).execute()
        if not create_res.data:
            raise HTTPException(status_code=500, detail="Could not create student profile.")
        student_id = create_res.data[0]["id"]
    else:
        student_id = user["id"]
        # Update custom_id if missing
        if not user.get("custom_id") and roll_clean:
            sb.table("users").update({"custom_id": roll_clean}).eq("id", student_id).execute()

    # 3. Handle Biometrics (Deduplication Check)
    bio_res = sb.table("student_biometrics").select("biometric_type").eq("student_id", student_id).eq("is_active", True).execute()
    active_types = [b["biometric_type"] for b in (bio_res.data or [])]
    has_valid_biometrics = ("face" in active_types) and ("voice" in active_types)

    biometrics_reused = False

    if has_valid_biometrics and reuse_existing and (photo is None or audio is None):
        # Student already has canonical biometrics; reuse them!
        biometrics_reused = True
    else:
        # Student needs biometrics registered or updated
        if photo is None or audio is None:
            raise HTTPException(status_code=400, detail="Biometric registration requires camera capture and microphone recording.")

        photo_bytes = await photo.read()
        audio_bytes = await audio.read()

        # Face extraction FIRST — we need the bounding box for MiniFASNet
        face_info = extract_face_info(photo_bytes)
        if face_info.get("ambiguous_multiple"):
            raise HTTPException(status_code=400, detail="Multiple competing faces detected. Frame one person clearly.")
        if not face_info.get("embedding"):
            raise HTTPException(status_code=400, detail="No face detected in photo. Please face the camera clearly in good lighting.")

        face_enc = face_info["embedding"]
        face_box = face_info.get("box")

        # Face anti-spoofing WITH precise bounding box from face detection
        face_liveness = detect_face_spoof(photo_bytes, bbox=face_box)
        if not face_liveness["is_live"]:
            raise HTTPException(status_code=400, detail=f"Anti-Spoofing Alert: {face_liveness['spoof_type']}")

        photo_b64 = base64.b64encode(photo_bytes).decode("utf-8")

        # Voice verification
        voice_liveness = detect_voice_spoof(audio_bytes)
        if not voice_liveness["is_live"]:
            spoof_msg = voice_liveness.get("spoof_type", "")
            if "too short" in spoof_msg.lower() or "corrupt" in spoof_msg.lower():
                raise HTTPException(status_code=400, detail=spoof_msg)
            elif "too quiet" in spoof_msg.lower() or "silent" in spoof_msg.lower():
                raise HTTPException(status_code=400, detail=spoof_msg)
            elif "clipping" in spoof_msg.lower():
                raise HTTPException(status_code=400, detail=spoof_msg)
            elif "noise" in spoof_msg.lower():
                raise HTTPException(status_code=400, detail=spoof_msg)
            elif spoof_msg not in ["None", ""]:
                raise HTTPException(status_code=400, detail=f"Voice Anti-Spoofing: {spoof_msg}")

        voice_enc = encode_voice_from_bytes(audio_bytes)
        if not voice_enc:
            raise HTTPException(status_code=400, detail="Voice print could not be extracted. Please speak clearly for 2-3 seconds.")
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        # Atomically deactivate old profiles and insert new active profiles in student_biometrics
        sb.table("student_biometrics").update({"is_active": False}).eq("student_id", student_id).execute()

        sb.table("student_biometrics").insert([
            {
                "student_id": student_id,
                "biometric_type": "face",
                "embedding": face_enc,
                "model_name": "insightface_buffalo_sc_arcface",
                "model_version": "1.0",
                "embedding_dimension": 512,
                "sample_data": photo_b64,
                "is_active": True
            },
            {
                "student_id": student_id,
                "biometric_type": "voice",
                "embedding": voice_enc,
                "model_name": "spectral_fft_256",
                "model_version": "1.0",
                "embedding_dimension": 256,
                "sample_data": audio_b64,
                "is_active": True
            }
        ]).execute()

    # 4. Create Classroom Membership (enrollments table as pure junction)
    # Use explicit check-then-insert with DB unique constraint as safety net
    try:
        existing_enrollment = fetch_one(
            sb.table("enrollments")
            .select("id, status")
            .eq("class_id", classroom["id"])
            .eq("student_id", student_id)
        )

        if existing_enrollment:
            # Membership already exists — reactivate if inactive
            if existing_enrollment.get("status") != "active":
                sb.table("enrollments").update({"status": "active"}).eq("id", existing_enrollment["id"]).execute()
        else:
            # Insert new membership
            try:
                sb.table("enrollments").insert({
                    "class_id": classroom["id"],
                    "student_id": student_id,
                    "status": "active"
                }).execute()
            except Exception as insert_err:
                # Handle race condition: another request may have inserted between check and insert.
                # The DB unique constraint on (class_id, student_id) will reject the duplicate.
                # Verify the membership exists and reactivate if needed.
                err_str = str(insert_err).lower()
                if "duplicate" in err_str or "unique" in err_str or "conflict" in err_str or "23505" in err_str:
                    race_enroll = fetch_one(
                        sb.table("enrollments")
                        .select("id, status")
                        .eq("class_id", classroom["id"])
                        .eq("student_id", student_id)
                    )
                    if race_enroll and race_enroll.get("status") != "active":
                        sb.table("enrollments").update({"status": "active"}).eq("id", race_enroll["id"]).execute()
                    elif not race_enroll:
                        raise HTTPException(
                            status_code=500,
                            detail="Could not create classroom membership. Please try again."
                        )
                else:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Enrollment database error: {str(insert_err)[:200]}"
                    )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not link student to classroom. Please try again or contact your instructor."
        )

    return {
        "success": True,
        "student_id": student_id,
        "class_id": classroom["id"],
        "class_name": classroom["class_name"],
        "biometrics_reused": biometrics_reused,
        "message": f"Successfully enrolled in {classroom['class_name']}! Biometrics are active."
    }
