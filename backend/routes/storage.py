from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid
from database import db
from models.storage import StorageProviderType
from models.user import UserRole
from utils.auth import get_current_user

router = APIRouter()

@router.get("/providers")
async def get_storage_providers(current_user: dict = Depends(get_current_user)):
    """Get all storage providers configuration"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    providers_cursor = db.storage_providers.find({})
    providers = []
    async for p in providers_cursor:
        p.pop("_id", None)
        providers.append(p)
    
    # If no providers exist, create default templates
    if not providers:
        default_providers = [
            {
                "id": str(uuid.uuid4()),
                "provider_type": StorageProviderType.GOOGLE_DRIVE,
                "name": "Google Drive",
                "is_active": False,
                "is_default": False,
                "credentials": {},
                "settings": {"folder_id": "", "use_service_account": False},
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "provider_type": StorageProviderType.IDRIVE,
                "name": "iDrive",
                "is_active": False,
                "is_default": False,
                "credentials": {},
                "settings": {"bucket": "", "region": "us-east-1"},
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "provider_type": StorageProviderType.CPANEL,
                "name": "cPanel",
                "is_active": False,
                "is_default": False,
                "credentials": {},
                "settings": {"host": "", "port": 21, "directory": "/public_html/uploads"},
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "provider_type": StorageProviderType.PCLOUD,
                "name": "pCloud",
                "is_active": False,
                "is_default": False,
                "credentials": {},
                "settings": {"folder_id": "0"},
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "provider_type": StorageProviderType.CUSTOM_CDN,
                "name": "Custom CDN",
                "is_active": False,
                "is_default": False,
                "credentials": {},
                "settings": {"endpoint_url": "", "bucket": "", "public_url": "", "region": ""},
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.storage_providers.insert_many(default_providers)
        providers = default_providers
    
    # Don't expose actual credentials in response
    for provider in providers:
        provider["credentials_configured"] = bool(provider.get("credentials"))
        provider.pop("credentials", None)
        provider.pop("_id", None)
    
    return providers

@router.get("/providers/{provider_id}")
async def get_storage_provider(provider_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    provider = await db.storage_providers.find_one({"id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    provider["credentials_configured"] = bool(provider.get("credentials"))
    if provider.get("credentials"):
        provider["credentials"] = {k: "••••••••" for k in provider["credentials"].keys()}
    
    return provider

@router.put("/providers/{provider_id}")
async def update_storage_provider(provider_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    provider = await db.storage_providers.find_one({"id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    if updates.get("is_default") == True:
        await db.storage_providers.update_many(
            {"id": {"$ne": provider_id}},
            {"$set": {"is_default": False}}
        )
    
    if "credentials" in updates and updates["credentials"]:
        existing_creds = provider.get("credentials", {})
        new_creds = {k: v for k, v in updates["credentials"].items() if v and v != "••••••••"}
        existing_creds.update(new_creds)
        updates["credentials"] = existing_creds
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.storage_providers.update_one({"id": provider_id}, {"$set": updates})
    
    updated = await db.storage_providers.find_one({"id": provider_id}, {"_id": 0})
    updated["credentials_configured"] = bool(updated.get("credentials"))
    updated.pop("credentials", None)
    
    return updated

@router.post("/providers/{provider_id}/test")
async def test_storage_provider(provider_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    provider = await db.storage_providers.find_one({"id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    if not provider.get("credentials"):
        return {"success": False, "message": "No credentials configured"}
    
    provider_type = provider["provider_type"]
    
    if provider_type == StorageProviderType.GOOGLE_DRIVE:
        has_required = all(k in provider["credentials"] for k in ["client_id", "client_secret"])
    elif provider_type == StorageProviderType.IDRIVE:
        has_required = all(k in provider["credentials"] for k in ["access_key", "secret_key"])
    elif provider_type == StorageProviderType.CPANEL:
        has_required = all(k in provider["credentials"] for k in ["username", "password"])
    elif provider_type == StorageProviderType.PCLOUD:
        has_required = all(k in provider["credentials"] for k in ["access_token"])
    elif provider_type == StorageProviderType.CUSTOM_CDN:
        has_required = all(k in provider["credentials"] for k in ["api_key"])
    else:
        has_required = False
    
    if has_required:
        return {"success": True, "message": "Connection test successful (credentials configured)"}
    else:
        return {"success": False, "message": "Missing required credentials"}

@router.get("/default")
async def get_default_storage_provider(current_user: dict = Depends(get_current_user)):
    provider = await db.storage_providers.find_one({"is_default": True, "is_active": True}, {"_id": 0})
    if not provider:
        return {"provider": None, "message": "No default storage provider configured"}
    
    provider["credentials_configured"] = bool(provider.get("credentials"))
    provider.pop("credentials", None)
    
    return {"provider": provider}

@router.post("/providers/{provider_id}/set-default")
async def set_default_storage_provider(provider_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    provider = await db.storage_providers.find_one({"id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    await db.storage_providers.update_many({}, {"$set": {"is_default": False}})
    await db.storage_providers.update_one(
        {"id": provider_id},
        {"$set": {"is_default": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"{provider['name']} set as default storage provider"}
