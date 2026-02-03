"""
MLS API Integration Service
Supports RESO Web API standard (used by most modern MLS systems)
User will need to provide their MLS credentials
"""

import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
import os
from database import db

class MLSClient:
    """
    MLS API Client - RESO Web API Standard
    
    Common MLS providers using RESO:
    - Stellar MLS (Florida)
    - Bright MLS
    - CRMLS
    - MRED
    - Many others
    
    User needs to provide:
    - api_url: Base URL for the MLS API
    - client_id: OAuth client ID
    - client_secret: OAuth client secret
    - (or) api_key: Direct API key if not using OAuth
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.api_url = config.get("api_url", "").rstrip("/")
        self.client_id = config.get("client_id")
        self.client_secret = config.get("client_secret")
        self.api_key = config.get("api_key")
        self.access_token = None
        self.token_expires = None
        
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def _get_token(self) -> str:
        """Get OAuth access token"""
        if self.api_key:
            return self.api_key
        
        if self.access_token and self.token_expires:
            if datetime.utcnow() < self.token_expires:
                return self.access_token
        
        # Request new token
        token_url = f"{self.api_url}/oauth/token"
        
        response = await self.client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            self.access_token = data.get("access_token")
            expires_in = data.get("expires_in", 3600)
            from datetime import timedelta
            self.token_expires = datetime.utcnow() + timedelta(seconds=expires_in - 60)
            return self.access_token
        
        raise Exception(f"Failed to get MLS token: {response.text}")
    
    async def _request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make authenticated request to MLS API"""
        token = await self._get_token()
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
        
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        
        url = f"{self.api_url}{endpoint}"
        response = await self.client.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            return response.json()
        
        raise Exception(f"MLS API error: {response.status_code} - {response.text}")
    
    # ============ PROPERTY SEARCH ============
    
    async def search_listings(
        self,
        city: Optional[str] = None,
        zip_code: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        bedrooms: Optional[int] = None,
        bathrooms: Optional[float] = None,
        property_type: Optional[str] = None,
        status: str = "Active",
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search MLS listings with filters
        
        Uses RESO Web API OData query format
        """
        filters = [f"StandardStatus eq '{status}'"]
        
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
        if property_type:
            filters.append(f"PropertyType eq '{property_type}'")
        
        params = {
            "$filter": " and ".join(filters),
            "$top": limit,
            "$orderby": "ListPrice desc"
        }
        
        data = await self._request("/Property", params)
        return data.get("value", [])
    
    async def get_listing(self, listing_id: str) -> Optional[Dict[str, Any]]:
        """Get single listing by MLS ID"""
        try:
            data = await self._request(f"/Property('{listing_id}')")
            return data
        except:
            return None
    
    async def search_by_address(self, address: str) -> List[Dict[str, Any]]:
        """Search listings by street address"""
        params = {
            "$filter": f"contains(UnparsedAddress, '{address}')",
            "$top": 20
        }
        
        data = await self._request("/Property", params)
        return data.get("value", [])
    
    # ============ AGENT/OFFICE INFO ============
    
    async def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get agent information"""
        try:
            data = await self._request(f"/Member('{agent_id}')")
            return data
        except:
            return None
    
    async def get_office(self, office_id: str) -> Optional[Dict[str, Any]]:
        """Get office information"""
        try:
            data = await self._request(f"/Office('{office_id}')")
            return data
        except:
            return None
    
    # ============ MEDIA ============
    
    async def get_listing_photos(self, listing_id: str) -> List[Dict[str, Any]]:
        """Get photos for a listing"""
        params = {
            "$filter": f"ResourceRecordKey eq '{listing_id}'",
            "$orderby": "Order asc"
        }
        
        data = await self._request("/Media", params)
        return data.get("value", [])


class MLSService:
    """
    MLS Service - manages MLS configuration and provides search interface
    """
    
    @staticmethod
    async def get_config() -> Optional[Dict[str, Any]]:
        """Get MLS configuration from database"""
        config = await db.mls_config.find_one({}, {"_id": 0})
        return config
    
    @staticmethod
    async def save_config(config: Dict[str, Any]) -> bool:
        """Save MLS configuration to database"""
        await db.mls_config.update_one(
            {},
            {"$set": {
                "api_url": config.get("api_url"),
                "client_id": config.get("client_id"),
                "client_secret": config.get("client_secret"),
                "api_key": config.get("api_key"),
                "mls_name": config.get("mls_name"),
                "updated_at": datetime.utcnow().isoformat()
            }},
            upsert=True
        )
        return True
    
    @staticmethod
    async def test_connection() -> Dict[str, Any]:
        """Test MLS connection with current config"""
        config = await MLSService.get_config()
        
        if not config:
            return {"success": False, "message": "MLS not configured"}
        
        if not config.get("api_url"):
            return {"success": False, "message": "MLS API URL not set"}
        
        try:
            client = MLSClient(config)
            # Try a simple search to test connection
            results = await client.search_listings(limit=1)
            await client.close()
            
            return {
                "success": True,
                "message": "MLS connection successful",
                "sample_count": len(results)
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"MLS connection failed: {str(e)}"
            }
    
    @staticmethod
    async def search(**kwargs) -> List[Dict[str, Any]]:
        """Search MLS with given filters"""
        config = await MLSService.get_config()
        
        if not config or not config.get("api_url"):
            return []
        
        try:
            client = MLSClient(config)
            results = await client.search_listings(**kwargs)
            await client.close()
            return results
        except Exception as e:
            print(f"MLS search error: {e}")
            return []
    
    @staticmethod
    async def get_listing(listing_id: str) -> Optional[Dict[str, Any]]:
        """Get single listing"""
        config = await MLSService.get_config()
        
        if not config or not config.get("api_url"):
            return None
        
        try:
            client = MLSClient(config)
            result = await client.get_listing(listing_id)
            await client.close()
            return result
        except Exception as e:
            print(f"MLS get listing error: {e}")
            return None


# Standard RESO field mappings for reference
RESO_FIELD_MAPPINGS = {
    "address": "UnparsedAddress",
    "city": "City",
    "state": "StateOrProvince", 
    "zip": "PostalCode",
    "price": "ListPrice",
    "bedrooms": "BedroomsTotal",
    "bathrooms": "BathroomsTotalInteger",
    "sqft": "LivingArea",
    "lot_size": "LotSizeAcres",
    "year_built": "YearBuilt",
    "property_type": "PropertyType",
    "status": "StandardStatus",
    "mls_id": "ListingId",
    "list_date": "ListingContractDate",
    "agent_id": "ListAgentKey",
    "office_id": "ListOfficeKey",
    "photos": "Media",
    "description": "PublicRemarks"
}
