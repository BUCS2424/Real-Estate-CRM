"""
Property Leads Model
For property-centric leads (no name initially, uploaded via CSV)
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PropertyLeadCreate(BaseModel):
    # Property Address
    address: str
    city: str
    state: str = "FL"
    zip_code: str
    county: Optional[str] = None
    
    # Property Details
    property_type: Optional[str] = None  # single_family, condo, townhouse, multi_family, land
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size: Optional[float] = None  # acres
    year_built: Optional[int] = None
    pool: Optional[bool] = None
    garage: Optional[int] = None
    waterfront: Optional[bool] = None
    zoning: Optional[str] = None
    parcel_id: Optional[str] = None
    legal_description: Optional[str] = None
    
    # Value Information
    estimated_value: Optional[float] = None
    last_sale_price: Optional[float] = None
    last_sale_date: Optional[str] = None
    price_per_sqft: Optional[float] = None
    zillow_estimate: Optional[float] = None
    redfin_estimate: Optional[float] = None
    
    # Tax Collector Data (pulled via button)
    tax_assessed_value: Optional[float] = None
    tax_land_value: Optional[float] = None
    tax_building_value: Optional[float] = None
    annual_taxes: Optional[float] = None
    homestead: Optional[bool] = None
    tax_year: Optional[int] = None
    
    # Owner Information (pulled or manual)
    owner_name: Optional[str] = None
    owner_mailing_address: Optional[str] = None
    owner_mailing_city: Optional[str] = None
    owner_mailing_state: Optional[str] = None
    owner_mailing_zip: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone_2: Optional[str] = None
    
    # Lead Status
    status: str = "new"  # new, contacted, qualified, nurturing, not_interested, converted
    priority: str = "medium"  # low, medium, high, urgent
    tags: List[str] = []
    source: Optional[str] = None  # csv_import, manual, skip_trace, etc.
    
    # Marketing
    campaign_ids: List[str] = []
    mailers_sent: int = 0
    last_mailer_date: Optional[str] = None
    response_status: Optional[str] = None  # no_response, responded, interested, not_interested


class PropertyLeadUpdate(BaseModel):
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    lot_size: Optional[float] = None
    year_built: Optional[int] = None
    pool: Optional[bool] = None
    garage: Optional[int] = None
    waterfront: Optional[bool] = None
    zoning: Optional[str] = None
    parcel_id: Optional[str] = None
    legal_description: Optional[str] = None
    estimated_value: Optional[float] = None
    last_sale_price: Optional[float] = None
    last_sale_date: Optional[str] = None
    price_per_sqft: Optional[float] = None
    zillow_estimate: Optional[float] = None
    redfin_estimate: Optional[float] = None
    tax_assessed_value: Optional[float] = None
    tax_land_value: Optional[float] = None
    tax_building_value: Optional[float] = None
    annual_taxes: Optional[float] = None
    homestead: Optional[bool] = None
    tax_year: Optional[int] = None
    owner_name: Optional[str] = None
    owner_mailing_address: Optional[str] = None
    owner_mailing_city: Optional[str] = None
    owner_mailing_state: Optional[str] = None
    owner_mailing_zip: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_email: Optional[str] = None
    owner_phone_2: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[List[str]] = None
    source: Optional[str] = None
    campaign_ids: Optional[List[str]] = None
    mailers_sent: Optional[int] = None
    last_mailer_date: Optional[str] = None
    response_status: Optional[str] = None


class PropertyLeadNote(BaseModel):
    text: str
    pinned: bool = False
