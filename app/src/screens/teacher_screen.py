"""
Teacher Dashboard — Apni Kaksha
Screens: Class Management | Live Attendance | Analytics
"""
import io
import random
import string
from datetime import datetime, date

import segno
import streamlit as st

from src.utils.face_utils import encode_face_from_bytes
from src.services import db_service as db


# ── Helpers ───────────────────────────────────────────────────

def _gen_join_code(length=7) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def _topbar():
    name = st.session_state.get("user_name", "Teacher")
    col1, col2, col3 = st.columns([5, 1, 1])
    with col1:
        st.markdown(f"""
        <div style="
          height:64px;
          border-bottom:1px solid var(--hairline);
          background:var(--canvas);
          display:flex; align-items:center; gap:12px;
          padding:0 0 0 4px; margin-bottom:32px;
        ">
          <span style="font-weight:600; font-size:15px; letter-spacing:-0.02em; color:var(--ink);">🎓 Apni Kaksha</span>
          <span style="color:var(--hairline);">·</span>
          <span class="ak-mono-label">teacher dashboard</span>
          <span style="margin-left:8px; font-size:13px; color:var(--body);">Welcome back, {name}</span>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown("<div style='padding-top:12px;'></div>", unsafe_allow_html=True)
        theme = st.session_state.get("theme", "light")
        label = "🌙 Dark" if theme == "light" else "☀️ Light"
        if st.button(label, key="t_theme", use_container_width=True):
            st.session_state["theme"] = "dark" if theme == "light" else "light"
            st.rerun()
    with col3:
        st.markdown("<div style='padding-top:12px;'></div>", unsafe_allow_html=True)
        if st.button("Sign out", key="t_logout", use_container_width=True):
            for k in ["login_type", "user_id", "user_email", "user_name", "class_id"]:
                st.session_state[k] = None
            st.session_state["explicit_logout"] = True
            st.query_params.clear()
            st.rerun()


# ── Tab 1: My Classes ─────────────────────────────────────────

def _tab_classes():
    uid = st.session_state["user_id"]

    # Section heading
    col_h, col_btn = st.columns([4, 1])
    with col_h:
        st.markdown("""
        <div style="margin-bottom:8px;">
          <span class="ak-mono-label">classes</span>
          <h2 style="font-size:24px; font-weight:600; letter-spacing:-0.03em;
               color:var(--ink); margin:4px 0 0;">My Classes.</h2>
        </div>
        """, unsafe_allow_html=True)

    # Create new class — clean expander
    with st.expander("+ Create new class", expanded=False):
        st.markdown("<div style='padding:4px 0 8px;'></div>", unsafe_allow_html=True)
        class_name = st.text_input("Class name", placeholder="e.g. CS101 — Data Structures",
                                    key="new_class_name")
        if st.button("Create class →", key="btn_create_class"):
            if not class_name:
                st.error("Enter a class name.")
            else:
                code = _gen_join_code()
                with st.spinner("Creating class..."):
                    ok, err = db.create_class(uid, class_name, code)
                if ok:
                    st.success(f"Class created! Join code: **{code}**")
                    st.rerun()
                else:
                    st.error(f"Error: {err}")

    # List classes (cached 120 s)
    classes = db.get_classes_for_teacher(uid)

    if not classes:
        st.markdown("""
        <div class="ak-card-soft" style="text-align:center; padding:48px 24px;">
          <p class="ak-mono-label" style="margin-bottom:12px;">no classes yet</p>
          <p style="color:var(--body); font-size:15px; margin:0;">
            Create your first class using the button above.
          </p>
        </div>
        """, unsafe_allow_html=True)
        return

    for cls in classes:
        with st.container():
            st.markdown(f"""
            <div class="ak-card" style="margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <h4 style="margin:0 0 6px; font-size:16px; font-weight:600;
                       letter-spacing:-0.02em; color:var(--ink);">
                    {cls['class_name']}
                  </h4>
                  <span class="badge-mono">Join code: {cls['join_code']}</span>
                </div>
              </div>
            </div>
            """, unsafe_allow_html=True)

            col1, col2, col3 = st.columns([2, 2, 2])
            with col1:
                if st.button("View dashboard", key=f"dash_{cls['id']}",
                             use_container_width=True):
                    st.session_state["class_id"] = cls["id"]
                    st.session_state["class_name"] = cls["class_name"]
                    st.rerun()
            with col2:
                if st.button("Show QR code", key=f"qr_{cls['id']}",
                             use_container_width=True):
                    app_url = f"http://localhost:8501/?join_code={cls['join_code']}"
                    qr = segno.make(app_url, error="H")
                    buf = io.BytesIO()
                    qr.save(buf, kind="png", scale=8, dark="#171717", light="#ffffff")
                    buf.seek(0)
                    st.image(buf, caption=f"Scan to join: {cls['class_name']}", width=220)
            with col3:
                if st.button("Delete", key=f"del_{cls['id']}",
                             use_container_width=True):
                    ok, err = db.delete_class(cls["id"])
                    if ok:
                        st.rerun()
                    else:
                        st.error(err)

            # ── Enrolled Students ─────────────────────────────
            with st.expander(f"Enrolled students ({cls['class_name']})", expanded=True):
                enrollments = db.get_enrollments_for_class(cls["id"], decode_biometrics=False)

                if not enrollments:
                    st.markdown(f"""
                    <div style="padding:20px; text-align:center;">
                      <p class="ak-mono-label" style="margin-bottom:8px;">no students yet</p>
                      <p style="color:var(--body); font-size:13px; margin:0;">
                        Share join code
                        <span class="badge-mono">{cls['join_code']}</span>
                        with your students.
                      </p>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    student_ids = [e["student_id"] for e in enrollments]
                    users_map = db.get_users_by_ids(student_ids)

                    st.markdown(f"""
                    <p class="ak-mono-label" style="margin-bottom:16px;">
                      {len(enrollments)} student(s) enrolled
                    </p>
                    """, unsafe_allow_html=True)

                    for e in enrollments:
                        u = users_map.get(e["student_id"], {})
                        has_photo = bool(e.get("face_photo"))
                        has_audio = bool(e.get("voice_audio"))
                        enrolled_date = (e.get("enrolled_at", "")[:10] if e.get("enrolled_at") else "—")

                        with st.container():
                            st.markdown(f"""
                            <div class="ak-card" style="margin-bottom:12px; padding:20px 24px;">
                              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <div>
                                  <h4 style="margin:0 0 4px; font-size:15px; font-weight:600; letter-spacing:-0.02em; color:var(--ink);">
                                    {u.get('name', '—')}
                                  </h4>
                                  <span style="font-size:12px; color:var(--body);">{u.get('email','—')}</span>
                                </div>
                                <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
                                  <span class="badge-mono">Enrolled: {enrolled_date}</span>
                                  {'<span class="badge-mono" style="background:#e8f5e9; color:#2e7d32;">📷 Photo ✓</span>' if has_photo else '<span class="badge-mono" style="background:#fce4ec; color:#c62828;">📷 No Photo</span>'}
                                  {'<span class="badge-mono" style="background:#e8f5e9; color:#2e7d32;">🎤 Audio ✓</span>' if has_audio else '<span class="badge-mono" style="background:#fce4ec; color:#c62828;">🎤 No Audio</span>'}
                                </div>
                              </div>
                            </div>
                            """, unsafe_allow_html=True)

                            col_photo, col_audio, col_btn = st.columns([2, 2, 1])

                            with col_photo:
                                if has_photo:
                                    try:
                                        import base64 as _b64
                                        photo_bytes = _b64.b64decode(e["face_photo"])
                                        st.image(photo_bytes, caption="Enrollment photo", use_container_width=True)
                                    except Exception:
                                        st.warning("Could not load photo.")
                                else:
                                    st.markdown("""
                                    <div style="background:#fafafa; border:1px dashed #ddd; border-radius:8px;
                                         padding:32px; text-align:center; color:#888; font-size:12px;">
                                      No photo saved
                                    </div>""", unsafe_allow_html=True)

                            with col_audio:
                                if has_audio:
                                    try:
                                        import base64 as _b64
                                        audio_bytes = _b64.b64decode(e["voice_audio"])
                                        st.markdown("**Voice recording:**")
                                        st.audio(audio_bytes, format="audio/wav")
                                    except Exception:
                                        st.warning("Could not load audio.")
                                else:
                                    st.markdown("""
                                    <div style="background:#fafafa; border:1px dashed #ddd; border-radius:8px;
                                         padding:32px; text-align:center; color:#888; font-size:12px;">
                                      No audio saved
                                    </div>""", unsafe_allow_html=True)

                            with col_btn:
                                st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)
                                if st.button("🗑 Unenroll", key=f"unenroll_{e['id']}", use_container_width=True,
                                             help=f"Remove {u.get('name','student')} from this class."):
                                    ok, err = db.unenroll_student(e["id"])
                                    if ok:
                                        st.success(f"✅ {u.get('name','Student')} has been unenrolled.")
                                        st.rerun()
                                    else:
                                        st.error(f"Error: {err}")

                            st.markdown("<hr style='margin:4px 0 16px; border:none; border-top:1px solid var(--hairline);'/>", unsafe_allow_html=True)








# ── Tab 2: Live Attendance ────────────────────────────────────

def _tab_live():
    uid = st.session_state["user_id"]

    st.markdown("""
    <div style="margin-bottom:24px;">
      <span class="ak-mono-label">attendance</span>
      <h2 style="font-size:24px; font-weight:600; letter-spacing:-0.03em;
           color:var(--ink); margin:4px 0 0;">Live Session.</h2>
    </div>
    """, unsafe_allow_html=True)

    # Select class (cached)
    classes = db.get_classes_for_teacher(uid)

    if not classes:
        st.info("Create a class first.")
        return

    cls_names = {c["class_name"]: c for c in classes}
    selected = st.selectbox("Select Class", list(cls_names.keys()), key="live_cls")
    cls = cls_names[selected]

    # Check DB for currently active session for this class
    active_db_sess = db.get_active_session(cls["id"])
    if active_db_sess:
        st.session_state["active_session_id"] = active_db_sess["id"]
    else:
        st.session_state["active_session_id"] = None

    session_id = st.session_state.get("active_session_id")
    is_active = session_id is not None

    # ── Session controls ────────────────────────────────────────
    if not is_active:
        st.markdown("""
        <div style="background:var(--canvas-soft); border:1px solid var(--hairline);
             border-radius:10px; padding:20px 24px; margin-bottom:16px;">
          <p class="ak-mono-label" style="margin:0 0 10px;">start new session</p>
        """, unsafe_allow_html=True)
        col_date, col_title = st.columns(2)
        with col_date:
            session_date = st.date_input(
                "Session Date",
                value=date.today(),
                key="session_date_picker",
                help="Pick the date for this attendance session (defaults to today)"
            )
        with col_title:
            session_title = st.text_input(
                "Session Title (optional)",
                placeholder="e.g. Lecture 3",
                key="session_title_input"
            )
        st.markdown("</div>", unsafe_allow_html=True)

        col_start, col_space = st.columns([1, 3])
        with col_start:
            if st.button("▶ Start Session", key="btn_start_session", use_container_width=True):
                with st.spinner("Starting session..."):
                    session_row, err = db.start_session(
                        cls["id"],
                        session_date.isoformat(),
                        session_title.strip() if session_title.strip() else None
                    )
                if session_row:
                    st.session_state["active_session_id"] = session_row["id"]
                    st.session_state["active_session_title"] = session_row.get("session_title", "")
                    # Bust enrollment cache when starting a new session
                    cache_key = f"_enroll_cache_{cls['id']}"
                    if cache_key in st.session_state:
                        del st.session_state[cache_key]
                    st.success(f"Session started for {session_date.strftime('%d %b %Y')}!")
                    st.rerun()
                else:
                    st.error(f"Failed to start session: {err}")
    else:
        # Show active session badge + stop button
        sess_date_str = ""
        sess_title_str = ""
        if active_db_sess:
            try:
                sess_date_str = datetime.fromisoformat(active_db_sess["date"]).strftime("%d %b %Y")
            except Exception:
                sess_date_str = active_db_sess.get("date", "")
            sess_title_str = active_db_sess.get("session_title") or ""
            st.session_state["active_session_title"] = sess_title_str
        
        display_text = f" — {sess_title_str} ({sess_date_str})" if sess_title_str else f" — {sess_date_str}"

        col_badge, col_stop = st.columns([3, 1])
        with col_badge:
            st.markdown(f"""
            <div style="display:flex; align-items:center; gap:10px;
                 background:#f0fdf4; border:1px solid #86efac; border-radius:8px;
                 padding:12px 18px; margin-bottom:8px;">
              <span style="width:10px; height:10px; border-radius:50%;
                   background:#22c55e; display:inline-block;
                   box-shadow:0 0 0 3px rgba(34,197,94,0.25); flex-shrink:0;"></span>
              <span style="font-size:13px; font-weight:600; color:#15803d;">Session Active</span>
              <span style="font-size:12px; color:#16a34a; font-family:'JetBrains Mono',monospace;">
                {display_text}
              </span>
            </div>
            """, unsafe_allow_html=True)
        with col_stop:
            if st.button("⏹ Stop Session", key="btn_stop_session", use_container_width=True):
                sid = st.session_state.get("active_session_id")
                if sid:
                    ok, err = db.stop_session(cls["id"], sid)
                    if ok:
                        st.session_state["active_session_id"] = None
                        # Bust caches
                        cache_key = f"_enroll_cache_{cls['id']}"
                        if cache_key in st.session_state:
                            del st.session_state[cache_key]
                        st.success("Session ended.")
                        st.rerun()
                    else:
                        st.error(f"Could not stop session: {err}")

    if not session_id:
        sessions = db.get_sessions_for_class(cls["id"])
        if sessions:
            session_id = sessions[0]["id"]

    if not session_id:
        st.markdown("""
        <div class="ak-card-soft" style="text-align:center; padding:24px; margin-bottom: 24px;">
          <p style="color:var(--body); margin:0;">No session currently active. Start a new session above, or view past sessions below.</p>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("#### 🕒 Past Sessions")
        sessions_data = db.get_sessions_for_class(cls["id"])
        # Reverse so newest is first in the selectbox
        sessions_data = list(reversed(sessions_data))
        if not sessions_data:
            st.info("No past sessions found for this class.")
            return
            
        session_opts = {}
        for s in sessions_data:
            s_date = s.get("date", "")[:10]
            s_title = s.get("session_title") or "Session"
            session_opts[f"{s_date} — {s_title}"] = s["id"]
            
        selected_past = st.selectbox("Select past session to view roster", list(session_opts.keys()), key="past_sess_sel")
        past_id = session_opts[selected_past]
        
        # Set the title for the CSV export
        s_title_str = selected_past.split(" — ")[1] if " — " in selected_past else ""
        st.session_state["active_session_title"] = s_title_str
        
        st.markdown("<div style='margin-top:16px;'></div>", unsafe_allow_html=True)
        _show_roster(cls, past_id)
        return

    # Face-scan attendance via camera
    st.markdown("#### 📸 Mark Attendance via Face Recognition")

    # ── Cache enrollments to avoid re-fetching on every camera capture ──
    # Key is class id so it auto-refreshes when the teacher switches class.
    cache_key = f"_enroll_cache_{cls['id']}"
    if cache_key not in st.session_state:
        # Use db_service for clean fetching + decoding
        st.session_state[cache_key] = db.get_enrollments_for_class(cls["id"], decode_biometrics=True)

    enrollments = st.session_state[cache_key]

    # Also cache student names to avoid extra DB calls per recognition
    names_key = f"_names_cache_{cls['id']}"
    if names_key not in st.session_state and enrollments:
        student_ids = [e["student_id"] for e in enrollments]
        users = db.get_users_by_ids(student_ids)
        st.session_state[names_key] = {uid_: u["name"] for uid_, u in users.items()}
    names_map = st.session_state.get(names_key, {})

    t_face, t_voice = st.tabs(["📸 Face Scanner", "🎙️ Voice Scanner"])
    
    with t_face:
        cam_img = st.camera_input("Point camera at student", key="live_cam")
        if cam_img:
            with st.spinner("Recognising face…"):
                img_bytes = cam_img.getvalue()
                candidate_enc = encode_face_from_bytes(img_bytes)
                if candidate_enc is None:
                    st.error("No face detected. Try again with better lighting.")
                else:
                    try:
                        # ── Fetch who is already present in this session ──────────
                        # This prevents re-marking already-present students AND
                        # prevents another student from matching an already-present
                        # face encoding (which could happen if two people look similar).
                        already_present_ids = db.get_present_student_ids(session_id)
    
                        # ── Vectorized O(1) Matrix Matching ──────────
                        # Build a list of valid, absent enrollments
                        absent_enrollments = [enr for enr in enrollments if enr.get("student_id") not in already_present_ids]
                        
                        matched = None
                        best_score = 0.0
                        
                        if absent_enrollments:
                            known_encodings = [enr.get("face_encoding") for enr in absent_enrollments]
                            
                            # Import the vectorized function
                            from src.utils.face_utils import find_best_face_match
                            
                            best_idx, best_score = find_best_face_match(known_encodings, candidate_enc)
                            
                            if best_idx != -1:
                                matched = absent_enrollments[best_idx]
    
                        # ── Check if camera is showing an already-present student ──
                        if matched is None and already_present_ids:
                            re_match_name = None
                            re_match_score = 0.0
                            
                            present_enrollments = [enr for enr in enrollments if enr.get("student_id") in already_present_ids]
                            if present_enrollments:
                                present_encodings = [enr.get("face_encoding") for enr in present_enrollments]
                                from src.utils.face_utils import find_best_face_match
                                best_idx, re_match_score = find_best_face_match(present_encodings, candidate_enc)
                                if best_idx != -1:
                                    re_match_name = names_map.get(present_enrollments[best_idx].get("student_id"), "this student")
    
                            if re_match_name:
                                st.info(f"ℹ️ **{re_match_name}** is already marked Present for this session ({re_match_score*100:.1f}% confidence). No action taken.")
                                st.stop()
    
                        if matched:
                            # Record attendance
                            ok, err = db.mark_attendance(session_id, matched["student_id"], "face")
                            if ok:
                                s_name = names_map.get(matched["student_id"], "Student")
                                st.success(f"✅ **{s_name}** marked Present — face confidence: {best_score*100:.1f}%")
                            else:
                                st.error(f"Could not save attendance: {err}")
                        else:
                            if best_score > 0:
                                st.warning(f"⚠️ Face not recognised (best match confidence: {best_score*100:.1f}%, required: 75.0%). Please re-enroll the student.")
                            else:
                                st.warning("⚠️ Face not recognised. No matching enrollment found for this class.")
                    except Exception as e:
                        st.error(f"Recognition error: {e}")

    with t_voice:
        # Use Streamlit's native audio input for a clear UI with start/stop buttons
        audio_val = st.audio_input("Ask student to speak", key="voice_recorder_teacher")
        
        recorded_bytes = None
        if audio_val is not None:
            recorded_bytes = audio_val.getvalue()
            
        voice_file = st.file_uploader("Or upload voice sample", type=["wav", "mp3", "ogg", "m4a", "webm"], key="tch_voice_upload")
        if voice_file:
            recorded_bytes = voice_file.read()

        if recorded_bytes and len(recorded_bytes) > 1000:
            with st.spinner("Recognising voice…"):
                from src.utils.voice_utils import encode_voice_from_bytes, compare_voices
                
                candidate_voice_enc = encode_voice_from_bytes(recorded_bytes)
                if candidate_voice_enc is None:
                    st.error("Voice not recognized clearly. Try again.")
                else:
                    try:
                        already_present_ids = db.get_present_student_ids(session_id)

                        matched = None

                        for enr in enrollments:
                            sid = enr.get("student_id")
                            if sid in already_present_ids:
                                continue
                            
                            known_enc = enr.get("voice_encoding")
                            if not known_enc:
                                continue

                            if compare_voices(known_enc, candidate_voice_enc):
                                matched = enr
                                break

                        if matched is None and already_present_ids:
                            re_match_name = None
                            for enr in enrollments:
                                sid = enr.get("student_id")
                                if sid not in already_present_ids:
                                    continue
                                known_enc = enr.get("voice_encoding")
                                if not known_enc:
                                    continue
                                if compare_voices(known_enc, candidate_voice_enc):
                                    re_match_name = names_map.get(sid, "this student")
                                    break
                            
                            if re_match_name:
                                st.info(f"ℹ️ **{re_match_name}** is already marked Present. No action taken.")
                                st.stop()

                        if matched:
                            ok, err = db.mark_attendance(session_id, matched["student_id"], "voice")
                            if ok:
                                s_name = names_map.get(matched["student_id"], "Student")
                                st.success(f"✅ **{s_name}** marked Present via Voice Recognition")
                            else:
                                st.error(f"Could not save attendance: {err}")
                        else:
                            st.warning("⚠️ Voice not recognised. No matching enrollment found.")
                    except Exception as e:
                        st.error(f"Recognition error: {e}")

    # Refresh enrollment cache button (for when new students join mid-session)
    if st.button("🔄 Refresh Enrollment List", key="btn_refresh_enrollments", help="Reload enrolled students — useful if a student just joined"):
        for k in [cache_key, names_key]:
            if k in st.session_state:
                del st.session_state[k]
        st.rerun()

    # Attendance roster for current session
    st.markdown("#### 📋 Attendance Roster")
    _show_roster(cls, session_id)


def _show_roster(cls, session_id):
    """Render the attendance roster for a given session."""
    try:
        # Enrollments and users
        enrollments = db.get_enrollments_for_class(cls["id"], decode_biometrics=False)
        enrolled_ids = [e["student_id"] for e in enrollments]

        if not enrolled_ids:
            st.info("No students enrolled in this class yet.")
            return

        users = db.get_users_by_ids(enrolled_ids)
        records = db.get_records_for_session(session_id)
        present_ids = {r["student_id"] for r in records}

        rows = []
        for sid in enrolled_ids:
            u = users.get(sid, {})
            is_present = sid in present_ids
            status = "Present ✓" if is_present else "Absent"
            rows.append({"Name": u.get("name", "-"), "Email": u.get("email", "-"), "Status": status, "id": sid, "is_present": is_present})

        present_count = sum(1 for r in rows if r["is_present"])
        total = len(rows)

        col1, col2, col3 = st.columns(3)
        col1.metric("Total Students", total)
        col2.metric("Present", present_count, delta=f"{int(present_count/total*100) if total else 0}%")
        col3.metric("Absent", total - present_count)

        # Rich manual override list
        st.markdown("<div style='margin-top:16px;'></div>", unsafe_allow_html=True)
        for r in rows:
            with st.container():
                c_info, c_btn = st.columns([3, 1])
                with c_info:
                    st.markdown(f"""
                    <div style="padding:12px 16px; background:var(--canvas-soft); border-radius:8px; border:1px solid var(--hairline); margin-bottom:8px;">
                      <div style="font-weight:500; font-size:14px; color:var(--ink);">{r['Name']}</div>
                      <div style="font-size:12px; color:var(--body);">{r['Email']}</div>
                    </div>
                    """, unsafe_allow_html=True)
                with c_btn:
                    if r["is_present"]:
                        st.markdown("""
                        <div style="height:100%; display:flex; align-items:center; justify-content:center;
                             background:#f0fdf4; border:1px solid #86efac; border-radius:8px; color:#15803d; font-weight:600; font-size:13px; margin-bottom:8px;">
                          Present ✓
                        </div>
                        """, unsafe_allow_html=True)
                    else:
                        if st.button("✅ Mark Present", key=f"manual_{r['id']}", use_container_width=True):
                            ok, err = db.mark_attendance_manual(session_id, r["id"])
                            if ok:
                                st.rerun()
                            else:
                                st.error(f"Error: {err}")

        # Export CSV
        import pandas as pd
        df_export = pd.DataFrame([{"Name": r["Name"], "Email": r["Email"], "Status": r["Status"]} for r in rows])
        csv = df_export.to_csv(index=False).encode()
        sess_title = st.session_state.get("active_session_title", "")
        export_name = f"attendance_{cls['class_name']}_{sess_title or datetime.now().date()}.csv".replace(" ", "_")
        st.download_button("⬇ Export CSV", csv, export_name, "text/csv")
        
    except Exception as e:
        st.error(f"Error loading roster: {e}")


# ── Tab 3: Analytics ──────────────────────────────────────────

def _tab_analytics():
    import pandas as pd
    import plotly.graph_objects as go
    uid = st.session_state["user_id"]

    st.markdown("""
    <div style="margin-bottom:24px;">
      <span class="ak-mono-label">analytics</span>
      <h2 style="font-size:24px; font-weight:600; letter-spacing:-0.03em;
           color:var(--ink); margin:4px 0 0;">Attendance Insights.</h2>
    </div>
    """, unsafe_allow_html=True)

    classes = db.get_classes_for_teacher(uid)

    if not classes:
        st.info("No classes to analyse.")
        return

    cls_names = {c["class_name"]: c for c in classes}
    selected = st.selectbox("Select Class", list(cls_names.keys()), key="analytics_cls")
    cls = cls_names[selected]

    try:
        from collections import Counter
        # All data fetched via service layer (batch queries)
        sessions = db.get_sessions_for_class(cls["id"])

        if not sessions:
            st.markdown("""
            <div class="ak-card" style="text-align:center; padding:48px;">
              <div style="font-size:2rem;">📊</div>
              <p style="color:var(--body); margin-top:12px;">
                No sessions recorded yet.
              </p>
            </div>
            """, unsafe_allow_html=True)
            return

        session_ids = [s["id"] for s in sessions]

        # Enrolled students
        enrollments = db.get_enrollments_for_class(cls["id"], decode_biometrics=False)
        total_students = len(enrollments)

        # All records in one query
        records = db.get_records_for_sessions(session_ids)

        # Attendance % per session
        sess_map = {s["id"]: s["date"] for s in sessions}
        counts = Counter(r["session_id"] for r in records)
        dates = [sess_map[sid] for sid in session_ids]
        pcts  = [round(counts.get(sid, 0) / max(total_students, 1) * 100, 1) for sid in session_ids]

        # Line chart
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=dates, y=pcts,
            mode="lines+markers",
            line=dict(color="#171717", width=2),
            marker=dict(size=7, color="#171717"),
            fill="tozeroy",
            fillcolor="rgba(23,23,23,0.05)",
            name="Attendance %",
        ))
        fig.update_layout(
            paper_bgcolor="#ffffff",
            plot_bgcolor="#ffffff",
            font=dict(color="#4d4d4d", family="Inter", size=12),
            xaxis=dict(gridcolor="#ebebeb", linecolor="#ebebeb", title="Session Date"),
            yaxis=dict(gridcolor="#ebebeb", linecolor="#ebebeb", title="Attendance %", range=[0, 110]),
            margin=dict(l=20, r=20, t=20, b=20),
            height=280,
        )
        st.plotly_chart(fig, use_container_width=True)

        # Per-student presence table
        if total_students > 0:
            st.markdown("<p class='ak-mono-label' style='margin:16px 0 8px;'>per-student attendance</p>",
                        unsafe_allow_html=True)
            student_ids = [e["student_id"] for e in enrollments]
            user_map = db.get_users_by_ids(student_ids)
            users = {uid_: u["name"] for uid_, u in user_map.items()}

            student_counts = Counter(r["student_id"] for r in records)
            s_rows = []
            low_attendance_count = 0
            
            for sid in student_ids:
                pct = round(student_counts.get(sid, 0) / max(len(sessions), 1) * 100, 1)
                is_low = pct < 75.0
                if is_low:
                    low_attendance_count += 1
                
                s_rows.append({
                    "Student": users.get(sid, sid),
                    "Sessions Present": student_counts.get(sid, 0),
                    "Total Sessions": len(sessions),
                    "Attendance %": pct,
                    "_is_low": is_low
                })
                
            s_df = pd.DataFrame(s_rows).sort_values("Attendance %", ascending=False)
            
            # Show summary alert if there are low attendance students
            if low_attendance_count > 0:
                st.markdown(f"""
                <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; margin-bottom:16px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:18px;">⚠️</span>
                    <span style="font-weight:600; color:#b91c1c;">Low Attendance Alert</span>
                  </div>
                  <p style="color:#991b1b; font-size:13px; margin:4px 0 0;">
                    {low_attendance_count} student(s) have fallen below the 75% minimum attendance requirement.
                  </p>
                </div>
                """, unsafe_allow_html=True)
            
            # Helper to format rows
            def _format_row(r):
                if r["_is_low"]:
                    return f"🔴 {r['Attendance %']}%"
                return f"{r['Attendance %']}%"
                
            s_df["Status"] = s_df.apply(_format_row, axis=1)
            display_df = s_df[["Student", "Sessions Present", "Total Sessions", "Status"]]
            
            st.dataframe(display_df, use_container_width=True, hide_index=True)

    except Exception as e:
        st.error(f"Analytics error: {e}")


# ── Main render ───────────────────────────────────────────────

def render_teacher():
    _topbar()
    tab1, tab2, tab3 = st.tabs(["📚 My Classes", "📡 Live Attendance", "📊 Analytics"])
    with tab1:
        _tab_classes()
    with tab2:
        _tab_live()
    with tab3:
        _tab_analytics()
