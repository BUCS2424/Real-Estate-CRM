"""
Telnyx SMS, Voice, and Verification routes.
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import os
import re
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel

from database import db
from utils.auth import get_current_user
from models.user import UserRole
from utils.encryption import encrypt_value, decrypt_value

router = APIRouter(prefix="/telnyx", tags=["Telnyx"])

TELNYX_API_BASE = "https://api.telnyx.com/v2"


class TelnyxCredentials(BaseModel):
    api_key: Optional[str] = None
    phone_number: Optional[str] = None
    messaging_profile_id: Optional[str] = None
    voice_connection_id: Optional[str] = None
    sip_username: Optional[str] = None
    sip_password: Optional[str] = None
    outbound_caller_id: Optional[str] = None
    verify_profile_id: Optional[str] = None
    billing_id: Optional[str] = None


class SendMessageRequest(BaseModel):
    to: str
    text: str


class VerifyStartRequest(BaseModel):
    phone_number: str


class VerifyCheckRequest(BaseModel):
    phone_number: str
    code: str


class CallLogRequest(BaseModel):
    phone_number: str
    direction: str
    status: str
    duration: Optional[int] = None
    recording_url: Optional[str] = None


class CallNotesRequest(BaseModel):
    notes: Optional[str] = None


class SoundSettings(BaseModel):
    ringtone: Optional[str] = None
    ringback: Optional[str] = None
    end_call: Optional[str] = None


def normalize_phone(value: str) -> str:
    if not value:
        return ""
    value = value.strip()
    if value.startswith('+'):
        return value
    digits = re.sub(r"\D", "", value)
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith('1'):
        return f"+{digits}"
    return f"+{digits}" if digits else value


def mask_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 6:
        return "****"
    return f"{value[:4]}***{value[-2:]}"


def decrypt_if_needed(value: Optional[str]) -> str:
    if not value:
        return ""
    try:
        return decrypt_value(value)
    except Exception:
        return value


def encrypt_if_needed(value: Optional[str]) -> str:
    if not value:
        return ""
    try:
        return encrypt_value(value)
    except Exception:
        return value


async def get_telnyx_settings() -> Dict[str, Any]:
    settings = await db.telnyx_settings.find_one({}, {"_id": 0})
    return settings or {}


async def get_contact_map() -> Dict[str, str]:
    contacts = await db.contacts.find({}, {"_id": 0}).to_list(5000)
    contact_map = {}
    for contact in contacts:
        name = contact.get("name") or f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
        for key in ["phone", "mobile_phone", "home_phone", "business_phone", "cell_phone"]:
            phone = contact.get(key)
            if phone:
                digits = re.sub(r"\D", "", phone)[-10:]
                if digits:
                    contact_map[digits] = name or phone
    return contact_map


@router.get("/credentials")
async def get_credentials(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    settings = await get_telnyx_settings()
    return {
        "api_key": decrypt_if_needed(settings.get("api_key")),
        "phone_number": settings.get("phone_number", ""),
        "messaging_profile_id": settings.get("messaging_profile_id", ""),
        "voice_connection_id": settings.get("voice_connection_id", ""),
        "sip_username": settings.get("sip_username", ""),
        "sip_password": decrypt_if_needed(settings.get("sip_password")),
        "outbound_caller_id": settings.get("outbound_caller_id", ""),
        "verify_profile_id": settings.get("verify_profile_id", ""),
        "billing_id": settings.get("billing_id", ""),
        "configured": bool(settings.get("api_key"))
    }


@router.post("/credentials")
async def save_credentials(
    creds: TelnyxCredentials,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    data = creds.model_dump()
    now = datetime.now(timezone.utc).isoformat()

    updates = {
        "phone_number": normalize_phone(data.get("phone_number")) if data.get("phone_number") else None,
        "messaging_profile_id": data.get("messaging_profile_id"),
        "voice_connection_id": data.get("voice_connection_id"),
        "sip_username": data.get("sip_username"),
        "outbound_caller_id": normalize_phone(data.get("outbound_caller_id")) if data.get("outbound_caller_id") else None,
        "verify_profile_id": data.get("verify_profile_id"),
        "billing_id": data.get("billing_id"),
        "updated_at": now,
        "updated_by": current_user["id"]
    }

    if data.get("api_key"):
        updates["api_key"] = encrypt_if_needed(data.get("api_key"))
    if data.get("sip_password"):
        updates["sip_password"] = encrypt_if_needed(data.get("sip_password"))

    await db.telnyx_settings.update_one(
        {},
        {"$set": updates, "$setOnInsert": {"created_at": now}},
        upsert=True
    )

    return {"message": "Telnyx credentials saved"}


@router.post("/test")
async def test_credentials(current_user: dict = Depends(get_current_user)):
    settings = await get_telnyx_settings()
    api_key = decrypt_if_needed(settings.get("api_key"))
    if not api_key:
        raise HTTPException(status_code=400, detail="API key not configured")

    messaging_profile_id = settings.get("messaging_profile_id")

    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=20) as client:
        if messaging_profile_id:
            response = await client.get(f"{TELNYX_API_BASE}/messaging_profiles/{messaging_profile_id}", headers=headers)
        else:
            response = await client.get(f"{TELNYX_API_BASE}/phone_numbers", headers=headers)

    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail=response.json().get("errors", [{"detail": "Connection failed"}])[0].get("detail"))

    return {"message": "Telnyx connection verified"}


@router.get("/webrtc/token")
async def get_webrtc_token(current_user: dict = Depends(get_current_user)):
    settings = await get_telnyx_settings()
    if not settings:
        return {"configured": False}

    sip_username = settings.get("sip_username")
    sip_password = decrypt_if_needed(settings.get("sip_password"))
    if not sip_username or not sip_password:
        return {"configured": False}

    return {
        "configured": True,
        "sip_username": sip_username,
        "sip_password": sip_password,
        "phone_number": settings.get("phone_number"),
        "outbound_caller_id": settings.get("outbound_caller_id"),
        "voice_connection_id": settings.get("voice_connection_id"),
        "available_caller_ids": settings.get("available_caller_ids", [])
    }


@router.get("/contacts")
async def get_contacts(current_user: dict = Depends(get_current_user)):
    contacts = await db.contacts.find({}, {"_id": 0}).to_list(5000)
    formatted = []
    for contact in contacts:
        name = contact.get("name") or f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
        phone = contact.get("phone") or contact.get("mobile_phone") or contact.get("home_phone") or contact.get("business_phone") or contact.get("cell_phone")
        if not phone:
            continue
        formatted.append({
            "id": contact.get("id"),
            "name": name or phone,
            "phone_number": normalize_phone(phone),
            "email": contact.get("email")
        })
    return {"contacts": formatted}


@router.get("/messages/conversations")
async def get_message_conversations(current_user: dict = Depends(get_current_user)):
    messages = await db.sms_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    contact_map = await get_contact_map()

    conversations = {}
    for msg in messages:
        remote = msg.get("to_number") if msg.get("direction") == "outbound" else msg.get("from_number")
        if not remote:
            continue
        remote_digits = re.sub(r"\D", "", remote)[-10:]
        if remote not in conversations:
            conversations[remote] = {
                "phone_number": remote,
                "contact_name": contact_map.get(remote_digits, remote),
                "last_message": msg.get("text"),
                "last_timestamp": msg.get("created_at")
            }
    return {"conversations": list(conversations.values())}


@router.get("/messages/{phone_number}")
async def get_messages(phone_number: str, current_user: dict = Depends(get_current_user)):
    normalized = normalize_phone(phone_number)
    messages = await db.sms_messages.find({
        "$or": [
            {"from_number": normalized},
            {"to_number": normalized}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return {"messages": messages, "phone_number": normalized}


@router.post("/messages/send")
async def send_message(request: SendMessageRequest, current_user: dict = Depends(get_current_user)):
    settings = await get_telnyx_settings()
    api_key = decrypt_if_needed(settings.get("api_key"))
    if not api_key:
        raise HTTPException(status_code=400, detail="Telnyx API key not configured")

    from_number = settings.get("outbound_caller_id") or settings.get("phone_number")
    if not from_number:
        raise HTTPException(status_code=400, detail="Telnyx phone number not configured")

    payload = {
        "from": normalize_phone(from_number),
        "to": normalize_phone(request.to),
        "text": request.text
    }
    if settings.get("messaging_profile_id"):
        payload["messaging_profile_id"] = settings.get("messaging_profile_id")

    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f"{TELNYX_API_BASE}/messages", headers=headers, json=payload)

    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail=response.json().get("errors", [{"detail": "Send failed"}])[0].get("detail"))

    now = datetime.now(timezone.utc).isoformat()
    message_doc = {
        "id": str(uuid.uuid4()),
        "direction": "outbound",
        "from_number": payload["from"],
        "to_number": payload["to"],
        "text": request.text,
        "status": "sent",
        "created_at": now
    }
    await db.sms_messages.insert_one(message_doc)

    return {"message": "SMS sent", "data": message_doc}


@router.post("/verify/start")
async def start_verification(request: VerifyStartRequest, current_user: dict = Depends(get_current_user)):
    settings = await get_telnyx_settings()
    api_key = decrypt_if_needed(settings.get("api_key"))
    verify_profile_id = settings.get("verify_profile_id")
    if not api_key or not verify_profile_id:
        raise HTTPException(status_code=400, detail="Verify profile or API key not configured")

    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {
        "phone_number": normalize_phone(request.phone_number),
        "verify_profile_id": verify_profile_id
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f"{TELNYX_API_BASE}/verifications", headers=headers, json=payload)

    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail=response.json().get("errors", [{"detail": "Verification start failed"}])[0].get("detail"))

    data = response.json().get("data", {})
    now = datetime.now(timezone.utc).isoformat()
    await db.phone_verifications.insert_one({
        "id": str(uuid.uuid4()),
        "verification_id": data.get("id"),
        "phone_number": payload["phone_number"],
        "status": "sent",
        "created_at": now
    })

    return {"message": "Verification code sent", "verification_id": data.get("id")}


@router.post("/verify/check")
async def check_verification(request: VerifyCheckRequest, current_user: dict = Depends(get_current_user)):
    settings = await get_telnyx_settings()
    api_key = decrypt_if_needed(settings.get("api_key"))
    verify_profile_id = settings.get("verify_profile_id")
    if not api_key or not verify_profile_id:
        raise HTTPException(status_code=400, detail="Verify profile or API key not configured")

    headers = {"Authorization": f"Bearer {api_key}"}
    payload = {
        "phone_number": normalize_phone(request.phone_number),
        "verify_profile_id": verify_profile_id,
        "code": request.code
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f"{TELNYX_API_BASE}/verifications/actions/verify", headers=headers, json=payload)

    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail=response.json().get("errors", [{"detail": "Verification failed"}])[0].get("detail"))

    now = datetime.now(timezone.utc).isoformat()
    await db.phone_verifications.update_many(
        {"phone_number": payload["phone_number"]},
        {"$set": {"status": "verified", "verified_at": now}}
    )

    return {"message": "Verification success"}


@router.get("/calls")
async def get_calls(current_user: dict = Depends(get_current_user)):
    calls = await db.call_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    contact_map = await get_contact_map()
    for call in calls:
        remote = call.get("phone_number")
        remote_digits = re.sub(r"\D", "", remote)[-10:]
        call["contact_name"] = contact_map.get(remote_digits, remote)
    return {"calls": calls}


@router.post("/calls")
async def log_call(request: CallLogRequest, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    call_doc = {
        "id": str(uuid.uuid4()),
        "phone_number": normalize_phone(request.phone_number),
        "direction": request.direction,
        "status": request.status,
        "duration": request.duration,
        "recording_url": request.recording_url,
        "created_at": now,
        "updated_at": now
    }
    await db.call_logs.insert_one(call_doc)
    return {"message": "Call logged", "call": call_doc}


@router.put("/calls/{call_id}")
async def update_call(call_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    await db.call_logs.update_one(
        {"id": call_id},
        {"$set": {**payload, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Call updated"}


@router.put("/calls/{call_id}/notes")
async def update_call_notes(call_id: str, payload: CallNotesRequest, current_user: dict = Depends(get_current_user)):
    await db.call_logs.update_one(
        {"id": call_id},
        {"$set": {"notes": payload.notes, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Notes updated"}


@router.post("/calls/{call_id}/transcribe")
async def transcribe_call(call_id: str, current_user: dict = Depends(get_current_user)):
    await db.call_logs.update_one(
        {"id": call_id},
        {"$set": {"transcript": "Transcription pending", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Transcription pending"}


@router.post("/calls/upload-recording")
async def upload_recording(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    uploads_dir = "static/call-recordings"
    os.makedirs(os.path.join("/app/backend", uploads_dir), exist_ok=True)
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join("/app/backend", uploads_dir, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    file_url = f"/api/static/call-recordings/{filename}"
    return {"file_url": file_url}


@router.put("/calls/{call_id}/recording")
async def update_recording(call_id: str, payload: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    recording_url = payload.get("recording_url")
    await db.call_logs.update_one(
        {"id": call_id},
        {"$set": {"recording_url": recording_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Recording updated", "recording_url": recording_url}


@router.post("/webhooks/sms")
async def sms_webhook(request: Request):
    payload = await request.json()
    event = payload.get("data", {}).get("event_type")
    if event != "message.received":
        return {"status": "ignored"}

    message = payload.get("data", {}).get("payload", {})
    from_number = message.get("from", {}).get("phone_number")
    to_list = message.get("to", [])
    to_number = to_list[0].get("phone_number") if to_list else None
    text = message.get("text") or message.get("body")

    if not from_number or not text:
        return {"status": "ignored"}

    now = datetime.now(timezone.utc).isoformat()
    await db.sms_messages.insert_one({
        "id": str(uuid.uuid4()),
        "direction": "inbound",
        "from_number": from_number,
        "to_number": to_number,
        "text": text,
        "status": "received",
        "created_at": now
    })

    return {"status": "ok"}


@router.post("/webhooks/voice")
async def voice_webhook(request: Request):
    payload = await request.json()
    event = payload.get("data", {}).get("event_type")
    call = payload.get("data", {}).get("payload", {})
    call_id = call.get("call_control_id")

    if not call_id:
        return {"status": "ignored"}

    await db.call_logs.update_one(
        {"telnyx_call_id": call_id},
        {"$set": {
            "telnyx_call_id": call_id,
            "status": event,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, "$setOnInsert": {
            "id": str(uuid.uuid4()),
            "phone_number": call.get("from") or call.get("to"),
            "direction": "inbound",
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    return {"status": "ok"}


@router.get("/blocked-numbers")
async def get_blocked_numbers(current_user: dict = Depends(get_current_user)):
    blocked = await db.blocked_numbers.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(200)
    return {"blocked_numbers": blocked}


class BlockedNumberRequest(BaseModel):
    phone_number: str
    reason: Optional[str] = None


@router.post("/blocked-numbers")
async def add_blocked_number(request: BlockedNumberRequest, current_user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "phone_number": normalize_phone(request.phone_number),
        "reason": request.reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blocked_numbers.insert_one(doc)
    return {"message": "Blocked", "blocked": doc}


@router.delete("/blocked-numbers/{blocked_id}")
async def delete_blocked_number(blocked_id: str, current_user: dict = Depends(get_current_user)):
    await db.blocked_numbers.delete_one({"id": blocked_id, "user_id": current_user["id"]})
    return {"message": "Unblocked"}


@router.get("/settings/sounds")
async def get_sound_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.dialer_sound_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return settings or {"ringtone": None, "ringback": None, "end_call": None}


@router.post("/settings/sounds")
async def save_sound_settings(request: SoundSettings, current_user: dict = Depends(get_current_user)):
    await db.dialer_sound_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": request.model_dump()},
        upsert=True
    )
    return {"message": "Sound settings saved"}


@router.get("/admin/call-queue/settings")
async def get_call_queue_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.call_queue_settings.find_one({}, {"_id": 0})
    return settings or {"hold_music_url": None, "max_queue_size": 10}
