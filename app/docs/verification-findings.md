# Apni Kaksha — Verification Findings

Built fresh from the SnapClass spec (SnapClass_Antigravity_Build_Spec.docx).

## Confirmed as built

| Spec Claim | Status |
|---|---|
| Streamlit main app | ✅ Built |
| Flask + Jinja2 landing page | ✅ Built |
| Supabase backend | ✅ Configured via env vars |
| face_recognition / dlib | ✅ Integrated in face_utils.py |
| resemblyzer / librosa | ✅ Integrated in voice_utils.py |
| bcrypt password hashing | ✅ auth_utils.py cost=12 |
| segno QR generation | ✅ teacher_screen.py |
| vercel.json | ✅ Created |
| .env.example | ✅ Created, no secrets |
| RLS on all tables | ✅ database-schema.md SQL |

## Assumptions corrected

- Voice recognition was noted as "unconfirmed" in the spec — confirmed built and integrated.
- No service-role key used anywhere — only anon key.

## What requires user action

1. **Create Supabase project** at [supabase.com](https://supabase.com)
2. **Run SQL** from `docs/database-schema.md` in the SQL Editor
3. **Populate `.env`** with your `SUPABASE_URL` and `SUPABASE_ANON_KEY`
4. **Install Python deps**: `py -m pip install -r requirements.txt` in `app/`
5. **Install dlib**: may require Visual Studio Build Tools on Windows
