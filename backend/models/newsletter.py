from pydantic import BaseModel
from typing import Optional, List

class NewsletterCreate(BaseModel):
    subject: str
    content: str
    recipients: str = "all"
    template_id: Optional[str] = None
    scheduled_for: Optional[str] = None

class NewsletterResponse(BaseModel):
    id: str
    subject: str
    content: str
    recipients: str
    template_id: Optional[str]
    status: str
    sent_at: Optional[str]
    scheduled_for: Optional[str]
    recipients_count: int
    open_count: int
    click_count: int
    created_at: str

class NewsletterTemplateCreate(BaseModel):
    name: str
    subject: str
    content: str
    category: str = "general"

class AutoTriggerCreate(BaseModel):
    name: str
    trigger_type: str
    template_id: str
    is_active: bool = True
    delay_minutes: int = 0
