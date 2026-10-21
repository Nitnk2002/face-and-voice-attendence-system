"""
Auth utilities — bcrypt password hashing/verification, input validation, and native JWTs.
"""
import bcrypt
import re
import json
import base64
import hmac
import hashlib
import time
import os

# JWT Secret - ideally loaded from env in production
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-apni-kaksha-fallback-key").encode()


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if plain matches the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ── Input Validation ──────────────────────────────────────────
def is_valid_email(email: str) -> bool:
    """Validate email format using regex."""
    pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    return re.match(pattern, email) is not None


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Check if password meets complexity requirements."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number."
    return True, ""


# ── Native JWT Implementation ─────────────────────────────────
def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def generate_jwt(payload: dict, expires_in_seconds: int = 86400) -> str:
    """Generate a native HMAC-SHA256 JWT."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload["exp"] = int(time.time()) + expires_in_seconds
    
    encoded_header = base64url_encode(json.dumps(header).encode())
    encoded_payload = base64url_encode(json.dumps(payload).encode())
    
    message = f"{encoded_header}.{encoded_payload}".encode()
    signature = hmac.new(JWT_SECRET, message, hashlib.sha256).digest()
    encoded_signature = base64url_encode(signature)
    
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"

def verify_jwt(token: str) -> dict | None:
    """Verify the JWT signature and expiration. Returns payload if valid."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
            
        message = f"{parts[0]}.{parts[1]}".encode()
        expected_sig = base64url_encode(hmac.new(JWT_SECRET, message, hashlib.sha256).digest())
        
        # hmac.compare_digest prevents timing attacks
        if not hmac.compare_digest(expected_sig, parts[2]):
            return None
            
        # Add padding back if necessary
        payload_b64 = parts[1]
        payload_b64 += '=' * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
        
        if payload.get("exp", 0) < int(time.time()):
            return None # Expired
            
        return payload
    except Exception:
        return None
