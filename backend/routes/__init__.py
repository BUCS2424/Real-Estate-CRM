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
from .landing_pages import router as landing_pages_router
from .media import router as media_router
from .property_lookup import router as property_lookup_router
from .ratemyagent import router as ratemyagent_router
from .reviews import router as reviews_router
from .property_leads import router as property_leads_router
from .property_lead_marketing import router as property_lead_marketing_router
from .lead_scoring import router as lead_scoring_router
from .seller_leads import router as seller_leads_router
from .email import router as email_router
from .skyreels import router as skyreels_router
from .mls import router as mls_router
from .mls_listings import router as mls_listings_router
from .expired_listings import router as expired_listings_router
from .jacquie_lawson import router as jacquie_lawson_router
from .social_media import router as social_media_router
from .elevenlabs import router as elevenlabs_router
from .email_samples import router as email_samples_router

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
api_router.include_router(mailing_lists_router, tags=["Mailing Lists"])
api_router.include_router(landing_pages_router, prefix="/landing-pages", tags=["Landing Pages"])
api_router.include_router(media_router, prefix="/media", tags=["Media Library"])
api_router.include_router(property_lookup_router, prefix="/property-lookup", tags=["Property Lookup"])
api_router.include_router(ratemyagent_router, tags=["RateMyAgent"])
api_router.include_router(reviews_router, tags=["Reviews"])
api_router.include_router(property_leads_router, tags=["Property Leads"])
api_router.include_router(property_lead_marketing_router, prefix="/property-leads", tags=["Property Lead Marketing"])
api_router.include_router(lead_scoring_router, tags=["Lead Scoring"])
api_router.include_router(seller_leads_router, tags=["Seller Leads"])
api_router.include_router(email_router, prefix="/email", tags=["Email"])
api_router.include_router(skyreels_router, prefix="/skyreels", tags=["SkyReels Video"])
api_router.include_router(mls_router, tags=["MLS Integration"])
api_router.include_router(mls_listings_router, tags=["MLS Listings Management"])
api_router.include_router(expired_listings_router, tags=["Expired Listings Management"])
api_router.include_router(jacquie_lawson_router, tags=["Jacquie Lawson Cards"])
api_router.include_router(social_media_router, tags=["Social Media"])
api_router.include_router(elevenlabs_router, tags=["ElevenLabs AI"])
api_router.include_router(email_samples_router, prefix="/email", tags=["Email Samples"])

@api_router.get("/")
async def root():
    return {"message": "Hidden Haven Realty CRM API", "version": "2.0.0"}
