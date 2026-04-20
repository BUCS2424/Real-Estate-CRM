"""
Expired Listings Service
Contains the core business logic for searching and converting expired MLS listings.
Extracted to break the circular import between routes/expired_listings.py and
services/expired_automation.py.
"""
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from database import db
from models.expired_listing_models import SearchExpiredRequest
from services.mls_service import mls_service


RECENT_EXPIRED_YEAR = 2026


# --------------------------------------------------------------------------- #
# Private helpers                                                              #
# --------------------------------------------------------------------------- #

def normalize_zip_codes(request: SearchExpiredRequest) -> List[str]:
    """Return a flat list of zip-code strings from a SearchExpiredRequest."""
    if request.zip_codes:
        if isinstance(request.zip_codes, list):
            return [z.strip() for z in request.zip_codes if z and z.strip()]
        if isinstance(request.zip_codes, str):
            return [z.strip() for z in request.zip_codes.split(',') if z.strip()]
    if request.zip_code:
        return [z.strip() for z in request.zip_code.split(',') if z.strip()]
    return []


def listing_matches_filters(
    listing: dict,
    property_type: Optional[str],
    exclude_rentals: bool,
    exclude_commercial: bool,
) -> bool:
    property_values = " ".join([
        str(listing.get("property_type") or ""),
        str(listing.get("property_sub_type") or "")
    ]).lower()

    if property_type and property_type.lower() not in property_values:
        return False
    if exclude_rentals and any(term in property_values for term in ["rent", "lease"]):
        return False
    if exclude_commercial and "commercial" in property_values:
        return False
    return True


def parse_listing_date(value) -> Optional[datetime]:
    if value is None:
        return None

    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    if isinstance(value, (int, float)):
        try:
            ts = float(value)
            if ts > 1_000_000_000_000:
                ts /= 1000.0
            return datetime.fromtimestamp(ts, tz=timezone.utc)
        except Exception:
            return None

    if not isinstance(value, str):
        return None

    raw = value.strip()
    if not raw:
        return None

    if raw.startswith("/Date(") and raw.endswith(")/"):
        try:
            ts = float(raw[6:-2]) / 1000.0
            return datetime.fromtimestamp(ts, tz=timezone.utc)
        except Exception:
            return None

    normalized = raw.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass

    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            dt = datetime.strptime(raw, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue

    return None


def extract_recent_reference_date(listing: dict) -> Optional[datetime]:
    candidate_keys = [
        "status_change_timestamp",
        "listing_status_change_date",
        "listing_expiration_date",
        "modification_timestamp",
        "listing_contract_date",
    ]

    for key in candidate_keys:
        parsed = parse_listing_date(listing.get(key))
        if parsed:
            return parsed

    days_on_market = listing.get("days_on_market")
    if isinstance(days_on_market, (int, float)) and days_on_market >= 0:
        try:
            return datetime.now(timezone.utc) - timedelta(days=int(days_on_market))
        except Exception:
            return None

    return None


def listing_matches_recent_year(
    listing: dict,
    days_expired: Optional[int],
    required_year: Optional[int],
    hours_expired_max: Optional[int],
) -> bool:
    reference_date = extract_recent_reference_date(listing)
    if not reference_date:
        return False

    if required_year and reference_date.year != required_year:
        return False

    if days_expired and days_expired > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_expired)
        if reference_date < cutoff:
            return False

    if hours_expired_max and hours_expired_max > 0:
        hours_cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_expired_max)
        if reference_date < hours_cutoff:
            return False

    return True


# --------------------------------------------------------------------------- #
# Public service functions                                                     #
# --------------------------------------------------------------------------- #

async def perform_expired_search(request: SearchExpiredRequest, current_user: dict) -> dict:
    """
    Core business logic for searching expired MLS listings and persisting them.
    Called by both the HTTP route handler and the automation service.
    """
    if not mls_service.is_configured():
        raise ValueError("MLS API not configured")

    dead_leads_cursor = db.dead_leads.find({}, {"mls_id": 1, "_id": 0})
    dead_leads_list = [doc["mls_id"] async for doc in dead_leads_cursor]
    dead_leads_set = set(dead_leads_list)

    zip_codes = normalize_zip_codes(request)
    search_results = []
    errors = []

    if zip_codes:
        for zip_code in zip_codes:
            result = await mls_service.search_properties(
                dataset="stellar",
                city=request.city,
                zip_code=zip_code,
                min_price=request.min_price,
                max_price=request.max_price,
                bedrooms=request.bedrooms,
                property_type=request.property_type,
                status="Expired",
                limit=request.limit,
            )
            if "error" in result:
                errors.append(result["error"])
                continue
            search_results.extend(result.get("properties", []))
    else:
        result = await mls_service.search_properties(
            dataset="stellar",
            city=request.city,
            min_price=request.min_price,
            max_price=request.max_price,
            bedrooms=request.bedrooms,
            property_type=request.property_type,
            status="Expired",
            limit=request.limit,
        )
        if "error" in result:
            errors.append(result["error"])
        else:
            search_results.extend(result.get("properties", []))

    # De-duplicate by mls_id
    listings_map: dict = {}
    for listing in search_results:
        mls_id = listing.get("mls_id")
        if mls_id:
            listings_map[mls_id] = listing

    listings = list(listings_map.values())
    filtered_listings = [
        listing for listing in listings
        if listing_matches_filters(
            listing,
            request.property_type,
            request.exclude_rentals,
            request.exclude_commercial,
        ) and listing_matches_recent_year(
            listing,
            request.days_expired,
            request.required_year or RECENT_EXPIRED_YEAR,
            request.hours_expired_max,
        )
    ]
    filtered_out = len(listings) - len(filtered_listings)

    new_count = 0
    updated_count = 0
    skipped_dead = 0
    new_listing_ids: List[str] = []

    for listing in filtered_listings:
        mls_id = listing.get("mls_id")
        if not mls_id:
            continue

        if mls_id in dead_leads_set:
            skipped_dead += 1
            continue

        existing = await db.expired_listings.find_one({"mls_id": mls_id})
        reference_date = extract_recent_reference_date(listing)

        listing_doc = {
            "mls_id": mls_id,
            "listing_key": listing.get("listing_key"),
            "address": listing.get("address"),
            "city": listing.get("city"),
            "state": listing.get("state", "FL"),
            "zip_code": listing.get("zip_code"),
            "county": listing.get("county"),
            "bedrooms": listing.get("bedrooms"),
            "bathrooms": listing.get("bathrooms"),
            "sqft": listing.get("sqft"),
            "lot_size": listing.get("lot_size"),
            "year_built": listing.get("year_built"),
            "property_type": listing.get("property_type"),
            "property_sub_type": listing.get("property_sub_type"),
            "list_price": listing.get("list_price"),
            "original_list_price": listing.get("original_list_price") or listing.get("list_price"),
            "mls_status": listing.get("status"),
            "days_on_market": listing.get("days_on_market"),
            "listing_contract_date": listing.get("listing_contract_date"),
            "listing_expiration_date": listing.get("listing_expiration_date"),
            "status_change_timestamp": listing.get("status_change_timestamp"),
            "listing_status_change_date": listing.get("listing_status_change_date"),
            "modification_timestamp": listing.get("modification_timestamp"),
            "recent_reference_date": reference_date.isoformat() if reference_date else None,
            "photos": listing.get("photos", []),
            "primary_photo": listing.get("primary_photo"),
            "listing_agent": listing.get("listing_agent"),
            "listing_office": listing.get("listing_office"),
            "description": listing.get("description"),
            "source": "expired_search",
            "last_pulled_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        if existing:
            await db.expired_listings.update_one({"mls_id": mls_id}, {"$set": listing_doc})
            updated_count += 1
        else:
            listing_doc["id"] = str(uuid.uuid4())
            listing_doc["sync_status"] = "pending"
            listing_doc["notes"] = []
            listing_doc["pulled_at"] = datetime.now(timezone.utc).isoformat()
            listing_doc["pulled_by"] = current_user["id"]
            await db.expired_listings.insert_one(listing_doc)
            new_count += 1
            new_listing_ids.append(mls_id)

    return {
        "message": "Search complete",
        "new_listings": new_count,
        "updated_listings": updated_count,
        "skipped_dead_leads": skipped_dead,
        "filtered_out": filtered_out,
        "total_found": len(filtered_listings),
        "new_listing_ids": new_listing_ids,
        "matched_listing_ids": [
            listing.get("mls_id") for listing in filtered_listings if listing.get("mls_id")
        ],
        "search_criteria": {
            "city": request.city,
            "zip_codes": zip_codes or ([] if not request.zip_code else [request.zip_code]),
            "min_price": request.min_price,
            "max_price": request.max_price,
            "property_type": request.property_type,
            "exclude_rentals": request.exclude_rentals,
            "exclude_commercial": request.exclude_commercial,
            "hours_expired_max": request.hours_expired_max,
            "days_expired": request.days_expired,
            "required_year": request.required_year or RECENT_EXPIRED_YEAR,
        },
    }


async def perform_convert_to_lead(listing_id: str, current_user: dict) -> dict:
    """
    Core business logic for converting an expired listing to a Property Lead.
    Called by both the HTTP route handler and the automation service.
    """
    expired_listing = await db.expired_listings.find_one(
        {"$or": [{"id": listing_id}, {"mls_id": listing_id}]},
        {"_id": 0},
    )

    if not expired_listing:
        raise ValueError(f"Expired listing not found: {listing_id}")

    # Already converted — return existing lead id
    if expired_listing.get("sync_status") == "converted":
        existing = await db.property_leads.find_one({"mls_id": expired_listing["mls_id"]})
        if existing:
            return {"message": "Already converted to lead", "lead_id": existing.get("id")}

    # Guard against duplicate leads
    existing_lead = await db.property_leads.find_one({"mls_id": expired_listing["mls_id"]})
    if existing_lead:
        raise ValueError("A lead already exists for this property")

    lead_id = str(uuid.uuid4())

    lead_doc = {
        "id": lead_id,
        "mls_id": expired_listing.get("mls_id"),
        "address": expired_listing.get("address"),
        "city": expired_listing.get("city"),
        "state": expired_listing.get("state", "FL"),
        "zip_code": expired_listing.get("zip_code"),
        "county": expired_listing.get("county"),
        "bedrooms": expired_listing.get("bedrooms"),
        "bathrooms": expired_listing.get("bathrooms"),
        "sqft": expired_listing.get("sqft"),
        "lot_size": expired_listing.get("lot_size"),
        "year_built": expired_listing.get("year_built"),
        "property_type": expired_listing.get("property_type"),
        "list_price": expired_listing.get("list_price"),
        "estimated_value": expired_listing.get("list_price"),
        "original_list_price": expired_listing.get("original_list_price"),
        "description": expired_listing.get("description"),
        "primary_photo": expired_listing.get("primary_photo"),
        "background_image_url": expired_listing.get("primary_photo"),
        "gallery_images": [
            {"url": p, "id": str(uuid.uuid4())}
            for p in expired_listing.get("photos", [])
            if p
        ],
        "previous_listing_agent": expired_listing.get("listing_agent"),
        "previous_listing_office": expired_listing.get("listing_office"),
        "days_on_market_before_expiry": expired_listing.get("days_on_market"),
        "status": "new",
        "moderation_status": "approved",
        "source": "expired_mls",
        "priority": "high",
        "lead_type": "seller",
        "tags": ["expired", "prospecting"],
        "notes": [{
            "text": (
                f"Converted from expired MLS listing. "
                f"Previously listed for ${expired_listing.get('list_price', 0):,}. "
                f"Was on market for {expired_listing.get('days_on_market', 'unknown')} days."
            ),
            "created_by": current_user["name"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }],
        "activity": [{
            "type": "created",
            "description": f"Created from expired MLS listing by {current_user['name']}",
            "user": current_user["name"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "mls_id": expired_listing.get("mls_id"),
        }],
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.property_leads.insert_one(lead_doc)

    await db.dead_leads.update_one(
        {"mls_id": expired_listing["mls_id"]},
        {
            "$set": {
                "mls_id": expired_listing["mls_id"],
                "address": expired_listing.get("address"),
                "city": expired_listing.get("city"),
                "source": "expired",
                "converted_to_lead_id": lead_id,
                "added_at": datetime.now(timezone.utc).isoformat(),
                "added_by": current_user["id"],
            }
        },
        upsert=True,
    )

    await db.expired_listings.update_one(
        {"mls_id": expired_listing["mls_id"]},
        {
            "$set": {
                "sync_status": "converted",
                "converted_to_lead_id": lead_id,
                "converted_at": datetime.now(timezone.utc).isoformat(),
                "converted_by": current_user["id"],
            }
        },
    )

    return {
        "message": "Converted to property lead",
        "lead_id": lead_id,
        "address": lead_doc["address"],
        "tags": lead_doc["tags"],
    }
