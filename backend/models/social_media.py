"""
Social Media Models
"""
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum
from datetime import datetime


class SocialPlatform(str, Enum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    TIKTOK = "tiktok"
    PINTEREST = "pinterest"


class PostStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"


class SocialAccountCreate(BaseModel):
    platform: SocialPlatform
    account_name: str
    account_id: str
    access_token: str
    refresh_token: Optional[str] = None
    token_expires_at: Optional[str] = None
    page_id: Optional[str] = None  # For Facebook Pages
    profile_image: Optional[str] = None


class SocialAccountResponse(BaseModel):
    id: str
    platform: SocialPlatform
    account_name: str
    account_id: str
    page_id: Optional[str] = None
    profile_image: Optional[str] = None
    is_connected: bool = True
    connected_at: str
    last_post_at: Optional[str] = None


class PostMedia(BaseModel):
    type: str  # image, video
    url: str
    thumbnail_url: Optional[str] = None


class SocialPostCreate(BaseModel):
    content: str
    platforms: List[SocialPlatform]
    media: Optional[List[PostMedia]] = []
    scheduled_for: Optional[str] = None  # ISO datetime, None = post now
    property_id: Optional[str] = None  # Link to showcase listing
    hashtags: Optional[List[str]] = []
    is_ai_generated: bool = False


class SocialPostUpdate(BaseModel):
    content: Optional[str] = None
    platforms: Optional[List[SocialPlatform]] = None
    media: Optional[List[PostMedia]] = None
    scheduled_for: Optional[str] = None
    hashtags: Optional[List[str]] = None


class SocialPostResponse(BaseModel):
    id: str
    content: str
    platforms: List[SocialPlatform]
    media: List[PostMedia] = []
    scheduled_for: Optional[str] = None
    status: PostStatus
    property_id: Optional[str] = None
    hashtags: List[str] = []
    is_ai_generated: bool = False
    created_at: str
    published_at: Optional[str] = None
    platform_post_ids: dict = {}  # {platform: post_id}
    engagement: dict = {}  # {platform: {likes, comments, shares}}
    error_message: Optional[str] = None


class PostTemplateCreate(BaseModel):
    name: str
    content: str
    platforms: List[SocialPlatform]
    hashtags: Optional[List[str]] = []
    category: str = "general"  # general, listing, open_house, market_update, testimonial


class PostTemplateResponse(BaseModel):
    id: str
    name: str
    content: str
    platforms: List[SocialPlatform]
    hashtags: List[str] = []
    category: str
    created_at: str
    usage_count: int = 0


class AIContentRequest(BaseModel):
    prompt_type: str  # listing, open_house, market_update, testimonial, custom
    property_id: Optional[str] = None
    custom_prompt: Optional[str] = None
    platforms: List[SocialPlatform]
    tone: str = "professional"  # professional, casual, luxury, friendly


class AutoPostSettings(BaseModel):
    enabled: bool = False
    platforms: List[SocialPlatform] = []
    frequency: str = "weekly"  # daily, weekly, biweekly
    preferred_days: List[int] = [2, 4]  # 0=Mon, 6=Sun (Tue, Thu default)
    preferred_time: str = "11:00"  # 24hr format
    content_types: List[str] = ["listing"]  # listing, market_update, tip
    use_ai_captions: bool = True
