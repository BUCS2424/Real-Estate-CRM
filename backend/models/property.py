from pydantic import BaseModel
from typing import Optional, List

class PropertyImage(BaseModel):
    url: str
    caption: Optional[str] = None
    is_primary: bool = False
    order: int = 0

class PropertyListingCreate(BaseModel):
    address: str
    city: str
    state: str
    zip_code: str
    price: float
    bedrooms: int
    bathrooms: float
    sqft: int
    lot_size: Optional[float] = None
    year_built: Optional[int] = None
    property_type: str = "single_family"
    status: str = "active"
    description: Optional[str] = None
    features: List[str] = []
    images: List[PropertyImage] = []
    mls_number: Optional[str] = None
    garage: Optional[int] = None
    pool: bool = False
    waterfront: bool = False

class PropertyListingResponse(BaseModel):
    id: str
    address: str
    city: str
    state: str
    zip_code: str
    price: float
    bedrooms: int
    bathrooms: float
    sqft: int
    lot_size: Optional[float]
    year_built: Optional[int]
    property_type: str
    status: str
    description: Optional[str]
    features: List[str]
    images: List[PropertyImage]
    mls_number: Optional[str]
    garage: Optional[int]
    pool: bool
    waterfront: bool
    created_at: str

class MediaFile(BaseModel):
    id: str
    name: str
    type: str
    size: int
    url: str
    folder: Optional[str] = None
    uploaded_at: str
    uploaded_by: str

class StorageFolder(BaseModel):
    id: str
    name: str
    parent_id: Optional[str] = None
    created_at: str

class PropertySubmissionCreate(BaseModel):
    seller_name: str
    seller_email: str
    seller_phone: str
    property_address: str
    property_city: str
    property_state: str
    property_zip: str
    property_type: str = "single_family"
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    sqft: Optional[int] = None
    year_built: Optional[int] = None
    asking_price: Optional[float] = None
    description: Optional[str] = None
    reason_for_selling: Optional[str] = None
    timeline: Optional[str] = None
    has_mortgage: Optional[bool] = None
    is_occupied: Optional[bool] = None
    condition: Optional[str] = None
    consent_email: bool = False
    consent_sms: bool = False

class PropertySubmissionResponse(BaseModel):
    id: str
    seller_name: str
    seller_email: str
    seller_phone: str
    property_address: str
    property_city: str
    property_state: str
    property_zip: str
    property_type: str
    bedrooms: Optional[int]
    bathrooms: Optional[float]
    sqft: Optional[int]
    year_built: Optional[int]
    asking_price: Optional[float]
    description: Optional[str]
    reason_for_selling: Optional[str]
    timeline: Optional[str]
    has_mortgage: Optional[bool]
    is_occupied: Optional[bool]
    condition: Optional[str]
    status: str
    notes: Optional[str]
    reviewed_by: Optional[str]
    consent_email: bool
    consent_sms: bool
    created_at: str
    updated_at: str
