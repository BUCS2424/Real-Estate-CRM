"""
IDX Broker API Service
Integration for pulling MLS listings via IDX Broker
API Documentation: https://developers.idxbroker.com/idx-broker-api/
"""
import httpx
import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

# IDX Broker Configuration
IDX_API_URL = "https://api.idxbroker.com"
IDX_CLIENT_ID = os.environ.get("IDX_CLIENT_ID", "")
IDX_CLIENT_SECRET = os.environ.get("IDX_CLIENT_SECRET", "")
IDX_SERVER_TOKEN = os.environ.get("IDX_SERVER_TOKEN", "")
IDX_BROWSER_TOKEN = os.environ.get("IDX_BROWSER_TOKEN", "")


class IDXBrokerService:
    """Service for interacting with IDX Broker API"""
    
    def __init__(self):
        self.base_url = IDX_API_URL
        self.client_id = IDX_CLIENT_ID
        self.client_secret = IDX_CLIENT_SECRET
        self.server_token = IDX_SERVER_TOKEN
        self.browser_token = IDX_BROWSER_TOKEN
        self._update_headers()
    
    def _update_headers(self):
        """Update headers with current tokens"""
        # IDX Broker uses accesskey header for authentication
        self.headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "accesskey": self.server_token,
            "ancillarykey": self.browser_token,
            "outputtype": "json"
        }
    
    def configure(self, client_id: str = "", client_secret: str = "", 
                  server_token: str = "", browser_token: str = ""):
        """Configure the IDX service with credentials"""
        if client_id:
            self.client_id = client_id
        if client_secret:
            self.client_secret = client_secret
        if server_token:
            self.server_token = server_token
        if browser_token:
            self.browser_token = browser_token
        self._update_headers()
    
    def is_configured(self) -> bool:
        """Check if IDX credentials are configured"""
        return bool(self.server_token and self.server_token != "")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test the IDX API connection"""
        if not self.is_configured():
            return {"success": False, "error": "IDX API credentials not configured"}
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                # Test with account info endpoint
                response = await client.get(
                    f"{self.base_url}/clients/systemlinks",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    return {"success": True, "message": "Connection successful"}
                elif response.status_code == 401:
                    return {"success": False, "error": "Invalid API credentials"}
                elif response.status_code == 403:
                    return {"success": False, "error": "Access denied - check your API permissions"}
                else:
                    return {"success": False, "error": f"API returned status {response.status_code}: {response.text[:200]}"}
        except httpx.TimeoutException:
            return {"success": False, "error": "Connection timed out"}
        except Exception as e:
            return {"success": False, "error": f"Connection error: {str(e)}"}
    
    async def get_account_info(self) -> Dict[str, Any]:
        """Get IDX account information"""
        if not self.is_configured():
            return {"error": "IDX API not configured"}
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/clients/accounttype",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    return {"error": f"API error: {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}
    
    async def get_system_links(self) -> Dict[str, Any]:
        """Get available MLS system links"""
        if not self.is_configured():
            return {"error": "IDX API not configured", "links": []}
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/clients/systemlinks",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {"links": data, "success": True}
                else:
                    return {"error": f"API error: {response.status_code}", "links": []}
        except Exception as e:
            return {"error": str(e), "links": []}
    
    async def search_listings(
        self,
        idxID: Optional[str] = None,
        city: Optional[str] = None,
        zip_code: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        bedrooms: Optional[int] = None,
        bathrooms: Optional[float] = None,
        property_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Search MLS listings via IDX Broker
        """
        if not self.is_configured():
            return {"error": "IDX API not configured", "listings": [], "total": 0}
        
        try:
            # Build search parameters
            params = {}
            if city:
                params["city"] = city
            if zip_code:
                params["zip"] = zip_code
            if min_price:
                params["minPrice"] = str(min_price)
            if max_price:
                params["maxPrice"] = str(max_price)
            if bedrooms:
                params["minBeds"] = str(bedrooms)
            if bathrooms:
                params["minBaths"] = str(bathrooms)
            if property_type:
                params["propType"] = property_type
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Use the featured listings endpoint or search endpoint
                endpoint = f"{self.base_url}/clients/featured"
                if idxID:
                    endpoint = f"{self.base_url}/mls/{idxID}/search"
                
                response = await client.get(
                    endpoint,
                    headers=self.headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    listings = self._transform_listings(data if isinstance(data, list) else [])
                    return {
                        "listings": listings,
                        "total": len(listings),
                        "offset": offset,
                        "limit": limit,
                        "success": True
                    }
                else:
                    return {
                        "error": f"IDX API error: {response.status_code}",
                        "listings": [],
                        "total": 0
                    }
        except Exception as e:
            return {
                "error": f"IDX API connection error: {str(e)}",
                "listings": [],
                "total": 0
            }
    
    async def get_featured_listings(self) -> Dict[str, Any]:
        """Get featured listings from IDX account"""
        if not self.is_configured():
            return {"error": "IDX API not configured", "listings": []}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/clients/featured",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    listings = self._transform_listings(data if isinstance(data, list) else [])
                    return {
                        "listings": listings,
                        "total": len(listings),
                        "success": True
                    }
                else:
                    return {
                        "error": f"API error: {response.status_code}",
                        "listings": []
                    }
        except Exception as e:
            return {"error": str(e), "listings": []}
    
    async def get_supplemental_listings(self) -> Dict[str, Any]:
        """Get supplemental (manually added) listings"""
        if not self.is_configured():
            return {"error": "IDX API not configured", "listings": []}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/clients/supplementallistings",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    listings = self._transform_listings(data if isinstance(data, list) else [])
                    return {
                        "listings": listings,
                        "total": len(listings),
                        "success": True
                    }
                else:
                    return {
                        "error": f"API error: {response.status_code}",
                        "listings": []
                    }
        except Exception as e:
            return {"error": str(e), "listings": []}
    
    async def get_sold_pending(self) -> Dict[str, Any]:
        """Get sold/pending listings"""
        if not self.is_configured():
            return {"error": "IDX API not configured", "listings": []}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/clients/soldpending",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    listings = self._transform_listings(data if isinstance(data, list) else [])
                    return {
                        "listings": listings,
                        "total": len(listings),
                        "success": True
                    }
                else:
                    return {
                        "error": f"API error: {response.status_code}",
                        "listings": []
                    }
        except Exception as e:
            return {"error": str(e), "listings": []}
    
    async def get_listing_details(self, listing_id: str, idx_id: str = "") -> Dict[str, Any]:
        """Get detailed info for a specific listing"""
        if not self.is_configured():
            return {"error": "IDX API not configured"}
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Try featured listings first
                response = await client.get(
                    f"{self.base_url}/clients/featured/{listing_id}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        return self._transform_listing_detail(data)
                
                return {"error": "Listing not found"}
        except Exception as e:
            return {"error": str(e)}
    
    def _transform_listings(self, listings: List[Dict]) -> List[Dict]:
        """Transform IDX Broker listing data to our format"""
        transformed = []
        for listing in listings:
            if not isinstance(listing, dict):
                continue
            transformed.append({
                "idx_listing_id": listing.get("listingID") or listing.get("idxID"),
                "mls_id": listing.get("listingID"),
                "address": listing.get("address"),
                "city": listing.get("cityName") or listing.get("city"),
                "state": listing.get("state", "FL"),
                "zip_code": listing.get("zipcode") or listing.get("zip"),
                "county": listing.get("countyName"),
                "bedrooms": listing.get("bedrooms"),
                "bathrooms": listing.get("totalBaths") or listing.get("bathrooms"),
                "full_baths": listing.get("fullBaths"),
                "half_baths": listing.get("halfBaths"),
                "sqft": listing.get("sqFt"),
                "lot_size": listing.get("acres"),
                "year_built": listing.get("yearBuilt"),
                "property_type": listing.get("propType") or listing.get("propertyType"),
                "list_price": listing.get("listingPrice"),
                "status": listing.get("propStatus") or "Active",
                "photos": listing.get("image", {}).get("0", {}).get("url") if isinstance(listing.get("image"), dict) else None,
                "primary_photo": listing.get("image", {}).get("0", {}).get("url") if isinstance(listing.get("image"), dict) else None,
                "listing_agent": listing.get("listingAgentPublicID"),
                "listing_office": listing.get("listingOfficeName"),
                "description": listing.get("remarksConcat") or listing.get("remarks"),
                "virtual_tour": listing.get("virtualTourURL"),
                "latitude": listing.get("latitude"),
                "longitude": listing.get("longitude"),
                "raw_data": listing  # Keep raw data for debugging
            })
        return transformed
    
    def _transform_listing_detail(self, listing: Dict) -> Dict:
        """Transform full listing detail"""
        base = self._transform_listings([listing])
        if base:
            detail = base[0]
            # Add additional detail fields
            detail.update({
                "features": listing.get("exteriorFeatures", "").split(",") if listing.get("exteriorFeatures") else [],
                "interior_features": listing.get("interiorFeatures", "").split(",") if listing.get("interiorFeatures") else [],
                "parking": listing.get("parkingSpcs"),
                "garage": listing.get("garageSpcs"),
                "hoa_fee": listing.get("hoaFee"),
                "subdivision": listing.get("subdivision"),
                "school_district": listing.get("schoolDistrict"),
            })
            return detail
        return {"error": "Failed to transform listing"}


# Singleton instance
idx_broker_service = IDXBrokerService()
