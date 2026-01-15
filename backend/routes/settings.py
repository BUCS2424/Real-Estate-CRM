from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from database import db
from models.settings import SettingsUpdate, SettingsResponse, GeneralSettingsModel
from models.user import UserRole
from utils.auth import get_current_user

router = APIRouter()

@router.get("", response_model=SettingsResponse)
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return SettingsResponse(**settings)

@router.put("", response_model=SettingsResponse)
async def update_settings(settings: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": settings.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    updated = await db.settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return SettingsResponse(**updated)

@router.get("/general")
async def get_general_settings(current_user: dict = Depends(get_current_user)):
    """Get general application settings"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.general_settings.find_one({}, {"_id": 0})
    if not settings:
        return GeneralSettingsModel().model_dump()
    return settings

@router.get("/branding")
async def get_public_branding():
    """Get public branding settings (no auth required)"""
    settings = await db.general_settings.find_one({}, {"_id": 0})
    
    # Return only branding-related fields for public access
    default_branding = {
        "siteName": "Fusion Luxury Estates",
        "logoUrl": "",
        "logoLinkUrl": "/",
        "dashboardLogoUrl": "",
        "dashboardLogoLinkUrl": "/dashboard",
        "faviconUrl": "",
        "pwaIconUrl": "",
    }
    
    if not settings:
        return default_branding
    
    return {
        "siteName": settings.get("siteName", default_branding["siteName"]),
        "logoUrl": settings.get("logoUrl", default_branding["logoUrl"]),
        "logoLinkUrl": settings.get("logoLinkUrl", default_branding["logoLinkUrl"]),
        "dashboardLogoUrl": settings.get("dashboardLogoUrl", default_branding["dashboardLogoUrl"]),
        "dashboardLogoLinkUrl": settings.get("dashboardLogoLinkUrl", default_branding["dashboardLogoLinkUrl"]),
        "faviconUrl": settings.get("faviconUrl", default_branding["faviconUrl"]),
        "pwaIconUrl": settings.get("pwaIconUrl", default_branding["pwaIconUrl"]),
    }

@router.put("/general")
async def update_general_settings(settings_data: dict, current_user: dict = Depends(get_current_user)):
    """Update general application settings"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings_data["updated_by"] = current_user["id"]
    
    await db.general_settings.update_one(
        {},
        {"$set": settings_data},
        upsert=True
    )
    
    return {"message": "Settings saved successfully", "data": settings_data}
