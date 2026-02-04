from fastapi import APIRouter, Depends, HTTPException
from typing import List
from database import db
from models.user import UserRole, UserResponse
from utils.auth import get_current_user, require_role

router = APIRouter()

@router.get("", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_role([UserRole.SUPERUSER]))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(**u) for u in users]

@router.patch("/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER]))):
    if role not in [UserRole.SUPERUSER, UserRole.ADMIN, UserRole.CLIENT]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User role updated to {role}"}

@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER]))):
    """Delete a user (superuser only)"""
    # Prevent self-deletion
    if user_id == current_user.get("id"):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Check user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}
