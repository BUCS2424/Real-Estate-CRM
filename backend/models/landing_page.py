from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
from datetime import datetime

class LandingPageStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class VideoSource(str, Enum):
    YOUTUBE = "youtube"
    VIMEO = "vimeo"
    UPLOAD = "upload"

class VideoItem(BaseModel):
    id: str
    source: VideoSource
    url: str  # YouTube/Vimeo URL or iDrive file URL
    title: Optional[str] = ""
    thumbnail: Optional[str] = ""
    order: int = 0

class GalleryImage(BaseModel):
    id: str
    url: str
    caption: Optional[str] = ""
    order: int = 0

class LandingPageCreate(BaseModel):
    listing_id: str
    custom_headline: Optional[str] = ""
    custom_description: Optional[str] = ""
    videos: List[VideoItem] = []
    additional_images: List[GalleryImage] = []
    virtual_tour_url: Optional[str] = ""
    show_map: bool = True
    show_contact_form: bool = True
    agent_name: Optional[str] = ""
    agent_phone: Optional[str] = ""
    agent_email: Optional[str] = ""
    agent_photo: Optional[str] = ""
    theme: Optional[str] = "auto"  # auto, luxury, modern

class LandingPageUpdate(BaseModel):
    custom_headline: Optional[str] = None
    custom_description: Optional[str] = None
    videos: Optional[List[VideoItem]] = None
    additional_images: Optional[List[GalleryImage]] = None
    virtual_tour_url: Optional[str] = None
    show_map: Optional[bool] = None
    show_contact_form: Optional[bool] = None
    agent_name: Optional[str] = None
    agent_phone: Optional[str] = None
    agent_email: Optional[str] = None
    agent_photo: Optional[str] = None
    theme: Optional[str] = None
    status: Optional[LandingPageStatus] = None

class LandingPageResponse(BaseModel):
    id: str
    listing_id: str
    slug: str
    custom_headline: str
    custom_description: str
    videos: List[dict]
    additional_images: List[dict]
    virtual_tour_url: str
    show_map: bool
    show_contact_form: bool
    agent_name: str
    agent_phone: str
    agent_email: str
    agent_photo: str
    theme: str
    status: LandingPageStatus
    preview_url: str
    created_at: str
    updated_at: str
    # Populated listing data
    listing: Optional[dict] = None
