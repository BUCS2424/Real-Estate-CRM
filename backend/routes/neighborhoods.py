"""Neighborhoods routes - manage and serve neighborhood listing pages."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
import uuid
from database import db
from utils.auth import get_current_user
from models.user import UserRole
from services.mls_service import mls_service
import os

router = APIRouter(prefix="/neighborhoods", tags=["Neighborhoods"])

AGENT_MLS_ID = os.environ.get("AGENT_MLS_ID", "261507429,260013903")

# Default neighborhoods with search criteria
DEFAULT_NEIGHBORHOODS = [
    {
        "id": "davis-island",
        "name": "Davis Island",
        "slug": "davis-island",
        "criteria": {"status": "Active", "subdivision": "Davis*", "zip_codes": ["33606"]},
        "enabled": True,
        "sort_order": 0,
    },
    {
        "id": "historic-hyde-park",
        "name": "Historic Hyde Park and Spanish Town",
        "slug": "historic-hyde-park",
        "criteria": {"status": "Active", "subdivision": "Hyde Park*,Spanish Town*", "zip_codes": ["33606"]},
        "enabled": True,
        "sort_order": 1,
    },
    {
        "id": "historic-ybor-city",
        "name": "Historic Ybor City",
        "slug": "historic-ybor-city",
        "criteria": {"status": "Active", "subdivision": "Ybor*", "zip_codes": ["33605"]},
        "enabled": True,
        "sort_order": 2,
    },
    {
        "id": "westshore-beach-park",
        "name": "Westshore and Beach Park",
        "slug": "westshore-beach-park",
        "criteria": {"status": "Active", "subdivision": "Westshore*,Beach Park*", "zip_codes": ["33609", "33611"]},
        "enabled": True,
        "sort_order": 3,
    },
    {
        "id": "boating-enthusiasts",
        "name": "Boating Enthusiasts",
        "slug": "boating-enthusiasts",
        "criteria": {"status": "Active", "features": "Boat*,Dock*,Water*", "property_type": "Residential"},
        "enabled": True,
        "sort_order": 4,
    },
    {
        "id": "beach-bunnies",
        "name": "Beach Bunnies",
        "slug": "beach-bunnies",
        "criteria": {"status": "Active", "features": "Beach*,Gulf*,Ocean*", "property_type": "Residential"},
        "enabled": True,
        "sort_order": 5,
    },
    {
        "id": "happy-in-the-heights",
        "name": "Happy in the Heights",
        "slug": "happy-in-the-heights",
        "criteria": {"status": "Active", "subdivision": "Seminole Heights*,Heights*", "zip_codes": ["33603", "33604"]},
        "enabled": True,
        "sort_order": 6,
    },
]


@router.get("")
async def get_neighborhoods(current_user: dict = Depends(get_current_user)):
    """Get all neighborhoods (admin)."""
    neighborhoods = await db.neighborhoods.find({}).sort("sort_order", 1).to_list(100)
    if not neighborhoods:
        # Seed defaults
        for n in DEFAULT_NEIGHBORHOODS:
            n["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.neighborhoods.insert_many([{**n} for n in DEFAULT_NEIGHBORHOODS])
        neighborhoods = await db.neighborhoods.find({}).sort("sort_order", 1).to_list(100)
    for n in neighborhoods:
        if "_id" in n:
            if "id" not in n:
                n["id"] = str(n.pop("_id"))
            else:
                n.pop("_id", None)
    return neighborhoods


@router.put("/{neighborhood_id}")
async def update_neighborhood(neighborhood_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update a neighborhood's settings/criteria."""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    data.pop("_id", None)
    data.pop("id", None)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.neighborhoods.update_one({"id": neighborhood_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Neighborhood not found")
    updated = await db.neighborhoods.find_one({"id": neighborhood_id})
    updated.pop("_id", None)
    return updated


@router.post("")
async def create_neighborhood(data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new neighborhood."""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    doc = {
        "id": str(uuid.uuid4()),
        "name": data.get("name", "New Neighborhood"),
        "slug": data.get("slug", str(uuid.uuid4())[:8]),
        "criteria": data.get("criteria", {}),
        "enabled": data.get("enabled", True),
        "sort_order": data.get("sort_order", 99),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.neighborhoods.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ── Public endpoint (no auth) ──
@router.get("/public/list")
async def get_public_neighborhoods():
    """Get enabled neighborhoods for public site menu."""
    neighborhoods = await db.neighborhoods.find({"enabled": True}).sort("sort_order", 1).to_list(100)
    if not neighborhoods:
        # Seed defaults on first public visit
        for n in DEFAULT_NEIGHBORHOODS:
            n["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.neighborhoods.insert_many([{**n} for n in DEFAULT_NEIGHBORHOODS])
        neighborhoods = await db.neighborhoods.find({"enabled": True}).sort("sort_order", 1).to_list(100)
    return [{"id": n.get("id", str(n["_id"])), "name": n["name"], "slug": n["slug"]} for n in neighborhoods]


@router.get("/public/{slug}")
async def get_public_neighborhood(slug: str):
    """Get a single neighborhood and its MLS listings."""
    neighborhood = await db.neighborhoods.find_one({"slug": slug, "enabled": True})
    if not neighborhood:
        raise HTTPException(status_code=404, detail="Neighborhood not found")
    neighborhood.pop("_id", None)

    # Search MLS using the neighborhood criteria — restricted to Sheila Desautels'
    # own live listings only (Active/Pending). Sold homes never show in Neighborhoods.
    criteria = neighborhood.get("criteria", {})
    listings = []
    seen_mls_ids = set()

    if mls_service.is_configured():
        live_statuses = ["Active", "Pending"]
        search_limit = 50

        for std_status in live_statuses:
            if criteria.get("zip_codes"):
                # Search per zip code and merge results
                for zc in criteria["zip_codes"]:
                    result = await mls_service.search_properties(
                        zip_code=zc,
                        status=std_status,
                        agent_id=AGENT_MLS_ID,
                        limit=search_limit,
                    )
                    for p in result.get("properties", []):
                        # Apply subdivision filter if specified
                        if criteria.get("subdivision"):
                            patterns = [s.strip().lower().replace("*", "") for s in criteria["subdivision"].split(",")]
                            subdiv = (p.get("subdivision") or p.get("address") or "").lower()
                            if not any(pat in subdiv for pat in patterns):
                                continue
                        mls_id = p.get("mls_id")
                        if mls_id and mls_id in seen_mls_ids:
                            continue
                        if mls_id:
                            seen_mls_ids.add(mls_id)
                        listings.append(p)
            elif criteria.get("city"):
                result = await mls_service.search_properties(
                    city=criteria["city"],
                    status=std_status,
                    agent_id=AGENT_MLS_ID,
                    limit=search_limit,
                )
                for p in result.get("properties", []):
                    mls_id = p.get("mls_id")
                    if mls_id and mls_id in seen_mls_ids:
                        continue
                    if mls_id:
                        seen_mls_ids.add(mls_id)
                    listings.append(p)

    # Filter out any rentals/leases that slipped through
    LEASE_TYPES = {'residential lease', 'commercial lease'}
    listings = [l for l in listings if (l.get('property_type') or '').lower() not in LEASE_TYPES]

    return {
        "neighborhood": neighborhood,
        "listings": listings,
        "total": len(listings),
    }



@router.get("/public/property/{mls_id}")
async def get_public_mls_property(mls_id: str):
    """Get full property details by MLS ID for the public detail page."""
    if not mls_service.is_configured():
        raise HTTPException(status_code=503, detail="MLS service not configured")

    detail = await mls_service.get_property_details(mls_id=mls_id)
    if detail.get("error"):
        raise HTTPException(status_code=404, detail=detail["error"])

    return detail
