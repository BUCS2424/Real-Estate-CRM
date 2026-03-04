"""Email and phone verification routes."""
from datetime import datetime, timedelta, timezone
from typing import Optional
import random
import re

import httpx
import aiosmtplib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from database import db
from utils.encryption import decrypt_value

router = APIRouter(tags=["Verification"])

TELNYX_API_BASE = "https://api.telnyx.com/v2"
CODE_EXPIRY_MINUTES = 15


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


class PhoneVerificationRequest(BaseModel):
    phone_number: str


class PhoneVerifyCodeRequest(BaseModel):
    phone_number: str
    code: str


class EmailVerificationRequest(BaseModel):
    email: EmailStr


class EmailVerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str


async def get_telnyx_credentials() -> dict:
    settings = await db.telnyx_settings.find_one({}, {"_id": 0}) or {}
    api_key = decrypt_value(settings.get("api_key")) if settings.get("api_key") else None
    verify_profile_id = settings.get("verify_profile_id")
    return {"api_key": api_key, "verify_profile_id": verify_profile_id}


@router.post("/phone/send-code")
async def send_phone_code(request: PhoneVerificationRequest):
    credentials = await get_telnyx_credentials()
    if not credentials.get("api_key") or not credentials.get("verify_profile_id"):
        raise HTTPException(status_code=400, detail="Telnyx Verify not configured")

    payload = {
        "phone_number": normalize_phone(request.phone_number),
        "verify_profile_id": credentials["verify_profile_id"]
    }

    headers = {"Authorization": f"Bearer {credentials['api_key']}"}
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(f"{TELNYX_API_BASE}/verifications/sms", headers=headers, json=payload)
        if response.status_code == 404:
            response = await client.post(f"{TELNYX_API_BASE}/verifications", headers=headers, json=payload)

    if response.status_code >= 400:
        detail = response.json().get("errors", [{"detail": "Verification start failed"}])[0].get("detail")
        raise HTTPException(status_code=400, detail=detail)

    data = response.json().get("data", {})
    now = datetime.now(timezone.utc).isoformat()
    await db.phone_verifications.insert_one({
        "id": data.get("id") or str(random.randint(100000, 999999)),
        "verification_id": data.get("id"),
        "phone_number": payload["phone_number"],
        "status": "sent",
        "created_at": now
    })

    return {"message": "Verification code sent"}


@router.post("/phone/verify-code")
async def verify_phone_code(request: PhoneVerifyCodeRequest):
    credentials = await get_telnyx_credentials()
    if not credentials.get("api_key") or not credentials.get("verify_profile_id"):
        raise HTTPException(status_code=400, detail="Telnyx Verify not configured")

    normalized_phone = normalize_phone(request.phone_number)
    payload = {
        "phone_number": normalized_phone,
        "verify_profile_id": credentials["verify_profile_id"],
        "code": request.code
    }

    latest = await db.phone_verifications.find_one(
        {"phone_number": normalized_phone},
        sort=[("created_at", -1)],
        projection={"_id": 0}
    )
    verification_id = latest.get("verification_id") if latest else None

    headers = {"Authorization": f"Bearer {credentials['api_key']}"}
    async with httpx.AsyncClient(timeout=20) as client:
        if verification_id:
            response = await client.post(
                f"{TELNYX_API_BASE}/verifications/{verification_id}/actions/verify",
                headers=headers,
                json=payload
            )
        else:
            response = await client.post(
                f"{TELNYX_API_BASE}/verifications/actions/verify",
                headers=headers,
                json=payload
            )

        if response.status_code == 404 and verification_id:
            response = await client.post(
                f"{TELNYX_API_BASE}/verifications/actions/verify",
                headers=headers,
                json=payload
            )
    if response.status_code >= 400:
        detail = response.json().get("errors", [{"detail": "Verification failed"}])[0].get("detail")
        raise HTTPException(status_code=400, detail=detail)

    now = datetime.now(timezone.utc).isoformat()
    await db.phone_verifications.update_many(
        {"phone_number": payload["phone_number"]},
        {"$set": {"status": "verified", "verified_at": now, "telnyx_status": response.json().get("data", {}).get("status")}}
    )

    return {"message": "Phone verified", "status": response.json().get("data", {}).get("status")}


@router.get("/phone/check/{phone_number}")
async def check_phone_verified(phone_number: str):
    normalized = normalize_phone(phone_number)
    record = await db.phone_verifications.find_one(
        {"phone_number": normalized, "status": "verified"},
        sort=[("verified_at", -1)],
        projection={"_id": 0}
    )
    return {"verified": bool(record)}


def _generate_code() -> str:
    return f"{random.randint(100000, 999999)}"


async def _send_email_verification(email: str, code: str):
    settings = await db.smtp_settings.find_one({}, {"_id": 0})
    if not settings or not settings.get("host"):
        raise HTTPException(status_code=400, detail="SMTP not configured")

    subject = "Your verification code"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; color: #0a1628;">
      <p>Your verification code is:</p>
      <p style="font-size: 22px; font-weight: bold; letter-spacing: 4px;">{code}</p>
      <p>This code expires in {CODE_EXPIRY_MINUTES} minutes.</p>
    </div>
    """

    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.get('from_name', 'Hidden Haven Realty')} <{settings.get('from_email', settings.get('username'))}>"
    msg["To"] = email
    msg.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        msg,
        hostname=settings["host"],
        port=settings.get("port", 587),
        username=settings.get("username"),
        password=settings.get("password"),
        start_tls=(settings.get("encryption") == "tls"),
        use_tls=(settings.get("encryption") == "ssl")
    )


@router.post("/email/send-code")
async def send_email_code(request: EmailVerificationRequest):
    code = _generate_code()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=CODE_EXPIRY_MINUTES)

    await _send_email_verification(request.email, code)

    await db.email_verifications.insert_one({
        "id": str(random.randint(100000, 999999)),
        "email": request.email,
        "code": code,
        "status": "sent",
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat()
    })

    return {"message": "Verification code sent"}


@router.post("/email/verify-code")
async def verify_email_code(request: EmailVerifyCodeRequest):
    record = await db.email_verifications.find_one(
        {"email": request.email, "code": request.code, "status": "sent"},
        sort=[("created_at", -1)]
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid code")

    if record.get("expires_at"):
        expires = datetime.fromisoformat(record["expires_at"])
        if expires < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Code expired")

    await db.email_verifications.update_one(
        {"_id": record["_id"]},
        {"$set": {"status": "verified", "verified_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"message": "Email verified"}


@router.get("/email/check/{email}")
async def check_email_verified(email: str):
    record = await db.email_verifications.find_one(
        {"email": email, "status": "verified"},
        sort=[("verified_at", -1)],
        projection={"_id": 0}
    )
    return {"verified": bool(record)}
