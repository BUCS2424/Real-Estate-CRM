"""
County Property Appraiser Scrapers
Fetches owner info, tax records, and property details from Florida county websites.
Supports: Hillsborough, Pinellas, Pasco
"""

import httpx
from bs4 import BeautifulSoup
import re
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

class BaseCountyScraper:
    """Base class for county property scrapers"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5"
            }
        )
    
    async def close(self):
        await self.client.aclose()
    
    def clean_text(self, text: str) -> str:
        """Clean whitespace from text"""
        if not text:
            return ""
        return re.sub(r'\s+', ' ', text.strip())
    
    def parse_currency(self, text: str) -> Optional[float]:
        """Parse currency string to float"""
        if not text:
            return None
        cleaned = re.sub(r'[^\d.]', '', text)
        try:
            return float(cleaned)
        except ValueError:
            return None


class HillsboroughScraper(BaseCountyScraper):
    """
    Hillsborough County Property Appraiser
    Website: hcpafl.org
    """
    
    COUNTY = "Hillsborough"
    BASE_URL = "https://www.hcpafl.org"
    SEARCH_URL = "https://gis.hcpafl.org/propertysearch/"
    
    async def search_by_address(self, address: str) -> List[Dict[str, Any]]:
        """Search for properties by address"""
        results = []
        
        try:
            # Hillsborough uses an ArcGIS-based search
            # First, try the GeoHub API
            search_url = f"https://gis.hcpafl.org/arcgis/rest/services/Parcels/MapServer/find"
            params = {
                "searchText": address,
                "contains": "true",
                "searchFields": "SITUS_ADDRESS",
                "sr": "4326",
                "layers": "0",
                "returnGeometry": "false",
                "f": "json"
            }
            
            response = await self.client.get(search_url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                for result in data.get("results", []):
                    attrs = result.get("attributes", {})
                    results.append({
                        "parcel_id": attrs.get("PARCEL_ID", ""),
                        "address": attrs.get("SITUS_ADDRESS", ""),
                        "owner_name": attrs.get("OWNER_NAME", ""),
                        "county": self.COUNTY,
                        "raw_data": attrs
                    })
        except Exception as e:
            print(f"Hillsborough search error: {e}")
        
        return results
    
    async def get_property_details(self, parcel_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed property info by parcel ID"""
        try:
            # Query the parcel layer directly
            query_url = f"https://gis.hcpafl.org/arcgis/rest/services/Parcels/MapServer/0/query"
            params = {
                "where": f"PARCEL_ID='{parcel_id}'",
                "outFields": "*",
                "returnGeometry": "false",
                "f": "json"
            }
            
            response = await self.client.get(query_url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                features = data.get("features", [])
                if features:
                    attrs = features[0].get("attributes", {})
                    return {
                        "parcel_id": parcel_id,
                        "county": self.COUNTY,
                        "address": attrs.get("SITUS_ADDRESS", ""),
                        "city": attrs.get("SITUS_CITY", ""),
                        "zip_code": attrs.get("SITUS_ZIP", ""),
                        "owner_name": attrs.get("OWNER_NAME", ""),
                        "owner_address": attrs.get("OWNER_ADDRESS", ""),
                        "assessed_value": attrs.get("ASSESSED_VALUE"),
                        "market_value": attrs.get("MARKET_VALUE"),
                        "taxable_value": attrs.get("TAXABLE_VALUE"),
                        "land_value": attrs.get("LAND_VALUE"),
                        "building_value": attrs.get("BUILDING_VALUE"),
                        "year_built": attrs.get("YEAR_BUILT"),
                        "bedrooms": attrs.get("BEDROOMS"),
                        "bathrooms": attrs.get("BATHROOMS"),
                        "sqft": attrs.get("HEATED_SQFT"),
                        "lot_size": attrs.get("LOT_SIZE"),
                        "property_use": attrs.get("USE_CODE_DESC"),
                        "legal_description": attrs.get("LEGAL_DESC"),
                        "homestead": attrs.get("HOMESTEAD") == "Y",
                        "raw_data": attrs,
                        "source": "Hillsborough County Property Appraiser",
                        "fetched_at": datetime.utcnow().isoformat()
                    }
        except Exception as e:
            print(f"Hillsborough detail error: {e}")
        
        return None


class PinellasScraper(BaseCountyScraper):
    """
    Pinellas County Property Appraiser
    Website: pcpao.gov
    """
    
    COUNTY = "Pinellas"
    BASE_URL = "https://www.pcpao.gov"
    SEARCH_URL = "https://www.pcpao.gov/quick-search"
    
    async def search_by_address(self, address: str) -> List[Dict[str, Any]]:
        """Search for properties by address"""
        results = []
        
        try:
            # Pinellas has an API endpoint for searches
            search_api = "https://www.pcpao.gov/api/property/search"
            
            response = await self.client.get(
                search_api,
                params={"query": address, "type": "address"}
            )
            
            if response.status_code == 200:
                data = response.json()
                for item in data.get("results", data if isinstance(data, list) else []):
                    results.append({
                        "parcel_id": item.get("parcelId", item.get("account", "")),
                        "address": item.get("address", item.get("siteAddress", "")),
                        "owner_name": item.get("ownerName", item.get("owner", "")),
                        "county": self.COUNTY,
                        "raw_data": item
                    })
            else:
                # Fallback: scrape the search page
                results = await self._scrape_search(address)
                
        except Exception as e:
            print(f"Pinellas search error: {e}")
            # Try scraping as fallback
            try:
                results = await self._scrape_search(address)
            except:
                pass
        
        return results
    
    async def _scrape_search(self, address: str) -> List[Dict[str, Any]]:
        """Fallback: scrape search results page"""
        results = []
        
        response = await self.client.get(
            f"{self.BASE_URL}/quick-search",
            params={"search": address}
        )
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'lxml')
            # Parse search results table
            rows = soup.select('table.results tr, .search-results .result-item')
            for row in rows:
                try:
                    cells = row.find_all(['td', 'div'])
                    if len(cells) >= 2:
                        results.append({
                            "parcel_id": self.clean_text(cells[0].get_text()),
                            "address": self.clean_text(cells[1].get_text()) if len(cells) > 1 else "",
                            "owner_name": self.clean_text(cells[2].get_text()) if len(cells) > 2 else "",
                            "county": self.COUNTY
                        })
                except:
                    continue
        
        return results
    
    async def get_property_details(self, parcel_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed property info by parcel ID"""
        try:
            # Try API first
            detail_url = f"https://www.pcpao.gov/api/property/{parcel_id}"
            response = await self.client.get(detail_url)
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_api_response(data, parcel_id)
            
            # Fallback: scrape detail page
            return await self._scrape_details(parcel_id)
            
        except Exception as e:
            print(f"Pinellas detail error: {e}")
            return await self._scrape_details(parcel_id)
    
    async def _scrape_details(self, parcel_id: str) -> Optional[Dict[str, Any]]:
        """Scrape property detail page"""
        try:
            response = await self.client.get(f"{self.BASE_URL}/property/{parcel_id}")
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'lxml')
                
                def get_value(label: str) -> str:
                    elem = soup.find(string=re.compile(label, re.I))
                    if elem and elem.parent:
                        sibling = elem.parent.find_next_sibling()
                        if sibling:
                            return self.clean_text(sibling.get_text())
                    return ""
                
                return {
                    "parcel_id": parcel_id,
                    "county": self.COUNTY,
                    "address": get_value("Site Address"),
                    "owner_name": get_value("Owner"),
                    "assessed_value": self.parse_currency(get_value("Assessed Value")),
                    "market_value": self.parse_currency(get_value("Market Value")),
                    "taxable_value": self.parse_currency(get_value("Taxable Value")),
                    "source": "Pinellas County Property Appraiser",
                    "fetched_at": datetime.utcnow().isoformat()
                }
        except Exception as e:
            print(f"Pinellas scrape error: {e}")
        
        return None
    
    def _parse_api_response(self, data: dict, parcel_id: str) -> Dict[str, Any]:
        """Parse API response into standard format"""
        return {
            "parcel_id": parcel_id,
            "county": self.COUNTY,
            "address": data.get("siteAddress", data.get("address", "")),
            "city": data.get("city", ""),
            "zip_code": data.get("zip", ""),
            "owner_name": data.get("ownerName", data.get("owner", "")),
            "owner_address": data.get("ownerAddress", ""),
            "assessed_value": data.get("assessedValue"),
            "market_value": data.get("marketValue"),
            "taxable_value": data.get("taxableValue"),
            "land_value": data.get("landValue"),
            "building_value": data.get("buildingValue"),
            "year_built": data.get("yearBuilt"),
            "bedrooms": data.get("bedrooms"),
            "bathrooms": data.get("bathrooms"),
            "sqft": data.get("heatedSqft", data.get("sqft")),
            "lot_size": data.get("lotSize"),
            "property_use": data.get("useCode", data.get("propertyUse")),
            "legal_description": data.get("legalDescription"),
            "homestead": data.get("homestead", False),
            "raw_data": data,
            "source": "Pinellas County Property Appraiser",
            "fetched_at": datetime.utcnow().isoformat()
        }


class PascoScraper(BaseCountyScraper):
    """
    Pasco County Property Appraiser
    Website: pascopa.com / search.pascopa.com
    Uses form-based search with separate street number and name fields
    """
    
    COUNTY = "Pasco"
    BASE_URL = "https://search.pascopa.com"
    SEARCH_URL = "https://search.pascopa.com/default.aspx"
    
    def _parse_address(self, address: str) -> tuple:
        """Parse address into street number and street name"""
        import re
        # Remove city, state, zip if present
        address = re.split(r',|\d{5}', address)[0].strip()
        
        # Split into number and street name
        match = re.match(r'^(\d+)\s+(.+)$', address.strip())
        if match:
            return match.group(1), match.group(2)
        return "", address
    
    async def search_by_address(self, address: str) -> List[Dict[str, Any]]:
        """Search for properties by address using form submission"""
        results = []
        
        try:
            street_num, street_name = self._parse_address(address)
            print(f"Pasco search: num='{street_num}', name='{street_name}'")
            
            # Submit the address search form
            response = await self.client.get(
                self.SEARCH_URL,
                params={
                    "add1": street_num,
                    "add2": street_name,
                    "add": "Search"
                }
            )
            
            if response.status_code == 200:
                results = self._parse_search_results(response.text)
                
            # If no results, try alternative search
            if not results:
                response = await self.client.get(
                    self.SEARCH_URL,
                    params={
                        "add1": street_num,
                        "add2": street_name.split()[0] if street_name else "",  # Just first word
                        "add": "Search"
                    }
                )
                if response.status_code == 200:
                    results = self._parse_search_results(response.text)
                
        except Exception as e:
            print(f"Pasco search error: {e}")
        
        return results
    
    def _parse_search_results(self, html: str) -> List[Dict[str, Any]]:
        """Parse search results from HTML"""
        results = []
        soup = BeautifulSoup(html, 'lxml')
        
        # Look for the results table - Pasco shows results in a table
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 3:
                    # Look for links that go to parcel details
                    link = row.find('a', href=re.compile(r'account|parcel|pid', re.I))
                    if link:
                        href = link.get('href', '')
                        # Extract parcel ID from link
                        parcel_match = re.search(r'(?:account|parcel|pid)[=:]?(\d+)', href, re.I)
                        parcel_id = parcel_match.group(1) if parcel_match else self.clean_text(link.get_text())
                        
                        # Get text from cells
                        cell_texts = [self.clean_text(c.get_text()) for c in cells]
                        
                        results.append({
                            "parcel_id": parcel_id,
                            "address": cell_texts[1] if len(cell_texts) > 1 else "",
                            "owner_name": cell_texts[2] if len(cell_texts) > 2 else "",
                            "county": self.COUNTY,
                            "raw_data": {"cells": cell_texts, "href": href}
                        })
        
        # Also check for direct property display (single result)
        if not results:
            # Check if we landed on a property detail page
            owner_elem = soup.find(string=re.compile(r'Owner', re.I))
            addr_elem = soup.find(string=re.compile(r'Site Address|Property Address', re.I))
            parcel_elem = soup.find(string=re.compile(r'Parcel|Account', re.I))
            
            if owner_elem or addr_elem:
                parcel_id = ""
                address = ""
                owner = ""
                
                # Try to extract parcel from URL or page
                parcel_input = soup.find('input', {'name': 'pid'})
                if parcel_input:
                    parcel_id = parcel_input.get('value', '')
                
                # Get values from labels
                def get_next_text(elem):
                    if elem and elem.parent:
                        next_elem = elem.parent.find_next(['td', 'span', 'div'])
                        if next_elem:
                            return self.clean_text(next_elem.get_text())
                    return ""
                
                if addr_elem:
                    address = get_next_text(addr_elem)
                if owner_elem:
                    owner = get_next_text(owner_elem)
                
                if address or owner:
                    results.append({
                        "parcel_id": parcel_id,
                        "address": address,
                        "owner_name": owner,
                        "county": self.COUNTY
                    })
        
        return results
    
    async def get_property_details(self, parcel_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed property info by parcel ID"""
        try:
            # Try to get property page by parcel ID
            response = await self.client.get(
                f"{self.BASE_URL}/parcel.aspx",
                params={"pid": parcel_id}
            )
            
            if response.status_code == 200:
                return self._parse_detail_page(response.text, parcel_id)
            
            # Try account number format
            response = await self.client.get(
                f"{self.BASE_URL}/default.aspx",
                params={"account": parcel_id}
            )
            
            if response.status_code == 200:
                return self._parse_detail_page(response.text, parcel_id)
                    
        except Exception as e:
            print(f"Pasco detail error: {e}")
        
        return None
    
    def _parse_detail_page(self, html: str, parcel_id: str) -> Dict[str, Any]:
        """Parse property detail HTML page"""
        soup = BeautifulSoup(html, 'lxml')
        
        def find_value(patterns: List[str]) -> str:
            for pattern in patterns:
                elem = soup.find(string=re.compile(pattern, re.I))
                if elem:
                    parent = elem.find_parent(['tr', 'div', 'dl', 'td'])
                    if parent:
                        # Try to find the value cell/element
                        value_elem = parent.find_next(['td', 'dd', 'span'])
                        if value_elem and value_elem != elem.parent:
                            return self.clean_text(value_elem.get_text())
            return ""
        
        return {
            "parcel_id": parcel_id,
            "county": self.COUNTY,
            "address": find_value(["Site Address", "Property Address", "Location"]),
            "owner_name": find_value(["Owner", "Owner Name", "Property Owner"]),
            "owner_address": find_value(["Mailing Address", "Owner Address"]),
            "assessed_value": self.parse_currency(find_value(["Assessed Value", "Total Assessed"])),
            "market_value": self.parse_currency(find_value(["Market Value", "Just Value"])),
            "taxable_value": self.parse_currency(find_value(["Taxable Value"])),
            "land_value": self.parse_currency(find_value(["Land Value"])),
            "building_value": self.parse_currency(find_value(["Building Value", "Improvement Value"])),
            "year_built": find_value(["Year Built", "Effective Year"]),
            "bedrooms": find_value(["Bedrooms", "Beds"]),
            "bathrooms": find_value(["Bathrooms", "Baths"]),
            "sqft": find_value(["Heated", "Living Area", "Sq Ft", "Square Feet"]),
            "lot_size": find_value(["Lot Size", "Land Area", "Acreage"]),
            "property_use": find_value(["Use Code", "Property Use", "Land Use"]),
            "legal_description": find_value(["Legal", "Legal Description"]),
            "homestead": "yes" in find_value(["Homestead"]).lower(),
            "source": "Pasco County Property Appraiser",
            "fetched_at": datetime.utcnow().isoformat()
        }


# Factory function to get the right scraper
def get_scraper(county: str) -> BaseCountyScraper:
    """Get scraper instance for a county"""
    scrapers = {
        "hillsborough": HillsboroughScraper,
        "pinellas": PinellasScraper,
        "pasco": PascoScraper
    }
    
    county_lower = county.lower()
    if county_lower not in scrapers:
        raise ValueError(f"Unsupported county: {county}. Supported: {list(scrapers.keys())}")
    
    return scrapers[county_lower]()


async def search_property(address: str, county: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Search for property across one or all supported counties
    
    Args:
        address: Property address to search
        county: Optional specific county, or None to search all
    
    Returns:
        List of matching properties
    """
    results = []
    counties_to_search = [county] if county else ["hillsborough", "pinellas", "pasco"]
    
    for c in counties_to_search:
        try:
            scraper = get_scraper(c)
            county_results = await scraper.search_by_address(address)
            results.extend(county_results)
            await scraper.close()
        except Exception as e:
            print(f"Error searching {c}: {e}")
    
    return results


async def get_property_details(parcel_id: str, county: str) -> Optional[Dict[str, Any]]:
    """
    Get detailed property information
    
    Args:
        parcel_id: Parcel/account ID
        county: County name
    
    Returns:
        Property details dict or None
    """
    try:
        scraper = get_scraper(county)
        details = await scraper.get_property_details(parcel_id)
        await scraper.close()
        return details
    except Exception as e:
        print(f"Error getting details: {e}")
        return None
