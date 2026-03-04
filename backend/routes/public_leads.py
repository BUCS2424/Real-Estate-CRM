"""Public lead submission routes (no auth)."""
from datetime import datetime, timezone
from typing import Optional, List
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, root_validator

from database import db

router = APIRouter(prefix="/public", tags=["Public Leads"])


class PublicLeadSubmit(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    lead_type: str = "buyer"
    leadType: Optional[str] = None
    type: Optional[str] = None
    source: Optional[str] = "landing_page"
    email_verified: bool = False
    phone_verified: bool = False
    budget: Optional[str] = None
    areas_of_interest: Optional[str] = None
    consent_email: Optional[bool] = False
    consent_sms: Optional[bool] = False

    @root_validator(pre=True)
    def normalize_lead_type(cls, values):
        raw = values.get("lead_type") or values.get("leadType") or values.get("type") or "buyer"
        raw_str = str(raw).lower().strip()
        if raw_str in ["buyer", "buy", "buyer_lead", "buyerlead", "b"]:
            values["lead_type"] = "buyer"
        elif raw_str in ["seller", "sell", "seller_lead", "sellerlead", "s"]:
            values["lead_type"] = "seller"
        else:
            values["lead_type"] = "buyer"
        return values


@router.post("/leads")
async def submit_public_lead(payload: PublicLeadSubmit):
    if payload.lead_type not in ["buyer", "seller"]:
        raise HTTPException(status_code=400, detail="Invalid lead type")

    now = datetime.now(timezone.utc).isoformat()
    lead_doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone,
        "type": payload.lead_type,
        "source": payload.source or "landing_page",
        "status": "new",
        "email_verified": payload.email_verified,
        "phone_verified": payload.phone_verified,
        "budget": payload.budget,
        "areas_of_interest": payload.areas_of_interest,
        "consent_email": payload.consent_email,
        "consent_sms": payload.consent_sms,
        "activity": [{
            "type": "submitted",
            "description": "Lead submitted via public form",
            "user": "Website Visitor",
            "timestamp": now
        }],
        "created_at": now,
        "updated_at": now
    }

    await db.leads.insert_one(lead_doc)
    return {"message": "Lead submitted", "id": lead_doc["id"]}
