"""
Supabase client — initialised from environment variables only.
Detects placeholder values and raises a clear, friendly error.
"""
import os
import streamlit as st


def _is_placeholder(val: str, keywords: list) -> bool:
    return any(k in val.lower() for k in keywords)


@st.cache_resource
def get_supabase():
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_ANON_KEY", "")

    placeholders = ["your-project-id", "your-actual", "placeholder", "example"]

    if not url or not key:
        raise EnvironmentError("MISSING_CREDENTIALS")
    if _is_placeholder(url, placeholders) or _is_placeholder(key, placeholders):
        raise EnvironmentError("PLACEHOLDER_CREDENTIALS")

    return create_client(url, key)
