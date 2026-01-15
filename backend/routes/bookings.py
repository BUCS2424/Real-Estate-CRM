from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import random
from database import db
from models.booking import (
    BookingSettingsCreate, BookingSettingsResponse, BookingCreate, BookingResponse,
    BookingStatusUpdate, BlockedDateCreate, PhoneVerificationRequest, PhoneVerifyCodeRequest
)
from models.user import UserRole
from utils.auth import get_current_user, require_role

router = APIRouter()

# Store verification codes in memory (in production, use Redis or similar)
verification_codes = {}

# =========== BOOKING ALIASES FOR FRONTEND COMPATIBILITY ===========
@router.get("/booking/settings")
async def get_booking_settings_alias(current_user: dict = Depends(get_current_user)):
    """Alias for /booking-settings for frontend compatibility"""
    settings = await db.booking_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Booking settings not found")
    return settings

@router.put("/booking/settings")
async def update_booking_settings_alias(settings: BookingSettingsCreate, current_user: dict = Depends(get_current_user)):
    """Alias for PUT /booking-settings for frontend compatibility"""
    now = datetime.now(timezone.utc).isoformat()
    update_data = {**settings.model_dump(), "updated_at": now}
    
    result = await db.booking_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking settings not found")
    
    updated = await db.booking_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return updated

@router.get("/booking/list")
async def get_booking_list(current_user: dict = Depends(get_current_user)):
    """Alias for /bookings for frontend compatibility"""
    bookings = await db.bookings.find({"agent_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    return bookings

@router.post("/booking/create")
async def create_booking_alias(booking: BookingCreate, current_user: dict = Depends(get_current_user)):
    """Alias for creating booking for frontend compatibility"""
    booking_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    booking_doc = {
        "id": booking_id,
        "agent_id": current_user["id"],
        **booking.model_dump(),
        "status": "pending",
        "created_at": now
    }
    await db.bookings.insert_one(booking_doc)
    booking_doc.pop("_id", None)
    return booking_doc

@router.patch("/booking/{booking_id}/status")
async def update_booking_status_alias(booking_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Alias for updating booking status for frontend compatibility"""
    status = data.get("status")
    result = await db.bookings.update_one(
        {"id": booking_id, "agent_id": current_user["id"]},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return updated

@router.delete("/booking/{booking_id}")
async def delete_booking_alias(booking_id: str, current_user: dict = Depends(get_current_user)):
    """Alias for deleting booking for frontend compatibility"""
    result = await db.bookings.delete_one({"id": booking_id, "agent_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking deleted"}

@router.get("/booking/blocked-dates")
async def get_blocked_dates_alias(current_user: dict = Depends(get_current_user)):
    """Alias for getting blocked dates for frontend compatibility"""
    dates = await db.blocked_dates.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return dates

@router.post("/booking/blocked-dates")
async def add_blocked_date_alias(blocked: BlockedDateCreate, current_user: dict = Depends(get_current_user)):
    """Alias for adding blocked date for frontend compatibility"""
    blocked_id = str(uuid.uuid4())
    blocked_doc = {
        "id": blocked_id,
        "user_id": current_user["id"],
        **blocked.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blocked_dates.insert_one(blocked_doc)
    return {"id": blocked_id, "message": "Date blocked"}

@router.delete("/booking/blocked-dates/{blocked_id}")
async def remove_blocked_date_alias(blocked_id: str, current_user: dict = Depends(get_current_user)):
    """Alias for removing blocked date for frontend compatibility"""
    result = await db.blocked_dates.delete_one({"id": blocked_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blocked date not found")
    return {"message": "Blocked date removed"}

# =========== END BOOKING ALIASES ===========

@router.post("/booking-settings", response_model=BookingSettingsResponse)
async def create_booking_settings(settings: BookingSettingsCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.booking_settings.find_one({"user_id": current_user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Booking settings already exist")
    
    settings_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    settings_doc = {
        "id": settings_id,
        "user_id": current_user["id"],
        **settings.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    await db.booking_settings.insert_one(settings_doc)
    settings_doc.pop("_id", None)
    return BookingSettingsResponse(**settings_doc)

@router.get("/booking-settings", response_model=BookingSettingsResponse)
async def get_booking_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.booking_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Booking settings not found")
    return BookingSettingsResponse(**settings)

@router.put("/booking-settings", response_model=BookingSettingsResponse)
async def update_booking_settings(settings: BookingSettingsCreate, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    update_data = {**settings.model_dump(), "updated_at": now}
    
    result = await db.booking_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking settings not found")
    
    updated = await db.booking_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return BookingSettingsResponse(**updated)

@router.get("/bookings", response_model=List[BookingResponse])
async def get_bookings(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"agent_id": current_user["id"]}
    if status:
        query["status"] = status
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        query.setdefault("date", {})["$lte"] = date_to
    
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(1000)
    return [BookingResponse(**b) for b in bookings]

@router.patch("/bookings/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(
    booking_id: str,
    status_update: BookingStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    result = await db.bookings.update_one(
        {"id": booking_id, "agent_id": current_user["id"]},
        {"$set": {"status": status_update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return BookingResponse(**updated)

@router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.bookings.delete_one({"id": booking_id, "agent_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking deleted"}

@router.post("/blocked-dates")
async def add_blocked_date(blocked: BlockedDateCreate, current_user: dict = Depends(get_current_user)):
    blocked_id = str(uuid.uuid4())
    blocked_doc = {
        "id": blocked_id,
        "user_id": current_user["id"],
        **blocked.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blocked_dates.insert_one(blocked_doc)
    return {"id": blocked_id, "message": "Date blocked"}

@router.get("/blocked-dates")
async def get_blocked_dates(current_user: dict = Depends(get_current_user)):
    dates = await db.blocked_dates.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return dates

@router.delete("/blocked-dates/{blocked_id}")
async def remove_blocked_date(blocked_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.blocked_dates.delete_one({"id": blocked_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blocked date not found")
    return {"message": "Blocked date removed"}

# Phone verification endpoints
@router.post("/verify/phone/send")
async def send_phone_verification(request: PhoneVerificationRequest):
    code = str(random.randint(100000, 999999))
    verification_codes[request.phone] = {
        "code": code,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    print(f"[MOCK SMS] Verification code for {request.phone}: {code}")
    return {"message": "Verification code sent", "mock_code": code}

@router.post("/verify/phone/confirm")
async def confirm_phone_verification(request: PhoneVerifyCodeRequest):
    stored = verification_codes.get(request.phone)
    if not stored:
        raise HTTPException(status_code=400, detail="No verification code found")
    if datetime.now(timezone.utc) > stored["expires"]:
        raise HTTPException(status_code=400, detail="Verification code expired")
    if stored["code"] != request.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    del verification_codes[request.phone]
    return {"verified": True, "message": "Phone number verified"}

# Email verification endpoints
@router.post("/verify/email/send")
async def send_email_verification(email: str = Query(...)):
    code = str(random.randint(100000, 999999))
    verification_codes[email] = {
        "code": code,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    print(f"[MOCK EMAIL] Verification code for {email}: {code}")
    return {"message": "Verification code sent", "mock_code": code}

@router.post("/verify/email/confirm")
async def confirm_email_verification(email: str = Query(...), code: str = Query(...)):
    stored = verification_codes.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="No verification code found")
    if datetime.now(timezone.utc) > stored["expires"]:
        raise HTTPException(status_code=400, detail="Verification code expired")
    if stored["code"] != code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    del verification_codes[email]
    return {"verified": True, "message": "Email verified"}

# Public booking endpoints
@router.get("/public/booking/{agent_code}/settings")
async def get_public_booking_settings(agent_code: str):
    settings = await db.booking_settings.find_one({"agent_code": agent_code}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {
        "agent_name": settings["agent_name"],
        "agent_title": settings.get("agent_title", "Real Estate Agent"),
        "default_duration": settings["default_duration"],
        "booking_window_days": settings["booking_window_days"],
        "availability": settings.get("availability", [])
    }

@router.get("/public/booking/{agent_code}/slots")
async def get_available_slots(agent_code: str, date: str):
    settings = await db.booking_settings.find_one({"agent_code": agent_code})
    if not settings:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    blocked = await db.blocked_dates.find_one({
        "user_id": settings["user_id"],
        "date": date
    })
    if blocked:
        return {"slots": [], "blocked": True, "reason": blocked.get("reason")}
    
    existing_bookings = await db.bookings.find({
        "agent_id": settings["user_id"],
        "date": date,
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(100)
    
    booked_times = [b["time"] for b in existing_bookings]
    
    # Generate slots
    from datetime import datetime as dt
    try:
        date_obj = dt.strptime(date, "%Y-%m-%d")
        day_of_week = date_obj.weekday()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    availability = settings.get("availability", [])
    day_availability = next((a for a in availability if a.get("day_of_week") == day_of_week and a.get("is_available")), None)
    
    if not day_availability:
        return {"slots": [], "message": "Not available on this day"}
    
    slots = []
    start = dt.strptime(day_availability["start_time"], "%H:%M")
    end = dt.strptime(day_availability["end_time"], "%H:%M")
    duration = settings.get("default_duration", 30)
    buffer = settings.get("buffer_time", 15)
    
    current = start
    while current < end:
        time_str = current.strftime("%H:%M")
        if time_str not in booked_times:
            slots.append({
                "time": time_str,
                "duration": duration,
                "available": True
            })
        current = current + timedelta(minutes=duration + buffer)
    
    return {"slots": slots, "date": date}

@router.post("/public/booking/{agent_code}")
async def create_public_booking(agent_code: str, booking: BookingCreate):
    settings = await db.booking_settings.find_one({"agent_code": agent_code})
    if not settings:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Check if slot is still available
    existing = await db.bookings.find_one({
        "agent_id": settings["user_id"],
        "date": booking.date,
        "time": booking.time,
        "status": {"$ne": "cancelled"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="This time slot is no longer available")
    
    booking_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    booking_doc = {
        "id": booking_id,
        "agent_id": settings["user_id"],
        **booking.model_dump(),
        "status": "pending",
        "created_at": now
    }
    await db.bookings.insert_one(booking_doc)
    
    # Create notification for agent
    notification_doc = {
        "id": str(uuid.uuid4()),
        "user_id": settings["user_id"],
        "type": "new_booking",
        "title": "New Booking Request",
        "message": f"New booking from {booking.client_name} for {booking.date} at {booking.time}",
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification_doc)
    
    booking_doc.pop("_id", None)
    return BookingResponse(**booking_doc)
