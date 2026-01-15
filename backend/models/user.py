from pydantic import BaseModel
from typing import Optional

class UserRole:
    SUPERUSER = "superuser"
    ADMIN = "admin"
    CLIENT = "client"

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = UserRole.CLIENT

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
