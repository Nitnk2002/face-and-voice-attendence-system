"""
Student Screen — Apni Kaksha
Vercel DESIGN.md system: white canvas, ink #171717, Inter, stacked card shadows.
"""
import streamlit as st
import pandas as pd
import plotly.graph_objects as go

from src.utils.supabase_client import get_supabase
from src.services import db_service as db


def _topbar():
    name = st.session_state.get("user_name", "Student")
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
          <span style="font-weight:600; font-size:15px;
               letter-spacing:-0.02em; color:var(--ink);">🎓 Apni Kaksha</span>
          <span style="color:var(--hairline);">·</span>
          <span class="ak-mono-label">student portal</span>
          <span style="margin-left:8px; font-size:13px; color:var(--body);">
            Welcome, {name}
          </span>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown("<div style='padding-top:12px;'></div>", unsafe_allow_html=True)
        theme = st.session_state.get("theme", "light")
        label = "🌙 Dark" if theme == "light" else "☀️ Light"
        if st.button(label, key="s_theme", use_container_width=True):
            st.session_state["theme"] = "dark" if theme == "light" else "light"
            st.rerun()
    with col3:
        st.markdown("<div style='padding-top:12px;'></div>", unsafe_allow_html=True)
        if st.button("Sign out", key="s_logout", use_container_width=True):
            for k in ["login_type", "user_id", "user_email", "user_name", "class_id"]:
                st.session_state[k] = None
            st.session_state["explicit_logout"] = True
            st.query_params.clear()
            st.rerun()


def _tab_join():
    sb = get_supabase()
    uid = st.session_state["user_id"]

    # ── If enrollment is pending, show ONLY the enrollment dialog ──
    if "pending_enroll_class" in st.session_state and st.session_state["pending_enroll_class"]:
        from src.components.dialog_auto_enroll import render_auto_enroll_dialog
        cls = st.session_state["pending_enroll_class"]
        render_auto_enroll_dialog(cls["join_code"], cls)
        return

    # ── Join form ──────────────────────────────────────────────
    st.markdown("""
    <div style="margin-bottom:24px;">
      <span class="ak-mono-label">enroll</span>
      <h2 style="font-size:24px; font-weight:600; letter-spacing:-0.03em;
           color:var(--ink); margin:4px 0 0;">Join a Class.</h2>
    </div>
    """, unsafe_allow_html=True)

    col_form, col_gap = st.columns([2, 1])
    with col_form:
        st.markdown("""
        <div class="ak-card-soft" style="margin-bottom:24px;">
          <p style="font-size:13px; color:var(--body); margin:0 0 16px;">
            Enter the join code your teacher shared, then capture your face and
            record your voice to complete enrollment.
          </p>
        """, unsafe_allow_html=True)

        join_code = st.text_input(
            "Join code",
            placeholder="e.g. AB3X7K2",
            key="join_code_input"
        ).strip().upper()

        if st.button("Join class →", key="btn_join", use_container_width=True):
            if not join_code:
                st.error("Enter a join code.")
            else:
                try:
                    cls_res = sb.table("classes").select("*").eq("join_code", join_code).single().execute()
                    cls = cls_res.data
                    if not cls:
                        st.error("Invalid join code. Check with your teacher.")
                    else:
                        existing = sb.table("enrollments").select("id").eq("class_id", cls["id"]).eq("student_id", uid).execute()
                        if existing.data:
                            st.info(f"You are already enrolled in **{cls['class_name']}**.")
                        else:
                            st.session_state["pending_enroll_class"] = cls
                            st.rerun()
                except Exception as e:
                    st.error(f"Error: {e}")

        st.markdown("</div>", unsafe_allow_html=True)

    # ── My enrolled classes ────────────────────────────────────
    st.markdown("""
    <div style="margin:32px 0 16px;">
      <span class="ak-mono-label">enrolled</span>
      <h3 style="font-size:20px; font-weight:600; letter-spacing:-0.03em;
           color:var(--ink); margin:4px 0 0;">My Classes.</h3>
    </div>
    """, unsafe_allow_html=True)

    try:
        enr_res = sb.table("enrollments").select("class_id").eq("student_id", uid).execute()
        class_ids = [e["class_id"] for e in (enr_res.data or [])]

        if not class_ids:
            st.markdown("""
            <div class="ak-card-soft" style="text-align:center; padding:40px 24px;">
              <p class="ak-mono-label" style="margin-bottom:8px;">no classes yet</p>
              <p style="color:var(--body); font-size:14px; margin:0;">
                Use a join code above to enroll in your first class.
              </p>
            </div>
            """, unsafe_allow_html=True)
        else:
            cls_res = sb.table("classes").select("*").in_("id", class_ids).execute()
            cols = st.columns(min(len(cls_res.data or []), 3))
            for i, cls in enumerate(cls_res.data or []):
                with cols[i % 3]:
                    st.markdown(f"""
                    <div class="ak-card" style="padding: 16px;">
                      <h4 style="margin:0 0 8px; font-size:15px; font-weight:600;
                           letter-spacing:-0.02em; color:var(--ink);">
                        {cls['class_name']}
                      </h4>
                      <span class="badge-mono">Code: {cls['join_code']}</span>
                    </div>
                    """, unsafe_allow_html=True)
                    if st.button("Leave Class", key=f"leave_{cls['id']}", use_container_width=True):
                        try:
                            sb.table("enrollments").delete().eq("class_id", cls["id"]).eq("student_id", uid).execute()
                            st.success(f"Left {cls['class_name']}.")
                            st.rerun()
                        except Exception as ex:
                            st.error(f"Error: {ex}")
    except Exception as e:
        st.error(str(e))

def _tab_history():
    sb = get_supabase()
    uid = st.session_state["user_id"]

    st.markdown("""
    <div style="margin-bottom:24px;">
      <span class="ak-mono-label">history</span>
      <h2 style="font-size:24px; font-weight:600; letter-spacing:-0.03em;
           color:var(--ink); margin:4px 0 0;">Attendance History.</h2>
    </div>
    """, unsafe_allow_html=True)

    try:
        enr_res = sb.table("enrollments").select("class_id").eq("student_id", uid).execute()
        class_ids = [e["class_id"] for e in (enr_res.data or [])]

        if not class_ids:
            st.markdown("""
            <div class="ak-card-soft" style="text-align:center; padding:48px 24px;">
              <p class="ak-mono-label" style="margin-bottom:8px;">no history yet</p>
              <p style="color:var(--body); font-size:14px; margin:0;">
                Join a class first.
              </p>
            </div>
            """, unsafe_allow_html=True)
            return

        cls_res = sb.table("classes").select("id, class_name").in_("id", class_ids).execute()
        cls_map = {c["id"]: c["class_name"] for c in (cls_res.data or [])}
        cls_options = list(cls_map.values())
        selected_name = st.selectbox("Select class", cls_options, key="hist_cls")
        sel_cls_id = [k for k, v in cls_map.items() if v == selected_name][0]

        sess_res = sb.table("attendance_sessions").select("*").eq("class_id", sel_cls_id).order("date").execute()
        sessions = sess_res.data or []
        if not sessions:
            st.info("No sessions held yet for this class.")
            return

        session_ids = [s["id"] for s in sessions]
        present_sessions = db.get_student_records(uid, session_ids)

        rows = []
        for s in sessions:
            status = "Present ✓" if s["id"] in present_sessions else "Absent"
            s_title = s.get("session_title") or "Session"
            rows.append({"Date": s["date"][:10], "Title": s_title, "Status": status})

        df = pd.DataFrame(rows)
        total = len(rows)
        present_count = sum(1 for r in rows if r["Status"] == "Present ✓")
        pct = round(present_count / max(total, 1) * 100, 1)

        # Metrics
        col1, col2, col3 = st.columns(3)
        col1.metric("Sessions", total)
        col2.metric("Present", present_count)
        col3.metric("Attendance", f"{pct}%",
                    delta="Good ✓" if pct >= 75 else "Low",
                    delta_color="normal" if pct >= 75 else "inverse")

        # Bar chart — light design
        statuses = [1 if s["id"] in present_sessions else 0 for s in sessions]
        dates    = [s["date"] for s in sessions]
        colors   = ["#171717" if x else "#e5e5e5" for x in statuses]

        fig = go.Figure(go.Bar(
            x=dates, y=[1] * len(dates),
            marker_color=colors,
            text=["Present" if x else "Absent" for x in statuses],
            textposition="inside",
            textfont=dict(color=["#ffffff" if x else "#888888" for x in statuses],
                          family="JetBrains Mono", size=11),
        ))
        fig.update_layout(
            paper_bgcolor="#ffffff",
            plot_bgcolor="#ffffff",
            font=dict(color="#4d4d4d", family="Inter", size=12),
            xaxis=dict(gridcolor="#ebebeb", linecolor="#ebebeb"),
            yaxis=dict(visible=False),
            height=180,
            margin=dict(l=0, r=0, t=8, b=8),
            showlegend=False,
        )
        st.plotly_chart(fig, use_container_width=True)

        # Table
        st.markdown("<p class='ak-mono-label' style='margin:16px 0 8px;'>session log</p>",
                    unsafe_allow_html=True)
        st.dataframe(df, use_container_width=True, hide_index=True)

    except Exception as e:
        st.error(f"Error loading history: {e}")


def _tab_mark_attendance():
    sb = get_supabase()
    uid = st.session_state["user_id"]
    
    st.markdown("""
    <div style="margin-bottom:24px;">
      <span class="ak-mono-label">attendance</span>
      <h2 style="font-size:24px; font-weight:600; letter-spacing:-0.03em;
           color:var(--ink); margin:4px 0 0;">Mark My Attendance.</h2>
    </div>
    """, unsafe_allow_html=True)
    
    try:
        enr_res = sb.table("enrollments").select("class_id, face_encoding, voice_encoding").eq("student_id", uid).execute()
        enrollments = enr_res.data or []
        if not enrollments:
            st.info("You are not enrolled in any classes. Join a class first.")
            return
            
        class_ids = [e["class_id"] for e in enrollments]
        cls_res = sb.table("classes").select("id, class_name").in_("id", class_ids).execute()
        cls_map = {c["id"]: c["class_name"] for c in (cls_res.data or [])}
        
        # Build map of active sessions for enrolled classes
        active_sessions = db.get_active_sessions_for_classes(class_ids)
        
        cls_options = list(cls_map.values())
        selected_name = st.selectbox("Select Class", cls_options, key="mark_cls_sel")
        sel_cls_id = [k for k, v in cls_map.items() if v == selected_name][0]
        
        if sel_cls_id not in active_sessions:
            st.markdown("""
            <div class="ak-card-soft" style="text-align:center; padding:32px;">
              <p style="color:var(--body); margin:0;">No active session for this class right now.</p>
              <p style="color:var(--mute); font-size:12px; margin-top:8px;">Wait for your teacher to start a session.</p>
            </div>
            """, unsafe_allow_html=True)
            return
            
        session = active_sessions[sel_cls_id]
        s_title = session.get('session_title') or 'Session'
        st.success(f"✅ **{s_title}** is currently active.")
        
        # Check if already marked
        rec_res = sb.table("attendance_records").select("id").eq("session_id", session["id"]).eq("student_id", uid).execute()
        if rec_res.data:
            st.info("You have already been marked present for this session.")
            return
            
        t_face, t_voice = st.tabs(["📸 Face Verification", "🎙️ Voice Verification"])
        
        with t_face:
            st.write("Take a photo of yourself to mark your attendance.")
            cam_img = st.camera_input("", key="student_cam", label_visibility="collapsed")
            if cam_img:
                with st.spinner("Verifying identity..."):
                    from src.utils.face_utils import encode_face_from_bytes, compare_faces
                    import json
                    
                    candidate_enc = encode_face_from_bytes(cam_img.getvalue())
                    if candidate_enc is None:
                        st.error("No face detected. Please ensure good lighting and look directly at the camera.")
                    else:
                        enrolled_face = next((e["face_encoding"] for e in enrollments if e["class_id"] == sel_cls_id), None)
                        if enrolled_face:
                            try:
                                if isinstance(enrolled_face, str):
                                    enrolled_face = json.loads(enrolled_face)
                                    
                                is_match = compare_faces(enrolled_face, candidate_enc)
                                if is_match:
                                    sb.table("attendance_records").insert({
                                        "session_id": session["id"],
                                        "student_id": uid,
                                        "method": "face"
                                    }).execute()
                                    st.success("🎉 Identity verified! You have been marked present.")
                                    st.balloons()
                                else:
                                    st.error("Face does not match the enrolled profile for this class. Try again.")
                            except Exception as e:
                                st.error(f"Verification error: {e}")
                        else:
                            st.error("No face enrollment found for this class.")

        with t_voice:
            st.write("Speak for 5–10 seconds to verify your identity.")
            
            audio_val = st.audio_input("Record your voice", key="voice_recorder_student")
            
            recorded_bytes = None
            if audio_val is not None:
                recorded_bytes = audio_val.getvalue()
                
            voice_file = st.file_uploader("Or upload voice sample", type=["wav", "mp3", "ogg", "m4a", "webm"], key="stu_voice_upload")
            if voice_file:
                recorded_bytes = voice_file.read()
                
            if recorded_bytes and len(recorded_bytes) > 1000:
                with st.spinner("Verifying voice..."):
                    from src.utils.voice_utils import encode_voice_from_bytes, compare_voices
                    import json
                    
                    candidate_voice_enc = encode_voice_from_bytes(recorded_bytes)
                    if candidate_voice_enc is None:
                        st.error("Voice not recognized clearly. Please try again.")
                    else:
                        enrolled_voice = next((e["voice_encoding"] for e in enrollments if e["class_id"] == sel_cls_id), None)
                        if enrolled_voice:
                            try:
                                if isinstance(enrolled_voice, str):
                                    enrolled_voice = json.loads(enrolled_voice)
                                    
                                is_match = compare_voices(enrolled_voice, candidate_voice_enc)
                                if is_match:
                                    sb.table("attendance_records").insert({
                                        "session_id": session["id"],
                                        "student_id": uid,
                                        "method": "voice"
                                    }).execute()
                                    st.success("🎉 Voice verified! You have been marked present.")
                                    st.balloons()
                                else:
                                    st.error("Voice does not match the enrolled profile for this class. Try again.")
                            except Exception as e:
                                st.error(f"Voice Verification error: {e}")
                        else:
                            st.error("No voice enrollment found for this class.")
            
    except Exception as e:
        st.error(f"Error: {e}")


def render_student():
    _topbar()
    tab1, tab2, tab3 = st.tabs(["🚀 Join / Classes", "📷 Mark Attendance", "📅 Attendance History"])
    with tab1:
        _tab_join()
    with tab2:
        _tab_mark_attendance()
    with tab3:
        _tab_history()
