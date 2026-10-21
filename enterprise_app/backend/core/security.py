import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt
from core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against a bcrypt hash.
    Directly uses the bcrypt library to avoid passlib 1.7.4 compatibility bugs with bcrypt 4.0+.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """
    Hashes a plaintext password using native bcrypt.
    """
    pw_bytes = (password or "").encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None, role: str = "teacher") -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "role": role}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_password_reset_token(email: str, expires_minutes: int = 15) -> str:
    """Creates a secure, signed password reset token valid for 15 minutes."""
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode = {
        "exp": expire,
        "sub": email.strip().lower(),
        "purpose": "password_reset"
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_password_reset_token(token: str) -> Optional[str]:
    """Validates password reset token and returns email if valid and unexpired."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("purpose") != "password_reset":
            return None
        return payload.get("sub")
    except Exception:
        return None
