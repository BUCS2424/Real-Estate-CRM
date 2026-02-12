"""
Social Media Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid

from utils.auth import get_current_user
from models.user import UserRole
from models.social_media import (
    SocialPlatform, PostStatus, SocialAccountCreate, SocialAccountResponse,
    SocialPostCreate, SocialPostUpdate, SocialPostResponse,
    PostTemplateCreate, PostTemplateResponse, AIContentRequest, AutoPostSettings
)
from database import db

router = APIRouter(prefix="/social", tags=["Social Media"])


# ============ ACCOUNTS ============

@router.get("/accounts")
async def get_social_accounts(current_user: dict = Depends(get_current_user)):
    """Get all connected social media accounts"""
    accounts = await db.social_accounts.find({"is_active": True}, {"_id": 0, "access_token": 0, "refresh_token": 0}).to_list(100)
    return {"accounts": accounts}


@router.post("/accounts")
async def connect_social_account(
    account: SocialAccountCreate,
    current_user: dict = Depends(get_current_user)
):
    """Connect a new social media account"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if account already exists
    existing = await db.social_accounts.find_one({
        "platform": account.platform,
        "account_id": account.account_id
    })
    
    if existing:
        # Update existing account
        await db.social_accounts.update_one(
            {"id": existing["id"]},
            {"$set": {
                "access_token": account.access_token,
                "refresh_token": account.refresh_token,
                "token_expires_at": account.token_expires_at,
                "is_active": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Account reconnected", "id": existing["id"]}
    
    # Create new account
    account_doc = {
        "id": str(uuid.uuid4()),
        "platform": account.platform,
        "account_name": account.account_name,
        "account_id": account.account_id,
        "access_token": account.access_token,
        "refresh_token": account.refresh_token,
        "token_expires_at": account.token_expires_at,
        "page_id": account.page_id,
        "profile_image": account.profile_image,
        "is_active": True,
        "is_connected": True,
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "connected_by": current_user["id"]
    }
    
    await db.social_accounts.insert_one(account_doc)
    return {"message": "Account connected", "id": account_doc["id"]}


@router.delete("/accounts/{account_id}")
async def disconnect_social_account(
    account_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Disconnect a social media account"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.social_accounts.update_one(
        {"id": account_id},
        {"$set": {"is_active": False, "disconnected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {"message": "Account disconnected"}


# ============ POSTS ============

@router.get("/posts")
async def get_posts(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get all social media posts"""
    query = {}
    if status:
        query["status"] = status
    if platform:
        query["platforms"] = platform
    
    posts = await db.social_posts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.social_posts.count_documents(query)
    
    return {"posts": posts, "total": total}


@router.get("/posts/calendar")
async def get_calendar_posts(
    start_date: str,
    end_date: str,
    current_user: dict = Depends(get_current_user)
):
    """Get posts for calendar view"""
    posts = await db.social_posts.find({
        "scheduled_for": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(500)
    
    return {"posts": posts}


@router.post("/posts")
async def create_post(
    post: SocialPostCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Create a new social media post"""
    now = datetime.now(timezone.utc).isoformat()
    
    post_doc = {
        "id": str(uuid.uuid4()),
        "content": post.content,
        "platforms": [p.value if isinstance(p, SocialPlatform) else p for p in post.platforms],
        "media": [m.dict() for m in post.media] if post.media else [],
        "scheduled_for": post.scheduled_for,
        "status": PostStatus.SCHEDULED.value if post.scheduled_for else PostStatus.DRAFT.value,
        "property_id": post.property_id,
        "hashtags": post.hashtags or [],
        "is_ai_generated": post.is_ai_generated,
        "created_at": now,
        "created_by": current_user["id"],
        "platform_post_ids": {},
        "engagement": {}
    }
    
    await db.social_posts.insert_one(post_doc)
    
    # If no scheduled time, post immediately
    if not post.scheduled_for:
        background_tasks.add_task(publish_post, post_doc["id"])
        post_doc["status"] = PostStatus.PUBLISHING.value
        await db.social_posts.update_one({"id": post_doc["id"]}, {"$set": {"status": PostStatus.PUBLISHING.value}})
    
    return {"message": "Post created", "id": post_doc["id"], "status": post_doc["status"]}


@router.put("/posts/{post_id}")
async def update_post(
    post_id: str,
    update: SocialPostUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a post"""
    post = await db.social_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post["status"] in [PostStatus.PUBLISHED.value, PostStatus.PUBLISHING.value]:
        raise HTTPException(status_code=400, detail="Cannot edit published post")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.social_posts.update_one({"id": post_id}, {"$set": update_data})
    
    return {"message": "Post updated"}


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a post"""
    result = await db.social_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted"}


@router.post("/posts/{post_id}/publish")
async def publish_post_now(
    post_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Publish a post immediately"""
    post = await db.social_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    await db.social_posts.update_one({"id": post_id}, {"$set": {"status": PostStatus.PUBLISHING.value}})
    background_tasks.add_task(publish_post, post_id)
    
    return {"message": "Publishing post"}


async def publish_post(post_id: str):
    """Background task to publish post to platforms"""
    from services.social_media_service import social_service
    
    post = await db.social_posts.find_one({"id": post_id})
    if not post:
        return
    
    results = {}
    errors = []
    
    for platform in post["platforms"]:
        try:
            result = await social_service.publish_to_platform(platform, post)
            if result.get("success"):
                results[platform] = result.get("post_id")
            else:
                errors.append(f"{platform}: {result.get('error')}")
        except Exception as e:
            errors.append(f"{platform}: {str(e)}")
    
    # Update post status
    if results:
        await db.social_posts.update_one(
            {"id": post_id},
            {"$set": {
                "status": PostStatus.PUBLISHED.value,
                "published_at": datetime.now(timezone.utc).isoformat(),
                "platform_post_ids": results,
                "error_message": "; ".join(errors) if errors else None
            }}
        )
    else:
        await db.social_posts.update_one(
            {"id": post_id},
            {"$set": {
                "status": PostStatus.FAILED.value,
                "error_message": "; ".join(errors)
            }}
        )


# ============ TEMPLATES ============

@router.get("/templates")
async def get_templates(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get post templates"""
    query = {}
    if category:
        query["category"] = category
    
    templates = await db.social_templates.find(query, {"_id": 0}).to_list(100)
    return {"templates": templates}


@router.post("/templates")
async def create_template(
    template: PostTemplateCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a post template"""
    template_doc = {
        "id": str(uuid.uuid4()),
        "name": template.name,
        "content": template.content,
        "platforms": [p.value if isinstance(p, SocialPlatform) else p for p in template.platforms],
        "hashtags": template.hashtags or [],
        "category": template.category,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
        "usage_count": 0
    }
    
    await db.social_templates.insert_one(template_doc)
    return {"message": "Template created", "id": template_doc["id"]}


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a template"""
    result = await db.social_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}


# ============ AI CONTENT ============

@router.post("/ai/generate")
async def generate_ai_content(
    request: AIContentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate AI content for social media post"""
    from services.social_media_service import social_service
    
    # Get property data if property_id provided
    property_data = None
    if request.property_id:
        property_data = await db.showcase_listings.find_one({"id": request.property_id}, {"_id": 0})
    
    result = await social_service.generate_content(
        prompt_type=request.prompt_type,
        property_data=property_data,
        custom_prompt=request.custom_prompt,
        platforms=request.platforms,
        tone=request.tone
    )
    
    return result


@router.get("/ai/hashtags")
async def suggest_hashtags(
    content: str,
    platform: str,
    current_user: dict = Depends(get_current_user)
):
    """Get hashtag suggestions for content"""
    from services.social_media_service import social_service
    
    hashtags = await social_service.suggest_hashtags(content, platform)
    return {"hashtags": hashtags}


# ============ SETTINGS ============

@router.get("/settings")
async def get_social_settings(current_user: dict = Depends(get_current_user)):
    """Get social media settings"""
    settings = await db.settings.find_one({"type": "social_media"}, {"_id": 0})
    if not settings:
        settings = {
            "auto_post": {
                "enabled": False,
                "platforms": [],
                "frequency": "weekly",
                "preferred_days": [2, 4],
                "preferred_time": "11:00",
                "content_types": ["listing"],
                "use_ai_captions": True
            },
            "default_hashtags": {
                "facebook": ["#realestate", "#homeforsale", "#realtor"],
                "instagram": ["#realestate", "#homeforsale", "#realtor", "#luxuryrealestate", "#dreamhome"],
                "linkedin": ["#realestate", "#property", "#investment"],
                "tiktok": ["#realestate", "#househunting", "#homesforsale"],
                "pinterest": ["#realestate", "#homedecor", "#dreamhome"]
            }
        }
    return settings


@router.post("/settings")
async def save_social_settings(
    settings: dict,
    current_user: dict = Depends(get_current_user)
):
    """Save social media settings"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.settings.update_one(
        {"type": "social_media"},
        {"$set": {**settings, "type": "social_media", "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "Settings saved"}


# ============ STATS ============

@router.get("/stats")
async def get_social_stats(current_user: dict = Depends(get_current_user)):
    """Get social media statistics"""
    # Count posts by status
    total_posts = await db.social_posts.count_documents({})
    published = await db.social_posts.count_documents({"status": PostStatus.PUBLISHED.value})
    scheduled = await db.social_posts.count_documents({"status": PostStatus.SCHEDULED.value})
    drafts = await db.social_posts.count_documents({"status": PostStatus.DRAFT.value})
    failed = await db.social_posts.count_documents({"status": PostStatus.FAILED.value})
    
    # Count connected accounts
    accounts = await db.social_accounts.count_documents({"is_active": True})
    
    # Posts this week
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    posts_this_week = await db.social_posts.count_documents({
        "published_at": {"$gte": week_ago}
    })
    
    # Posts by platform
    pipeline = [
        {"$unwind": "$platforms"},
        {"$group": {"_id": "$platforms", "count": {"$sum": 1}}}
    ]
    by_platform = {}
    async for doc in db.social_posts.aggregate(pipeline):
        by_platform[doc["_id"]] = doc["count"]
    
    return {
        "total_posts": total_posts,
        "published": published,
        "scheduled": scheduled,
        "drafts": drafts,
        "failed": failed,
        "connected_accounts": accounts,
        "posts_this_week": posts_this_week,
        "by_platform": by_platform
    }


# ============ QUEUE ============

@router.get("/queue")
async def get_post_queue(current_user: dict = Depends(get_current_user)):
    """Get upcoming scheduled posts"""
    now = datetime.now(timezone.utc).isoformat()
    
    posts = await db.social_posts.find({
        "status": PostStatus.SCHEDULED.value,
        "scheduled_for": {"$gte": now}
    }, {"_id": 0}).sort("scheduled_for", 1).limit(50).to_list(50)
    
    return {"queue": posts}


# ============ RANDOM PROPERTY ============

@router.get("/random-property")
async def get_random_property(current_user: dict = Depends(get_current_user)):
    """Get a random property from showcase for posting"""
    pipeline = [
        {"$match": {"status": "active"}},
        {"$sample": {"size": 1}}
    ]
    
    properties = await db.showcase_listings.aggregate(pipeline).to_list(1)
    
    if not properties:
        raise HTTPException(status_code=404, detail="No active properties found")
    
    prop = properties[0]
    prop.pop("_id", None)
    
    return {"property": prop}
