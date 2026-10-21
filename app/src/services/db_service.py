"""
Database Service — Centralised Supabase data-access layer.

All Supabase queries are defined here. Screens and components should
import from this module rather than calling get_supabase() directly.
This decouples business logic from the database client and makes
queries easy to cache, test, and optimise.
"""
from __future__ import annotations
import json
import streamlit as st
from src.utils.supabase_client import get_supabase


# ── Caching helpers ───────────────────────────────────────────

def _cache_key(*parts) -> str:
    return "__db_" + "_".join(str(p) for p in parts)


# ══════════════════════════════════════════════════════════════
# Users
# ══════════════════════════════════════════════════════════════

def get_user_by_id(user_id: str) -> dict | None:
    """Return a single user dict (without hashed_password) or None."""
    try:
        sb = get_supabase()
        res = sb.table("users").select("id, name, email, role").eq("id", user_id).single().execute()
        return res.data
    except Exception:
        return None


@st.cache_data(ttl=60, show_spinner=False)
def get_users_by_ids(user_ids: list[str]) -> dict[str, dict]:
    """Return {user_id: user_dict} for a list of ids."""
    if not user_ids:
        return {}
    try:
        sb = get_supabase()
        res = sb.table("users").select("id, name, email").in_("id", user_ids).execute()
        return {u["id"]: u for u in (res.data or [])}
    except Exception:
        return {}


# ══════════════════════════════════════════════════════════════
# Classes
# ══════════════════════════════════════════════════════════════

@st.cache_data(ttl=120, show_spinner=False)
def get_classes_for_teacher(teacher_id: str) -> list[dict]:
    """Cached: Return all classes owned by a teacher."""
    try:
        sb = get_supabase()
        res = sb.table("classes").select("*").eq("teacher_id", teacher_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception:
        return []


@st.cache_data(ttl=120, show_spinner=False)
def get_classes_for_student(student_id: str) -> list[dict]:
    """Cached: Return all classes a student is enrolled in."""
    try:
        sb = get_supabase()
        enr_res = sb.table("enrollments").select("class_id").eq("student_id", student_id).execute()
        class_ids = [e["class_id"] for e in (enr_res.data or [])]
        if not class_ids:
            return []
        cls_res = sb.table("classes").select("*").in_("id", class_ids).execute()
        return cls_res.data or []
    except Exception:
        return []


def create_class(teacher_id: str, class_name: str, join_code: str) -> tuple[bool, str]:
    """Insert a new class row. Returns (success, error_msg)."""
    try:
        sb = get_supabase()
        sb.table("classes").insert({
            "teacher_id": teacher_id,
            "class_name": class_name,
            "join_code": join_code,
        }).execute()
        # Bust class cache
        get_classes_for_teacher.clear()
        return True, ""
    except Exception as e:
        return False, str(e)


def delete_class(class_id: str) -> tuple[bool, str]:
    """Hard-delete a class. Returns (success, error_msg)."""
    try:
        sb = get_supabase()
        sb.table("classes").delete().eq("id", class_id).execute()
        get_classes_for_teacher.clear()
        return True, ""
    except Exception as e:
        return False, str(e)


def get_class_by_join_code(join_code: str) -> dict | None:
    """Return a class dict for a given join code, or None."""
    try:
        sb = get_supabase()
        res = sb.table("classes").select("*").eq("join_code", join_code).single().execute()
        return res.data
    except Exception:
        return None


# ══════════════════════════════════════════════════════════════
# Enrollments
# ══════════════════════════════════════════════════════════════

def get_enrollments_for_class(class_id: str, decode_biometrics: bool = True) -> list[dict]:
    """
    Return enrollment rows for a class.
    When decode_biometrics=True, pre-decode JSON face/voice encodings so
    the caller never has to handle raw strings.
    """
    try:
        sb = get_supabase()
        res = sb.table("enrollments").select("*").eq("class_id", class_id).execute()
        rows = res.data or []
        if decode_biometrics:
            for row in rows:
                for field in ("face_encoding", "voice_encoding"):
                    if isinstance(row.get(field), str):
                        try:
                            row[field] = json.loads(row[field])
                        except Exception:
                            row[field] = None
        return rows
    except Exception:
        return []


def is_student_enrolled(class_id: str, student_id: str) -> bool:
    """Return True if the student already has an enrollment row."""
    try:
        sb = get_supabase()
        res = sb.table("enrollments").select("id").eq("class_id", class_id).eq("student_id", student_id).execute()
        return bool(res.data)
    except Exception:
        return False


def unenroll_student(enrollment_id: str) -> tuple[bool, str]:
    """Remove an enrollment row by its primary key."""
    try:
        sb = get_supabase()
        sb.table("enrollments").delete().eq("id", enrollment_id).execute()
        return True, ""
    except Exception as e:
        return False, str(e)


# ══════════════════════════════════════════════════════════════
# Attendance Sessions
# ══════════════════════════════════════════════════════════════

def get_active_session(class_id: str) -> dict | None:
    """Return the currently active attendance session for a class, or None."""
    try:
        sb = get_supabase()
        res = sb.table("attendance_sessions").select("*").eq("class_id", class_id).eq("is_active", True).order("created_at", desc=True).limit(1).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


@st.cache_data(ttl=60, show_spinner=False)
def get_active_sessions_for_classes(class_ids: list[str]) -> dict[str, dict]:
    """Return {class_id: session} for all active sessions across multiple classes."""
    if not class_ids:
        return {}
    try:
        sb = get_supabase()
        res = sb.table("attendance_sessions").select("id, class_id, session_title, date").in_("class_id", class_ids).eq("is_active", True).execute()
        return {s["class_id"]: s for s in (res.data or [])}
    except Exception:
        return {}


@st.cache_data(ttl=60, show_spinner=False)
def get_sessions_for_class(class_id: str) -> list[dict]:
    """Return all sessions for a class, ordered by date ascending."""
    try:
        sb = get_supabase()
        res = sb.table("attendance_sessions").select("*").eq("class_id", class_id).order("date").execute()
        return res.data or []
    except Exception:
        return []


def start_session(class_id: str, session_date: str, session_title: str | None) -> tuple[dict | None, str]:
    """
    Deactivate any existing sessions for the class, then create a new active one.
    Returns (session_row, error_msg).
    """
    try:
        sb = get_supabase()
        sb.table("attendance_sessions").update({"is_active": False}).eq("class_id", class_id).eq("is_active", True).execute()
        res = sb.table("attendance_sessions").insert({
            "class_id": class_id,
            "date": session_date,
            "session_title": session_title or None,
            "is_active": True,
        }).execute()
        get_active_sessions_for_classes.clear()
        get_sessions_for_class.clear()
        return res.data[0], ""
    except Exception as e:
        return None, str(e)


def stop_session(class_id: str, session_id: str) -> tuple[bool, str]:
    """Deactivate the current session."""
    try:
        sb = get_supabase()
        sb.table("attendance_sessions").update({"is_active": False}).eq("id", session_id).execute()
        # Safety: also close any other active sessions for this class
        sb.table("attendance_sessions").update({"is_active": False}).eq("class_id", class_id).eq("is_active", True).execute()
        get_active_sessions_for_classes.clear()
        return True, ""
    except Exception as e:
        return False, str(e)


# ══════════════════════════════════════════════════════════════
# Attendance Records
# ══════════════════════════════════════════════════════════════

@st.cache_data(ttl=60, show_spinner=False)
def get_present_student_ids(session_id: str) -> set[str]:
    """Return the set of student_ids that are already present in a session."""
    try:
        sb = get_supabase()
        res = sb.table("attendance_records").select("student_id").eq("session_id", session_id).execute()
        return {r["student_id"] for r in (res.data or [])}
    except Exception:
        return set()


def mark_attendance(session_id: str, student_id: str, method: str) -> tuple[bool, str]:
    """
    Upsert an attendance record.
    Returns (success, error_msg).
    """
    try:
        sb = get_supabase()
        sb.table("attendance_records").upsert({
            "session_id": session_id,
            "student_id": student_id,
            "method": method,
        }, on_conflict="session_id,student_id").execute()
        get_records_for_sessions.clear()
        get_present_student_ids.clear()
        return True, ""
    except Exception as e:
        return False, str(e)


def mark_attendance_manual(session_id: str, student_id: str) -> tuple[bool, str]:
    """Insert a manual attendance record (no upsert — explicit insert)."""
    try:
        sb = get_supabase()
        sb.table("attendance_records").insert({
            "session_id": session_id,
            "student_id": student_id,
            "method": "manual",
        }).execute()
        get_records_for_sessions.clear()
        get_present_student_ids.clear()
        return True, ""
    except Exception as e:
        return False, str(e)


def get_records_for_session(session_id: str) -> list[dict]:
    """Return attendance records for a single session."""
    try:
        sb = get_supabase()
        res = sb.table("attendance_records").select("student_id, marked_at, method").eq("session_id", session_id).execute()
        return res.data or []
    except Exception:
        return []


@st.cache_data(ttl=60, show_spinner=False)
def get_records_for_sessions(session_ids: list[str]) -> list[dict]:
    """Return attendance records for multiple sessions at once."""
    if not session_ids:
        return []
    try:
        sb = get_supabase()
        res = sb.table("attendance_records").select("session_id, student_id").in_("session_id", session_ids).execute()
        return res.data or []
    except Exception:
        return []


def get_student_records(student_id: str, session_ids: list[str]) -> set[str]:
    """Return the set of session_ids where the student was present."""
    if not session_ids:
        return set()
    try:
        sb = get_supabase()
        res = sb.table("attendance_records").select("session_id").eq("student_id", student_id).in_("session_id", session_ids).execute()
        return {r["session_id"] for r in (res.data or [])}
    except Exception:
        return set()
