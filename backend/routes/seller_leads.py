from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from ..database import get_db
from ..routes.auth import get_current_user

router = APIRouter(prefix="/seller-leads", tags=["seller-leads"])

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

@router.get("")
async def get_seller_leads(
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get all seller leads"""
    db = get_db()
    
    query = {"type": "seller"}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"property_address": {"$regex": search, "$options": "i"}}
        ]
    
    if status:
        query["status"] = status
    
    if priority:
        query["priority"] = priority
    
    leads = await db.leads.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [serialize_doc(lead) for lead in leads]

@router.get("/stats")
async def get_seller_lead_stats(current_user: dict = Depends(get_current_user)):
    """Get seller lead statistics"""
    db = get_db()
    
    base_query = {"type": "seller"}
    
    total = await db.leads.count_documents(base_query)
    new = await db.leads.count_documents({**base_query, "status": "new"})
    contacted = await db.leads.count_documents({**base_query, "status": "contacted"})
    qualified = await db.leads.count_documents({**base_query, "status": "qualified"})
    converted = await db.leads.count_documents({**base_query, "status": "converted"})
    
    # Calculate total property value from seller leads
    pipeline = [
        {"$match": {**base_query, "estimated_value": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": None, "total_value": {"$sum": "$estimated_value"}}}
    ]
    result = await db.leads.aggregate(pipeline).to_list(1)
    total_value = result[0]["total_value"] if result else 0
    
    return {
        "total": total,
        "new": new,
        "contacted": contacted,
        "qualified": qualified,
        "converted": converted,
        "total_value": total_value
    }

@router.get("/{lead_id}")
async def get_seller_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single seller lead by ID"""
    db = get_db()
    
    try:
        lead = await db.leads.find_one({"_id": ObjectId(lead_id), "type": "seller"})
    except:
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    if not lead:
        raise HTTPException(status_code=404, detail="Seller lead not found")
    
    return serialize_doc(lead)

@router.post("")
async def create_seller_lead(lead_data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new seller lead"""
    db = get_db()
    
    lead = {
        **lead_data,
        "type": "seller",
        "status": lead_data.get("status", "new"),
        "priority": lead_data.get("priority", "medium"),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "created_by": str(current_user.get("_id", current_user.get("id")))
    }
    
    result = await db.leads.insert_one(lead)
    lead["id"] = str(result.inserted_id)
    if "_id" in lead:
        del lead["_id"]
    
    return lead

@router.put("/{lead_id}")
async def update_seller_lead(lead_id: str, lead_data: dict, current_user: dict = Depends(get_current_user)):
    """Update a seller lead"""
    db = get_db()
    
    try:
        existing = await db.leads.find_one({"_id": ObjectId(lead_id), "type": "seller"})
    except:
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Seller lead not found")
    
    # Remove fields that shouldn't be updated
    lead_data.pop("_id", None)
    lead_data.pop("id", None)
    lead_data.pop("type", None)
    lead_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": lead_data}
    )
    
    updated = await db.leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(updated)

@router.delete("/{lead_id}")
async def delete_seller_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a seller lead"""
    db = get_db()
    
    try:
        result = await db.leads.delete_one({"_id": ObjectId(lead_id), "type": "seller"})
    except:
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Seller lead not found")
    
    return {"message": "Lead deleted successfully"}

@router.post("/{lead_id}/notes")
async def add_seller_lead_note(lead_id: str, note_data: dict, current_user: dict = Depends(get_current_user)):
    """Add a note to a seller lead"""
    db = get_db()
    
    note = {
        "id": str(ObjectId()),
        "content": note_data.get("content", ""),
        "created_at": datetime.now(timezone.utc),
        "created_by": current_user.get("name", current_user.get("email", "Unknown"))
    }
    
    await db.leads.update_one(
        {"_id": ObjectId(lead_id), "type": "seller"},
        {"$push": {"notes": note}}
    )
    
    return note
