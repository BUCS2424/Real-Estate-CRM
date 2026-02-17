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
    
    print(f"[DEBUG] Branding settings from DB: {settings}")
    
    # Return only branding-related fields for public access
    default_branding = {
        "siteName": "Hidden Haven Realty",
        "logoUrl": "",
        "logoLinkUrl": "/",
        "dashboardLogoUrl": "",
        "dashboardLogoLinkUrl": "/dashboard",
        "faviconUrl": "",
        "pwaIconUrl": "",
    }
    
    if not settings:
        print("[DEBUG] No settings found, returning defaults")
        return default_branding
    
    result = {
        "siteName": settings.get("siteName", default_branding["siteName"]),
        "logoUrl": settings.get("logoUrl", default_branding["logoUrl"]),
        "logoLinkUrl": settings.get("logoLinkUrl", default_branding["logoLinkUrl"]),
        "dashboardLogoUrl": settings.get("dashboardLogoUrl", default_branding["dashboardLogoUrl"]),
        "dashboardLogoLinkUrl": settings.get("dashboardLogoLinkUrl", default_branding["dashboardLogoLinkUrl"]),
        "faviconUrl": settings.get("faviconUrl", default_branding["faviconUrl"]),
        "pwaIconUrl": settings.get("pwaIconUrl", default_branding["pwaIconUrl"]),
    }
    print(f"[DEBUG] Returning branding: {result}")
    return result

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

# ============ TELNYX SETTINGS ============

@router.get("/telnyx")
async def get_telnyx_settings(current_user: dict = Depends(get_current_user)):
    """Get Telnyx SMS settings"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.telnyx_settings.find_one({}, {"_id": 0})
    if not settings:
        return {"apiKey": "", "phoneNumber": ""}
    
    # Mask API key for security
    masked_key = ""
    if settings.get("apiKey"):
        key = settings["apiKey"]
        masked_key = key[:8] + "..." + key[-4:] if len(key) > 12 else "***"
    
    return {
        "apiKey": masked_key,
        "phoneNumber": settings.get("phoneNumber", "")
    }

@router.post("/telnyx")
async def save_telnyx_settings(settings_data: dict, current_user: dict = Depends(get_current_user)):
    """Save Telnyx SMS settings"""
    import os
    
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Only save if new key provided (not masked)
    update_data = {
        "phoneNumber": settings_data.get("phoneNumber", ""),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["id"]
    }
    
    # Check if apiKey is a real key (not masked)
    api_key = settings_data.get("apiKey", "")
    if api_key and "..." not in api_key and api_key != "***":
        update_data["apiKey"] = api_key
        # Also update environment variable for current session
        os.environ["TELNYX_API_KEY"] = api_key
    
    if update_data.get("phoneNumber"):
        os.environ["TELNYX_PHONE_NUMBER"] = update_data["phoneNumber"]
    
    await db.telnyx_settings.update_one(
        {},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Telnyx settings saved"}

@router.post("/telnyx/test")
async def test_telnyx_connection(current_user: dict = Depends(get_current_user)):
    """Test Telnyx connection"""
    import os
    import telnyx
    
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get settings from DB
    settings = await db.telnyx_settings.find_one({}, {"_id": 0})
    api_key = settings.get("apiKey") if settings else os.environ.get("TELNYX_API_KEY")
    
    if not api_key:
        raise HTTPException(status_code=400, detail="No API key configured")
    
    try:
        telnyx.api_key = api_key
        # Try to list phone numbers to verify connection
        telnyx.PhoneNumber.list(page_size=1)
        return {"success": True, "message": "Connection successful!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")


# ============ MORTGAGE RATES SETTINGS ============

@router.get("/mortgage-rates")
async def get_mortgage_rates():
    """Get mortgage rate settings (public - used by calculator)"""
    settings = await db.mortgage_rates.find_one({}, {"_id": 0})
    
    # Return defaults if no settings exist
    if not settings:
        return {
            "conventional_30yr": 6.875,
            "conventional_20yr": 6.625,
            "conventional_15yr": 6.125,
            "conventional_10yr": 5.875,
            "fha_30yr": 6.500,
            "fha_15yr": 5.875,
            "va_30yr": 6.250,
            "va_15yr": 5.750,
            "usda_30yr": 6.375,
            "property_tax_rate": 1.1,
            "insurance_rate": 0.35,
            "pmi_rate_under_10": 1.0,
            "pmi_rate_10_to_20": 0.5,
            "fha_mip_upfront": 1.75,
            "fha_mip_annual": 0.85,
            "va_funding_fee": 2.15,
            "usda_guarantee_fee": 1.0,
            "usda_annual_fee": 0.35
        }
    
    return settings

@router.post("/mortgage-rates")
async def save_mortgage_rates(rates: dict, current_user: dict = Depends(get_current_user)):
    """Save mortgage rate settings (admin only)"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Add metadata
    rates["last_updated"] = datetime.now(timezone.utc).isoformat()
    rates["updated_by"] = current_user.get("email") or current_user.get("sub")
    
    await db.mortgage_rates.update_one(
        {},
        {"$set": rates},
        upsert=True
    )
    
    return {"message": "Mortgage rates saved successfully"}
