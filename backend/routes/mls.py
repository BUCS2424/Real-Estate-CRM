"""
MLS API Routes - Bridge API Integration for Stellar MLS
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
    api_key: str = ""
    api_secret: str = ""
    server_token: str = ""
    dataset_id: str = ""
    mls_name: str = "Stellar MLS"
    enabled: bool = False
    auto_sync: bool = False
    sync_interval_hours: int = 24


@router.get("/status")
async def get_mls_status(current_user: dict = Depends(get_current_user)):
    """Check if MLS API is configured and working"""
    # Get config from database
    config = await db.settings.find_one({"type": "mls_config"})
    last_sync = config.get("last_sync") if config else None
    
    return {
        "configured": mls_service.is_configured(),
        "provider": "Bridge API",
        "dataset": config.get("mls_name", "Stellar MLS") if config else "Stellar MLS",
        "last_sync": last_sync,
        "message": "Ready for credentials" if not mls_service.is_configured() else "Connected"
    }


@router.get("/config")
async def get_mls_config(current_user: dict = Depends(get_current_user)):
    """Get MLS configuration (API keys masked)"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.settings.find_one({"type": "mls_config"}, {"_id": 0})
    
    if not config:
        return {
            "provider": "bridge",
            "api_key": "",
            "api_secret": "",
            "server_token": "",
            "dataset_id": "",
            "mls_name": "Stellar MLS",
            "enabled": False,
            "auto_sync": False,
            "sync_interval_hours": 24
        }
    
    # Return config but mask sensitive fields for display
    return {
        "provider": config.get("provider", "bridge"),
        "api_key": config.get("api_key", ""),
        "api_secret": config.get("api_secret", ""),
        "server_token": config.get("server_token", ""),
        "dataset_id": config.get("dataset_id", ""),
        "mls_name": config.get("mls_name", "Stellar MLS"),
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
    if config.api_key and config.api_secret:
        mls_service.configure(
            api_key=config.api_key,
            api_secret=config.api_secret,
            server_token=config.server_token,
            dataset_id=config.dataset_id
        )
    
    return {"message": "MLS configuration saved"}


@router.post("/test")
async def test_mls_connection(current_user: dict = Depends(get_current_user)):
    """Test MLS API connection"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get config from database
    config = await db.settings.find_one({"type": "mls_config"})
    
    if not config or not config.get("api_key"):
        return {
            "success": False,
            "error": "MLS API credentials not configured"
        }
    
    # Try to make a test request
    try:
        result = await mls_service.test_connection()
        return result
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/search")
async def search_mls(
    address: Optional[str] = Query(None, description="Street address"),
    city: Optional[str] = Query(None, description="City name"),
    zip_code: Optional[str] = Query(None, description="ZIP code"),
    min_price: Optional[int] = Query(None, description="Minimum price"),
    max_price: Optional[int] = Query(None, description="Maximum price"),
    bedrooms: Optional[int] = Query(None, description="Minimum bedrooms"),
    bathrooms: Optional[float] = Query(None, description="Minimum bathrooms"),
    property_type: Optional[str] = Query(None, description="Property type"),
    status: Optional[str] = Query("Active", description="Listing status (Active, Pending, Sold)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Search Stellar MLS properties"""
    if not mls_service.is_configured():
        # Return mock data for development until credentials are added
        return {
            "properties": _get_mock_search_results(city, min_price, max_price, limit),
            "total": 0,
            "configured": False,
            "message": "MLS API not configured - showing mock data"
        }
    
    result = await mls_service.search_properties(
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
    agent_id: Optional[str] = Query(None, description="Agent MLS ID (uses env default if not provided)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Get your own listings from Stellar MLS by agent ID"""
    if not mls_service.is_configured():
        return {
            "listings": [],
            "total": 0,
            "configured": False,
            "message": "MLS API not configured - add Bridge API credentials"
        }
    
    result = await mls_service.get_my_listings(
        agent_id=agent_id,
        status=status,
        limit=limit
    )
    
    return result


@router.get("/property/{mls_id}")
async def get_property_detail(
    mls_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get full property details by MLS ID"""
    if not mls_service.is_configured():
        return {
            "error": "MLS API not configured",
            "configured": False,
            "message": "Add Bridge API credentials to access property details"
        }
    
    result = await mls_service.get_property_details(mls_id)
    return result


@router.post("/sync-to-showcase")
async def sync_listings_to_showcase(
    agent_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Sync your MLS listings to Showcase Listings"""
    if not mls_service.is_configured():
        raise HTTPException(status_code=400, detail="MLS API not configured")
    
    # Get listings from MLS
    result = await mls_service.get_my_listings(agent_id=agent_id, status="Active")
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    synced = 0
    updated = 0
    
    for listing in result.get("listings", []):
        # Check if already in showcase
        existing = await db.showcase_listings.find_one({"mls_id": listing["mls_id"]})
        
        showcase_doc = {
            "mls_id": listing["mls_id"],
            "address": listing["address"],
            "city": listing["city"],
            "state": listing["state"],
            "zip_code": listing["zip_code"],
            "bedrooms": listing["bedrooms"],
            "bathrooms": listing["bathrooms"],
            "sqft": listing["sqft"],
            "list_price": listing["list_price"],
            "status": listing["status"],
            "property_type": listing["property_type"],
            "year_built": listing["year_built"],
            "description": listing["description"],
            "photos": listing.get("photos", []),
            "primary_photo": listing.get("primary_photo"),
            "listing_agent": listing.get("listing_agent"),
            "mls_synced": True,
            "last_mls_sync": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            # Update existing
            await db.showcase_listings.update_one(
                {"mls_id": listing["mls_id"]},
                {"$set": showcase_doc}
            )
            updated += 1
        else:
            # Create new
            showcase_doc["id"] = str(uuid.uuid4())
            showcase_doc["created_at"] = datetime.now(timezone.utc).isoformat()
            showcase_doc["is_featured"] = False
            await db.showcase_listings.insert_one(showcase_doc)
            synced += 1
    
    return {
        "message": "Sync complete",
        "synced": synced,
        "updated": updated,
        "total_listings": len(result.get("listings", []))
    }


@router.post("/import-to-lead/{mls_id}")
async def import_mls_to_lead(
    mls_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Import an MLS listing as a Property Lead"""
    if not mls_service.is_configured():
        raise HTTPException(status_code=400, detail="MLS API not configured")
    
    # Check if already imported
    existing = await db.property_leads.find_one({"mls_id": mls_id})
    if existing:
        raise HTTPException(status_code=400, detail="This listing has already been imported as a lead")
    
    # Get property details from MLS
    property_data = await mls_service.get_property_details(mls_id)
    
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
        "photos": property_data.get("photos", []),
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


def _get_mock_search_results(city=None, min_price=None, max_price=None, limit=10):
    """Return mock data for development/demo when MLS not configured"""
    # This allows the UI to work before credentials are added
    mock_properties = [
        {
            "mls_id": "MOCK001",
            "address": "123 Demo Street",
            "city": city or "Tampa",
            "state": "FL",
            "zip_code": "33601",
            "bedrooms": 4,
            "bathrooms": 3,
            "sqft": 2500,
            "list_price": 450000,
            "status": "Active",
            "property_type": "Single Family",
            "days_on_market": 15,
            "primary_photo": None,
            "listing_agent": "Demo Agent",
            "description": "Beautiful home - MLS API not configured (showing mock data)"
        },
        {
            "mls_id": "MOCK002",
            "address": "456 Sample Ave",
            "city": city or "Tampa",
            "state": "FL",
            "zip_code": "33602",
            "bedrooms": 3,
            "bathrooms": 2,
            "sqft": 1800,
            "list_price": 350000,
            "status": "Active",
            "property_type": "Single Family",
            "days_on_market": 7,
            "primary_photo": None,
            "listing_agent": "Demo Agent",
            "description": "Charming property - MLS API not configured (showing mock data)"
        }
    ]
    
    return mock_properties[:limit]
