from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List, Union, Any

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
    sqft: Optional[int] = 0  # Made optional with default for legacy data
    lot_size: Optional[float] = None
    year_built: Optional[int] = None
    property_type: str
    status: str
    description: Optional[str] = None
    features: List[str] = []
    images: List[Any] = []  # Accept both PropertyImage objects and string URLs
    mls_number: Optional[str] = None
    garage: Optional[int] = None
    pool: bool = False
    waterfront: bool = False
    storage_folder: Optional[str] = None  # iDrive folder path for property files
    created_at: str
    
    @model_validator(mode='before')
    @classmethod
    def normalize_fields(cls, data: dict) -> dict:
        """Handle legacy data with different field names"""
        if isinstance(data, dict):
            # Handle square_feet vs sqft
            if 'square_feet' in data and 'sqft' not in data:
                data['sqft'] = data.pop('square_feet')
            # Ensure sqft has a default
            if 'sqft' not in data or data.get('sqft') is None:
                data['sqft'] = 0
            # Normalize images - convert string URLs to PropertyImage-like dicts
            if 'images' in data:
                normalized_images = []
                for img in data['images']:
                    if isinstance(img, str):
                        normalized_images.append({"url": img, "caption": None, "is_primary": False, "order": 0})
                    elif isinstance(img, dict):
                        normalized_images.append(img)
                data['images'] = normalized_images
        return data

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
