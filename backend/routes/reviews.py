"""
Reviews/Testimonials API Routes
Manage reviews from all sources (RateMyAgent, manual entry, etc.)
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from utils.auth import get_current_user
from models.user import UserRole
from database import db
from services.ratemyagent import ratemyagent_service

router = APIRouter(prefix="/reviews", tags=["Reviews"])


class ReviewCreate(BaseModel):
    title: str
    text: str
    rating: int = 5
    reviewer_name: str
    reviewer_title: Optional[str] = None
    reviewer_location: Optional[str] = None
    property_address: Optional[str] = None
    source: str = "Manual"
    featured: bool = False
    show_on_homepage: bool = True


class ReviewUpdate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    rating: Optional[int] = None
    reviewer_name: Optional[str] = None
    reviewer_title: Optional[str] = None
    reviewer_location: Optional[str] = None
    property_address: Optional[str] = None
    source: Optional[str] = None
    featured: Optional[bool] = None
    show_on_homepage: Optional[bool] = None


@router.get("")
async def get_reviews(
    source: Optional[str] = None,
    featured_only: bool = False,
    homepage_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get all reviews with optional filters"""
    query = {}
    
    if source:
        query["source"] = source
    if featured_only:
        query["featured"] = True
    if homepage_only:
        query["show_on_homepage"] = True
    
    reviews = await db.reviews.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"reviews": reviews, "count": len(reviews)}


@router.get("/public")
async def get_public_reviews(homepage_only: bool = True):
    """Get reviews for public display (no auth required)"""
    query = {"show_on_homepage": True, "status": {"$ne": "pending"}} if homepage_only else {"status": {"$ne": "pending"}}
    reviews = await db.reviews.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"reviews": reviews, "count": len(reviews)}


class PublicReviewSubmit(BaseModel):
    title: str
    text: str
    rating: int = 5
    reviewer_name: str
    reviewer_email: str
    reviewer_phone: Optional[str] = None
    property_address: Optional[str] = None
    transaction_type: Optional[str] = None
    source: str = "Website"


@router.post("/submit")
async def submit_public_review(review: PublicReviewSubmit):
    """Public endpoint for visitors to submit reviews (requires moderation)"""
    review_doc = {
        "id": str(uuid.uuid4()),
        "title": review.title,
        "text": review.text,
        "rating": review.rating,
        "reviewer_name": review.reviewer_name,
        "reviewer_email": review.reviewer_email,  # Not displayed publicly
        "reviewer_phone": review.reviewer_phone,
        "reviewer_title": review.transaction_type.replace('_', ' ').title() if review.transaction_type else None,
        "reviewer_location": None,
        "property_address": review.property_address,
        "source": review.source,
        "featured": False,
        "show_on_homepage": False,  # Requires admin approval
        "status": "pending",  # pending, approved, rejected
        "created_by": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    return {"message": "Review submitted successfully. It will be visible after approval.", "id": review_doc["id"]}


@router.get("/{review_id}")
async def get_review(review_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single review"""
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


@router.post("")
async def create_review(review: ReviewCreate, current_user: dict = Depends(get_current_user)):
    """Create a new review"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    review_doc = {
        "id": str(uuid.uuid4()),
        **review.dict(),
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    return {"message": "Review created", "review": {k: v for k, v in review_doc.items() if k != "_id"}}


@router.put("/{review_id}")
async def update_review(review_id: str, review: ReviewUpdate, current_user: dict = Depends(get_current_user)):
    """Update a review"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.reviews.find_one({"id": review_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Review not found")
    
    update_data = {k: v for k, v in review.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.reviews.update_one({"id": review_id}, {"$set": update_data})
    
    updated = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    return {"message": "Review updated", "review": updated}


@router.delete("/{review_id}")
async def delete_review(review_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a review"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    
    return {"message": "Review deleted"}


@router.post("/sync-ratemyagent")
async def sync_ratemyagent_reviews(current_user: dict = Depends(get_current_user)):
    """Sync reviews from RateMyAgent"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        rma_reviews = await ratemyagent_service.get_reviews()
        synced = 0
        
        for rma_review in rma_reviews:
            # Check if already exists (by title and source)
            existing = await db.reviews.find_one({
                "title": rma_review["title"],
                "source": "RateMyAgent"
            })
            
            if not existing:
                review_doc = {
                    "id": str(uuid.uuid4()),
                    "title": rma_review["title"],
                    "text": rma_review["text"],
                    "rating": rma_review["rating"],
                    "reviewer_name": rma_review.get("reviewer", "Verified Client"),
                    "reviewer_title": None,
                    "reviewer_location": None,
                    "property_address": rma_review.get("property_address"),
                    "source": "RateMyAgent",
                    "source_date": rma_review.get("date"),
                    "featured": False,
                    "show_on_homepage": True,
                    "created_by": current_user["id"],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.reviews.insert_one(review_doc)
                synced += 1
        
        return {"message": f"Synced {synced} new reviews from RateMyAgent", "synced": synced}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.get("/sources/list")
async def get_review_sources(current_user: dict = Depends(get_current_user)):
    """Get list of all review sources"""
    sources = await db.reviews.distinct("source")
    return {"sources": sources}
