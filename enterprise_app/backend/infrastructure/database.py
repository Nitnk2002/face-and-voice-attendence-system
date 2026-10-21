import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

def get_normalized_db_url(url: str, supabase_url: str = "") -> str:
    """
    Normalizes database connection string:
    1. Replaces postgres:// or postgresql:// with postgresql+pg8000://
    2. Corrects unencoded '@' characters inside the password component
    3. Detects Supabase Connection Pooler hosts and ensures postgres.<project_ref> username is used
    """
    url = (url or "").strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+pg8000://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+pg8000://", 1)

    prefix, sep, rest = url.partition("://")
    if sep and "@" in rest:
        # Separate credentials from host:port/db by splitting on the LAST '@'
        cred_part, host_part = rest.rsplit("@", 1)
        if ":" in cred_part:
            user_part, pass_part = cred_part.split(":", 1)
            # Auto-detect Supabase pooler username requirement
            if user_part == "postgres" and "pooler.supabase.com" in host_part:
                match = re.search(r"https?://([^.]+)\.supabase\.co", supabase_url or "")
                if match:
                    user_part = f"postgres.{match.group(1)}"
            # Auto-encode unescaped '@' in the password part
            if "@" in pass_part and "%40" not in pass_part:
                pass_part = pass_part.replace("@", "%40")
            url = f"{prefix}://{user_part}:{pass_part}@{host_part}"
    return url

db_url = get_normalized_db_url(settings.DATABASE_URL, settings.SUPABASE_URL)

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Dependency to yield a database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
