"""
MLS Service - Bridge API Integration
Supports RESO Web API and Bridge Web API
Documentation: https://bridgedataoutput.com/docs/platform
"""
import httpx
import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

# Bridge API Configuration
BRIDGE_API_URL = os.environ.get("BRIDGE_API_URL", "https://api.bridgedataoutput.com/api/v2")
BRIDGE_SERVER_TOKEN = os.environ.get("IDX_SERVER_TOKEN", "")  # Server Token for API access
BRIDGE_DATASET = os.environ.get("BRIDGE_DATASET", "test")  # Default to test dataset

# Your Agent ID for pulling your listings
AGENT_MLS_ID = os.environ.get("AGENT_MLS_ID", "")


class MLSService:
    """Service for interacting with Bridge API"""
    
    def __init__(self):
        self.base_url = BRIDGE_API_URL
        self.token = BRIDGE_SERVER_TOKEN
        self.dataset = BRIDGE_DATASET
        self.client_id = os.environ.get("IDX_CLIENT_ID", "")
        self.client_secret = os.environ.get("IDX_CLIENT_SECRET", "")
        self.server_token = BRIDGE_SERVER_TOKEN
        self.browser_token = os.environ.get("IDX_BROWSER_TOKEN", "")
    
    def configure(self, client_id: str = "", client_secret: str = "", 
                  server_token: str = "", dataset_id: str = ""):
        """Configure the MLS service with credentials"""
        if client_id:
            self.client_id = client_id
        if client_secret:
            self.client_secret = client_secret
        if server_token:
            self.server_token = server_token
            self.token = server_token
        if dataset_id:
            self.dataset = dataset_id
    
    def is_configured(self) -> bool:
        """Check if Bridge API credentials are configured"""
        return bool(self.server_token and self.server_token != "")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test the Bridge API connection"""
        if not self.is_configured():
            return {"success": False, "error": "Bridge API credentials not configured"}
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                # Test by fetching available datasets
                response = await client.get(
                    f"{self.base_url}/datasets",
                    params={"access_token": self.token}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    datasets = data.get("bundle", [])
                    return {
                        "success": True, 
                        "message": f"Connection successful! Access to {len(datasets)} datasets",
                        "datasets": [{"code": d.get("datasetCode"), "name": d.get("name")} for d in datasets]
                    }
                elif response.status_code == 401:
                    return {"success": False, "error": "Invalid API credentials"}
                elif response.status_code == 403:
                    return {"success": False, "error": "Access denied - check your API permissions"}
                else:
                    return {"success": False, "error": f"API returned status {response.status_code}"}
        except httpx.TimeoutException:
            return {"success": False, "error": "Connection timed out"}
        except Exception as e:
            return {"success": False, "error": f"Connection error: {str(e)}"}
    
    async def get_datasets(self) -> Dict[str, Any]:
        """Get all datasets available to this API key"""
        if not self.is_configured():
            return {"error": "Bridge API not configured", "datasets": []}
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/datasets",
                    params={"access_token": self.token}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "datasets": data.get("bundle", []),
                        "total": len(data.get("bundle", []))
                    }
                return {"error": f"API error: {response.status_code}", "datasets": []}
        except Exception as e:
            return {"error": str(e), "datasets": []}
    
    async def search_properties(
        self,
        dataset: Optional[str] = None,
        address: Optional[str] = None,
        city: Optional[str] = None,
        zip_code: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        bedrooms: Optional[int] = None,
        bathrooms: Optional[float] = None,
        property_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Search MLS properties via Bridge API (RESO Web API)
        """
        if not self.is_configured():
            return {"error": "Bridge API not configured", "properties": [], "total": 0}
        
        ds = dataset or self.dataset
        
        # Build OData filter
        filters = []
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
        if address:
            filters.append(f"contains(UnparsedAddress, '{address}')")
        
        params = {
            "access_token": self.token,
            "$top": min(limit, 200),
            "$skip": offset
        }
        
        if filters:
            params["$filter"] = " and ".join(filters)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Use RESO Web API (OData) endpoint
                response = await client.get(
                    f"{self.base_url}/OData/{ds}/Property",
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    properties = self._transform_listings(data.get("value", []))
                    return {
                        "properties": properties,
                        "total": data.get("@odata.count", len(properties)),
                        "offset": offset,
                        "limit": limit,
                        "dataset": ds
                    }
                else:
                    error_text = response.text[:200] if response.text else "Unknown error"
                    return {
                        "error": f"Bridge API error: {response.status_code} - {error_text}",
                        "properties": [],
                        "total": 0
                    }
        except Exception as e:
            return {
                "error": f"Bridge API connection error: {str(e)}",
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
