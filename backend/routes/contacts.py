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
    
    # Search filter
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"display_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"organization": {"$regex": search, "$options": "i"}},
            {"mobile_phone": {"$regex": search, "$options": "i"}},
        ]
    
    # Letter filter (for alphabetical navigation)
    if letter and letter.upper() in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        query["$or"] = [
            {"first_name": {"$regex": f"^{letter}", "$options": "i"}},
            {"last_name": {"$regex": f"^{letter}", "$options": "i"}},
        ]
    
    # Category filter
    if category:
        query["category"] = category
    
    contacts = await db.contacts.find(query, {"_id": 0}).sort([
        ("first_name", 1), ("last_name", 1)
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
        
        if is_vcard:
            # Parse vCard format
            contacts_to_import = parse_vcard(text)
        else:
            # Parse CSV format
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                contact = {}
                # Flexible column mapping for email
                for key in ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'email_address']:
                    if key in row and row[key]:
                        contact['email'] = row[key].strip().lower()
                        break
                
                # Name fields
                for key in ['first_name', 'First Name', 'FirstName', 'first']:
                    if key in row and row[key]:
                        contact['first_name'] = row[key].strip()
                        break
                
                for key in ['last_name', 'Last Name', 'LastName', 'last']:
                    if key in row and row[key]:
                        contact['last_name'] = row[key].strip()
                        break
                
                # If we have full_name but not first/last, try to split it
                if not contact.get('first_name') and not contact.get('last_name'):
                    for key in ['name', 'Name', 'NAME', 'full_name', 'Full Name']:
                        if key in row and row[key]:
                            parts = row[key].strip().split(' ', 1)
                            contact['first_name'] = parts[0]
                            contact['last_name'] = parts[1] if len(parts) > 1 else ''
                            break
                
                # Phone
                for key in ['phone', 'Phone', 'PHONE', 'mobile', 'Mobile', 'phone_number']:
                    if key in row and row[key]:
                        contact['phone'] = row[key].strip()
                        break
                
                # Company
                for key in ['company', 'Company', 'COMPANY', 'organization', 'org']:
                    if key in row and row[key]:
                        contact['company'] = row[key].strip()
                        break
                
                # Position/Title
                for key in ['position', 'Position', 'title', 'Title', 'job_title']:
                    if key in row and row[key]:
                        contact['position'] = row[key].strip()
                        break
                
                # Notes
                for key in ['notes', 'Notes', 'NOTE', 'note']:
                    if key in row and row[key]:
                        contact['notes'] = row[key].strip()
                        break
                
                if contact.get('email') or (contact.get('first_name') and contact.get('last_name')):
                    contacts_to_import.append(contact)
        
        # Import contacts
        imported = 0
        duplicates = 0
        errors = 0
        error_details = []
        now = datetime.now(timezone.utc).isoformat()
        
        for contact in contacts_to_import:
            try:
                email = contact.get('email', '').lower()
                
                # Check for duplicate by email if email exists
                if email:
                    existing = await db.contacts.find_one({"email": email})
                    if existing:
                        duplicates += 1
                        continue
                
                # Create contact document
                contact_doc = {
                    "id": str(uuid.uuid4()),
                    "first_name": contact.get('first_name', ''),
                    "last_name": contact.get('last_name', ''),
                    "email": email,
                    "phone": contact.get('phone'),
                    "company": contact.get('company'),
                    "position": contact.get('position'),
                    "source": "import",
                    "notes": contact.get('notes'),
                    "tags": contact.get('tags', []),
                    "category": category or contact.get('category', 'buyer'),
                    "status": "active",
                    "lead_score": 0,
                    "created_at": now
                }
                
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
