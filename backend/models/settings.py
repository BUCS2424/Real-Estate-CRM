from pydantic import BaseModel
from typing import Optional

class SettingsUpdate(BaseModel):
    notifications_email: bool = True
    notifications_sms: bool = False
    theme: str = "system"

class SettingsResponse(BaseModel):
    id: str
    user_id: str
    notifications_email: bool
    notifications_sms: bool
    theme: str

class GeneralSettingsModel(BaseModel):
    siteName: str = "Fusion Luxury Estates"
    siteUrl: str = ""
    supportEmail: str = ""
    timezone: str = "America/New_York"
    dateFormat: str = "MM/DD/YYYY"
    currency: str = "USD"
    maintenanceMode: bool = False
    debugMode: bool = False
    logoUrl: str = ""
    logoLinkUrl: str = "/"
    dashboardLogoUrl: str = ""
    dashboardLogoLinkUrl: str = "/dashboard"
    faviconUrl: str = ""
    pwaIconUrl: str = ""
