from pydantic import BaseModel
from typing import Optional, List

class AvailabilitySlot(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str
    is_available: bool = True

class BookingSettingsCreate(BaseModel):
    agent_name: str
    agent_title: Optional[str] = "Real Estate Agent"
    agent_code: str
    default_duration: int = 30
    buffer_time: int = 15
    availability: List[AvailabilitySlot] = []
    booking_window_days: int = 30
    max_daily_bookings: int = 8

class BookingSettingsResponse(BaseModel):
    id: str
    user_id: str
    agent_name: str
    agent_title: Optional[str]
    agent_code: str
    default_duration: int
    buffer_time: int
    availability: List[AvailabilitySlot]
    booking_window_days: int
    max_daily_bookings: int
    created_at: str
    updated_at: str

class BookingCreate(BaseModel):
    client_name: str
    client_email: str
    client_phone: str
    date: str
    time: str
    duration: int = 30
    property_address: Optional[str] = None
    notes: Optional[str] = None
    booking_type: str = "showing"
    phone_verified: bool = False

class BookingResponse(BaseModel):
    id: str
    agent_id: str
    client_name: str
    client_email: str
    client_phone: str
    date: str
    time: str
    duration: int
    property_address: Optional[str]
    notes: Optional[str]
    status: str
    booking_type: str
    created_at: str

class BookingStatusUpdate(BaseModel):
    status: str

class BlockedDateCreate(BaseModel):
    date: str
    reason: Optional[str] = None

class PhoneVerificationRequest(BaseModel):
    phone: str

class PhoneVerifyCodeRequest(BaseModel):
    phone: str
    code: str
