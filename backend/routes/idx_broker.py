"""
IDX Broker API Routes
Integration for pulling MLS listings via IDX Broker
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
from utils.auth import get_current_user
from models.user import UserRole
from database import db
from services.idx_broker_service import idx_broker_service

router = APIRouter(prefix="/idx", tags=["IDX Broker Integration"])


class IDXConfig(BaseModel):
    client_id: str = ""
    client_secret: str = ""
    server_token: str = ""
    browser_token: str = ""
    enabled: bool = False
    auto_sync: bool = False
    sync_interval_hours: int = 24


@router.get("/status")
async def get_idx_status(current_user: dict = Depends(get_current_user)):
    """Check if IDX Broker API is configured and working"""
    config = await db.settings.find_one({"type": "idx_config"})
    last_sync = config.get("last_sync") if config else None
    
    return {
        "configured": idx_broker_service.is_configured(),
        "provider": "IDX Broker",
        "last_sync": last_sync,
        "message": "Ready" if idx_broker_service.is_configured() else "Credentials needed"
    }


@router.get("/config")
async def get_idx_config(current_user: dict = Depends(get_current_user)):
    """Get IDX configuration (tokens masked)"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.settings.find_one({"type": "idx_config"}, {"_id": 0})
    
    if not config:
        return {
            "client_id": "",
            "client_secret": "",
            "server_token": "",
            "browser_token": "",
            "enabled": False,
            "auto_sync": False,
            "sync_interval_hours": 24
        }
    
    # Mask sensitive fields for display
    return {
        "client_id": config.get("client_id", "")[:8] + "..." if config.get("client_id") else "",
        "client_secret": "••••••••" if config.get("client_secret") else "",
        "server_token": config.get("server_token", "")[:8] + "..." if config.get("server_token") else "",
        "browser_token": config.get("browser_token", "")[:8] + "..." if config.get("browser_token") else "",
        "enabled": config.get("enabled", False),
        "auto_sync": config.get("auto_sync", False),
        "sync_interval_hours": config.get("sync_interval_hours", 24)
    }


@router.post("/config")
async def save_idx_config(config: IDXConfig, current_user: dict = Depends(get_current_user)):
    """Save IDX API configuration"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config_doc = {
        "type": "idx_config",
        **config.dict(),
        "updated_by": current_user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.settings.update_one(
        {"type": "idx_config"},
        {"$set": config_doc},
        upsert=True
    )
    
    # Update the service with new credentials
    idx_broker_service.configure(
        client_id=config.client_id,
        client_secret=config.client_secret,
        server_token=config.server_token,
        browser_token=config.browser_token
    )
    
    return {"message": "IDX configuration saved"}


@router.post("/test")
async def test_idx_connection(current_user: dict = Depends(get_current_user)):
    """Test IDX API connection"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await idx_broker_service.test_connection()
    return result


@router.get("/account")
async def get_account_info(current_user: dict = Depends(get_current_user)):
    """Get IDX account information"""
    result = await idx_broker_service.get_account_info()
    return result


@router.get("/system-links")
async def get_system_links(current_user: dict = Depends(get_current_user)):
    """Get available MLS system links"""
    result = await idx_broker_service.get_system_links()
    return result


@router.get("/featured")
async def get_featured_listings(current_user: dict = Depends(get_current_user)):
    """Get featured listings from IDX account"""
    result = await idx_broker_service.get_featured_listings()
    return result


@router.get("/supplemental")
async def get_supplemental_listings(current_user: dict = Depends(get_current_user)):
    """Get supplemental (manually added) listings"""
    result = await idx_broker_service.get_supplemental_listings()
    return result


@router.get("/sold-pending")
async def get_sold_pending(current_user: dict = Depends(get_current_user)):
    """Get sold/pending listings"""
    result = await idx_broker_service.get_sold_pending()
    return result


@router.get("/search")
async def search_idx_listings(
    city: Optional[str] = Query(None, description="City name"),
    zip_code: Optional[str] = Query(None, description="ZIP code"),
    min_price: Optional[int] = Query(None, description="Minimum price"),
    max_price: Optional[int] = Query(None, description="Maximum price"),
    bedrooms: Optional[int] = Query(None, description="Minimum bedrooms"),
    bathrooms: Optional[float] = Query(None, description="Minimum bathrooms"),
    property_type: Optional[str] = Query(None, description="Property type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Search MLS listings via IDX Broker"""
    result = await idx_broker_service.search_listings(
        city=city,
        zip_code=zip_code,
        min_price=min_price,
        max_price=max_price,
        bedrooms=bedrooms,
        bathrooms=bathrooms,
        property_type=property_type,
        limit=limit,
        offset=offset
    )
    return result


@router.get("/listing/{listing_id}")
async def get_listing_details(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed info for a specific listing"""
    result = await idx_broker_service.get_listing_details(listing_id)
    return result


@router.post("/import-to-lead/{listing_id}")
async def import_idx_to_lead(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Import an IDX listing as a Property Lead"""
    # Check if already imported
    existing = await db.property_leads.find_one({"idx_listing_id": listing_id})
    if existing:
        raise HTTPException(status_code=400, detail="This listing has already been imported as a lead")
    
    # Get listing details
    listing_data = await idx_broker_service.get_listing_details(listing_id)
    
    if "error" in listing_data:
        raise HTTPException(status_code=400, detail=listing_data["error"])
    
    # Create lead
    lead_doc = {
        "id": str(uuid.uuid4()),
        "idx_listing_id": listing_id,
        "mls_id": listing_data.get("mls_id"),
        "address": listing_data.get("address"),
        "city": listing_data.get("city"),
        "state": listing_data.get("state", "FL"),
        "zip_code": listing_data.get("zip_code"),
        "county": listing_data.get("county"),
        "bedrooms": listing_data.get("bedrooms"),
        "bathrooms": listing_data.get("bathrooms"),
        "sqft": listing_data.get("sqft"),
        "lot_size": listing_data.get("lot_size"),
        "year_built": listing_data.get("year_built"),
        "property_type": listing_data.get("property_type"),
        "list_price": listing_data.get("list_price"),
        "estimated_value": listing_data.get("list_price"),
        "description": listing_data.get("description"),
        "features": listing_data.get("features", []),
        "listing_agent": listing_data.get("listing_agent"),
        "listing_office": listing_data.get("listing_office"),
        "virtual_tour": listing_data.get("virtual_tour"),
        "status": "new",
        "moderation_status": "approved",
        "source": "idx_import",
        "priority": "medium",
        "notes": [],
        "activity": [{
            "type": "imported",
            "description": f"Imported from IDX by {current_user['name']}",
            "user": current_user["name"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "idx_listing_id": listing_id
        }],
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add photos if available
    if listing_data.get("primary_photo"):
        lead_doc["gallery_images"] = [{"url": listing_data["primary_photo"], "id": str(uuid.uuid4())}]
    
    await db.property_leads.insert_one(lead_doc)
    
    return {
        "message": "Listing imported as property lead",
        "lead_id": lead_doc["id"],
        "address": lead_doc["address"]
    }


@router.post("/sync-to-showcase")
async def sync_idx_to_showcase(current_user: dict = Depends(get_current_user)):
    """Sync featured IDX listings to Showcase Listings"""
    if not idx_broker_service.is_configured():
        raise HTTPException(status_code=400, detail="IDX API not configured")
    
    # Get featured listings
    result = await idx_broker_service.get_featured_listings()
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    synced = 0
    updated = 0
    
    for listing in result.get("listings", []):
        listing_id = listing.get("idx_listing_id") or listing.get("mls_id")
        if not listing_id:
            continue
            
        # Check if already in showcase
        existing = await db.properties.find_one({"idx_listing_id": listing_id})
        
        showcase_doc = {
            "idx_listing_id": listing_id,
            "mls_id": listing.get("mls_id"),
            "address": listing.get("address"),
            "city": listing.get("city"),
            "state": listing.get("state", "FL"),
            "zip_code": listing.get("zip_code"),
            "bedrooms": listing.get("bedrooms"),
            "bathrooms": listing.get("bathrooms"),
            "sqft": listing.get("sqft"),
            "price": listing.get("list_price"),
            "status": "active",
            "property_type": listing.get("property_type"),
            "year_built": listing.get("year_built"),
            "description": listing.get("description"),
            "primary_photo": listing.get("primary_photo"),
            "listing_agent": listing.get("listing_agent"),
            "idx_synced": True,
            "last_idx_sync": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            await db.properties.update_one(
                {"idx_listing_id": listing_id},
                {"$set": showcase_doc}
            )
            updated += 1
        else:
            showcase_doc["id"] = str(uuid.uuid4())
            showcase_doc["created_at"] = datetime.now(timezone.utc).isoformat()
            showcase_doc["is_featured"] = True
            await db.properties.insert_one(showcase_doc)
            synced += 1
    
    # Update last sync time
    await db.settings.update_one(
        {"type": "idx_config"},
        {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {
        "message": "Sync complete",
        "synced": synced,
        "updated": updated,
        "total_listings": len(result.get("listings", []))
    }
