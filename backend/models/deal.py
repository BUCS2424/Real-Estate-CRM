from pydantic import BaseModel
from typing import Optional

class DealCreate(BaseModel):
    title: str
    value: float
    contact_id: str
    stage: str = "lead"
    expected_close: Optional[str] = None
    notes: Optional[str] = None

class DealResponse(BaseModel):
    id: str
    title: str
    value: float
    contact_id: str
    stage: str
    expected_close: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

class StageUpdate(BaseModel):
    stage: str
