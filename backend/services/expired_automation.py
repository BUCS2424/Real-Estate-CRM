"""
Expired Listings Automation Service
Runs daily expired search with criteria, auto-converts to leads, and triggers marketing.
"""
from datetime import datetime, timezone
from typing import List, Optional
from urllib.parse import quote
import os
import uuid
import asyncio
import io
import re

import httpx
from PIL import Image
from database import db
from models.user import UserRole
from services.brochure_generator import generate_brochure
from services.skyreels_service import generate_property_video, get_skyreels_service
from routes.property_lead_marketing import CreateListingFromLeadRequest, create_listing_from_lead, publish_lead_landing_page, upload_video_to_lead
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import aiosmtplib

DEFAULT_EXPIRED_CRITERIA = {
    "zip_codes": ["33602", "33606"],
    "min_price": 750000,
    "property_type": "Single Family",
    "exclude_rentals": True,
    "exclude_commercial": True,
    "status": "Expired",
    "days_expired": 90,
    "required_year": 2026,
    "limit": 50
}

DEFAULT_TEST_MAX_LEADS = 1

DEFAULT_RECIPIENTS = [
    "mel@a2gdesigns.com"
]

VIDEO_PLACEHOLDER_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
VIDEO_PLACEHOLDER_TITLE = "Agent Intro (Placeholder)"
SAMPLE_AGENT_AVATAR_URL = "https://customer-assets.emergentagent.com/job_86aec819-c311-4278-9c10-e6f793ce5e8f/artifacts/knqrnpef_62e3c47e-2d5d-4360-98c5-8f0b3968a3f4-removebg-preview.png"

DEFAULT_SCRIPT_TEMPLATE = """Hook (0–5s): "Hi [Name], I’m [Your Name] with [Brokerage]. I was just looking at the architectural gallery for your home on [Street Name], and I felt compelled to reach out because, frankly, a home with that kind of [Feature] should already be sold."

The Problem (5–15s): "When a luxury property like yours expires, it’s rarely the house that’s the issue—it’s the exposure. In this tier, you aren't just selling square footage; you’re selling a lifestyle. If the previous marketing didn't make a buyer feel what it’s like to host a gala in that grand foyer, they won't make an offer."

The Solution (15–25s): "I’m bringing a fresh, high-intensity approach to luxury marketing—using cinematic storytelling and targeted digital placement to find the specific buyer your home deserves. I have a custom 'Visual Launch' plan ready for this exact floor plan."

The Call to Action (25–30s): "I’d love to send over my digital portfolio or stop by for 10 minutes to show you how we can reboot this listing. Are you open to a new perspective?"""


def _get_site_url() -> str:
    site_url = os.environ.get("SITE_URL")
    if not site_url:
        raise ValueError("SITE_URL is not configured")
    return site_url.rstrip("/")


def _build_landing_url(slug: str) -> str:
    return f"{_get_site_url()}/landing/{slug}"


async def get_expired_automation_settings() -> dict:
    settings = await db.automation_settings.find_one({"type": "expired_daily"}, {"_id": 0})
    if settings:
        updates = {}
        now = datetime.now(timezone.utc).isoformat()
        if not settings.get("avatar_url"):
            updates["avatar_url"] = SAMPLE_AGENT_AVATAR_URL
        recipients = settings.get("recipient_emails", [])
        if not recipients:
            updates["recipient_emails"] = DEFAULT_RECIPIENTS
        elif any(r.lower() == "tampabay@tampabay.rr.com" for r in recipients):
            updates["recipient_emails"] = [r for r in recipients if r.lower() != "tampabay@tampabay.rr.com"]
        if settings.get("test_max_leads") is None:
            updates["test_max_leads"] = DEFAULT_TEST_MAX_LEADS
        if not settings.get("script_template"):
            updates["script_template"] = DEFAULT_SCRIPT_TEMPLATE
        if settings.get("enabled") is None:
            updates["enabled"] = True

        criteria = settings.get("criteria") or {}
        criteria_updates = {}
        if criteria.get("days_expired") is None:
            criteria_updates["days_expired"] = DEFAULT_EXPIRED_CRITERIA["days_expired"]
        if criteria.get("required_year") is None:
            criteria_updates["required_year"] = DEFAULT_EXPIRED_CRITERIA["required_year"]
        if criteria_updates:
            updated_criteria = {**criteria, **criteria_updates}
            updates["criteria"] = updated_criteria

        if updates:
            updates["updated_at"] = now
            await db.automation_settings.update_one(
                {"type": "expired_daily"},
                {"$set": updates}
            )
            settings.update(updates)
        return settings

    now = datetime.now(timezone.utc).isoformat()
    settings = {
        "type": "expired_daily",
        "criteria": DEFAULT_EXPIRED_CRITERIA,
        "recipient_emails": DEFAULT_RECIPIENTS,
        "avatar_url": SAMPLE_AGENT_AVATAR_URL,
        "test_max_leads": DEFAULT_TEST_MAX_LEADS,
        "enabled": True,
        "script_template": DEFAULT_SCRIPT_TEMPLATE,
        "created_at": now,
        "updated_at": now
    }
    await db.automation_settings.insert_one(settings)
    return settings


async def get_admin_user() -> Optional[dict]:
    user = await db.users.find_one({"role": UserRole.SUPERUSER}, {"_id": 0})
    if user:
        return user
    return await db.users.find_one({"role": UserRole.ADMIN}, {"_id": 0})


async def _get_agent_info(current_user: dict) -> dict:
    settings = await db.settings.find_one({"type": "agent"}, {"_id": 0})
    return {
        "name": settings.get("agent_name", current_user.get("name", "Agent")) if settings else current_user.get("name", "Agent"),
        "phone": settings.get("agent_phone", "") if settings else "",
        "email": settings.get("agent_email", current_user.get("email", "")) if settings else current_user.get("email", ""),
        "title": settings.get("agent_title", "Real Estate Specialist") if settings else "Real Estate Specialist",
        "image_url": settings.get("agent_image_url") if settings else None
    }


async def _create_tracking_record(lead_id: str, recipient_email: str, landing_page_url: str) -> str:
    tracking_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await db.email_tracking.insert_one({
        "id": tracking_id,
        "lead_id": lead_id,
        "recipient_email": recipient_email,
        "landing_page_url": landing_page_url,
        "open_count": 0,
        "click_count": 0,
        "created_at": now,
        "last_opened_at": None,
        "last_clicked_at": None,
        "source": "expired_automation"
    })

    return tracking_id


def _extract_feature(description: Optional[str]) -> str:
    if not description:
        return "architectural details"
    text = description.lower()
    feature_map = [
        ("infinity-edge pool", ["infinity", "pool"]),
        ("soaring vaulted ceilings", ["vaulted", "cathedral"]),
        ("waterfront views", ["waterfront", "water view", "bay"]),
        ("gourmet kitchen", ["gourmet", "chef", "kitchen"]),
        ("private dock", ["dock", "boat"]),
        ("outdoor kitchen", ["outdoor kitchen"]),
        ("smart home tech", ["smart", "automation"]),
        ("grand foyer", ["foyer", "grand entry"])
    ]
    for label, keys in feature_map:
        if all(k in text for k in keys):
            return label
    return "architectural details"


def _build_avatar_script(template: str, lead: dict, agent_info: dict, brokerage: str) -> str:
    address = lead.get("address", "your property")
    street_name = address.split(',')[0] if address else "your property"
    homeowner = lead.get("owner_name", "Homeowner")
    feature = _extract_feature(lead.get("description"))

    script = template
    replacements = {
        "[Name]": homeowner,
        "[Your Name]": agent_info.get("name", "Your Agent"),
        "[Brokerage]": brokerage,
        "[Street Name]": street_name,
        "[Feature]": feature
    }

    for key, value in replacements.items():
        script = script.replace(key, value)

    return script


async def _compose_avatar_background(background_url: str, avatar_url: str, lead_id: str) -> Optional[str]:
    if not background_url or not avatar_url:
        return None

    async with httpx.AsyncClient(timeout=30) as client:
        bg_response = await client.get(background_url)
        avatar_response = await client.get(avatar_url)

    if bg_response.status_code >= 400 or avatar_response.status_code >= 400:
        return None

    bg_image = Image.open(io.BytesIO(bg_response.content)).convert("RGBA")
    avatar_image = Image.open(io.BytesIO(avatar_response.content)).convert("RGBA")

    # Resize avatar to fit 70% of background height
    target_height = int(bg_image.height * 0.75)
    ratio = target_height / avatar_image.height
    target_width = int(avatar_image.width * ratio)
    avatar_resized = avatar_image.resize((target_width, target_height))

    # Position avatar bottom right with margin
    margin_x = int(bg_image.width * 0.04)
    margin_y = int(bg_image.height * 0.02)
    position = (bg_image.width - target_width - margin_x, bg_image.height - target_height - margin_y)

    composite = bg_image.copy()
    composite.alpha_composite(avatar_resized, position)

    output_dir = "/app/backend/static/automation"
    os.makedirs(output_dir, exist_ok=True)
    filename = f"avatar_composite_{lead_id}.png"
    output_path = os.path.join(output_dir, filename)
    composite.save(output_path, format="PNG")

    return f"{_get_site_url()}/api/static/automation/{filename}"


def _slugify_filename(value: str) -> str:
    text = (value or "").strip().lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-") or "brochure"


async def _persist_brochure_pdf(lead_id: str, source_filename: str, pdf_buffer: io.BytesIO) -> str:
    output_dir = "/app/backend/static/automation/brochures"
    os.makedirs(output_dir, exist_ok=True)

    base_name = os.path.splitext(source_filename or "brochure.pdf")[0]
    safe_name = _slugify_filename(base_name)
    stored_name = f"{safe_name}-{lead_id[:8]}-{str(uuid.uuid4())[:8]}.pdf"
    output_path = os.path.join(output_dir, stored_name)

    pdf_buffer.seek(0)
    with open(output_path, "wb") as f:
        f.write(pdf_buffer.read())

    return f"{_get_site_url()}/api/static/automation/brochures/{stored_name}"



async def _send_tracked_email(lead: dict, recipient_email: str, brochure_pdf, brochure_filename: str, landing_page_url: str, tracking_id: str, agent_info: dict):
    settings = await db.smtp_settings.find_one({}, {"_id": 0})
    if not settings or not settings.get("host"):
        raise ValueError("SMTP not configured. Please configure email settings first.")

    site_url = _get_site_url()
    tracking_pixel = f"{site_url}/api/analytics/email/open/{tracking_id}"
    tracking_link = f"{site_url}/api/analytics/email/click/{tracking_id}?redirect={quote(landing_page_url)}"

    subject = f"Exclusive Expired Listing Opportunity: {lead.get('address', 'Property')}"
    owner_name = lead.get("owner_name", "Homeowner")
    address = lead.get("address", "your property")

    text_body = f"""
Hello {owner_name},

I've prepared a personalized brochure for {address} with current market insights.
View the property landing page: {landing_page_url}

Best regards,
{agent_info['name']}
{agent_info['title']}
{agent_info['phone']}
{agent_info['email']}
"""

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0a1628;">
        <p>Hello {owner_name},</p>
        <p>I've prepared a personalized brochure for <strong>{address}</strong> with current market insights.</p>
        <p>
          <a href="{tracking_link}" style="display:inline-block; padding:12px 18px; background:#b8860b; color:#0a1628; text-decoration:none; border-radius:6px;">View Property Landing Page</a>
        </p>
        <p>You can also review the attached brochure PDF.</p>
        <p>Best regards,<br/>
        {agent_info['name']}<br/>
        {agent_info['title']}<br/>
        {agent_info['phone']}<br/>
        {agent_info['email']}</p>
        <img src="{tracking_pixel}" width="1" height="1" style="display:none;" alt="" />
      </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.get('from_name', 'Hidden Haven Realty')} <{settings.get('from_email', settings.get('username'))}>"
    msg["To"] = recipient_email

    if settings.get("reply_to"):
        msg["Reply-To"] = settings["reply_to"]

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    pdf_attachment = MIMEApplication(brochure_pdf.read(), _subtype="pdf")
    pdf_attachment.add_header("Content-Disposition", "attachment", filename=brochure_filename)
    msg.attach(pdf_attachment)

    await aiosmtplib.send(
        msg,
        hostname=settings["host"],
        port=settings.get("port", 587),
        username=settings.get("username"),
        password=settings.get("password"),
        start_tls=(settings.get("encryption") == "tls"),
        use_tls=(settings.get("encryption") == "ssl")
    )


async def run_marketing_flow_for_lead(lead_id: str, recipient_emails: List[str], current_user: dict, avatar_url: Optional[str] = None) -> dict:
    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise ValueError("Lead not found")

    recipient_emails = recipient_emails or []

    settings = await get_expired_automation_settings()
    branding = await db.settings.find_one({"type": "branding"}, {"_id": 0})
    brokerage = branding.get("siteName", "Hidden Haven Realty") if branding else "Hidden Haven Realty"

    agent_info = await _get_agent_info(current_user)
    background_image_url = lead.get("background_image_url") or lead.get("primary_photo")
    if not background_image_url:
        gallery_images = lead.get("gallery_images") or []
        if gallery_images:
            background_image_url = gallery_images[0].get("url")

    if background_image_url and not lead.get("background_image_url"):
        await db.property_leads.update_one(
            {"id": lead_id},
            {"$set": {"background_image_url": background_image_url}}
        )

    script_template = settings.get("script_template", DEFAULT_SCRIPT_TEMPLATE)
    script = _build_avatar_script(script_template, lead, agent_info, brokerage)

    composite_url = await _compose_avatar_background(
        background_url=background_image_url,
        avatar_url=avatar_url or agent_info.get("image_url") or SAMPLE_AGENT_AVATAR_URL,
        lead_id=lead_id
    )

    listing_result = await create_listing_from_lead(
        lead_id=lead_id,
        request=CreateListingFromLeadRequest(create_landing_page=True, theme="luxury"),
        current_user=current_user
    )

    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})

    if lead and lead.get("landing_page_id"):
        await publish_lead_landing_page(lead_id=lead_id, current_user=current_user)

    landing_page = None
    landing_page_url = listing_result.get("landing_page_url") or (lead.get("landing_page_url") if lead else None)
    if not landing_page_url and lead and lead.get("landing_page_id"):
        landing_page = await db.landing_pages.find_one({"id": lead["landing_page_id"]}, {"_id": 0})
        if landing_page:
            landing_page_url = _build_landing_url(landing_page["slug"])

    if not landing_page_url:
        landing_page_url = _get_site_url()

    lead_updates = {"landing_page_url": landing_page_url}
    if landing_page and landing_page.get("preview_url") != landing_page_url:
        await db.landing_pages.update_one(
            {"id": landing_page["id"]},
            {"$set": {"preview_url": landing_page_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    lead_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.property_leads.update_one(
        {"id": lead_id},
        {"$set": lead_updates}
    )

    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})

    # Add placeholder video once
    if lead and not lead.get("videos"):
        await upload_video_to_lead(
            lead_id=lead_id,
            video_url=VIDEO_PLACEHOLDER_URL,
            video_title=VIDEO_PLACEHOLDER_TITLE,
            current_user=current_user
        )

    # Kick off avatar video generation (async placeholder for now)
    try:
        avatar_image_url = composite_url or avatar_url or agent_info.get("image_url") or SAMPLE_AGENT_AVATAR_URL
        video_result = await generate_property_video(
            property_address=lead.get("address", "Property"),
            agent_image_url=avatar_image_url,
            agent_name=agent_info.get("name", "Agent"),
            custom_script=script
        )
        if video_result.get("success") and video_result.get("request_id"):
            request_id = video_result["request_id"]
            await db.property_leads.update_one(
                {"id": lead_id},
                {"$push": {"activity": {
                    "type": "avatar_video_requested",
                    "description": "Avatar video generation requested",
                    "user": current_user.get("name", "System"),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "data": {"request_id": request_id}
                }}}
            )
            skyreels = get_skyreels_service()
            for _ in range(6):
                await asyncio.sleep(10)
                status = await skyreels.check_task_status(request_id)
                video_url = status.get("video_url") if status else None
                if video_url:
                    await upload_video_to_lead(
                        lead_id=lead_id,
                        video_url=video_url,
                        video_title="Agent Intro (SkyReels)",
                        current_user=current_user
                    )
                    break
    except Exception:
        pass

    brochure_status = "failed"
    brochure_error = None
    brochure_url = None
    brochure_filename = None
    pdf_buffer = None

    try:
        pdf_buffer, brochure_filename = await generate_brochure(
            lead=lead,
            agent_info=agent_info,
            template="luxury",
            landing_page_url=landing_page_url
        )
        brochure_url = await _persist_brochure_pdf(lead_id, brochure_filename, pdf_buffer)
        brochure_status = "generated"
        now = datetime.now(timezone.utc).isoformat()
        await db.property_leads.update_one(
            {"id": lead_id},
            {
                "$set": {
                    "brochure_status": brochure_status,
                    "brochure_url": brochure_url,
                    "brochure_filename": brochure_filename,
                    "brochure_generated_at": now,
                    "automation_last_run_at": now,
                    "updated_at": now
                },
                "$push": {
                    "activity": {
                        "type": "brochure_generated",
                        "description": "Automation brochure generated",
                        "user": current_user.get("name", "System"),
                        "timestamp": now,
                        "data": {
                            "brochure_url": brochure_url,
                            "landing_page_url": landing_page_url
                        }
                    }
                }
            }
        )
    except Exception as exc:
        brochure_error = str(exc)
        now = datetime.now(timezone.utc).isoformat()
        await db.property_leads.update_one(
            {"id": lead_id},
            {
                "$set": {
                    "brochure_status": brochure_status,
                    "brochure_error": brochure_error,
                    "automation_last_run_at": now,
                    "updated_at": now
                },
                "$push": {
                    "activity": {
                        "type": "brochure_generation_failed",
                        "description": f"Automation brochure failed: {brochure_error}",
                        "user": current_user.get("name", "System"),
                        "timestamp": now
                    }
                }
            }
        )

    sent_to = []
    email_errors = []
    if brochure_status == "generated" and pdf_buffer and brochure_filename:
        for recipient in recipient_emails:
            try:
                pdf_buffer.seek(0)
                tracking_id = await _create_tracking_record(lead_id, recipient, landing_page_url)
                await _send_tracked_email(lead, recipient, pdf_buffer, brochure_filename, landing_page_url, tracking_id, agent_info)
                sent_to.append(recipient)
            except Exception as exc:
                email_errors.append({"recipient": recipient, "error": str(exc)})

    now = datetime.now(timezone.utc).isoformat()
    if sent_to:
        await db.property_leads.update_one(
            {"id": lead_id},
            {
                "$set": {"updated_at": now},
                "$push": {
                    "activity": {
                        "type": "automation_email_sent",
                        "description": f"Automation email sent to {', '.join(sent_to)}",
                        "user": current_user.get("name", "System"),
                        "timestamp": now,
                        "data": {
                            "recipients": sent_to,
                            "landing_page_url": landing_page_url,
                            "brochure_url": brochure_url
                        }
                    }
                }
            }
        )

    if email_errors:
        await db.property_leads.update_one(
            {"id": lead_id},
            {
                "$set": {"updated_at": now},
                "$push": {
                    "activity": {
                        "type": "automation_email_failed",
                        "description": "Automation email failed for one or more recipients",
                        "user": current_user.get("name", "System"),
                        "timestamp": now,
                        "data": {"errors": email_errors}
                    }
                }
            }
        )

    if not recipient_emails:
        email_status = "skipped"
    elif sent_to:
        email_status = "sent"
    elif email_errors:
        email_status = "failed"
    else:
        email_status = "skipped"

    return {
        "recipients": sent_to,
        "landing_page_url": landing_page_url,
        "brochure_status": brochure_status,
        "brochure_url": brochure_url,
        "brochure_filename": brochure_filename,
        "brochure_error": brochure_error,
        "email_status": email_status,
        "email_errors": email_errors
    }


async def run_expired_automation(test_emails: Optional[List[str]] = None, manual_trigger: bool = False) -> dict:
    settings = await get_expired_automation_settings()
    criteria = settings.get("criteria", DEFAULT_EXPIRED_CRITERIA)
    recipients = test_emails or settings.get("recipient_emails", DEFAULT_RECIPIENTS)
    avatar_url = settings.get("avatar_url") or SAMPLE_AGENT_AVATAR_URL

    if settings.get("enabled") is False:
        return {
            "paused": True,
            "message": "Expired listings automation is paused.",
            "search_result": {
                "message": "Automation paused",
                "new_listings": 0,
                "updated_listings": 0,
                "skipped_dead_leads": 0,
                "filtered_out": 0,
                "total_found": 0,
                "new_listing_ids": [],
                "matched_listing_ids": [],
                "search_criteria": criteria
            },
            "converted_leads": [],
            "lead_results": [],
            "conversion_errors": [],
            "recipients": recipients,
            "avatar_url": avatar_url,
            "test_max_leads": settings.get("test_max_leads", DEFAULT_TEST_MAX_LEADS) if manual_trigger else None
        }

    current_user = await get_admin_user()
    if not current_user:
        raise ValueError("No admin user found to run automation")

    from routes.expired_listings import SearchExpiredRequest, search_expired, convert_to_lead

    search_request = SearchExpiredRequest(
        city=criteria.get("city"),
        zip_codes=criteria.get("zip_codes"),
        min_price=criteria.get("min_price"),
        max_price=criteria.get("max_price"),
        bedrooms=criteria.get("bedrooms"),
        property_type=criteria.get("property_type"),
        exclude_rentals=criteria.get("exclude_rentals", True),
        exclude_commercial=criteria.get("exclude_commercial", True),
        days_expired=criteria.get("days_expired", DEFAULT_EXPIRED_CRITERIA["days_expired"]),
        required_year=criteria.get("required_year", DEFAULT_EXPIRED_CRITERIA["required_year"]),
        limit=criteria.get("limit", 50)
    )

    search_result = await search_expired(request=search_request, current_user=current_user)
    matched_ids = [mls_id for mls_id in search_result.get("matched_listing_ids", []) if mls_id]

    if matched_ids:
        active_candidates = await db.expired_listings.find(
            {
                "mls_id": {"$in": matched_ids},
                "sync_status": {"$ne": "converted"}
            },
            {"_id": 0, "mls_id": 1}
        ).to_list(len(matched_ids))
        active_ids = [doc.get("mls_id") for doc in active_candidates if doc.get("mls_id")]
        remaining_ids = [mls_id for mls_id in matched_ids if mls_id not in set(active_ids)]
        matched_ids = active_ids + remaining_ids

    if manual_trigger:
        test_max = settings.get("test_max_leads", DEFAULT_TEST_MAX_LEADS)
        if test_max and test_max > 0:
            matched_ids = matched_ids[:test_max]

    converted_leads = []
    lead_results = []
    conversion_errors = []

    for mls_id in matched_ids:
        try:
            result = await convert_to_lead(listing_id=mls_id, current_user=current_user)
            lead_id = result.get("lead_id")
            if lead_id:
                if lead_id not in converted_leads:
                    converted_leads.append(lead_id)
                marketing_result = await run_marketing_flow_for_lead(lead_id, recipients, current_user, avatar_url=avatar_url)
                lead_results.append({
                    "mls_id": mls_id,
                    "lead_id": lead_id,
                    "reused_existing_lead": result.get("message") == "Already converted to lead",
                    "landing_page_url": marketing_result.get("landing_page_url"),
                    "brochure_status": marketing_result.get("brochure_status"),
                    "brochure_url": marketing_result.get("brochure_url"),
                    "email_status": marketing_result.get("email_status"),
                    "email_errors": marketing_result.get("email_errors", []),
                    "visible_in_property_leads": True
                })
        except Exception as exc:
            error_text = str(exc)
            if "already exists for this property" in error_text.lower():
                existing = await db.property_leads.find_one({"mls_id": mls_id}, {"_id": 0, "id": 1})
                if existing and existing.get("id"):
                    try:
                        lead_id = existing["id"]
                        if lead_id not in converted_leads:
                            converted_leads.append(lead_id)
                        marketing_result = await run_marketing_flow_for_lead(lead_id, recipients, current_user, avatar_url=avatar_url)
                        lead_results.append({
                            "mls_id": mls_id,
                            "lead_id": lead_id,
                            "reused_existing_lead": True,
                            "landing_page_url": marketing_result.get("landing_page_url"),
                            "brochure_status": marketing_result.get("brochure_status"),
                            "brochure_url": marketing_result.get("brochure_url"),
                            "email_status": marketing_result.get("email_status"),
                            "email_errors": marketing_result.get("email_errors", []),
                            "visible_in_property_leads": True
                        })
                        continue
                    except Exception as retry_exc:
                        conversion_errors.append({"mls_id": mls_id, "error": str(retry_exc)})
                        continue
            conversion_errors.append({"mls_id": mls_id, "error": error_text})

    run_log = {
        "id": str(uuid.uuid4()),
        "type": "expired_daily",
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "manual_trigger": manual_trigger,
        "criteria": criteria,
        "matched_count": len(matched_ids),
        "converted_count": len(converted_leads),
        "lead_results": lead_results,
        "conversion_errors": conversion_errors,
        "recipients": recipients,
        "avatar_url": avatar_url,
        "test_max_leads": settings.get("test_max_leads", DEFAULT_TEST_MAX_LEADS) if manual_trigger else None
    }
    await db.automation_runs.insert_one(run_log)

    return {
        "search_result": search_result,
        "converted_leads": converted_leads,
        "lead_results": lead_results,
        "conversion_errors": conversion_errors,
        "recipients": recipients,
        "avatar_url": avatar_url,
        "test_max_leads": settings.get("test_max_leads", DEFAULT_TEST_MAX_LEADS) if manual_trigger else None
    }
