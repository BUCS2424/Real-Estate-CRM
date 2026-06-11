from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
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
from utils.slug import generate_property_slug, ensure_unique_slug

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
        
        # Create default subfolders: gallery, videos, documents
        default_subfolders = ['gallery', 'videos', 'documents']
        for subfolder in default_subfolders:
            subfolder_key = f"{storage_folder}/{subfolder}/.folder"
            client.put_object(
                Bucket=bucket,
                Key=subfolder_key,
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


@router.post("/listings/migrate-slugs")
async def migrate_slugs(current_user: dict = Depends(get_current_user)):
    """
    Generate SEO-friendly URL slugs for existing properties that don't have them.
    Example: "804 S Davis Blvd, Tampa, FL 33606" -> "804-s-davis-blvd-tampa-fl-33606"
    """
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find properties without slugs
    properties = await db.properties.find(
        {"$or": [{"slug": None}, {"slug": {"$exists": False}}, {"slug": ""}]},
        {"_id": 0}
    ).to_list(1000)
    
    # Get all existing slugs to avoid duplicates
    existing_slugs = await db.properties.distinct("slug")
    existing_slugs = [s for s in existing_slugs if s]  # Filter out None/empty
    
    updated_count = 0
    results = []
    
    for prop in properties:
        address = prop.get("address", "")
        city = prop.get("city", "")
        state = prop.get("state", "FL")
        zip_code = prop.get("zip_code", "")
        
        if not address:
            continue
            
        base_slug = generate_property_slug(address, city, state, zip_code)
        unique_slug = ensure_unique_slug(base_slug, existing_slugs)
        
        await db.properties.update_one(
            {"id": prop["id"]},
            {"$set": {"slug": unique_slug}}
        )
        
        existing_slugs.append(unique_slug)  # Add to list to prevent duplicates in this batch
        updated_count += 1
        results.append({
            "id": prop["id"],
            "address": address,
            "slug": unique_slug
        })
    
    return {
        "message": f"Generated slugs for {updated_count} properties",
        "updated_count": updated_count,
        "results": results
    }


@router.get("/listings/sync-status")
async def get_sync_status(current_user: dict = Depends(get_current_user)):
    """Return last MLS sync timestamp and count."""
    s = await db.general_settings.find_one({}, {"_id": 0, "mls_last_sync": 1, "mls_last_sync_count": 1})
    return {
        "last_sync":  (s or {}).get("mls_last_sync"),
        "last_count": (s or {}).get("mls_last_sync_count", 0),
    }


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


# ============ LISTING IMAGE UPLOAD ============

LISTING_IMAGES_DIR = "/app/backend/static/listing-images"

def get_listing_images_dir(listing_id: str) -> str:
    """Get or create the images directory for a listing"""
    dir_path = os.path.join(LISTING_IMAGES_DIR, listing_id)
    os.makedirs(dir_path, exist_ok=True)
    return dir_path


@router.post("/listings/{listing_id}/images/upload")
async def upload_listing_image(
    listing_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload an image to a listing's gallery"""
    # Verify listing exists
    listing = await db.properties.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Validate file type - support common image formats including HEIC/HEIF from iOS
    allowed_types = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "image/heic", "image/heif", "image/bmp", "image/tiff"
    ]
    allowed_extensions = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp", "tiff"]
    file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if file.content_type not in allowed_types and file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Invalid file type '{file.content_type}'. Only JPEG, PNG, GIF, WEBP, HEIC allowed.")
    
    # Create directory for this listing
    images_dir = get_listing_images_dir(listing_id)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex[:12]}.{file_ext if file_ext else 'jpg'}"
    file_path = os.path.join(images_dir, unique_filename)
    
    # Save file
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        file_size = len(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create image record
    image_record = {
        "id": str(uuid.uuid4()),
        "filename": unique_filename,
        "original_name": file.filename,
        "url": f"/api/listings/{listing_id}/images/file/{unique_filename}",
        "size": file_size,
        "content_type": file.content_type,
        "uploaded_by": current_user.get("name") or current_user.get("email"),
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update listing with new image
    await db.properties.update_one(
        {"id": listing_id},
        {
            "$push": {"images": image_record},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {
        "message": "Image uploaded successfully",
        "image": image_record
    }


@router.post("/listings/{listing_id}/images/upload-multiple")
async def upload_multiple_listing_images(
    listing_id: str,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload multiple images to a listing's gallery"""
    # Verify listing exists
    listing = await db.properties.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Support common image formats including HEIC/HEIF from iOS
    allowed_types = [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "image/heic", "image/heif", "image/bmp", "image/tiff"
    ]
    allowed_extensions = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp", "tiff"]
    images_dir = get_listing_images_dir(listing_id)
    
    uploaded = []
    errors = []
    
    for file in files:
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        
        if file.content_type not in allowed_types and file_ext not in allowed_extensions:
            errors.append(f"{file.filename}: Invalid file type '{file.content_type}'")
            continue
        
        try:
            unique_filename = f"{uuid.uuid4().hex[:12]}.{file_ext if file_ext else 'jpg'}"
            file_path = os.path.join(images_dir, unique_filename)
            
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)
            
            image_record = {
                "id": str(uuid.uuid4()),
                "filename": unique_filename,
                "original_name": file.filename,
                "url": f"/api/listings/{listing_id}/images/file/{unique_filename}",
                "size": len(content),
                "content_type": file.content_type,
                "uploaded_by": current_user.get("name") or current_user.get("email"),
                "uploaded_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.properties.update_one(
                {"id": listing_id},
                {"$push": {"images": image_record}}
            )
            
            uploaded.append(image_record)
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")
    
    # Update timestamp
    await db.properties.update_one(
        {"id": listing_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "message": f"Uploaded {len(uploaded)} images",
        "uploaded": uploaded,
        "errors": errors
    }


@router.get("/listings/{listing_id}/images/file/{filename}")
async def get_listing_image(listing_id: str, filename: str):
    """Serve a listing image file"""
    from fastapi.responses import FileResponse
    
    file_path = os.path.join(LISTING_IMAGES_DIR, listing_id, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(file_path)


@router.delete("/listings/{listing_id}/images/{image_id}")
async def delete_listing_image(
    listing_id: str,
    image_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an image from a listing's gallery"""
    listing = await db.properties.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    images = listing.get("images", [])
    image_to_delete = next((img for img in images if img.get("id") == image_id), None)
    
    if not image_to_delete:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete file from disk
    file_path = os.path.join(LISTING_IMAGES_DIR, listing_id, image_to_delete["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove from database
    await db.properties.update_one(
        {"id": listing_id},
        {
            "$pull": {"images": {"id": image_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Image deleted successfully"}


@router.put("/listings/{listing_id}/images/reorder")
async def reorder_listing_images(
    listing_id: str,
    image_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Reorder images in a listing's gallery"""
    listing = await db.properties.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    current_images = listing.get("images", [])
    image_map = {img["id"]: img for img in current_images}
    
    # Reorder based on provided IDs
    reordered = []
    for img_id in image_ids:
        if img_id in image_map:
            reordered.append(image_map[img_id])
    
    # Add any images not in the reorder list to the end
    for img in current_images:
        if img["id"] not in image_ids:
            reordered.append(img)
    
    await db.properties.update_one(
        {"id": listing_id},
        {
            "$set": {
                "images": reordered,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Images reordered", "images": reordered}



@router.post("/listings/{listing_id}/pull-mls-images")
async def pull_mls_images(
    listing_id: str,
    body: dict = None,
    current_user: dict = Depends(get_current_user)
):
    """Pull images from MLS for a showcase listing, skipping duplicates.
    Optionally pass {"mls_id": "TB1234567"} to search by MLS number directly.
    """
    listing = await db.properties.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing.pop("_id", None)

    existing_urls = set()
    for img in listing.get("images", []):
        if isinstance(img, dict) and img.get("url"):
            existing_urls.add(img["url"])
        elif isinstance(img, str):
            existing_urls.add(img)

    mls_photos = []
    source_label = None
    manual_mls_id = (body or {}).get("mls_id", "").strip() if body else ""

    # Strategy 1: User provided MLS ID — search Bridge API directly
    if manual_mls_id:
        from services.mls_service import mls_service
        if mls_service.is_configured():
            detail = await mls_service.get_property_details(mls_id=manual_mls_id)
            if not detail.get("error"):
                mls_photos = detail.get("all_photos", detail.get("photos", []))
                source_label = detail.get("mls_id", manual_mls_id)

    # Strategy 2: Check if listing was converted from an MLS listing
    if not mls_photos:
        mls_listing = await db.mls_listings.find_one({"converted_to_property_id": listing_id})
        if mls_listing:
            mls_photos = mls_listing.get("photos", [])
            source_label = mls_listing.get("mls_id", "MLS")

    # Strategy 3: Match by source_lead_id -> property_lead -> mls_number
    if not mls_photos and listing.get("source_lead_id"):
        lead = await db.property_leads.find_one({"id": listing["source_lead_id"]})
        if lead:
            mls_num = lead.get("mls_number") or lead.get("mls_id")
            if mls_num:
                mls_listing = await db.mls_listings.find_one({"mls_id": mls_num})
                if mls_listing:
                    mls_photos = mls_listing.get("photos", [])
                    source_label = mls_num

    # Strategy 4: Match by address in local mls_listings
    if not mls_photos and listing.get("address"):
        addr_query = listing["address"].split(",")[0].strip()
        if len(addr_query) > 5:
            mls_listing = await db.mls_listings.find_one({
                "address": {"$regex": addr_query, "$options": "i"}
            })
            if mls_listing:
                mls_photos = mls_listing.get("photos", [])
                source_label = mls_listing.get("mls_id", "MLS")

    # Strategy 5: Search Bridge API by address
    if not mls_photos and listing.get("address"):
        from services.mls_service import mls_service
        if mls_service.is_configured():
            addr_search = listing["address"].split(",")[0].strip()
            search_result = await mls_service.search_properties(
                address=addr_search, limit=5
            )
            for prop in search_result.get("properties", []):
                if prop.get("photos"):
                    mls_photos = prop.get("photos", [])
                    source_label = prop.get("mls_id", "MLS")
                    # Also fetch full details for all photos (search only returns 10)
                    if source_label and len(mls_photos) <= 10:
                        detail = await mls_service.get_property_details(mls_id=source_label)
                        if not detail.get("error"):
                            mls_photos = detail.get("all_photos", mls_photos)
                    break

    if not mls_photos:
        raise HTTPException(
            status_code=404,
            detail="No MLS listing found. Try entering the MLS # manually."
        )

    # Filter out duplicates
    new_photos = [url for url in mls_photos if url and url not in existing_urls]

    if not new_photos:
        return {"message": "All MLS images are already in this listing", "added": 0, "total": len(listing.get("images", []))}

    new_image_objects = [{"id": str(uuid.uuid4()), "url": url, "source": "mls"} for url in new_photos]
    current_images = listing.get("images", [])
    updated_images = current_images + new_image_objects

    await db.properties.update_one(
        {"id": listing_id},
        {"$set": {"images": updated_images, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {
        "message": f"Pulled {len(new_photos)} new images from {source_label}",
        "added": len(new_photos),
        "skipped": len(mls_photos) - len(new_photos),
        "total": len(updated_images),
        "images": updated_images
    }



@router.post("/listings/import-csv")
async def import_listings_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role([UserRole.SUPERUSER, UserRole.ADMIN]))
):
    """Import listings from CSV file (MLS format)"""
    import csv
    import io
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be CSV")
    
    content = await file.read()
    decoded = content.decode('utf-8-sig')  # Handle UTF-8 BOM
    reader = csv.DictReader(io.StringIO(decoded))
    
    # Column mappings for MLS format
    column_mapping = {
        'address': ['address', 'street', 'Address'],
        'city': ['city', 'City'],
        'state': ['state', 'State'],
        'zip_code': ['zip', 'zip_code', 'Zip'],
        'price': ['price', 'list_price', 'Price'],
        'property_type': ['property_type', 'type', 'Property Type'],
        'bedrooms': ['beds', 'bedrooms', 'Beds'],
        'bathrooms': ['baths', 'bathrooms', 'Baths'],
        'sqft': ['sqft', 'square_feet', 'Square Footage'],
        'lot_size': ['lot_size', 'Lot Size'],
        'mls_number': ['mls', 'mls_number', 'MLS #', 'MLS#'],
        'status': ['status', 'Status'],
    }
    
    def find_column_value(row, field_names):
        for name in field_names:
            for key in row.keys():
                if key.lower().strip() == name.lower().strip():
                    return row[key]
        return None
    
    def parse_number(val, is_float=False):
        if not val:
            return None
        try:
            clean = str(val).replace('$', '').replace(',', '').replace(' sqft', '').replace(' acres', '').strip()
            if clean and clean != '- -':
                return float(clean) if is_float else int(float(clean))
        except:
            pass
        return None
    
    imported = 0
    skipped = 0
    errors = []
    
    for row_num, row in enumerate(reader, start=2):
        try:
            address = find_column_value(row, column_mapping['address'])
            city = find_column_value(row, column_mapping['city'])
            
            if not address or not city:
                skipped += 1
                continue
            
            # Check for duplicate
            existing = await db.properties.find_one({
                "address": {"$regex": f"^{address.strip()}$", "$options": "i"},
                "city": {"$regex": f"^{city.strip()}$", "$options": "i"}
            })
            
            if existing:
                # Update existing listing
                update_data = {}
                price = parse_number(find_column_value(row, column_mapping['price']), is_float=True)
                if price:
                    update_data['price'] = price
                sqft = parse_number(find_column_value(row, column_mapping['sqft']))
                if sqft:
                    update_data['sqft'] = sqft
                beds = parse_number(find_column_value(row, column_mapping['bedrooms']))
                if beds:
                    update_data['bedrooms'] = beds
                baths = parse_number(find_column_value(row, column_mapping['bathrooms']), is_float=True)
                if baths:
                    update_data['bathrooms'] = baths
                lot = parse_number(find_column_value(row, column_mapping['lot_size']), is_float=True)
                if lot:
                    update_data['lot_size'] = lot
                mls = find_column_value(row, column_mapping['mls_number'])
                if mls:
                    update_data['mls_number'] = str(mls).strip()
                status = find_column_value(row, column_mapping['status'])
                if status:
                    update_data['mls_status'] = str(status).strip()
                
                if update_data:
                    await db.properties.update_one({"id": existing["id"]}, {"$set": update_data})
                    imported += 1
                else:
                    skipped += 1
                continue
            
            # Create new listing
            state = find_column_value(row, column_mapping['state']) or 'FL'
            zip_code = find_column_value(row, column_mapping['zip_code']) or ''
            
            listing_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            storage_folder = generate_storage_folder(address, city, state)
            
            listing_doc = {
                "id": listing_id,
                "address": address.strip(),
                "city": city.strip(),
                "state": state.strip(),
                "zip_code": str(zip_code).strip(),
                "price": parse_number(find_column_value(row, column_mapping['price']), is_float=True) or 0,
                "bedrooms": parse_number(find_column_value(row, column_mapping['bedrooms'])) or 0,
                "bathrooms": parse_number(find_column_value(row, column_mapping['bathrooms']), is_float=True) or 0,
                "sqft": parse_number(find_column_value(row, column_mapping['sqft'])) or 0,
                "lot_size": parse_number(find_column_value(row, column_mapping['lot_size']), is_float=True),
                "property_type": (find_column_value(row, column_mapping['property_type']) or 'single_family').strip(),
                "mls_number": (find_column_value(row, column_mapping['mls_number']) or '').strip(),
                "mls_status": (find_column_value(row, column_mapping['status']) or 'active').strip(),
                "status": "active",
                "description": None,
                "features": [],
                "images": [],
                "storage_folder": storage_folder,
                "created_by": current_user["id"],
                "created_at": now
            }
            
            await db.properties.insert_one(listing_doc)
            imported += 1
            
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
    
    return {
        "message": "Import complete",
        "imported": imported,
        "skipped": skipped,
        "errors": errors[:10]
    }

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
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        llm_api_key = os.environ.get('EMERGENT_LLM_KEY') or os.environ.get('LLM_API_KEY')
        
        if not llm_api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")
        
        prompt = f"""Write a compelling luxury real estate listing description for this property:

Address: {listing.get('address')}, {listing.get('city')}, {listing.get('state')}
Price: ${listing.get('price', 0):,.0f}
Bedrooms: {listing.get('bedrooms')}
Bathrooms: {listing.get('bathrooms')}
Square Feet: {listing.get('sqft', 0):,}
Features: {', '.join(listing.get('features', []))}
Property Type: {listing.get('property_type')}

Write a professional, enticing description (2-3 paragraphs) that highlights the property's best features and appeals to luxury home buyers."""

        # Initialize the chat with the new LlmChat class
        chat = LlmChat(
            api_key=llm_api_key,
            session_id=f"listing-description-{listing_id}",
            system_message="You are a luxury real estate copywriter. Write compelling property descriptions that appeal to high-net-worth buyers."
        ).with_model("openai", "gpt-4o-mini")
        
        # Send the message and get the response
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Update the listing with the generated description
        await db.properties.update_one(
            {"id": listing_id},
            {"$set": {"description": response}}
        )
        
        return {"success": True, "description": response}
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Description generation failed: {str(e)}")

# =========== END LISTINGS ALIASES ===========

# ============ BADGE MANAGEMENT ============
# NOTE: These routes must come BEFORE /{property_id} routes to avoid conflicts

@router.get("/badge-types")
async def get_badge_types(current_user: dict = Depends(get_current_user)):
    """Get all available badge types"""
    # Default badge types
    default_badges = [
        {"id": "sold", "label": "SOLD", "color": "#ffffff", "bg_color": "#ef4444", "icon": "check-circle"},
        {"id": "featured", "label": "FEATURED", "color": "#1a2744", "bg_color": "#f59e0b", "icon": "star"},
        {"id": "private_auction", "label": "PRIVATE AUCTION", "color": "#ffffff", "bg_color": "#8b5cf6", "icon": "gavel"},
        {"id": "new_listing", "label": "NEW LISTING", "color": "#ffffff", "bg_color": "#22c55e", "icon": "sparkles"},
        {"id": "price_reduced", "label": "PRICE REDUCED", "color": "#ffffff", "bg_color": "#3b82f6", "icon": "trending-down"},
        {"id": "under_contract", "label": "UNDER CONTRACT", "color": "#ffffff", "bg_color": "#ec4899", "icon": "file-signature"},
        {"id": "off_market", "label": "OFF MARKET", "color": "#d4a646", "bg_color": "#1a2744", "icon": "eye-off"},
        {"id": "coming_soon", "label": "COMING SOON", "color": "#1a2744", "bg_color": "#fbbf24", "icon": "clock"},
    ]
    
    # Get custom badges from database
    custom_badges_doc = await db.settings.find_one({"type": "custom_badges"}, {"_id": 0})
    custom_badges = custom_badges_doc.get("badges", []) if custom_badges_doc else []
    
    return {
        "default_badges": default_badges,
        "custom_badges": custom_badges,
        "all_badges": default_badges + custom_badges
    }


@router.post("/badge-types")
async def create_badge_type(badge_data: dict, current_user: dict = Depends(require_role([UserRole.SUPERUSER, UserRole.ADMIN]))):
    """Create a custom badge type"""
    badge_id = badge_data.get("id") or badge_data.get("label", "").lower().replace(" ", "_")
    
    new_badge = {
        "id": badge_id,
        "label": badge_data.get("label", "").upper(),
        "color": badge_data.get("color", "#ffffff"),
        "bg_color": badge_data.get("bg_color", "#6b7280"),
        "icon": badge_data.get("icon", "tag"),
        "custom": True
    }
    
    # Add to custom badges in settings
    await db.settings.update_one(
        {"type": "custom_badges"},
        {"$push": {"badges": new_badge}},
        upsert=True
    )
    
    return {"message": "Badge type created", "badge": new_badge}


@router.delete("/badge-types/{badge_id}")
async def delete_badge_type(badge_id: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER, UserRole.ADMIN]))):
    """Delete a custom badge type"""
    # Remove from custom badges
    await db.settings.update_one(
        {"type": "custom_badges"},
        {"$pull": {"badges": {"id": badge_id}}}
    )
    
    # Remove this badge from all properties that have it
    await db.properties.update_many(
        {"badges": badge_id},
        {"$pull": {"badges": badge_id}}
    )
    
    return {"message": "Badge type deleted"}


# ============ PROPERTY ROUTES WITH IDs ============

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


@router.post("/properties/{property_id}/badges")
async def add_badge_to_property(property_id: str, badge_data: dict, current_user: dict = Depends(get_current_user)):
    """Add a badge to a property"""
    badge_id = badge_data.get("badge_id")
    if not badge_id:
        raise HTTPException(status_code=400, detail="badge_id is required")
    
    # Add badge to property (avoid duplicates)
    result = await db.properties.update_one(
        {"id": property_id},
        {"$addToSet": {"badges": badge_id}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {"message": f"Badge '{badge_id}' added to property"}


@router.delete("/properties/{property_id}/badges/{badge_id}")
async def remove_badge_from_property(property_id: str, badge_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a badge from a property"""
    result = await db.properties.update_one(
        {"id": property_id},
        {"$pull": {"badges": badge_id}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {"message": f"Badge '{badge_id}' removed from property"}


@router.put("/properties/{property_id}/badges")
async def set_property_badges(property_id: str, badges_data: dict, current_user: dict = Depends(get_current_user)):
    """Set all badges for a property (replaces existing badges)"""
    badges = badges_data.get("badges", [])
    
    result = await db.properties.update_one(
        {"id": property_id},
        {"$set": {"badges": badges}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    
    return {"message": "Property badges updated", "badges": badges}


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

@router.get("/public/property/by-slug/{slug}")
async def get_public_property_by_slug(slug: str):
    """
    Get a public property by its SEO-friendly URL slug.
    Example: /api/public/property/by-slug/804-s-davis-blvd-tampa-fl-33606
    """
    prop = await db.properties.find_one({"slug": slug, "status": "active"}, {"_id": 0})
    if not prop:
        # Try fallback: search by ID if it looks like a UUID
        if len(slug) >= 32 and '-' in slug:
            prop = await db.properties.find_one({"id": slug, "status": "active"}, {"_id": 0})
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


# ══════════════════════════════════════════════════════════════════════════
# MLS AGENT AUTO-SYNC  ─  Pull all of Sheila's active MLS listings into showcase
# ══════════════════════════════════════════════════════════════════════════

@router.post("/listings/sync-agent-listings")
async def sync_agent_listings(current_user: dict = Depends(get_current_user)):
    """
    Fetch every active MLS listing where Sheila Desautels / Hidden Haven Realty
    is the listing agent and upsert them into the showcase (db.properties).
    Returns a summary of what was created / updated / skipped.
    """
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    from services.mls_service import mls_service

    if not mls_service.is_configured():
        raise HTTPException(status_code=400, detail="MLS API not configured. Add your Bridge API key in Settings → MLS.")

    # ── Fetch from Bridge API ──────────────────────────────────────────────
    # OData filter: listings where the agent or office matches Hidden Haven Realty
    import httpx
    ds      = mls_service.dataset
    base    = mls_service.base_url
    token   = mls_service.token

    agent_filter = (
        "(contains(ListAgentFullName, 'Desautels') or "
        "contains(ListOfficeName, 'Hidden Haven') or "
        "contains(ListAgentFullName, 'Sheila'))"
    )
    odata_filter = f"{agent_filter} and StandardStatus eq 'Active'"

    params = {
        "access_token": token,
        "$filter": odata_filter,
        "$top": 200,
    }

    mls_listings = []
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{base}/OData/{ds}/Property", params=params)
            if resp.status_code == 200:
                raw = resp.json().get("value", [])
                mls_listings = mls_service._transform_listings(raw, photo_limit=20)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MLS API error: {e}")

    now     = datetime.now(timezone.utc).isoformat()
    created = []
    updated = []
    skipped = []

    # Load all existing slugs to avoid collisions
    existing_slugs: list = await db.properties.distinct("slug")
    existing_slugs = [s for s in existing_slugs if s]

    for listing in mls_listings:
        mls_id   = listing.get("mls_id") or listing.get("ListingId")
        address  = listing.get("address") or listing.get("UnparsedAddress", "")
        city     = listing.get("city", "Tampa")
        state    = listing.get("state", "FL")
        zip_code = listing.get("zip_code", "")
        price    = listing.get("list_price") or listing.get("ListPrice") or 0

        if not mls_id or not address:
            skipped.append(mls_id or "unknown")
            continue

        # Build image list
        photos   = listing.get("photos", [])
        primary  = listing.get("primary_photo") or (photos[0] if photos else "")
        images   = [{"url": p, "id": str(uuid.uuid4()), "is_primary": i == 0} for i, p in enumerate(photos)]

        # Generate slug
        base_slug  = generate_property_slug(address, city, state, zip_code)

        # Check existing
        existing = await db.properties.find_one(
            {"$or": [{"mls_id": mls_id}, {"address": address}]},
            {"_id": 0, "id": 1, "slug": 1}
        )

        if existing:
            await db.properties.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "mls_id":         mls_id,
                    "price":          price,
                    "list_price":     price,
                    "status":         "active",
                    "listing_agent":  listing.get("listing_agent", "Sheila M Desautels"),
                    "listing_office": listing.get("listing_office", "HIDDEN HAVEN REALTY"),
                    "bedrooms":       listing.get("bedrooms"),
                    "bathrooms":      listing.get("bathrooms"),
                    "sqft":           listing.get("sqft"),
                    "year_built":     listing.get("year_built"),
                    "description":    listing.get("description", ""),
                    "primary_photo":  primary,
                    "images":         images,
                    "source":         "mls_auto_sync",
                    "updated_at":     now,
                }}
            )
            updated.append({"id": existing["id"], "address": address})
        else:
            # Create new showcase listing
            prop_id    = str(uuid.uuid4())
            unique_slug = ensure_unique_slug(base_slug, existing_slugs)
            existing_slugs.append(unique_slug)

            property_doc = {
                "id":             prop_id,
                "slug":           unique_slug,
                "mls_id":         mls_id,
                "address":        address,
                "city":           city,
                "state":          state,
                "zip_code":       zip_code,
                "price":          price,
                "list_price":     price,
                "status":         "active",
                "property_type":  listing.get("property_type", "Single Family"),
                "bedrooms":       listing.get("bedrooms"),
                "bathrooms":      listing.get("bathrooms"),
                "sqft":           listing.get("sqft"),
                "lot_size":       listing.get("lot_size"),
                "year_built":     listing.get("year_built"),
                "county":         listing.get("county"),
                "description":    listing.get("description", ""),
                "primary_photo":  primary,
                "images":         images,
                "listing_agent":  listing.get("listing_agent", "Sheila M Desautels"),
                "listing_office": listing.get("listing_office", "HIDDEN HAVEN REALTY"),
                "source":         "mls_auto_sync",
                "features":       [],
                "moderation_status": "approved",
                "created_by":     current_user["id"],
                "created_at":     now,
                "updated_at":     now,
            }
            await db.properties.insert_one(property_doc)
            created.append({"id": prop_id, "address": address, "slug": unique_slug})

    # Save last sync metadata
    await db.general_settings.update_one(
        {},
        {"$set": {
            "mls_last_sync":       now,
            "mls_last_sync_count": len(created) + len(updated),
        }},
        upsert=True
    )

    return {
        "message": "MLS sync complete",
        "created":       len(created),
        "updated":       len(updated),
        "skipped":       len(skipped),
        "total_fetched": len(mls_listings),
        "listings":      created,
    }
