"""
County Property Appraiser Scrapers for Florida Counties
Updated with working ArcGIS REST API endpoints (February 2026)
"""

import httpx
import asyncio
from typing import List, Dict, Any, Optional
import re

class BaseCountyScraper:
    """Base class for county property scrapers"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=60.0,
            follow_redirects=True,
            verify=False,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.5"
            }
        )
    
    async def close(self):
        await self.client.aclose()
    
    def normalize_address(self, address: str) -> str:
        """Normalize address for searching"""
        if not address:
            return ""
        
        # Extract just the street address portion
        address = address.upper().strip()
        
        # Remove common suffixes and city names
        address = re.sub(r',?\s*(FL|FLORIDA|TAMPA|CLEARWATER|ST\s*PETE|ST\s*PETERSBURG|NEW PORT RICHEY|HOLIDAY|LUTZ|BRANDON|RIVERVIEW|PLANT CITY|DADE CITY|ZEPHYRHILLS|TARPON SPRINGS|PALM HARBOR|DUNEDIN|LARGO|PINELLAS PARK|SEMINOLE)\s*$', '', address, flags=re.IGNORECASE)
        
        # Remove zip codes
        address = re.sub(r'\s*\d{5}(-\d{4})?\s*$', '', address)
        
        # Normalize common abbreviations
        replacements = {
            r'\bSTREET\b': 'ST',
            r'\bAVENUE\b': 'AVE',
            r'\bDRIVE\b': 'DR',
            r'\bROAD\b': 'RD',
            r'\bLANE\b': 'LN',
            r'\bCOURT\b': 'CT',
            r'\bBOULEVARD\b': 'BLVD',
            r'\bPLACE\b': 'PL',
            r'\bCIRCLE\b': 'CIR',
            r'\bNORTH\b': 'N',
            r'\bSOUTH\b': 'S',
            r'\bEAST\b': 'E',
            r'\bWEST\b': 'W',
        }
        
        for pattern, replacement in replacements.items():
            address = re.sub(pattern, replacement, address)
        
        return address.strip()
    
    def extract_street_number(self, address: str) -> Optional[str]:
        """Extract the street number from an address"""
        match = re.match(r'^(\d+)', address)
        return match.group(1) if match else None
    
    def extract_street_name(self, address: str) -> Optional[str]:
        """Extract the street name without number"""
        match = re.match(r'^\d+\s+(.+)$', address)
        return match.group(1) if match else None


class HillsboroughCountyScraper(BaseCountyScraper):
    """Scraper for Hillsborough County Property Appraiser"""
    
    # Working API endpoint
    API_URL = "https://gisdextweb1.hillsboroughcounty.org/arcgis/rest/services/Accela_GIS/MapServer/1/query"
    
    async def search(self, address: str) -> List[Dict[str, Any]]:
        """Search Hillsborough County property records by address"""
        normalized = self.normalize_address(address)
        if not normalized:
            return []
        
        # Build search query - use LIKE with wildcards
        street_num = self.extract_street_number(normalized)
        street_name = self.extract_street_name(normalized)
        
        # Try different search strategies
        results = []
        
        # Strategy 1: Search by street number and name
        if street_num and street_name:
            # Extract key words from street name (first word usually)
            name_parts = street_name.split()
            if name_parts:
                search_term = name_parts[0]
                where_clause = f"SITE_ADDR LIKE '{street_num}%{search_term}%'"
                results = await self._query(where_clause)
        
        # Strategy 2: If no results, try just the street number
        if not results and street_num:
            where_clause = f"SITE_ADDR LIKE '{street_num}%'"
            results = await self._query(where_clause, limit=10)
        
        # Strategy 3: Try the full normalized address
        if not results:
            where_clause = f"SITE_ADDR LIKE '%{normalized}%'"
            results = await self._query(where_clause)
        
        return results
    
    async def _query(self, where_clause: str, limit: int = 25) -> List[Dict[str, Any]]:
        """Execute query against the API"""
        try:
            params = {
                'where': where_clause,
                'outFields': 'SITE_ADDR,SITE_CITY,SITE_ZIP,OWNER,ADDR_1,ADDR_2,CITY,STATE,ZIP,PIN,JUST,LAND,BLDG,EXF,ACT,EFF,HEAT_AR,ASD_VAL,TAX_VAL,tBEDS,tBATHS,tSTORIES,ACREAGE,DOR_CODE',
                'returnGeometry': 'false',
                'f': 'json',
                'resultRecordCount': str(limit)
            }
            
            response = await self.client.get(self.API_URL, params=params)
            
            if response.status_code != 200:
                print(f"Hillsborough query failed: {response.status_code}")
                return []
            
            data = response.json()
            
            if 'error' in data:
                print(f"Hillsborough API error: {data['error']}")
                return []
            
            results = []
            for feature in data.get('features', []):
                attrs = feature.get('attributes', {})
                results.append({
                    'source': 'Hillsborough County Property Appraiser',
                    'county': 'Hillsborough',
                    'parcel_id': attrs.get('PIN', ''),
                    'address': attrs.get('SITE_ADDR', ''),
                    'city': attrs.get('SITE_CITY', ''),
                    'zip': attrs.get('SITE_ZIP', ''),
                    'owner_name': attrs.get('OWNER', ''),
                    'mailing_address': f"{attrs.get('ADDR_1', '')} {attrs.get('ADDR_2', '')}".strip(),
                    'mailing_city': attrs.get('CITY', ''),
                    'mailing_state': attrs.get('STATE', ''),
                    'mailing_zip': attrs.get('ZIP', ''),
                    'just_value': attrs.get('JUST'),
                    'land_value': attrs.get('LAND'),
                    'building_value': attrs.get('BLDG'),
                    'extra_features_value': attrs.get('EXF'),
                    'assessed_value': attrs.get('ASD_VAL'),
                    'taxable_value': attrs.get('TAX_VAL'),
                    'year_built': attrs.get('ACT'),
                    'effective_year': attrs.get('EFF'),
                    'living_area': attrs.get('HEAT_AR'),
                    'bedrooms': attrs.get('tBEDS'),
                    'bathrooms': attrs.get('tBATHS'),
                    'stories': attrs.get('tSTORIES'),
                    'acreage': attrs.get('ACREAGE'),
                    'use_code': attrs.get('DOR_CODE'),
                })
            
            return results
            
        except Exception as e:
            print(f"Hillsborough search error: {e}")
            return []


class PinellasCountyScraper(BaseCountyScraper):
    """Scraper for Pinellas County Property Appraiser"""
    
    # Try the direct Pinellas eGIS endpoint
    API_URL = "https://egis.pinellas.gov/gis/rest/services/PaoTpv/BaseMapParcelNcAerials/MapServer/find"
    QUERY_URL = "https://egis.pinellas.gov/gis/rest/services/PaoTpv/BaseMapParcelNcAerials/MapServer/0/query"
    
    async def search(self, address: str) -> List[Dict[str, Any]]:
        """Search Pinellas County property records by address"""
        normalized = self.normalize_address(address)
        if not normalized:
            return []
        
        # Try find endpoint first
        results = await self._find(normalized)
        
        return results
    
    async def _find(self, search_text: str) -> List[Dict[str, Any]]:
        """Use the find endpoint to search"""
        try:
            params = {
                'searchText': search_text,
                'contains': 'true',
                'searchFields': '',
                'sr': '4326',
                'layers': '0,1,2',
                'returnGeometry': 'false',
                'f': 'json'
            }
            
            response = await self.client.get(self.API_URL, params=params)
            
            if response.status_code != 200:
                print(f"Pinellas find failed: {response.status_code}")
                return []
            
            data = response.json()
            
            results = []
            for result in data.get('results', []):
                attrs = result.get('attributes', {})
                results.append({
                    'source': 'Pinellas County Property Appraiser',
                    'county': 'Pinellas',
                    'parcel_id': attrs.get('PARCEL_ID', attrs.get('PARCELID', '')),
                    'address': attrs.get('SITUS_ADDRESS', attrs.get('ADDRESS', '')),
                    'city': attrs.get('SITUS_CITY', attrs.get('CITY', '')),
                    'zip': attrs.get('SITUS_ZIP', ''),
                    'owner_name': attrs.get('OWNER_NAME', attrs.get('OWNER', '')),
                    'mailing_address': attrs.get('MAIL_ADDRESS', ''),
                    'mailing_city': attrs.get('MAIL_CITY', ''),
                    'mailing_state': attrs.get('MAIL_STATE', ''),
                    'mailing_zip': attrs.get('MAIL_ZIP', ''),
                    'just_value': attrs.get('JUST_VALUE', attrs.get('JUSTVALUE')),
                    'land_value': attrs.get('LAND_VALUE'),
                    'building_value': attrs.get('BLDG_VALUE'),
                    'assessed_value': attrs.get('ASSESSED_VALUE'),
                    'taxable_value': attrs.get('TAXABLE_VALUE'),
                    'year_built': attrs.get('YEAR_BUILT'),
                    'living_area': attrs.get('LIVING_AREA'),
                    'bedrooms': attrs.get('BEDROOMS'),
                    'bathrooms': attrs.get('BATHROOMS'),
                    'acreage': attrs.get('ACREAGE'),
                    'use_code': attrs.get('USE_CODE'),
                })
            
            return results
            
        except Exception as e:
            print(f"Pinellas search error: {e}")
            return []


class PascoCountyScraper(BaseCountyScraper):
    """Scraper for Pasco County Property Appraiser"""
    
    API_URL = "https://pascogis.pascocountyfl.net/giswebeserver/rest/services/Hosted/County_Master_Property_List/FeatureServer/0/query"
    
    async def search(self, address: str) -> List[Dict[str, Any]]:
        """Search Pasco County property records by address"""
        normalized = self.normalize_address(address)
        if not normalized:
            return []
        
        # Build search query
        street_num = self.extract_street_number(normalized)
        street_name = self.extract_street_name(normalized)
        
        results = []
        
        # Strategy 1: Search by number and name
        if street_num and street_name:
            name_parts = street_name.split()
            if name_parts:
                where_clause = f"site_address LIKE '{street_num}%{name_parts[0]}%'"
                results = await self._query(where_clause)
        
        # Strategy 2: Just street number
        if not results and street_num:
            where_clause = f"site_address LIKE '{street_num}%'"
            results = await self._query(where_clause, limit=10)
        
        return results
    
    async def _query(self, where_clause: str, limit: int = 25) -> List[Dict[str, Any]]:
        """Execute query against the Pasco API"""
        try:
            params = {
                'where': where_clause,
                'outFields': 'parcel_id,site_address,site_mailing_city,site_state,site_zip,owner_name_1,owner_name_2,mailing_address_1,mailing_city,mailing_state,mailing_zip,just_value,land_value,building_value,living_area,actual_year_built,has_homestead,sale_amount,sale_date',
                'returnGeometry': 'false',
                'f': 'json',
                'resultRecordCount': str(limit)
            }
            
            response = await self.client.get(self.API_URL, params=params)
            
            if response.status_code != 200:
                print(f"Pasco query failed: {response.status_code}")
                return []
            
            data = response.json()
            
            if 'error' in data:
                print(f"Pasco API error: {data['error']}")
                return []
            
            results = []
            for feature in data.get('features', []):
                attrs = feature.get('attributes', {})
                owner_name = attrs.get('owner_name_1', '')
                if attrs.get('owner_name_2'):
                    owner_name += f" {attrs.get('owner_name_2')}"
                
                results.append({
                    'source': 'Pasco County Property Appraiser',
                    'county': 'Pasco',
                    'parcel_id': attrs.get('parcel_id', ''),
                    'address': attrs.get('site_address', ''),
                    'city': attrs.get('site_mailing_city', ''),
                    'state': attrs.get('site_state', 'FL'),
                    'zip': attrs.get('site_zip', ''),
                    'owner_name': owner_name.strip(),
                    'mailing_address': attrs.get('mailing_address_1', ''),
                    'mailing_city': attrs.get('mailing_city', ''),
                    'mailing_state': attrs.get('mailing_state', ''),
                    'mailing_zip': attrs.get('mailing_zip', ''),
                    'just_value': attrs.get('just_value'),
                    'land_value': attrs.get('land_value'),
                    'building_value': attrs.get('building_value'),
                    'living_area': attrs.get('living_area'),
                    'year_built': attrs.get('actual_year_built'),
                    'homestead': attrs.get('has_homestead'),
                    'last_sale_amount': attrs.get('sale_amount'),
                    'last_sale_date': attrs.get('sale_date'),
                })
            
            return results
            
        except Exception as e:
            print(f"Pasco search error: {e}")
            return []


# Registry of available scrapers
COUNTY_SCRAPERS = {
    'hillsborough': HillsboroughCountyScraper,
    'pinellas': PinellasCountyScraper,
    'pasco': PascoCountyScraper,
}


async def search_property(address: str, county: str = None) -> List[Dict[str, Any]]:
    """
    Search for property information across county tax collectors
    
    Args:
        address: The property address to search for
        county: Optional specific county to search (hillsborough, pinellas, pasco)
                If not provided, searches all supported counties
    
    Returns:
        List of property records found
    """
    results = []
    
    if county and county.lower() in COUNTY_SCRAPERS:
        # Search specific county
        scraper_class = COUNTY_SCRAPERS[county.lower()]
        scraper = scraper_class()
        try:
            results = await scraper.search(address)
        finally:
            await scraper.close()
    else:
        # Search all counties
        for county_name, scraper_class in COUNTY_SCRAPERS.items():
            scraper = scraper_class()
            try:
                county_results = await scraper.search(address)
                results.extend(county_results)
            except Exception as e:
                print(f"Error searching {county_name}: {e}")
            finally:
                await scraper.close()
    
    return results


async def get_property_details(parcel_id: str, county: str) -> Optional[Dict[str, Any]]:
    """
    Get detailed property information by parcel ID
    
    Args:
        parcel_id: The parcel ID/folio number
        county: The county to search in
    
    Returns:
        Property details or None if not found
    """
    if county.lower() not in COUNTY_SCRAPERS:
        return None
    
    scraper_class = COUNTY_SCRAPERS[county.lower()]
    scraper = scraper_class()
    
    try:
        # Search by parcel ID
        if isinstance(scraper, HillsboroughCountyScraper):
            results = await scraper._query(f"PIN = '{parcel_id}'", limit=1)
        elif isinstance(scraper, PascoCountyScraper):
            results = await scraper._query(f"parcel_id = '{parcel_id}'", limit=1)
        else:
            results = []
        
        return results[0] if results else None
    finally:
        await scraper.close()


def get_scraper(county: str):
    """Get a scraper instance for a specific county"""
    county_lower = county.lower() if county else ''
    if county_lower in COUNTY_SCRAPERS:
        return COUNTY_SCRAPERS[county_lower]()
    return None


def get_supported_counties() -> List[str]:
    """Get list of supported counties"""
    return list(COUNTY_SCRAPERS.keys())
