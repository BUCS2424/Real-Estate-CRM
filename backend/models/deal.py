from pydantic import BaseModel
from typing import Optional

class DealCreate(BaseModel):
    title: str
    value: float
    contact_id: Optional[str] = None
    stage: str = "lead"
    property_address: Optional[str] = None
    expected_close: Optional[str] = None
    notes: Optional[str] = None

class DealResponse(BaseModel):
    id: str
    title: str
    value: float
    contact_id: Optional[str] = None
    stage: str
    property_address: Optional[str] = None
    expected_close: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

class StageUpdate(BaseModel):
    stage: str
