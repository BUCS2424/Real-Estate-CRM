"""
Jacquie Lawson Card Sending Routes
Automate sending animated ecards to contacts
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid
from utils.auth import get_current_user
from models.user import UserRole
from database import db

router = APIRouter(prefix="/jacquie-lawson", tags=["Jacquie Lawson Cards"])


class JLConfig(BaseModel):
    email: str = ""
    password: str = ""
    enabled: bool = False
    auto_send_birthday: bool = True
    auto_send_anniversary: bool = True
    auto_send_home_anniversary: bool = True
    days_before_send: int = 0
    default_birthday_card: str = ""
    default_anniversary_card: str = ""
    default_home_anniversary_card: str = ""
    sender_name: str = ""


class SendCardRequest(BaseModel):
    contact_id: str
    card_url: str
    occasion: str  # birthday, anniversary, home_anniversary, holiday, custom
    message: str = ""
    schedule_date: Optional[str] = None  # ISO date string, None = send now


class TestLoginRequest(BaseModel):
    email: str
    password: str


@router.get("/config")
async def get_jl_config(current_user: dict = Depends(get_current_user)):
    """Get Jacquie Lawson configuration"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.settings.find_one({"type": "jacquie_lawson_config"}, {"_id": 0})
    
    if not config:
        return {
            "email": "",
            "password": "",
            "enabled": False,
            "auto_send_birthday": True,
            "auto_send_anniversary": True,
            "auto_send_home_anniversary": True,
            "days_before_send": 0,
            "default_birthday_card": "",
            "default_anniversary_card": "",
            "default_home_anniversary_card": "",
            "sender_name": "",
            "configured": False
        }
    
    return {
        **{k: v for k, v in config.items() if k != "type"},
        "configured": bool(config.get("email") and config.get("password"))
    }


@router.post("/config")
async def save_jl_config(config: JLConfig, current_user: dict = Depends(get_current_user)):
    """Save Jacquie Lawson configuration"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config_doc = {
        "type": "jacquie_lawson_config",
        **config.dict(),
        "updated_by": current_user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.settings.update_one(
        {"type": "jacquie_lawson_config"},
        {"$set": config_doc},
        upsert=True
    )
    
    return {"message": "Jacquie Lawson configuration saved"}


@router.post("/test")
async def test_jl_login(request: TestLoginRequest, current_user: dict = Depends(get_current_user)):
    """Test Jacquie Lawson login credentials"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Import the service here to avoid circular imports
    from services.jacquie_lawson_service import jl_service
    
    result = await jl_service.test_login(request.email, request.password)
    return result


@router.get("/stats")
async def get_jl_stats(current_user: dict = Depends(get_current_user)):
    """Get card sending statistics"""
    # Total sent
    total_sent = await db.card_history.count_documents({"status": "sent"})
    
    # Sent this month
    first_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    sent_this_month = await db.card_history.count_documents({
        "status": "sent",
        "sent_at": {"$gte": first_of_month.isoformat()}
    })
    
    # Scheduled (pending)
    scheduled = await db.card_queue.count_documents({"status": "pending"})
    
    # Upcoming occasions in next 7 days
    today = datetime.now(timezone.utc).date()
    next_week = today + timedelta(days=7)
    
    # Count contacts with upcoming birthdays, anniversaries, or home anniversaries
    upcoming_count = 0
    
    # Get contacts and check dates manually (MongoDB date queries can be tricky with month/day only)
    contacts = await db.contacts.find({
        "$or": [
            {"birthday": {"$ne": None}},
            {"anniversary": {"$ne": None}},
            {"home_purchase_anniversary": {"$ne": None}}
        ]
    }).to_list(1000)
    
    for contact in contacts:
        for field in ["birthday", "anniversary", "home_purchase_anniversary"]:
            date_val = contact.get(field)
            if date_val:
                try:
                    # Parse the date and check if it falls within next 7 days (ignore year)
                    if isinstance(date_val, str):
                        parsed = datetime.fromisoformat(date_val.replace("Z", "+00:00")).date()
                    else:
                        parsed = date_val
                    
                    # Create this year's occurrence
                    this_year_date = parsed.replace(year=today.year)
                    if this_year_date < today:
                        this_year_date = parsed.replace(year=today.year + 1)
                    
                    if today <= this_year_date <= next_week:
                        upcoming_count += 1
                except:
                    pass
    
    return {
        "total_sent": total_sent,
        "sent_this_month": sent_this_month,
        "scheduled": scheduled,
        "upcoming_7_days": upcoming_count
    }


@router.post("/send")
async def send_card(
    request: SendCardRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Send a card to a contact (immediately or scheduled)"""
    # Get contact
    contact = await db.contacts.find_one({"id": request.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Get email
    recipient_email = contact.get("email") or contact.get("email_2") or contact.get("email_3")
    if not recipient_email:
        raise HTTPException(status_code=400, detail="Contact has no email address")
    
    # Get config
    config = await db.settings.find_one({"type": "jacquie_lawson_config"})
    if not config or not config.get("enabled"):
        raise HTTPException(status_code=400, detail="Jacquie Lawson is not configured or enabled")
    
    # Create queue entry
    queue_entry = {
        "id": str(uuid.uuid4()),
        "contact_id": request.contact_id,
        "contact_name": contact.get("display_name") or contact.get("name") or f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip(),
        "recipient_email": recipient_email,
        "card_url": request.card_url,
        "occasion": request.occasion,
        "message": request.message,
        "sender_name": config.get("sender_name", ""),
        "scheduled_date": request.schedule_date,
        "status": "pending" if request.schedule_date else "processing",
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.card_queue.insert_one(queue_entry)
    
    if not request.schedule_date:
        # Send immediately in background
        from services.jacquie_lawson_service import jl_service
        background_tasks.add_task(
            jl_service.send_card,
            queue_entry["id"],
            config.get("email"),
            config.get("password"),
            recipient_email,
            request.card_url,
            request.message,
            config.get("sender_name", "")
        )
        return {"message": "Card is being sent", "queue_id": queue_entry["id"]}
    else:
        return {"message": "Card scheduled", "queue_id": queue_entry["id"], "scheduled_for": request.schedule_date}


@router.get("/queue")
async def get_card_queue(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get card sending queue"""
    query = {}
    if status:
        query["status"] = status
    
    cards = await db.card_queue.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"cards": cards, "total": len(cards)}


@router.get("/history")
async def get_card_history(
    contact_id: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get card sending history"""
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    
    history = await db.card_history.find(query, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    return {"history": history, "total": len(history)}


@router.delete("/queue/{queue_id}")
async def cancel_scheduled_card(queue_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel a scheduled card"""
    result = await db.card_queue.delete_one({"id": queue_id, "status": "pending"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Scheduled card not found or already sent")
    return {"message": "Scheduled card cancelled"}


@router.get("/upcoming-occasions")
async def get_upcoming_occasions(
    days: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Get contacts with upcoming birthdays, anniversaries, or home anniversaries"""
    today = datetime.now(timezone.utc).date()
    end_date = today + timedelta(days=days)
    
    upcoming = []
    
    contacts = await db.contacts.find({
        "$or": [
            {"birthday": {"$ne": None}},
            {"anniversary": {"$ne": None}},
            {"home_purchase_anniversary": {"$ne": None}}
        ]
    }, {"_id": 0}).to_list(1000)
    
    for contact in contacts:
        contact_name = contact.get("display_name") or contact.get("name") or f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
        
        for field, occasion in [
            ("birthday", "Birthday"),
            ("anniversary", "Anniversary"),
            ("home_purchase_anniversary", "Home Purchase Anniversary")
        ]:
            date_val = contact.get(field)
            if date_val:
                try:
                    if isinstance(date_val, str):
                        parsed = datetime.fromisoformat(date_val.replace("Z", "+00:00")).date()
                    else:
                        parsed = date_val
                    
                    # This year's occurrence
                    this_year_date = parsed.replace(year=today.year)
                    if this_year_date < today:
                        this_year_date = parsed.replace(year=today.year + 1)
                    
                    if today <= this_year_date <= end_date:
                        days_until = (this_year_date - today).days
                        upcoming.append({
                            "contact_id": contact.get("id"),
                            "contact_name": contact_name,
                            "email": contact.get("email") or contact.get("email_2"),
                            "occasion": occasion,
                            "date": this_year_date.isoformat(),
                            "days_until": days_until,
                            "original_year": parsed.year if field != "birthday" else None
                        })
                except:
                    pass
    
    # Sort by date
    upcoming.sort(key=lambda x: x["date"])
    
    return {"upcoming": upcoming, "total": len(upcoming)}
