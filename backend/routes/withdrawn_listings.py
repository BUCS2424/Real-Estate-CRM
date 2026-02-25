"""
Withdrawn Listings Management Routes
Search, moderate, and convert withdrawn MLS listings to Property Leads
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

router = APIRouter(prefix="/withdrawn-listings", tags=["Withdrawn Listings Management"])


class SearchWithdrawnRequest(BaseModel):
    city: Optional[str] = None
    zip_code: Optional[str] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    bedrooms: Optional[int] = None
    limit: int = 50


@router.get("/")
async def get_withdrawn_listings(
    status: Optional[str] = Query(None, description="Filter by sync status: pending, approved, converted"),
    city: Optional[str] = Query(None, description="Filter by city"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Get all pulled withdrawn listings with optional filters"""
    query = {"source": "withdrawn_search"}
    
    if status:
        query["sync_status"] = status
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    total = await db.withdrawn_listings.count_documents(query)
    listings = await db.withdrawn_listings.find(
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
async def get_withdrawn_stats(current_user: dict = Depends(get_current_user)):
    """Get withdrawn listings statistics"""
    total = await db.withdrawn_listings.count_documents({"source": "withdrawn_search"})
    pending = await db.withdrawn_listings.count_documents({"source": "withdrawn_search", "sync_status": "pending"})
    approved = await db.withdrawn_listings.count_documents({"source": "withdrawn_search", "sync_status": "approved"})
    converted = await db.withdrawn_listings.count_documents({"source": "withdrawn_search", "sync_status": "converted"})
    
    # Dead leads count
    dead_leads_count = await db.dead_leads.count_documents({})
    
    return {
        "total": total,
        "by_sync_status": {
            "pending": pending,
            "approved": approved,
            "converted": converted
        },
        "dead_leads_count": dead_leads_count
    }


@router.post("/search")
async def search_withdrawn(
    request: SearchWithdrawnRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search for withdrawn listings in the MLS and save them (excluding dead leads)"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not mls_service.is_configured():
        raise HTTPException(status_code=400, detail="MLS API not configured")
    
    # Get dead leads list to exclude
    dead_leads_cursor = db.dead_leads.find({}, {"mls_id": 1, "_id": 0})
    dead_leads_list = [doc["mls_id"] async for doc in dead_leads_cursor]
    dead_leads_set = set(dead_leads_list)
    
    # Search for withdrawn listings
    result = await mls_service.search_properties(
        dataset="stellar",
        city=request.city,
        zip_code=request.zip_code,
        min_price=request.min_price,
        max_price=request.max_price,
        bedrooms=request.bedrooms,
        status="Withdrawn",
        limit=request.limit
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Save to withdrawn_listings collection (excluding dead leads)
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
        existing = await db.withdrawn_listings.find_one({"mls_id": mls_id})
        
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
            "source": "withdrawn_search",
            "last_pulled_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            await db.withdrawn_listings.update_one(
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
            await db.withdrawn_listings.insert_one(listing_doc)
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
async def get_withdrawn_listing(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single withdrawn listing by ID"""
    listing = await db.withdrawn_listings.find_one(
        {"$or": [{"id": listing_id}, {"mls_id": listing_id}]},
        {"_id": 0}
    )
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return listing


@router.patch("/{listing_id}/status")
async def update_withdrawn_status(
    listing_id: str,
    status: str = Query(..., description="New status: pending, approved, rejected"),
    current_user: dict = Depends(get_current_user)
):
    """Update the sync status of a withdrawn listing (moderate)"""
    if status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.withdrawn_listings.update_one(
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
    """Convert a withdrawn listing to a Property Lead and add to dead leads list"""
    # Get the withdrawn listing
    withdrawn_listing = await db.withdrawn_listings.find_one(
        {"$or": [{"id": listing_id}, {"mls_id": listing_id}]},
        {"_id": 0}
    )
    
    if not withdrawn_listing:
        raise HTTPException(status_code=404, detail="Withdrawn listing not found")
    
    # Check if already converted
    if withdrawn_listing.get("sync_status") == "converted":
        existing = await db.property_leads.find_one({"mls_id": withdrawn_listing["mls_id"]})
        if existing:
            return {
                "message": "Already converted to lead",
                "lead_id": existing.get("id")
            }
    
    # Check if lead already exists for this MLS ID
    existing_lead = await db.property_leads.find_one({"mls_id": withdrawn_listing["mls_id"]})
    
    if existing_lead:
        raise HTTPException(status_code=400, detail="A lead already exists for this property")
    
    # Create new property lead with "withdrawn" tag
    lead_id = str(uuid.uuid4())
    
    lead_doc = {
        "id": lead_id,
        "mls_id": withdrawn_listing.get("mls_id"),
        "address": withdrawn_listing.get("address"),
        "city": withdrawn_listing.get("city"),
        "state": withdrawn_listing.get("state", "FL"),
        "zip_code": withdrawn_listing.get("zip_code"),
        "county": withdrawn_listing.get("county"),
        "bedrooms": withdrawn_listing.get("bedrooms"),
        "bathrooms": withdrawn_listing.get("bathrooms"),
        "sqft": withdrawn_listing.get("sqft"),
        "lot_size": withdrawn_listing.get("lot_size"),
        "year_built": withdrawn_listing.get("year_built"),
        "property_type": withdrawn_listing.get("property_type"),
        "list_price": withdrawn_listing.get("list_price"),
        "estimated_value": withdrawn_listing.get("list_price"),
        "original_list_price": withdrawn_listing.get("original_list_price"),
        "description": withdrawn_listing.get("description"),
        "gallery_images": [{"url": p, "id": str(uuid.uuid4())} for p in withdrawn_listing.get("photos", []) if p],
        "previous_listing_agent": withdrawn_listing.get("listing_agent"),
        "previous_listing_office": withdrawn_listing.get("listing_office"),
        "days_on_market_before_withdrawal": withdrawn_listing.get("days_on_market"),
        "status": "new",
        "moderation_status": "approved",
        "source": "withdrawn_mls",
        "priority": "high",
        "lead_type": "seller",
        "tags": ["withdrawn", "prospecting"],  # Tagged as withdrawn
        "notes": [{
            "text": f"Converted from withdrawn MLS listing. Previously listed for ${withdrawn_listing.get('list_price', 0):,}. Was on market for {withdrawn_listing.get('days_on_market', 'unknown')} days before withdrawal.",
            "created_by": current_user["name"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }],
        "activity": [{
            "type": "created",
            "description": f"Created from withdrawn MLS listing by {current_user['name']}",
            "user": current_user["name"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "mls_id": withdrawn_listing.get("mls_id")
        }],
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.property_leads.insert_one(lead_doc)
    
    # Add to dead leads list
    await db.dead_leads.update_one(
        {"mls_id": withdrawn_listing["mls_id"]},
        {
            "$set": {
                "mls_id": withdrawn_listing["mls_id"],
                "address": withdrawn_listing.get("address"),
                "city": withdrawn_listing.get("city"),
                "source": "withdrawn",
                "converted_to_lead_id": lead_id,
                "added_at": datetime.now(timezone.utc).isoformat(),
                "added_by": current_user["id"]
            }
        },
        upsert=True
    )
    
    # Update withdrawn listing status
    await db.withdrawn_listings.update_one(
        {"mls_id": withdrawn_listing["mls_id"]},
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
        "address": lead_doc["address"],
        "tags": lead_doc["tags"]
    }


@router.post("/bulk-convert")
async def bulk_convert_to_leads(
    listing_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Convert multiple withdrawn listings to Property Leads at once"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    results = {
        "converted": [],
        "failed": [],
        "already_converted": []
    }
    
    for listing_id in listing_ids:
        try:
            withdrawn_listing = await db.withdrawn_listings.find_one(
                {"$or": [{"id": listing_id}, {"mls_id": listing_id}]},
                {"_id": 0}
            )
            
            if not withdrawn_listing:
                results["failed"].append({"id": listing_id, "error": "Not found"})
                continue
            
            if withdrawn_listing.get("sync_status") == "converted":
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
async def delete_withdrawn_listing(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a withdrawn listing from the local database"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.withdrawn_listings.delete_one(
        {"$or": [{"id": listing_id}, {"mls_id": listing_id}]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return {"message": "Listing deleted"}
