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
    created_at: str
    created_by: str

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
    created_at: str

class BookingStatusUpdate(BaseModel):
    status: str

class BlockedDateCreate(BaseModel):
    date: str  # YYYY-MM-DD
    reason: Optional[str] = None

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
    
    return {
        "contacts": contacts_count,
        "deals": deals_count,
        "tasks": tasks_count,
        "articles": articles_count,
        "pipeline_value": pipeline_value,
        "deals_by_stage": deals_by_stage,
        "high_priority_tasks": high_priority_tasks
    }

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

# Include the router in the main app
app.include_router(api_router)

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
