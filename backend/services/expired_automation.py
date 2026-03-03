"""
Expired Listings Automation Service
Runs daily expired search with criteria, auto-converts to leads, and triggers marketing.
"""
from datetime import datetime, timezone
from typing import List, Optional
from urllib.parse import quote
import os
import uuid

from database import db
from models.user import UserRole
from services.brochure_generator import generate_brochure
from services.skyreels_service import generate_property_video
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
    "limit": 50
}

DEFAULT_TEST_MAX_LEADS = 1

DEFAULT_RECIPIENTS = [
    "mel@a2gdesigns.com",
    "tampabay@tampabay.rr.com"
]

VIDEO_PLACEHOLDER_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
VIDEO_PLACEHOLDER_TITLE = "Agent Intro (Placeholder)"
SAMPLE_AGENT_AVATAR_URL = "https://customer-assets.emergentagent.com/job_86aec819-c311-4278-9c10-e6f793ce5e8f/artifacts/knqrnpef_62e3c47e-2d5d-4360-98c5-8f0b3968a3f4-removebg-preview.png"


def _get_site_url() -> str:
    site_url = os.environ.get("SITE_URL")
    if not site_url:
        raise ValueError("SITE_URL is not configured")
    return site_url.rstrip("/")


async def get_expired_automation_settings() -> dict:
    settings = await db.automation_settings.find_one({"type": "expired_daily"}, {"_id": 0})
    if settings:
        updates = {}
        now = datetime.now(timezone.utc).isoformat()
        if not settings.get("avatar_url"):
            updates["avatar_url"] = SAMPLE_AGENT_AVATAR_URL
        if settings.get("test_max_leads") is None:
            updates["test_max_leads"] = DEFAULT_TEST_MAX_LEADS
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

    if not recipient_emails:
        return {"recipients": [], "landing_page_url": None}

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

    listing_result = await create_listing_from_lead(
        lead_id=lead_id,
        request=CreateListingFromLeadRequest(create_landing_page=True, theme="luxury"),
        current_user=current_user
    )

    lead = await db.property_leads.find_one({"id": lead_id}, {"_id": 0})

    if lead and lead.get("landing_page_id"):
        await publish_lead_landing_page(lead_id=lead_id, current_user=current_user)

    landing_page = None
    landing_page_url = listing_result.get("landing_page_url")
    if not landing_page_url and lead and lead.get("landing_page_id"):
        landing_page = await db.landing_pages.find_one({"id": lead["landing_page_id"]}, {"_id": 0})
        landing_page_url = landing_page.get("preview_url") if landing_page else None

    if not landing_page_url:
        landing_page_url = _get_site_url()

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
        await generate_property_video(
            property_address=lead.get("address", "Property"),
            agent_image_url=avatar_url or agent_info.get("image_url") or SAMPLE_AGENT_AVATAR_URL,
            agent_name=agent_info.get("name", "Agent")
        )
    except Exception:
        pass

    pdf_buffer, filename = await generate_brochure(
        lead=lead,
        agent_info=agent_info,
        template="luxury",
        landing_page_url=landing_page_url
    )

    sent_to = []
    for recipient in recipient_emails:
        pdf_buffer.seek(0)
        tracking_id = await _create_tracking_record(lead_id, recipient, landing_page_url)
        await _send_tracked_email(lead, recipient, pdf_buffer, filename, landing_page_url, tracking_id, agent_info)
        sent_to.append(recipient)

    await db.property_leads.update_one(
        {"id": lead_id},
        {"$push": {
            "activity": {
                "type": "automation_email_sent",
                "description": f"Automation email sent to {', '.join(sent_to)}",
                "user": current_user.get("name", "System"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": {
                    "recipients": sent_to,
                    "landing_page_url": landing_page_url
                }
            }
        }}
    )

    return {"recipients": sent_to, "landing_page_url": landing_page_url}


async def run_expired_automation(test_emails: Optional[List[str]] = None, manual_trigger: bool = False) -> dict:
    settings = await get_expired_automation_settings()
    criteria = settings.get("criteria", DEFAULT_EXPIRED_CRITERIA)
    recipients = test_emails or settings.get("recipient_emails", DEFAULT_RECIPIENTS)
    avatar_url = settings.get("avatar_url") or SAMPLE_AGENT_AVATAR_URL

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
        limit=criteria.get("limit", 50)
    )

    search_result = await search_expired(request=search_request, current_user=current_user)
    matched_ids = [mls_id for mls_id in search_result.get("matched_listing_ids", []) if mls_id]

    if manual_trigger:
        test_max = settings.get("test_max_leads", DEFAULT_TEST_MAX_LEADS)
        if test_max and test_max > 0:
            matched_ids = matched_ids[:test_max]

    converted_leads = []
    conversion_errors = []

    for mls_id in matched_ids:
        try:
            result = await convert_to_lead(listing_id=mls_id, current_user=current_user)
            lead_id = result.get("lead_id")
            if lead_id:
                converted_leads.append(lead_id)
                await run_marketing_flow_for_lead(lead_id, recipients, current_user, avatar_url=avatar_url)
        except Exception as exc:
            conversion_errors.append({"mls_id": mls_id, "error": str(exc)})

    run_log = {
        "id": str(uuid.uuid4()),
        "type": "expired_daily",
        "ran_at": datetime.now(timezone.utc).isoformat(),
        "manual_trigger": manual_trigger,
        "criteria": criteria,
        "matched_count": len(matched_ids),
        "converted_count": len(converted_leads),
        "conversion_errors": conversion_errors,
        "recipients": recipients,
        "avatar_url": avatar_url,
        "test_max_leads": settings.get("test_max_leads", DEFAULT_TEST_MAX_LEADS) if manual_trigger else None
    }
    await db.automation_runs.insert_one(run_log)

    return {
        "search_result": search_result,
        "converted_leads": converted_leads,
        "conversion_errors": conversion_errors,
        "recipients": recipients,
        "avatar_url": avatar_url,
        "test_max_leads": settings.get("test_max_leads", DEFAULT_TEST_MAX_LEADS) if manual_trigger else None
    }
