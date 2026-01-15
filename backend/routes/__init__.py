# Routes package
from fastapi import APIRouter

# Create main API router first
api_router = APIRouter(prefix="/api")

# Import all routers after api_router is defined
from .auth import router as auth_router
from .contacts import router as contacts_router
from .deals import router as deals_router
from .tasks import router as tasks_router
from .articles import router as articles_router
from .bookings import router as bookings_router
from .newsletters import router as newsletters_router
from .properties import router as properties_router
from .leads import router as leads_router
from .storage import router as storage_router
from .settings import router as settings_router
from .users import router as users_router
from .notifications import router as notifications_router
from .dashboard import router as dashboard_router
from .mailing_lists import router as mailing_lists_router

# Include all sub-routers
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(contacts_router, prefix="/contacts", tags=["Contacts"])
api_router.include_router(deals_router, prefix="/deals", tags=["Deals"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(articles_router, prefix="/articles", tags=["Articles"])
api_router.include_router(bookings_router, tags=["Bookings"])
api_router.include_router(newsletters_router, tags=["Newsletters"])
api_router.include_router(properties_router, tags=["Properties"])
api_router.include_router(leads_router, prefix="/leads", tags=["Leads"])
api_router.include_router(storage_router, prefix="/storage", tags=["Storage"])
api_router.include_router(settings_router, prefix="/settings", tags=["Settings"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])

@api_router.get("/")
async def root():
    return {"message": "Fusion Builder CRM API", "version": "2.0.0"}
