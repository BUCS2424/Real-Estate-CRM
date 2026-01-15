from pydantic import BaseModel
from typing import Optional, List

class MailingListCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "general"  # general, buyers, sellers, vip, custom

class MailingListResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: str
    subscriber_count: int = 0
    created_at: str
    updated_at: str

class MailingListSubscriber(BaseModel):
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    tags: List[str] = []

class ImportResult(BaseModel):
    total: int
    imported: int
    duplicates: int
    errors: int
    error_details: List[str] = []
