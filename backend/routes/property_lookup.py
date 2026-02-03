"""
Property Lookup API Routes
- County tax record scrapers (Hillsborough, Pinellas, Pasco)
- MLS integration
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timezone

from database import db
from models.user import UserRole
from utils.auth import get_current_user
from services.county_scrapers import search_property, get_property_details, get_scraper
from services.mls_api import MLSService, MLSClient

router = APIRouter()

# ============ REQUEST/RESPONSE MODELS ============

class PropertySearchRequest(BaseModel):
    address: str
    county: Optional[str] = None  # hillsborough, pinellas, pasco, or None for all

class MLSConfigRequest(BaseModel):
    api_url: str
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    api_key: Optional[str] = None
    mls_name: Optional[str] = None

class MLSSearchRequest(BaseModel):
    city: Optional[str] = None
    zip_code: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    property_type: Optional[str] = None
    status: str = "Active"
    limit: int = 50


# ============ COUNTY TAX RECORDS ============

@router.post("/county/search")
async def search_county_records(
    request: PropertySearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Search county property tax records by address
    
    Searches Hillsborough, Pinellas, and Pasco county property appraiser sites.
    Returns owner name, assessed value, tax info, and property details.
    """
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        results = await search_property(request.address, request.county)
        
        # Cache the search
        await db.property_lookups.insert_one({
            "type": "county_search",
            "address": request.address,
            "county": request.county,
            "results_count": len(results),
            "searched_by": current_user["id"],
            "searched_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "query": request.address,
            "county": request.county or "all",
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/county/details/{county}/{parcel_id}")
async def get_county_property_details(
    county: str,
    parcel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed property information from county records
    
    Includes: owner name, mailing address, assessed value, tax info,
    bedrooms, bathrooms, sqft, lot size, year built, etc.
    """
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        details = await get_property_details(parcel_id, county)
        
        if not details:
            raise HTTPException(status_code=404, detail="Property not found")
        
        # Cache the lookup
        await db.property_lookups.insert_one({
            "type": "county_details",
            "county": county,
            "parcel_id": parcel_id,
            "owner_name": details.get("owner_name"),
            "looked_up_by": current_user["id"],
            "looked_up_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "data": details
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lookup failed: {str(e)}")


@router.get("/county/supported")
async def get_supported_counties():
    """Get list of supported counties for property lookup"""
    return {
        "counties": [
            {
                "name": "Hillsborough",
                "key": "hillsborough",
                "website": "hcpafl.org",
                "cities": ["Tampa", "Brandon", "Plant City", "Temple Terrace"]
            },
            {
                "name": "Pinellas",
                "key": "pinellas",
                "website": "pcpao.gov",
                "cities": ["St. Petersburg", "Clearwater", "Largo", "Dunedin", "Palm Harbor"]
            },
            {
                "name": "Pasco",
                "key": "pasco",
                "website": "pascopa.com",
                "cities": ["New Port Richey", "Dade City", "Land O' Lakes", "Wesley Chapel", "Trinity"]
            }
        ]
    }


# ============ MLS INTEGRATION ============

@router.get("/mls/config")
async def get_mls_config(current_user: dict = Depends(get_current_user)):
    """Get current MLS configuration (credentials masked)"""
    if current_user["role"] != UserRole.SUPERUSER:
        raise HTTPException(status_code=403, detail="Superuser access required")
    
    config = await MLSService.get_config()
    
    if not config:
        return {"configured": False}
    
    # Mask sensitive fields
    return {
        "configured": True,
        "api_url": config.get("api_url", ""),
        "mls_name": config.get("mls_name", ""),
        "has_client_id": bool(config.get("client_id")),
        "has_client_secret": bool(config.get("client_secret")),
        "has_api_key": bool(config.get("api_key")),
        "updated_at": config.get("updated_at")
    }


@router.post("/mls/config")
async def save_mls_config(
    request: MLSConfigRequest,
    current_user: dict = Depends(get_current_user)
):
    """Save MLS API configuration"""
    if current_user["role"] != UserRole.SUPERUSER:
        raise HTTPException(status_code=403, detail="Superuser access required")
    
    await MLSService.save_config(request.dict())
    
    return {"success": True, "message": "MLS configuration saved"}


@router.post("/mls/test")
async def test_mls_connection(current_user: dict = Depends(get_current_user)):
    """Test MLS API connection"""
    if current_user["role"] != UserRole.SUPERUSER:
        raise HTTPException(status_code=403, detail="Superuser access required")
    
    result = await MLSService.test_connection()
    return result


@router.post("/mls/search")
async def search_mls(
    request: MLSSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Search MLS listings
    
    Requires MLS to be configured with valid credentials.
    """
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await MLSService.get_config()
    if not config or not config.get("api_url"):
        raise HTTPException(status_code=400, detail="MLS not configured. Add MLS credentials in Settings.")
    
    try:
        results = await MLSService.search(**request.dict())
        
        return {
            "success": True,
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MLS search failed: {str(e)}")


@router.get("/mls/listing/{listing_id}")
async def get_mls_listing(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get single MLS listing by ID"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await MLSService.get_config()
    if not config or not config.get("api_url"):
        raise HTTPException(status_code=400, detail="MLS not configured")
    
    result = await MLSService.get_listing(listing_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return {"success": True, "data": result}


# ============ COMBINED SEARCH ============

@router.post("/search")
async def unified_property_search(
    address: str = Query(..., description="Property address to search"),
    include_county: bool = Query(True, description="Search county tax records"),
    include_mls: bool = Query(True, description="Search MLS listings"),
    county: Optional[str] = Query(None, description="Specific county to search"),
    current_user: dict = Depends(get_current_user)
):
    """
    Unified property search - searches both county records and MLS
    
    Returns combined results from tax records (owner info) and MLS (listing info).
    """
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    results = {
        "address": address,
        "county_records": [],
        "mls_listings": [],
        "searched_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Search county records
    if include_county:
        try:
            county_results = await search_property(address, county)
            results["county_records"] = county_results
        except Exception as e:
            results["county_error"] = str(e)
    
    # Search MLS
    if include_mls:
        config = await MLSService.get_config()
        if config and config.get("api_url"):
            try:
                client = MLSClient(config)
                mls_results = await client.search_by_address(address)
                await client.close()
                results["mls_listings"] = mls_results
            except Exception as e:
                results["mls_error"] = str(e)
        else:
            results["mls_error"] = "MLS not configured"
    
    return results


# ============ LOOKUP HISTORY ============

@router.get("/history")
async def get_lookup_history(
    limit: int = Query(50, le=200),
    current_user: dict = Depends(get_current_user)
):
    """Get recent property lookup history"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    lookups = await db.property_lookups.find(
        {},
        {"_id": 0}
    ).sort("searched_at", -1).limit(limit).to_list(limit)
    
    return {"lookups": lookups, "count": len(lookups)}
