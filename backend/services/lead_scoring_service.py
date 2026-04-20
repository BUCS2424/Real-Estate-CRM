"""
Lead Scoring Service
Applies scoring rules to leads with optional AI verification
"""
import os
import json
import re
from typing import Optional, List, Dict, Any
from datetime import datetime

# AI Integration for verification
try:
    from emergentintegrations.llm.chat import chat, Message
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False


def get_nested_value(data: dict, field: str) -> Any:
    """Get a value from a nested dictionary using dot notation"""
    keys = field.split('.')
    value = data
    for key in keys:
        if isinstance(value, dict):
            value = value.get(key)
        else:
            return None
    return value


def evaluate_condition(lead_data: dict, condition: dict) -> bool:
    """Evaluate a single condition against lead data"""
    field = condition.get("field")
    operator = condition.get("operator")
    compare_value = condition.get("value")
    
    # Get the actual value from lead data
    actual_value = get_nested_value(lead_data, field)
    
    # Handle different operators
    if operator == "exists":
        return actual_value is not None and actual_value != "" and actual_value != []
    
    elif operator == "not_exists":
        return actual_value is None or actual_value == "" or actual_value == []
    
    elif operator == "equals":
        if isinstance(actual_value, (int, float)):
            try:
                return actual_value == float(compare_value)
            except (ValueError, TypeError):
                return False
        return str(actual_value).lower() == str(compare_value).lower()
    
    elif operator == "not_equals":
        if isinstance(actual_value, (int, float)):
            try:
                return actual_value != float(compare_value)
            except (ValueError, TypeError):
                return True
        return str(actual_value).lower() != str(compare_value).lower()
    
    elif operator == "greater_than":
        try:
            return float(actual_value or 0) > float(compare_value)
        except (ValueError, TypeError):
            return False
    
    elif operator == "less_than":
        try:
            return float(actual_value or 0) < float(compare_value)
        except (ValueError, TypeError):
            return False
    
    elif operator == "greater_or_equal":
        try:
            return float(actual_value or 0) >= float(compare_value)
        except (ValueError, TypeError):
            return False
    
    elif operator == "less_or_equal":
        try:
            return float(actual_value or 0) <= float(compare_value)
        except (ValueError, TypeError):
            return False
    
    elif operator == "contains":
        if actual_value is None:
            return False
        return str(compare_value).lower() in str(actual_value).lower()
    
    elif operator == "not_contains":
        if actual_value is None:
            return True
        return str(compare_value).lower() not in str(actual_value).lower()
    
    elif operator == "in_list":
        if actual_value is None:
            return False
        # Compare value is comma-separated list
        values_list = [v.strip().lower() for v in str(compare_value).split(",")]
        return str(actual_value).lower() in values_list
    
    elif operator == "not_in_list":
        if actual_value is None:
            return True
        values_list = [v.strip().lower() for v in str(compare_value).split(",")]
        return str(actual_value).lower() not in values_list
    
    elif operator == "is_true":
        return actual_value == True or actual_value == "true" or actual_value == "True" or actual_value == 1  # noqa: E712

    elif operator == "is_false":
        return actual_value == False or actual_value == "false" or actual_value == "False" or actual_value == 0 or actual_value is None  # noqa: E712
    
    return False


def evaluate_rule(lead_data: dict, rule: dict) -> bool:
    """Evaluate all conditions in a rule (AND logic)"""
    conditions = rule.get("conditions", [])
    if not conditions:
        return False
    
    for condition in conditions:
        if not evaluate_condition(lead_data, condition):
            return False
    return True


async def verify_data_with_ai(lead_data: dict, rules_to_verify: List[dict]) -> dict:
    """
    Use AI to verify lead data quality before scoring
    Returns a dict with verification results and any corrections
    """
    if not AI_AVAILABLE:
        return {"verified": True, "notes": "AI verification not available", "corrections": {}}
    
    api_key = os.environ.get("EMERGENT_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return {"verified": True, "notes": "No API key for AI verification", "corrections": {}}
    
    # Build a prompt for AI verification
    fields_to_verify = set()
    for rule in rules_to_verify:
        for condition in rule.get("conditions", []):
            fields_to_verify.add(condition.get("field"))
    
    # Extract relevant data
    data_to_verify = {}
    for field in fields_to_verify:
        value = get_nested_value(lead_data, field)
        if value is not None:
            data_to_verify[field] = value
    
    if not data_to_verify:
        return {"verified": True, "notes": "No data to verify", "corrections": {}}
    
    prompt = f"""You are a data quality analyst for a real estate CRM. Verify the following lead data for accuracy and completeness.

Lead Data:
{json.dumps(data_to_verify, indent=2)}

Please analyze this data and respond in JSON format:
{{
    "is_valid": true/false,
    "confidence": 0-100,
    "issues": ["list of any data quality issues found"],
    "suggestions": {{"field_name": "suggested_correction"}},
    "notes": "brief summary of data quality"
}}

Check for:
1. Phone numbers in valid format
2. Email addresses properly formatted
3. Property values in reasonable range for real estate
4. Addresses that look complete
5. Any obvious data entry errors
"""

    try:
        response = await chat(
            api_key=api_key,
            model="gpt-4o-mini",
            messages=[Message(role="user", content=prompt)]
        )
        
        # Parse AI response
        response_text = response.message.content
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = json.loads(json_match.group())
            return {
                "verified": result.get("is_valid", True),
                "confidence": result.get("confidence", 100),
                "notes": result.get("notes", ""),
                "issues": result.get("issues", []),
                "corrections": result.get("suggestions", {})
            }
    except Exception as e:
        return {"verified": True, "notes": f"AI verification error: {str(e)}", "corrections": {}}
    
    return {"verified": True, "notes": "AI verification completed", "corrections": {}}


async def calculate_lead_score(lead_data: dict, rules: List[dict], verify_with_ai: bool = True) -> dict:
    """
    Calculate score for a lead based on scoring rules
    
    Args:
        lead_data: The lead document from database
        rules: List of scoring rules to apply
        verify_with_ai: Whether to use AI to verify data quality
    
    Returns:
        LeadScoreResult-like dict
    """
    # Filter to active rules
    active_rules = [r for r in rules if r.get("is_active", True)]
    
    # Sort by priority
    active_rules.sort(key=lambda x: x.get("priority", 0), reverse=True)
    
    # Get rules that need AI verification
    ai_rules = [r for r in active_rules if r.get("ai_verified", False)]
    
    # AI Verification
    ai_notes = None
    if verify_with_ai and ai_rules:
        ai_result = await verify_data_with_ai(lead_data, ai_rules)
        ai_notes = ai_result.get("notes", "")
        
        # Apply any corrections suggested by AI
        corrections = ai_result.get("corrections", {})
        if corrections:
            # Don't modify original, just note the corrections
            ai_notes += f" Suggested corrections: {json.dumps(corrections)}"
    
    # Calculate score
    total_score = 0
    max_possible_score = 0
    rules_matched = []
    rules_not_matched = []
    
    for rule in active_rules:
        points = rule.get("points", 0)
        
        # Only count positive points toward max possible
        if points > 0:
            max_possible_score += points
        
        # Check if rule matches
        if evaluate_rule(lead_data, rule):
            total_score += points
            rules_matched.append({
                "rule_id": str(rule.get("_id", rule.get("id", ""))),
                "name": rule.get("name", ""),
                "points": points,
                "category": rule.get("category", "")
            })
        else:
            rules_not_matched.append({
                "rule_id": str(rule.get("_id", rule.get("id", ""))),
                "name": rule.get("name", ""),
                "points": points,
                "category": rule.get("category", "")
            })
    
    # Calculate percentage
    percentage = 0
    if max_possible_score > 0:
        percentage = min(100, max(0, (total_score / max_possible_score) * 100))
    
    # Determine rating
    if percentage >= 80:
        rating = "excellent"
    elif percentage >= 60:
        rating = "good"
    elif percentage >= 40:
        rating = "fair"
    else:
        rating = "poor"
    
    return {
        "total_score": total_score,
        "max_possible_score": max_possible_score,
        "percentage": round(percentage, 1),
        "rating": rating,
        "rules_matched": rules_matched,
        "rules_not_matched": rules_not_matched,
        "ai_verification_notes": ai_notes
    }


# Default rules to seed the database
DEFAULT_PROPERTY_SELLER_RULES = [
    {
        "name": "Has Owner Email",
        "description": "Lead has an email address for the owner",
        "lead_type": "property_seller",
        "category": "contact_info",
        "conditions": [{"field": "owner_email", "operator": "exists", "value": None}],
        "points": 15,
        "is_active": True,
        "ai_verified": True,
        "priority": 10
    },
    {
        "name": "Has Owner Phone",
        "description": "Lead has a phone number for the owner",
        "lead_type": "property_seller",
        "category": "contact_info",
        "conditions": [{"field": "owner_phone", "operator": "exists", "value": None}],
        "points": 15,
        "is_active": True,
        "ai_verified": True,
        "priority": 10
    },
    {
        "name": "Has Owner Name",
        "description": "Lead has the owner's name",
        "lead_type": "property_seller",
        "category": "contact_info",
        "conditions": [{"field": "owner_name", "operator": "exists", "value": None}],
        "points": 10,
        "is_active": True,
        "ai_verified": False,
        "priority": 5
    },
    {
        "name": "High Value Property",
        "description": "Property value is $500,000 or more",
        "lead_type": "property_seller",
        "category": "value_info",
        "conditions": [{"field": "estimated_value", "operator": "greater_or_equal", "value": "500000"}],
        "points": 20,
        "is_active": True,
        "ai_verified": False,
        "priority": 8
    },
    {
        "name": "Luxury Property",
        "description": "Property value is $1,000,000 or more",
        "lead_type": "property_seller",
        "category": "value_info",
        "conditions": [{"field": "estimated_value", "operator": "greater_or_equal", "value": "1000000"}],
        "points": 30,
        "is_active": True,
        "ai_verified": False,
        "priority": 9
    },
    {
        "name": "Has Property Details",
        "description": "Property has bedrooms and bathrooms info",
        "lead_type": "property_seller",
        "category": "property_details",
        "conditions": [
            {"field": "bedrooms", "operator": "exists", "value": None},
            {"field": "bathrooms", "operator": "exists", "value": None}
        ],
        "points": 10,
        "is_active": True,
        "ai_verified": False,
        "priority": 3
    },
    {
        "name": "Large Home",
        "description": "Property has 4+ bedrooms",
        "lead_type": "property_seller",
        "category": "property_details",
        "conditions": [{"field": "bedrooms", "operator": "greater_or_equal", "value": "4"}],
        "points": 10,
        "is_active": True,
        "ai_verified": False,
        "priority": 4
    },
    {
        "name": "Has Pool",
        "description": "Property has a pool",
        "lead_type": "property_seller",
        "category": "property_details",
        "conditions": [{"field": "pool", "operator": "is_true", "value": None}],
        "points": 5,
        "is_active": True,
        "ai_verified": False,
        "priority": 2
    },
    {
        "name": "Waterfront Property",
        "description": "Property is waterfront",
        "lead_type": "property_seller",
        "category": "property_details",
        "conditions": [{"field": "waterfront", "operator": "is_true", "value": None}],
        "points": 15,
        "is_active": True,
        "ai_verified": False,
        "priority": 7
    },
    {
        "name": "Non-Homestead (Investor)",
        "description": "No homestead exemption - likely investor property",
        "lead_type": "property_seller",
        "category": "owner_info",
        "conditions": [{"field": "homestead", "operator": "is_false", "value": None}],
        "points": 10,
        "is_active": True,
        "ai_verified": False,
        "priority": 6
    },
    {
        "name": "Absentee Owner",
        "description": "Owner mailing address is different from property address",
        "lead_type": "property_seller",
        "category": "owner_info",
        "conditions": [{"field": "owner_mailing_address", "operator": "exists", "value": None}],
        "points": 10,
        "is_active": True,
        "ai_verified": False,
        "priority": 5
    },
    {
        "name": "Target City - Tampa",
        "description": "Property is located in Tampa",
        "lead_type": "property_seller",
        "category": "location",
        "conditions": [{"field": "city", "operator": "equals", "value": "Tampa"}],
        "points": 5,
        "is_active": False,
        "ai_verified": False,
        "priority": 1
    }
]

DEFAULT_BUYER_RULES = [
    {
        "name": "Has Email",
        "description": "Buyer has provided email",
        "lead_type": "buyer",
        "category": "contact_info",
        "conditions": [{"field": "email", "operator": "exists", "value": None}],
        "points": 10,
        "is_active": True,
        "ai_verified": True,
        "priority": 10
    },
    {
        "name": "Has Phone",
        "description": "Buyer has provided phone number",
        "lead_type": "buyer",
        "category": "contact_info",
        "conditions": [{"field": "phone", "operator": "exists", "value": None}],
        "points": 10,
        "is_active": True,
        "ai_verified": True,
        "priority": 10
    },
    {
        "name": "Pre-Approved Buyer",
        "description": "Buyer has mortgage pre-approval",
        "lead_type": "buyer",
        "category": "qualification",
        "conditions": [{"field": "pre_approved", "operator": "is_true", "value": None}],
        "points": 25,
        "is_active": True,
        "ai_verified": False,
        "priority": 9
    },
    {
        "name": "Cash Buyer",
        "description": "Buyer is paying cash",
        "lead_type": "buyer",
        "category": "qualification",
        "conditions": [{"field": "cash_buyer", "operator": "is_true", "value": None}],
        "points": 30,
        "is_active": True,
        "ai_verified": False,
        "priority": 10
    },
    {
        "name": "High Budget",
        "description": "Buyer budget is $500,000+",
        "lead_type": "buyer",
        "category": "qualification",
        "conditions": [{"field": "budget_max", "operator": "greater_or_equal", "value": "500000"}],
        "points": 20,
        "is_active": True,
        "ai_verified": False,
        "priority": 8
    },
    {
        "name": "Luxury Buyer",
        "description": "Buyer budget is $1,000,000+",
        "lead_type": "buyer",
        "category": "qualification",
        "conditions": [{"field": "budget_max", "operator": "greater_or_equal", "value": "1000000"}],
        "points": 30,
        "is_active": True,
        "ai_verified": False,
        "priority": 9
    },
    {
        "name": "Ready to Buy",
        "description": "Buyer timeline is within 3 months",
        "lead_type": "buyer",
        "category": "qualification",
        "conditions": [{"field": "timeline", "operator": "in_list", "value": "immediately,1-3 months,asap"}],
        "points": 15,
        "is_active": True,
        "ai_verified": False,
        "priority": 7
    },
    {
        "name": "Wants Waterfront",
        "description": "Buyer is looking for waterfront property",
        "lead_type": "buyer",
        "category": "preferences",
        "conditions": [{"field": "wants_waterfront", "operator": "is_true", "value": None}],
        "points": 10,
        "is_active": True,
        "ai_verified": False,
        "priority": 5
    },
    {
        "name": "Active Searcher",
        "description": "Buyer has viewed 3+ properties",
        "lead_type": "buyer",
        "category": "engagement",
        "conditions": [{"field": "properties_viewed", "operator": "greater_or_equal", "value": "3"}],
        "points": 15,
        "is_active": True,
        "ai_verified": False,
        "priority": 6
    }
]
