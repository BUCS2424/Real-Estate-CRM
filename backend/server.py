"""
Fusion Builder CRM API - Main Server
Refactored modular architecture
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Initialize FastAPI app
app = FastAPI(
    title="Fusion Builder CRM API",
    description="Real Estate CRM Platform API",
    version="2.0.0"
)

# Ensure static directories exist
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
SITE_IMAGES_DIR = os.path.join(STATIC_DIR, "site-images")
os.makedirs(SITE_IMAGES_DIR, exist_ok=True)

# Import database
from database import db, close_db

# Import and include all routers
from routes import api_router

# Add seed endpoint directly to api_router
@api_router.post("/seed")
async def seed_data():
    """Seed initial data for the application"""
    from utils.auth import hash_password
    from models.user import UserRole
    
    # Check if super user exists
    existing = await db.users.find_one({"email": "mel@a2gdesigns.com"})
    if existing:
        # Still update branding in case it's missing
        await db.general_settings.update_one(
            {},
            {"$set": {
                "siteName": "Hidden Haven Realty",
                "logoUrl": "https://customer-assets.emergentagent.com/job_096c795f-2f6d-4346-886a-63ca7ee0963b/artifacts/3cycoznd_hidden-haven-realty-site-top.png",
                "dashboardLogoUrl": "https://customer-assets.emergentagent.com/job_096c795f-2f6d-4346-886a-63ca7ee0963b/artifacts/3cycoznd_hidden-haven-realty-site-top.png",
                "faviconUrl": "https://customer-assets.emergentagent.com/job_096c795f-2f6d-4346-886a-63ca7ee0963b/artifacts/0gvwgebj_hidden-haven-realty.png",
                "pwaIconUrl": "https://customer-assets.emergentagent.com/job_096c795f-2f6d-4346-886a-63ca7ee0963b/artifacts/0gvwgebj_hidden-haven-realty.png",
                "logoLinkUrl": "/",
                "dashboardLogoLinkUrl": "/dashboard"
            }},
            upsert=True
        )
        return {"message": "Data already seeded, branding updated"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create branding/general settings FIRST
    await db.general_settings.update_one(
        {},
        {"$set": {
            "siteName": "Hidden Haven Realty",
            "logoUrl": "https://customer-assets.emergentagent.com/job_096c795f-2f6d-4346-886a-63ca7ee0963b/artifacts/3cycoznd_hidden-haven-realty-site-top.png",
            "dashboardLogoUrl": "https://customer-assets.emergentagent.com/job_096c795f-2f6d-4346-886a-63ca7ee0963b/artifacts/3cycoznd_hidden-haven-realty-site-top.png",
            "faviconUrl": "https://customer-assets.emergentagent.com/job_096c795f-2f6d-4346-886a-63ca7ee0963b/artifacts/0gvwgebj_hidden-haven-realty.png",
            "pwaIconUrl": "https://customer-assets.emergentagent.com/job_096c795f-2f6d-4346-886a-63ca7ee0963b/artifacts/0gvwgebj_hidden-haven-realty.png",
            "logoLinkUrl": "/",
            "dashboardLogoLinkUrl": "/dashboard"
        }},
        upsert=True
    )
    
    # Create super user
    super_user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": super_user_id,
        "email": "mel@a2gdesigns.com",
        "password": hash_password("BigDaddy2016!!"),
        "name": "Mel Admin",
        "role": UserRole.SUPERUSER,
        "created_at": now
    })
    
    # Create settings for super user
    await db.settings.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": super_user_id,
        "notifications_email": True,
        "notifications_sms": False,
        "theme": "system"
    })
    
    # Create booking settings
    await db.booking_settings.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": super_user_id,
        "agent_name": "Sheila Desautels",
        "agent_title": "Luxury Real Estate Specialist",
        "agent_code": "sheila",
        "default_duration": 30,
        "buffer_time": 15,
        "availability": [
            {"day_of_week": i, "start_time": "09:00", "end_time": "17:00", "is_available": i < 5}
            for i in range(7)
        ],
        "booking_window_days": 30,
        "max_daily_bookings": 8,
        "created_at": now,
        "updated_at": now
    })
    
    # Sample contacts - WITH first_name and last_name
    contacts = [
        {"first_name": "John", "last_name": "Smith", "name": "John Smith", "email": "john@example.com", "phone": "+1234567890", "status": "active", "category": "buyer"},
        {"first_name": "Sarah", "last_name": "Johnson", "name": "Sarah Johnson", "email": "sarah@example.com", "phone": "+1234567891", "status": "active", "category": "seller"},
        {"first_name": "Michael", "last_name": "Brown", "name": "Michael Brown", "email": "michael@example.com", "status": "lead", "category": "buyer"},
    ]
    
    for c in contacts:
        await db.contacts.insert_one({
            "id": str(uuid.uuid4()),
            **c,
            "company": None,
            "position": None,
            "source": "seed",
            "notes": None,
            "tags": [],
            "lead_score": 50,
            "created_at": now
        })
    
    # Sample properties
    properties = [
        {
            "address": "123 Ocean Drive",
            "city": "Miami Beach",
            "state": "FL",
            "zip_code": "33139",
            "price": 2500000,
            "bedrooms": 4,
            "bathrooms": 3.5,
            "sqft": 3500,
            "property_type": "single_family",
            "status": "active",
            "description": "Stunning oceanfront property with panoramic views",
            "features": ["Pool", "Ocean View", "Smart Home"],
            "images": [{"url": "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800", "is_primary": True}]
        },
        {
            "address": "456 Palm Avenue",
            "city": "Fort Lauderdale",
            "state": "FL",
            "zip_code": "33301",
            "price": 1800000,
            "bedrooms": 3,
            "bathrooms": 2.5,
            "sqft": 2800,
            "property_type": "condo",
            "status": "active",
            "description": "Luxury waterfront condo with private dock",
            "features": ["Waterfront", "Private Dock", "Gym"],
            "images": [{"url": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800", "is_primary": True}]
        }
    ]
    
    for p in properties:
        prop_id = str(uuid.uuid4())
        # Create storage folder slug from address
        address_slug = p["address"].lower().replace(" ", "-").replace(",", "")
        storage_folder = f"properties/{address_slug}-{prop_id[:8]}"
        
        await db.properties.insert_one({
            "id": prop_id,
            **p,
            "lot_size": None,
            "year_built": 2020,
            "mls_number": None,
            "garage": 2,
            "pool": True,
            "waterfront": True,
            "storage_folder": storage_folder,
            "created_by": super_user_id,
            "created_at": now
        })
    
    return {"message": "Data seeded successfully"}

@api_router.post("/reset-admin-password")
async def reset_admin_password():
    """Reset the admin password - use this if login fails due to corrupted password hash"""
    from utils.auth import hash_password
    
    # Find the admin user
    user = await db.users.find_one({"email": "mel@a2gdesigns.com"})
    if not user:
        return {"success": False, "message": "Admin user not found. Run /api/seed first."}
    
    # Reset password with fresh hash
    new_hash = hash_password("BigDaddy2016!!")
    await db.users.update_one(
        {"email": "mel@a2gdesigns.com"},
        {"$set": {"password": new_hash}}
    )
    
    return {"success": True, "message": "Admin password has been reset. You can now login with mel@a2gdesigns.com / BigDaddy2016!!"}

@api_router.post("/fix-database")
async def fix_database():
    """Fix database issues - repairs contacts missing required fields"""
    fixed_count = 0
    
    # Fix contacts missing first_name or last_name
    contacts_cursor = db.contacts.find({
        "$or": [
            {"first_name": {"$exists": False}},
            {"last_name": {"$exists": False}}
        ]
    })
    
    async for contact in contacts_cursor:
        name = contact.get('name', 'Unknown Contact')
        parts = name.split(' ', 1)
        first_name = parts[0] if parts else 'Unknown'
        last_name = parts[1] if len(parts) > 1 else ''
        
        await db.contacts.update_one(
            {"id": contact['id']},
            {"$set": {"first_name": first_name, "last_name": last_name}}
        )
        fixed_count += 1
    
    return {
        "success": True, 
        "message": f"Database fixed. Repaired {fixed_count} contacts.",
        "fixed_contacts": fixed_count
    }

# ============ SITE IMAGES ENDPOINTS ============
from utils.auth import get_current_user
from models.user import UserRole

@api_router.post("/site-images/upload")
async def upload_site_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload an image to the site-images folder (for logos, branding, etc.)"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate file type
    allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: PNG, JPEG, GIF, WebP, SVG, ICO")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    unique_name = f"{uuid.uuid4().hex[:12]}.{ext}"
    file_path = os.path.join(SITE_IMAGES_DIR, unique_name)
    
    # Save file
    content = await file.read()
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Build the URL from the request
    # Use X-Forwarded headers if behind proxy, otherwise use request base
    forwarded_proto = request.headers.get('x-forwarded-proto', 'https')
    forwarded_host = request.headers.get('x-forwarded-host', request.headers.get('host', 'localhost:8001'))
    base_url = f"{forwarded_proto}://{forwarded_host}"
    
    file_url = f"{base_url}/api/static/site-images/{unique_name}"
    
    return {
        "success": True,
        "message": "Image uploaded successfully",
        "filename": unique_name,
        "url": file_url,
        "size": len(content)
    }

@api_router.get("/site-images")
async def list_site_images(request: Request, current_user: dict = Depends(get_current_user)):
    """List all images in the site-images folder"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build the URL from the request
    forwarded_proto = request.headers.get('x-forwarded-proto', 'https')
    forwarded_host = request.headers.get('x-forwarded-host', request.headers.get('host', 'localhost:8001'))
    base_url = f"{forwarded_proto}://{forwarded_host}"
    
    images = []
    if os.path.exists(SITE_IMAGES_DIR):
        for filename in os.listdir(SITE_IMAGES_DIR):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico')):
                file_path = os.path.join(SITE_IMAGES_DIR, filename)
                images.append({
                    "filename": filename,
                    "url": f"{base_url}/api/static/site-images/{filename}",
                    "size": os.path.getsize(file_path)
                })
    
    return {"images": images, "count": len(images)}

@api_router.delete("/site-images/{filename}")
async def delete_site_image(filename: str, current_user: dict = Depends(get_current_user)):
    """Delete an image from the site-images folder"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Security: prevent path traversal
    if '/' in filename or '\\' in filename or '..' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = os.path.join(SITE_IMAGES_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    os.remove(file_path)
    return {"success": True, "message": f"Image '{filename}' deleted"}


@api_router.put("/site-images/{filename}/rename")
async def rename_site_image(filename: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Rename an image in the site-images folder"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Security: prevent path traversal
    if '/' in filename or '\\' in filename or '..' in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    data = await request.json()
    new_name = data.get("new_name", "").strip()
    
    if not new_name:
        raise HTTPException(status_code=400, detail="New name is required")
    
    # Security: prevent path traversal in new name
    if '/' in new_name or '\\' in new_name or '..' in new_name:
        raise HTTPException(status_code=400, detail="Invalid new filename")
    
    old_path = os.path.join(SITE_IMAGES_DIR, filename)
    new_path = os.path.join(SITE_IMAGES_DIR, new_name)
    
    if not os.path.exists(old_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    if os.path.exists(new_path):
        raise HTTPException(status_code=400, detail="A file with that name already exists")
    
    os.rename(old_path, new_path)
    
    base_url = str(request.base_url).rstrip('/')
    return {
        "success": True, 
        "message": f"Image renamed to '{new_name}'",
        "new_url": f"{base_url}/api/static/site-images/{new_name}"
    }


# Include main API router
app.include_router(api_router)

# Mount static files AFTER api_router to serve at /api/static/site-images/*
app.mount("/api/static", StaticFiles(directory=STATIC_DIR), name="static")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    close_db()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}
