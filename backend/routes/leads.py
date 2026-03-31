from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
import uuid
from database import db
from models.user import UserRole
from utils.auth import get_current_user

router = APIRouter()

def _serialize_lead(doc):
    """Ensure lead always has an id field."""
    if doc is None:
        return None
    if "id" not in doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    elif "_id" in doc:
        doc.pop("_id", None)
    return doc

@router.get("")
async def get_leads(lead_type: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if lead_type:
        query["type"] = lead_type
    if status:
        query["status"] = status
    
    leads = await db.leads.find(query).sort("created_at", -1).to_list(1000)
    return [_serialize_lead(lead) for lead in leads]

@router.get("/{lead_id}")
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _serialize_lead(lead)

@router.patch("/{lead_id}")
async def update_lead(lead_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    updated = await db.leads.find_one({"id": lead_id})
    return _serialize_lead(updated)

@router.post("/{lead_id}/convert")
async def convert_lead_to_contact(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Convert a lead to a contact"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = _serialize_lead(lead)
    
    # Check if contact already exists with this email
    existing_contact = await db.contacts.find_one({"email": lead.get("email")})
    if existing_contact:
        # Update lead status and link to existing contact
        await db.leads.update_one(
            {"id": lead_id},
            {"$set": {
                "status": "converted",
                "converted_contact_id": existing_contact["id"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "message": "Lead linked to existing contact",
            "contact_id": existing_contact["id"],
            "already_existed": True
        }
    
    # Parse name into first/last
    name_parts = lead.get("name", "Unknown").split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    
    # Determine category based on lead type
    category = "buyer" if lead.get("type") == "buyer" else "seller"
    
    contact_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    contact_doc = {
        "id": contact_id,
        "first_name": first_name,
        "last_name": last_name,
        "email": lead.get("email", ""),
        "phone": lead.get("phone", ""),
        "company": None,
        "position": None,
        "source": f"lead_conversion_{lead.get('type', 'unknown')}",
        "status": "active",
        "notes": f"Converted from {lead.get('type', 'unknown')} lead. Original source: {lead.get('source', 'N/A')}",
        "tags": [lead.get("type", "lead")],
        "lead_score": 50,
        "category": category,
        "original_lead_id": lead_id,
        "created_at": now
    }
    await db.contacts.insert_one(contact_doc)
    
    # Update lead status
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {
            "status": "converted",
            "converted_contact_id": contact_id,
            "updated_at": now
        }}
    )
    
    contact_doc.pop("_id", None)
    return {
        "message": "Lead converted to contact successfully",
        "contact_id": contact_id,
        "contact": contact_doc
    }

@router.delete("/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}
