"""
Expired Listings Management Routes
Search, moderate, and convert expired MLS listings to Property Leads
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
from utils.auth import get_current_user
from models.user import UserRole
from models.expired_listing_models import SearchExpiredRequest
from database import db
from services.expired_listings_service import (
    perform_expired_search,
    perform_convert_to_lead,
    RECENT_EXPIRED_YEAR,
)

router = APIRouter(prefix="/expired-listings", tags=["Expired Listings Management"])



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


class ExpiredAutomationRequest(BaseModel):
    test_emails: Optional[List[str]] = None


@router.post("/automation/run")
async def run_expired_automation_route(
    request: ExpiredAutomationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Manually run the daily expired listings automation"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    from services.expired_automation import run_expired_automation

    return await run_expired_automation(test_emails=request.test_emails, manual_trigger=True)


@router.post("/search")
async def search_expired(
    request: SearchExpiredRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search for expired listings in the MLS and save them"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        return await perform_expired_search(request, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


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
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        return await perform_convert_to_lead(listing_id, current_user)
    except ValueError as exc:
        msg = str(exc)
        status_code = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status_code=status_code, detail=msg)


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
            response = await perform_convert_to_lead(listing_id, current_user)
            if response.get("message") == "Already converted to lead":
                results["already_converted"].append(listing_id)
            else:
                results["converted"].append({
                    "mls_id": listing_id,
                    "lead_id": response.get("lead_id"),
                    "address": response.get("address"),
                })
        except Exception as exc:
            results["failed"].append({"id": listing_id, "error": str(exc)})

    return {
        "message": "Bulk conversion complete",
        "results": results,
        "summary": {
            "converted": len(results["converted"]),
            "failed": len(results["failed"]),
            "already_converted": len(results["already_converted"]),
        },
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
