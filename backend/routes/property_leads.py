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

router = APIRouter(prefix="/property-leads", tags=["Property Leads"])


# Status and priority options
STATUSES = ["new", "contacted", "qualified", "nurturing", "not_interested", "converted"]
PRIORITIES = ["low", "medium", "high", "urgent"]
PROPERTY_TYPES = ["single_family", "condo", "townhouse", "multi_family", "land", "commercial"]


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


@router.post("/{lead_id}/pull-owner-info")
async def pull_owner_info(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Pull owner information from county tax records"""
    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Property lead not found")
    
    # Build search address
    address = lead.get("address", "")
    city = lead.get("city", "")
    
    if not address:
        raise HTTPException(status_code=400, detail="Property address is required")
    
    # Search county records
    try:
        search_query = f"{address}, {city}" if city else address
        results = await search_all_counties(search_query, lead.get("county"))
        
        if not results:
            return {"message": "No records found", "success": False}
        
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
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    # Map common CSV column names to our fields
    column_mapping = {
        # Address fields
        'address': ['address', 'street', 'street_address', 'property_address', 'situs_address'],
        'city': ['city', 'situs_city'],
        'state': ['state', 'situs_state'],
        'zip_code': ['zip', 'zip_code', 'zipcode', 'postal_code', 'situs_zip'],
        'county': ['county'],
        
        # Property details
        'property_type': ['property_type', 'type', 'use_code', 'land_use'],
        'bedrooms': ['beds', 'bedrooms', 'bed', 'br'],
        'bathrooms': ['baths', 'bathrooms', 'bath', 'ba'],
        'sqft': ['sqft', 'square_feet', 'sq_ft', 'living_area', 'heated_sqft'],
        'lot_size': ['lot_size', 'lot_acres', 'acres', 'land_size'],
        'year_built': ['year_built', 'year', 'built'],
        'parcel_id': ['parcel_id', 'parcel', 'apn', 'folio', 'pin'],
        
        # Value fields
        'estimated_value': ['value', 'estimated_value', 'market_value', 'assessed_value', 'total_value'],
        'last_sale_price': ['last_sale_price', 'sale_price', 'sold_price'],
        'last_sale_date': ['last_sale_date', 'sale_date', 'sold_date'],
        
        # Owner fields
        'owner_name': ['owner', 'owner_name', 'owner_1', 'owner1'],
        'owner_mailing_address': ['mailing_address', 'owner_address', 'mail_address'],
        'owner_mailing_city': ['mailing_city', 'owner_city', 'mail_city'],
        'owner_mailing_state': ['mailing_state', 'owner_state', 'mail_state'],
        'owner_mailing_zip': ['mailing_zip', 'owner_zip', 'mail_zip'],
    }
    
    def find_column_value(row, field_names):
        """Find value from multiple possible column names"""
        for name in field_names:
            # Try exact match (case insensitive)
            for key in row.keys():
                if key.lower().strip() == name.lower():
                    return row[key]
            # Try partial match
            for key in row.keys():
                if name.lower() in key.lower():
                    return row[key]
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
            
            # Check for duplicate
            existing = await db.property_leads.find_one({
                "address": {"$regex": f"^{address.strip()}$", "$options": "i"},
                "city": {"$regex": f"^{city.strip()}$", "$options": "i"}
            })
            
            if existing:
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
                        lead_doc[field] = int(float(str(val).replace(',', '')))
                    except:
                        pass
            
            for field in ['bathrooms', 'lot_size']:
                val = find_column_value(row, column_mapping.get(field, [field]))
                if val:
                    try:
                        lead_doc[field] = float(str(val).replace(',', ''))
                    except:
                        pass
            
            for field in ['estimated_value', 'last_sale_price']:
                val = find_column_value(row, column_mapping.get(field, [field]))
                if val:
                    try:
                        # Remove $ and commas
                        clean_val = str(val).replace('$', '').replace(',', '').strip()
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
