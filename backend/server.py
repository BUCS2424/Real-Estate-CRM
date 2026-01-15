"""
Fusion Builder CRM API - Main Server
Refactored modular architecture
"""
import os
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI(
    title="Fusion Builder CRM API",
    description="Real Estate CRM Platform API",
    version="2.0.0"
)

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
        return {"message": "Data already seeded"}
    
    now = datetime.now(timezone.utc).isoformat()
    
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
    
    # Sample contacts
    contacts = [
        {"first_name": "John", "last_name": "Smith", "email": "john@example.com", "phone": "+1234567890", "status": "active", "category": "buyer"},
        {"first_name": "Sarah", "last_name": "Johnson", "email": "sarah@example.com", "phone": "+1234567891", "status": "active", "category": "seller"},
        {"first_name": "Michael", "last_name": "Brown", "email": "michael@example.com", "status": "lead", "category": "buyer"},
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
        await db.properties.insert_one({
            "id": str(uuid.uuid4()),
            **p,
            "lot_size": None,
            "year_built": 2020,
            "mls_number": None,
            "garage": 2,
            "pool": True,
            "waterfront": True,
            "created_by": super_user_id,
            "created_at": now
        })
    
    return {"message": "Data seeded successfully"}

# Include main API router
app.include_router(api_router)

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
