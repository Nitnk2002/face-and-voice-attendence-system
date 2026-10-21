"""
Home / Login screen — Apni Kaksha
Vercel DESIGN.md system: white canvas, ink #171717, Inter, stacked shadows.
"""
import streamlit as st


def _nav():
    col1, col2, col3 = st.columns([5, 1, 1])
    with col1:
        st.markdown("""
        <div style="
          height:64px;
          border-bottom:1px solid var(--hairline);
          background:var(--canvas);
          display:flex;
          align-items:center;
          padding:0 32px;
          margin-bottom:0;
        ">
          <span style="font-weight:600; font-size:15px; letter-spacing:-0.02em; color:var(--ink); margin-right: 12px;">
            🎓 Apni Kaksha
          </span>
          <span class="ak-mono-label">ai attendance platform</span>
        </div>
        """, unsafe_allow_html=True)
    with col2:
        st.markdown("<div style='padding-top:12px;'></div>", unsafe_allow_html=True)
        theme = st.session_state.get("theme", "light")
        label = "🌙 Dark" if theme == "light" else "☀️ Light"
        if st.button(label, key="h_theme", use_container_width=True):
            st.session_state["theme"] = "dark" if theme == "light" else "light"
            st.rerun()
    with col3:
        st.markdown("<div style='padding-top:12px;'></div>", unsafe_allow_html=True)
        if not st.session_state.get("show_login_page"):
            if st.button("Sign In →", key="h_signin", use_container_width=True):
                st.session_state["show_login_page"] = True
                st.rerun()
        else:
            if st.button("← Home", key="h_home", use_container_width=True):
                st.session_state["show_login_page"] = False
                st.rerun()

def _landing_page():
    # Hero Section
    st.markdown("""
    <style>
    @keyframes fadeInUP {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
    }
    .landing-hero {
        text-align: center;
        padding: 80px 20px 40px;
        animation: fadeInUP 0.8s ease-out;
    }
    .hero-badge {
        display: inline-block;
        background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(147,51,234,0.1));
        border: 1px solid rgba(59,130,246,0.2);
        border-radius: 9999px;
        padding: 8px 20px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
        font-weight: 600;
        color: var(--link);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: 32px;
        box-shadow: 0 4px 12px rgba(59,130,246,0.1);
    }
    .landing-title {
        font-size: 56px !important;
        font-weight: 800 !important;
        line-height: 1.1 !important;
        margin-bottom: 24px;
        letter-spacing: -0.04em !important;
        background: linear-gradient(135deg, var(--ink) 30%, var(--mute) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    .landing-subtitle {
        font-size: 20px;
        line-height: 1.6;
        color: var(--body);
        max-width: 640px;
        margin: 0 auto 48px;
        font-weight: 400;
    }
    .premium-card {
        background: var(--canvas);
        border: 1px solid var(--hairline);
        border-radius: 16px;
        padding: 32px;
        height: 100%;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: var(--shadow-2);
        position: relative;
        overflow: hidden;
    }
    .premium-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; height: 4px;
        background: linear-gradient(90deg, #3b82f6, #9333ea);
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    .premium-card:hover {
        transform: translateY(-8px);
        box-shadow: var(--shadow-4);
        border-color: rgba(59,130,246,0.3);
    }
    .premium-card:hover::before {
        opacity: 1;
    }
    .feature-icon-wrapper {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 56px;
        height: 56px;
        border-radius: 14px;
        background: var(--canvas-soft2);
        font-size: 28px;
        margin-bottom: 20px;
        border: 1px solid var(--hairline);
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    }
    .premium-feature-title {
        font-size: 20px !important;
        font-weight: 700 !important;
        margin-bottom: 12px;
        color: var(--ink);
        letter-spacing: -0.02em !important;
    }
    .premium-feature-desc {
        font-size: 15px;
        color: var(--body);
        line-height: 1.6;
    }
    </style>
    
    <div class="landing-hero">
      <div class="hero-badge">
        ✨ Next-Gen Classroom Tech
      </div>
      <h1 class="landing-title">
        The AI Attendance Platform <br> Built for India.
      </h1>
      <p class="landing-subtitle">
        Eliminate roll calls. Apni Kaksha uses high-speed facial recognition and voice verification to automatically mark student attendance with 99.9% accuracy.
      </p>
    </div>
    """, unsafe_allow_html=True)
    
    col_btn_l, col_btn_c, col_btn_r = st.columns([1, 1, 1])
    with col_btn_c:
        if st.button("Get Started Now", key="btn_get_started", use_container_width=True):
            st.session_state["show_login_page"] = True
            st.rerun()

    st.markdown("<div style='height:80px;'></div>", unsafe_allow_html=True)

    # Features Section
    st.markdown("""
    <h2 style="text-align:center; font-size:36px; font-weight:700; margin-bottom: 64px; color:var(--ink); letter-spacing:-0.03em;">
      Why choose Apni Kaksha?
    </h2>
    """, unsafe_allow_html=True)

    f1, f2, f3 = st.columns(3)
    with f1:
        st.markdown("""
        <div class="premium-card">
          <div class="feature-icon-wrapper">📸</div>
          <div class="premium-feature-title">Lightning Fast Face ID</div>
          <div class="premium-feature-desc">Scan entire classrooms in seconds. Our optimized embedding engine works securely and locally directly in your browser.</div>
        </div>
        """, unsafe_allow_html=True)
    with f2:
        st.markdown("""
        <div class="premium-card">
          <div class="feature-icon-wrapper">🎙️</div>
          <div class="premium-feature-title">Dual Verification</div>
          <div class="premium-feature-desc">Optional voice biometric fallbacks ensure absolute certainty for high-stakes exams and proxy prevention.</div>
        </div>
        """, unsafe_allow_html=True)
    with f3:
        st.markdown("""
        <div class="premium-card">
          <div class="feature-icon-wrapper">📊</div>
          <div class="premium-feature-title">Smart Analytics</div>
          <div class="premium-feature-desc">Get instant insights into student engagement, low-attendance alerts, and seamless CSV exports for admin reporting.</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height:80px;'></div>", unsafe_allow_html=True)
    st.markdown("""
    <div style="text-align:center; padding: 40px; border-top: 1px solid var(--hairline);">
        <p style="color:var(--mute); font-size:13px; font-family:'JetBrains Mono',monospace; font-weight:600; letter-spacing:0.08em; margin:0;">
          🇮🇳 CRAFTED FOR INDIAN EDUCATORS
        </p>
    </div>
    """, unsafe_allow_html=True)
# ── Shared helpers ─────────────────────────────────────────────
def _input_label(text: str):
    st.markdown(f"""
    <p style="font-size:13px; font-weight:500; color:var(--body);
       margin:0 0 6px; font-family:'Inter',sans-serif;">{text}</p>
    """, unsafe_allow_html=True)


import time
from src.services.auth_service import AuthService
from src.utils.auth_utils import is_valid_email, validate_password_strength

# ── Authentication Forms ──────────────────────────────────────
def _check_rate_limit():
    if "login_attempts" not in st.session_state:
        st.session_state["login_attempts"] = 0
        st.session_state["lockout_time"] = 0
        
    if time.time() < st.session_state["lockout_time"]:
        rem = int(st.session_state["lockout_time"] - time.time())
        st.error(f"Too many failed attempts. Try again in {rem} seconds.")
        return False
    return True

def _record_failed_login():
    st.session_state["login_attempts"] += 1
    if st.session_state["login_attempts"] >= 5:
        st.session_state["lockout_time"] = time.time() + 60
        st.session_state["login_attempts"] = 0

def _render_login_form(role: str):
    label = "teacher" if role == "teacher" else "student"
    st.markdown(f"""
    <p style="font-size:13px; color:var(--mute); margin:0 0 20px; font-family:'JetBrains Mono',monospace;">
      Sign in to your {label} account.
    </p>
    """, unsafe_allow_html=True)

    email = st.text_input("Email address", key=f"{role}_email", placeholder=f"{label}@school.edu")
    password = st.text_input("Password", key=f"{role}_pass", type="password", placeholder="••••••••")

    st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)
    col1, col2 = st.columns(2)
    login_clicked = col1.button("Sign in →", key=f"btn_{role}_login", use_container_width=True)
    register_clicked = col2.button("Create account", key=f"btn_{role}_reg", use_container_width=True)

    if login_clicked:
        if not _check_rate_limit():
            return
            
        if not email or not password:
            st.error("Please enter your email and password.")
        elif not is_valid_email(email):
            st.error("Please enter a valid email format.")
        else:
            with st.spinner("Authenticating..."):
                success, msg, user = AuthService.login(email, password, role)
                if success:
                    st.session_state["login_type"] = role
                    for k, v in user.items():
                        st.session_state[f"user_{k}"] = v
                    st.session_state["login_attempts"] = 0
                    st.rerun()
                else:
                    _record_failed_login()
                    st.error(msg)

    if register_clicked:
        st.session_state[f"show_reg_{role}"] = not st.session_state.get(f"show_reg_{role}", False)

    if st.session_state.get(f"show_reg_{role}"):
        _render_register_form(role)

def _render_register_form(role: str):
    label = "teacher" if role == "teacher" else "student"
    st.markdown(f"""
    <hr style="border-color:var(--hairline); margin:20px 0;">
    <p style="font-size:13px; font-weight:500; color:var(--ink); margin:0 0 16px;">
      Create a {label} account
    </p>
    """, unsafe_allow_html=True)

    name = st.text_input("Full name", key=f"r_{role}_name", placeholder="Dr. Priya Sharma" if role == "teacher" else "Arjun Kumar")
    email = st.text_input("Email", key=f"r_{role}_email", placeholder=f"{label}@school.edu")
    password = st.text_input("Password", key=f"r_{role}_pass", type="password", placeholder="Min 8 chars, 1 uppercase, 1 number")
    confirm = st.text_input("Confirm password", key=f"r_{role}_confirm", type="password", placeholder="Repeat password")

    if st.button("Create account →", key=f"btn_create_{role}", use_container_width=True):
        if not all([name, email, password, confirm]):
            st.error("All fields are required.")
        elif not is_valid_email(email):
            st.error("Please enter a valid email format.")
        elif password != confirm:
            st.error("Passwords do not match.")
        else:
            is_strong, err_msg = validate_password_strength(password)
            if not is_strong:
                st.error(err_msg)
            else:
                with st.spinner("Creating account..."):
                    success, msg = AuthService.register(name, email, password, role)
                    if success:
                        st.success(msg + " You can now sign in.")
                        st.session_state[f"show_reg_{role}"] = False
                        st.rerun()
                    else:
                        st.error(msg)


# ── Main render ───────────────────────────────────────────────
def render_home():
    _nav()
    
    if not st.session_state.get("show_login_page", False):
        _landing_page()
    else:
        st.markdown("<div style='height: 48px;'></div>", unsafe_allow_html=True)
        # Centered auth card
        col_l, col_c, col_r = st.columns([1, 1.5, 1])
        with col_c:
            st.markdown("""
            <div style="text-align:center; margin-bottom:32px;">
                <h2 style="font-size:32px; margin-bottom:8px; color:var(--ink);">Welcome Back.</h2>
                <p style="color:var(--body);">Sign in or create an account to continue.</p>
            </div>
            """, unsafe_allow_html=True)
            
            tab_teacher, tab_student = st.tabs(["👩‍🏫 Teacher", "🎓 Student"])
            with tab_teacher:
                _render_login_form("teacher")
            with tab_student:
                _render_login_form("student")

