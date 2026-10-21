# 🎓 Apni Kaksha — AI Attendance Platform

> **Face & Voice Recognition Attendance System — built for Indian classrooms.**

Apni Kaksha is a full-stack, AI-powered attendance platform that lets teachers create classes and mark attendance automatically using student **face recognition** and **voice verification** — no manual roll-call needed.

![Python](https://img.shields.io/badge/Python-3.11%2B-171717?style=flat-square&logo=python&logoColor=white)
![Streamlit](https://img.shields.io/badge/Streamlit-1.35-FF4B4B?style=flat-square&logo=streamlit&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-171717?style=flat-square)

---

## ✨ Features

| Feature | Details |
|---|---|
| **Face Recognition** | OpenCV Haar Cascade + block-normalised feature vectors (cosine similarity ≥ 0.93 threshold) |
| **Voice Verification** | NumPy FFT spectral analysis fallback; `resemblyzer` when available |
| **Teacher Dashboard** | Create classes, generate QR join codes, view enrolled students, run live attendance sessions |
| **Student Portal** | Join classes via code/QR, self-enroll with face + voice, view personal attendance history |
| **Live Attendance** | Camera scan → face matched against enrolled student encodings → attendance marked instantly |
| **Analytics** | Per-session and per-student attendance charts with CSV export |
| **Graceful Fallbacks** | Works without `dlib` / `face_recognition` — uses OpenCV → PIL chain |

---

## 🏗️ Project Structure

```
face-and-voice-attendence-system/
│
├── app/                          # Main Streamlit application
│   ├── app.py                    # Entry point & router
│   ├── .env                      # Supabase credentials (not committed)
│   ├── .env.example              # Template for .env
│   ├── requirements.txt          # Python dependencies
│   │
│   ├── docs/
│   │   └── database-schema.md    # Full Supabase SQL setup script
│   │
│   └── src/
│       ├── components/
│       │   └── dialog_auto_enroll.py   # Face + voice enrollment dialog
│       │
│       ├── screens/
│       │   ├── home_screen.py          # Login & registration
│       │   ├── teacher_screen.py       # Teacher dashboard
│       │   └── student_screen.py       # Student portal
│       │
│       └── utils/
│           ├── supabase_client.py      # Supabase connection
│           ├── auth_utils.py           # bcrypt password hashing
│           ├── face_utils.py           # Face encoding & comparison
│           └── voice_utils.py          # Voice encoding & comparison
│
└── landing/                      # Marketing landing page (Flask)
    ├── app.py
    └── templates/
        └── index.html
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| **UI Framework** | [Streamlit](https://streamlit.io) |
| **Database** | [Supabase](https://supabase.com) (PostgreSQL) |
| **Face Detection** | OpenCV Haar Cascade |
| **Face Encoding** | Block-normalised pixel vectors (cosine similarity) |
| **Voice Processing** | NumPy FFT spectral fallback / `resemblyzer` |
| **Auth** | `bcrypt` password hashing + `st.session_state` |
| **QR Codes** | `segno` |
| **Charts** | Plotly |
| **Design System** | Vercel Design Language (Inter + JetBrains Mono) |

---

## 🚀 Getting Started

### Prerequisites

- Python **3.11** or **3.12** (recommended — `dlib` wheels exist for these)
- A free [Supabase](https://supabase.com) account

> ⚠️ **Python 3.13+ users:** `dlib` and `face_recognition` have no pre-built wheels yet.
> The app automatically falls back to the OpenCV + PIL recognition pipeline.

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/face-and-voice-attendence-system.git
cd face-and-voice-attendence-system
```

---

### 2. Install dependencies

```bash
cd app
py -m pip install -r requirements.txt
```

If `dlib` fails (common on Python 3.13+), install without it:

```bash
py -m pip install streamlit supabase bcrypt segno numpy Pillow opencv-python-headless ^
    sounddevice soundfile python-dotenv pandas plotly audio-recorder-streamlit
```

---

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Navigate to **Settings → API** and copy:
   - **Project URL**
   - **anon / public key**
3. Create `app/.env` from the example:

```bash
copy app\.env.example app\.env
```

4. Edit `app/.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

---

### 4. Run the database schema

In Supabase → **SQL Editor**, paste the full SQL from `app/docs/database-schema.md` and click **Run**.

This creates the following tables:
- `users` — teachers and students
- `classes` — teacher-owned classes
- `enrollments` — student ↔ class + face/voice encodings
- `attendance_sessions` — date-stamped sessions per class
- `attendance_records` — per-student attendance marks

---

### 5. Start the app

```bash
cd app
py -m streamlit run app.py
```

Open **http://localhost:8501** in your browser.

---

## 👩‍🏫 Usage Guide

### Teacher Flow

1. **Register** a teacher account on the login page
2. **Create a class** → a unique join code is generated automatically
3. **Share the join code** (or QR code) with students
4. Go to **📡 Live Attendance** → select your class → capture student faces
5. View results and download CSV from **📊 Analytics**

### Student Flow

1. **Register** a student account
2. On the **Join / Classes** tab, enter the teacher's join code
3. **Capture your face** via the camera
4. **Record your voice** using the in-browser mic recorder or upload a file
5. Submit — you are enrolled and will be recognised in future sessions

---

## 🔬 How Face Recognition Works

The app uses a **3-tier fallback** to ensure it works on all Python versions:

```
Tier 1 — face_recognition (dlib)
  128-D landmark vectors, industry standard
  Used when dlib is installed

Tier 2 — OpenCV Haar Cascade + Block Normalisation
  CLAHE illumination normalisation
  64x64 crop → 8x8 block contrast normalisation
  4096-D unit-norm vector
  Cosine similarity threshold: 0.93

Tier 3 — PIL centre-crop fallback
  Same block normalisation pipeline
  Used when OpenCV is unavailable
```

**Why cosine similarity at 0.93?**
Two vectors must be within ~21° of each other — far stricter than the legacy Euclidean distance (0.65 threshold) which caused false matches between different students.

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `users` | Teachers and students with bcrypt-hashed passwords |
| `classes` | Teacher-owned classes with unique join codes |
| `enrollments` | Student ↔ class mapping with stored face/voice encodings |
| `attendance_sessions` | One session per class per day |
| `attendance_records` | Per-student, per-session presence marks |

---

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public API key |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">Made with ❤️ for Indian classrooms &nbsp;·&nbsp; 🇮🇳 अपनी कक्षा</p>
