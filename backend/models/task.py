from pydantic import BaseModel
from typing import Optional

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "medium"
    status: str = "pending"
    assigned_to: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: str
    status: str
    assigned_to: Optional[str] = None
    created_at: str

class StatusUpdate(BaseModel):
    status: str
