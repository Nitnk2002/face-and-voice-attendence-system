"""
Auto-Enroll Dialog — Apni Kaksha
Vercel DESIGN.md system: white canvas, ink #171717, mono labels, stacked shadows.
"""
import json
import base64
import streamlit as st

from src.utils.supabase_client import get_supabase
from src.utils.face_utils import encode_face_from_bytes
from src.utils.voice_utils import encode_voice_from_bytes




def render_auto_enroll_dialog(join_code: str, cls: dict | None = None):
    sb = get_supabase()
    uid = st.session_state.get("user_id")

    if not uid:
        st.warning("Please log in as a student first.")
        return

    if cls is None:
        try:
            cls_res = sb.table("classes").select("*").eq("join_code", join_code).single().execute()
            cls = cls_res.data
        except Exception:
            cls = None

    if not cls:
        st.error("Invalid join code. Please check with your teacher.")
        return

    # ── Enrollment card — ex-auth-form-card ───────────────────
    col_l, col_c, col_r = st.columns([1, 3, 1])
    with col_c:
        # Header
        st.markdown(f"""
        <div style="padding:32px 0 24px; text-align:center;">
          <span class="ak-mono-label">enrollment</span>
          <h1 style="font-size:32px; font-weight:600; letter-spacing:-0.04em;
               color:var(--ink); margin:12px 0 8px; line-height:1.1;">
            Join {cls['class_name']}.
          </h1>
          <p style="color:var(--body); font-size:14px; max-width:400px; margin:0 auto;">
            Capture your face and record your voice once.
            This is how the system will recognise you in future sessions.
          </p>
        </div>
        """, unsafe_allow_html=True)

        # ── Step 1: Face ─────────────────────────────────────────
        st.markdown("""
        <div style="margin-bottom:16px;">
          <span class="ak-mono-label">step 01</span>
          <h3 style="font-size:18px; font-weight:600; letter-spacing:-0.03em;
               color:var(--ink); margin:6px 0 4px;">Capture your face.</h3>
          <p style="color:var(--body); font-size:13px; margin:0;">
            Look straight into the camera in good lighting, then click <b>Take Photo</b>.
          </p>
        </div>
        """, unsafe_allow_html=True)

        face_img = st.camera_input("", key="enroll_cam", label_visibility="collapsed")
        face_encoding = None
        face_photo_b64 = None

        if face_img:
            with st.spinner("Detecting face…"):
                try:
                    raw_bytes = face_img.getvalue()
                    face_encoding = encode_face_from_bytes(raw_bytes)
                    face_photo_b64 = base64.b64encode(raw_bytes).decode("utf-8")
                except Exception as e:
                    st.error(f"Face encoding error: {e}")
                    face_encoding = None
            if face_encoding is None:
                st.error("No face detected. Ensure face is centred and well-lit.")
                face_photo_b64 = None
            else:
                st.success("Face captured.")

        st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)

        # ── Step 2: Voice ────────────────────────────────────────
        st.markdown("""
        <div style="margin-bottom:16px; margin-top:24px;">
          <span class="ak-mono-label">step 02</span>
          <h3 style="font-size:18px; font-weight:600; letter-spacing:-0.03em;
               color:var(--ink); margin:6px 0 4px;">Record your voice.</h3>
          <p style="color:var(--body); font-size:13px; margin:0;">
            Speak for 5–10 seconds — say your name or count to ten.
          </p>
        </div>
        """, unsafe_allow_html=True)

        voice_encoding = None
        voice_bytes = None
        voice_audio_b64 = None

        audio_val = st.audio_input("Record your voice", key="enroll_recorder")
        
        if audio_val is not None:
            recorded_bytes = audio_val.getvalue()
            if recorded_bytes and len(recorded_bytes) > 1000:
                voice_bytes = recorded_bytes
                voice_audio_b64 = base64.b64encode(recorded_bytes).decode("utf-8")
                st.success("Audio recorded.")

        st.markdown("""
        <p style="text-align:center; color:var(--mute); font-size:12px;
           font-family:'JetBrains Mono',monospace; margin:12px 0 8px;
           letter-spacing:0.04em;">— OR UPLOAD A FILE —</p>
        """, unsafe_allow_html=True)

        voice_file = st.file_uploader(
            "Upload voice sample",
            type=["wav", "mp3", "ogg", "m4a", "webm"],
            key="enroll_voice",
        )
        if voice_file and not voice_bytes:
            voice_bytes = voice_file.read()
            voice_audio_b64 = base64.b64encode(voice_bytes).decode("utf-8")
            st.success("File uploaded.")

        if voice_bytes:
            with st.spinner("Processing voice…"):
                try:
                    voice_encoding = encode_voice_from_bytes(voice_bytes)
                except Exception:
                    voice_encoding = None
            if voice_encoding is None:
                st.warning(
                    "Could not process voice sample — clip may be too short. "
                    "You can still enroll with face only."
                )
            else:
                st.success("Voice encoded.")

        st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)

        # ── Enroll button ─────────────────────────────────────────
        can_enroll = face_encoding is not None
        if not can_enroll:
            st.markdown("""
            <div class="ak-card-soft" style="text-align:center; padding:12px;">
              <p style="color:var(--mute); font-size:13px; margin:0;">
                Capture your face photo above to enable enrollment.
              </p>
            </div>
            """, unsafe_allow_html=True)

        col_enroll, col_cancel = st.columns(2)
        with col_enroll:
            if can_enroll and st.button("Complete enrollment →", key="btn_complete_enroll",
                                         use_container_width=True):
                with st.spinner("Saving enrollment…"):
                    try:
                        existing = sb.table("enrollments").select("id").eq("class_id", cls["id"]).eq("student_id", uid).execute()
                        if existing.data:
                            st.info(f"Already enrolled in **{cls['class_name']}**.")
                            st.session_state.pop("pending_enroll_class", None)
                            st.rerun()
                            return

                        payload = {
                            "class_id":      cls["id"],
                            "student_id":    uid,
                            "face_encoding": json.dumps(face_encoding),
                        }
                        if face_photo_b64:
                            payload["face_photo"] = face_photo_b64
                        if voice_encoding:
                            payload["voice_encoding"] = json.dumps(voice_encoding)
                        if voice_audio_b64:
                            payload["voice_audio"] = voice_audio_b64

                        sb.table("enrollments").insert(payload).execute()
                        st.success(f"Enrolled in **{cls['class_name']}**!")
                        st.balloons()
                        st.session_state.pop("pending_enroll_class", None)
                        st.query_params.clear()
                        import time; time.sleep(1.5)
                        st.rerun()
                    except Exception as e:
                        st.error(f"Enrollment failed: {e}")

        with col_cancel:
            if st.button("Cancel", key="btn_cancel_enroll", use_container_width=True):
                st.session_state.pop("pending_enroll_class", None)
                st.query_params.clear()
                st.rerun()
