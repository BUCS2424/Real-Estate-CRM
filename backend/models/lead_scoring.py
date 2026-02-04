"""
Lead Scoring Rules Model
Configurable scoring rules for Property/Seller leads and Buyer leads
"""
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime


class ScoringRuleCondition(BaseModel):
    """A single condition in a scoring rule"""
    field: str  # The field to check (e.g., "owner_email", "estimated_value", "bedrooms")
    operator: Literal[
        "exists",           # Field has a value
        "not_exists",       # Field is empty/null
        "equals",           # Field equals value
        "not_equals",       # Field doesn't equal value
        "greater_than",     # Numeric comparison
        "less_than",        # Numeric comparison
        "greater_or_equal", # Numeric comparison
        "less_or_equal",    # Numeric comparison
        "contains",         # String contains
        "not_contains",     # String doesn't contain
        "in_list",          # Value is in a list
        "not_in_list",      # Value is not in a list
        "is_true",          # Boolean true
        "is_false",         # Boolean false
    ]
    value: Optional[str] = None  # The value to compare against (stored as string, converted as needed)


class ScoringRuleCreate(BaseModel):
    """Create a new scoring rule"""
    name: str
    description: Optional[str] = None
    lead_type: Literal["property_seller", "buyer"]  # Which lead type this rule applies to
    category: str  # Category for grouping (contact_info, property_details, value_info, location, owner_info, source)
    conditions: List[ScoringRuleCondition]  # All conditions must be met (AND logic)
    points: int  # Points to add (can be negative)
    is_active: bool = True
    ai_verified: bool = True  # Whether AI should verify this data before scoring
    priority: int = 0  # Higher priority rules are checked first


class ScoringRuleUpdate(BaseModel):
    """Update an existing scoring rule"""
    name: Optional[str] = None
    description: Optional[str] = None
    lead_type: Optional[Literal["property_seller", "buyer"]] = None
    category: Optional[str] = None
    conditions: Optional[List[ScoringRuleCondition]] = None
    points: Optional[int] = None
    is_active: Optional[bool] = None
    ai_verified: Optional[bool] = None
    priority: Optional[int] = None


class LeadScoreResult(BaseModel):
    """Result of scoring a lead"""
    total_score: int
    max_possible_score: int
    percentage: float
    rating: str  # "excellent", "good", "fair", "poor"
    rules_matched: List[dict]  # List of rules that matched with their points
    rules_not_matched: List[dict]  # List of rules that didn't match
    ai_verification_notes: Optional[str] = None


# Field definitions for UI - grouped by category
SCORING_FIELD_DEFINITIONS = {
    "property_seller": {
        "contact_info": {
            "label": "Contact Information",
            "fields": [
                {"field": "owner_email", "label": "Owner Email", "type": "string"},
                {"field": "owner_phone", "label": "Owner Phone", "type": "string"},
                {"field": "owner_phone_2", "label": "Secondary Phone", "type": "string"},
                {"field": "owner_name", "label": "Owner Name", "type": "string"},
                {"field": "owner_mailing_address", "label": "Owner Mailing Address", "type": "string"},
            ]
        },
        "property_details": {
            "label": "Property Details",
            "fields": [
                {"field": "bedrooms", "label": "Bedrooms", "type": "number"},
                {"field": "bathrooms", "label": "Bathrooms", "type": "number"},
                {"field": "sqft", "label": "Square Footage", "type": "number"},
                {"field": "lot_size", "label": "Lot Size (acres)", "type": "number"},
                {"field": "year_built", "label": "Year Built", "type": "number"},
                {"field": "property_type", "label": "Property Type", "type": "string"},
                {"field": "pool", "label": "Has Pool", "type": "boolean"},
                {"field": "waterfront", "label": "Waterfront", "type": "boolean"},
                {"field": "garage", "label": "Garage Spaces", "type": "number"},
            ]
        },
        "value_info": {
            "label": "Value Information",
            "fields": [
                {"field": "estimated_value", "label": "Estimated Value", "type": "number"},
                {"field": "tax_assessed_value", "label": "Tax Assessed Value", "type": "number"},
                {"field": "last_sale_price", "label": "Last Sale Price", "type": "number"},
                {"field": "price_per_sqft", "label": "Price Per Sq Ft", "type": "number"},
                {"field": "zillow_estimate", "label": "Zillow Estimate", "type": "number"},
                {"field": "redfin_estimate", "label": "Redfin Estimate", "type": "number"},
                {"field": "annual_taxes", "label": "Annual Taxes", "type": "number"},
            ]
        },
        "location": {
            "label": "Location",
            "fields": [
                {"field": "city", "label": "City", "type": "string"},
                {"field": "county", "label": "County", "type": "string"},
                {"field": "zip_code", "label": "Zip Code", "type": "string"},
                {"field": "state", "label": "State", "type": "string"},
                {"field": "zoning", "label": "Zoning", "type": "string"},
            ]
        },
        "owner_info": {
            "label": "Owner Information",
            "fields": [
                {"field": "homestead", "label": "Homestead Exemption", "type": "boolean"},
                {"field": "owner_mailing_city", "label": "Owner City", "type": "string"},
                {"field": "owner_mailing_state", "label": "Owner State", "type": "string"},
            ]
        },
        "source": {
            "label": "Lead Source",
            "fields": [
                {"field": "source", "label": "Source", "type": "string"},
                {"field": "status", "label": "Status", "type": "string"},
                {"field": "priority", "label": "Priority", "type": "string"},
                {"field": "mailers_sent", "label": "Mailers Sent", "type": "number"},
                {"field": "response_status", "label": "Response Status", "type": "string"},
            ]
        }
    },
    "buyer": {
        "contact_info": {
            "label": "Contact Information",
            "fields": [
                {"field": "email", "label": "Email", "type": "string"},
                {"field": "phone", "label": "Phone", "type": "string"},
                {"field": "name", "label": "Name", "type": "string"},
            ]
        },
        "preferences": {
            "label": "Buyer Preferences",
            "fields": [
                {"field": "budget_min", "label": "Minimum Budget", "type": "number"},
                {"field": "budget_max", "label": "Maximum Budget", "type": "number"},
                {"field": "preferred_bedrooms", "label": "Preferred Bedrooms", "type": "number"},
                {"field": "preferred_bathrooms", "label": "Preferred Bathrooms", "type": "number"},
                {"field": "preferred_sqft_min", "label": "Min Square Footage", "type": "number"},
                {"field": "preferred_cities", "label": "Preferred Cities", "type": "string"},
                {"field": "preferred_property_types", "label": "Property Types", "type": "string"},
                {"field": "wants_pool", "label": "Wants Pool", "type": "boolean"},
                {"field": "wants_waterfront", "label": "Wants Waterfront", "type": "boolean"},
            ]
        },
        "qualification": {
            "label": "Qualification",
            "fields": [
                {"field": "pre_approved", "label": "Pre-Approved", "type": "boolean"},
                {"field": "pre_approval_amount", "label": "Pre-Approval Amount", "type": "number"},
                {"field": "cash_buyer", "label": "Cash Buyer", "type": "boolean"},
                {"field": "timeline", "label": "Buying Timeline", "type": "string"},
                {"field": "first_time_buyer", "label": "First Time Buyer", "type": "boolean"},
            ]
        },
        "engagement": {
            "label": "Engagement",
            "fields": [
                {"field": "source", "label": "Lead Source", "type": "string"},
                {"field": "status", "label": "Status", "type": "string"},
                {"field": "properties_viewed", "label": "Properties Viewed", "type": "number"},
                {"field": "last_contact_date", "label": "Last Contact Date", "type": "string"},
            ]
        }
    }
}


# Operator definitions for UI
OPERATOR_DEFINITIONS = [
    {"value": "exists", "label": "Has Value", "needs_value": False, "types": ["string", "number", "boolean"]},
    {"value": "not_exists", "label": "Is Empty", "needs_value": False, "types": ["string", "number", "boolean"]},
    {"value": "equals", "label": "Equals", "needs_value": True, "types": ["string", "number"]},
    {"value": "not_equals", "label": "Not Equals", "needs_value": True, "types": ["string", "number"]},
    {"value": "greater_than", "label": "Greater Than", "needs_value": True, "types": ["number"]},
    {"value": "less_than", "label": "Less Than", "needs_value": True, "types": ["number"]},
    {"value": "greater_or_equal", "label": "Greater or Equal", "needs_value": True, "types": ["number"]},
    {"value": "less_or_equal", "label": "Less or Equal", "needs_value": True, "types": ["number"]},
    {"value": "contains", "label": "Contains", "needs_value": True, "types": ["string"]},
    {"value": "not_contains", "label": "Does Not Contain", "needs_value": True, "types": ["string"]},
    {"value": "in_list", "label": "Is One Of", "needs_value": True, "types": ["string"]},
    {"value": "not_in_list", "label": "Is Not One Of", "needs_value": True, "types": ["string"]},
    {"value": "is_true", "label": "Is True", "needs_value": False, "types": ["boolean"]},
    {"value": "is_false", "label": "Is False", "needs_value": False, "types": ["boolean"]},
]
