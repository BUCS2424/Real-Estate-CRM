"""
Property Leads API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import csv
import io
from utils.auth import get_current_user
from models.user import UserRole
from models.property_lead import PropertyLeadCreate, PropertyLeadUpdate, PropertyLeadNote
from database import db
from services.county_scrapers import search_property
from utils.slug import generate_property_slug, ensure_unique_slug

router = APIRouter(prefix="/property-leads", tags=["Property Leads"])


# Status and priority options
STATUSES = ["new", "contacted", "qualified", "nurturing", "not_interested", "converted"]
MODERATION_STATUSES = ["pending_review", "approved", "rejected"]
LEAD_SOURCES = ["mls_import", "manual", "website_form", "scraper"]
PRIORITIES = ["low", "medium", "high", "urgent"]
PROPERTY_TYPES = ["single_family", "condo", "townhouse", "multi_family", "land", "commercial"]


# ============ PUBLIC SUBMISSION (No Auth Required) ============

@router.post("/submit", include_in_schema=True)
async def submit_property_lead_public(
    address: str,
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
    owner_name: Optional[str] = None,
    owner_phone: Optional[str] = None,
    owner_email: Optional[str] = None,
    property_type: Optional[str] = None,
    message: Optional[str] = None,
):
    """Public endpoint for website form submissions - goes to moderation queue"""
    lead_doc = {
        "id": str(uuid.uuid4()),
        "address": address,
        "city": city,
        "state": state or "FL",
        "zip_code": zip_code,
        "owner_name": owner_name,
        "owner_phone": owner_phone,
        "owner_email": owner_email,
        "property_type": property_type,
        "status": "new",
        "moderation_status": "pending_review",
        "source": "website_form",
        "priority": "medium",
        "submission_message": message,
        "notes": [],
        "activity": [{
            "type": "submitted",
            "description": "Property lead submitted via website form",
            "user": "Website Visitor",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.property_leads.insert_one(lead_doc)
    return {"message": "Property submitted for review", "id": lead_doc["id"]}


# ============ MODERATION QUEUE ============

@router.get("/moderation/pending")
async def get_pending_leads(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all leads pending moderation"""
    query = {"moderation_status": "pending_review"}
    total = await db.property_leads.count_documents(query)
    leads = await db.property_leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "leads": leads,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/moderation/stats")
async def get_moderation_stats(current_user: dict = Depends(get_current_user)):
    """Get moderation queue statistics"""
    pending = await db.property_leads.count_documents({"moderation_status": "pending_review"})
    approved_today = await db.property_leads.count_documents({
        "moderation_status": "approved",
        "moderated_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()}
    })
    rejected_today = await db.property_leads.count_documents({
        "moderation_status": "rejected",
        "moderated_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()}
    })
    
    # By source
    by_source = {}
    for source in LEAD_SOURCES:
        by_source[source] = await db.property_leads.count_documents({"source": source, "moderation_status": "pending_review"})
    
    return {
        "pending": pending,
        "approved_today": approved_today,
        "rejected_today": rejected_today,
        "by_source": by_source
    }


@router.post("/moderation/{lead_id}/approve")
async def approve_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a pending lead"""
    lead = await db.property_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    activity_entry = {
        "type": "approved",
        "description": f"Lead approved by {current_user['name']}",
        "user": current_user["name"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.property_leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "moderation_status": "approved",
                "moderated_by": current_user["id"],
                "moderated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"activity": activity_entry}
        }
    )
    
    return {"message": "Lead approved"}


@router.post("/moderation/{lead_id}/reject")
async def reject_lead(
    lead_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Reject a pending lead"""
    lead = await db.property_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    activity_entry = {
        "type": "rejected",
        "description": f"Lead rejected by {current_user['name']}" + (f": {reason}" if reason else ""),
        "user": current_user["name"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "reason": reason
    }
    
    await db.property_leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "moderation_status": "rejected",
                "rejection_reason": reason,
                "moderated_by": current_user["id"],
                "moderated_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"activity": activity_entry}
        }
    )
    
    return {"message": "Lead rejected"}


# ============ MLS IMPORT (Structure ready for Bridge API) ============

@router.post("/from-mls")
async def create_lead_from_mls(
    mls_id: str,
    mls_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a property lead from MLS data"""
    # Check if already imported
    existing = await db.property_leads.find_one({"mls_id": mls_id})
    if existing:
        raise HTTPException(status_code=400, detail="This MLS listing has already been imported")
    
    lead_doc = {
        "id": str(uuid.uuid4()),
        "mls_id": mls_id,
        "address": mls_data.get("address"),
        "city": mls_data.get("city"),
        "state": mls_data.get("state", "FL"),
        "zip_code": mls_data.get("zip_code"),
        "county": mls_data.get("county"),
        "bedrooms": mls_data.get("bedrooms"),
        "bathrooms": mls_data.get("bathrooms"),
        "sqft": mls_data.get("sqft"),
        "lot_size": mls_data.get("lot_size"),
        "year_built": mls_data.get("year_built"),
        "property_type": mls_data.get("property_type"),
        "list_price": mls_data.get("list_price"),
        "estimated_value": mls_data.get("list_price"),
        "owner_name": mls_data.get("owner_name"),
        "owner_phone": mls_data.get("owner_phone"),
        "owner_email": mls_data.get("owner_email"),
        "listing_agent": mls_data.get("listing_agent"),
        "listing_office": mls_data.get("listing_office"),
        "mls_status": mls_data.get("status"),
        "photos": mls_data.get("photos", []),
        "description": mls_data.get("description"),
        "features": mls_data.get("features", []),
        "status": "new",
        "moderation_status": "approved",  # MLS imports are auto-approved
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
    return {"message": "Property lead created from MLS", "lead": {k: v for k, v in lead_doc.items() if k != "_id"}}


@router.get("")
async def get_property_leads(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    city: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all property leads with filters"""
    query = {}
    
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    total = await db.property_leads.count_documents(query)
    leads = await db.property_leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "leads": leads,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/stats")
async def get_property_leads_stats(current_user: dict = Depends(get_current_user)):
    """Get property leads statistics"""
    total = await db.property_leads.count_documents({})
    
    # Status breakdown
    status_counts = {}
    for status in STATUSES:
        status_counts[status] = await db.property_leads.count_documents({"status": status})
    
    # Priority breakdown
    priority_counts = {}
    for priority in PRIORITIES:
        priority_counts[priority] = await db.property_leads.count_documents({"priority": priority})
    
    # With owner info
    with_owner = await db.property_leads.count_documents({"owner_name": {"$ne": None, "$ne": ""}})
    
    # With value estimate
    with_value = await db.property_leads.count_documents({"estimated_value": {"$ne": None, "$gt": 0}})
    
    return {
        "total": total,
        "by_status": status_counts,
        "by_priority": priority_counts,
        "with_owner_info": with_owner,
        "with_value_estimate": with_value
    }


@router.get("/{lead_id}")
async def get_property_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single property lead"""
    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Property lead not found")
    return lead


@router.post("")
async def create_property_lead(lead: PropertyLeadCreate, current_user: dict = Depends(get_current_user)):
    """Create a new property lead"""
    lead_doc = {
        "id": str(uuid.uuid4()),
        **lead.dict(),
        "notes": [],
        "activity": [{
            "type": "created",
            "description": "Property lead created",
            "user": current_user["name"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }],
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.property_leads.insert_one(lead_doc)
    return {"message": "Property lead created", "lead": {k: v for k, v in lead_doc.items() if k != "_id"}}


@router.put("/{lead_id}")
async def update_property_lead(lead_id: str, lead: PropertyLeadUpdate, current_user: dict = Depends(get_current_user)):
    """Update a property lead"""
    existing = await db.property_leads.find_one({"id": lead_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    update_data = {k: v for k, v in lead.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Add activity log
    activity_entry = {
        "type": "updated",
        "description": f"Lead updated by {current_user['name']}",
        "user": current_user["name"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "changes": list(update_data.keys())
    }
    
    await db.property_leads.update_one(
        {"id": lead_id},
        {
            "$set": update_data,
            "$push": {"activity": activity_entry}
        }
    )
    
    updated = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    return {"message": "Property lead updated", "lead": updated}


@router.delete("/{lead_id}")
async def delete_property_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a property lead"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.property_leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    return {"message": "Property lead deleted"}


@router.post("/{lead_id}/notes")
async def add_note(lead_id: str, note: PropertyLeadNote, current_user: dict = Depends(get_current_user)):
    """Add a note to a property lead"""
    existing = await db.property_leads.find_one({"id": lead_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    note_doc = {
        "id": str(uuid.uuid4()),
        "text": note.text,
        "pinned": note.pinned,
        "created_by": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    activity_entry = {
        "type": "note_added",
        "description": f"Note added by {current_user['name']}",
        "user": current_user["name"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.property_leads.update_one(
        {"id": lead_id},
        {
            "$push": {"notes": note_doc, "activity": activity_entry},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Note added", "note": note_doc}


@router.delete("/{lead_id}/notes/{note_id}")
async def delete_note(lead_id: str, note_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a note from a property lead"""
    await db.property_leads.update_one(
        {"id": lead_id},
        {"$pull": {"notes": {"id": note_id}}}
    )
    return {"message": "Note deleted"}


@router.post("/{lead_id}/convert-to-showcase")
async def convert_to_showcase(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Convert a property lead to a showcase listing"""
    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    # Check if already converted
    if lead.get("status") == "converted":
        raise HTTPException(status_code=400, detail="This property has already been converted")
    
    # Create listing from lead data - include ALL fields from the lead
    listing_id = str(uuid.uuid4())
    
    # Build address for storage folder
    address_slug = (lead.get("address", "") or "property").lower()
    address_slug = "-".join(address_slug.split()[:5])  # First 5 words
    storage_folder = f"properties/{address_slug}-{listing_id[:8]}"
    
    # Process images - convert gallery_images to the format expected by properties
    images = []
    for img in lead.get("gallery_images", []):
        if isinstance(img, str):
            images.append(img)
        elif isinstance(img, dict) and img.get("url"):
            images.append(img["url"])
    
    listing_data = {
        "id": listing_id,
        # Core address fields
        "address": lead.get("address") or lead.get("property_address", ""),
        "city": lead.get("city", ""),
        "state": lead.get("state", "FL"),
        "zip_code": lead.get("zip_code", ""),
        "county": lead.get("county", ""),
        # Property details
        "property_type": lead.get("property_type", "single_family"),
        "bedrooms": lead.get("bedrooms"),
        "bathrooms": lead.get("bathrooms"),
        "square_feet": lead.get("sqft") or lead.get("square_feet"),
        "sqft": lead.get("sqft") or lead.get("square_feet"),
        "lot_size": lead.get("lot_size"),
        "lot_size_acres": lead.get("lot_size_acres"),
        "year_built": lead.get("year_built"),
        "garage_spaces": lead.get("garage_spaces"),
        "pool": lead.get("pool", False),
        "homestead": lead.get("homestead"),
        "parcel_id": lead.get("parcel_id"),
        # Pricing
        "price": lead.get("list_price") or lead.get("asking_price") or lead.get("estimated_value") or lead.get("price"),
        "list_price": lead.get("list_price"),
        "estimated_value": lead.get("estimated_value"),
        "price_per_sqft": lead.get("price_per_sqft"),
        # Tax info
        "tax_assessed_value": lead.get("tax_assessed_value"),
        "tax_building_value": lead.get("tax_building_value"),
        "tax_land_value": lead.get("tax_land_value"),
        # Description and features
        "description": lead.get("description") or lead.get("submission_message", ""),
        "features": lead.get("features", []),
        "amenities": lead.get("amenities", []),
        # Images - include both formats for compatibility
        "images": images,
        "gallery_images": lead.get("gallery_images", []),
        "street_view": lead.get("street_view"),
        # Status
        "status": "active",
        "mls_status": lead.get("mls_status", "Off Market"),
        "mls_number": lead.get("mls_number", ""),
        # Source tracking
        "source": "property_lead",
        "source_lead_id": lead_id,
        "lead_source": lead.get("source", ""),
        "original_lead_status": lead.get("status", ""),
        "lead_priority": lead.get("priority", ""),
        "lead_tags": lead.get("tags", []),
        # Owner info
        "owner_name": lead.get("owner_name"),
        "owner_email": lead.get("owner_email"),
        "owner_phone": lead.get("owner_phone"),
        "owner_mailing_address": lead.get("owner_mailing_address"),
        "owner_mailing_city": lead.get("owner_mailing_city"),
        "owner_mailing_state": lead.get("owner_mailing_state"),
        "owner_mailing_zip": lead.get("owner_mailing_zip"),
        # Financial info from lead
        "equity_estimate": lead.get("equity_estimate"),
        "mortgage_balance": lead.get("mortgage_balance"),
        # Scraped data (keep for reference)
        "scraped_data": lead.get("scraped_data"),
        # Storage
        "storage_folder": storage_folder,
        # Metadata
        "created_by": current_user.get("sub") or current_user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove None values to keep the document clean
    listing_data = {k: v for k, v in listing_data.items() if v is not None}
    
    # Insert into PROPERTIES collection (not listings) - this is what the public API reads from
    await db.properties.insert_one(listing_data)
    
    # Update lead status to converted
    await db.property_leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "status": "converted",
                "converted_to_listing_id": listing_id,
                "converted_at": datetime.now(timezone.utc).isoformat(),
                "converted_by": current_user.get("name") or current_user.get("email"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Add activity log
    activity = {
        "type": "converted_to_listing",
        "description": f"Converted to Showcase Listing by {current_user.get('name') or current_user.get('email')}",
        "user": current_user.get("name") or current_user.get("email"),
        "listing_id": listing_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.property_leads.update_one(
        {"id": lead_id},
        {"$push": {"activity": activity}}
    )
    
    return {
        "message": "Property lead converted to showcase listing",
        "listing_id": listing_id,
        "lead_id": lead_id,
        "showcase_url": f"/listing/{listing_id}"
    }


@router.post("/{lead_id}/unconvert")
async def unconvert_from_showcase(
    lead_id: str, 
    delete_listing: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """
    Un-convert a property lead that was previously converted to a showcase listing.
    This resets the lead back to its previous state so it can be edited and re-converted.
    
    Args:
        lead_id: The ID of the property lead to un-convert
        delete_listing: If True (default), also deletes the associated showcase listing
    """
    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    # Check if the lead is actually converted
    if lead.get("status") != "converted":
        raise HTTPException(status_code=400, detail="This property lead is not converted")
    
    listing_id = lead.get("converted_to_listing_id")
    listing_deleted = False
    
    # Optionally delete the associated showcase listing
    if delete_listing and listing_id:
        # Delete from properties collection
        result = await db.properties.delete_one({"id": listing_id})
        listing_deleted = result.deleted_count > 0
        
        # Also try listings collection (in case it was created with old code)
        if not listing_deleted:
            result = await db.listings.delete_one({"id": listing_id})
            listing_deleted = result.deleted_count > 0
    
    # Determine what status to reset to
    # Check activity log for previous status, default to 'new'
    previous_status = "new"
    activity_log = lead.get("activity", [])
    for activity in reversed(activity_log):
        if activity.get("type") == "status_change" and activity.get("from_status"):
            previous_status = activity.get("from_status")
            break
    
    # Reset the lead status
    await db.property_leads.update_one(
        {"id": lead_id},
        {
            "$set": {
                "status": previous_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$unset": {
                "converted_to_listing_id": "",
                "converted_at": "",
                "converted_by": ""
            }
        }
    )
    
    # Add activity log
    activity = {
        "type": "unconverted",
        "description": f"Un-converted from Showcase Listing by {current_user.get('name') or current_user.get('email')}",
        "user": current_user.get("name") or current_user.get("email"),
        "previous_listing_id": listing_id,
        "listing_deleted": listing_deleted,
        "reset_to_status": previous_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.property_leads.update_one(
        {"id": lead_id},
        {"$push": {"activity": activity}}
    )
    
    return {
        "message": "Property lead has been un-converted",
        "lead_id": lead_id,
        "reset_to_status": previous_status,
        "listing_deleted": listing_deleted,
        "previous_listing_id": listing_id
    }


@router.post("/{lead_id}/pull-owner-info")
async def pull_owner_info(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Pull owner information from county tax records"""
    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    # Build search address - try multiple address fields
    address = lead.get("property_address") or lead.get("address", "")
    city = lead.get("city", "")
    county = lead.get("county", "")
    
    if not address:
        raise HTTPException(status_code=400, detail="Property address is required")
    
    # Clean up address for better search results
    # Remove trailing periods, extra spaces, standardize abbreviations
    import re
    address = address.strip().rstrip('.')
    address = re.sub(r'\s+', ' ', address)  # Remove extra spaces
    # Don't include "Ave.", "St.", etc. variations - the scraper handles it
    
    # Search county records
    try:
        search_query = f"{address}, {city}" if city else address
        
        # If county is specified, search that county first, otherwise search all
        results = await search_property(search_query, county.lower() if county else None)
        
        if not results:
            # Try without city
            results = await search_property(address, county.lower() if county else None)
        
        if not results:
            return {"message": "No records found in county database", "success": False}
        
        # Use the first/best result
        result = results[0]
        
        # Update the lead with tax collector data
        update_data = {
            "owner_name": result.get("owner_name"),
            "owner_mailing_address": result.get("owner_address"),
            "tax_assessed_value": result.get("assessed_value"),
            "tax_land_value": result.get("land_value"),
            "tax_building_value": result.get("building_value"),
            "homestead": result.get("homestead"),
            "parcel_id": result.get("parcel_id"),
            "county": result.get("county"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Parse market value as estimated value if not set
        if result.get("market_value") and not lead.get("estimated_value"):
            update_data["estimated_value"] = result.get("market_value")
        
        activity_entry = {
            "type": "owner_info_pulled",
            "description": f"Owner info pulled from {result.get('county', 'county')} tax records by {current_user['name']}",
            "user": current_user["name"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {
                "owner_name": result.get("owner_name"),
                "source": result.get("source")
            }
        }
        
        await db.property_leads.update_one(
            {"id": lead_id},
            {
                "$set": update_data,
                "$push": {"activity": activity_entry}
            }
        )
        
        updated_lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
        return {
            "message": "Owner info pulled successfully",
            "success": True,
            "lead": updated_lead,
            "source": result.get("source")
        }
        
    except Exception as e:
        return {"message": f"Failed to pull owner info: {str(e)}", "success": False}


@router.post("/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import property leads from CSV file"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    content = await file.read()
    # Handle UTF-8 BOM if present
    decoded = content.decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(decoded))
    
    # Map common CSV column names to our fields
    column_mapping = {
        # Address fields
        'address': ['address', 'street', 'street_address', 'property_address', 'situs_address', 'Address'],
        'city': ['city', 'situs_city', 'City'],
        'state': ['state', 'situs_state', 'State'],
        'zip_code': ['zip', 'zip_code', 'zipcode', 'postal_code', 'situs_zip', 'Zip'],
        'county': ['county', 'County'],
        
        # Property details  
        'property_type': ['property_type', 'type', 'use_code', 'land_use', 'Property Type'],
        'bedrooms': ['beds', 'bedrooms', 'bed', 'br', 'Beds'],
        'bathrooms': ['baths', 'bathrooms', 'bath', 'ba', 'Baths'],
        'sqft': ['sqft', 'square_feet', 'sq_ft', 'living_area', 'heated_sqft', 'Square Footage', 'square footage'],
        'lot_size': ['lot_size', 'lot_acres', 'acres', 'land_size', 'Lot Size'],
        'year_built': ['year_built', 'year', 'built', 'Year Built'],
        'parcel_id': ['parcel_id', 'parcel', 'apn', 'folio', 'pin', 'Parcel'],
        
        # MLS fields
        'mls_number': ['mls', 'mls_number', 'mls_id', 'MLS #', 'MLS#', 'MLS'],
        'mls_status': ['status', 'mls_status', 'listing_status', 'Status'],
        'list_price': ['price', 'list_price', 'asking_price', 'Price'],
        'price_per_sqft': ['price_per_sqft', 'ppsf', 'Price per/Sqft', 'Price/SqFt'],
        
        # Value fields
        'estimated_value': ['value', 'estimated_value', 'market_value', 'assessed_value', 'total_value', 'price', 'Price'],
        'last_sale_price': ['last_sale_price', 'sale_price', 'sold_price'],
        'last_sale_date': ['last_sale_date', 'sale_date', 'sold_date'],
        
        # Owner fields
        'owner_name': ['owner', 'owner_name', 'owner_1', 'owner1'],
        'owner_mailing_address': ['mailing_address', 'owner_address', 'mail_address'],
        'owner_mailing_city': ['mailing_city', 'owner_city', 'mail_city'],
        'owner_mailing_state': ['mailing_state', 'owner_state', 'mail_state'],
        'owner_mailing_zip': ['mailing_zip', 'owner_zip', 'mail_zip'],
        
        # Additional fields
        'utilities': ['utilities', 'Utilities'],
        'favorite': ['favorite', 'Favorite'],
    }
    
    def find_column_value(row, field_names):
        """Find value from multiple possible column names"""
        # First try exact matches (case insensitive)
        for name in field_names:
            for key in row.keys():
                if key.lower().strip() == name.lower().strip():
                    return row[key]
        # Then try if column name contains field name (but only if unique)
        for name in field_names:
            matches = []
            for key in row.keys():
                if name.lower() in key.lower() and len(name) > 3:  # Only for longer names to avoid false positives
                    matches.append(key)
            if len(matches) == 1:  # Only if exactly one match
                return row[matches[0]]
        return None
    
    imported = 0
    skipped = 0
    errors = []
    
    for row_num, row in enumerate(reader, start=2):
        try:
            # Extract address (required)
            address = find_column_value(row, column_mapping['address'])
            if not address or not address.strip():
                skipped += 1
                continue
            
            city = find_column_value(row, column_mapping['city']) or ""
            state = find_column_value(row, column_mapping['state']) or "FL"
            zip_code = find_column_value(row, column_mapping['zip_code']) or ""
            
            # Check for duplicate - if exists, UPDATE instead of skip
            existing = await db.property_leads.find_one({
                "address": {"$regex": f"^{address.strip()}$", "$options": "i"},
                "city": {"$regex": f"^{city.strip()}$", "$options": "i"}
            })
            
            if existing:
                # Update existing lead with new data
                update_data = {}
                
                # Only update fields that have new values
                for field in ['sqft', 'bedrooms', 'bathrooms', 'lot_size', 'year_built', 
                             'estimated_value', 'list_price', 'price_per_sqft',
                             'mls_number', 'mls_status', 'property_type']:
                    val = find_column_value(row, column_mapping.get(field, [field]))
                    if val:
                        if field in ['bedrooms', 'sqft', 'year_built']:
                            try:
                                clean_val = str(val).replace(',', '').replace(' sqft', '').strip()
                                update_data[field] = int(float(clean_val))
                            except:
                                pass
                        elif field in ['bathrooms', 'lot_size']:
                            try:
                                clean_val = str(val).replace(',', '').replace(' acres', '').strip()
                                update_data[field] = float(clean_val)
                            except:
                                pass
                        elif field in ['estimated_value', 'list_price', 'price_per_sqft']:
                            try:
                                clean_val = str(val).replace('$', '').replace(',', '').strip()
                                if clean_val and clean_val != '- -':
                                    update_data[field] = float(clean_val)
                            except:
                                pass
                        else:
                            update_data[field] = str(val).strip()
                
                if update_data:
                    await db.property_leads.update_one(
                        {"id": existing["id"]},
                        {"$set": update_data}
                    )
                    imported += 1  # Count as imported (updated)
                else:
                    skipped += 1
                continue
            
            # Build lead document
            lead_doc = {
                "id": str(uuid.uuid4()),
                "address": address.strip(),
                "city": city.strip(),
                "state": state.strip() if state else "FL",
                "zip_code": str(zip_code).strip() if zip_code else "",
                "county": (find_column_value(row, column_mapping['county']) or "").strip(),
                "property_type": (find_column_value(row, column_mapping['property_type']) or "").strip(),
                "parcel_id": (find_column_value(row, column_mapping['parcel_id']) or "").strip(),
                
                # MLS fields
                "mls_number": (find_column_value(row, column_mapping['mls_number']) or "").strip(),
                "mls_status": (find_column_value(row, column_mapping['mls_status']) or "").strip(),
                
                # Owner fields
                "owner_name": (find_column_value(row, column_mapping['owner_name']) or "").strip(),
                "owner_mailing_address": (find_column_value(row, column_mapping['owner_mailing_address']) or "").strip(),
                "owner_mailing_city": (find_column_value(row, column_mapping['owner_mailing_city']) or "").strip(),
                "owner_mailing_state": (find_column_value(row, column_mapping['owner_mailing_state']) or "").strip(),
                "owner_mailing_zip": (find_column_value(row, column_mapping['owner_mailing_zip']) or "").strip(),
                
                "status": "new",
                "priority": "medium",
                "tags": [],
                "source": "csv_import",
                "notes": [],
                "activity": [{
                    "type": "imported",
                    "description": f"Imported from CSV by {current_user['name']}",
                    "user": current_user["name"],
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "file": file.filename
                }],
                "created_by": current_user["id"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Parse numeric fields
            for field in ['bedrooms', 'sqft', 'year_built', 'garage']:
                val = find_column_value(row, column_mapping.get(field, [field]))
                if val:
                    try:
                        # Remove commas and "sqft" suffix
                        clean_val = str(val).replace(',', '').replace(' sqft', '').strip()
                        lead_doc[field] = int(float(clean_val))
                    except:
                        pass
            
            for field in ['bathrooms', 'lot_size']:
                val = find_column_value(row, column_mapping.get(field, [field]))
                if val:
                    try:
                        # Remove "acres" suffix
                        clean_val = str(val).replace(',', '').replace(' acres', '').strip()
                        lead_doc[field] = float(clean_val)
                    except:
                        pass
            
            # Price fields - handle $ and commas
            for field in ['estimated_value', 'last_sale_price', 'list_price', 'price_per_sqft']:
                val = find_column_value(row, column_mapping.get(field, [field]))
                if val:
                    try:
                        # Remove $ and commas
                        clean_val = str(val).replace('$', '').replace(',', '').strip()
                        if clean_val and clean_val != '- -':
                            lead_doc[field] = float(clean_val)
                    except:
                        pass
            
            # Date field
            sale_date = find_column_value(row, column_mapping['last_sale_date'])
            if sale_date:
                lead_doc['last_sale_date'] = str(sale_date).strip()
            
            await db.property_leads.insert_one(lead_doc)
            imported += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    return {
        "message": f"Import complete",
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:10] if errors else []  # Return first 10 errors
    }


@router.get("/export/csv")
async def export_csv(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Export property leads to CSV"""
    query = {}
    if status:
        query["status"] = status
    
    leads = await db.property_leads.find(query, {"_id": 0}).to_list(10000)
    
    if not leads:
        raise HTTPException(status_code=404, detail="No leads to export")
    
    # Build CSV
    output = io.StringIO()
    
    # Define columns to export
    columns = [
        'address', 'city', 'state', 'zip_code', 'county', 'property_type',
        'bedrooms', 'bathrooms', 'sqft', 'lot_size', 'year_built', 'parcel_id',
        'estimated_value', 'last_sale_price', 'last_sale_date',
        'owner_name', 'owner_mailing_address', 'owner_phone', 'owner_email',
        'status', 'priority', 'source', 'created_at'
    ]
    
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction='ignore')
    writer.writeheader()
    
    for lead in leads:
        writer.writerow(lead)
    
    return {
        "csv": output.getvalue(),
        "count": len(leads)
    }



# ============ PROPERTY IMAGES ============

import os
import shutil
from fastapi import Form
from fastapi.responses import FileResponse

PROPERTY_IMAGES_DIR = "/app/backend/static/property-images"

def get_property_images_dir(lead_id: str) -> str:
    """Get or create the images directory for a property lead"""
    dir_path = os.path.join(PROPERTY_IMAGES_DIR, lead_id)
    os.makedirs(dir_path, exist_ok=True)
    return dir_path


@router.get("/{lead_id}/images")
async def get_property_images(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Get all images for a property lead"""
    # Verify lead exists
    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    # Get images from database
    images = lead.get("gallery_images", [])
    
    return {
        "lead_id": lead_id,
        "images": images,
        "total": len(images)
    }


@router.post("/{lead_id}/images/upload")
async def upload_property_image(
    lead_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload an image to a property lead's gallery"""
    # Verify lead exists
    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, GIF, WEBP allowed.")
    
    # Create directory for this property
    images_dir = get_property_images_dir(lead_id)
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"{uuid.uuid4().hex[:12]}.{file_ext}"
    file_path = os.path.join(images_dir, unique_filename)
    
    # Save file
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        file_size = len(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create image record
    image_record = {
        "id": str(uuid.uuid4()),
        "filename": unique_filename,
        "original_name": file.filename,
        "url": f"/api/property-leads/{lead_id}/images/file/{unique_filename}",
        "size": file_size,
        "content_type": file.content_type,
        "uploaded_by": current_user["name"],
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update lead with new image
    await db.property_leads.update_one(
        {"id": lead_id},
        {
            "$push": {"gallery_images": image_record},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Add activity
    activity = {
        "type": "image_uploaded",
        "description": f"Image '{file.filename}' uploaded to gallery",
        "user": current_user["name"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.property_leads.update_one(
        {"id": lead_id},
        {"$push": {"activity": activity}}
    )
    
    return {
        "message": "Image uploaded successfully",
        "image": image_record
    }


@router.post("/{lead_id}/images/upload-multiple")
async def upload_multiple_property_images(
    lead_id: str,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload multiple images to a property lead's gallery"""
    # Verify lead exists
    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    images_dir = get_property_images_dir(lead_id)
    uploaded = []
    errors = []
    
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    
    for file in files:
        if file.content_type not in allowed_types:
            errors.append(f"{file.filename}: Invalid file type")
            continue
        
        try:
            file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
            unique_filename = f"{uuid.uuid4().hex[:12]}.{file_ext}"
            file_path = os.path.join(images_dir, unique_filename)
            
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            image_record = {
                "id": str(uuid.uuid4()),
                "filename": unique_filename,
                "original_name": file.filename,
                "url": f"/api/property-leads/{lead_id}/images/file/{unique_filename}",
                "size": len(content),
                "content_type": file.content_type,
                "uploaded_by": current_user["name"],
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.property_leads.update_one(
                {"id": lead_id},
                {"$push": {"gallery_images": image_record}}
            )
            
            uploaded.append(image_record)
            
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")
    
    # Update timestamp and add activity
    if uploaded:
        await db.property_leads.update_one(
            {"id": lead_id},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        activity = {
            "type": "images_uploaded",
            "description": f"{len(uploaded)} images uploaded to gallery",
            "user": current_user["name"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.property_leads.update_one(
            {"id": lead_id},
            {"$push": {"activity": activity}}
        )
    
    return {
        "message": f"Uploaded {len(uploaded)} images",
        "uploaded": uploaded,
        "errors": errors
    }


@router.get("/{lead_id}/images/file/{filename}")
async def get_property_image_file(lead_id: str, filename: str):
    """Serve a property image file"""
    file_path = os.path.join(PROPERTY_IMAGES_DIR, lead_id, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(file_path)


@router.delete("/{lead_id}/images/{image_id}")
async def delete_property_image(
    lead_id: str,
    image_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an image from a property lead's gallery"""
    # Verify lead exists
    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    # Find the image
    gallery_images = lead.get("gallery_images", [])
    image_to_delete = None
    for img in gallery_images:
        if img["id"] == image_id:
            image_to_delete = img
            break
    
    if not image_to_delete:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete the file
    file_path = os.path.join(PROPERTY_IMAGES_DIR, lead_id, image_to_delete["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove from database
    await db.property_leads.update_one(
        {"id": lead_id},
        {
            "$pull": {"gallery_images": {"id": image_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Add activity
    activity = {
        "type": "image_deleted",
        "description": f"Image '{image_to_delete['original_name']}' removed from gallery",
        "user": current_user["name"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.property_leads.update_one(
        {"id": lead_id},
        {"$push": {"activity": activity}}
    )
    
    return {"message": "Image deleted successfully"}


@router.put("/{lead_id}/images/reorder")
async def reorder_property_images(
    lead_id: str,
    image_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Reorder images in the gallery"""
    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    current_images = lead.get("gallery_images", [])
    images_by_id = {img["id"]: img for img in current_images}
    
    # Reorder based on provided order
    reordered = []
    for img_id in image_ids:
        if img_id in images_by_id:
            reordered.append(images_by_id[img_id])
    
    # Add any images not in the provided list at the end
    for img in current_images:
        if img["id"] not in image_ids:
            reordered.append(img)
    
    await db.property_leads.update_one(
        {"id": lead_id},
        {"$set": {"gallery_images": reordered, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Images reordered successfully", "images": reordered}
