"""Shared models for expired listings — breaks circular import between routes and services."""
from pydantic import BaseModel
from typing import Optional, List


class SearchExpiredRequest(BaseModel):
    city: Optional[str] = None
    zip_code: Optional[str] = None
    zip_codes: Optional[List[str]] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    bedrooms: Optional[int] = None
    property_type: Optional[str] = None
    exclude_rentals: bool = True
    exclude_commercial: bool = True
    hours_expired_max: Optional[int] = 18
    days_expired: Optional[int] = 90
    required_year: Optional[int] = 2026
    limit: int = 50
