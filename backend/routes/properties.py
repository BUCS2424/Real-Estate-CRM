from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os
from database import db
from models.property import PropertyListingCreate, PropertyListingResponse, PropertySubmissionCreate, PropertySubmissionResponse
from models.user import UserRole
from utils.auth import get_current_user, require_role

router = APIRouter()

# Property Listings
@router.post("/properties", response_model=PropertyListingResponse)
async def create_property(property_data: PropertyListingCreate, current_user: dict = Depends(get_current_user)):
    property_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    property_doc = {
        "id": property_id,
        **property_data.model_dump(),
        "created_by": current_user["id"],
        "created_at": now
    }
    await db.properties.insert_one(property_doc)
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
    return [PropertyListingResponse(**p) for p in properties]

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
    result = await db.properties.delete_one({"id": property_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
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
        "created_by": current_user["id"],
        "source_submission_id": submission_id,
        "created_at": now
    }
    await db.properties.insert_one(property_doc)
    
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
