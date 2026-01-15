from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Fusion Builder CRM API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserRole:
    SUPERUSER = "superuser"
    ADMIN = "admin"
    CLIENT = "client"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = UserRole.CLIENT

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str
    avatar: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ContactCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    property_interest: Optional[str] = None
    budget: Optional[str] = None
    lead_score: int = 50
    status: str = "new"
    notes: Optional[str] = None
    tags: List[str] = []
    category: Optional[str] = None  # buyer, seller, or other

class ContactResponse(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    property_interest: Optional[str] = None
    budget: Optional[str] = None
    lead_score: int
    status: str
    notes: Optional[str] = None
    tags: List[str] = []
    category: Optional[str] = None
    created_at: str
    created_by: str

# ============ NEWSLETTER MODELS ============

class NewsletterCreate(BaseModel):
    subject: str
    content: str  # HTML content from WYSIWYG
    recipient_type: str = "all"  # all, buyers, sellers
    scheduled_at: Optional[str] = None  # ISO datetime for scheduled send
    template_id: Optional[str] = None

class NewsletterResponse(BaseModel):
    id: str
    subject: str
    content: str
    recipient_type: str
    status: str  # draft, scheduled, sending, sent, failed
    scheduled_at: Optional[str]
    sent_at: Optional[str]
    recipients_count: int
    opened_count: int
    clicked_count: int
    created_by: str
    created_at: str
    updated_at: str

class NewsletterTemplateCreate(BaseModel):
    name: str
    subject: str
    content: str
    category: str = "general"  # general, welcome, listing, follow-up

class AutoTriggerCreate(BaseModel):
    name: str
    trigger_type: str  # new_lead, new_listing, lead_converted, booking_confirmed
    template_id: str
    recipient_type: str = "all"
    is_active: bool = True

class DealCreate(BaseModel):
    title: str
    contact_id: Optional[str] = None
    value: float = 0
    stage: str = "lead"
    property_address: Optional[str] = None
    notes: Optional[str] = None

class DealResponse(BaseModel):
    id: str
    title: str
    contact_id: Optional[str] = None
    value: float
    stage: str
    property_address: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    created_by: str

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    due_date: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[str] = None
    created_at: str
    created_by: str

class ArticleCreate(BaseModel):
    title: str
    content: str
    contact_id: Optional[str] = None
    article_type: str = "email"
    status: str = "draft"

class ArticleResponse(BaseModel):
    id: str
    title: str
    content: str
    contact_id: Optional[str] = None
    article_type: str
    status: str
    created_at: str
    created_by: str

class AIGenerateRequest(BaseModel):
    prompt: str
    contact_id: Optional[str] = None
    article_type: str = "email"

class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    email_signature: Optional[str] = None

class SettingsResponse(BaseModel):
    id: str
    user_id: str
    theme: str
    notifications_enabled: bool
    email_signature: Optional[str] = None

class StageUpdate(BaseModel):
    stage: str

class StatusUpdate(BaseModel):
    status: str

class LeadScoreUpdate(BaseModel):
    lead_score: int

# ============ BOOKING MODELS ============

class AvailabilitySlot(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    is_available: bool = True

class BookingSettingsCreate(BaseModel):
    meeting_duration: int = 30  # minutes
    buffer_time: int = 15  # minutes between meetings
    advance_booking_days: int = 30  # how far in advance can book
    availability_slots: List[AvailabilitySlot] = []
    booking_page_title: str = "Book a Meeting"
    booking_page_description: str = "Schedule a time to discuss your real estate needs"
    confirmation_message: str = "Thank you for booking! We'll see you soon."
    email_notifications: bool = True
    sms_notifications: bool = False

class BookingSettingsResponse(BaseModel):
    id: str
    user_id: str
    meeting_duration: int
    buffer_time: int
    advance_booking_days: int
    availability_slots: List[dict]
    booking_page_title: str
    booking_page_description: str
    confirmation_message: str
    email_notifications: bool
    sms_notifications: bool
    booking_link: str

class BookingCreate(BaseModel):
    booker_name: str
    booker_email: EmailStr
    booker_phone: Optional[str] = None
    booking_date: str  # YYYY-MM-DD
    booking_time: str  # HH:MM
    notes: Optional[str] = None
    video_link: Optional[str] = None
    video_platform: Optional[str] = None  # 'saysme', 'zoom', or None
    contact_id: Optional[str] = None
    duration: int = 30

class BookingResponse(BaseModel):
    id: str
    agent_id: str
    booker_name: str
    booker_email: str
    booker_phone: Optional[str] = None
    booking_date: str
    booking_time: str
    duration: int
    notes: Optional[str] = None
    status: str  # pending, confirmed, cancelled, completed
    video_link: Optional[str] = None
    video_platform: Optional[str] = None
    contact_id: Optional[str] = None
    created_at: str

class BookingStatusUpdate(BaseModel):
    status: str

class BlockedDateCreate(BaseModel):
    date: str  # YYYY-MM-DD
    reason: Optional[str] = None

class PhoneVerificationRequest(BaseModel):
    phone_number: str

class PhoneVerifyCodeRequest(BaseModel):
    phone_number: str
    code: str

# ============ PROPERTY LISTING MODELS ============

class PropertyImage(BaseModel):
    id: str
    url: str
    caption: Optional[str] = None
    order: int = 0

class PropertyListingCreate(BaseModel):
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "USA"
    price: float = 0
    bedrooms: int = 0
    bathrooms: float = 0
    sqft: int = 0
    lot_size: Optional[str] = None
    property_type: str = "single_family"  # single_family, condo, townhouse, land, commercial
    status: str = "draft"  # draft, active, pending, sold
    description: Optional[str] = None
    features: List[str] = []
    images: List[PropertyImage] = []
    mls_id: Optional[str] = None
    year_built: Optional[int] = None
    garage: Optional[int] = None
    contact_id: Optional[str] = None  # Link to CRM contact

class PropertyListingResponse(BaseModel):
    id: str
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str
    price: float
    bedrooms: int
    bathrooms: float
    sqft: int
    lot_size: Optional[str] = None
    property_type: str
    status: str
    description: Optional[str] = None
    features: List[str] = []
    images: List[dict] = []
    mls_id: Optional[str] = None
    year_built: Optional[int] = None
    garage: Optional[int] = None
    contact_id: Optional[str] = None
    created_by: str
    created_at: str
    updated_at: str

class MediaFile(BaseModel):
    id: str
    filename: str
    url: str
    file_type: str  # image, document, video
    size: int
    folder: str = "general"
    uploaded_by: str
    uploaded_at: str

class StorageFolder(BaseModel):
    id: str
    name: str
    parent_id: Optional[str] = None
    created_by: str
    created_at: str

# ============ PROPERTY SUBMISSION MODELS ============

class PropertySubmissionCreate(BaseModel):
    """Model for seller property submissions from landing page"""
    seller_name: str
    seller_email: str
    seller_phone: Optional[str] = None
    property_address: str
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    property_type: str = "single_family"
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    year_built: Optional[int] = None
    estimated_value: Optional[str] = None
    asking_price: Optional[float] = None
    description: Optional[str] = None
    reason_for_selling: Optional[str] = None
    timeline: Optional[str] = None  # immediate, 1-3 months, 3-6 months, flexible
    additional_info: Optional[str] = None
    email_verified: bool = False
    phone_verified: bool = False
    consent_email: bool = False
    consent_sms: bool = False

class PropertySubmissionResponse(BaseModel):
    id: str
    seller_name: str
    seller_email: str
    seller_phone: Optional[str]
    property_address: str
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    property_type: str
    bedrooms: Optional[int]
    bathrooms: Optional[float]
    sqft: Optional[int]
    year_built: Optional[int]
    estimated_value: Optional[str]
    asking_price: Optional[float]
    description: Optional[str]
    reason_for_selling: Optional[str]
    timeline: Optional[str]
    additional_info: Optional[str]
    status: str  # pending, reviewing, approved, rejected, converted
    notes: Optional[str]
    assigned_to: Optional[str]
    created_at: str
    updated_at: str

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str, email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "email": email, "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "role": user_data.role,
        "avatar": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create default settings
    settings_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "theme": "light",
        "notifications_enabled": True,
        "email_signature": ""
    }
    await db.settings.insert_one(settings_doc)
    
    token = create_access_token(user_id, user_data.email, user_data.role)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id, email=user_data.email, name=user_data.name,
            role=user_data.role, created_at=user_doc["created_at"], avatar=None
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(user["id"], user["email"], user["role"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], email=user["email"], name=user["name"],
            role=user["role"], created_at=user["created_at"], avatar=user.get("avatar")
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"], email=current_user["email"], name=current_user["name"],
        role=current_user["role"], created_at=current_user["created_at"], avatar=current_user.get("avatar")
    )

# ============ CONTACTS ROUTES ============

@api_router.post("/contacts", response_model=ContactResponse)
async def create_contact(contact: ContactCreate, current_user: dict = Depends(get_current_user)):
    contact_id = str(uuid.uuid4())
    doc = {
        "id": contact_id,
        **contact.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.contacts.insert_one(doc)
    return ContactResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(current_user: dict = Depends(get_current_user)):
    contacts = await db.contacts.find({}, {"_id": 0}).to_list(1000)
    return [ContactResponse(**c) for c in contacts]

@api_router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactResponse(**contact)

@api_router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, contact: ContactCreate, current_user: dict = Depends(get_current_user)):
    result = await db.contacts.update_one({"id": contact_id}, {"$set": contact.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return ContactResponse(**updated)

@api_router.patch("/contacts/{contact_id}/score", response_model=ContactResponse)
async def update_lead_score(contact_id: str, score_update: LeadScoreUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.contacts.update_one({"id": contact_id}, {"$set": {"lead_score": score_update.lead_score}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return ContactResponse(**updated)

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER, UserRole.ADMIN]))):
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

# ============ DEALS ROUTES ============

@api_router.post("/deals", response_model=DealResponse)
async def create_deal(deal: DealCreate, current_user: dict = Depends(get_current_user)):
    deal_id = str(uuid.uuid4())
    doc = {
        "id": deal_id,
        **deal.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.deals.insert_one(doc)
    return DealResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/deals", response_model=List[DealResponse])
async def get_deals(current_user: dict = Depends(get_current_user)):
    deals = await db.deals.find({}, {"_id": 0}).to_list(1000)
    return [DealResponse(**d) for d in deals]

@api_router.get("/deals/{deal_id}", response_model=DealResponse)
async def get_deal(deal_id: str, current_user: dict = Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return DealResponse(**deal)

@api_router.patch("/deals/{deal_id}/stage", response_model=DealResponse)
async def update_deal_stage(deal_id: str, stage_update: StageUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.deals.update_one({"id": deal_id}, {"$set": {"stage": stage_update.stage}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    updated = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    return DealResponse(**updated)

@api_router.delete("/deals/{deal_id}")
async def delete_deal(deal_id: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER, UserRole.ADMIN]))):
    result = await db.deals.delete_one({"id": deal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Deal deleted"}

# ============ TASKS ROUTES ============

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    doc = {
        "id": task_id,
        **task.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.tasks.insert_one(doc)
    return TaskResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    return [TaskResponse(**t) for t in tasks]

@api_router.patch("/tasks/{task_id}/status", response_model=TaskResponse)
async def update_task_status(task_id: str, status_update: StatusUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.update_one({"id": task_id}, {"$set": {"status": status_update.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return TaskResponse(**updated)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

# ============ ARTICLES ROUTES ============

@api_router.post("/articles", response_model=ArticleResponse)
async def create_article(article: ArticleCreate, current_user: dict = Depends(get_current_user)):
    article_id = str(uuid.uuid4())
    doc = {
        "id": article_id,
        **article.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.articles.insert_one(doc)
    return ArticleResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/articles", response_model=List[ArticleResponse])
async def get_articles(current_user: dict = Depends(get_current_user)):
    articles = await db.articles.find({}, {"_id": 0}).to_list(1000)
    return [ArticleResponse(**a) for a in articles]

@api_router.put("/articles/{article_id}", response_model=ArticleResponse)
async def update_article(article_id: str, article: ArticleCreate, current_user: dict = Depends(get_current_user)):
    result = await db.articles.update_one({"id": article_id}, {"$set": article.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    return ArticleResponse(**updated)

@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.articles.delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted"}

# ============ AI GENERATION ============

@api_router.post("/ai/generate")
async def generate_ai_content(request: AIGenerateRequest, current_user: dict = Depends(get_current_user)):
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        # Get contact context if provided
        context = ""
        if request.contact_id:
            contact = await db.contacts.find_one({"id": request.contact_id}, {"_id": 0})
            if contact:
                context = f"""
Contact Information:
- Name: {contact.get('name', 'N/A')}
- Email: {contact.get('email', 'N/A')}
- Company: {contact.get('company', 'N/A')}
- Property Interest: {contact.get('property_interest', 'N/A')}
- Budget: {contact.get('budget', 'N/A')}
- Notes: {contact.get('notes', 'N/A')}
"""
        
        system_message = f"""You are a professional real estate content strategist. 
You create personalized, compelling content for real estate professionals.
Your writing is professional yet warm, focused on building trust and relationships.
{context}
Article type: {request.article_type}"""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"fusion-{current_user['id']}-{uuid.uuid4()}",
            system_message=system_message
        )
        chat.with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=request.prompt)
        response = await chat.send_message(user_message)
        
        return {"content": response, "article_type": request.article_type}
    except Exception as e:
        logger.error(f"AI generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

# ============ SETTINGS ROUTES ============

@api_router.get("/settings", response_model=SettingsResponse)
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        # Create default settings if not exists
        settings = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "theme": "light",
            "notifications_enabled": True,
            "email_signature": ""
        }
        await db.settings.insert_one(settings)
    return SettingsResponse(**settings)

@api_router.put("/settings", response_model=SettingsResponse)
async def update_settings(settings_update: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in settings_update.model_dump().items() if v is not None}
    await db.settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data},
        upsert=True
    )
    settings = await db.settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return SettingsResponse(**settings)

# ============ BOOKING ROUTES ============

def generate_booking_link(user_id: str) -> str:
    """Generate a unique booking link for the agent"""
    return f"/book/{user_id[:8]}"

@api_router.get("/booking/settings")
async def get_booking_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.booking_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        # Create default booking settings
        default_slots = [
            {"day_of_week": i, "start_time": "09:00", "end_time": "17:00", "is_available": i < 5}
            for i in range(7)
        ]
        settings = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "meeting_duration": 30,
            "buffer_time": 15,
            "advance_booking_days": 30,
            "availability_slots": default_slots,
            "booking_page_title": "Book a Meeting",
            "booking_page_description": "Schedule a time to discuss your real estate needs",
            "confirmation_message": "Thank you for booking! We'll see you soon.",
            "email_notifications": True,
            "sms_notifications": False,
            "booking_link": generate_booking_link(current_user["id"])
        }
        await db.booking_settings.insert_one(settings)
    return {k: v for k, v in settings.items() if k != "_id"}

@api_router.put("/booking/settings")
async def update_booking_settings(settings: BookingSettingsCreate, current_user: dict = Depends(get_current_user)):
    update_data = settings.model_dump()
    update_data["booking_link"] = generate_booking_link(current_user["id"])
    
    await db.booking_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data},
        upsert=True
    )
    updated = await db.booking_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {k: v for k, v in updated.items() if k != "_id"}

@api_router.get("/booking/list")
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({"agent_id": current_user["id"]}, {"_id": 0}).sort("booking_date", 1).to_list(1000)
    return bookings

@api_router.patch("/booking/{booking_id}/status")
async def update_booking_status(booking_id: str, status_update: BookingStatusUpdate, current_user: dict = Depends(get_current_user)):
    if status_update.status not in ["pending", "confirmed", "cancelled", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.bookings.update_one(
        {"id": booking_id, "agent_id": current_user["id"]},
        {"$set": {"status": status_update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking status updated"}

@api_router.delete("/booking/{booking_id}")
async def delete_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.bookings.delete_one({"id": booking_id, "agent_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking deleted"}

@api_router.post("/booking/create")
async def create_agent_booking(booking: BookingCreate, current_user: dict = Depends(get_current_user)):
    """Create a booking directly by the agent"""
    settings = await db.booking_settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    duration = booking.duration if booking.duration else (settings.get("meeting_duration", 30) if settings else 30)
    
    doc = {
        "id": str(uuid.uuid4()),
        "agent_id": current_user["id"],
        "booker_name": booking.booker_name,
        "booker_email": booking.booker_email,
        "booker_phone": booking.booker_phone,
        "booking_date": booking.booking_date,
        "booking_time": booking.booking_time,
        "duration": duration,
        "notes": booking.notes,
        "video_link": booking.video_link,
        "video_platform": booking.video_platform,
        "contact_id": booking.contact_id,
        "status": "confirmed",  # Agent-created bookings are auto-confirmed
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bookings.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/booking/blocked-dates")
async def get_blocked_dates(current_user: dict = Depends(get_current_user)):
    blocked = await db.blocked_dates.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return blocked

@api_router.post("/booking/blocked-dates")
async def add_blocked_date(blocked: BlockedDateCreate, current_user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "date": blocked.date,
        "reason": blocked.reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blocked_dates.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.delete("/booking/blocked-dates/{date}")
async def remove_blocked_date(date: str, current_user: dict = Depends(get_current_user)):
    result = await db.blocked_dates.delete_one({"user_id": current_user["id"], "date": date})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blocked date not found")
    return {"message": "Blocked date removed"}

# ============ PROPERTY LISTINGS ROUTES ============

@api_router.get("/listings")
async def get_listings(current_user: dict = Depends(get_current_user)):
    """Get all property listings"""
    listings = await db.property_listings.find({"created_by": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return listings

@api_router.get("/listings/{listing_id}")
async def get_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single property listing"""
    listing = await db.property_listings.find_one({"id": listing_id, "created_by": current_user["id"]}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing

@api_router.post("/listings")
async def create_listing(listing: PropertyListingCreate, current_user: dict = Depends(get_current_user)):
    """Create a new property listing"""
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "address": listing.address,
        "city": listing.city,
        "state": listing.state,
        "zip_code": listing.zip_code,
        "country": listing.country,
        "price": listing.price,
        "bedrooms": listing.bedrooms,
        "bathrooms": listing.bathrooms,
        "sqft": listing.sqft,
        "lot_size": listing.lot_size,
        "property_type": listing.property_type,
        "status": listing.status,
        "description": listing.description,
        "features": listing.features,
        "images": [img.dict() for img in listing.images],
        "mls_id": listing.mls_id,
        "year_built": listing.year_built,
        "garage": listing.garage,
        "contact_id": listing.contact_id,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.property_listings.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.put("/listings/{listing_id}")
async def update_listing(listing_id: str, listing: PropertyListingCreate, current_user: dict = Depends(get_current_user)):
    """Update a property listing"""
    existing = await db.property_listings.find_one({"id": listing_id, "created_by": current_user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    update_data = {
        "address": listing.address,
        "city": listing.city,
        "state": listing.state,
        "zip_code": listing.zip_code,
        "country": listing.country,
        "price": listing.price,
        "bedrooms": listing.bedrooms,
        "bathrooms": listing.bathrooms,
        "sqft": listing.sqft,
        "lot_size": listing.lot_size,
        "property_type": listing.property_type,
        "status": listing.status,
        "description": listing.description,
        "features": listing.features,
        "images": [img.dict() for img in listing.images],
        "mls_id": listing.mls_id,
        "year_built": listing.year_built,
        "garage": listing.garage,
        "contact_id": listing.contact_id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.property_listings.update_one({"id": listing_id}, {"$set": update_data})
    return {"message": "Listing updated", **update_data, "id": listing_id}

@api_router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a property listing"""
    result = await db.property_listings.delete_one({"id": listing_id, "created_by": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"message": "Listing deleted"}

@api_router.post("/listings/{listing_id}/generate-description")
async def generate_listing_description(listing_id: str, current_user: dict = Depends(get_current_user)):
    """Generate AI description for a property listing based on its details"""
    listing = await db.property_listings.find_one({"id": listing_id, "created_by": current_user["id"]}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Build prompt with property details
    features_text = ", ".join(listing.get("features", [])) if listing.get("features") else "Not specified"
    
    system_message = """You are an expert luxury real estate copywriter. 
You write compelling, evocative property descriptions that highlight lifestyle benefits and unique features.
Your writing appeals to high-end buyers and creates emotional connections with properties."""

    prompt = f"""Write a compelling, professional real estate listing description for this property:

Address: {listing.get('address', 'N/A')}, {listing.get('city', '')}, {listing.get('state', '')} {listing.get('zip_code', '')}
Price: ${listing.get('price', 0):,.0f}
Property Type: {listing.get('property_type', 'single_family').replace('_', ' ').title()}
Bedrooms: {listing.get('bedrooms', 0)}
Bathrooms: {listing.get('bathrooms', 0)}
Square Feet: {listing.get('sqft', 0):,}
Lot Size: {listing.get('lot_size', 'N/A')}
Year Built: {listing.get('year_built', 'N/A')}
Garage: {listing.get('garage', 0)} car
Features: {features_text}

Write an engaging 2-3 paragraph description highlighting the property's best features, location benefits, and lifestyle appeal. Use descriptive language that appeals to luxury home buyers. Do not include the price or basic stats in the description as those are shown separately."""

    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"listing-desc-{listing_id}-{uuid.uuid4()}",
            system_message=system_message
        )
        chat.with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        description = await chat.send_message(user_message)
        
        # Update the listing with new description
        await db.property_listings.update_one(
            {"id": listing_id},
            {"$set": {"description": description, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"description": description}
    except Exception as e:
        logger.error(f"AI generation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate description")

@api_router.post("/listings/lookup-address")
async def lookup_address_info(address: dict, current_user: dict = Depends(get_current_user)):
    """Search the web for real property information and use AI to extract details"""
    import aiohttp
    import json
    
    full_address = address.get("address", "")
    if not full_address:
        raise HTTPException(status_code=400, detail="Address is required")
    
    # Step 1: Search the web for property information
    search_results = ""
    try:
        # Use a web search to find property listings
        search_query = f"{full_address} property listing real estate zillow redfin realtor"
        
        async with aiohttp.ClientSession() as session:
            # Try to get data from multiple sources
            search_url = f"https://api.duckduckgo.com/?q={search_query}&format=json&no_html=1"
            async with session.get(search_url, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("Abstract"):
                        search_results += f"Summary: {data['Abstract']}\n"
                    if data.get("RelatedTopics"):
                        for topic in data["RelatedTopics"][:5]:
                            if isinstance(topic, dict) and topic.get("Text"):
                                search_results += f"- {topic['Text']}\n"
    except Exception as e:
        logger.warning(f"Web search failed: {str(e)}")
    
    # Step 2: Use AI to analyze the address and any search results
    system_message = """You are a real estate data expert with comprehensive knowledge of property markets across the United States.
You provide accurate property valuations, market analysis, and detailed property information based on addresses.
Always return data in valid JSON format."""

    prompt = f"""Analyze this property address and provide detailed information.

Property Address: "{full_address}"

{f"Additional web search context:{chr(10)}{search_results}" if search_results else ""}

Based on the address and your knowledge of real estate markets, provide the following information in JSON format:

{{
    "address": "street address only",
    "city": "city name",
    "state": "2-letter state code", 
    "zip_code": "ZIP code",
    "country": "USA",
    "estimated_price": number (realistic market value based on location),
    "property_type": "single_family" or "condo" or "townhouse" or "land" or "commercial",
    "typical_sqft": number (typical for this area/property type),
    "typical_bedrooms": number,
    "typical_bathrooms": number,
    "lot_size": "estimated lot size with units",
    "year_built_estimate": "estimated year range",
    "neighborhood_info": "brief description of the area",
    "nearby_amenities": ["list", "of", "nearby", "amenities"],
    "school_district": "school district if known",
    "market_trends": "brief market trend description for this area"
}}

Use realistic values based on actual real estate market data for this location. Return ONLY valid JSON, no markdown code blocks."""

    try:
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        chat = LlmChat(
            api_key=api_key,
            session_id=f"address-lookup-{uuid.uuid4()}",
            system_message=system_message
        )
        chat.with_model("openai", "gpt-4o")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON from response
        content = response.strip()
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1])
            if content.startswith("json"):
                content = content[4:]
        
        data = json.loads(content)
        return data
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {str(e)}")
        return {
            "address": full_address,
            "error": "Could not parse property data",
            "raw_response": response if 'response' in locals() else None
        }
    except Exception as e:
        logger.error(f"Address lookup error: {str(e)}")
        return {"address": full_address, "error": str(e)}

# ============ MEDIA/STORAGE ROUTES ============

@api_router.get("/media")
async def get_media_files(folder: str = "general", current_user: dict = Depends(get_current_user)):
    """Get all media files in a folder"""
    files = await db.media_files.find(
        {"uploaded_by": current_user["id"], "folder": folder}, 
        {"_id": 0}
    ).sort("uploaded_at", -1).to_list(1000)
    return files

@api_router.get("/media/folders")
async def get_storage_folders(current_user: dict = Depends(get_current_user)):
    """Get all storage folders"""
    folders = await db.storage_folders.find(
        {"created_by": current_user["id"]}, 
        {"_id": 0}
    ).to_list(100)
    # Always include default folders
    default_folders = [
        {"id": "general", "name": "General", "parent_id": None, "is_system": True},
        {"id": "listings", "name": "Listings", "parent_id": None, "is_system": True},
        {"id": "contacts", "name": "Contacts", "parent_id": None, "is_system": True}
    ]
    return default_folders + folders

@api_router.post("/media/folders")
async def create_storage_folder(name: str, parent_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Create a new storage folder"""
    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "parent_id": parent_id,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.storage_folders.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.delete("/media/folders/{folder_id}")
async def delete_storage_folder(folder_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a storage folder"""
    if folder_id in ["general", "listings", "contacts"]:
        raise HTTPException(status_code=400, detail="Cannot delete system folders")
    result = await db.storage_folders.delete_one({"id": folder_id, "created_by": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"message": "Folder deleted"}

@api_router.post("/media/upload")
async def upload_media_file(file_data: dict, current_user: dict = Depends(get_current_user)):
    """Register an uploaded media file (actual upload handled client-side to cloud storage)"""
    doc = {
        "id": str(uuid.uuid4()),
        "filename": file_data.get("filename"),
        "url": file_data.get("url"),
        "file_type": file_data.get("file_type", "image"),
        "size": file_data.get("size", 0),
        "folder": file_data.get("folder", "general"),
        "listing_id": file_data.get("listing_id"),
        "uploaded_by": current_user["id"],
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.media_files.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.delete("/media/{file_id}")
async def delete_media_file(file_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a media file"""
    result = await db.media_files.delete_one({"id": file_id, "uploaded_by": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File deleted"}

@api_router.get("/storage/stats")
async def get_storage_stats(current_user: dict = Depends(get_current_user)):
    """Get storage usage statistics"""
    pipeline = [
        {"$match": {"uploaded_by": current_user["id"]}},
        {"$group": {
            "_id": "$folder",
            "count": {"$sum": 1},
            "total_size": {"$sum": "$size"}
        }}
    ]
    stats = await db.media_files.aggregate(pipeline).to_list(100)
    total_files = sum(s["count"] for s in stats)
    total_size = sum(s["total_size"] for s in stats)
    return {
        "total_files": total_files,
        "total_size": total_size,
        "by_folder": {s["_id"]: {"count": s["count"], "size": s["total_size"]} for s in stats}
    }

# ============ PHONE VERIFICATION (MOCKED - Replace with Twilio later) ============
import random

@api_router.post("/phone/send-code")
async def send_phone_verification_code(request: PhoneVerificationRequest):
    """Send a verification code to phone number (MOCKED - shows code in response for testing)"""
    phone = request.phone_number.strip()
    if not phone or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Generate 6-digit code
    code = str(random.randint(100000, 999999))
    
    # Store in database with 5-minute expiry
    await db.phone_verifications.delete_many({"phone_number": phone})  # Clear old codes
    await db.phone_verifications.insert_one({
        "phone_number": phone,
        "code": code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "verified": False
    })
    
    # MOCKED: Return code in response (remove this when using real Twilio)
    logger.info(f"[MOCK SMS] Verification code for {phone}: {code}")
    return {
        "status": "sent",
        "message": "Verification code sent",
        "mock_code": code  # Remove this line when integrating real Twilio
    }

@api_router.post("/phone/verify-code")
async def verify_phone_code(request: PhoneVerifyCodeRequest):
    """Verify the phone code"""
    phone = request.phone_number.strip()
    code = request.code.strip()
    
    verification = await db.phone_verifications.find_one({
        "phone_number": phone,
        "code": code,
        "verified": False
    })
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    
    # Check expiry
    expires_at = datetime.fromisoformat(verification["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")
    
    # Mark as verified
    await db.phone_verifications.update_one(
        {"phone_number": phone, "code": code},
        {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"valid": True, "message": "Phone number verified"}

@api_router.get("/phone/check/{phone_number}")
async def check_phone_verified(phone_number: str):
    """Check if a phone number has been verified"""
    verification = await db.phone_verifications.find_one({
        "phone_number": phone_number,
        "verified": True
    })
    return {"verified": verification is not None}

# ============ EMAIL VERIFICATION (MOCKED - Replace with SendGrid/SMTP later) ============

@api_router.post("/email/send-code")
async def send_email_verification_code(request: dict):
    """Send a verification code to email (MOCKED - shows code in response for testing)"""
    email = request.get("email", "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    # Generate 6-digit code
    code = str(random.randint(100000, 999999))
    
    # Store in database with 10-minute expiry
    await db.email_verifications.delete_many({"email": email})  # Clear old codes
    await db.email_verifications.insert_one({
        "email": email,
        "code": code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "verified": False
    })
    
    # MOCKED: Return code in response (remove this when using real email service)
    logger.info(f"[MOCK EMAIL] Verification code for {email}: {code}")
    return {
        "status": "sent",
        "message": "Verification code sent to your email",
        "mock_code": code  # Remove this line when integrating real email
    }

@api_router.post("/email/verify-code")
async def verify_email_code(request: dict):
    """Verify the email code"""
    email = request.get("email", "").strip().lower()
    code = request.get("code", "").strip()
    
    verification = await db.email_verifications.find_one({
        "email": email,
        "code": code,
        "verified": False
    })
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    
    # Check expiry
    expires_at = datetime.fromisoformat(verification["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")
    
    # Mark as verified
    await db.email_verifications.update_one(
        {"email": email, "code": code},
        {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"valid": True, "message": "Email verified"}

@api_router.get("/email/check/{email}")
async def check_email_verified(email: str):
    """Check if an email has been verified"""
    verification = await db.email_verifications.find_one({
        "email": email.lower(),
        "verified": True
    })
    return {"verified": verification is not None}

# ============ PUBLIC LISTINGS ROUTES (No Auth Required) ============

@api_router.get("/public/listings")
async def get_public_listings(limit: int = 12):
    """Get published property listings for public display"""
    listings = await db.property_listings.find(
        {"status": "active"},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return listings

@api_router.get("/public/listings/{listing_id}")
async def get_public_listing(listing_id: str):
    """Get a single property listing for public display"""
    listing = await db.property_listings.find_one(
        {"id": listing_id, "status": "active"},
        {"_id": 0}
    )
    if not listing:
        raise HTTPException(status_code=404, detail="Property not found")
    return listing

@api_router.post("/public/leads")
async def submit_public_lead(lead_data: dict):
    """Submit a lead from the public landing page - supports buyer and seller leads"""
    lead_type = lead_data.get("lead_type", "buyer")
    
    doc = {
        "id": str(uuid.uuid4()),
        "name": lead_data.get("name"),
        "email": lead_data.get("email"),
        "phone": lead_data.get("phone"),
        "lead_type": lead_type,  # 'buyer' or 'seller'
        "source": lead_data.get("source", "website"),
        "property_id": lead_data.get("property_id"),
        "message": lead_data.get("message"),
        "status": "new",
        "consent_email": lead_data.get("consent_email", False),
        "consent_sms": lead_data.get("consent_sms", False),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Buyer-specific fields
    if lead_type == "buyer":
        doc["budget"] = lead_data.get("budget")
        doc["areas_of_interest"] = lead_data.get("areas_of_interest")
    
    # Seller-specific fields
    if lead_type == "seller":
        doc["property_address"] = lead_data.get("property_address")
        doc["estimated_value"] = lead_data.get("estimated_value")
    
    await db.leads.insert_one(doc)
    return {"message": "Thank you for your inquiry", "id": doc["id"]}

@api_router.post("/listings/seed-sample")
async def seed_sample_listings(current_user: dict = Depends(get_current_user)):
    """Seed sample Florida luxury listings for demo purposes"""
    sample_listings = [
        {
            "id": str(uuid.uuid4()),
            "address": "1200 S Ocean Blvd",
            "city": "Palm Beach",
            "state": "FL",
            "zip_code": "33480",
            "country": "USA",
            "price": 45000000,
            "bedrooms": 8,
            "bathrooms": 12,
            "sqft": 18500,
            "lot_size": "1.2 acres",
            "property_type": "single_family",
            "status": "active",
            "description": "An extraordinary oceanfront estate on prestigious South Ocean Boulevard, this Palm Beach masterpiece offers unparalleled luxury living. With 200 feet of pristine beach frontage, the residence features a grand foyer, formal living spaces, gourmet chef's kitchen, and a spectacular infinity pool overlooking the Atlantic. The estate includes a private beach cabana, tennis court, and meticulously landscaped grounds.",
            "features": ["Oceanfront", "Private Beach", "Infinity Pool", "Tennis Court", "Wine Cellar", "Smart Home", "Guest House"],
            "images": [{"id": "1", "url": "https://images.unsplash.com/photo-1578439297699-eb414262c2de?w=800&q=80", "caption": "Exterior", "order": 0}],
            "year_built": 2019,
            "garage": 6,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "address": "45 Star Island Dr",
            "city": "Miami Beach",
            "state": "FL",
            "zip_code": "33139",
            "country": "USA",
            "price": 65000000,
            "bedrooms": 11,
            "bathrooms": 14,
            "sqft": 22000,
            "lot_size": "1.8 acres",
            "property_type": "single_family",
            "status": "active",
            "description": "Welcome to Star Island's most magnificent estate—a trophy property offering complete privacy and breathtaking Biscayne Bay views. This newly constructed modern masterpiece features soaring ceilings, walls of glass, and seamless indoor-outdoor living. Amenities include a resort-style pool, private dock for a 100-foot yacht, rooftop terrace, home theater, and a wellness spa.",
            "features": ["Waterfront", "Private Dock", "Resort Pool", "Home Theater", "Spa", "Rooftop Terrace", "Staff Quarters"],
            "images": [{"id": "1", "url": "https://images.unsplash.com/photo-1607142426460-0185c446f1d7?w=800&q=80", "caption": "Exterior", "order": 0}],
            "year_built": 2022,
            "garage": 8,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "address": "2800 Gordon Dr",
            "city": "Naples",
            "state": "FL",
            "zip_code": "34102",
            "country": "USA",
            "price": 38500000,
            "bedrooms": 6,
            "bathrooms": 8,
            "sqft": 12000,
            "lot_size": "0.8 acres",
            "property_type": "single_family",
            "status": "active",
            "description": "Situated in the ultra-exclusive Port Royal community, this Gulf-front estate epitomizes Naples luxury. The British West Indies architecture blends seamlessly with lush tropical landscaping. Features include a gourmet kitchen, wine room, library, and expansive outdoor entertaining areas. The private beach, heated pool, and boat dock complete this exceptional offering.",
            "features": ["Gulf Front", "Private Beach", "Boat Dock", "Wine Room", "Library", "Heated Pool", "Outdoor Kitchen"],
            "images": [{"id": "1", "url": "https://images.unsplash.com/photo-1623701675999-9406ece2d150?w=800&q=80", "caption": "Exterior", "order": 0}],
            "year_built": 2017,
            "garage": 4,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "address": "100 Arvida Pkwy",
            "city": "Coral Gables",
            "state": "FL",
            "zip_code": "33156",
            "country": "USA",
            "price": 29000000,
            "bedrooms": 7,
            "bathrooms": 9,
            "sqft": 14500,
            "lot_size": "1.5 acres",
            "property_type": "single_family",
            "status": "active",
            "description": "A stunning Mediterranean Revival estate in the prestigious Gables Estates guard-gated community. This waterfront sanctuary offers 150 feet on the bay with a private dock and direct ocean access. The home features imported stone floors, custom millwork, a chef's dream kitchen, and a two-story library. The resort-style grounds include a pool, spa, cabana, and championship tennis court.",
            "features": ["Waterfront", "Gated Community", "Tennis Court", "Pool & Spa", "Direct Ocean Access", "Two-Story Library", "Cabana"],
            "images": [{"id": "1", "url": "https://images.unsplash.com/photo-1600137444380-ce5aea5c43c8?w=800&q=80", "caption": "Exterior", "order": 0}],
            "year_built": 2015,
            "garage": 5,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "address": "3100 N Ocean Blvd",
            "city": "Fort Lauderdale",
            "state": "FL",
            "zip_code": "33308",
            "country": "USA",
            "price": 52000000,
            "bedrooms": 9,
            "bathrooms": 11,
            "sqft": 19800,
            "lot_size": "2.1 acres",
            "property_type": "single_family",
            "status": "active",
            "description": "An architectural triumph on Fort Lauderdale's prestigious beach. This contemporary oceanfront compound spans two acres with 300 feet of beach frontage. The main residence and guest house feature floor-to-ceiling glass, disappearing walls, and the finest finishes. Amenities include an oceanfront pool, professional gym, recording studio, and a 12-car collector's garage.",
            "features": ["Oceanfront", "Guest House", "Recording Studio", "Collector Garage", "Professional Gym", "Oceanfront Pool", "Beach Frontage"],
            "images": [{"id": "1", "url": "https://images.unsplash.com/photo-1745261394567-9dba1a4b7bb7?w=800&q=80", "caption": "Exterior", "order": 0}],
            "year_built": 2021,
            "garage": 12,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "address": "888 S Ocean Blvd",
            "city": "Boca Raton",
            "state": "FL",
            "zip_code": "33432",
            "country": "USA",
            "price": 34500000,
            "bedrooms": 7,
            "bathrooms": 10,
            "sqft": 15200,
            "lot_size": "1.1 acres",
            "property_type": "single_family",
            "status": "active",
            "description": "Perched on a bluff overlooking the Atlantic, this newly constructed modern estate redefines oceanfront luxury in Boca Raton. Clean lines, expansive glass, and an open floor plan create a seamless connection to the sea. The property features a negative-edge pool, outdoor summer kitchen, private beach access, and a separate staff wing.",
            "features": ["Oceanfront", "Modern Design", "Negative-Edge Pool", "Private Beach Access", "Staff Wing", "Summer Kitchen", "Smart Home"],
            "images": [{"id": "1", "url": "https://images.unsplash.com/photo-1765279162736-14c7d64ff820?w=800&q=80", "caption": "Exterior", "order": 0}],
            "year_built": 2023,
            "garage": 4,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "address": "150 Clarendon Ave",
            "city": "Palm Beach",
            "state": "FL",
            "zip_code": "33480",
            "country": "USA",
            "price": 78000000,
            "bedrooms": 12,
            "bathrooms": 16,
            "sqft": 28000,
            "lot_size": "3.2 acres",
            "property_type": "single_family",
            "status": "active",
            "description": "The crown jewel of Palm Beach—a historic lakefront estate meticulously restored and expanded to modern standards. Set on over 3 acres with 450 feet of Lake Worth frontage, the property includes the main mansion, two guest houses, a pool pavilion, and formal gardens designed by a renowned landscape architect. A private dock accommodates large yachts.",
            "features": ["Lakefront", "Historic Estate", "Guest Houses", "Formal Gardens", "Private Dock", "Pool Pavilion", "450ft Frontage"],
            "images": [{"id": "1", "url": "https://images.unsplash.com/photo-1663998468593-1f104e7c9213?w=800&q=80", "caption": "Exterior", "order": 0}],
            "year_built": 1928,
            "garage": 8,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "address": "5000 Island Estates Dr",
            "city": "Aventura",
            "state": "FL",
            "zip_code": "33160",
            "country": "USA",
            "price": 41000000,
            "bedrooms": 8,
            "bathrooms": 10,
            "sqft": 16500,
            "lot_size": "0.9 acres",
            "property_type": "single_family",
            "status": "active",
            "description": "A spectacular contemporary waterfront residence on the exclusive Island Estates. This smart home features floor-to-ceiling windows, a dramatic floating staircase, and museum-quality gallery spaces. The outdoor oasis includes an infinity pool, covered terraces, and a 90-foot dock. Minutes to Bal Harbour shops and world-class dining.",
            "features": ["Waterfront", "Contemporary Design", "Infinity Pool", "Private Dock", "Gallery Spaces", "Smart Home", "Floating Staircase"],
            "images": [{"id": "1", "url": "https://images.unsplash.com/photo-1729606559667-fcab83917423?w=800&q=80", "caption": "Exterior", "order": 0}],
            "year_built": 2020,
            "garage": 6,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Insert all sample listings
    await db.property_listings.insert_many(sample_listings)
    return {"message": f"Successfully created {len(sample_listings)} sample listings"}

# ============ PUBLIC BOOKING ROUTES (No Auth Required) ============

@api_router.get("/public/booking/{agent_code}")
async def get_public_booking_page(agent_code: str):
    """Get public booking page info for an agent"""
    # Find agent by the first 8 chars of their ID
    user = await db.users.find_one({"id": {"$regex": f"^{agent_code}"}}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    settings = await db.booking_settings.find_one({"user_id": user["id"]}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Booking not available")
    
    return {
        "agent_name": user["name"],
        "agent_email": user["email"],
        "booking_page_title": settings.get("booking_page_title", "Book a Meeting"),
        "booking_page_description": settings.get("booking_page_description", ""),
        "meeting_duration": settings.get("meeting_duration", 30),
        "availability_slots": settings.get("availability_slots", []),
        "advance_booking_days": settings.get("advance_booking_days", 30),
    }

@api_router.get("/public/booking/{agent_code}/available-slots")
async def get_available_slots(agent_code: str, date: str):
    """Get available time slots for a specific date"""
    user = await db.users.find_one({"id": {"$regex": f"^{agent_code}"}}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    settings = await db.booking_settings.find_one({"user_id": user["id"]}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Booking not available")
    
    # Check if date is blocked
    blocked = await db.blocked_dates.find_one({"user_id": user["id"], "date": date})
    if blocked:
        return {"slots": [], "message": "This date is not available"}
    
    # Parse the date and get day of week
    try:
        booking_date = datetime.strptime(date, "%Y-%m-%d")
        day_of_week = booking_date.weekday()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Find availability for this day
    availability = None
    for slot in settings.get("availability_slots", []):
        if slot.get("day_of_week") == day_of_week and slot.get("is_available", True):
            availability = slot
            break
    
    if not availability:
        return {"slots": [], "message": "No availability on this day"}
    
    # Get existing bookings for this date
    existing_bookings = await db.bookings.find({
        "agent_id": user["id"],
        "booking_date": date,
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(100)
    
    booked_times = {b["booking_time"] for b in existing_bookings}
    
    # Generate available slots
    duration = settings.get("meeting_duration", 30)
    buffer = settings.get("buffer_time", 15)
    start_time = datetime.strptime(availability["start_time"], "%H:%M")
    end_time = datetime.strptime(availability["end_time"], "%H:%M")
    
    slots = []
    current_time = start_time
    while current_time + timedelta(minutes=duration) <= end_time:
        time_str = current_time.strftime("%H:%M")
        if time_str not in booked_times:
            slots.append({
                "time": time_str,
                "available": True
            })
        current_time += timedelta(minutes=duration + buffer)
    
    return {"slots": slots, "date": date}

@api_router.post("/public/booking/{agent_code}")
async def create_public_booking(agent_code: str, booking: BookingCreate):
    """Create a booking (public endpoint)"""
    user = await db.users.find_one({"id": {"$regex": f"^{agent_code}"}}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    settings = await db.booking_settings.find_one({"user_id": user["id"]}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Booking not available")
    
    # Check if slot is still available
    existing = await db.bookings.find_one({
        "agent_id": user["id"],
        "booking_date": booking.booking_date,
        "booking_time": booking.booking_time,
        "status": {"$ne": "cancelled"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="This time slot is no longer available")
    
    booking_id = str(uuid.uuid4())
    booking_doc = {
        "id": booking_id,
        "agent_id": user["id"],
        "booker_name": booking.booker_name,
        "booker_email": booking.booker_email,
        "booker_phone": booking.booker_phone,
        "booking_date": booking.booking_date,
        "booking_time": booking.booking_time,
        "duration": settings.get("meeting_duration", 30),
        "notes": booking.notes,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bookings.insert_one(booking_doc)
    
    # Create notification for the agent
    notification_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "booking",
        "title": "New Booking Request",
        "message": f"{booking.booker_name} has booked a meeting on {booking.booking_date} at {booking.booking_time}",
        "data": {"booking_id": booking_id},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    # Create a task for follow-up
    task_doc = {
        "id": str(uuid.uuid4()),
        "title": f"Meeting with {booking.booker_name}",
        "description": f"Scheduled meeting on {booking.booking_date} at {booking.booking_time}. Contact: {booking.booker_email}",
        "contact_id": None,
        "deal_id": None,
        "status": "todo",
        "priority": "high",
        "due_date": booking.booking_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    await db.tasks.insert_one(task_doc)
    
    return {
        "message": "Booking created successfully",
        "booking_id": booking_id,
        "confirmation_message": settings.get("confirmation_message", "Thank you for booking!")
    }

# ============ NOTIFICATIONS ROUTES ============

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifications

@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.patch("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": current_user["id"], "read": False})
    return {"count": count}

# ============ USER MANAGEMENT (SUPERUSER ONLY) ============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_role([UserRole.SUPERUSER]))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER]))):
    if role not in [UserRole.SUPERUSER, UserRole.ADMIN, UserRole.CLIENT]:
        raise HTTPException(status_code=400, detail="Invalid role")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Role updated"}

# ============ DASHBOARD STATS ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    contacts_count = await db.contacts.count_documents({})
    deals_count = await db.deals.count_documents({})
    tasks_count = await db.tasks.count_documents({})
    articles_count = await db.articles.count_documents({})
    
    # Get pipeline value
    pipeline_value = 0
    deals = await db.deals.find({}, {"_id": 0, "value": 1}).to_list(1000)
    for deal in deals:
        pipeline_value += deal.get("value", 0)
    
    # Get deals by stage
    stages = ["lead", "qualified", "proposal", "negotiation", "closed"]
    deals_by_stage = {}
    for stage in stages:
        count = await db.deals.count_documents({"stage": stage})
        deals_by_stage[stage] = count
    
    # Get high priority tasks
    high_priority_tasks = await db.tasks.count_documents({"priority": "high", "status": {"$ne": "done"}})
    
    # Get lead counts
    buyer_leads = await db.leads.count_documents({"lead_type": "buyer"})
    seller_leads = await db.leads.count_documents({"lead_type": "seller"})
    new_leads = await db.leads.count_documents({"status": "new"})
    
    return {
        "contacts": contacts_count,
        "deals": deals_count,
        "tasks": tasks_count,
        "articles": articles_count,
        "pipeline_value": pipeline_value,
        "deals_by_stage": deals_by_stage,
        "high_priority_tasks": high_priority_tasks,
        "buyer_leads": buyer_leads,
        "seller_leads": seller_leads,
        "new_leads": new_leads
    }

# ============ LEADS MANAGEMENT ============

@api_router.get("/leads")
async def get_leads(lead_type: str = None, status: str = None, current_user: dict = Depends(get_current_user)):
    """Get all leads with optional filtering"""
    query = {}
    if lead_type:
        query["lead_type"] = lead_type
    if status:
        query["status"] = status
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return leads

@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single lead"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@api_router.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    """Update a lead's status or notes"""
    allowed_fields = ["status", "notes", "assigned_to"]
    update = {k: v for k, v in update_data.items() if k in allowed_fields}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.leads.update_one({"id": lead_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead updated"}

@api_router.post("/leads/{lead_id}/convert")
async def convert_lead_to_contact(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Convert a lead to a contact with the appropriate category (buyer/seller)"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check if contact with this email already exists
    if lead.get("email"):
        existing = await db.contacts.find_one({"email": lead["email"].lower()})
        if existing:
            raise HTTPException(status_code=400, detail="A contact with this email already exists")
    
    # Create contact from lead
    contact_doc = {
        "id": str(uuid.uuid4()),
        "name": lead.get("name"),
        "email": lead.get("email", "").lower() if lead.get("email") else None,
        "phone": lead.get("phone"),
        "company": None,
        "property_interest": lead.get("areas_of_interest") or lead.get("property_address"),
        "budget": lead.get("budget") or lead.get("estimated_value"),
        "lead_score": 60,  # Higher score since they converted from lead
        "status": "active",
        "notes": f"Converted from {lead.get('lead_type', 'unknown')} lead on {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        "tags": [lead.get("lead_type", "lead")],
        "category": lead.get("lead_type"),  # buyer or seller
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
        "source_lead_id": lead_id
    }
    
    await db.contacts.insert_one(contact_doc)
    
    # Update lead status to converted
    await db.leads.update_one(
        {"id": lead_id},
        {"$set": {"status": "converted", "converted_contact_id": contact_doc["id"]}}
    )
    
    logger.info(f"Lead {lead_id} converted to contact {contact_doc['id']} as {lead.get('lead_type')}")
    return {
        "message": "Lead converted to contact successfully",
        "contact_id": contact_doc["id"],
        "category": lead.get("lead_type")
    }

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a lead"""
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}

# ============ NEWSLETTER SYSTEM ============

@api_router.post("/newsletters")
async def create_newsletter(newsletter: NewsletterCreate, current_user: dict = Depends(get_current_user)):
    """Create a new newsletter (draft or scheduled)"""
    doc = {
        "id": str(uuid.uuid4()),
        "subject": newsletter.subject,
        "content": newsletter.content,
        "recipient_type": newsletter.recipient_type,
        "template_id": newsletter.template_id,
        "status": "scheduled" if newsletter.scheduled_at else "draft",
        "scheduled_at": newsletter.scheduled_at,
        "sent_at": None,
        "recipients_count": 0,
        "opened_count": 0,
        "clicked_count": 0,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.newsletters.insert_one(doc)
    return {"message": "Newsletter created", "id": doc["id"], "status": doc["status"]}

@api_router.get("/newsletters")
async def list_newsletters(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """List all newsletters"""
    query = {}
    if status:
        query["status"] = status
    newsletters = await db.newsletters.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return newsletters

@api_router.get("/newsletters/archive")
async def list_sent_newsletters():
    """Public endpoint for newsletter archive (sent newsletters only)"""
    newsletters = await db.newsletters.find(
        {"status": "sent"},
        {"_id": 0, "id": 1, "subject": 1, "sent_at": 1, "recipients_count": 1}
    ).sort("sent_at", -1).to_list(100)
    return newsletters

@api_router.get("/newsletters/{newsletter_id}")
async def get_newsletter(newsletter_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single newsletter"""
    newsletter = await db.newsletters.find_one({"id": newsletter_id}, {"_id": 0})
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    return newsletter

@api_router.put("/newsletters/{newsletter_id}")
async def update_newsletter(newsletter_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update a newsletter"""
    allowed = ["subject", "content", "recipient_type", "scheduled_at", "status"]
    update_data = {k: v for k, v in data.items() if k in allowed}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.newsletters.update_one({"id": newsletter_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    return {"message": "Newsletter updated"}

@api_router.post("/newsletters/{newsletter_id}/send")
async def send_newsletter(newsletter_id: str, current_user: dict = Depends(get_current_user)):
    """Send a newsletter immediately"""
    newsletter = await db.newsletters.find_one({"id": newsletter_id}, {"_id": 0})
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    
    # Get recipients based on type
    recipient_type = newsletter.get("recipient_type", "all")
    query = {"email": {"$exists": True, "$ne": None}}
    if recipient_type == "buyers":
        query["category"] = "buyer"
    elif recipient_type == "sellers":
        query["category"] = "seller"
    
    contacts = await db.contacts.find(query, {"_id": 0, "email": 1, "name": 1}).to_list(10000)
    recipients_count = len(contacts)
    
    # MOCK: Log email sending (replace with actual email service)
    for contact in contacts:
        logger.info(f"[MOCK EMAIL] Newsletter '{newsletter['subject']}' sent to {contact.get('email')}")
    
    # Update newsletter status
    await db.newsletters.update_one(
        {"id": newsletter_id},
        {"$set": {
            "status": "sent",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "recipients_count": recipients_count,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"Newsletter {newsletter_id} sent to {recipients_count} recipients")
    return {"message": f"Newsletter sent to {recipients_count} recipients", "recipients_count": recipients_count}

@api_router.delete("/newsletters/{newsletter_id}")
async def delete_newsletter(newsletter_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a newsletter"""
    result = await db.newsletters.delete_one({"id": newsletter_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    return {"message": "Newsletter deleted"}

# Newsletter Templates
@api_router.post("/newsletter-templates")
async def create_template(template: NewsletterTemplateCreate, current_user: dict = Depends(get_current_user)):
    """Create a newsletter template"""
    doc = {
        "id": str(uuid.uuid4()),
        "name": template.name,
        "subject": template.subject,
        "content": template.content,
        "category": template.category,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.newsletter_templates.insert_one(doc)
    return {"message": "Template created", "id": doc["id"]}

@api_router.get("/newsletter-templates")
async def list_templates(current_user: dict = Depends(get_current_user)):
    """List all newsletter templates"""
    templates = await db.newsletter_templates.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return templates

@api_router.get("/newsletter-templates/{template_id}")
async def get_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single template"""
    template = await db.newsletter_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@api_router.delete("/newsletter-templates/{template_id}")
async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a template"""
    result = await db.newsletter_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

# Auto Triggers
@api_router.post("/newsletter-triggers")
async def create_trigger(trigger: AutoTriggerCreate, current_user: dict = Depends(get_current_user)):
    """Create an auto-send trigger"""
    doc = {
        "id": str(uuid.uuid4()),
        "name": trigger.name,
        "trigger_type": trigger.trigger_type,
        "template_id": trigger.template_id,
        "recipient_type": trigger.recipient_type,
        "is_active": trigger.is_active,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.newsletter_triggers.insert_one(doc)
    return {"message": "Trigger created", "id": doc["id"]}

@api_router.get("/newsletter-triggers")
async def list_triggers(current_user: dict = Depends(get_current_user)):
    """List all auto-send triggers"""
    triggers = await db.newsletter_triggers.find({}, {"_id": 0}).to_list(100)
    return triggers

@api_router.patch("/newsletter-triggers/{trigger_id}")
async def update_trigger(trigger_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update a trigger (enable/disable)"""
    allowed = ["is_active", "template_id", "recipient_type"]
    update_data = {k: v for k, v in data.items() if k in allowed}
    result = await db.newsletter_triggers.update_one({"id": trigger_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trigger not found")
    return {"message": "Trigger updated"}

@api_router.delete("/newsletter-triggers/{trigger_id}")
async def delete_trigger(trigger_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a trigger"""
    result = await db.newsletter_triggers.delete_one({"id": trigger_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trigger not found")
    return {"message": "Trigger deleted"}

# Helper function to process auto-triggers
async def process_auto_trigger(trigger_type: str, context: dict = None):
    """Process auto-triggers when events happen"""
    triggers = await db.newsletter_triggers.find(
        {"trigger_type": trigger_type, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    for trigger in triggers:
        template = await db.newsletter_templates.find_one({"id": trigger["template_id"]}, {"_id": 0})
        if not template:
            continue
        
        # Get recipients
        recipient_type = trigger.get("recipient_type", "all")
        query = {"email": {"$exists": True, "$ne": None}}
        if recipient_type == "buyers":
            query["category"] = "buyer"
        elif recipient_type == "sellers":
            query["category"] = "seller"
        
        contacts = await db.contacts.find(query, {"_id": 0, "email": 1, "name": 1}).to_list(10000)
        
        # MOCK: Send emails
        for contact in contacts:
            logger.info(f"[AUTO-TRIGGER] Sending '{template['subject']}' to {contact.get('email')} (trigger: {trigger_type})")
        
        # Log the auto-send
        auto_newsletter = {
            "id": str(uuid.uuid4()),
            "subject": template["subject"],
            "content": template["content"],
            "recipient_type": recipient_type,
            "template_id": template["id"],
            "status": "sent",
            "scheduled_at": None,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "recipients_count": len(contacts),
            "opened_count": 0,
            "clicked_count": 0,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "auto_trigger": trigger_type
        }
        await db.newsletters.insert_one(auto_newsletter)
        logger.info(f"Auto-trigger '{trigger_type}' sent newsletter to {len(contacts)} recipients")

# ============ PROPERTY SUBMISSIONS ============

@api_router.post("/public/property-submissions")
async def submit_property(submission: PropertySubmissionCreate):
    """Public endpoint for sellers to submit their property for consideration"""
    doc = {
        "id": str(uuid.uuid4()),
        "seller_name": submission.seller_name,
        "seller_email": submission.seller_email.lower(),
        "seller_phone": submission.seller_phone,
        "property_address": submission.property_address,
        "city": submission.city,
        "state": submission.state,
        "zip_code": submission.zip_code,
        "property_type": submission.property_type,
        "bedrooms": submission.bedrooms,
        "bathrooms": submission.bathrooms,
        "sqft": submission.sqft,
        "year_built": submission.year_built,
        "estimated_value": submission.estimated_value,
        "asking_price": submission.asking_price,
        "description": submission.description,
        "reason_for_selling": submission.reason_for_selling,
        "timeline": submission.timeline,
        "additional_info": submission.additional_info,
        "email_verified": submission.email_verified,
        "phone_verified": submission.phone_verified,
        "consent_email": submission.consent_email,
        "consent_sms": submission.consent_sms,
        "status": "pending",
        "notes": None,
        "assigned_to": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.property_submissions.insert_one(doc)
    logger.info(f"New property submission from {submission.seller_email}: {submission.property_address}")
    return {"message": "Property submitted successfully. Our team will review and contact you soon.", "id": doc["id"]}

@api_router.get("/property-submissions")
async def list_property_submissions(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all property submissions (admin only)"""
    query = {}
    if status:
        query["status"] = status
    submissions = await db.property_submissions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return submissions

@api_router.get("/property-submissions/{submission_id}")
async def get_property_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single property submission"""
    submission = await db.property_submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

@api_router.patch("/property-submissions/{submission_id}")
async def update_property_submission(submission_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    """Update a property submission status or notes"""
    allowed_fields = ["status", "notes", "assigned_to"]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.property_submissions.update_one(
        {"id": submission_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Submission updated"}

@api_router.post("/property-submissions/{submission_id}/convert")
async def convert_submission_to_listing(submission_id: str, current_user: dict = Depends(get_current_user)):
    """Convert an approved submission into a property listing"""
    submission = await db.property_submissions.find_one({"id": submission_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Create listing from submission
    listing = {
        "id": str(uuid.uuid4()),
        "address": submission["property_address"],
        "city": submission.get("city"),
        "state": submission.get("state"),
        "zip_code": submission.get("zip_code"),
        "country": "USA",
        "price": submission.get("asking_price") or 0,
        "bedrooms": submission.get("bedrooms") or 0,
        "bathrooms": submission.get("bathrooms") or 0,
        "sqft": submission.get("sqft") or 0,
        "property_type": submission.get("property_type", "single_family"),
        "status": "draft",
        "description": submission.get("description") or "",
        "features": [],
        "images": [],
        "year_built": submission.get("year_built"),
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source_submission_id": submission_id
    }
    await db.property_listings.insert_one(listing)
    
    # Update submission status
    await db.property_submissions.update_one(
        {"id": submission_id},
        {"$set": {"status": "converted", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Submission converted to listing", "listing_id": listing["id"]}

@api_router.delete("/property-submissions/{submission_id}")
async def delete_property_submission(submission_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a property submission"""
    result = await db.property_submissions.delete_one({"id": submission_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": "Submission deleted"}

# ============ SEED DATA ============

@api_router.post("/seed")
async def seed_data():
    """Seed initial superuser and demo data"""
    # Check if superuser exists
    existing = await db.users.find_one({"email": "mel@a2gdesigns.com"})
    if existing:
        return {"message": "Data already seeded"}
    
    # Create superuser
    superuser_id = str(uuid.uuid4())
    superuser = {
        "id": superuser_id,
        "email": "mel@a2gdesigns.com",
        "name": "Mel (Super Admin)",
        "password_hash": hash_password("BigDaddy2016!!"),
        "role": UserRole.SUPERUSER,
        "avatar": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(superuser)
    
    # Create settings for superuser
    await db.settings.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": superuser_id,
        "theme": "light",
        "notifications_enabled": True,
        "email_signature": "Best regards,\nMel - A2G Designs"
    })
    
    # Seed sample contacts
    contacts = [
        {"name": "John Smith", "email": "john@example.com", "phone": "(555) 123-4567", "company": "Smith Realty", "property_interest": "Luxury Condos", "budget": "$500K-$750K", "lead_score": 85, "status": "qualified", "tags": ["hot-lead", "investor"]},
        {"name": "Sarah Johnson", "email": "sarah@example.com", "phone": "(555) 234-5678", "company": "Johnson Homes", "property_interest": "Single Family", "budget": "$300K-$450K", "lead_score": 72, "status": "new", "tags": ["first-time-buyer"]},
        {"name": "Mike Williams", "email": "mike@example.com", "phone": "(555) 345-6789", "company": "Williams Corp", "property_interest": "Commercial", "budget": "$1M+", "lead_score": 90, "status": "negotiation", "tags": ["commercial", "urgent"]},
    ]
    for c in contacts:
        await db.contacts.insert_one({
            "id": str(uuid.uuid4()),
            **c,
            "notes": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": superuser_id
        })
    
    # Seed sample deals
    deals = [
        {"title": "Downtown Condo Sale", "value": 525000, "stage": "qualified", "property_address": "123 Main St, Downtown"},
        {"title": "Suburban House Listing", "value": 380000, "stage": "proposal", "property_address": "456 Oak Ave, Suburbs"},
        {"title": "Commercial Office Space", "value": 1200000, "stage": "negotiation", "property_address": "789 Business Blvd"},
    ]
    for d in deals:
        await db.deals.insert_one({
            "id": str(uuid.uuid4()),
            **d,
            "contact_id": None,
            "notes": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": superuser_id
        })
    
    # Seed sample tasks
    tasks = [
        {"title": "Follow up with John Smith", "description": "Call about condo interest", "status": "todo", "priority": "high"},
        {"title": "Prepare listing presentation", "description": "For suburban house", "status": "in_progress", "priority": "medium"},
        {"title": "Send market analysis", "description": "Commercial property report", "status": "todo", "priority": "high"},
    ]
    for t in tasks:
        await db.tasks.insert_one({
            "id": str(uuid.uuid4()),
            **t,
            "contact_id": None,
            "deal_id": None,
            "due_date": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": superuser_id
        })
    
    return {"message": "Data seeded successfully"}

@api_router.get("/")
async def root():
    return {"message": "Fusion Builder CRM API", "version": "1.0.0"}

# ============ STORAGE PROVIDERS ============

class StorageProviderType:
    GOOGLE_DRIVE = "google_drive"
    IDRIVE = "idrive"
    CPANEL = "cpanel"
    PCLOUD = "pcloud"
    CUSTOM_CDN = "custom_cdn"

class StorageProviderCreate(BaseModel):
    provider_type: str
    name: str
    is_active: bool = False
    is_default: bool = False
    credentials: dict = {}
    settings: dict = {}

class StorageProviderResponse(BaseModel):
    id: str
    provider_type: str
    name: str
    is_active: bool
    is_default: bool
    credentials_configured: bool
    settings: dict
    created_at: str
    updated_at: str
async def get_storage_providers(current_user: dict = Depends(get_current_user)):
    """Get all storage providers configuration"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    providers = await db.storage_providers.find({}, {"_id": 0}).to_list(100)
    
    # If no providers exist, create default templates
    if not providers:
        default_providers = [
            {
                "id": str(uuid.uuid4()),
                "provider_type": StorageProviderType.GOOGLE_DRIVE,
                "name": "Google Drive",
                "is_active": False,
                "is_default": False,
                "credentials": {},
                "settings": {
                    "folder_id": "",
                    "use_service_account": False
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "provider_type": StorageProviderType.IDRIVE,
                "name": "iDrive",
                "is_active": False,
                "is_default": False,
                "credentials": {},
                "settings": {
                    "bucket": "",
                    "region": "us-east-1"
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "provider_type": StorageProviderType.CPANEL,
                "name": "cPanel",
                "is_active": False,
                "is_default": False,
                "credentials": {},
                "settings": {
                    "host": "",
                    "port": 21,
                    "directory": "/public_html/uploads"
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "provider_type": StorageProviderType.PCLOUD,
                "name": "pCloud",
                "is_active": False,
                "is_default": False,
                "credentials": {},
                "settings": {
                    "folder_id": "0"
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "provider_type": StorageProviderType.CUSTOM_CDN,
                "name": "Custom CDN",
                "is_active": False,
                "is_default": False,
                "credentials": {},
                "settings": {
                    "endpoint_url": "",
                    "bucket": "",
                    "public_url": "",
                    "region": ""
                },
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.storage_providers.insert_many(default_providers)
        providers = default_providers
    
    # Don't expose actual credentials in response
    for provider in providers:
        provider["credentials_configured"] = bool(provider.get("credentials"))
        provider.pop("credentials", None)
    
    return providers

@api_router.get("/storage/providers/{provider_id}")
async def get_storage_provider(provider_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single storage provider"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    provider = await db.storage_providers.find_one({"id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Mask credentials for security
    provider["credentials_configured"] = bool(provider.get("credentials"))
    if provider.get("credentials"):
        # Only show that keys exist, not the values
        provider["credentials"] = {k: "••••••••" for k in provider["credentials"].keys()}
    
    return provider

@api_router.put("/storage/providers/{provider_id}")
async def update_storage_provider(provider_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    """Update a storage provider configuration"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    provider = await db.storage_providers.find_one({"id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Handle setting this as default
    if updates.get("is_default") == True:
        # Unset any other default
        await db.storage_providers.update_many(
            {"id": {"$ne": provider_id}},
            {"$set": {"is_default": False}}
        )
    
    # Merge credentials if provided (don't replace entirely)
    if "credentials" in updates and updates["credentials"]:
        existing_creds = provider.get("credentials", {})
        # Only update non-masked values
        new_creds = {k: v for k, v in updates["credentials"].items() if v and v != "••••••••"}
        existing_creds.update(new_creds)
        updates["credentials"] = existing_creds
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.storage_providers.update_one(
        {"id": provider_id},
        {"$set": updates}
    )
    
    updated = await db.storage_providers.find_one({"id": provider_id}, {"_id": 0})
    updated["credentials_configured"] = bool(updated.get("credentials"))
    updated.pop("credentials", None)
    
    return updated

@api_router.post("/storage/providers/{provider_id}/test")
async def test_storage_provider(provider_id: str, current_user: dict = Depends(get_current_user)):
    """Test a storage provider connection"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    provider = await db.storage_providers.find_one({"id": provider_id}, {"_id": 0})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    if not provider.get("credentials"):
        return {"success": False, "message": "No credentials configured"}
    
    # For now, return a mock test result
    # In production, you would actually test the connection
    provider_type = provider["provider_type"]
    
    # Simulated test logic
    if provider_type == StorageProviderType.GOOGLE_DRIVE:
        has_required = all(k in provider["credentials"] for k in ["client_id", "client_secret"])
    elif provider_type == StorageProviderType.IDRIVE:
        has_required = all(k in provider["credentials"] for k in ["access_key", "secret_key"])
    elif provider_type == StorageProviderType.CPANEL:
        has_required = all(k in provider["credentials"] for k in ["username", "password"])
    elif provider_type == StorageProviderType.PCLOUD:
        has_required = all(k in provider["credentials"] for k in ["access_token"])
    elif provider_type == StorageProviderType.CUSTOM_CDN:
        has_required = all(k in provider["credentials"] for k in ["api_key"])
    else:
        has_required = False
    
    if has_required:
        return {"success": True, "message": "Connection test successful (credentials configured)"}
    else:
        return {"success": False, "message": "Missing required credentials"}

@api_router.get("/storage/default")
async def get_default_storage_provider(current_user: dict = Depends(get_current_user)):
    """Get the default storage provider"""
    provider = await db.storage_providers.find_one({"is_default": True, "is_active": True}, {"_id": 0})
    if not provider:
        return {"provider": None, "message": "No default storage provider configured"}
    
    provider["credentials_configured"] = bool(provider.get("credentials"))
    provider.pop("credentials", None)
    
    return {"provider": provider}

@api_router.post("/storage/providers/{provider_id}/set-default")
async def set_default_storage_provider(provider_id: str, current_user: dict = Depends(get_current_user)):
    """Set a provider as the default"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    provider = await db.storage_providers.find_one({"id": provider_id})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Unset all defaults
    await db.storage_providers.update_many({}, {"$set": {"is_default": False}})
    
    # Set this one as default
    await db.storage_providers.update_one(
        {"id": provider_id},
        {"$set": {"is_default": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"{provider['name']} set as default storage provider"}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
