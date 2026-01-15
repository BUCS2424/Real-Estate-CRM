from pydantic import BaseModel
from typing import Optional, List

class ContactCreate(BaseModel):
    first_name: str
    last_name: str
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
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    source: Optional[str] = None
    status: str
    notes: Optional[str] = None
    tags: List[str] = []
    lead_score: int = 0
    category: Optional[str] = None
    created_at: str

class LeadScoreUpdate(BaseModel):
    lead_score: int
