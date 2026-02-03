from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re
import os
import boto3
from botocore.config import Config
from database import db
from models.property import PropertyListingCreate, PropertyListingResponse, PropertySubmissionCreate, PropertySubmissionResponse
from models.user import UserRole
from utils.auth import get_current_user, require_role

router = APIRouter()

def generate_storage_folder(address: str, city: str, state: str) -> str:
    """Generate a consistent storage folder path from property address"""
    # Combine address parts
    full_address = f"{address} {city} {state}"
    # Convert to lowercase, replace spaces with hyphens, remove special chars
    folder = re.sub(r'[^a-z0-9\s-]', '', full_address.lower())
    folder = re.sub(r'[\s]+', '-', folder)
    folder = re.sub(r'-+', '-', folder)
    return f"properties/{folder.strip('-')}"

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

async def create_property_folder(storage_folder: str):
    """Create a folder in iDrive for the property (creates a placeholder object)"""
    client, bucket, endpoint = await get_idrive_client()
    if not client or not bucket:
        return None  # iDrive not configured, skip folder creation
    
    try:
        # S3 doesn't have real folders, but we can create a placeholder object
        # This ensures the "folder" appears in the bucket listing
        placeholder_key = f"{storage_folder}/.folder"
        client.put_object(
            Bucket=bucket,
            Key=placeholder_key,
            Body=b'',
            ContentType='application/x-directory'
        )
        return f"{endpoint}/{bucket}/{storage_folder}"
    except Exception as e:
        print(f"Warning: Could not create property folder in iDrive: {e}")
        return None

async def delete_property_folder(storage_folder: str):
    """Delete all files in a property's folder from iDrive"""
    client, bucket, endpoint = await get_idrive_client()
    if not client or not bucket or not storage_folder:
        return
    
    try:
        # List all objects with the folder prefix
        response = client.list_objects_v2(Bucket=bucket, Prefix=storage_folder)
        
        if 'Contents' in response:
            # Delete all objects in the folder
            objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
            if objects_to_delete:
                client.delete_objects(
                    Bucket=bucket,
                    Delete={'Objects': objects_to_delete}
                )
        print(f"Deleted property folder: {storage_folder}")
    except Exception as e:
        print(f"Warning: Could not delete property folder from iDrive: {e}")

# Seed luxury properties endpoint
@router.post("/properties/seed-luxury")
async def seed_luxury_listings(current_user: dict = Depends(get_current_user)):
    """Seed sample Florida luxury listings for demo purposes"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc).isoformat()
    
    sample_listings = [
        {
            "id": str(uuid.uuid4()),
            "address": "1200 S Ocean Blvd",
            "city": "Palm Beach",
            "state": "FL",
            "zip_code": "33480",
            "price": 45000000,
            "bedrooms": 8,
            "bathrooms": 12,
            "sqft": 18500,
            "lot_size": 1.2,
            "property_type": "single_family",
            "status": "active",
            "description": "An extraordinary oceanfront estate on prestigious South Ocean Boulevard, this Palm Beach masterpiece offers unparalleled luxury living. With 200 feet of pristine beach frontage, the residence features a grand foyer, formal living spaces, gourmet chef's kitchen, and a spectacular infinity pool overlooking the Atlantic. The estate includes a private beach cabana, tennis court, and meticulously landscaped grounds.",
            "features": ["Oceanfront", "Private Beach", "Infinity Pool", "Tennis Court", "Wine Cellar", "Smart Home", "Guest House"],
            "images": [{"url": "https://images.unsplash.com/photo-1578439297699-eb414262c2de?w=800&q=80", "caption": "Exterior", "is_primary": True, "order": 0}],
            "year_built": 2019,
            "garage": 6,
            "pool": True,
            "waterfront": True,
            "created_by": current_user["id"],
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "address": "45 Star Island Dr",
            "city": "Miami Beach",
            "state": "FL",
            "zip_code": "33139",
            "price": 65000000,
            "bedrooms": 11,
            "bathrooms": 14,
            "sqft": 22000,
            "lot_size": 1.8,
            "property_type": "single_family",
            "status": "active",
            "description": "Welcome to Star Island's most magnificent estate—a trophy property offering complete privacy and breathtaking Biscayne Bay views. This newly constructed modern masterpiece features soaring ceilings, walls of glass, and seamless indoor-outdoor living. Amenities include a resort-style pool, private dock for a 100-foot yacht, rooftop terrace, home theater, and a wellness spa.",
            "features": ["Waterfront", "Private Dock", "Resort Pool", "Home Theater", "Spa", "Rooftop Terrace", "Staff Quarters"],
            "images": [{"url": "https://images.unsplash.com/photo-1607142426460-0185c446f1d7?w=800&q=80", "caption": "Exterior", "is_primary": True, "order": 0}],
            "year_built": 2022,
            "garage": 8,
            "pool": True,
            "waterfront": True,
            "created_by": current_user["id"],
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "address": "2800 Gordon Dr",
            "city": "Naples",
            "state": "FL",
            "zip_code": "34102",
            "price": 38500000,
            "bedrooms": 6,
            "bathrooms": 8,
            "sqft": 12000,
            "lot_size": 0.8,
            "property_type": "single_family",
            "status": "active",
            "description": "Situated in the ultra-exclusive Port Royal community, this Gulf-front estate epitomizes Naples luxury. The British West Indies architecture blends seamlessly with lush tropical landscaping. Features include a gourmet kitchen, wine room, library, and expansive outdoor entertaining areas. The private beach, heated pool, and boat dock complete this exceptional offering.",
            "features": ["Gulf Front", "Private Beach", "Boat Dock", "Wine Room", "Library", "Heated Pool", "Outdoor Kitchen"],
            "images": [{"url": "https://images.unsplash.com/photo-1623701675999-9406ece2d150?w=800&q=80", "caption": "Exterior", "is_primary": True, "order": 0}],
            "year_built": 2017,
            "garage": 4,
            "pool": True,
            "waterfront": True,
            "created_by": current_user["id"],
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "address": "100 Arvida Pkwy",
            "city": "Coral Gables",
            "state": "FL",
            "zip_code": "33156",
            "price": 29000000,
            "bedrooms": 7,
            "bathrooms": 9,
            "sqft": 14500,
            "lot_size": 1.5,
            "property_type": "single_family",
            "status": "active",
            "description": "A stunning Mediterranean Revival estate in the prestigious Gables Estates guard-gated community. This waterfront sanctuary offers 150 feet on the bay with a private dock and direct ocean access. The home features imported stone floors, custom millwork, a chef's dream kitchen, and a two-story library. The resort-style grounds include a pool, spa, cabana, and championship tennis court.",
            "features": ["Waterfront", "Gated Community", "Tennis Court", "Pool & Spa", "Direct Ocean Access", "Two-Story Library", "Cabana"],
            "images": [{"url": "https://images.unsplash.com/photo-1600137444380-ce5aea5c43c8?w=800&q=80", "caption": "Exterior", "is_primary": True, "order": 0}],
            "year_built": 2015,
            "garage": 5,
            "pool": True,
            "waterfront": True,
            "created_by": current_user["id"],
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "address": "3100 N Ocean Blvd",
            "city": "Fort Lauderdale",
            "state": "FL",
            "zip_code": "33308",
            "price": 52000000,
            "bedrooms": 9,
            "bathrooms": 11,
            "sqft": 19800,
            "lot_size": 2.1,
            "property_type": "single_family",
            "status": "active",
            "description": "An architectural triumph on Fort Lauderdale's prestigious beach. This contemporary oceanfront compound spans two acres with 300 feet of beach frontage. The main residence and guest house feature floor-to-ceiling glass, disappearing walls, and the finest finishes. Amenities include an oceanfront pool, professional gym, recording studio, and a 12-car collector's garage.",
            "features": ["Oceanfront", "Guest House", "Recording Studio", "Collector Garage", "Professional Gym", "Oceanfront Pool", "Beach Frontage"],
            "images": [{"url": "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80", "caption": "Exterior", "is_primary": True, "order": 0}],
            "year_built": 2021,
            "garage": 12,
            "pool": True,
            "waterfront": True,
            "created_by": current_user["id"],
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "address": "888 S Ocean Blvd",
            "city": "Boca Raton",
            "state": "FL",
            "zip_code": "33432",
            "price": 34500000,
            "bedrooms": 7,
            "bathrooms": 10,
            "sqft": 15200,
            "lot_size": 1.1,
            "property_type": "single_family",
            "status": "active",
            "description": "Perched on a bluff overlooking the Atlantic, this newly constructed modern estate redefines oceanfront luxury in Boca Raton. Clean lines, expansive glass, and an open floor plan create a seamless connection to the sea. The property features a negative-edge pool, outdoor summer kitchen, private beach access, and a separate staff wing.",
            "features": ["Oceanfront", "Modern Design", "Negative-Edge Pool", "Private Beach Access", "Staff Wing", "Summer Kitchen", "Smart Home"],
            "images": [{"url": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", "caption": "Exterior", "is_primary": True, "order": 0}],
            "year_built": 2023,
            "garage": 4,
            "pool": True,
            "waterfront": True,
            "created_by": current_user["id"],
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "address": "150 Clarendon Ave",
            "city": "Palm Beach",
            "state": "FL",
            "zip_code": "33480",
            "price": 78000000,
            "bedrooms": 12,
            "bathrooms": 16,
            "sqft": 28000,
            "lot_size": 3.2,
            "property_type": "single_family",
            "status": "active",
            "description": "The crown jewel of Palm Beach—a historic lakefront estate meticulously restored and expanded to modern standards. Set on over 3 acres with 450 feet of Lake Worth frontage, the property includes the main mansion, two guest houses, a pool pavilion, and formal gardens designed by a renowned landscape architect. A private dock accommodates large yachts.",
            "features": ["Lakefront", "Historic Estate", "Guest Houses", "Formal Gardens", "Private Dock", "Pool Pavilion", "450ft Frontage"],
            "images": [{"url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", "caption": "Exterior", "is_primary": True, "order": 0}],
            "year_built": 1928,
            "garage": 8,
            "pool": True,
            "waterfront": True,
            "created_by": current_user["id"],
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "address": "5000 Island Estates Dr",
            "city": "Aventura",
            "state": "FL",
            "zip_code": "33160",
            "price": 41000000,
            "bedrooms": 8,
            "bathrooms": 10,
            "sqft": 16500,
            "lot_size": 0.9,
            "property_type": "single_family",
            "status": "active",
            "description": "A spectacular contemporary waterfront residence on the exclusive Island Estates. This smart home features floor-to-ceiling windows, a dramatic floating staircase, and museum-quality gallery spaces. The outdoor oasis includes an infinity pool, covered terraces, and a 90-foot dock. Minutes to Bal Harbour shops and world-class dining.",
            "features": ["Waterfront", "Contemporary Design", "Infinity Pool", "Private Dock", "Gallery Spaces", "Smart Home", "Floating Staircase"],
            "images": [{"url": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80", "caption": "Exterior", "is_primary": True, "order": 0}],
            "year_built": 2020,
            "garage": 6,
            "pool": True,
            "waterfront": True,
            "created_by": current_user["id"],
            "created_at": now
        }
    ]
    
    # Insert all sample listings
    await db.properties.insert_many(sample_listings)
    return {"message": f"Successfully created {len(sample_listings)} luxury listings"}

# Property Listings
@router.post("/properties", response_model=PropertyListingResponse)
async def create_property(property_data: PropertyListingCreate, current_user: dict = Depends(get_current_user)):
    property_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate storage folder path for this property
    storage_folder = generate_storage_folder(
        property_data.address,
        property_data.city,
        property_data.state
    )
    
    property_doc = {
        "id": property_id,
        **property_data.model_dump(),
        "storage_folder": storage_folder,  # Persistent storage folder for all property files
        "created_by": current_user["id"],
        "created_at": now
    }
    await db.properties.insert_one(property_doc)
    
    # Create the folder in iDrive (if configured)
    await create_property_folder(storage_folder)
    
    property_doc.pop("_id", None)
    return PropertyListingResponse(**property_doc)

@router.get("/properties", response_model=List[PropertyListingResponse])
async def list_properties(
    status: Optional[str] = None,
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if property_type:
        query["property_type"] = property_type
    if min_price:
        query["price"] = {"$gte": min_price}
    if max_price:
        query.setdefault("price", {})["$lte"] = max_price
    
    properties = await db.properties.find(query, {"_id": 0}).to_list(1000)
    return properties

# =========== LISTINGS ALIASES FOR FRONTEND COMPATIBILITY ===========
@router.get("/listings")
async def list_listings(current_user: dict = Depends(get_current_user)):
    """Alias for /properties for frontend compatibility"""
    properties = await db.properties.find({}, {"_id": 0}).to_list(1000)
    return properties

@router.post("/listings/migrate-storage-folders")
async def migrate_storage_folders(current_user: dict = Depends(get_current_user)):
    """Add storage folders to existing properties that don't have them"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find properties without storage folders
    properties = await db.properties.find(
        {"$or": [{"storage_folder": None}, {"storage_folder": {"$exists": False}}]},
        {"_id": 0}
    ).to_list(1000)
    
    updated_count = 0
    for prop in properties:
        storage_folder = generate_storage_folder(
            prop.get("address", "property"),
            prop.get("city", ""),
            prop.get("state", "")
        )
        
        await db.properties.update_one(
            {"id": prop["id"]},
            {"$set": {"storage_folder": storage_folder}}
        )
        
        # Create folder in iDrive if configured
        await create_property_folder(storage_folder)
        updated_count += 1
    
    return {"message": f"Migrated {updated_count} properties with storage folders"}

@router.get("/listings/{listing_id}")
async def get_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    """Alias for /properties/{id} for frontend compatibility"""
    prop = await db.properties.find_one({"id": listing_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Listing not found")
    return prop

@router.post("/listings")
async def create_listing(listing: PropertyListingCreate, current_user: dict = Depends(get_current_user)):
    """Alias for /properties POST for frontend compatibility"""
    listing_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate storage folder path for this property
    storage_folder = generate_storage_folder(
        listing.address,
        listing.city,
        listing.state
    )
    
    listing_doc = {
        "id": listing_id,
        **listing.model_dump(),
        "storage_folder": storage_folder,  # Persistent storage folder
        "created_by": current_user["id"],
        "created_at": now
    }
    await db.properties.insert_one(listing_doc)
    
    # Create the folder in iDrive (if configured)
    await create_property_folder(storage_folder)
    
    listing_doc.pop("_id", None)
    return listing_doc

@router.put("/listings/{listing_id}")
async def update_listing(listing_id: str, listing: PropertyListingCreate, current_user: dict = Depends(get_current_user)):
    """Alias for /properties/{id} PUT for frontend compatibility"""
    result = await db.properties.update_one({"id": listing_id}, {"$set": listing.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    updated = await db.properties.find_one({"id": listing_id}, {"_id": 0})
    return updated

@router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER, UserRole.ADMIN]))):
    """Alias for /properties/{id} DELETE for frontend compatibility"""
    # Get listing to find storage folder before deletion
    listing_doc = await db.properties.find_one({"id": listing_id})
    if not listing_doc:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Delete the listing from database
    result = await db.properties.delete_one({"id": listing_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Delete associated landing page if exists
    await db.landing_pages.delete_many({"listing_id": listing_id})
    
    # Delete the storage folder from iDrive (if it exists)
    storage_folder = listing_doc.get("storage_folder")
    if storage_folder:
        await delete_property_folder(storage_folder)
    
    return {"message": "Listing deleted"}

@router.post("/listings/lookup-address")
async def lookup_address(data: dict, current_user: dict = Depends(get_current_user)):
    """AI property lookup by address"""
    address = data.get("address", "")
    if not address:
        raise HTTPException(status_code=400, detail="Address is required")
    
    try:
        from emergentintegrations.llm.chat import chat, Message
        
        llm_api_key = os.environ.get('EMERGENT_LLM_KEY') or os.environ.get('LLM_API_KEY')
        
        prompt = f"""You are a real estate data assistant. Given the following property address, provide estimated property details in JSON format. Be realistic with the estimates based on the location.

Address: {address}

Return a JSON object with these fields:
- estimated_value: number (estimated market value in USD)
- bedrooms: number
- bathrooms: number  
- sqft: number
- year_built: number
- property_type: string (single_family, condo, townhouse, etc.)
- lot_size: number (in acres)
- features: array of strings

Only return valid JSON, no other text."""

        response = await chat(
            api_key=llm_api_key,
            messages=[Message(role="user", content=prompt)],
            model="gpt-4o-mini"
        )
        
        import json
        try:
            result = json.loads(response)
            return {"success": True, "data": result, "address": address}
        except json.JSONDecodeError:
            return {"success": False, "raw_response": response, "address": address}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI lookup failed: {str(e)}")

@router.post("/listings/{listing_id}/generate-description")
async def generate_listing_description(listing_id: str, current_user: dict = Depends(get_current_user)):
    """Generate AI description for a listing"""
    listing = await db.properties.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    try:
        from emergentintegrations.llm.chat import chat, Message
        
        llm_api_key = os.environ.get('EMERGENT_LLM_KEY') or os.environ.get('LLM_API_KEY')
        
        prompt = f"""Write a compelling luxury real estate listing description for this property:

Address: {listing.get('address')}, {listing.get('city')}, {listing.get('state')}
Price: ${listing.get('price', 0):,.0f}
Bedrooms: {listing.get('bedrooms')}
Bathrooms: {listing.get('bathrooms')}
Square Feet: {listing.get('sqft', 0):,}
Features: {', '.join(listing.get('features', []))}
Property Type: {listing.get('property_type')}

Write a professional, enticing description (2-3 paragraphs) that highlights the property's best features and appeals to luxury home buyers."""

        response = await chat(
            api_key=llm_api_key,
            messages=[Message(role="user", content=prompt)],
            model="gpt-4o-mini"
        )
        
        # Update the listing with the generated description
        await db.properties.update_one(
            {"id": listing_id},
            {"$set": {"description": response}}
        )
        
        return {"success": True, "description": response}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Description generation failed: {str(e)}")

# =========== END LISTINGS ALIASES ===========

@router.get("/properties/{property_id}", response_model=PropertyListingResponse)
async def get_property(property_id: str, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return PropertyListingResponse(**prop)

@router.put("/properties/{property_id}", response_model=PropertyListingResponse)
async def update_property(property_id: str, property_data: PropertyListingCreate, current_user: dict = Depends(get_current_user)):
    result = await db.properties.update_one({"id": property_id}, {"$set": property_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    updated = await db.properties.find_one({"id": property_id}, {"_id": 0})
    return PropertyListingResponse(**updated)

@router.delete("/properties/{property_id}")
async def delete_property(property_id: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER, UserRole.ADMIN]))):
    # Get property to find storage folder before deletion
    property_doc = await db.properties.find_one({"id": property_id})
    if not property_doc:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Delete the property from database
    result = await db.properties.delete_one({"id": property_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Delete associated landing page if exists
    await db.landing_pages.delete_many({"listing_id": property_id})
    
    # Delete the storage folder from iDrive (if it exists)
    storage_folder = property_doc.get("storage_folder")
    if storage_folder:
        await delete_property_folder(storage_folder)
    
    return {"message": "Property deleted"}

# Public property endpoints
@router.get("/public/properties")
async def get_public_properties(
    city: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bedrooms: Optional[int] = None,
    bathrooms: Optional[float] = None
):
    query = {"status": "active"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if min_price:
        query["price"] = {"$gte": min_price}
    if max_price:
        query.setdefault("price", {})["$lte"] = max_price
    if bedrooms:
        query["bedrooms"] = {"$gte": bedrooms}
    if bathrooms:
        query["bathrooms"] = {"$gte": bathrooms}
    
    properties = await db.properties.find(query, {"_id": 0}).to_list(100)
    return properties

# Alias for frontend compatibility
@router.get("/public/listings")
async def get_public_listings(limit: int = 100):
    """Alias endpoint for /public/properties for frontend compatibility"""
    properties = await db.properties.find({"status": "active"}, {"_id": 0}).to_list(limit)
    return properties

@router.get("/public/listings/{listing_id}")
async def get_public_listing(listing_id: str):
    """Alias endpoint for frontend compatibility"""
    prop = await db.properties.find_one({"id": listing_id, "status": "active"}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop

@router.get("/public/properties/{property_id}")
async def get_public_property(property_id: str):
    prop = await db.properties.find_one({"id": property_id, "status": "active"}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop

# AI Property Lookup
@router.post("/properties/ai-lookup")
async def ai_property_lookup(address: str, current_user: dict = Depends(get_current_user)):
    """Use AI to look up property information"""
    try:
        from emergentintegrations.llm.chat import chat, Message
        
        llm_api_key = os.environ.get('EMERGENT_LLM_KEY') or os.environ.get('LLM_API_KEY')
        
        prompt = f"""You are a real estate data assistant. Given the following property address, provide estimated property details in JSON format. Be realistic with the estimates based on the location.

Address: {address}

Return a JSON object with these fields:
- estimated_value: number (estimated market value in USD)
- bedrooms: number
- bathrooms: number  
- sqft: number
- year_built: number
- property_type: string (single_family, condo, townhouse, etc.)
- lot_size: number (in acres)
- features: array of strings

Only return valid JSON, no other text."""

        response = await chat(
            api_key=llm_api_key,
            messages=[Message(role="user", content=prompt)],
            model="gpt-4o-mini"
        )
        
        import json
        try:
            data = json.loads(response)
            return {"success": True, "data": data, "address": address}
        except json.JSONDecodeError:
            return {"success": False, "raw_response": response, "address": address}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI lookup failed: {str(e)}")

# Property Submissions (seller leads)
@router.post("/public/property-submissions")
async def submit_property(submission: PropertySubmissionCreate):
    """Public endpoint for sellers to submit properties"""
    submission_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    submission_doc = {
        "id": submission_id,
        **submission.model_dump(),
        "status": "pending",
        "notes": None,
        "reviewed_by": None,
        "created_at": now,
        "updated_at": now
    }
    await db.property_submissions.insert_one(submission_doc)
    
    # Also create a lead record
    lead_doc = {
        "id": str(uuid.uuid4()),
        "type": "seller",
        "name": submission.seller_name,
        "email": submission.seller_email,
        "phone": submission.seller_phone,
        "source": "property_submission",
        "status": "new",
        "property_address": submission.property_address,
        "consent_email": submission.consent_email,
        "consent_sms": submission.consent_sms,
        "submission_id": submission_id,
        "created_at": now
    }
    await db.leads.insert_one(lead_doc)
    
    submission_doc.pop("_id", None)
    return {"message": "Property submitted successfully", "id": submission_id}

@router.get("/property-submissions")
async def list_property_submissions(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {} if not status else {"status": status}
    submissions = await db.property_submissions.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return submissions

@router.get("/property-submissions/{submission_id}")
async def get_property_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    submission = await db.property_submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

@router.patch("/property-submissions/{submission_id}")
async def update_property_submission(submission_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["reviewed_by"] = current_user["id"]
    
    result = await db.property_submissions.update_one({"id": submission_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    updated = await db.property_submissions.find_one({"id": submission_id}, {"_id": 0})
    return updated

@router.post("/property-submissions/{submission_id}/convert")
async def convert_submission_to_listing(submission_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    submission = await db.property_submissions.find_one({"id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Only approved submissions can be converted")
    
    property_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate storage folder for the new property
    storage_folder = generate_storage_folder(
        submission["property_address"],
        submission["property_city"],
        submission["property_state"]
    )
    
    property_doc = {
        "id": property_id,
        "address": submission["property_address"],
        "city": submission["property_city"],
        "state": submission["property_state"],
        "zip_code": submission["property_zip"],
        "price": submission.get("asking_price", 0),
        "bedrooms": submission.get("bedrooms", 0),
        "bathrooms": submission.get("bathrooms", 0),
        "sqft": submission.get("sqft", 0),
        "year_built": submission.get("year_built"),
        "property_type": submission.get("property_type", "single_family"),
        "status": "active",
        "description": submission.get("description", ""),
        "features": [],
        "images": [],
        "storage_folder": storage_folder,  # Persistent storage folder
        "created_by": current_user["id"],
        "source_submission_id": submission_id,
        "created_at": now
    }
    await db.properties.insert_one(property_doc)
    
    # Create the folder in iDrive (if configured)
    await create_property_folder(storage_folder)
    
    await db.property_submissions.update_one(
        {"id": submission_id},
        {"$set": {"status": "converted", "converted_property_id": property_id, "updated_at": now}}
    )
    
    return {"message": "Submission converted to listing", "property_id": property_id}

@router.delete("/property-submissions/{submission_id}")
async def delete_property_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.property_submissions.delete_one({"id": submission_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Submission deleted"}
