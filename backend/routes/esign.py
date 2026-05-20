"""
eSign Routes — Document templates, signing requests, and public signing portal
"""
import os
import uuid
import secrets
import shutil
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from database import db
from utils.auth import get_current_user
from models.user import UserRole
from models.esign import ESignTemplateCreate, ESignTemplateUpdate, ESignRequestCreate

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ESIGN_DIR = os.path.join(BASE_DIR, "static", "esign")
TEMPLATES_DIR = os.path.join(ESIGN_DIR, "templates")
SIGNED_DIR = os.path.join(ESIGN_DIR, "signed")
os.makedirs(TEMPLATES_DIR, exist_ok=True)
os.makedirs(SIGNED_DIR, exist_ok=True)


def _template_url(template_id: str, base_url: str) -> str:
    return f"{base_url}/api/static/esign/templates/{template_id}/original.pdf"


# ═══════════════════════════════════════════════════
# TEMPLATE ENDPOINTS (admin)
# ═══════════════════════════════════════════════════

@router.post("/templates/upload")
async def upload_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form("general"),
    description: str = Form(""),
    current_user: dict = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    template_id = str(uuid.uuid4())
    template_dir = os.path.join(TEMPLATES_DIR, template_id)
    os.makedirs(template_dir, exist_ok=True)

    dest = os.path.join(template_dir, "original.pdf")
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    doc = {
        "id": template_id,
        "name": name,
        "category": category,
        "description": description,
        "filename": file.filename,
        "fields": [],
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.esign_templates.insert_one(doc)
    return {**doc, "_id": None}


@router.get("/templates")
async def list_templates(current_user: dict = Depends(get_current_user)):
    templates = await db.esign_templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return templates


@router.get("/templates/{template_id}")
async def get_template(template_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    t = await db.esign_templates.find_one({"id": template_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    base_url = str(request.base_url).rstrip("/")
    t["pdf_url"] = _template_url(template_id, base_url)
    return t


@router.put("/templates/{template_id}")
async def update_template(template_id: str, data: ESignTemplateUpdate, current_user: dict = Depends(get_current_user)):
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.name is not None:
        update["name"] = data.name
    if data.category is not None:
        update["category"] = data.category
    if data.description is not None:
        update["description"] = data.description
    if data.fields is not None:
        update["fields"] = data.fields

    result = await db.esign_templates.update_one({"id": template_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template updated"}


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
    tdir = os.path.join(TEMPLATES_DIR, template_id)
    if os.path.exists(tdir):
        shutil.rmtree(tdir)
    await db.esign_templates.delete_one({"id": template_id})
    return {"message": "Template deleted"}


# ═══════════════════════════════════════════════════
# SIGNING REQUEST ENDPOINTS (admin)
# ═══════════════════════════════════════════════════

@router.post("/requests")
async def create_request(data: ESignRequestCreate, request: Request, current_user: dict = Depends(get_current_user)):
    template = await db.esign_templates.find_one({"id": data.template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    token = secrets.token_urlsafe(32)
    req_id = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)).isoformat()

    base_url = str(request.base_url).rstrip("/")
    site_url = os.environ.get("SITE_URL", base_url.replace(":8001", "").replace("/api", ""))
    sign_url = f"{site_url}/sign/{token}"

    doc = {
        "id": req_id,
        "token": token,
        "template_id": data.template_id,
        "template_name": template["name"],
        "signer_name": data.signer_name,
        "signer_email": data.signer_email,
        "signer_phone": data.signer_phone or "",
        "contact_id": data.contact_id or "",
        "lead_id": data.lead_id or "",
        "message": data.message or "",
        "sent_by": current_user["id"],
        "sent_by_name": current_user.get("name", ""),
        "status": "pending",
        "consent_given": False,
        "consent_at": None,
        "signed_at": None,
        "declined_at": None,
        "decline_reason": None,
        "field_values": {},
        "signature_data": None,
        "typed_signature": None,
        "signed_pdf_url": None,
        "sign_url": sign_url,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.esign_requests.insert_one(doc)

    # Send invite email
    await _send_invite_email(
        signer_email=data.signer_email,
        signer_name=data.signer_name,
        template_name=template["name"],
        sign_url=sign_url,
        message=data.message or "",
        expires_at=expires_at,
    )

    return {**doc, "_id": None}


@router.get("/requests")
async def list_requests(
    status: Optional[str] = None,
    contact_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    query: dict = {}
    if status:
        query["status"] = status
    if contact_id:
        query["contact_id"] = contact_id
    if lead_id:
        query["lead_id"] = lead_id

    requests = await db.esign_requests.find(query, {"_id": 0, "signature_data": 0}).sort("created_at", -1).to_list(500)
    return requests


@router.get("/requests/{req_id}")
async def get_request(req_id: str, current_user: dict = Depends(get_current_user)):
    r = await db.esign_requests.find_one(
        {"$or": [{"id": req_id}, {"token": req_id}]}, {"_id": 0}
    )
    if not r:
        raise HTTPException(status_code=404, detail="Request not found")
    return r


@router.delete("/requests/{req_id}")
async def cancel_request(req_id: str, current_user: dict = Depends(get_current_user)):
    await db.esign_requests.update_one(
        {"id": req_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Request cancelled"}


@router.get("/stats")
async def get_esign_stats(current_user: dict = Depends(get_current_user)):
    total = await db.esign_requests.count_documents({})
    pending = await db.esign_requests.count_documents({"status": "pending"})
    signed = await db.esign_requests.count_documents({"status": "signed"})
    declined = await db.esign_requests.count_documents({"status": "declined"})
    templates = await db.esign_templates.count_documents({})
    return {
        "total_requests": total,
        "pending": pending,
        "signed": signed,
        "declined": declined,
        "total_templates": templates,
    }


# ═══════════════════════════════════════════════════
# PUBLIC "LIST MY HOME" ENDPOINT (no auth required)
# ═══════════════════════════════════════════════════

class PublicSigningRequest(BaseModel):
    signer_name: str
    signer_email: str
    signer_phone: Optional[str] = None
    property_address: Optional[str] = None
    lead_id: Optional[str] = None
    template_name: Optional[str] = "Exclusive Right of Sale Listing Agreement"


@router.post("/public/list-my-home")
async def public_list_my_home(data: PublicSigningRequest, request: Request):
    """
    Public endpoint: any site visitor can trigger a signing request
    for the Exclusive Right of Sale Listing Agreement.
    No auth required — the document is sent via email link.
    """
    # Find the listing agreement template
    template = await db.esign_templates.find_one(
        {"name": {"$regex": data.template_name, "$options": "i"}},
        {"_id": 0},
    )
    if not template:
        # Fallback: any seller template
        template = await db.esign_templates.find_one({"category": "seller"}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Listing agreement template not configured yet. Please contact us directly.")

    token = secrets.token_urlsafe(32)
    req_id = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    base_url = str(request.base_url).rstrip("/")
    site_url = os.environ.get("SITE_URL", base_url.replace(":8001", "").replace("/api", ""))
    sign_url = f"{site_url}/sign/{token}"

    message = "Thank you for your interest in listing your property! Sheila Desautels is excited to work with you."
    if data.property_address:
        message += f" We'll get started on {data.property_address} right away."

    doc = {
        "id": req_id,
        "token": token,
        "template_id": template["id"],
        "template_name": template["name"],
        "signer_name": data.signer_name,
        "signer_email": data.signer_email,
        "signer_phone": data.signer_phone or "",
        "contact_id": "",
        "lead_id": data.lead_id or "",
        "message": message,
        "sent_by": "system",
        "sent_by_name": "Sheila Desautels",
        "status": "pending",
        "source": "list_my_home_button",
        "property_address": data.property_address or "",
        "consent_given": False,
        "consent_at": None,
        "signed_at": None,
        "declined_at": None,
        "decline_reason": None,
        "field_values": {},
        "signature_data": None,
        "typed_signature": None,
        "signed_pdf_url": None,
        "sign_url": sign_url,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.esign_requests.insert_one(doc)

    # Send invite email
    await _send_invite_email(
        signer_email=data.signer_email,
        signer_name=data.signer_name,
        template_name=template["name"],
        sign_url=sign_url,
        message=message,
        expires_at=expires_at,
    )

    return {"token": token, "sign_url": sign_url, "message": "Signing link created"}


# ═══════════════════════════════════════════════════
# PUBLIC SIGNING PORTAL (no auth)
# ═══════════════════════════════════════════════════

@router.get("/sign/{token}")
async def get_ceremony_data(token: str, request: Request):
    """Public: return ceremony page data for the signer"""
    r = await db.esign_requests.find_one({"token": token}, {"_id": 0, "signature_data": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Signing request not found or expired")

    # Check expiry
    expires_at = r.get("expires_at")
    if expires_at and datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="This signing link has expired")

    if r.get("status") in ("signed", "declined", "cancelled"):
        return {"status": r["status"], "signer_name": r.get("signer_name"), "template_name": r.get("template_name")}

    # Update to viewed
    if r.get("status") == "pending":
        await db.esign_requests.update_one(
            {"token": token},
            {"$set": {"status": "viewed", "viewed_at": datetime.now(timezone.utc).isoformat()}}
        )

    template = await db.esign_templates.find_one({"id": r["template_id"]}, {"_id": 0})
    base_url = str(request.base_url).rstrip("/")
    pdf_url = _template_url(r["template_id"], base_url) if template else None

    return {
        "status": "active",
        "signer_name": r.get("signer_name"),
        "signer_email": r.get("signer_email"),
        "template_name": r.get("template_name"),
        "message": r.get("message"),
        "sent_by_name": r.get("sent_by_name", "Sheila Desautels"),
        "fields": template.get("fields", []) if template else [],
        "pdf_url": pdf_url,
        "consent_given": r.get("consent_given", False),
    }


@router.post("/sign/{token}/consent")
async def give_consent(token: str, req: Request):
    """Public: record consent to e-sign"""
    r = await db.esign_requests.find_one({"token": token})
    if not r:
        raise HTTPException(status_code=404, detail="Not found")

    client_ip = req.client.host if req.client else "unknown"
    await db.esign_requests.update_one(
        {"token": token},
        {"$set": {
            "consent_given": True,
            "consent_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": client_ip,
            "status": "consented",
        }}
    )
    return {"message": "Consent recorded"}


@router.post("/sign/{token}/submit")
async def submit_signature(token: str, payload: dict, req: Request):
    """Public: submit signed fields and signature"""
    r = await db.esign_requests.find_one({"token": token}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    if r.get("status") == "signed":
        return {"message": "Already signed", "signed_pdf_url": r.get("signed_pdf_url")}

    field_values = payload.get("field_values", {})
    signature_data = payload.get("signature_data")  # base64 PNG
    typed_signature = payload.get("typed_signature")
    client_ip = req.client.host if req.client else "unknown"
    signed_at = datetime.now(timezone.utc).isoformat()

    # Generate signed PDF
    template = await db.esign_templates.find_one({"id": r["template_id"]}, {"_id": 0})
    fields = template.get("fields", []) if template else []

    from services.esign_service import create_signed_pdf
    signed_pdf_url = await create_signed_pdf(
        request_id=r["id"],
        template_id=r["template_id"],
        field_values=field_values,
        signature_data=signature_data,
        typed_signature=typed_signature,
        fields=fields,
        signer_name=r.get("signer_name", ""),
        signed_at=signed_at,
    )

    await db.esign_requests.update_one(
        {"token": token},
        {"$set": {
            "status": "signed",
            "signed_at": signed_at,
            "field_values": field_values,
            "signature_data": signature_data,
            "typed_signature": typed_signature,
            "signed_pdf_url": signed_pdf_url,
            "ip_address": client_ip,
        }}
    )

    # Email signed PDF to both parties
    await _send_signed_email(r, signed_pdf_url)

    return {"message": "Document signed successfully", "signed_pdf_url": signed_pdf_url}


@router.post("/sign/{token}/decline")
async def decline_signing(token: str, payload: dict):
    """Public: decline to sign"""
    r = await db.esign_requests.find_one({"token": token})
    if not r:
        raise HTTPException(status_code=404, detail="Not found")

    await db.esign_requests.update_one(
        {"token": token},
        {"$set": {
            "status": "declined",
            "declined_at": datetime.now(timezone.utc).isoformat(),
            "decline_reason": payload.get("reason", ""),
        }}
    )
    return {"message": "Decline recorded"}


# ═══════════════════════════════════════════════════
# EMAIL HELPERS
# ═══════════════════════════════════════════════════

async def _get_smtp():
    settings = await db.smtp_settings.find_one({}, {"_id": 0})
    if not settings or not settings.get("host"):
        return None
    return settings


async def _send_invite_email(signer_email, signer_name, template_name, sign_url, message, expires_at):
    smtp = await _get_smtp()
    if not smtp:
        print(f"[eSign] No SMTP — signing link: {sign_url}")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Action Required: Please sign — {template_name}"
        msg["From"] = f"{smtp.get('from_name','Hidden Haven Realty')} <{smtp.get('from_email', smtp['username'])}>"
        msg["To"] = signer_email

        greeting = f"Dear {signer_name}," if signer_name else "Hello,"
        custom_msg = f"<p>{message}</p>" if message else ""
        exp_str = datetime.fromisoformat(expires_at).strftime("%B %d, %Y") if expires_at else "30 days"

        html = f"""
        <html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
        <div style="max-width:600px;margin:0 auto;background:#0a1628;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#0a1628,#0d1f3c);padding:30px;text-align:center;border-bottom:2px solid #fbbf24">
            <h1 style="color:#fbbf24;font-family:Georgia,serif;margin:0">Hidden Haven Realty</h1>
            <p style="color:rgba(255,255,255,0.7);margin:8px 0 0">Electronic Signature Request</p>
          </div>
          <div style="padding:30px;color:#fff">
            <p style="font-size:16px">{greeting}</p>
            <p>Sheila Desautels has invited you to review and electronically sign: <strong style="color:#fbbf24">{template_name}</strong></p>
            {custom_msg}
            <div style="text-align:center;margin:30px 0">
              <a href="{sign_url}" style="background:#fbbf24;color:#0a1628;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;text-decoration:none;display:inline-block">
                Review &amp; Sign Document
              </a>
            </div>
            <p style="color:rgba(255,255,255,0.5);font-size:13px">This link expires on {exp_str}. You may decline to sign if needed.</p>
          </div>
        </div>
        </body></html>
        """
        msg.attach(MIMEText(html, "html"))
        await aiosmtplib.send(
            msg,
            hostname=smtp["host"],
            port=smtp.get("port", 587),
            username=smtp["username"],
            password=smtp["password"],
            start_tls=(smtp.get("encryption") == "tls"),
            use_tls=(smtp.get("encryption") == "ssl"),
        )
    except Exception as e:
        print(f"[eSign] Invite email error: {e}")


async def _send_signed_email(request_doc: dict, signed_pdf_url: Optional[str]):
    smtp = await _get_smtp()
    if not smtp:
        return

    signed_path = None
    if signed_pdf_url:
        req_id = request_doc.get("id", "")
        signed_path = os.path.join(SIGNED_DIR, f"{req_id}.pdf")
        if not os.path.exists(signed_path):
            signed_path = None

    recipients = [request_doc.get("signer_email", "")]
    # also notify the agent
    agent_email = smtp.get("from_email") or smtp.get("username")
    if agent_email and agent_email not in recipients:
        recipients.append(agent_email)

    signer_name = request_doc.get("signer_name", "the signer")
    template_name = request_doc.get("template_name", "document")
    signed_at_str = datetime.now(timezone.utc).strftime("%B %d, %Y %I:%M %p UTC")

    for recipient in recipients:
        try:
            msg = MIMEMultipart("mixed")
            msg["Subject"] = f"Signed: {template_name}"
            msg["From"] = f"{smtp.get('from_name','Hidden Haven Realty')} <{smtp.get('from_email', smtp['username'])}>"
            msg["To"] = recipient

            html = f"""
            <html><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
            <div style="max-width:600px;margin:0 auto;background:#0a1628;border-radius:12px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#0a1628,#0d1f3c);padding:30px;text-align:center;border-bottom:2px solid #fbbf24">
                <h1 style="color:#fbbf24;font-family:Georgia,serif;margin:0">Document Signed</h1>
              </div>
              <div style="padding:30px;color:#fff">
                <p style="font-size:18px">&#10003; <strong>{template_name}</strong> has been signed.</p>
                <p>Signer: <strong style="color:#fbbf24">{signer_name}</strong></p>
                <p>Signed at: {signed_at_str}</p>
                <p style="color:rgba(255,255,255,0.5);font-size:13px">The signed copy is attached to this email.</p>
              </div>
            </div>
            </body></html>
            """
            msg.attach(MIMEText(html, "html"))

            if signed_path and os.path.exists(signed_path):
                with open(signed_path, "rb") as f:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header("Content-Disposition", f'attachment; filename="{template_name.replace(" ", "_")}_signed.pdf"')
                    msg.attach(part)

            await aiosmtplib.send(
                msg,
                hostname=smtp["host"],
                port=smtp.get("port", 587),
                username=smtp["username"],
                password=smtp["password"],
                start_tls=(smtp.get("encryption") == "tls"),
                use_tls=(smtp.get("encryption") == "ssl"),
            )
        except Exception as e:
            print(f"[eSign] Signed email error to {recipient}: {e}")
