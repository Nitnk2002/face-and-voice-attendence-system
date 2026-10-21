from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from domain.models.user import RoleEnum

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: RoleEnum = RoleEnum.STUDENT

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        orm_mode = True
