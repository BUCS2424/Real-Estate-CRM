"""
MLS Listings Management Routes
Pull, moderate, and convert MLS listings to Showcase
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

router = APIRouter(prefix="/mls-listings", tags=["MLS Listings Management"])

AGENT_MLS_ID = os.environ.get("AGENT_MLS_ID", "261507429")


class PullListingsRequest(BaseModel):
    agent_id: Optional[str] = None
    include_sold: bool = False
    include_pending: bool = True


@router.get("/")
async def get_mls_listings(
    status: Optional[str] = Query(None, description="Filter by sync status: pending, approved, converted"),
    mls_status: Optional[str] = Query(None, description="Filter by MLS status: Active, Pending, Closed"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Get all pulled MLS listings with optional filters"""
    query = {}
    
    if status:
        query["sync_status"] = status
    if mls_status:
        query["mls_status"] = mls_status
    
    total = await db.mls_listings.count_documents(query)
    listings = await db.mls_listings.find(
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
async def get_mls_stats(current_user: dict = Depends(get_current_user)):
    """Get MLS listings statistics"""
    total = await db.mls_listings.count_documents({})
    pending = await db.mls_listings.count_documents({"sync_status": "pending"})
    approved = await db.mls_listings.count_documents({"sync_status": "approved"})
    converted = await db.mls_listings.count_documents({"sync_status": "converted"})
    
    active = await db.mls_listings.count_documents({"mls_status": "Active"})
    closed = await db.mls_listings.count_documents({"mls_status": "Closed"})
    
    return {
        "total": total,
        "by_sync_status": {
            "pending": pending,
            "approved": approved,
            "converted": converted
        },
        "by_mls_status": {
            "active": active,
            "pending_sale": await db.mls_listings.count_documents({"mls_status": "Pending"}),
            "closed": closed
        }
    }


@router.post("/pull")
async def pull_listings(
    request: PullListingsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Pull/sync listings from MLS for the agent"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not mls_service.is_configured():
        raise HTTPException(status_code=400, detail="MLS API not configured")
    
    agent_id = request.agent_id or AGENT_MLS_ID
    
    # Pull active listings
    statuses_to_pull = ["Active"]
    if request.include_pending:
        statuses_to_pull.append("Pending")
    if request.include_sold:
        statuses_to_pull.extend(["Closed", "Sold"])
    
    all_listings = []
    
    for status in statuses_to_pull:
        result = await mls_service.get_my_listings(
            dataset="stellar",
            agent_id=agent_id,
            status=status,
            limit=200
        )
        
        if "error" not in result:
            all_listings.extend(result.get("listings", []))
    
    # Process and store listings
    new_count = 0
    updated_count = 0
    
    for listing in all_listings:
        mls_id = listing.get("mls_id")
        if not mls_id:
            continue
        
        # Check if already exists
        existing = await db.mls_listings.find_one({"mls_id": mls_id})
        
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
            "mls_status": listing.get("status"),
            "days_on_market": listing.get("days_on_market"),
            "photos": listing.get("photos", []),
            "primary_photo": listing.get("primary_photo"),
            "listing_agent": listing.get("listing_agent"),
            "listing_office": listing.get("listing_office"),
            "description": listing.get("description"),
            "last_pulled_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if existing:
            # Update existing - preserve sync_status and notes
            await db.mls_listings.update_one(
                {"mls_id": mls_id},
                {"$set": listing_doc}
            )
            updated_count += 1
        else:
            # Create new
            listing_doc["id"] = str(uuid.uuid4())
            listing_doc["sync_status"] = "pending"  # Needs moderation
            listing_doc["notes"] = []
            listing_doc["pulled_at"] = datetime.now(timezone.utc).isoformat()
            listing_doc["pulled_by"] = current_user["id"]
            await db.mls_listings.insert_one(listing_doc)
            new_count += 1
    
    return {
        "message": "Pull complete",
        "new_listings": new_count,
        "updated_listings": updated_count,
        "total_pulled": len(all_listings),
        "agent_id": agent_id
    }


@router.get("/{listing_id}")
async def get_mls_listing(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single MLS listing by ID"""
    listing = await db.mls_listings.find_one(
        {"$or": [{"id": listing_id}, {"mls_id": listing_id}]},
        {"_id": 0}
    )
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return listing


@router.patch("/{listing_id}/status")
async def update_listing_status(
    listing_id: str,
    status: str = Query(..., description="New status: pending, approved, rejected"),
    current_user: dict = Depends(get_current_user)
):
    """Update the sync status of a listing (moderate)"""
    if status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.mls_listings.update_one(
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


@router.post("/{listing_id}/convert-to-showcase")
async def convert_to_showcase(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Convert an MLS listing to a Showcase Listing"""
    # Get the MLS listing
    mls_listing = await db.mls_listings.find_one(
        {"$or": [{"id": listing_id}, {"mls_id": listing_id}]},
        {"_id": 0}
    )
    
    if not mls_listing:
        raise HTTPException(status_code=404, detail="MLS listing not found")
    
    # Check if already converted
    if mls_listing.get("sync_status") == "converted":
        existing = await db.properties.find_one({"mls_id": mls_listing["mls_id"]})
        if existing:
            return {
                "message": "Already converted",
                "property_id": existing.get("id"),
                "slug": existing.get("slug")
            }
    
    # Check if showcase listing already exists for this MLS ID
    existing_showcase = await db.properties.find_one({"mls_id": mls_listing["mls_id"]})
    
    if existing_showcase:
        # Update existing showcase listing
        update_doc = {
            "address": mls_listing.get("address"),
            "city": mls_listing.get("city"),
            "state": mls_listing.get("state", "FL"),
            "zip_code": mls_listing.get("zip_code"),
            "bedrooms": mls_listing.get("bedrooms"),
            "bathrooms": mls_listing.get("bathrooms"),
            "sqft": mls_listing.get("sqft"),
            "price": mls_listing.get("list_price"),
            "property_type": mls_listing.get("property_type"),
            "year_built": mls_listing.get("year_built"),
            "description": mls_listing.get("description"),
            "images": [{"url": p, "id": str(uuid.uuid4())} for p in mls_listing.get("photos", []) if p],
            "mls_synced": True,
            "last_mls_sync": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.properties.update_one(
            {"mls_id": mls_listing["mls_id"]},
            {"$set": update_doc}
        )
        
        # Update MLS listing status
        await db.mls_listings.update_one(
            {"mls_id": mls_listing["mls_id"]},
            {
                "$set": {
                    "sync_status": "converted",
                    "converted_to_property_id": existing_showcase.get("id"),
                    "converted_at": datetime.now(timezone.utc).isoformat(),
                    "converted_by": current_user["id"]
                }
            }
        )
        
        return {
            "message": "Showcase listing updated",
            "property_id": existing_showcase.get("id"),
            "slug": existing_showcase.get("slug"),
            "updated": True
        }
    
    # Create new showcase listing
    from utils.slugify import generate_slug
    
    property_id = str(uuid.uuid4())
    slug = generate_slug(
        mls_listing.get("address"),
        mls_listing.get("city"),
        mls_listing.get("state"),
        mls_listing.get("zip_code")
    )
    
    showcase_doc = {
        "id": property_id,
        "slug": slug,
        "mls_id": mls_listing.get("mls_id"),
        "address": mls_listing.get("address"),
        "city": mls_listing.get("city"),
        "state": mls_listing.get("state", "FL"),
        "zip_code": mls_listing.get("zip_code"),
        "county": mls_listing.get("county"),
        "bedrooms": mls_listing.get("bedrooms"),
        "bathrooms": mls_listing.get("bathrooms"),
        "sqft": mls_listing.get("sqft"),
        "lot_size": mls_listing.get("lot_size"),
        "price": mls_listing.get("list_price"),
        "property_type": mls_listing.get("property_type"),
        "year_built": mls_listing.get("year_built"),
        "description": mls_listing.get("description"),
        "images": [{"url": p, "id": str(uuid.uuid4())} for p in mls_listing.get("photos", []) if p],
        "status": "active",
        "is_featured": False,
        "mls_synced": True,
        "last_mls_sync": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.properties.insert_one(showcase_doc)
    
    # Update MLS listing status
    await db.mls_listings.update_one(
        {"mls_id": mls_listing["mls_id"]},
        {
            "$set": {
                "sync_status": "converted",
                "converted_to_property_id": property_id,
                "converted_to_slug": slug,
                "converted_at": datetime.now(timezone.utc).isoformat(),
                "converted_by": current_user["id"]
            }
        }
    )
    
    return {
        "message": "Converted to showcase listing",
        "property_id": property_id,
        "slug": slug,
        "showcase_url": f"/property/{slug}"
    }


@router.post("/bulk-convert")
async def bulk_convert_to_showcase(
    listing_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Convert multiple MLS listings to Showcase at once"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    results = {
        "converted": [],
        "failed": [],
        "already_converted": []
    }
    
    for listing_id in listing_ids:
        try:
            # Check current status
            mls_listing = await db.mls_listings.find_one(
                {"$or": [{"id": listing_id}, {"mls_id": listing_id}]},
                {"_id": 0}
            )
            
            if not mls_listing:
                results["failed"].append({"id": listing_id, "error": "Not found"})
                continue
            
            if mls_listing.get("sync_status") == "converted":
                results["already_converted"].append(listing_id)
                continue
            
            # Convert
            response = await convert_to_showcase(listing_id, current_user)
            results["converted"].append({
                "mls_id": listing_id,
                "property_id": response.get("property_id"),
                "slug": response.get("slug")
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
async def delete_mls_listing(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an MLS listing from the local database (does not affect MLS)"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.mls_listings.delete_one(
        {"$or": [{"id": listing_id}, {"mls_id": listing_id}]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return {"message": "Listing deleted"}
