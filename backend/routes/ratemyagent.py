"""
RateMyAgent API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from utils.auth import get_current_user
from services.ratemyagent import ratemyagent_service

router = APIRouter(prefix="/ratemyagent", tags=["RateMyAgent"])


@router.get("/stats")
async def get_agent_stats(current_user: dict = Depends(get_current_user)):
    """Get agent statistics from RateMyAgent"""
    try:
        stats = await ratemyagent_service.get_agent_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/reviews")
async def get_reviews(current_user: dict = Depends(get_current_user)):
    """Get all reviews from RateMyAgent"""
    try:
        reviews = await ratemyagent_service.get_reviews()
        return {"reviews": reviews, "count": len(reviews)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reviews: {str(e)}")


@router.get("/listings")
async def get_listings(current_user: dict = Depends(get_current_user)):
    """Get property listings from RateMyAgent"""
    try:
        listings = await ratemyagent_service.get_listings()
        return {"listings": listings, "count": len(listings)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch listings: {str(e)}")


@router.get("/all")
async def get_all_data(current_user: dict = Depends(get_current_user)):
    """Get all RateMyAgent data (stats, reviews, listings)"""
    try:
        stats = await ratemyagent_service.get_agent_stats()
        reviews = await ratemyagent_service.get_reviews()
        listings = await ratemyagent_service.get_listings()
        
        return {
            "stats": stats,
            "reviews": {"items": reviews, "count": len(reviews)},
            "listings": {"items": listings, "count": len(listings)}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data: {str(e)}")
