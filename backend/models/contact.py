from pydantic import BaseModel, field_validator
from typing import Optional, List

class ContactCreate(BaseModel):
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    name: Optional[str] = None  # Legacy field
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    source: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None
    tags: List[str] = []
    category: Optional[str] = None

class ContactResponse(BaseModel):
    id: str
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    name: Optional[str] = None  # Legacy field
    display_name: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[str] = None
    email_2: Optional[str] = None
    email_3: Optional[str] = None
    phone: Optional[str] = None
    home_phone: Optional[str] = None
    business_phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    company: Optional[str] = None
    organization: Optional[str] = None
    position: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    source: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None
    tags: List[str] = []
    lead_score: int = 0
    category: Optional[str] = None
    categories: Optional[str] = None
    # Address fields
    home_street: Optional[str] = None
    home_city: Optional[str] = None
    home_state: Optional[str] = None
    home_postal_code: Optional[str] = None
    home_country: Optional[str] = None
    business_address: Optional[str] = None
    business_city: Optional[str] = None
    business_state: Optional[str] = None
    business_postal_code: Optional[str] = None
    business_country: Optional[str] = None
    # Other
    birthday: Optional[str] = None
    anniversary: Optional[str] = None
    web_page: Optional[str] = None
    related_name: Optional[str] = None
    created_at: Optional[str] = None
    
    @field_validator('first_name', 'last_name', mode='before')
    @classmethod
    def set_default_names(cls, v, info):
        return v or ""
    
    @field_validator('tags', mode='before')
    @classmethod
    def set_default_tags(cls, v, info):
        return v or []

class LeadScoreUpdate(BaseModel):
    lead_score: int
