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
        # Exclude rentals/leases by default — only show for-sale properties
        filters.append("PropertyType ne 'Residential Lease'")
        filters.append("PropertyType ne 'Commercial Lease'")
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
            safe_property_type = property_type.replace("'", "''")
            filters.append(
                f"contains(PropertyType, '{safe_property_type}') or contains(PropertySubType, '{safe_property_type}')"
            )
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
                    properties = self._transform_listings(data.get("value", []), photo_limit=10)
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
        dataset: Optional[str] = None,
        agent_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        Get your own listings by agent MLS ID
        For syncing to Showcase Listings
        """
        if not self.is_configured():
            return {"error": "Bridge API not configured", "listings": [], "total": 0}
        
        agent = agent_id or AGENT_MLS_ID
        ds = dataset or self.dataset
        
        params = {
            "access_token": self.token,
            "$top": min(limit, 200)
        }
        
        filters = []
        # Exclude rentals/leases
        filters.append("PropertyType ne 'Residential Lease'")
        filters.append("PropertyType ne 'Commercial Lease'")
        if agent:
            filters.append(f"ListAgentMlsId eq '{agent}'")
        if status:
            filters.append(f"StandardStatus eq '{status}'")
        
        if filters:
            params["$filter"] = " and ".join(filters)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/OData/{ds}/Property",
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # My Listings should keep full media set for moderation/conversion workflows.
                    listings = self._transform_listings(data.get("value", []), photo_limit=None)
                    return {
                        "listings": listings,
                        "total": len(listings),
                        "agent_id": agent,
                        "dataset": ds
                    }
                else:
                    return {
                        "error": f"Bridge API error: {response.status_code}",
                        "listings": [],
                        "total": 0
                    }
        except Exception as e:
            return {
                "error": f"Bridge API connection error: {str(e)}",
                "listings": [],
                "total": 0
            }
    
    async def get_property_details(self, dataset: Optional[str] = None, mls_id: str = "") -> Dict[str, Any]:
        """
        Get full property details by MLS ID/ListingKey
        """
        if not self.is_configured():
            return {"error": "Bridge API not configured"}
        
        ds = dataset or self.dataset
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Try to get by ListingKey directly
                response = await client.get(
                    f"{self.base_url}/OData/{ds}/Property('{mls_id}')",
                    params={"access_token": self.token}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return self._transform_listing_detail(data)
                elif response.status_code == 404:
                    return {"error": "Property not found"}
                else:
                    return {"error": f"Bridge API error: {response.status_code}"}
        except Exception as e:
            return {"error": f"Bridge API connection error: {str(e)}"}
    
    def _extract_media_urls(self, media_items: Optional[List[Dict]], photo_limit: Optional[int] = 10) -> List[str]:
        urls: List[str] = []
        for media in media_items or []:
            url = media.get("MediaURL") if isinstance(media, dict) else None
            if not url:
                continue
            clean_url = str(url).strip()
            if not clean_url or clean_url in urls:
                continue
            urls.append(clean_url)
            if photo_limit is not None and len(urls) >= photo_limit:
                break
        return urls

    def _transform_listings(self, listings: List[Dict], photo_limit: Optional[int] = 10) -> List[Dict]:
        """Transform Bridge API listing data to our format"""
        transformed = []
        for listing in listings:
            photos = self._extract_media_urls(listing.get("Media", []), photo_limit=photo_limit)
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
                "property_sub_type": listing.get("PropertySubType"),
                "list_price": listing.get("ListPrice"),
                "status": listing.get("StandardStatus"),
                "days_on_market": listing.get("DaysOnMarket"),
                "listing_contract_date": listing.get("ListingContractDate"),
                "listing_expiration_date": listing.get("ListingExpirationDate") or listing.get("ExpirationDate"),
                "status_change_timestamp": listing.get("StatusChangeTimestamp"),
                "listing_status_change_date": listing.get("ListingStatusChangeDate"),
                "modification_timestamp": listing.get("ModificationTimestamp"),
                "photos": photos,
                "photo_count": len(photos),
                "primary_photo": photos[0] if photos else None,
                "listing_agent": listing.get("ListAgentFullName"),
                "listing_office": listing.get("ListOfficeName"),
                "description": listing.get("PublicRemarks"),
                "latitude": listing.get("Latitude"),
                "longitude": listing.get("Longitude"),
                "subdivision": listing.get("SubdivisionName"),
            })
        return transformed
    
    def _transform_listing_detail(self, listing: Dict) -> Dict:
        """Transform full listing detail"""
        base = self._transform_listings([listing], photo_limit=None)[0]
        
        # Helper to handle fields that could be strings or lists
        def to_list(value):
            if value is None:
                return []
            if isinstance(value, list):
                return value
            if isinstance(value, str):
                return [v.strip() for v in value.split(",") if v.strip()]
            return [str(value)]
        
        # Add additional details
        base.update({
            "features": to_list(listing.get("InteriorFeatures")),
            "exterior_features": to_list(listing.get("ExteriorFeatures")),
            "appliances": to_list(listing.get("Appliances")),
            "parking": listing.get("ParkingFeatures"),
            "pool": listing.get("PoolFeatures"),
            "hoa_fee": listing.get("AssociationFee"),
            "hoa_frequency": listing.get("AssociationFeeFrequency"),
            "has_hoa": listing.get("AssociationYN"),
            "tax_amount": listing.get("TaxAnnualAmount"),
            "tax_year": listing.get("TaxYear"),
            "tax_legal_description": listing.get("TaxLegalDescription"),
            "tax_block": listing.get("TaxBlock"),
            "tax_lot": listing.get("TaxLot"),
            "tax_book": listing.get("TaxBookNumber"),
            "virtual_tour_url": listing.get("VirtualTourURLUnbranded"),
            "all_photos": self._extract_media_urls(listing.get("Media", []), photo_limit=None),
            "latitude": listing.get("Latitude"),
            "longitude": listing.get("Longitude"),
            "subdivision": listing.get("SubdivisionName"),
            "elementary_school": listing.get("ElementarySchool"),
            "middle_school": listing.get("MiddleOrJuniorSchool"),
            "high_school": listing.get("HighSchool"),
            # Construction & Structure
            "construction": to_list(listing.get("ConstructionMaterials")),
            "roof": to_list(listing.get("Roof")),
            "flooring": to_list(listing.get("Flooring")),
            "heating": to_list(listing.get("Heating")),
            "cooling": to_list(listing.get("Cooling")),
            "sewer": to_list(listing.get("Sewer")),
            "water_source": to_list(listing.get("WaterSource")),
            "laundry": to_list(listing.get("LaundryFeatures")),
            "parking_features": to_list(listing.get("ParkingFeatures") if isinstance(listing.get("ParkingFeatures"), list) else []),
            "garage_spaces": listing.get("GarageSpaces"),
            "garage": listing.get("GarageYN"),
            # Community & Lifestyle
            "community_features": to_list(listing.get("CommunityFeatures")),
            "security_features": to_list(listing.get("SecurityFeatures")),
            "patio_features": to_list(listing.get("PatioAndPorchFeatures")),
            "window_features": to_list(listing.get("WindowFeatures")),
            "waterfront": listing.get("WaterfrontYN"),
            "senior_community": listing.get("SeniorCommunityYN"),
            "new_construction": listing.get("NewConstructionYN"),
            "direction_faces": listing.get("DirectionFaces"),
            "directions": listing.get("Directions"),
            # Flood & Zoning
            "flood_zone": listing.get("STELLAR_FloodZoneCode") or listing.get("FloodZoneCode"),
            "zoning": listing.get("Zoning"),
            # Sale History
            "original_list_price": listing.get("OriginalListPrice"),
            "close_date": listing.get("CloseDate"),
            "close_price": listing.get("ClosePrice"),
            "listing_contract_date": listing.get("ListingContractDate"),
            "listing_expiration_date": listing.get("ListingExpirationDate") or listing.get("ExpirationDate"),
            # Showing
            "showing_requirements": to_list(listing.get("ShowingRequirements")),
            # Open House (if available)
            "open_house_date": listing.get("OpenHouseDate"),
            "open_house_start": listing.get("OpenHouseStartTime"),
            "open_house_end": listing.get("OpenHouseEndTime"),
            "open_house_remarks": listing.get("OpenHouseRemarks"),
        })
        
        return base


# Singleton instance
mls_service = MLSService()
