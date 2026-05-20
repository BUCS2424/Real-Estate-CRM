"""eSign Models"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ESignField(BaseModel):
    id: str
    type: str  # signature, initials, date, text, checkbox, fullname, email
    page: int = 1
    x: float   # % of page width
    y: float   # % of page height
    width: float
    height: float
    required: bool = True
    label: str = ""
    placeholder: Optional[str] = None
    prefill_from: Optional[str] = None  # signer_name, signer_email, today


class ESignTemplateCreate(BaseModel):
    name: str
    category: str = "general"
    description: Optional[str] = None


class ESignTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    fields: Optional[List[dict]] = None


class ESignRequestCreate(BaseModel):
    template_id: str
    signer_name: str
    signer_email: str
    signer_phone: Optional[str] = None
    contact_id: Optional[str] = None
    lead_id: Optional[str] = None
    message: Optional[str] = None
    expires_in_days: int = 30
