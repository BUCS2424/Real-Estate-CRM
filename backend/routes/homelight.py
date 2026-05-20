"""
HomeLight Partner API Integration
- Inbound: webhook receiver to accept leads FROM HomeLight → CRM pipeline
- Outbound: push leads TO HomeLight for agent matching
- Config: store API credentials and webhook secret
"""
import os
import uuid
import secrets
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
import aiohttp

from database import db
from utils.auth import get_current_user
from models.user import UserRole

router = APIRouter()

HOMELIGHT_PROD_URL  = "https://www.homelight.com/api/partner_lead/v2"
HOMELIGHT_STAGE_URL = "https://staging.homelight.com/api/partner_lead/v2"
HOMELIGHT_DUPE_URL  = "https://www.homelight.com/api/partner_dupe_lead_check"
SITE_URL = os.environ.get("SITE_URL", "https://hiddenhavenrealty.com")


# ── Helpers ──────────────────────────────────────────────────────────────────

async def _get_config() -> dict:
    cfg = await db.homelight_config.find_one({}, {"_id": 0}) or {}
    return cfg


def _map_homelight_to_crm(hl: dict) -> dict:
    """Map a HomeLight lead payload to our CRM lead schema."""
    user_type = (hl.get("user_type") or "buyer").lower()
    name_parts = (hl.get("name") or hl.get("full_name") or "").strip().split(" ", 1)

    return {
        "id": str(uuid.uuid4()),
        "source": "homelight",
        "source_display": "HomeLight",
        "lead_type": user_type,                    # buyer | seller
        "name": hl.get("name") or hl.get("full_name") or "",
        "first_name": name_parts[0] if name_parts else "",
        "last_name": name_parts[1] if len(name_parts) > 1 else "",
        "email": hl.get("email") or "",
        "phone": hl.get("phone") or hl.get("phone_alt") or "",
        "phone_alt": hl.get("phone_alt") or "",
        "email_alt": hl.get("email_alt") or "",
        "address": hl.get("address") or "",
        "city": hl.get("city") or "",
        "zip_code": hl.get("zip_code") or "",
        "price": hl.get("price") or 0,
        "bedrooms": hl.get("beds") or None,
        "bathrooms": hl.get("baths") or None,
        "square_footage": hl.get("square_footage") or None,
        "property_type": hl.get("property_type") or "",
        "timeline": hl.get("timeline") or "",
        "prequalified": hl.get("prequalified") or False,
        "already_has_agent": hl.get("already_has_agent") or False,
        "client_notes": hl.get("client_notes") or "",
        "status": "new",
        "tags": ["homelight"],
        "utm_source": hl.get("utm_source") or "homelight",
        "utm_medium": hl.get("utm_medium") or "",
        "utm_campaign": hl.get("utm_campaign") or "",
        "raw_homelight_payload": hl,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Config endpoints ─────────────────────────────────────────────────────────

@router.get("/config")
async def get_homelight_config(current_user: dict = Depends(get_current_user)):
    cfg = await _get_config()

    # Auto-generate webhook secret on first access
    if not cfg.get("webhook_secret"):
        new_key = secrets.token_urlsafe(32)
        await db.homelight_config.update_one(
            {},
            {"$set": {"webhook_secret": new_key, "enabled": True,
                       "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        cfg = await _get_config()

    # Mask secret/token for display
    masked = {**cfg}
    if masked.get("secret"):
        masked["secret"] = "••••" + masked["secret"][-4:]
    if masked.get("token"):
        masked["token"]  = "••••" + masked["token"][-4:]
    # Always surface the webhook URL
    wk_secret = cfg.get("webhook_secret") or ""
    masked["webhook_url"] = f"{SITE_URL}/api/homelight/webhook?key={wk_secret}"
    masked["configured"] = bool(cfg.get("secret") and cfg.get("token"))
    return masked


class HomelightConfigUpdate(BaseModel):
    secret: Optional[str] = None
    token:  Optional[str] = None
    use_staging: Optional[bool] = False
    enabled: Optional[bool] = True


@router.post("/config")
async def save_homelight_config(data: HomelightConfigUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    existing = await _get_config()

    update = {
        "use_staging": data.use_staging,
        "enabled": data.enabled,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["id"],
    }

    # Only update secret/token if provided and not masked
    if data.secret and not data.secret.startswith("••••"):
        update["secret"] = data.secret
    if data.token and not data.token.startswith("••••"):
        update["token"] = data.token

    # Generate webhook secret on first save if not present
    if not existing.get("webhook_secret"):
        update["webhook_secret"] = secrets.token_urlsafe(32)

    await db.homelight_config.update_one({}, {"$set": update}, upsert=True)
    return {"message": "HomeLight settings saved"}


@router.post("/config/regenerate-key")
async def regenerate_webhook_key(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    new_key = secrets.token_urlsafe(32)
    await db.homelight_config.update_one(
        {},
        {"$set": {"webhook_secret": new_key, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    webhook_url = f"{SITE_URL}/api/homelight/webhook?key={new_key}"
    return {"message": "Webhook key regenerated", "webhook_url": webhook_url}


# ── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_homelight_stats(current_user: dict = Depends(get_current_user)):
    total   = await db.leads.count_documents({"source": "homelight"})
    buyers  = await db.leads.count_documents({"source": "homelight", "lead_type": "buyer"})
    sellers = await db.leads.count_documents({"source": "homelight", "lead_type": "seller"})
    new     = await db.leads.count_documents({"source": "homelight", "status": "new"})
    return {
        "total": total, "buyers": buyers, "sellers": sellers, "new_unread": new
    }


# ── Test connection ───────────────────────────────────────────────────────────

@router.post("/test")
async def test_homelight_connection(current_user: dict = Depends(get_current_user)):
    cfg = await _get_config()
    if not cfg.get("secret") or not cfg.get("token"):
        return {"success": False, "message": "API credentials not configured yet"}

    url = HOMELIGHT_STAGE_URL if cfg.get("use_staging") else HOMELIGHT_PROD_URL
    # Send a duplicate check as a connection test
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                HOMELIGHT_DUPE_URL.replace("www.homelight.com", "staging.homelight.com")
                if cfg.get("use_staging") else HOMELIGHT_DUPE_URL,
                json={"secret": cfg["secret"], "token": cfg["token"],
                      "email": "test@hiddenhavenrealty.com"},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                body = await resp.json()
                if resp.status in (200, 201):
                    return {"success": True, "message": "Connected to HomeLight API successfully"}
                return {"success": False, "message": f"HomeLight returned {resp.status}: {body}"}
    except Exception as e:
        return {"success": False, "message": f"Connection failed: {e}"}


# ═══════════════════════════════════════════════════════════════════════════════
# INBOUND WEBHOOK — HomeLight POSTs leads to US
# URL: /api/homelight/webhook?key={webhook_secret}
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/webhook")
async def receive_homelight_lead(
    request: Request,
    key: str = Query(..., description="Webhook security key"),
):
    """
    Receives an inbound lead from HomeLight.
    HomeLight calls: POST https://hiddenhavenrealty.com/api/homelight/webhook?key=YOUR_KEY

    The key param authenticates the request.
    Leads are saved to the CRM leads collection with source='homelight'.
    """
    cfg = await _get_config()

    # Verify webhook key
    if not cfg.get("webhook_secret") or not secrets.compare_digest(key, cfg["webhook_secret"]):
        raise HTTPException(status_code=401, detail="Invalid webhook key")

    if not cfg.get("enabled", True):
        return {"status": "disabled", "message": "HomeLight integration is disabled"}

    # Parse body — HomeLight sends JSON or form-encoded
    try:
        body = await request.json()
    except Exception:
        form = await request.form()
        body = dict(form)

    # HomeLight v2 format wraps leads in an array; simple sale uses 'lead' object
    raw_leads = []
    if "leads" in body and isinstance(body["leads"], list):
        raw_leads = body["leads"]
    elif "lead" in body and isinstance(body["lead"], dict):
        raw_leads = [body["lead"]]
    else:
        # Flat payload (direct lead object)
        raw_leads = [body]

    accepted = []
    rejected = []

    for hl_lead in raw_leads:
        try:
            if not hl_lead.get("email") and not hl_lead.get("phone"):
                rejected.append({"lead": hl_lead.get("name", "?"), "reason": "Missing email and phone"})
                continue

            # Check for duplicate by email
            existing = await db.leads.find_one({"email": hl_lead.get("email"), "source": "homelight"})
            if existing:
                accepted.append({"lead": hl_lead.get("name", "?"), "status": "duplicate_skipped"})
                continue

            crm_lead = _map_homelight_to_crm(hl_lead)
            await db.leads.insert_one(crm_lead)

            # Trigger notification
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "type": "homelight_lead",
                "title": "New HomeLight Lead",
                "message": f"{crm_lead['name']} — {crm_lead.get('lead_type','').title()} from HomeLight",
                "data": {"lead_id": crm_lead["id"]},
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

            accepted.append({"lead": crm_lead["name"], "id": crm_lead["id"], "type": crm_lead["lead_type"]})

        except Exception as e:
            rejected.append({"lead": hl_lead.get("name", "?"), "reason": str(e)})

    return {
        "status": "ok",
        "received": len(raw_leads),
        "accepted": len(accepted),
        "rejected": len(rejected),
        "leads": accepted,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# OUTBOUND — Push a lead FROM us TO HomeLight
# ═══════════════════════════════════════════════════════════════════════════════

class PushLeadRequest(BaseModel):
    name: str
    email: str
    phone: str
    user_type: str = "buyer"   # buyer | seller
    city: Optional[str] = None
    zip_code: Optional[str] = None
    address: Optional[str] = None
    price: Optional[int] = None
    property_type: Optional[str] = "single_family_home"
    timeline: Optional[str] = "unsure"
    beds: Optional[int] = None
    baths: Optional[int] = None
    client_notes: Optional[str] = None
    prequalified: Optional[bool] = None


@router.post("/push-lead")
async def push_lead_to_homelight(data: PushLeadRequest, current_user: dict = Depends(get_current_user)):
    """Push a lead from our CRM to HomeLight for agent matching."""
    cfg = await _get_config()
    if not cfg.get("secret") or not cfg.get("token"):
        raise HTTPException(status_code=400, detail="HomeLight API credentials not configured")

    url = HOMELIGHT_STAGE_URL if cfg.get("use_staging") else HOMELIGHT_PROD_URL

    lead_payload = {
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "user_type": data.user_type,
        "property_type": data.property_type,
        "timeline": data.timeline,
    }
    if data.city:       lead_payload["city"]    = data.city
    if data.zip_code:   lead_payload["zip_code"] = data.zip_code
    if data.address:    lead_payload["address"]  = data.address
    if data.price:      lead_payload["price"]    = data.price
    if data.beds:       lead_payload["beds"]     = data.beds
    if data.baths:      lead_payload["baths"]    = data.baths
    if data.client_notes: lead_payload["client_notes"] = data.client_notes
    if data.prequalified is not None: lead_payload["prequalified"] = data.prequalified

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                json={"secret": cfg["secret"], "token": cfg["token"], "leads": [lead_payload]},
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                timeout=aiohttp.ClientTimeout(total=15)
            ) as resp:
                body = await resp.json()
                hl_leads = body.get("leads", [])
                accepted = hl_leads[0].get("accepted", False) if hl_leads else False
                return {
                    "success": accepted,
                    "homelight_response": body,
                    "message": "Lead sent to HomeLight" if accepted else hl_leads[0].get("reason", "Rejected by HomeLight"),
                }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"HomeLight API error: {e}")


@router.post("/check-duplicate")
async def check_homelight_duplicate(
    email: Optional[str] = None,
    phone: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    cfg = await _get_config()
    if not cfg.get("secret") or not cfg.get("token"):
        return {"duplicate": False, "note": "Credentials not configured"}

    url = HOMELIGHT_DUPE_URL
    if cfg.get("use_staging"):
        url = url.replace("www.homelight.com", "staging.homelight.com")

    payload = {"secret": cfg["secret"], "token": cfg["token"]}
    if email:  payload["email"]        = email
    if phone:  payload["phone_number"] = phone

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                body = await resp.json()
                return body
    except Exception as e:
        return {"duplicate": False, "error": str(e)}
