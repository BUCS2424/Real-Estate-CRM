"""
MLS API Routes - Bridge API Integration
Documentation: https://bridgedataoutput.com/docs/platform
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
from utils.auth import get_current_user
from models.user import UserRole
from database import db
from services.mls_service import mls_service

router = APIRouter(prefix="/mls", tags=["MLS Integration"])


class MLSConfig(BaseModel):
    provider: str = "bridge"
    client_id: str = ""
    client_secret: str = ""
    server_token: str = ""
    browser_token: str = ""
    dataset_id: str = ""
    mls_name: str = ""
    enabled: bool = False
    auto_sync: bool = False
    sync_interval_hours: int = 24


@router.get("/status")
async def get_mls_status(current_user: dict = Depends(get_current_user)):
    """Check if MLS API is configured and working"""
    config = await db.settings.find_one({"type": "mls_config"})
    last_sync = config.get("last_sync") if config else None
    
    return {
        "configured": mls_service.is_configured(),
        "provider": "Bridge API",
        "dataset": config.get("mls_name", "Not Set") if config else "Not Set",
        "last_sync": last_sync,
        "message": "Connected" if mls_service.is_configured() else "Ready for credentials"
    }


@router.get("/config")
async def get_mls_config(current_user: dict = Depends(get_current_user)):
    """Get MLS configuration (sensitive fields masked)"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.settings.find_one({"type": "mls_config"}, {"_id": 0})
    
    if not config:
        return {
            "provider": "bridge",
            "client_id": "",
            "client_secret": "",
            "server_token": "",
            "browser_token": "",
            "dataset_id": "",
            "mls_name": "",
            "enabled": False,
            "auto_sync": False,
            "sync_interval_hours": 24
        }
    
    # Mask sensitive fields
    return {
        "provider": config.get("provider", "bridge"),
        "client_id": config.get("client_id", "")[:8] + "..." if config.get("client_id") else "",
        "client_secret": "••••••••" if config.get("client_secret") else "",
        "server_token": config.get("server_token", "")[:8] + "..." if config.get("server_token") else "",
        "browser_token": config.get("browser_token", "")[:8] + "..." if config.get("browser_token") else "",
        "dataset_id": config.get("dataset_id", ""),
        "mls_name": config.get("mls_name", ""),
        "enabled": config.get("enabled", False),
        "auto_sync": config.get("auto_sync", False),
        "sync_interval_hours": config.get("sync_interval_hours", 24)
    }


@router.post("/config")
async def save_mls_config(config: MLSConfig, current_user: dict = Depends(get_current_user)):
    """Save MLS API configuration"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config_doc = {
        "type": "mls_config",
        **config.dict(),
        "updated_by": current_user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.settings.update_one(
        {"type": "mls_config"},
        {"$set": config_doc},
        upsert=True
    )
    
    # Update the service with new credentials
    mls_service.configure(
        client_id=config.client_id,
        client_secret=config.client_secret,
        server_token=config.server_token,
        dataset_id=config.dataset_id
    )
    
    return {"message": "MLS configuration saved"}


@router.post("/test")
async def test_mls_connection(current_user: dict = Depends(get_current_user)):
    """Test Bridge API connection and list available datasets"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await mls_service.test_connection()
    return result


@router.get("/datasets")
async def get_available_datasets(current_user: dict = Depends(get_current_user)):
    """Get all datasets available with current API credentials"""
    result = await mls_service.get_datasets()
    return result


@router.get("/search")
async def search_mls(
    dataset: Optional[str] = Query(None, description="Dataset code (e.g., 'test', 'gcmls2')"),
    address: Optional[str] = Query(None, description="Street address"),
    city: Optional[str] = Query(None, description="City name"),
    zip_code: Optional[str] = Query(None, description="ZIP code"),
    min_price: Optional[int] = Query(None, description="Minimum price"),
    max_price: Optional[int] = Query(None, description="Maximum price"),
    bedrooms: Optional[int] = Query(None, description="Minimum bedrooms"),
    bathrooms: Optional[float] = Query(None, description="Minimum bathrooms"),
    property_type: Optional[str] = Query(None, description="Property type"),
    status: Optional[str] = Query("Active", description="Listing status (Active, Pending, Closed)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Search MLS properties via Bridge API"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    if not mls_service.is_configured():
        return {
            "properties": [],
            "total": 0,
            "configured": False,
            "message": "Bridge API not configured"
        }
    
    result = await mls_service.search_properties(
        dataset=dataset,
        address=address,
        city=city,
        zip_code=zip_code,
        min_price=min_price,
        max_price=max_price,
        bedrooms=bedrooms,
        bathrooms=bathrooms,
        property_type=property_type,
        status=status,
        limit=limit,
        offset=offset
    )
    
    return result


@router.get("/my-listings")
async def get_my_listings(
    dataset: Optional[str] = Query(None, description="Dataset code"),
    agent_id: Optional[str] = Query(None, description="Agent MLS ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Get your own listings from MLS by agent ID"""
    if not mls_service.is_configured():
        return {
            "listings": [],
            "total": 0,
            "configured": False,
            "message": "Bridge API not configured"
        }
    
    result = await mls_service.get_my_listings(
        dataset=dataset,
        agent_id=agent_id,
        status=status,
        limit=limit
    )
    
    return result


@router.get("/property/{mls_id}")
async def get_property_detail(
    mls_id: str,
    dataset: Optional[str] = Query(None, description="Dataset code"),
    current_user: dict = Depends(get_current_user)
):
    """Get full property details by MLS ID/ListingKey"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    if not mls_service.is_configured():
        return {
            "error": "Bridge API not configured",
            "configured": False
        }
    
    result = await mls_service.get_property_details(dataset=dataset, mls_id=mls_id)
    return result


@router.post("/sync-to-showcase")
async def sync_listings_to_showcase(
    dataset: Optional[str] = Query(None, description="Dataset code"),
    agent_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Sync your MLS listings to Showcase Listings"""
    if not mls_service.is_configured():
        raise HTTPException(status_code=400, detail="Bridge API not configured")
    
    # Get listings from MLS
    result = await mls_service.get_my_listings(dataset=dataset, agent_id=agent_id, status="Active")
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    synced = 0
    updated = 0
    
    for listing in result.get("listings", []):
        # Check if already in showcase (use properties collection)
        existing = await db.properties.find_one({"mls_id": listing["mls_id"]})
        
        showcase_doc = {
            "mls_id": listing["mls_id"],
            "address": listing["address"],
            "city": listing["city"],
            "state": listing["state"],
            "zip_code": listing["zip_code"],
            "bedrooms": listing["bedrooms"],
            "bathrooms": listing["bathrooms"],
            "sqft": listing["sqft"],
            "price": listing["list_price"],
            "status": "active",
            "property_type": listing["property_type"],
            "year_built": listing["year_built"],
            "description": listing["description"],
            "images": [{"url": p, "id": str(uuid.uuid4())} for p in listing.get("photos", []) if p],
            "primary_photo": listing.get("primary_photo"),
            "listing_agent": listing.get("listing_agent"),
            "mls_synced": True,
            "last_mls_sync": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            await db.properties.update_one(
                {"mls_id": listing["mls_id"]},
                {"$set": showcase_doc}
            )
            updated += 1
        else:
            showcase_doc["id"] = str(uuid.uuid4())
            showcase_doc["created_at"] = datetime.now(timezone.utc).isoformat()
            showcase_doc["is_featured"] = False
            await db.properties.insert_one(showcase_doc)
            synced += 1
    
    # Update last sync time
    await db.settings.update_one(
        {"type": "mls_config"},
        {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {
        "message": "Sync complete",
        "synced": synced,
        "updated": updated,
        "total_listings": len(result.get("listings", []))
    }


@router.post("/import-to-lead/{mls_id}")
async def import_mls_to_lead(
    mls_id: str,
    dataset: Optional[str] = Query(None, description="Dataset code"),
    current_user: dict = Depends(get_current_user)
):
    """Import an MLS listing as a Property Lead"""
    if not mls_service.is_configured():
        raise HTTPException(status_code=400, detail="Bridge API not configured")
    
    # Check if already imported
    existing = await db.property_leads.find_one({"mls_id": mls_id})
    if existing:
        raise HTTPException(status_code=400, detail="This listing has already been imported as a lead")
    
    # Get property details from MLS
    property_data = await mls_service.get_property_details(dataset=dataset, mls_id=mls_id)
    
    if "error" in property_data:
        raise HTTPException(status_code=400, detail=property_data["error"])
    
    # Create lead
    lead_doc = {
        "id": str(uuid.uuid4()),
        "mls_id": mls_id,
        "address": property_data.get("address"),
        "city": property_data.get("city"),
        "state": property_data.get("state", "FL"),
        "zip_code": property_data.get("zip_code"),
        "county": property_data.get("county"),
        "bedrooms": property_data.get("bedrooms"),
        "bathrooms": property_data.get("bathrooms"),
        "sqft": property_data.get("sqft"),
        "lot_size": property_data.get("lot_size"),
        "year_built": property_data.get("year_built"),
        "property_type": property_data.get("property_type"),
        "list_price": property_data.get("list_price"),
        "estimated_value": property_data.get("list_price"),
        "description": property_data.get("description"),
        "features": property_data.get("features", []),
        "listing_agent": property_data.get("listing_agent"),
        "listing_office": property_data.get("listing_office"),
        "mls_status": property_data.get("status"),
        "status": "new",
        "moderation_status": "approved",
        "source": "mls_import",
        "priority": "medium",
        "notes": [],
        "activity": [{
            "type": "imported",
            "description": f"Imported from MLS by {current_user['name']}",
            "user": current_user["name"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "mls_id": mls_id
        }],
        "gallery_images": [{"url": p, "id": str(uuid.uuid4())} for p in property_data.get("photos", []) if p],
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.property_leads.insert_one(lead_doc)
    
    return {
        "message": "Property imported as lead",
        "lead_id": lead_doc["id"],
        "address": lead_doc["address"]
    }
