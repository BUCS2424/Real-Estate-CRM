from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from database import db
from models.newsletter import NewsletterCreate, NewsletterResponse, NewsletterTemplateCreate, AutoTriggerCreate
from models.user import UserRole
from utils.auth import get_current_user, require_role

router = APIRouter()

@router.post("/newsletters")
async def create_newsletter(newsletter: NewsletterCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    newsletter_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    newsletter_doc = {
        "id": newsletter_id,
        **newsletter.model_dump(),
        "status": "draft",
        "sent_at": None,
        "recipients_count": 0,
        "open_count": 0,
        "click_count": 0,
        "created_by": current_user["id"],
        "created_at": now
    }
    await db.newsletters.insert_one(newsletter_doc)
    newsletter_doc.pop("_id", None)
    return newsletter_doc

@router.get("/newsletters")
async def list_newsletters(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {} if not status else {"status": status}
    newsletters = await db.newsletters.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return newsletters

@router.get("/newsletters/archive")
async def list_sent_newsletters():
    """Public endpoint for newsletter archive"""
    newsletters = await db.newsletters.find(
        {"status": "sent"},
        {"_id": 0, "id": 1, "subject": 1, "content": 1, "sent_at": 1, "recipients_count": 1}
    ).sort("sent_at", -1).to_list(50)
    return newsletters

@router.get("/public/newsletters")
async def get_public_newsletter_archive():
    """Public archive alias"""
    return await list_sent_newsletters()

@router.get("/newsletters/{newsletter_id}")
async def get_newsletter(newsletter_id: str, current_user: dict = Depends(get_current_user)):
    newsletter = await db.newsletters.find_one({"id": newsletter_id}, {"_id": 0})
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    return newsletter

@router.put("/newsletters/{newsletter_id}")
async def update_newsletter(newsletter_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.newsletters.update_one({"id": newsletter_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    
    updated = await db.newsletters.find_one({"id": newsletter_id}, {"_id": 0})
    return updated

@router.post("/newsletters/{newsletter_id}/send")
async def send_newsletter(newsletter_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    newsletter = await db.newsletters.find_one({"id": newsletter_id})
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    
    # Get recipients based on target
    recipients_filter = newsletter.get("recipients", "all")
    query = {}
    if recipients_filter == "buyers":
        query["category"] = "buyer"
    elif recipients_filter == "sellers":
        query["category"] = "seller"
    
    contacts = await db.contacts.find(query, {"email": 1}).to_list(10000)
    leads = await db.leads.find(query, {"email": 1}).to_list(10000)
    
    all_emails = set()
    for c in contacts:
        if c.get("email"):
            all_emails.add(c["email"])
    for l in leads:
        if l.get("email"):
            all_emails.add(l["email"])
    
    recipients_count = len(all_emails)
    
    # Mock sending - in production, integrate with email service
    print(f"[MOCK] Sending newsletter '{newsletter['subject']}' to {recipients_count} recipients")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.newsletters.update_one(
        {"id": newsletter_id},
        {"$set": {
            "status": "sent",
            "sent_at": now,
            "recipients_count": recipients_count
        }}
    )
    
    return {"message": f"Newsletter sent to {recipients_count} recipients", "sent_at": now}

@router.delete("/newsletters/{newsletter_id}")
async def delete_newsletter(newsletter_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.newsletters.delete_one({"id": newsletter_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    return {"message": "Newsletter deleted"}

# Newsletter Templates
@router.post("/newsletter-templates")
async def create_template(template: NewsletterTemplateCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    template_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    template_doc = {
        "id": template_id,
        **template.model_dump(),
        "created_by": current_user["id"],
        "created_at": now
    }
    await db.newsletter_templates.insert_one(template_doc)
    template_doc.pop("_id", None)
    return template_doc

@router.get("/newsletter-templates")
async def list_templates(current_user: dict = Depends(get_current_user)):
    templates = await db.newsletter_templates.find({}, {"_id": 0}).to_list(100)
    return templates

@router.get("/newsletter-templates/{template_id}")
async def get_template(template_id: str, current_user: dict = Depends(get_current_user)):
    template = await db.newsletter_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.delete("/newsletter-templates/{template_id}")
async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.newsletter_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

# Auto Triggers
@router.post("/newsletter-triggers")
async def create_trigger(trigger: AutoTriggerCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    trigger_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    trigger_doc = {
        "id": trigger_id,
        **trigger.model_dump(),
        "created_by": current_user["id"],
        "created_at": now
    }
    await db.newsletter_triggers.insert_one(trigger_doc)
    trigger_doc.pop("_id", None)
    return trigger_doc

@router.get("/newsletter-triggers")
async def list_triggers(current_user: dict = Depends(get_current_user)):
    triggers = await db.newsletter_triggers.find({}, {"_id": 0}).to_list(100)
    return triggers

@router.patch("/newsletter-triggers/{trigger_id}")
async def update_trigger(trigger_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.newsletter_triggers.update_one({"id": trigger_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    updated = await db.newsletter_triggers.find_one({"id": trigger_id}, {"_id": 0})
    return updated

@router.delete("/newsletter-triggers/{trigger_id}")
async def delete_trigger(trigger_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.newsletter_triggers.delete_one({"id": trigger_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trigger not found")
    return {"message": "Trigger deleted"}
