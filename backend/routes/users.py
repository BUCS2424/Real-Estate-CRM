from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
import uuid
from database import db
from models.user import UserRole, UserResponse
from utils.auth import get_current_user, require_role, create_access_token

router = APIRouter()

@router.get("")
async def get_users(current_user: dict = Depends(require_role([UserRole.SUPERUSER]))):
    users = await db.users.find({}, {"password": 0, "password_hash": 0}).to_list(100)
    result = []
    for u in users:
        if "id" not in u and "_id" in u:
            u["id"] = str(u.pop("_id"))
        else:
            u.pop("_id", None)
        result.append(u)
    return result

@router.post("/{user_id}/impersonate")
async def impersonate_user(user_id: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER]))):
    """Super Admin only: generate a session token for another user so their
    profile/settings can be configured as them. Retains full superadmin
    permissions throughout (see get_current_user impersonation handling)."""
    target = await db.users.find_one({"id": user_id}, {"password": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if "id" not in target and "_id" in target:
        target["id"] = str(target.pop("_id"))
    else:
        target.pop("_id", None)
    target.pop("password_hash", None)

    if target["id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="You are already this user")

    # If the current session is itself an impersonation, attribute this to the
    # real original admin (not the currently-impersonated user) so nested
    # impersonation always audits and exits back correctly.
    real_admin_id = current_user.get("_impersonator_id") or current_user["id"]
    real_admin_name = current_user.get("_impersonator_name") or current_user.get("name")

    token = create_access_token({
        "sub": target["id"],
        "impersonator_id": real_admin_id,
        "impersonator_name": real_admin_name,
    })

    await db.impersonation_log.insert_one({
        "id": str(uuid.uuid4()),
        "impersonator_id": real_admin_id,
        "impersonator_name": real_admin_name,
        "target_user_id": target["id"],
        "target_name": target.get("name"),
        "started_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"access_token": token, "user": target}

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

@router.get("/me/signature")
async def get_my_signature(current_user: dict = Depends(get_current_user)):
    """Get current user's email signature"""
    user_id = current_user.get("id", str(current_user.get("_id", "")))
    signature = await db.user_signatures.find_one({"user_id": user_id}, {"_id": 0})
    if not signature:
        # Return user info as defaults
        return {
            "name": current_user.get("name", ""),
            "email": current_user.get("email", ""),
            "title": "",
            "phone": "",
            "company": "Hidden Haven Realty",
            "website": "",
            "customHtml": ""
        }
    return signature

@router.post("/me/signature")
async def save_my_signature(signature_data: dict, current_user: dict = Depends(get_current_user)):
    """Save current user's email signature"""
    from datetime import datetime, timezone
    
    user_id = current_user.get("id", str(current_user.get("_id", "")))
    
    signature_doc = {
        "user_id": user_id,
        "name": signature_data.get("name", ""),
        "title": signature_data.get("title", ""),
        "phone": signature_data.get("phone", ""),
        "email": signature_data.get("email", ""),
        "company": signature_data.get("company", "Hidden Haven Realty"),
        "website": signature_data.get("website", ""),
        "customHtml": signature_data.get("customHtml", ""),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_signatures.update_one(
        {"user_id": user_id},
        {"$set": signature_doc},
        upsert=True
    )
    
    return {"message": "Signature saved"}
