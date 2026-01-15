from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import csv
import io
from database import db
from models.mailing_list import MailingListCreate, MailingListResponse, MailingListSubscriber, ImportResult
from models.user import UserRole
from utils.auth import get_current_user

router = APIRouter()

# ============ MAILING LISTS CRUD ============

@router.get("/mailing-lists")
async def get_mailing_lists(current_user: dict = Depends(get_current_user)):
    """Get all mailing lists"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    lists = await db.mailing_lists.find({}, {"_id": 0}).to_list(100)
    
    # Get subscriber counts for each list
    for ml in lists:
        count = await db.mailing_list_subscribers.count_documents({"list_id": ml["id"]})
        ml["subscriber_count"] = count
    
    return lists

@router.post("/mailing-lists")
async def create_mailing_list(data: MailingListCreate, current_user: dict = Depends(get_current_user)):
    """Create a new mailing list"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    list_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    list_doc = {
        "id": list_id,
        **data.model_dump(),
        "subscriber_count": 0,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.mailing_lists.insert_one(list_doc)
    list_doc.pop("_id", None)
    return list_doc

@router.get("/mailing-lists/{list_id}")
async def get_mailing_list(list_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single mailing list with subscribers"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    ml = await db.mailing_lists.find_one({"id": list_id}, {"_id": 0})
    if not ml:
        raise HTTPException(status_code=404, detail="Mailing list not found")
    
    # Get subscribers
    subscribers = await db.mailing_list_subscribers.find(
        {"list_id": list_id}, {"_id": 0}
    ).to_list(10000)
    
    ml["subscribers"] = subscribers
    ml["subscriber_count"] = len(subscribers)
    
    return ml

@router.put("/mailing-lists/{list_id}")
async def update_mailing_list(list_id: str, data: MailingListCreate, current_user: dict = Depends(get_current_user)):
    """Update a mailing list"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.mailing_lists.update_one({"id": list_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mailing list not found")
    
    updated = await db.mailing_lists.find_one({"id": list_id}, {"_id": 0})
    return updated

@router.delete("/mailing-lists/{list_id}")
async def delete_mailing_list(list_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a mailing list and its subscribers"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Delete list
    result = await db.mailing_lists.delete_one({"id": list_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mailing list not found")
    
    # Delete subscribers
    await db.mailing_list_subscribers.delete_many({"list_id": list_id})
    
    return {"message": "Mailing list deleted"}

# ============ SUBSCRIBERS MANAGEMENT ============

@router.post("/mailing-lists/{list_id}/subscribers")
async def add_subscriber(list_id: str, subscriber: MailingListSubscriber, current_user: dict = Depends(get_current_user)):
    """Add a single subscriber to a mailing list"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check list exists
    ml = await db.mailing_lists.find_one({"id": list_id})
    if not ml:
        raise HTTPException(status_code=404, detail="Mailing list not found")
    
    # Check for duplicate
    existing = await db.mailing_list_subscribers.find_one({
        "list_id": list_id,
        "email": subscriber.email.lower()
    })
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists in this list")
    
    subscriber_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    sub_doc = {
        "id": subscriber_id,
        "list_id": list_id,
        "email": subscriber.email.lower(),
        "name": subscriber.name,
        "phone": subscriber.phone,
        "tags": subscriber.tags,
        "status": "active",
        "created_at": now
    }
    await db.mailing_list_subscribers.insert_one(sub_doc)
    sub_doc.pop("_id", None)
    return sub_doc

@router.delete("/mailing-lists/{list_id}/subscribers/{subscriber_id}")
async def remove_subscriber(list_id: str, subscriber_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a subscriber from a mailing list"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.mailing_list_subscribers.delete_one({
        "id": subscriber_id,
        "list_id": list_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    
    return {"message": "Subscriber removed"}

@router.patch("/mailing-lists/{list_id}/subscribers/{subscriber_id}")
async def update_subscriber(list_id: str, subscriber_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update a subscriber"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.mailing_list_subscribers.update_one(
        {"id": subscriber_id, "list_id": list_id},
        {"$set": data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    
    updated = await db.mailing_list_subscribers.find_one({"id": subscriber_id}, {"_id": 0})
    return updated

# ============ IMPORT / EXPORT ============

@router.post("/mailing-lists/{list_id}/import")
async def import_subscribers(
    list_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Import subscribers from CSV file"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check list exists
    ml = await db.mailing_lists.find_one({"id": list_id})
    if not ml:
        raise HTTPException(status_code=404, detail="Mailing list not found")
    
    # Read CSV file
    content = await file.read()
    
    try:
        # Try to decode as UTF-8, fallback to latin-1
        try:
            text = content.decode('utf-8')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
        
        # Parse CSV
        reader = csv.DictReader(io.StringIO(text))
        
        total = 0
        imported = 0
        duplicates = 0
        errors = 0
        error_details = []
        
        now = datetime.now(timezone.utc).isoformat()
        
        for row in reader:
            total += 1
            
            # Try to find email column (flexible naming)
            email = None
            for key in ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'email_address', 'Email Address']:
                if key in row and row[key]:
                    email = row[key].strip().lower()
                    break
            
            if not email:
                errors += 1
                error_details.append(f"Row {total}: No email found")
                continue
            
            # Basic email validation
            if '@' not in email or '.' not in email:
                errors += 1
                error_details.append(f"Row {total}: Invalid email '{email}'")
                continue
            
            # Check for duplicate
            existing = await db.mailing_list_subscribers.find_one({
                "list_id": list_id,
                "email": email
            })
            if existing:
                duplicates += 1
                continue
            
            # Get name (flexible naming)
            name = None
            for key in ['name', 'Name', 'NAME', 'full_name', 'Full Name', 'first_name', 'First Name']:
                if key in row and row[key]:
                    name = row[key].strip()
                    break
            
            # If we have first_name and last_name, combine them
            if not name:
                first = row.get('first_name', row.get('First Name', row.get('FirstName', ''))).strip()
                last = row.get('last_name', row.get('Last Name', row.get('LastName', ''))).strip()
                if first or last:
                    name = f"{first} {last}".strip()
            
            # Get phone (flexible naming)
            phone = None
            for key in ['phone', 'Phone', 'PHONE', 'phone_number', 'Phone Number', 'mobile', 'Mobile']:
                if key in row and row[key]:
                    phone = row[key].strip()
                    break
            
            # Create subscriber
            sub_doc = {
                "id": str(uuid.uuid4()),
                "list_id": list_id,
                "email": email,
                "name": name,
                "phone": phone,
                "tags": [],
                "status": "active",
                "created_at": now,
                "imported": True
            }
            await db.mailing_list_subscribers.insert_one(sub_doc)
            imported += 1
        
        return {
            "total": total,
            "imported": imported,
            "duplicates": duplicates,
            "errors": errors,
            "error_details": error_details[:10]  # Limit error details
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

@router.get("/mailing-lists/{list_id}/export")
async def export_subscribers(list_id: str, current_user: dict = Depends(get_current_user)):
    """Export subscribers to CSV file"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check list exists
    ml = await db.mailing_lists.find_one({"id": list_id}, {"_id": 0})
    if not ml:
        raise HTTPException(status_code=404, detail="Mailing list not found")
    
    # Get subscribers
    subscribers = await db.mailing_list_subscribers.find(
        {"list_id": list_id}, {"_id": 0}
    ).to_list(100000)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=['email', 'name', 'phone', 'status', 'created_at'])
    writer.writeheader()
    
    for sub in subscribers:
        writer.writerow({
            'email': sub.get('email', ''),
            'name': sub.get('name', ''),
            'phone': sub.get('phone', ''),
            'status': sub.get('status', 'active'),
            'created_at': sub.get('created_at', '')
        })
    
    output.seek(0)
    
    # Generate filename
    safe_name = ml['name'].replace(' ', '_').lower()
    filename = f"{safe_name}_subscribers_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ============ BULK OPERATIONS ============

@router.post("/mailing-lists/{list_id}/import-from-contacts")
async def import_from_contacts(
    list_id: str,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Import subscribers from existing contacts"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check list exists
    ml = await db.mailing_lists.find_one({"id": list_id})
    if not ml:
        raise HTTPException(status_code=404, detail="Mailing list not found")
    
    # Get contacts
    query = {}
    if category:
        query["category"] = category
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(10000)
    
    imported = 0
    duplicates = 0
    now = datetime.now(timezone.utc).isoformat()
    
    for contact in contacts:
        email = contact.get("email", "").lower()
        if not email:
            continue
        
        # Check for duplicate
        existing = await db.mailing_list_subscribers.find_one({
            "list_id": list_id,
            "email": email
        })
        if existing:
            duplicates += 1
            continue
        
        # Create subscriber
        name = f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
        
        sub_doc = {
            "id": str(uuid.uuid4()),
            "list_id": list_id,
            "email": email,
            "name": name if name else None,
            "phone": contact.get("phone"),
            "tags": [contact.get("category")] if contact.get("category") else [],
            "status": "active",
            "source_contact_id": contact.get("id"),
            "created_at": now
        }
        await db.mailing_list_subscribers.insert_one(sub_doc)
        imported += 1
    
    return {
        "total": len(contacts),
        "imported": imported,
        "duplicates": duplicates
    }

@router.post("/mailing-lists/{list_id}/import-from-leads")
async def import_from_leads(
    list_id: str,
    lead_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Import subscribers from existing leads"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check list exists
    ml = await db.mailing_lists.find_one({"id": list_id})
    if not ml:
        raise HTTPException(status_code=404, detail="Mailing list not found")
    
    # Get leads
    query = {}
    if lead_type:
        query["type"] = lead_type
    
    leads = await db.leads.find(query, {"_id": 0}).to_list(10000)
    
    imported = 0
    duplicates = 0
    now = datetime.now(timezone.utc).isoformat()
    
    for lead in leads:
        email = lead.get("email", "").lower()
        if not email:
            continue
        
        # Check for duplicate
        existing = await db.mailing_list_subscribers.find_one({
            "list_id": list_id,
            "email": email
        })
        if existing:
            duplicates += 1
            continue
        
        sub_doc = {
            "id": str(uuid.uuid4()),
            "list_id": list_id,
            "email": email,
            "name": lead.get("name"),
            "phone": lead.get("phone"),
            "tags": [lead.get("type")] if lead.get("type") else [],
            "status": "active",
            "source_lead_id": lead.get("id"),
            "created_at": now
        }
        await db.mailing_list_subscribers.insert_one(sub_doc)
        imported += 1
    
    return {
        "total": len(leads),
        "imported": imported,
        "duplicates": duplicates
    }

@router.delete("/mailing-lists/{list_id}/subscribers")
async def clear_all_subscribers(list_id: str, current_user: dict = Depends(get_current_user)):
    """Remove all subscribers from a mailing list"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.mailing_list_subscribers.delete_many({"list_id": list_id})
    
    return {"message": f"Removed {result.deleted_count} subscribers"}
