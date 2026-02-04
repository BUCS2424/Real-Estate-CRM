from pydantic import BaseModel
from typing import Optional, List

class TaskNotificationSettings(BaseModel):
    enabled: bool = True
    remind_before_hours: int = 24  # Remind X hours before due date
    remind_on_due: bool = True
    email_notification: bool = False

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "medium"
    status: str = "todo"
    assigned_to: Optional[str] = None
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    notifications: Optional[TaskNotificationSettings] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    notifications: Optional[TaskNotificationSettings] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: str
    status: str
    assigned_to: Optional[str] = None
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    notifications: Optional[TaskNotificationSettings] = None
    created_at: str
    updated_at: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str
