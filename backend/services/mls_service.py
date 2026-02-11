"""
MLS Service - Bridge API Integration for Stellar MLS
Ready for Bridge API credentials - plug and play
"""
import httpx
import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

# Bridge API Configuration (Add credentials when received)
BRIDGE_API_URL = os.environ.get("BRIDGE_API_URL", "https://api.bridgedataoutput.com/api/v2")
BRIDGE_API_TOKEN = os.environ.get("BRIDGE_API_TOKEN", "")
BRIDGE_DATASET = os.environ.get("BRIDGE_DATASET", "stellar_mls")  # Stellar MLS dataset

# Your Agent ID for pulling your listings
AGENT_MLS_ID = os.environ.get("AGENT_MLS_ID", "")


class MLSService:
    """Service for interacting with Bridge API / Stellar MLS"""
    
    def __init__(self):
        self.base_url = BRIDGE_API_URL
        self.token = BRIDGE_API_TOKEN
        self.dataset = BRIDGE_DATASET
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def is_configured(self) -> bool:
        """Check if MLS credentials are configured"""
        return bool(self.token and self.token != "")
    
    async def search_properties(
        self,
        address: Optional[str] = None,
        city: Optional[str] = None,
        zip_code: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        bedrooms: Optional[int] = None,
        bathrooms: Optional[float] = None,
        property_type: Optional[str] = None,
        status: Optional[str] = None,  # Active, Pending, Sold, etc.
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Search Stellar MLS properties
        Returns list of properties matching criteria
        """
        if not self.is_configured():
            return {"error": "MLS API not configured", "properties": [], "total": 0}
        
        # Build query parameters for Bridge API
        params = {
            "access_token": self.token,
            "limit": limit,
            "offset": offset
        }
        
        # Add filters
        filters = []
        if address:
            filters.append(f"UnparsedAddress eq '{address}'")
        if city:
            filters.append(f"City eq '{city}'")
        if zip_code:
            filters.append(f"PostalCode eq '{zip_code}'")
        if min_price:
            filters.append(f"ListPrice ge {min_price}")
        if max_price:
            filters.append(f"ListPrice le {max_price}")
        if bedrooms:
            filters.append(f"BedroomsTotal ge {bedrooms}")
        if bathrooms:
            filters.append(f"BathroomsTotalInteger ge {bathrooms}")
        if status:
            filters.append(f"StandardStatus eq '{status}'")
        
        if filters:
            params["filter"] = " and ".join(filters)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/{self.dataset}/listings/residential",
                    params=params,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    properties = self._transform_listings(data.get("bundle", []))
                    return {
                        "properties": properties,
                        "total": data.get("total", len(properties)),
                        "offset": offset,
                        "limit": limit
                    }
                else:
                    return {
                        "error": f"MLS API error: {response.status_code}",
                        "properties": [],
                        "total": 0
                    }
        except Exception as e:
            return {
                "error": f"MLS API connection error: {str(e)}",
                "properties": [],
                "total": 0
            }
    
    async def get_my_listings(
        self,
        agent_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Get your own listings by agent MLS ID
        For syncing to Showcase Listings
        """
        if not self.is_configured():
            return {"error": "MLS API not configured", "listings": [], "total": 0}
        
        agent = agent_id or AGENT_MLS_ID
        if not agent:
            return {"error": "Agent MLS ID not configured", "listings": [], "total": 0}
        
        params = {
            "access_token": self.token,
            "limit": limit,
            "filter": f"ListAgentMlsId eq '{agent}'"
        }
        
        if status:
            params["filter"] += f" and StandardStatus eq '{status}'"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/{self.dataset}/listings/residential",
                    params=params,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    listings = self._transform_listings(data.get("bundle", []))
                    return {
                        "listings": listings,
                        "total": data.get("total", len(listings)),
                        "agent_id": agent
                    }
                else:
                    return {
                        "error": f"MLS API error: {response.status_code}",
                        "listings": [],
                        "total": 0
                    }
        except Exception as e:
            return {
                "error": f"MLS API connection error: {str(e)}",
                "listings": [],
                "total": 0
            }
    
    async def get_property_details(self, mls_id: str) -> Dict[str, Any]:
        """
        Get full property details by MLS ID
        """
        if not self.is_configured():
            return {"error": "MLS API not configured"}
        
        params = {
            "access_token": self.token,
            "filter": f"ListingId eq '{mls_id}'"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/{self.dataset}/listings/residential",
                    params=params,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    bundle = data.get("bundle", [])
                    if bundle:
                        return self._transform_listing_detail(bundle[0])
                    return {"error": "Property not found"}
                else:
                    return {"error": f"MLS API error: {response.status_code}"}
        except Exception as e:
            return {"error": f"MLS API connection error: {str(e)}"}
    
    def _transform_listings(self, listings: List[Dict]) -> List[Dict]:
        """Transform Bridge API listing data to our format"""
        transformed = []
        for listing in listings:
            transformed.append({
                "mls_id": listing.get("ListingId"),
                "address": listing.get("UnparsedAddress"),
                "city": listing.get("City"),
                "state": listing.get("StateOrProvince", "FL"),
                "zip_code": listing.get("PostalCode"),
                "county": listing.get("CountyOrParish"),
                "bedrooms": listing.get("BedroomsTotal"),
                "bathrooms": listing.get("BathroomsTotalInteger"),
                "sqft": listing.get("LivingArea"),
                "lot_size": listing.get("LotSizeAcres"),
                "year_built": listing.get("YearBuilt"),
                "property_type": listing.get("PropertyType"),
                "list_price": listing.get("ListPrice"),
                "status": listing.get("StandardStatus"),
                "days_on_market": listing.get("DaysOnMarket"),
                "photos": [p.get("MediaURL") for p in listing.get("Media", [])[:10]] if listing.get("Media") else [],
                "primary_photo": listing.get("Media", [{}])[0].get("MediaURL") if listing.get("Media") else None,
                "listing_agent": listing.get("ListAgentFullName"),
                "listing_office": listing.get("ListOfficeName"),
                "description": listing.get("PublicRemarks"),
            })
        return transformed
    
    def _transform_listing_detail(self, listing: Dict) -> Dict:
        """Transform full listing detail"""
        base = self._transform_listings([listing])[0]
        
        # Add additional details
        base.update({
            "features": listing.get("InteriorFeatures", "").split(",") if listing.get("InteriorFeatures") else [],
            "exterior_features": listing.get("ExteriorFeatures", "").split(",") if listing.get("ExteriorFeatures") else [],
            "appliances": listing.get("Appliances", "").split(",") if listing.get("Appliances") else [],
            "parking": listing.get("ParkingFeatures"),
            "pool": listing.get("PoolFeatures"),
            "hoa_fee": listing.get("AssociationFee"),
            "tax_amount": listing.get("TaxAnnualAmount"),
            "tax_year": listing.get("TaxYear"),
            "virtual_tour_url": listing.get("VirtualTourURLUnbranded"),
            "all_photos": [p.get("MediaURL") for p in listing.get("Media", [])] if listing.get("Media") else [],
            "latitude": listing.get("Latitude"),
            "longitude": listing.get("Longitude"),
            "subdivision": listing.get("SubdivisionName"),
            "elementary_school": listing.get("ElementarySchool"),
            "middle_school": listing.get("MiddleOrJuniorSchool"),
            "high_school": listing.get("HighSchool"),
        })
        
        return base


# Singleton instance
mls_service = MLSService()
