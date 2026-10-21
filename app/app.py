"""
Apni Kaksha — AI Attendance Platform
Entry point: routes between screens based on st.session_state['login_type']
"""

# ── Suppress harmless Windows asyncio noise (WinError 10054) ─
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
import logging
logging.getLogger("asyncio").setLevel(logging.CRITICAL)

import streamlit as st
from dotenv import load_dotenv

load_dotenv()

# ── Page config (must be first Streamlit call) ────────────────
st.set_page_config(
    page_title="Apni Kaksha — AI Attendance",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── Shared CSS injection ──────────────────────────────────────
def inject_global_css():
    theme = st.session_state.get("theme", "light")
    
    if theme == "light":
        theme_css = """
        :root {
          --ink:          #0d253d;
          --ink-mute:     #64748d;
          --canvas:       #ffffff;
          --canvas-soft:  #f6f9fc;
          --canvas-soft2: #e3e8ee;
          --body:         #273951;
          --mute:         #64748d;
          --hairline:     #e3e8ee;
          --link:         #533afd;
          --error:        #ea2261;
          --error-soft:   #f7d4d6;
          --on-primary:   #ffffff;
          
          /* 3-Color Theme Accents */
          --primary:      #533afd;
          --primary-deep: #4434d4;
          --primary-soft: #665efd;
          --accent:       #f96bee;
          --secondary:    #ea2261;
        }
        """
    else:
        theme_css = """
        :root {
          --ink:          #ffffff;
          --ink-mute:     #a8c3de;
          --canvas:       #0d253d;
          --canvas-soft:  #1c1e54;
          --canvas-soft2: #273951;
          --body:         #a8c3de;
          --mute:         #64748d;
          --hairline:     #273951;
          --link:         #665efd;
          --error:        #ea2261;
          --error-soft:   #7f1d1d;
          --on-primary:   #ffffff;
          
          /* 3-Color Theme Accents */
          --primary:      #665efd;
          --primary-deep: #533afd;
          --primary-soft: #b9b9f9;
          --accent:       #f96bee;
          --secondary:    #ea2261;
        }
        """

    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600&family=JetBrains+Mono:wght@400&display=swap');

    /* ── DESIGN.md tokens ─────────────────────────────────────── */
    """ + theme_css + """
    :root {
      /* Stacked shadows — never single heavy drop */
      --shadow-2: 0 1px 1px rgba(0,0,0,0.03), 0 2px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.06) inset;
      --shadow-3: 0 2px 2px rgba(0,0,0,0.04), 0 8px 8px -8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06) inset;
      --shadow-4: 0 2px 2px rgba(0,0,0,0.04), 0 8px 16px -4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06) inset;
      --shadow-5: 0 1px 1px rgba(0,0,0,0.02), 0 8px 16px -4px rgba(0,0,0,0.06), 0 24px 32px -8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06) inset;
    }

    /* ── Global reset ────────────────────────────────────────── */
    html, body, [class*="css"] {
      font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      background-color: var(--canvas-soft) !important;
      color: var(--ink) !important;
    }
    .stApp { background: var(--canvas-soft) !important; }

    /* Remove Streamlit chrome (except header and sidebar so it can be used if needed) */
    #MainMenu, footer, .stAppHeader,
    [data-testid="stToolbar"],
    [data-testid="stDecoration"], [data-testid="stStatusWidget"],
    .stDeployButton { display: none !important; }
    .stAppViewContainer { padding-top: 0 !important; }
    .block-container { padding-top: 0 !important; max-width: 1200px !important; }
    [data-testid="stAppViewBlockContainer"] { padding-top: 0 !important; }

    /* ── Typography ──────────────────────────────────────────── */
    h1, h2, h3, h4 {
      font-family: 'Inter', sans-serif !important;
      font-weight: 600 !important;
      color: var(--ink) !important;
      letter-spacing: -0.04em !important;
    }
    p { color: var(--body); line-height: 1.6; }

    /* ── Buttons — Stripe pill (primary) ───────────────────────── */
    .stButton > button,
    .stButton > button:focus,
    .stButton > button:focus:not(:active),
    div[data-testid="stButton"] > button {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      font-size: 14px !important;
      border-radius: 9999px !important;
      background: var(--primary) !important;
      background-color: var(--primary) !important;
      color: var(--on-primary) !important;
      border: 1px solid var(--primary) !important;
      padding: 0 20px !important;
      height: 40px !important;
      letter-spacing: -0.01em !important;
      transition: background-color 0.15s, transform 0.15s !important;
      box-shadow: var(--shadow-2) !important;
    }
    /* Force all text inside button white */
    .stButton > button p,
    .stButton > button span,
    .stButton > button div,
    div[data-testid="stButton"] > button p,
    div[data-testid="stButton"] > button span {
      color: var(--on-primary) !important;
    }
    .stButton > button:hover,
    div[data-testid="stButton"] > button:hover {
      background: var(--primary-deep) !important;
      background-color: var(--primary-deep) !important;
      color: var(--on-primary) !important;
      border: 1px solid var(--primary-deep) !important;
      transform: translateY(-1px) !important;
      box-shadow: var(--shadow-3) !important;
    }
    .stButton > button:active { 
      background: var(--primary-deep) !important;
      transform: translateY(0) !important;
      box-shadow: var(--shadow-2) !important;
    }

    /* ── Inputs (40px, 6px radius, #ebebeb border) ──────────── */
    .stTextInput > div > div > input,
    .stTextArea > div > div > textarea {
      background: var(--canvas) !important;
      border: 1px solid var(--hairline) !important;
      border-radius: 6px !important;
      color: var(--ink) !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 14px !important;
      height: 40px !important;
      padding: 0 12px !important;
      transition: border-color 0.15s, box-shadow 0.15s !important;
    }
    .stTextInput > div > div > input:focus,
    .stTextArea > div > div > textarea:focus {
      border-color: var(--ink) !important;
      box-shadow: 0 0 0 3px rgba(23,23,23,0.08) !important;
      outline: none !important;
    }
    .stTextInput label, .stTextArea label, .stSelectbox label {
      color: var(--body) !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      font-family: 'Inter', sans-serif !important;
      margin-bottom: 6px !important;
    }
    .stTextInput [data-testid="stTextInputRootElement"] button {
      background: transparent !important;
      color: var(--mute) !important;
      border: none !important;
      border-radius: 4px !important;
    }

    /* ── Selectbox ──────────────────────────────────────────── */
    .stSelectbox > div > div {
      background: var(--canvas) !important;
      border: 1px solid var(--hairline) !important;
      border-radius: 6px !important;
      color: var(--ink) !important;
      font-size: 14px !important;
    }

    /* ── File uploader ──────────────────────────────────────── */
    [data-testid="stFileUploader"] {
      background: var(--canvas-soft) !important;
      border: 1px dashed var(--hairline) !important;
      border-radius: 8px !important;
    }

    /* ── Ghost pill tabs ────────────────────────────────────── */
    .stTabs [data-baseweb="tab-list"] {
      background: var(--canvas-soft2) !important;
      border-radius: 9999px !important;
      padding: 4px !important;
      gap: 2px !important;
      border: 1px solid var(--hairline) !important;
      width: fit-content !important;
      margin-bottom: 24px !important;
    }
    .stTabs [data-baseweb="tab"] {
      border-radius: 9999px !important;
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      font-size: 13px !important;
      color: var(--body) !important;
      background: transparent !important;
      padding: 6px 16px !important;
      border: none !important;
    }
    .stTabs [aria-selected="true"] {
      background: var(--canvas) !important;
      color: var(--ink) !important;
      box-shadow: var(--shadow-2) !important;
    }

    /* ── Metrics ────────────────────────────────────────────── */
    [data-testid="metric-container"] {
      background: var(--canvas);
      border: 1px solid var(--hairline);
      border-radius: 8px;
      padding: 16px 20px;
      box-shadow: var(--shadow-2);
    }
    [data-testid="metric-container"] [data-testid="stMetricLabel"] {
      color: var(--mute) !important;
      font-size: 11px !important;
      font-weight: 400 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.06em !important;
      font-family: 'JetBrains Mono', monospace !important;
    }
    [data-testid="metric-container"] [data-testid="stMetricValue"] {
      color: var(--ink) !important;
      font-size: 28px !important;
      font-weight: 600 !important;
      letter-spacing: -0.04em !important;
    }

    /* ── Dataframe (table header mono caps) ─────────────────── */
    [data-testid="stDataFrame"] {
      border: 1px solid var(--hairline) !important;
      border-radius: 8px !important;
      overflow: hidden !important;
    }

    /* ── Alerts ─────────────────────────────────────────────── */
    [data-testid="stAlert"] { border-radius: 8px !important; border: 1px solid !important; }
    .stSuccess { background: #f0fdf4 !important; border-color: #86efac !important; color: #15803d !important; }
    .stError   { background: var(--error-soft) !important; border-color: #fca5a5 !important; color: var(--error) !important; }
    .stWarning { background: #fffbeb !important; border-color: #fcd34d !important; color: #92400e !important; }
    .stInfo    { background: #eff6ff !important; border-color: #93c5fd !important; color: #1e40af !important; }

    /* ── Spinner ────────────────────────────────────────────── */
    .stSpinner > div { border-color: var(--ink) transparent transparent !important; }

    /* ── Divider ────────────────────────────────────────────── */
    hr { border-color: var(--hairline) !important; margin: 24px 0 !important; }

    /* ── Card classes ───────────────────────────────────────── */
    .ak-card {
      background: var(--canvas);
      border: 1px solid var(--hairline);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 16px;
      box-shadow: var(--shadow-2);
      transition: all 0.2s ease-in-out;
    }
    .ak-card:hover {
      box-shadow: var(--shadow-4);
      transform: translateY(-2px);
      border-color: var(--mute);
    }
    .ak-card-lg {
      background: var(--canvas);
      border: 1px solid var(--hairline);
      border-radius: 16px;
      padding: 40px;
      box-shadow: var(--shadow-5);
    }
    .ak-card-soft {
      background: var(--canvas-soft);
      border: 1px solid var(--hairline);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 12px;
    }

    /* ── Landing Page Utilities ─────────────────────────────── */
    .landing-hero {
      text-align: center;
      padding: 80px 20px 60px;
      background: var(--canvas);
      border-bottom: 1px solid var(--hairline);
      margin-bottom: 40px;
    }
    .landing-title {
      font-size: 56px !important;
      font-weight: 800 !important;
      letter-spacing: -0.06em !important;
      line-height: 1.1 !important;
      color: var(--ink) !important;
      margin-bottom: 24px !important;
    }
    .landing-subtitle {
      font-size: 20px !important;
      color: var(--body) !important;
      max-width: 600px !important;
      margin: 0 auto 40px !important;
      line-height: 1.5 !important;
    }
    .feature-icon {
      font-size: 32px;
      margin-bottom: 16px;
    }
    .feature-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 8px;
    }
    .feature-desc {
      font-size: 14px;
      color: var(--body);
      line-height: 1.5;
    }

    /* ── Badges ─────────────────────────────────────────────── */
    .badge-present {
      background: #f0fdf4; color: #15803d;
      border: 1px solid #86efac;
      padding: 2px 10px; border-radius: 9999px;
      font-size: 12px; font-weight: 500;
    }
    .badge-absent {
      background: #fef2f2; color: #dc2626;
      border: 1px solid #fca5a5;
      padding: 2px 10px; border-radius: 9999px;
      font-size: 12px; font-weight: 500;
    }
    .badge-mono {
      background: var(--canvas-soft2); color: var(--mute);
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px; padding: 2px 8px;
      border-radius: 9999px; border: 1px solid var(--hairline);
    }

    /* ── Expander ────────────────────────────────────────────── */
    [data-testid="stExpander"] {
      border: 1px solid var(--hairline) !important;
      border-radius: 8px !important;
      background: var(--canvas) !important;
      box-shadow: var(--shadow-2) !important;
    }
    [data-testid="stExpander"] summary {
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
      font-size: 14px !important;
      color: var(--ink) !important;
    }

    /* ── Camera input ─────────────────────────────────────────── */
    [data-testid="stCameraInput"] {
      border: 1px solid var(--hairline) !important;
      border-radius: 8px !important;
      overflow: hidden !important;
      background: var(--canvas-soft) !important;
    }
    [data-testid="stCameraInputButton"] {
      background: var(--ink) !important;
      color: var(--on-primary) !important;
      border-radius: 100px !important;
      font-family: 'Inter', sans-serif !important;
      font-weight: 500 !important;
    }

    /* ── Download button ────────────────────────────────────── */
    [data-testid="stDownloadButton"] > button {
      background: var(--canvas) !important;
      color: var(--ink) !important;
      border: 1px solid var(--hairline) !important;
    }

    /* ── Utility text classes ────────────────────────────────── */
    .ak-mono-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px; color: var(--mute);
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .ak-display {
      font-family: 'Inter', sans-serif;
      font-weight: 600; color: var(--ink);
      letter-spacing: -0.05em;
    }
    </style>
    """, unsafe_allow_html=True)



# ── Session state defaults + localStorage persistence ────────
def init_session():
    defaults = {
        "login_type": None,
        "user_id":    None,
        "user_email": None,
        "user_name":  None,
        "class_id":   None,
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val


def inject_session_persistence():
    """Save session to window.top.localStorage via same-origin iframe."""
    lt = st.session_state.get("login_type") or ""
    uid = st.session_state.get("user_id") or ""
    name = st.session_state.get("user_name") or ""
    email = st.session_state.get("user_email") or ""

    if lt:
        import streamlit.components.v1 as components
        components.html(f"""
        <script>
        function getLS() {{
            try {{ return window.top.localStorage; }} catch(e) {{}}
            try {{ return window.parent.localStorage; }} catch(e) {{}}
            return window.localStorage;
        }}
        try {{
            var ls = getLS();
            ls.setItem('ak_login_type', {repr(lt)});
            ls.setItem('ak_user_id',    {repr(uid)});
            ls.setItem('ak_user_name',  {repr(name)});
            ls.setItem('ak_user_email', {repr(email)});
        }} catch(e) {{}}
        </script>
        """, height=0, width=0)


def restore_session_from_storage():
    """Restore session after refresh using localStorage -> URL params."""
    if st.session_state.get("login_type") or st.session_state.get("explicit_logout"):
        return

    params = st.query_params
    lt    = params.get("_ak_lt",    None)
    uid   = params.get("_ak_uid",   None)
    name  = params.get("_ak_name",  "")
    email = params.get("_ak_email", "")

    if lt and uid:
        st.session_state["login_type"] = lt
        st.session_state["user_id"]    = uid
        st.session_state["user_name"]  = name
        st.session_state["user_email"] = email
        st.query_params.clear()
        st.rerun()
        return

    import streamlit.components.v1 as components
    components.html("""
    <script>
    function getLS() {
        try { return window.top.localStorage; } catch(e) {}
        try { return window.parent.localStorage; } catch(e) {}
        return window.localStorage;
    }
    function getLoc() {
        try { return window.top.location; } catch(e) {}
        try { return window.parent.location; } catch(e) {}
        return window.location;
    }
    try {
        var ls = getLS();
        var lt    = ls.getItem('ak_login_type');
        var uid   = ls.getItem('ak_user_id');
        var name_ = ls.getItem('ak_user_name');
        var email = ls.getItem('ak_user_email');

        if (lt && uid) {
            var loc = getLoc();
            var url = new URL(loc.href);
            if (!url.searchParams.get('_ak_lt')) {
                url.searchParams.set('_ak_lt',    lt);
                url.searchParams.set('_ak_uid',   uid);
                url.searchParams.set('_ak_name',  name_ || '');
                url.searchParams.set('_ak_email', email || '');
                loc.href = url.toString();
            }
        }
    } catch(e) {}
    </script>
    """, height=0, width=0)


def clear_session_storage():
    """Clear localStorage on logout."""
    import streamlit.components.v1 as components
    components.html("""
    <script>
    function getLS() {
        try { return window.top.localStorage; } catch(e) {}
        try { return window.parent.localStorage; } catch(e) {}
        return window.localStorage;
    }
    try {
        var ls = getLS();
        ls.removeItem('ak_login_type');
        ls.removeItem('ak_user_id');
        ls.removeItem('ak_user_name');
        ls.removeItem('ak_user_email');
    } catch(e) {}
    </script>
    """, height=0, width=0)


# ── Supabase credential check ─────────────────────────────────
def check_supabase_setup() -> bool:
    """Re-reads .env fresh every call so updates are picked up without restart."""
    from dotenv import dotenv_values
    import pathlib

    env_path = pathlib.Path(__file__).parent / ".env"
    values = dotenv_values(env_path) if env_path.exists() else {}

    url = values.get("SUPABASE_URL", "") or ""
    key = values.get("SUPABASE_ANON_KEY", "") or ""

    bad = ["your-project-id", "your-actual", "placeholder", "example"]
    if not url or not key:
        return False
    if any(b in url.lower() for b in bad) or any(b in key.lower() for b in bad):
        return False
    return True


def render_setup_screen():
    """Friendly screen shown when Supabase is not yet configured."""
    # Minimal nav
    st.markdown("""
    <div style="height:64px; border-bottom:1px solid var(--hairline);
         background:var(--canvas); display:flex; align-items:center; padding:0 32px;
         font-weight:600; font-size:15px; letter-spacing:-0.02em; color:var(--ink);">
      🎓 Apni Kaksha
    </div>
    """, unsafe_allow_html=True)

    col_l, col_c, col_r = st.columns([1, 2, 1])
    with col_c:
        st.markdown("""
        <div style="padding:48px 0 32px; text-align:center;">
          <span class="ak-mono-label">setup required</span>
          <h1 style="font-size:40px; font-weight:600; letter-spacing:-0.05em;
               color:var(--ink); margin:12px 0 8px; line-height:1;">
            Configure Supabase.
          </h1>
          <p style="color:var(--body); font-size:16px; max-width:400px; margin:0 auto;">
            The app needs your Supabase credentials before it can start.
          </p>
        </div>
        """, unsafe_allow_html=True)

        # Error banner
        st.markdown("""
        <div style="background:#fef2f2; border:1px solid #fca5a5;
             border-radius:8px; padding:16px 20px; margin-bottom:24px;">
          <p style="color:#dc2626; font-weight:500; font-size:14px; margin:0 0 4px;">
            ⚠️ Supabase credentials not configured
          </p>
          <p style="color:#7f1d1d; font-size:13px; margin:0;">
            The <code style="font-family:'JetBrains Mono',monospace; font-size:12px;
            background:#fee2e2; padding:1px 6px; border-radius:4px;">.env</code>
            file still has placeholder values.
          </p>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("""
        <div class="ak-card">
          <p class="ak-mono-label" style="margin:0 0 6px;">step 01</p>
          <p style="font-weight:500; color:var(--ink); margin:0 0 4px; font-size:15px;">
            Create a free Supabase project
          </p>
          <p style="color:var(--body); font-size:13px; margin:0;">
            Go to <a href="https://supabase.com" target="_blank"
            style="color:var(--link);">supabase.com</a>
            → New Project → wait ~2 min for it to launch
          </p>
        </div>
        <div class="ak-card">
          <p class="ak-mono-label" style="margin:0 0 6px;">step 02</p>
          <p style="font-weight:500; color:var(--ink); margin:0 0 4px; font-size:15px;">
            Copy your API keys
          </p>
          <p style="color:var(--body); font-size:13px; margin:0;">
            Project → ⚙️ Settings → API →
            copy <b>Project URL</b> and <b>anon / public key</b>
          </p>
        </div>
        <div class="ak-card">
          <p class="ak-mono-label" style="margin:0 0 6px;">step 03</p>
          <p style="font-weight:500; color:var(--ink); margin:0 0 4px; font-size:15px;">
            Update app/.env
          </p>
        </div>
        """, unsafe_allow_html=True)

        st.code("""SUPABASE_URL=https://xxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...""", language="bash")

        st.markdown("""
        <div class="ak-card">
          <p class="ak-mono-label" style="margin:0 0 6px;">step 04</p>
          <p style="font-weight:500; color:var(--ink); margin:0 0 4px; font-size:15px;">
            Run the database schema
          </p>
          <p style="color:var(--body); font-size:13px; margin:0;">
            Supabase → SQL Editor → paste SQL from
            <code style="font-family:'JetBrains Mono',monospace; font-size:12px;
            background:var(--canvas-soft2); padding:1px 6px; border-radius:4px;">
            docs/database-schema.md</code>
          </p>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("""
        <p style="color:var(--body); font-size:14px; margin-bottom:16px;">
          Then restart Streamlit — the app will load normally.
        </p>
        """, unsafe_allow_html=True)

        if st.button("Check again →", key="btn_recheck", use_container_width=True):
            st.cache_resource.clear()
            st.rerun()



# ── Query-param auto-enroll detection ────────────────────────
def check_join_code():
    params = st.query_params
    return params.get("join_code", None)


# ── Main router ───────────────────────────────────────────────
def main():
    inject_global_css()
    init_session()

    # Show setup screen if Supabase is not configured
    if not check_supabase_setup():
        render_setup_screen()
        return

    if st.session_state.get("explicit_logout"):
        clear_session_storage()
        st.session_state["explicit_logout"] = False

    # Restore login from localStorage if session_state is empty (page refresh)
    restore_session_from_storage()

    # Persist current login to localStorage on every render
    inject_session_persistence()

    join_code = check_join_code()

    # Auto-enroll dialog triggered by ?join_code=
    if join_code and st.session_state["login_type"] == "student":
        from src.components.dialog_auto_enroll import render_auto_enroll_dialog
        render_auto_enroll_dialog(join_code)
        return

    login_type = st.session_state["login_type"]

    if login_type is None:
        from src.screens.home_screen import render_home
        render_home()
    elif login_type == "teacher":
        from src.screens.teacher_screen import render_teacher
        render_teacher()
    elif login_type == "student":
        from src.screens.student_screen import render_student
        render_student()


if __name__ == "__main__":
    main()
