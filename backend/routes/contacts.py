from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import csv
import io
import re
import os
from database import db
from models.contact import ContactCreate, ContactResponse, LeadScoreUpdate
from models.user import UserRole
from utils.auth import get_current_user, require_role

router = APIRouter()

# SMS via Telnyx
class SendSMSRequest(BaseModel):
    phone: str
    message: str
    contact_id: Optional[str] = None
    contact_type: Optional[str] = None  # contact, lead, property_lead, seller_lead

@router.post("/send-sms")
async def send_sms(request: SendSMSRequest, current_user: dict = Depends(get_current_user)):
    """Send SMS via Telnyx"""
    import telnyx
    
    # Get settings from DB first, then fall back to env
    telnyx_settings = await db.telnyx_settings.find_one({}, {"_id": 0})
    telnyx_api_key = telnyx_settings.get("apiKey") if telnyx_settings else None
    telnyx_phone = telnyx_settings.get("phoneNumber") if telnyx_settings else None
    
    # Fall back to environment variables
    if not telnyx_api_key:
        telnyx_api_key = os.environ.get("TELNYX_API_KEY")
    if not telnyx_phone:
        telnyx_phone = os.environ.get("TELNYX_PHONE_NUMBER")
    
    if not telnyx_api_key or not telnyx_phone:
        raise HTTPException(status_code=500, detail="Telnyx not configured. Go to Settings → Developer → Telnyx SMS to add your credentials.")
    
    telnyx.api_key = telnyx_api_key
    
    # Clean phone number to E.164 format
    phone = re.sub(r'[^\d+]', '', request.phone)
    if not phone.startswith('+'):
        phone = '+1' + phone  # Assume US if no country code
    
    try:
        message = telnyx.Message.create(
            from_=telnyx_phone,
            to=phone,
            text=request.message
        )
        
        # Store SMS record
        sms_doc = {
            "id": str(uuid.uuid4()),
            "contact_id": request.contact_id,
            "contact_type": request.contact_type,
            "phone": phone,
            "message": request.message,
            "telnyx_id": message.data.id if hasattr(message, 'data') else None,
            "status": "sent",
            "sent_by": str(current_user.get("id", current_user.get("_id", ""))),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sms_messages.insert_one(sms_doc)
        
        return {"success": True, "message_id": sms_doc["id"], "status": "sent"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to send SMS: {str(e)}")

@router.get("/sms-history/{contact_id}")
async def get_sms_history(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Get SMS history for a contact"""
    messages = await db.sms_messages.find(
        {"contact_id": contact_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return messages

# ============ VCARD PARSING UTILITIES ============

def parse_vcard(content: str) -> list:
    """Parse vCard (.vcf) file content into contact dictionaries"""
    contacts = []
    current_contact = {}
    
    lines = content.replace('\r\n ', '').replace('\r\n\t', '').split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.upper() == 'BEGIN:VCARD':
            current_contact = {}
        elif line.upper() == 'END:VCARD':
            if current_contact:
                contacts.append(current_contact)
            current_contact = {}
        elif ':' in line:
            # Handle property;params:value format
            parts = line.split(':', 1)
            prop_part = parts[0]
            value = parts[1] if len(parts) > 1 else ''
            
            # Get property name (before any parameters)
            prop_name = prop_part.split(';')[0].upper()
            
            if prop_name == 'FN':
                current_contact['full_name'] = value
            elif prop_name == 'N':
                # N:Last;First;Middle;Prefix;Suffix
                name_parts = value.split(';')
                if len(name_parts) >= 2:
                    current_contact['last_name'] = name_parts[0] if name_parts[0] else ''
                    current_contact['first_name'] = name_parts[1] if len(name_parts) > 1 else ''
            elif prop_name == 'EMAIL':
                current_contact['email'] = value.lower()
            elif prop_name == 'TEL':
                # Clean phone number
                phone = re.sub(r'[^\d+]', '', value)
                current_contact['phone'] = phone
            elif prop_name == 'ORG':
                current_contact['company'] = value.split(';')[0]
            elif prop_name == 'TITLE':
                current_contact['position'] = value
            elif prop_name == 'NOTE':
                current_contact['notes'] = value
            elif prop_name == 'CATEGORIES':
                # Parse categories/tags
                current_contact['tags'] = [t.strip() for t in value.split(',')]
    
    return contacts

def generate_vcard(contact: dict) -> str:
    """Generate a vCard string from a contact dictionary"""
    lines = ['BEGIN:VCARD', 'VERSION:3.0']
    
    # Full name
    first = contact.get('first_name', '')
    last = contact.get('last_name', '')
    full_name = f"{first} {last}".strip() or contact.get('email', 'Unknown')
    lines.append(f'FN:{full_name}')
    
    # Structured name
    lines.append(f'N:{last};{first};;;')
    
    # Email
    if contact.get('email'):
        lines.append(f'EMAIL;TYPE=INTERNET:{contact["email"]}')
    
    # Phone
    if contact.get('phone'):
        lines.append(f'TEL;TYPE=CELL:{contact["phone"]}')
    
    # Organization
    if contact.get('company'):
        lines.append(f'ORG:{contact["company"]}')
    
    # Title/Position
    if contact.get('position'):
        lines.append(f'TITLE:{contact["position"]}')
    
    # Notes
    if contact.get('notes'):
        lines.append(f'NOTE:{contact["notes"]}')
    
    # Categories (tags + category)
    categories = []
    if contact.get('category'):
        categories.append(contact['category'])
    if contact.get('tags'):
        categories.extend(contact['tags'])
    if categories:
        lines.append(f'CATEGORIES:{",".join(categories)}')
    
    lines.append('END:VCARD')
    return '\r\n'.join(lines)

# ============ CRUD OPERATIONS ============

@router.post("", response_model=ContactResponse)
async def create_contact(contact: ContactCreate, current_user: dict = Depends(get_current_user)):
    contact_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    contact_doc = {
        "id": contact_id,
        **contact.model_dump(),
        "lead_score": 0,
        "created_at": now
    }
    await db.contacts.insert_one(contact_doc)
    contact_doc.pop("_id", None)
    return ContactResponse(**contact_doc)

@router.get("", response_model=List[ContactResponse])
async def get_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    letter: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get contacts with pagination and filters"""
    query = {}
    conditions = []
    
    # Search filter - search across multiple fields
    if search:
        search_conditions = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"display_name": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"email_2": {"$regex": search, "$options": "i"}},
            {"organization": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"mobile_phone": {"$regex": search, "$options": "i"}},
            {"home_phone": {"$regex": search, "$options": "i"}},
            {"business_phone": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
        ]
        conditions.append({"$or": search_conditions})
    
    # Letter filter (for alphabetical navigation)
    if letter and letter.upper() in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        letter_conditions = [
            {"first_name": {"$regex": f"^{letter}", "$options": "i"}},
            {"last_name": {"$regex": f"^{letter}", "$options": "i"}},
            {"display_name": {"$regex": f"^{letter}", "$options": "i"}},
            {"name": {"$regex": f"^{letter}", "$options": "i"}},
            {"organization": {"$regex": f"^{letter}", "$options": "i"}},
        ]
        conditions.append({"$or": letter_conditions})
    
    # Category filter
    if category:
        conditions.append({"category": category})
    
    # Combine all conditions with $and if there are multiple
    if len(conditions) > 1:
        query["$and"] = conditions
    elif len(conditions) == 1:
        query = conditions[0]
    
    contacts = await db.contacts.find(query, {"_id": 0}).sort([
        ("display_name", 1), ("first_name", 1), ("last_name", 1)
    ]).skip(skip).limit(limit).to_list(limit)
    
    return [ContactResponse(**c) for c in contacts]


@router.get("/stats/summary")
async def get_contacts_stats(current_user: dict = Depends(get_current_user)):
    """Get contact statistics"""
    total = await db.contacts.count_documents({})
    buyers = await db.contacts.count_documents({"category": "buyer"})
    sellers = await db.contacts.count_documents({"category": "seller"})
    new_count = await db.contacts.count_documents({"status": "new"})
    qualified = await db.contacts.count_documents({"status": "qualified"})
    
    # Count by first letter - use a simpler approach
    letter_counts = {}
    try:
        pipeline = [
            {"$match": {"first_name": {"$type": "string", "$ne": ""}}},
            {"$project": {
                "letter": {"$toUpper": {"$substrCP": ["$first_name", 0, 1]}}
            }},
            {"$match": {"letter": {"$regex": "^[A-Z]$"}}},
            {"$group": {"_id": "$letter", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        async for doc in db.contacts.aggregate(pipeline):
            if doc["_id"]:
                letter_counts[doc["_id"]] = doc["count"]
    except Exception as e:
        # If aggregation fails, just skip letter counts
        print(f"Letter count aggregation failed: {e}")
    
    return {
        "total": total,
        "buyers": buyers,
        "sellers": sellers,
        "new": new_count,
        "qualified": qualified,
        "by_letter": letter_counts
    }

@router.get("/export")
async def export_contacts(
    category: Optional[str] = Query(None, description="Filter by category: buyer, seller"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: dict = Depends(get_current_user)
):
    """Export all contacts to CSV file"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build query
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    
    # Get all contacts
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(100000)
    
    if not contacts:
        raise HTTPException(status_code=404, detail="No contacts found")
    
    # Define CSV columns - comprehensive list matching import fields
    columns = [
        "id", "first_name", "last_name", "name", "display_name", "nickname",
        "email", "email_2", "email_3",
        "phone", "mobile_phone", "home_phone", "business_phone", "pager", "home_fax", "business_fax",
        "company", "organization", "position", "job_title", "department",
        "home_street", "home_address_2", "home_city", "home_state", "home_postal_code", "home_country",
        "business_address", "business_address_2", "business_city", "business_state", "business_postal_code", "business_country",
        "birthday", "anniversary", "home_purchase_anniversary",
        "web_page", "web_page_2",
        "related_name", "categories", "notes",
        "status", "category", "contact_type", "source", "lead_score", "budget", "property_interest",
        "tags", "created_at", "updated_at"
    ]
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction='ignore')
    writer.writeheader()
    
    for contact in contacts:
        # Convert tags list to comma-separated string
        if isinstance(contact.get("tags"), list):
            contact["tags"] = ", ".join(contact["tags"])
        writer.writerow(contact)
    
    # Prepare response
    output.seek(0)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"contacts_export_{timestamp}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactResponse(**contact)

@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, contact: ContactCreate, current_user: dict = Depends(get_current_user)):
    result = await db.contacts.update_one({"id": contact_id}, {"$set": contact.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return ContactResponse(**updated)

@router.patch("/{contact_id}/score", response_model=ContactResponse)
async def update_lead_score(contact_id: str, score_update: LeadScoreUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.contacts.update_one({"id": contact_id}, {"$set": {"lead_score": score_update.lead_score}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return ContactResponse(**updated)

@router.delete("/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER, UserRole.ADMIN]))):
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

# ============ CONTACT PROPERTIES ============

class AddPropertyRequest(BaseModel):
    property_id: str
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    type: str  # 'buying' or 'selling'
    status: Optional[str] = None
    price: Optional[str] = None

@router.get("/{contact_id}/properties")
async def get_contact_properties(contact_id: str, current_user: dict = Depends(get_current_user)):
    """Get all properties linked to a contact"""
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    properties = contact.get("properties", [])
    
    # Enrich with latest property data
    enriched = []
    for prop in properties:
        # Try to get updated info from property_leads
        lead = await db.property_leads.find_one({"id": prop.get("property_id")}, {"_id": 0})
        if lead:
            enriched.append({
                **prop,
                "address": lead.get("address", prop.get("address")),
                "city": lead.get("city", prop.get("city")),
                "state": lead.get("state", prop.get("state")),
                "status": lead.get("status", prop.get("status")),
                "price": lead.get("list_price") or lead.get("estimated_value") or prop.get("price"),
                "bedrooms": lead.get("bedrooms"),
                "bathrooms": lead.get("bathrooms"),
                "sqft": lead.get("sqft"),
            })
        else:
            enriched.append(prop)
    
    return enriched

@router.post("/{contact_id}/properties")
async def add_contact_property(contact_id: str, property_req: AddPropertyRequest, current_user: dict = Depends(get_current_user)):
    """Add a property to a contact"""
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    properties = contact.get("properties", [])
    
    # Check if property already linked
    if any(p.get("property_id") == property_req.property_id for p in properties):
        raise HTTPException(status_code=400, detail="Property already linked to this contact")
    
    new_property = {
        "id": str(uuid.uuid4()),
        "property_id": property_req.property_id,
        "address": property_req.address,
        "city": property_req.city,
        "state": property_req.state,
        "type": property_req.type,
        "status": property_req.status,
        "price": property_req.price,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    
    properties.append(new_property)
    
    await db.contacts.update_one(
        {"id": contact_id},
        {"$set": {"properties": properties, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return new_property

@router.delete("/{contact_id}/properties/{property_link_id}")
async def remove_contact_property(contact_id: str, property_link_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a property from a contact"""
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    properties = contact.get("properties", [])
    properties = [p for p in properties if p.get("id") != property_link_id]
    
    await db.contacts.update_one(
        {"id": contact_id},
        {"$set": {"properties": properties, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Property removed from contact"}

@router.get("/available-properties/list")
async def get_available_properties(
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get available properties to link to a contact"""
    query = {}
    if search:
        query["$or"] = [
            {"address": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"owner_name": {"$regex": search, "$options": "i"}},
        ]
    
    properties = await db.property_leads.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    
    return [{
        "id": p.get("id"),
        "address": p.get("address"),
        "city": p.get("city"),
        "state": p.get("state"),
        "status": p.get("status"),
        "price": p.get("list_price") or p.get("estimated_value"),
        "bedrooms": p.get("bedrooms"),
        "bathrooms": p.get("bathrooms"),
        "sqft": p.get("sqft"),
    } for p in properties]

# ============ IMPORT / EXPORT ============

@router.post("/import")
async def import_contacts(
    file: UploadFile = File(...),
    category: Optional[str] = Query(None, description="Category to assign: buyer, seller"),
    current_user: dict = Depends(get_current_user)
):
    """Import contacts from CSV or vCard (.vcf) file"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    content = await file.read()
    
    # Detect file type
    filename = file.filename.lower() if file.filename else ''
    is_vcard = filename.endswith('.vcf') or filename.endswith('.vcard')
    
    try:
        # Decode content
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
        
        contacts_to_import = []
        skipped_no_data = 0  # Track rows without required fields
        
        if is_vcard:
            # Parse vCard format
            contacts_to_import = parse_vcard(text)
        else:
            # Parse CSV format - supports both simple and full export format
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                contact = {}
                
                # Direct field mapping (matches export format)
                direct_fields = [
                    'id', 'first_name', 'last_name', 'name', 'display_name', 'nickname',
                    'email', 'email_2', 'email_3',
                    'phone', 'mobile_phone', 'home_phone', 'business_phone', 'pager', 'home_fax', 'business_fax',
                    'company', 'organization', 'position', 'job_title', 'department',
                    'home_street', 'home_address_2', 'home_city', 'home_state', 'home_postal_code', 'home_country',
                    'business_address', 'business_address_2', 'business_city', 'business_state', 'business_postal_code', 'business_country',
                    'birthday', 'anniversary', 'home_purchase_anniversary',
                    'web_page', 'web_page_2',
                    'related_name', 'categories', 'notes',
                    'status', 'category', 'contact_type', 'source', 'lead_score', 'budget', 'property_interest',
                    'tags', 'created_at', 'updated_at'
                ]
                
                for field in direct_fields:
                    if field in row and row[field]:
                        contact[field] = row[field].strip()
                
                # Flexible column mapping for common variations
                field_variations = {
                    'email': ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'email_address'],
                    'first_name': ['first_name', 'First Name', 'FirstName', 'first'],
                    'last_name': ['last_name', 'Last Name', 'LastName', 'last'],
                    'phone': ['phone', 'Phone', 'PHONE', 'mobile', 'Mobile', 'phone_number'],
                    'company': ['company', 'Company', 'COMPANY', 'organization', 'org'],
                    'position': ['position', 'Position', 'title', 'Title', 'job_title'],
                    'notes': ['notes', 'Notes', 'NOTE', 'note'],
                }
                
                for target, variations in field_variations.items():
                    if not contact.get(target):
                        for key in variations:
                            if key in row and row[key]:
                                contact[target] = row[key].strip()
                                break
                
                # If we have full name but not first/last, split it
                if not contact.get('first_name') and not contact.get('last_name'):
                    for key in ['name', 'Name', 'NAME', 'full_name', 'Full Name']:
                        if key in row and row[key]:
                            parts = row[key].strip().split(' ', 1)
                            contact['first_name'] = parts[0]
                            contact['last_name'] = parts[1] if len(parts) > 1 else ''
                            break
                
                # Convert tags from comma-separated string to list
                if isinstance(contact.get('tags'), str):
                    contact['tags'] = [t.strip() for t in contact['tags'].split(',') if t.strip()]
                
                if contact.get('email') or (contact.get('first_name') and contact.get('last_name')):
                    contacts_to_import.append(contact)
                else:
                    skipped_no_data += 1
        
        # Import contacts
        imported = 0
        duplicates = 0
        errors = 0
        error_details = []
        now = datetime.now(timezone.utc).isoformat()
        
        for contact in contacts_to_import:
            try:
                email = contact.get('email', '').lower() if contact.get('email') else ''
                
                # Check for duplicate by email if email exists
                if email:
                    existing = await db.contacts.find_one({"email": email})
                    if existing:
                        duplicates += 1
                        continue
                
                # Create contact document with all imported fields
                contact_doc = {
                    "id": contact.get('id') or str(uuid.uuid4()),
                    "first_name": contact.get('first_name', ''),
                    "last_name": contact.get('last_name', ''),
                    "name": contact.get('name'),
                    "display_name": contact.get('display_name'),
                    "nickname": contact.get('nickname'),
                    "email": email,
                    "email_2": contact.get('email_2'),
                    "email_3": contact.get('email_3'),
                    "phone": contact.get('phone'),
                    "mobile_phone": contact.get('mobile_phone'),
                    "home_phone": contact.get('home_phone'),
                    "business_phone": contact.get('business_phone'),
                    "pager": contact.get('pager'),
                    "home_fax": contact.get('home_fax'),
                    "business_fax": contact.get('business_fax'),
                    "company": contact.get('company'),
                    "organization": contact.get('organization'),
                    "position": contact.get('position'),
                    "job_title": contact.get('job_title'),
                    "department": contact.get('department'),
                    "home_street": contact.get('home_street'),
                    "home_address_2": contact.get('home_address_2'),
                    "home_city": contact.get('home_city'),
                    "home_state": contact.get('home_state'),
                    "home_postal_code": contact.get('home_postal_code'),
                    "home_country": contact.get('home_country'),
                    "business_address": contact.get('business_address'),
                    "business_address_2": contact.get('business_address_2'),
                    "business_city": contact.get('business_city'),
                    "business_state": contact.get('business_state'),
                    "business_postal_code": contact.get('business_postal_code'),
                    "business_country": contact.get('business_country'),
                    "birthday": contact.get('birthday'),
                    "anniversary": contact.get('anniversary'),
                    "home_purchase_anniversary": contact.get('home_purchase_anniversary'),
                    "web_page": contact.get('web_page'),
                    "web_page_2": contact.get('web_page_2'),
                    "related_name": contact.get('related_name'),
                    "categories": contact.get('categories'),
                    "notes": contact.get('notes'),
                    "status": contact.get('status') or "active",
                    "category": category or contact.get('category') or 'buyer',
                    "contact_type": contact.get('contact_type'),
                    "source": contact.get('source') or "csv_import",
                    "lead_score": int(contact.get('lead_score', 0)) if contact.get('lead_score') else 0,
                    "budget": contact.get('budget'),
                    "property_interest": contact.get('property_interest'),
                    "tags": contact.get('tags') if isinstance(contact.get('tags'), list) else [],
                    "created_at": contact.get('created_at') or now,
                    "updated_at": now
                }
                
                # Remove None values to keep document clean
                contact_doc = {k: v for k, v in contact_doc.items() if v is not None and v != ''}
                
                await db.contacts.insert_one(contact_doc)
                imported += 1
                
            except Exception as e:
                errors += 1
                error_details.append(str(e))
        
        return {
            "total": len(contacts_to_import),
            "imported": imported,
            "duplicates": duplicates,
            "errors": errors,
            "error_details": error_details[:10]
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

@router.post("/import-vcard")
async def import_contacts_vcard(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import contacts from vCard (.vcf) file - supports iPhone, Android, Outlook exports"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not file.filename.lower().endswith(('.vcf', '.vcard')):
        raise HTTPException(status_code=400, detail="File must be a .vcf or .vcard file")
    
    try:
        content = await file.read()
        content_str = content.decode('utf-8', errors='ignore')
        
        # Parse vCard content
        vcard_contacts = parse_vcard(content_str)
        
        if not vcard_contacts:
            return {"imported": 0, "skipped": 0, "errors": ["No contacts found in file"]}
        
        imported = 0
        skipped = 0
        errors = []
        now = datetime.now(timezone.utc).isoformat()
        
        for vc in vcard_contacts:
            try:
                # Build name from vCard data
                first_name = vc.get('first_name', '')
                last_name = vc.get('last_name', '')
                full_name = vc.get('full_name', '')
                
                # If no first/last but have full name, split it
                if not first_name and not last_name and full_name:
                    parts = full_name.strip().split(' ', 1)
                    first_name = parts[0]
                    last_name = parts[1] if len(parts) > 1 else ''
                
                # Skip if no name
                name = f"{first_name} {last_name}".strip()
                if not name:
                    skipped += 1
                    continue
                
                email = vc.get('email', '')
                
                # Check for duplicate by email
                if email:
                    existing = await db.contacts.find_one({"email": email.lower()})
                    if existing:
                        skipped += 1
                        continue
                
                # Create contact document
                contact_doc = {
                    "id": str(uuid.uuid4()),
                    "first_name": first_name,
                    "last_name": last_name,
                    "name": name,
                    "email": email.lower() if email else None,
                    "phone": vc.get('phone'),
                    "company": vc.get('company'),
                    "position": vc.get('position'),
                    "notes": vc.get('notes'),
                    "tags": vc.get('tags', []),
                    "category": None,
                    "status": "new",
                    "lead_score": 0,
                    "created_at": now,
                    "updated_at": now,
                    "created_by": str(current_user.get("id", current_user.get("_id", "")))
                }
                
                await db.contacts.insert_one(contact_doc)
                imported += 1
                
            except Exception as e:
                errors.append(str(e))
        
        return {
            "imported": imported,
            "skipped": skipped,
            "errors": errors[:5]
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse vCard: {str(e)}")


# ============ IPHONE SYNC ============

class SyncContact(BaseModel):
    temp_id: str
    first_name: str = ""
    last_name: str = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None

class SyncImportRequest(BaseModel):
    contacts: List[SyncContact]
    category: Optional[str] = None

@router.post("/sync/preview")
async def sync_preview(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Parse iPhone vCard and return contacts with duplicate status"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not file.filename.lower().endswith(('.vcf', '.vcard')):
        raise HTTPException(status_code=400, detail="File must be a .vcf or .vcard file")
    
    try:
        content = await file.read()
        content_str = content.decode('utf-8', errors='ignore')
        
        # Parse vCard content
        vcard_contacts = parse_vcard(content_str)
        
        if not vcard_contacts:
            return {"contacts": [], "total": 0, "new_count": 0, "duplicate_count": 0}
        
        result_contacts = []
        new_count = 0
        duplicate_count = 0
        
        for idx, vc in enumerate(vcard_contacts):
            first_name = vc.get('first_name', '')
            last_name = vc.get('last_name', '')
            full_name = vc.get('full_name', '')
            
            # If no first/last but have full name, split it
            if not first_name and not last_name and full_name:
                parts = full_name.strip().split(' ', 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ''
            
            name = f"{first_name} {last_name}".strip()
            if not name:
                continue
            
            email = vc.get('email', '').lower() if vc.get('email') else None
            phone = vc.get('phone')
            
            # Check for duplicate by email or phone
            is_duplicate = False
            match_reason = None
            
            if email:
                existing = await db.contacts.find_one({"email": email})
                if existing:
                    is_duplicate = True
                    match_reason = f"Email match: {email}"
            
            if not is_duplicate and phone:
                # Normalize phone for comparison
                phone_digits = re.sub(r'\D', '', phone)
                if len(phone_digits) >= 10:
                    existing = await db.contacts.find_one({
                        "$or": [
                            {"phone": {"$regex": phone_digits[-10:]}},
                            {"mobile_phone": {"$regex": phone_digits[-10:]}},
                            {"home_phone": {"$regex": phone_digits[-10:]}}
                        ]
                    })
                    if existing:
                        is_duplicate = True
                        match_reason = f"Phone match: {phone}"
            
            if is_duplicate:
                duplicate_count += 1
            else:
                new_count += 1
            
            result_contacts.append({
                "temp_id": f"sync_{idx}_{uuid.uuid4().hex[:8]}",
                "first_name": first_name,
                "last_name": last_name,
                "name": name,
                "email": email,
                "phone": phone,
                "company": vc.get('company'),
                "notes": vc.get('notes'),
                "is_duplicate": is_duplicate,
                "match_reason": match_reason
            })
        
        return {
            "contacts": result_contacts,
            "total": len(result_contacts),
            "new_count": new_count,
            "duplicate_count": duplicate_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse vCard: {str(e)}")


@router.post("/sync/import")
async def sync_import(
    request: SyncImportRequest,
    current_user: dict = Depends(get_current_user)
):
    """Import selected contacts from sync preview"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not request.contacts:
        raise HTTPException(status_code=400, detail="No contacts to import")
    
    imported = 0
    errors = []
    now = datetime.now(timezone.utc).isoformat()
    
    for contact in request.contacts:
        try:
            contact_doc = {
                "id": str(uuid.uuid4()),
                "first_name": contact.first_name,
                "last_name": contact.last_name,
                "name": f"{contact.first_name} {contact.last_name}".strip(),
                "email": contact.email.lower() if contact.email else None,
                "phone": contact.phone,
                "company": contact.company,
                "notes": contact.notes,
                "tags": [],
                "category": request.category,
                "status": "new",
                "lead_score": 0,
                "source": "iphone_sync",
                "created_at": now,
                "updated_at": now
            }
            
            # Remove None values
            contact_doc = {k: v for k, v in contact_doc.items() if v is not None}
            
            await db.contacts.insert_one(contact_doc)
            imported += 1
            
        except Exception as e:
            errors.append(f"{contact.first_name} {contact.last_name}: {str(e)}")
    
    return {
        "imported": imported,
        "errors": errors[:5],
        "total_errors": len(errors)
    }


@router.get("/export/csv")
async def export_contacts_csv(
    category: Optional[str] = Query(None, description="Filter by category: buyer, seller"),
    status: Optional[str] = Query(None, description="Filter by status: active, lead, inactive"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    current_user: dict = Depends(get_current_user)
):
    """Export contacts to CSV file with optional filters"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build query
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if tags:
        tag_list = [t.strip() for t in tags.split(',')]
        query["tags"] = {"$in": tag_list}
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(100000)
    
    # Create CSV
    output = io.StringIO()
    fieldnames = ['first_name', 'last_name', 'email', 'phone', 'company', 'position', 'category', 'status', 'tags', 'notes', 'lead_score', 'created_at']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    
    for contact in contacts:
        writer.writerow({
            'first_name': contact.get('first_name', ''),
            'last_name': contact.get('last_name', ''),
            'email': contact.get('email', ''),
            'phone': contact.get('phone', ''),
            'company': contact.get('company', ''),
            'position': contact.get('position', ''),
            'category': contact.get('category', ''),
            'status': contact.get('status', ''),
            'tags': ','.join(contact.get('tags', [])),
            'notes': contact.get('notes', ''),
            'lead_score': contact.get('lead_score', 0),
            'created_at': contact.get('created_at', '')
        })
    
    output.seek(0)
    
    # Generate filename with filters
    filter_parts = []
    if category:
        filter_parts.append(category)
    if status:
        filter_parts.append(status)
    filter_str = '_'.join(filter_parts) if filter_parts else 'all'
    filename = f"contacts_{filter_str}_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/vcard")
async def export_contacts_vcard(
    category: Optional[str] = Query(None, description="Filter by category: buyer, seller"),
    status: Optional[str] = Query(None, description="Filter by status: active, lead, inactive"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    current_user: dict = Depends(get_current_user)
):
    """Export contacts to vCard (.vcf) file with optional filters - Apple compatible"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build query
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if tags:
        tag_list = [t.strip() for t in tags.split(',')]
        query["tags"] = {"$in": tag_list}
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(100000)
    
    # Generate vCards
    vcards = []
    for contact in contacts:
        vcards.append(generate_vcard(contact))
    
    output = '\r\n'.join(vcards)
    
    # Generate filename with filters
    filter_parts = []
    if category:
        filter_parts.append(category)
    if status:
        filter_parts.append(status)
    filter_str = '_'.join(filter_parts) if filter_parts else 'all'
    filename = f"contacts_{filter_str}_{datetime.now().strftime('%Y%m%d')}.vcf"
    
    return StreamingResponse(
        iter([output]),
        media_type="text/vcard",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
