from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
from database import db
from models.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserRole
from utils.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    
    # Create default settings
    settings_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "notifications_email": True,
        "notifications_sms": False,
        "theme": "system"
    }
    await db.settings.insert_one(settings_doc)
    
    # Generate token
    token = create_access_token({"sub": user_id})
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role=user_data.role,
            created_at=now
        )
    )

@router.post("/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    
    # Check user exists and has password field
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Get password safely - if missing, user can't login
    stored_password = user.get("password")
    if not stored_password:
        raise HTTPException(status_code=401, detail="Account not properly configured. Please contact support.")
    
    if not verify_password(credentials.password, stored_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = user.get("id", str(user.get("_id", "")))
    token = create_access_token({"sub": user_id})
    
    user_data = {k: v for k, v in user.items() if k != "password" and k != "_id"}
    if "id" not in user_data:
        user_data["id"] = user_id
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
