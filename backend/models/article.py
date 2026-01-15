from pydantic import BaseModel
from typing import Optional, List

class ArticleCreate(BaseModel):
    title: str
    content: str
    excerpt: Optional[str] = None
    status: str = "draft"
    tags: List[str] = []

class ArticleResponse(BaseModel):
    id: str
    title: str
    content: str
    excerpt: Optional[str] = None
    status: str
    tags: List[str] = []
    created_at: str

class AIGenerateRequest(BaseModel):
    prompt: str
    type: str = "article"
    tone: str = "professional"
