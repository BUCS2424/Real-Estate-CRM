"""
Dead Leads Management Routes
Manage the blacklist of MLS IDs that should not be pulled again
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
from utils.auth import get_current_user
from models.user import UserRole
from database import db

router = APIRouter(prefix="/dead-leads", tags=["Dead Leads Management"])


class AddDeadLeadRequest(BaseModel):
    mls_id: str
    address: Optional[str] = None
    city: Optional[str] = None
    reason: Optional[str] = None
    source: str = "manual"  # manual, expired, withdrawn


@router.get("/")
async def get_dead_leads(
    source: Optional[str] = Query(None, description="Filter by source: manual, expired, withdrawn"),
    search: Optional[str] = Query(None, description="Search by MLS ID or address"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Get all dead leads (blacklisted MLS IDs)"""
    query = {}
    
    if source:
        query["source"] = source
    if search:
        query["$or"] = [
            {"mls_id": {"$regex": search, "$options": "i"}},
            {"address": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.dead_leads.count_documents(query)
    leads = await db.dead_leads.find(
        query, 
        {"_id": 0}
    ).sort("added_at", -1).skip(offset).limit(limit).to_list(limit)
    
    return {
        "dead_leads": leads,
        "total": total,
        "offset": offset,
        "limit": limit
    }


@router.get("/stats")
async def get_dead_leads_stats(current_user: dict = Depends(get_current_user)):
    """Get dead leads statistics"""
    total = await db.dead_leads.count_documents({})
    from_expired = await db.dead_leads.count_documents({"source": "expired"})
    from_withdrawn = await db.dead_leads.count_documents({"source": "withdrawn"})
    manual = await db.dead_leads.count_documents({"source": "manual"})
    
    return {
        "total": total,
        "by_source": {
            "expired": from_expired,
            "withdrawn": from_withdrawn,
            "manual": manual
        }
    }


@router.post("/add")
async def add_dead_lead(
    request: AddDeadLeadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Manually add an MLS ID to the dead leads list"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if already exists
    existing = await db.dead_leads.find_one({"mls_id": request.mls_id})
    if existing:
        return {"message": "MLS ID already in dead leads list", "exists": True}
    
    dead_lead_doc = {
        "id": str(uuid.uuid4()),
        "mls_id": request.mls_id,
        "address": request.address,
        "city": request.city,
        "reason": request.reason,
        "source": request.source,
        "added_at": datetime.now(timezone.utc).isoformat(),
        "added_by": current_user["id"]
    }
    
    await db.dead_leads.insert_one(dead_lead_doc)
    
    return {"message": "Added to dead leads list", "id": dead_lead_doc["id"]}


@router.post("/add-bulk")
async def add_bulk_dead_leads(
    mls_ids: List[str],
    source: str = "manual",
    current_user: dict = Depends(get_current_user)
):
    """Add multiple MLS IDs to the dead leads list"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    added = 0
    skipped = 0
    
    for mls_id in mls_ids:
        existing = await db.dead_leads.find_one({"mls_id": mls_id})
        if existing:
            skipped += 1
            continue
        
        dead_lead_doc = {
            "id": str(uuid.uuid4()),
            "mls_id": mls_id,
            "source": source,
            "added_at": datetime.now(timezone.utc).isoformat(),
            "added_by": current_user["id"]
        }
        
        await db.dead_leads.insert_one(dead_lead_doc)
        added += 1
    
    return {
        "message": "Bulk add complete",
        "added": added,
        "skipped": skipped
    }


@router.get("/check/{mls_id}")
async def check_dead_lead(
    mls_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if an MLS ID is in the dead leads list"""
    existing = await db.dead_leads.find_one({"mls_id": mls_id}, {"_id": 0})
    
    return {
        "mls_id": mls_id,
        "is_dead_lead": existing is not None,
        "details": existing
    }


@router.delete("/{mls_id}")
async def remove_dead_lead(
    mls_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove an MLS ID from the dead leads list"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.dead_leads.delete_one({"mls_id": mls_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="MLS ID not found in dead leads list")
    
    return {"message": "Removed from dead leads list"}


@router.delete("/clear-all")
async def clear_all_dead_leads(
    confirm: bool = Query(False, description="Must be true to confirm deletion"),
    current_user: dict = Depends(get_current_user)
):
    """Clear all dead leads (requires confirmation)"""
    if current_user["role"] != UserRole.SUPERUSER:
        raise HTTPException(status_code=403, detail="Superuser access required")
    
    if not confirm:
        raise HTTPException(status_code=400, detail="Must confirm=true to clear all dead leads")
    
    result = await db.dead_leads.delete_many({})
    
    return {
        "message": "All dead leads cleared",
        "deleted_count": result.deleted_count
    }
