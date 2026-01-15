# Models package
from .user import UserRole, UserCreate, UserLogin, UserResponse, TokenResponse
from .contact import ContactCreate, ContactResponse, LeadScoreUpdate
from .deal import DealCreate, DealResponse, StageUpdate
from .task import TaskCreate, TaskResponse, StatusUpdate
from .article import ArticleCreate, ArticleResponse, AIGenerateRequest
from .booking import (
    AvailabilitySlot, BookingSettingsCreate, BookingSettingsResponse,
    BookingCreate, BookingResponse, BookingStatusUpdate, BlockedDateCreate,
    PhoneVerificationRequest, PhoneVerifyCodeRequest
)
from .newsletter import (
    NewsletterCreate, NewsletterResponse, NewsletterTemplateCreate, AutoTriggerCreate
)
from .property import (
    PropertyImage, PropertyListingCreate, PropertyListingResponse,
    MediaFile, StorageFolder, PropertySubmissionCreate, PropertySubmissionResponse
)
from .storage import StorageProviderType, StorageProviderCreate, StorageProviderResponse
from .settings import SettingsUpdate, SettingsResponse, GeneralSettingsModel
