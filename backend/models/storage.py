from pydantic import BaseModel

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
