import streamlit as st
import base64
from src.utils.supabase_client import get_supabase

@st.dialog("Student Profile")
def render_student_profile(student_id: str, class_id: str):
    sb = get_supabase()
    
    try:
        # Fetch user details
        user_res = sb.table("users").select("*").eq("id", student_id).single().execute()
        user = user_res.data
        if not user:
            st.error("User not found.")
            return

        # Fetch enrollment details
        enr_res = sb.table("enrollments").select("*").eq("student_id", student_id).eq("class_id", class_id).single().execute()
        enrollment = enr_res.data
        if not enrollment:
            st.error("Enrollment data not found.")
            return

        st.markdown(f"### {user.get('name', 'Unknown')}")
        st.markdown(f"**Email:** {user.get('email', 'N/A')}")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("#### Enrollment Photo")
            photo_data = enrollment.get("face_image_base64")
            if photo_data:
                # Add base64 prefix if missing
                if not photo_data.startswith("data:image"):
                    photo_data = f"data:image/jpeg;base64,{photo_data}"
                st.markdown(f'<img src="{photo_data}" style="border-radius: 8px; width: 100%; max-width: 250px; border: 1px solid #ebebeb;" />', unsafe_allow_html=True)
            else:
                st.info("No enrollment photo saved.")
                
        with col2:
            st.markdown("#### Voice Audio")
            audio_data = enrollment.get("voice_audio_base64")
            if audio_data:
                try:
                    audio_bytes = base64.b64decode(audio_data)
                    st.audio(audio_bytes, format="audio/wav")
                except Exception as e:
                    st.error(f"Failed to load audio: {e}")
            else:
                st.info("No voice audio saved.")

    except Exception as e:
        st.error(f"Error loading profile: {e}")
