"""
Lead Scoring Routes
CRUD for scoring rules and scoring endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import sys
sys.path.append('/app/backend')

from database import db
from models.lead_scoring import (
    ScoringRuleCreate,
    ScoringRuleUpdate,
    SCORING_FIELD_DEFINITIONS,
    OPERATOR_DEFINITIONS
)
from services.lead_scoring_service import (
    calculate_lead_score,
    DEFAULT_PROPERTY_SELLER_RULES,
    DEFAULT_BUYER_RULES
)
from server import get_current_user, UserRole

router = APIRouter(prefix="/lead-scoring", tags=["Lead Scoring"])


def serialize_rule(rule: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict"""
    rule["id"] = str(rule.pop("_id"))
    return rule


# ============ RULE CRUD ============

@router.get("/rules")
async def get_scoring_rules(
    lead_type: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all scoring rules with optional filters"""
    query = {}
    if lead_type:
        query["lead_type"] = lead_type
    if category:
        query["category"] = category
    if is_active is not None:
        query["is_active"] = is_active
    
    rules = await db.scoring_rules.find(query).sort("priority", -1).to_list(500)
    return {"rules": [serialize_rule(r) for r in rules]}


@router.get("/rules/{rule_id}")
async def get_scoring_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single scoring rule"""
    if not ObjectId.is_valid(rule_id):
        raise HTTPException(status_code=400, detail="Invalid rule ID")
    
    rule = await db.scoring_rules.find_one({"_id": ObjectId(rule_id)})
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return serialize_rule(rule)


@router.post("/rules")
async def create_scoring_rule(rule: ScoringRuleCreate, current_user: dict = Depends(get_current_user)):
    """Create a new scoring rule"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    rule_dict = rule.model_dump()
    rule_dict["created_at"] = datetime.now(timezone.utc)
    rule_dict["updated_at"] = datetime.now(timezone.utc)
    rule_dict["created_by"] = str(current_user["_id"])
    
    result = await db.scoring_rules.insert_one(rule_dict)
    rule_dict["id"] = str(result.inserted_id)
    if "_id" in rule_dict:
        del rule_dict["_id"]
    
    return {"message": "Rule created", "rule": rule_dict}


@router.put("/rules/{rule_id}")
async def update_scoring_rule(
    rule_id: str, 
    updates: ScoringRuleUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Update a scoring rule"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not ObjectId.is_valid(rule_id):
        raise HTTPException(status_code=400, detail="Invalid rule ID")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.scoring_rules.update_one(
        {"_id": ObjectId(rule_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    updated = await db.scoring_rules.find_one({"_id": ObjectId(rule_id)})
    return {"message": "Rule updated", "rule": serialize_rule(updated)}


@router.delete("/rules/{rule_id}")
async def delete_scoring_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a scoring rule"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not ObjectId.is_valid(rule_id):
        raise HTTPException(status_code=400, detail="Invalid rule ID")
    
    result = await db.scoring_rules.delete_one({"_id": ObjectId(rule_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return {"message": "Rule deleted"}


@router.post("/rules/{rule_id}/toggle")
async def toggle_rule_active(rule_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle a rule's active status"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not ObjectId.is_valid(rule_id):
        raise HTTPException(status_code=400, detail="Invalid rule ID")
    
    rule = await db.scoring_rules.find_one({"_id": ObjectId(rule_id)})
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    new_status = not rule.get("is_active", True)
    await db.scoring_rules.update_one(
        {"_id": ObjectId(rule_id)},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": f"Rule {'activated' if new_status else 'deactivated'}", "is_active": new_status}


# ============ SCORING ENDPOINTS ============

@router.post("/score/property-lead/{lead_id}")
async def score_property_lead(
    lead_id: str,
    verify_with_ai: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Calculate score for a property lead"""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    lead = await db.property_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Get property/seller rules
    rules = await db.scoring_rules.find({
        "lead_type": "property_seller",
        "is_active": True
    }).to_list(500)
    
    if not rules:
        # Use default rules if none exist
        rules = DEFAULT_PROPERTY_SELLER_RULES
    
    score_result = await calculate_lead_score(lead, rules, verify_with_ai)
    
    # Update lead with score
    await db.property_leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {
            "score": score_result["total_score"],
            "score_percentage": score_result["percentage"],
            "score_rating": score_result["rating"],
            "score_details": score_result,
            "scored_at": datetime.now(timezone.utc)
        }}
    )
    
    return score_result


@router.post("/score/buyer-lead/{lead_id}")
async def score_buyer_lead(
    lead_id: str,
    verify_with_ai: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Calculate score for a buyer lead"""
    if not ObjectId.is_valid(lead_id):
        raise HTTPException(status_code=400, detail="Invalid lead ID")
    
    lead = await db.leads.find_one({"_id": ObjectId(lead_id), "lead_type": "buyer"})
    if not lead:
        raise HTTPException(status_code=404, detail="Buyer lead not found")
    
    # Get buyer rules
    rules = await db.scoring_rules.find({
        "lead_type": "buyer",
        "is_active": True
    }).to_list(500)
    
    if not rules:
        rules = DEFAULT_BUYER_RULES
    
    score_result = await calculate_lead_score(lead, rules, verify_with_ai)
    
    # Update lead with score
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {
            "score": score_result["total_score"],
            "score_percentage": score_result["percentage"],
            "score_rating": score_result["rating"],
            "score_details": score_result,
            "scored_at": datetime.now(timezone.utc)
        }}
    )
    
    return score_result


@router.post("/score/batch")
async def score_leads_batch(
    lead_type: str,
    lead_ids: List[str] = None,
    verify_with_ai: bool = False,  # Default off for batch to save API calls
    current_user: dict = Depends(get_current_user)
):
    """Score multiple leads at once"""
    if lead_type not in ["property_seller", "buyer"]:
        raise HTTPException(status_code=400, detail="Invalid lead type")
    
    # Get rules
    rules = await db.scoring_rules.find({
        "lead_type": lead_type,
        "is_active": True
    }).to_list(500)
    
    if not rules:
        rules = DEFAULT_PROPERTY_SELLER_RULES if lead_type == "property_seller" else DEFAULT_BUYER_RULES
    
    # Determine collection
    collection = db.property_leads if lead_type == "property_seller" else db.leads
    query = {"lead_type": "buyer"} if lead_type == "buyer" else {}
    
    if lead_ids:
        query["_id"] = {"$in": [ObjectId(lid) for lid in lead_ids if ObjectId.is_valid(lid)]}
    
    leads = await collection.find(query).to_list(1000)
    
    results = []
    for lead in leads:
        score_result = await calculate_lead_score(lead, rules, verify_with_ai)
        
        # Update lead
        await collection.update_one(
            {"_id": lead["_id"]},
            {"$set": {
                "score": score_result["total_score"],
                "score_percentage": score_result["percentage"],
                "score_rating": score_result["rating"],
                "scored_at": datetime.now(timezone.utc)
            }}
        )
        
        results.append({
            "lead_id": str(lead["_id"]),
            "score": score_result["total_score"],
            "rating": score_result["rating"]
        })
    
    return {"scored_count": len(results), "results": results}


# ============ METADATA ENDPOINTS ============

@router.get("/fields")
async def get_scoring_fields(current_user: dict = Depends(get_current_user)):
    """Get available fields for scoring rules"""
    return SCORING_FIELD_DEFINITIONS


@router.get("/operators")
async def get_scoring_operators(current_user: dict = Depends(get_current_user)):
    """Get available operators for scoring rules"""
    return OPERATOR_DEFINITIONS


@router.get("/stats")
async def get_scoring_stats(current_user: dict = Depends(get_current_user)):
    """Get statistics about scoring rules and scored leads"""
    property_rules = await db.scoring_rules.count_documents({"lead_type": "property_seller"})
    buyer_rules = await db.scoring_rules.count_documents({"lead_type": "buyer"})
    active_rules = await db.scoring_rules.count_documents({"is_active": True})
    
    scored_property_leads = await db.property_leads.count_documents({"score": {"$exists": True}})
    scored_buyer_leads = await db.leads.count_documents({"lead_type": "buyer", "score": {"$exists": True}})
    
    return {
        "rules": {
            "total": property_rules + buyer_rules,
            "property_seller": property_rules,
            "buyer": buyer_rules,
            "active": active_rules
        },
        "scored_leads": {
            "property_seller": scored_property_leads,
            "buyer": scored_buyer_leads
        }
    }


# ============ SEED DEFAULT RULES ============

@router.post("/seed-defaults")
async def seed_default_rules(current_user: dict = Depends(get_current_user)):
    """Seed the database with default scoring rules"""
    if current_user["role"] != UserRole.SUPERUSER:
        raise HTTPException(status_code=403, detail="Superuser access required")
    
    # Check if rules already exist
    existing = await db.scoring_rules.count_documents({})
    if existing > 0:
        return {"message": f"Rules already exist ({existing} rules). Delete existing rules first to reseed."}
    
    # Insert default rules
    all_rules = DEFAULT_PROPERTY_SELLER_RULES + DEFAULT_BUYER_RULES
    for rule in all_rules:
        rule["created_at"] = datetime.now(timezone.utc)
        rule["updated_at"] = datetime.now(timezone.utc)
        rule["created_by"] = str(current_user["_id"])
    
    result = await db.scoring_rules.insert_many(all_rules)
    
    return {"message": f"Seeded {len(result.inserted_ids)} default rules"}
