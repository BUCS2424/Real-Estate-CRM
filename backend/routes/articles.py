from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
import uuid
import os
from database import db
from models.article import ArticleCreate, ArticleResponse, AIGenerateRequest
from utils.auth import get_current_user

router = APIRouter()

@router.post("", response_model=ArticleResponse)
async def create_article(article: ArticleCreate, current_user: dict = Depends(get_current_user)):
    article_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    article_doc = {
        "id": article_id,
        **article.model_dump(),
        "created_at": now
    }
    await db.articles.insert_one(article_doc)
    article_doc.pop("_id", None)
    return ArticleResponse(**article_doc)

@router.get("", response_model=List[ArticleResponse])
async def get_articles(current_user: dict = Depends(get_current_user)):
    articles = await db.articles.find({}, {"_id": 0}).to_list(1000)
    return [ArticleResponse(**a) for a in articles]

@router.put("/{article_id}", response_model=ArticleResponse)
async def update_article(article_id: str, article: ArticleCreate, current_user: dict = Depends(get_current_user)):
    result = await db.articles.update_one({"id": article_id}, {"$set": article.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    return ArticleResponse(**updated)

@router.delete("/{article_id}")
async def delete_article(article_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.articles.delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted"}

@router.post("/ai/generate")
async def generate_ai_content(request: AIGenerateRequest, current_user: dict = Depends(get_current_user)):
    """Generate AI content using Emergent integrations"""
    try:
        from emergentintegrations.llm.chat import chat, Message
        
        system_prompts = {
            "article": "You are a professional real estate content writer. Write engaging, informative articles.",
            "listing": "You are a real estate listing expert. Create compelling property descriptions.",
            "email": "You are a professional email copywriter for real estate. Write persuasive, friendly emails.",
            "social": "You are a social media expert for real estate. Create engaging posts."
        }
        
        tone_instructions = {
            "professional": "Use a professional, business-appropriate tone.",
            "casual": "Use a friendly, conversational tone.",
            "luxury": "Use an elegant, sophisticated tone befitting luxury real estate.",
            "urgent": "Use an urgent, action-oriented tone."
        }
        
        system_prompt = system_prompts.get(request.type, system_prompts["article"])
        tone_instruction = tone_instructions.get(request.tone, tone_instructions["professional"])
        
        full_prompt = f"{system_prompt} {tone_instruction}\n\nUser request: {request.prompt}"
        
        llm_api_key = os.environ.get('EMERGENT_LLM_KEY') or os.environ.get('LLM_API_KEY')
        
        response = await chat(
            api_key=llm_api_key,
            messages=[Message(role="user", content=full_prompt)],
            model="gpt-4o-mini"
        )
        
        return {"content": response, "type": request.type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
