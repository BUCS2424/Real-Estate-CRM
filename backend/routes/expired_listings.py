"""
Expired Listings Management Routes
Search, moderate, and convert expired MLS listings to Property Leads
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
from utils.auth import get_current_user
from models.user import UserRole
from database import db
from services.mls_service import mls_service
import os

router = APIRouter(prefix="/expired-listings", tags=["Expired Listings Management"])


class SearchExpiredRequest(BaseModel):
    city: Optional[str] = None
    zip_code: Optional[str] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    bedrooms: Optional[int] = None
    days_expired: Optional[int] = 90  # Default: expired in last 90 days
    limit: int = 50


@router.get("/")
async def get_expired_listings(
    status: Optional[str] = Query(None, description="Filter by sync status: pending, approved, converted"),
    city: Optional[str] = Query(None, description="Filter by city"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Get all pulled expired listings with optional filters"""
    query = {"source": "expired_search"}
    
    if status:
        query["sync_status"] = status
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    total = await db.expired_listings.count_documents(query)
    listings = await db.expired_listings.find(
        query, 
        {"_id": 0}
    ).sort("pulled_at", -1).skip(offset).limit(limit).to_list(limit)
    
    return {
        "listings": listings,
        "total": total,
        "offset": offset,
        "limit": limit
    }


@router.get("/stats")
async def get_expired_stats(current_user: dict = Depends(get_current_user)):
    """Get expired listings statistics"""
    total = await db.expired_listings.count_documents({"source": "expired_search"})
    pending = await db.expired_listings.count_documents({"source": "expired_search", "sync_status": "pending"})
    approved = await db.expired_listings.count_documents({"source": "expired_search", "sync_status": "approved"})
    converted = await db.expired_listings.count_documents({"source": "expired_search", "sync_status": "converted"})
    
    return {
        "total": total,
        "by_sync_status": {
            "pending": pending,
            "approved": approved,
            "converted": converted
        }
    }


@router.post("/search")
async def search_expired(
    request: SearchExpiredRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search for expired listings in the MLS and save them"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not mls_service.is_configured():
        raise HTTPException(status_code=400, detail="MLS API not configured")
    
    # Get dead leads list to exclude
    dead_leads_cursor = db.dead_leads.find({}, {"mls_id": 1, "_id": 0})
    dead_leads_list = [doc["mls_id"] async for doc in dead_leads_cursor]
    dead_leads_set = set(dead_leads_list)
    
    # Search for expired listings only (withdrawn has its own section)
    result = await mls_service.search_properties(
        dataset="stellar",
        city=request.city,
        zip_code=request.zip_code,
        min_price=request.min_price,
        max_price=request.max_price,
        bedrooms=request.bedrooms,
        status="Expired",
        limit=request.limit
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Save to expired_listings collection (excluding dead leads)
    new_count = 0
    updated_count = 0
    skipped_dead = 0
    
    for listing in result.get("properties", []):
        mls_id = listing.get("mls_id")
        if not mls_id:
            continue
        
        # Skip if in dead leads list
        if mls_id in dead_leads_set:
            skipped_dead += 1
            continue
        
        # Check if already exists
        existing = await db.expired_listings.find_one({"mls_id": mls_id})
        
        listing_doc = {
            "mls_id": mls_id,
            "listing_key": listing.get("listing_key"),
            "address": listing.get("address"),
            "city": listing.get("city"),
            "state": listing.get("state", "FL"),
            "zip_code": listing.get("zip_code"),
            "county": listing.get("county"),
            "bedrooms": listing.get("bedrooms"),
            "bathrooms": listing.get("bathrooms"),
            "sqft": listing.get("sqft"),
            "lot_size": listing.get("lot_size"),
            "year_built": listing.get("year_built"),
            "property_type": listing.get("property_type"),
            "list_price": listing.get("list_price"),
            "original_list_price": listing.get("original_list_price") or listing.get("list_price"),
            "mls_status": listing.get("status"),
            "days_on_market": listing.get("days_on_market"),
            "photos": listing.get("photos", []),
            "primary_photo": listing.get("primary_photo"),
            "listing_agent": listing.get("listing_agent"),
            "listing_office": listing.get("listing_office"),
            "description": listing.get("description"),
            "source": "expired_search",
            "last_pulled_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            await db.expired_listings.update_one(
                {"mls_id": mls_id},
                {"$set": listing_doc}
            )
            updated_count += 1
        else:
            listing_doc["id"] = str(uuid.uuid4())
            listing_doc["sync_status"] = "pending"
            listing_doc["notes"] = []
            listing_doc["pulled_at"] = datetime.now(timezone.utc).isoformat()
            listing_doc["pulled_by"] = current_user["id"]
            await db.expired_listings.insert_one(listing_doc)
            new_count += 1
    
    return {
        "message": "Search complete",
        "new_listings": new_count,
        "updated_listings": updated_count,
        "skipped_dead_leads": skipped_dead,
        "total_found": len(result.get("properties", [])),
        "search_criteria": {
            "city": request.city,
            "zip_code": request.zip_code,
            "min_price": request.min_price,
            "max_price": request.max_price
        }
    }


@router.get("/{listing_id}")
async def get_expired_listing(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single expired listing by ID"""
    listing = await db.expired_listings.find_one(
        {"$or": [{"id": listing_id}, {"mls_id": listing_id}]},
        {"_id": 0}
    )
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return listing


@router.patch("/{listing_id}/status")
async def update_expired_status(
    listing_id: str,
    status: str = Query(..., description="New status: pending, approved, rejected"),
    current_user: dict = Depends(get_current_user)
):
    """Update the sync status of an expired listing (moderate)"""
    if status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.expired_listings.update_one(
        {"$or": [{"id": listing_id}, {"mls_id": listing_id}]},
        {
            "$set": {
                "sync_status": status,
                "moderated_by": current_user["id"],
                "moderated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return {"message": f"Listing status updated to {status}"}


@router.post("/{listing_id}/convert-to-lead")
async def convert_to_lead(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Convert an expired listing to a Property Lead for follow-up"""
    # Get the expired listing
    expired_listing = await db.expired_listings.find_one(
        {"$or": [{"id": listing_id}, {"mls_id": listing_id}]},
        {"_id": 0}
    )
    
    if not expired_listing:
        raise HTTPException(status_code=404, detail="Expired listing not found")
    
    # Check if already converted
    if expired_listing.get("sync_status") == "converted":
        existing = await db.property_leads.find_one({"mls_id": expired_listing["mls_id"]})
        if existing:
            return {
                "message": "Already converted to lead",
                "lead_id": existing.get("id")
            }
    
    # Check if lead already exists for this MLS ID
    existing_lead = await db.property_leads.find_one({"mls_id": expired_listing["mls_id"]})
    
    if existing_lead:
        raise HTTPException(status_code=400, detail="A lead already exists for this property")
    
    # Create new property lead
    lead_id = str(uuid.uuid4())
    
    lead_doc = {
        "id": lead_id,
        "mls_id": expired_listing.get("mls_id"),
        "address": expired_listing.get("address"),
        "city": expired_listing.get("city"),
        "state": expired_listing.get("state", "FL"),
        "zip_code": expired_listing.get("zip_code"),
        "county": expired_listing.get("county"),
        "bedrooms": expired_listing.get("bedrooms"),
        "bathrooms": expired_listing.get("bathrooms"),
        "sqft": expired_listing.get("sqft"),
        "lot_size": expired_listing.get("lot_size"),
        "year_built": expired_listing.get("year_built"),
        "property_type": expired_listing.get("property_type"),
        "list_price": expired_listing.get("list_price"),
        "estimated_value": expired_listing.get("list_price"),
        "original_list_price": expired_listing.get("original_list_price"),
        "description": expired_listing.get("description"),
        "gallery_images": [{"url": p, "id": str(uuid.uuid4())} for p in expired_listing.get("photos", []) if p],
        "previous_listing_agent": expired_listing.get("listing_agent"),
        "previous_listing_office": expired_listing.get("listing_office"),
        "days_on_market_before_expiry": expired_listing.get("days_on_market"),
        "status": "new",
        "moderation_status": "approved",
        "source": "expired_mls",
        "priority": "high",  # Expired listings are high priority leads
        "lead_type": "seller",
        "tags": ["expired", "prospecting"],
        "notes": [{
            "text": f"Converted from expired MLS listing. Previously listed for ${expired_listing.get('list_price', 0):,}. Was on market for {expired_listing.get('days_on_market', 'unknown')} days.",
            "created_by": current_user["name"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }],
        "activity": [{
            "type": "created",
            "description": f"Created from expired MLS listing by {current_user['name']}",
            "user": current_user["name"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "mls_id": expired_listing.get("mls_id")
        }],
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.property_leads.insert_one(lead_doc)
    
    # Update expired listing status
    await db.expired_listings.update_one(
        {"mls_id": expired_listing["mls_id"]},
        {
            "$set": {
                "sync_status": "converted",
                "converted_to_lead_id": lead_id,
                "converted_at": datetime.now(timezone.utc).isoformat(),
                "converted_by": current_user["id"]
            }
        }
    )
    
    return {
        "message": "Converted to property lead",
        "lead_id": lead_id,
        "address": lead_doc["address"]
    }


@router.post("/bulk-convert")
async def bulk_convert_to_leads(
    listing_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Convert multiple expired listings to Property Leads at once"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    results = {
        "converted": [],
        "failed": [],
        "already_converted": []
    }
    
    for listing_id in listing_ids:
        try:
            expired_listing = await db.expired_listings.find_one(
                {"$or": [{"id": listing_id}, {"mls_id": listing_id}]},
                {"_id": 0}
            )
            
            if not expired_listing:
                results["failed"].append({"id": listing_id, "error": "Not found"})
                continue
            
            if expired_listing.get("sync_status") == "converted":
                results["already_converted"].append(listing_id)
                continue
            
            # Convert
            response = await convert_to_lead(listing_id, current_user)
            results["converted"].append({
                "mls_id": listing_id,
                "lead_id": response.get("lead_id"),
                "address": response.get("address")
            })
        except Exception as e:
            results["failed"].append({"id": listing_id, "error": str(e)})
    
    return {
        "message": "Bulk conversion complete",
        "results": results,
        "summary": {
            "converted": len(results["converted"]),
            "failed": len(results["failed"]),
            "already_converted": len(results["already_converted"])
        }
    }


@router.delete("/{listing_id}")
async def delete_expired_listing(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an expired listing from the local database"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.expired_listings.delete_one(
        {"$or": [{"id": listing_id}, {"mls_id": listing_id}]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return {"message": "Listing deleted"}
