from datetime import datetime, timezone
from typing import Any, Dict, List, Set
import os

from fastapi import APIRouter, Response

from database import db
from security.guards import is_public_safe_url

router = APIRouter()


def _site_url() -> str:
    site_url = os.environ.get("SITE_URL")
    if not site_url:
        raise ValueError("SITE_URL is required")
    return site_url.rstrip("/")


def _extract_document_urls(value: Any, output: Set[str]):
    if isinstance(value, dict):
        for item in value.values():
            _extract_document_urls(item, output)
        return

    if isinstance(value, list):
        for item in value:
            _extract_document_urls(item, output)
        return

    if not isinstance(value, str):
        return

    candidate = value.strip()
    if not candidate:
        return

    lowered = candidate.lower()
    if any(lowered.endswith(ext) for ext in [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".md"]):
        if is_public_safe_url(candidate):
            output.add(candidate)


def _xml_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def _build_url_entry(loc: str, lastmod: str = None) -> str:
    loc_xml = _xml_escape(loc)
    if lastmod:
        return f"<url><loc>{loc_xml}</loc><lastmod>{lastmod}</lastmod></url>"
    return f"<url><loc>{loc_xml}</loc></url>"


@router.get("/sitemap.xml")
async def sitemap_xml():
    site_url = _site_url()
    now = datetime.now(timezone.utc).date().isoformat()

    static_paths = [
        "/",
        "/showcase",
        "/about",
        "/mortgage-calculator",
        "/newsletter-archive",
        "/write-review",
    ]

    entries: List[str] = [_build_url_entry(f"{site_url}{path}", now) for path in static_paths]

    # Public property pages
    properties = await db.properties.find(
        {"slug": {"$exists": True, "$ne": ""}, "status": {"$ne": "draft"}},
        {"_id": 0, "slug": 1, "updated_at": 1}
    ).to_list(5000)
    for item in properties:
        slug = item.get("slug")
        if not slug:
            continue
        entries.append(_build_url_entry(f"{site_url}/property/{slug}", item.get("updated_at") or now))

    # Generated public landing pages
    landing_pages = await db.landing_pages.find(
        {"slug": {"$exists": True, "$ne": ""}},
        {"_id": 0, "slug": 1, "updated_at": 1}
    ).to_list(5000)
    for page in landing_pages:
        slug = page.get("slug")
        if not slug:
            continue
        entries.append(_build_url_entry(f"{site_url}/landing/{slug}", page.get("updated_at") or now))

    # Public booking pages
    booking_pages = await db.booking_pages.find(
        {"is_active": True, "agent_code": {"$exists": True, "$ne": ""}},
        {"_id": 0, "agent_code": 1, "updated_at": 1}
    ).to_list(5000)
    for booking in booking_pages:
        code = booking.get("agent_code")
        if not code:
            continue
        entries.append(_build_url_entry(f"{site_url}/book/{code}", booking.get("updated_at") or now))

    # User-added public documents from DB collections
    document_urls: Set[str] = set()
    collections_to_scan = ["properties", "property_leads", "landing_pages", "newsletters", "documents"]
    existing = set(await db.list_collection_names())
    for collection_name in collections_to_scan:
        if collection_name not in existing:
            continue
        async for doc in db[collection_name].find({}, {"_id": 0}):
            _extract_document_urls(doc, document_urls)

    for doc_url in sorted(document_urls):
        entries.append(_build_url_entry(doc_url, now))

    xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
    xml += "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"
    xml += "".join(entries)
    xml += "</urlset>"

    return Response(content=xml, media_type="application/xml")


@router.get("/robots.txt")
async def robots_txt():
    site_url = _site_url()
    content = "\n".join([
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "Disallow: /dashboard",
        "Disallow: /settings",
        f"Sitemap: {site_url}/api/seo/sitemap.xml",
    ])
    return Response(content=content, media_type="text/plain")
