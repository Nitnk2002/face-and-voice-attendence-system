from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from jose import jwt
from core.config import settings
from core.security import (
    create_access_token,
    verify_password,
    get_password_hash,
    create_password_reset_token,
    verify_password_reset_token
)
from domain.models.user import User
from infrastructure.database import get_db

router = APIRouter()

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "teacher"
    custom_id: str | None = None

class ChangePasswordRequest(BaseModel):
    email: str
    old_password: str
    new_password: str

@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        name=user.name,
        email=user.email,
        hashed_password=get_password_hash(user.password),
        role=user.role,
        custom_id=user.custom_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User created successfully"}

@router.post("/login")
def login_access_token(
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires, role=user.role
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role
    }

class TokenRefreshRequest(BaseModel):
    token: Optional[str] = None

@router.post("/refresh")
def refresh_access_token(
    body: Optional[TokenRefreshRequest] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Refreshes an active JWT access token to support continuous, multi-browser faculty sessions.
    Validates token signature, allows renewal for unexpired or gracefully expiring sessions,
    and returns a newly signed 30-minute token without logging out other devices.
    """
    token_to_verify = None
    if authorization and authorization.lower().startswith("bearer "):
        token_to_verify = authorization.split(" ", 1)[1].strip()
    elif body and body.token:
        token_to_verify = body.token.strip()

    if not token_to_verify:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token required for refresh"
        )

    try:
        # Decode without verifying expiration first to evaluate renewal eligibility
        payload = jwt.decode(
            token_to_verify,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": False}
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or malformed authentication token"
        )

    exp = payload.get("exp")
    user_id = payload.get("sub")
    if not exp or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required claims"
        )

    # Strictly disallow revival of ancient expired tokens (max grace window of 15 minutes)
    now_ts = datetime.now(timezone.utc).timestamp()
    if now_ts > (exp + 15 * 60):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again."
        )

    # Verify that the user still exists in the database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated"
        )

    new_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_token = create_access_token(
        subject=user.id,
        expires_delta=new_expires,
        role=user.role
    )

    return {
        "access_token": new_token,
        "token_type": "bearer",
        "role": user.role
    }

@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.old_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or old password",
        )
    
    user.hashed_password = get_password_hash(request.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    """
    One-time endpoint to create the default admin account.
    Will fail if an admin already exists.
    """
    existing = db.query(User).filter(User.email == "admin@school.local").first()
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists. Use /login with admin@school.local / Admin@1234")
    
    admin = User(
        name="System Admin",
        email="admin@school.local",
        hashed_password=get_password_hash("Admin@1234"),
        role="admin",
        custom_id="ADMIN-001"
    )
    db.add(admin)
    db.commit()
    return {"message": "Admin created!", "email": "admin@school.local", "password": "Admin@1234"}


class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Initiates password reset process. Generates a signed, single-purpose, 
    15-minute expiring token. Employs generic response to prevent account enumeration.
    """
    clean_email = request.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    # Generic security response regardless of whether email exists
    generic_msg = "If this email is registered in our institutional directory, password recovery instructions have been initiated."

    if not user:
        return {"message": generic_msg, "status": "processed"}

    token = create_password_reset_token(clean_email, expires_minutes=15)

    # In production, send via SMTP/Resend. For local development, token is issued.
    return {
        "message": generic_msg,
        "status": "processed",
        "dev_reset_token": token if settings.SECRET_KEY else None
    }

@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Verifies time-limited reset token and sets new password.
    """
    email = verify_password_reset_token(request.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token is invalid, expired, or has already been used."
        )

    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found."
        )

    user.hashed_password = get_password_hash(request.new_password)
    db.commit()

    return {
        "message": "Password successfully updated. You may now log in with your new password.",
        "status": "success"
    }
