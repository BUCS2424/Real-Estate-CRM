from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import re
import os
import boto3
from botocore.config import Config
from database import db
from models.landing_page import (
    LandingPageCreate, 
    LandingPageUpdate, 
    LandingPageResponse,
    LandingPageStatus,
    VideoSource
)
from models.user import UserRole
from utils.auth import get_current_user

router = APIRouter()

# Landing page base URL
SITE_URL = os.environ.get("SITE_URL")


def get_site_url() -> str:
    if not SITE_URL:
        raise HTTPException(status_code=500, detail="SITE_URL is not configured")
    return SITE_URL.rstrip("/")


def build_preview_url(slug: str) -> str:
    return f"{get_site_url()}/landing/{slug}"

def generate_slug(address: str, city: str, state: str) -> str:
    """Generate URL-friendly slug from property address"""
    # Combine address parts
    full_address = f"{address} {city} {state}"
    # Convert to lowercase, replace spaces with hyphens, remove special chars
    slug = re.sub(r'[^a-z0-9\s-]', '', full_address.lower())
    slug = re.sub(r'[\s]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')

async def get_idrive_client():
    """Get configured iDrive S3 client if available"""
    from models.storage import StorageProviderType
    
    provider = await db.storage_providers.find_one({
        "provider_type": StorageProviderType.IDRIVE,
        "is_active": True
    })
    
    if not provider or not provider.get("credentials"):
        return None, None, None
    
    creds = provider["credentials"]
    settings = provider.get("settings", {})
    
    if not creds.get("access_key") or not creds.get("secret_key"):
        return None, None, None
    
    endpoint = settings.get("endpoint", "https://v2v7.la.idrivee2-14.com")
    
    client = boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=creds["access_key"],
        aws_secret_access_key=creds["secret_key"],
        config=Config(signature_version='s3v4')
    )
    
    bucket = settings.get("bucket", "")
    return client, bucket, endpoint

# ============ CRUD OPERATIONS ============

@router.get("/available-listings")
async def get_available_listings(current_user: dict = Depends(get_current_user)):
    """Get listings that don't have landing pages yet"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all listing IDs that already have landing pages
    existing_pages = await db.landing_pages.find({}, {"listing_id": 1, "_id": 0}).to_list(1000)
    existing_ids = [p["listing_id"] for p in existing_pages]
    
    # Get listings without landing pages
    query = {"id": {"$nin": existing_ids}} if existing_ids else {}
    listings = await db.properties.find(query, {"_id": 0}).to_list(1000)
    
    return listings

@router.post("", response_model=LandingPageResponse)
async def create_landing_page(page_data: LandingPageCreate, current_user: dict = Depends(get_current_user)):
    """Create a new landing page for a listing"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get the listing
    listing = await db.properties.find_one({"id": page_data.listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Check if landing page already exists for this listing
    existing = await db.landing_pages.find_one({"listing_id": page_data.listing_id})
    if existing:
        raise HTTPException(status_code=400, detail="Landing page already exists for this listing")
    
    # Generate slug from listing address
    slug = generate_slug(
        listing.get("address", "property"),
        listing.get("city", ""),
        listing.get("state", "")
    )
    
    # Ensure unique slug
    slug_exists = await db.landing_pages.find_one({"slug": slug})
    if slug_exists:
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"
    
    # Determine theme based on price if auto
    theme = page_data.theme
    if theme == "auto":
        price = listing.get("price", 0)
        theme = "luxury" if price >= 1000000 else "modern"
    
    now = datetime.now(timezone.utc).isoformat()
    
    landing_page = {
        "id": str(uuid.uuid4()),
        "listing_id": page_data.listing_id,
        "slug": slug,
        "custom_headline": page_data.custom_headline or listing.get("title", ""),
        "custom_description": page_data.custom_description or listing.get("description", ""),
        "videos": [v.model_dump() for v in page_data.videos],
        "additional_images": [img.model_dump() for img in page_data.additional_images],
        "virtual_tour_url": page_data.virtual_tour_url or "",
        "show_map": page_data.show_map,
        "show_contact_form": page_data.show_contact_form,
        "agent_name": page_data.agent_name or "",
        "agent_phone": page_data.agent_phone or "",
        "agent_email": page_data.agent_email or "",
        "agent_photo": page_data.agent_photo or "",
        "theme": theme,
        "status": LandingPageStatus.DRAFT,
        "preview_url": build_preview_url(slug),
        "created_at": now,
        "updated_at": now
    }
    
    await db.landing_pages.insert_one(landing_page)
    landing_page.pop("_id", None)
    landing_page["listing"] = listing
    
    return LandingPageResponse(**landing_page)

@router.get("")
async def get_landing_pages(current_user: dict = Depends(get_current_user)):
    """Get all landing pages"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pages = await db.landing_pages.find({}, {"_id": 0}).to_list(1000)
    
    # Populate listing data
    for page in pages:
        listing = await db.properties.find_one({"id": page["listing_id"]}, {"_id": 0})
        page["listing"] = listing
        page["preview_url"] = build_preview_url(page["slug"])
    
    return pages

@router.get("/{page_id}")
async def get_landing_page(page_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific landing page"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    page = await db.landing_pages.find_one({"id": page_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Landing page not found")
    
    listing = await db.properties.find_one({"id": page["listing_id"]}, {"_id": 0})
    page["listing"] = listing
    page["preview_url"] = build_preview_url(page["slug"])
    
    return page

@router.put("/{page_id}")
async def update_landing_page(page_id: str, updates: LandingPageUpdate, current_user: dict = Depends(get_current_user)):
    """Update a landing page"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    page = await db.landing_pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Landing page not found")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    
    if "videos" in update_data:
        update_data["videos"] = [v if isinstance(v, dict) else v.model_dump() for v in update_data["videos"]]
    if "additional_images" in update_data:
        update_data["additional_images"] = [img if isinstance(img, dict) else img.model_dump() for img in update_data["additional_images"]]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.landing_pages.update_one({"id": page_id}, {"$set": update_data})
    
    updated = await db.landing_pages.find_one({"id": page_id}, {"_id": 0})
    listing = await db.properties.find_one({"id": updated["listing_id"]}, {"_id": 0})
    updated["listing"] = listing
    
    return updated

@router.delete("/{page_id}")
async def delete_landing_page(page_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a landing page"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.landing_pages.delete_one({"id": page_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Landing page not found")
    
    return {"message": "Landing page deleted"}

@router.post("/{page_id}/publish")
async def publish_landing_page(page_id: str, current_user: dict = Depends(get_current_user)):
    """Publish a landing page"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    page = await db.landing_pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Landing page not found")
    
    await db.landing_pages.update_one(
        {"id": page_id},
        {"$set": {
            "status": LandingPageStatus.PUBLISHED,
            "preview_url": build_preview_url(page["slug"]),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Landing page published", "url": build_preview_url(page["slug"])}

@router.post("/{page_id}/unpublish")
async def unpublish_landing_page(page_id: str, current_user: dict = Depends(get_current_user)):
    """Unpublish a landing page"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.landing_pages.update_one(
        {"id": page_id},
        {"$set": {"status": LandingPageStatus.DRAFT, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Landing page not found")
    
    return {"message": "Landing page unpublished"}

# ============ VIDEO UPLOAD ============

@router.post("/{page_id}/upload-video")
async def upload_video(
    page_id: str,
    file: UploadFile = File(...),
    title: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    """Upload a video to iDrive storage"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    page = await db.landing_pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Landing page not found")
    
    # Get the property's storage folder
    listing = await db.properties.find_one({"id": page["listing_id"]}, {"_id": 0})
    storage_folder = listing.get("storage_folder") if listing else None
    
    # Get iDrive client
    client, bucket, endpoint = await get_idrive_client()
    if not client or not bucket:
        raise HTTPException(status_code=400, detail="iDrive storage not configured. Please set up iDrive in Developer Settings.")
    
    # Use property's storage folder or fallback to landing-pages path
    base_path = storage_folder if storage_folder else f"landing-pages/{page['slug']}"
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'mp4'
    file_key = f"{base_path}/videos/{str(uuid.uuid4())}.{file_ext}"
    
    try:
        # Upload to iDrive
        content = await file.read()
        client.put_object(
            Bucket=bucket,
            Key=file_key,
            Body=content,
            ContentType=file.content_type or 'video/mp4'
        )
        
        # Generate public URL
        video_url = f"{endpoint}/{bucket}/{file_key}"
        
        # Add video to landing page
        video_item = {
            "id": str(uuid.uuid4()),
            "source": VideoSource.UPLOAD,
            "url": video_url,
            "title": title or file.filename,
            "thumbnail": "",
            "order": len(page.get("videos", []))
        }
        
        await db.landing_pages.update_one(
            {"id": page_id},
            {
                "$push": {"videos": video_item},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {"message": "Video uploaded", "video": video_item}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/{page_id}/upload-image")
async def upload_image(
    page_id: str,
    file: UploadFile = File(...),
    caption: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    """Upload an image to iDrive storage"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    page = await db.landing_pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Landing page not found")
    
    # Get the property's storage folder
    listing = await db.properties.find_one({"id": page["listing_id"]}, {"_id": 0})
    storage_folder = listing.get("storage_folder") if listing else None
    
    # Get iDrive client
    client, bucket, endpoint = await get_idrive_client()
    if not client or not bucket:
        raise HTTPException(status_code=400, detail="iDrive storage not configured")
    
    # Use property's storage folder or fallback to landing-pages path
    base_path = storage_folder if storage_folder else f"landing-pages/{page['slug']}"
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    file_key = f"{base_path}/images/{str(uuid.uuid4())}.{file_ext}"
    
    try:
        content = await file.read()
        client.put_object(
            Bucket=bucket,
            Key=file_key,
            Body=content,
            ContentType=file.content_type or 'image/jpeg'
        )
        
        image_url = f"{endpoint}/{bucket}/{file_key}"
        
        image_item = {
            "id": str(uuid.uuid4()),
            "url": image_url,
            "caption": caption,
            "order": len(page.get("additional_images", []))
        }
        
        await db.landing_pages.update_one(
            {"id": page_id},
            {
                "$push": {"additional_images": image_item},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {"message": "Image uploaded", "image": image_item}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# ============ PUBLIC ENDPOINT ============

@router.get("/public/{slug}")
async def get_public_landing_page(slug: str):
    """Get published landing page by slug (public, no auth)"""
    page = await db.landing_pages.find_one(
        {"slug": slug, "status": LandingPageStatus.PUBLISHED},
        {"_id": 0}
    )
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    listing = await db.properties.find_one({"id": page["listing_id"]}, {"_id": 0})
    page["listing"] = listing
    
    return page

@router.post("/public/{slug}/contact")
async def submit_contact_form(slug: str, contact_data: dict):
    """Submit contact form from landing page - creates a Lead"""
    page = await db.landing_pages.find_one(
        {"slug": slug, "status": LandingPageStatus.PUBLISHED}
    )
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    listing = await db.properties.find_one({"id": page["listing_id"]}, {"_id": 0})
    
    # Create lead from contact form
    lead = {
        "id": str(uuid.uuid4()),
        "name": contact_data.get("name", ""),
        "email": contact_data.get("email", ""),
        "phone": contact_data.get("phone", ""),
        "source": "landing_page",
        "source_details": f"Property: {listing.get('address', '')} - {page['slug']}",
        "property_interest": listing.get("address", ""),
        "budget": listing.get("price", 0),
        "message": contact_data.get("message", ""),
        "status": "new",
        "lead_type": "buyer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.leads.insert_one(lead)
    
    return {"message": "Thank you for your inquiry! We'll be in touch soon."}
