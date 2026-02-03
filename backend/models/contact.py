from pydantic import BaseModel, field_validator
from typing import Optional, List

class ContactCreate(BaseModel):
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    name: Optional[str] = None  # Legacy field
    email: str
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
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    source: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None
    tags: List[str] = []
    lead_score: int = 0
    category: Optional[str] = None
    created_at: Optional[str] = None
    
    @field_validator('first_name', 'last_name', mode='before')
    @classmethod
    def set_default_names(cls, v, info):
        return v or ""

class LeadScoreUpdate(BaseModel):
    lead_score: int
