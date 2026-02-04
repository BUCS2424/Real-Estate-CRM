"""
Property Data Scraper Service
Scrapes property details and images from multiple real estate websites
"""
import os
import re
import json
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any
from urllib.parse import quote_plus, urljoin
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import hashlib


class PropertyDataScraper:
    """Scrapes property data from multiple real estate websites"""
    
    def __init__(self):
        # Rotate user agents
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
        ]
        self.timeout = aiohttp.ClientTimeout(total=30)
    
    def _get_headers(self, referer: str = None) -> dict:
        """Get headers with random user agent"""
        import random
        headers = {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        }
        if referer:
            headers['Referer'] = referer
        return headers
    
    def _normalize_address(self, address: str, city: str = "", state: str = "", zip_code: str = "") -> str:
        """Normalize address for search"""
        full_address = f"{address}"
        if city:
            full_address += f", {city}"
        if state:
            full_address += f", {state}"
        if zip_code:
            full_address += f" {zip_code}"
        return full_address.strip()
    
    def _extract_price(self, text: str) -> Optional[float]:
        """Extract price from text"""
        if not text:
            return None
        # Remove $ and commas, extract number
        match = re.search(r'\$?([\d,]+)', text.replace(',', ''))
        if match:
            try:
                return float(match.group(1).replace(',', ''))
            except:
                pass
        return None
    
    def _extract_number(self, text: str) -> Optional[float]:
        """Extract number from text"""
        if not text:
            return None
        match = re.search(r'([\d.]+)', str(text))
        if match:
            try:
                return float(match.group(1))
            except:
                pass
        return None

    async def search_zillow(self, address: str, city: str, state: str, zip_code: str = "") -> Dict[str, Any]:
        """Search Zillow for property data"""
        result = {
            "source": "zillow",
            "found": False,
            "data": {},
            "images": [],
            "url": None,
            "error": None
        }
        
        try:
            # Build search URL
            search_query = self._normalize_address(address, city, state, zip_code)
            search_url = f"https://www.zillow.com/homes/{quote_plus(search_query)}_rb/"
            
            # Add small delay to avoid rate limiting
            await asyncio.sleep(1)
            
            connector = aiohttp.TCPConnector(ssl=False)
            async with aiohttp.ClientSession(headers=self._get_headers('https://www.zillow.com/'), timeout=self.timeout, connector=connector) as session:
                async with session.get(search_url) as response:
                    if response.status != 200:
                        result["error"] = f"HTTP {response.status}"
                        return result
                    
                    html = await response.text()
                    soup = BeautifulSoup(html, 'lxml')
                    
                    # Try to find property data in script tags (Zillow uses JSON-LD)
                    scripts = soup.find_all('script', type='application/json')
                    for script in scripts:
                        try:
                            data = json.loads(script.string)
                            if isinstance(data, dict):
                                # Look for property data
                                if 'props' in data or 'cat1' in data or 'searchResults' in data:
                                    result["raw_data"] = data
                        except:
                            continue
                    
                    # Try to extract from Next.js data
                    next_data = soup.find('script', id='__NEXT_DATA__')
                    if next_data:
                        try:
                            data = json.loads(next_data.string)
                            props = data.get('props', {}).get('pageProps', {})
                            
                            # Extract property info
                            if 'initialReduxState' in props:
                                redux = props['initialReduxState']
                                if 'gdp' in redux:
                                    gdp = redux['gdp']
                                    property_data = gdp.get('property', {})
                                    
                                    result["found"] = True
                                    result["data"] = {
                                        "price": property_data.get('price'),
                                        "bedrooms": property_data.get('bedrooms'),
                                        "bathrooms": property_data.get('bathrooms'),
                                        "sqft": property_data.get('livingArea'),
                                        "lot_size": property_data.get('lotSize'),
                                        "year_built": property_data.get('yearBuilt'),
                                        "property_type": property_data.get('homeType'),
                                        "description": property_data.get('description'),
                                        "zestimate": property_data.get('zestimate'),
                                    }
                                    
                                    # Extract images
                                    photos = property_data.get('responsivePhotos', [])
                                    for photo in photos[:20]:  # Limit to 20 images
                                        if isinstance(photo, dict):
                                            url = photo.get('mixedSources', {}).get('jpeg', [{}])
                                            if url and isinstance(url, list) and len(url) > 0:
                                                # Get highest resolution
                                                for size in reversed(url):
                                                    if 'url' in size:
                                                        result["images"].append({
                                                            "url": size['url'],
                                                            "source": "zillow"
                                                        })
                                                        break
                        except Exception as e:
                            result["error"] = str(e)
                    
                    # Fallback: Try to extract from meta tags
                    if not result["found"]:
                        og_image = soup.find('meta', property='og:image')
                        if og_image:
                            result["images"].append({
                                "url": og_image.get('content'),
                                "source": "zillow"
                            })
                        
                        # Look for price in page
                        price_elem = soup.find('span', {'data-testid': 'price'})
                        if price_elem:
                            result["data"]["price"] = self._extract_price(price_elem.text)
                            result["found"] = True
                    
                    result["url"] = search_url
                    
        except asyncio.TimeoutError:
            result["error"] = "Timeout"
        except Exception as e:
            result["error"] = str(e)
        
        return result

    async def search_redfin(self, address: str, city: str, state: str, zip_code: str = "") -> Dict[str, Any]:
        """Search Redfin for property data"""
        result = {
            "source": "redfin",
            "found": False,
            "data": {},
            "images": [],
            "url": None,
            "error": None
        }
        
        try:
            # Build search URL - Redfin uses a different URL structure
            search_query = self._normalize_address(address, city, state, zip_code)
            
            # Add small delay
            await asyncio.sleep(1)
            
            # First, search for the property
            search_url = f"https://www.redfin.com/stingray/do/location-autocomplete?location={quote_plus(search_query)}&v=2"
            
            connector = aiohttp.TCPConnector(ssl=False)
            async with aiohttp.ClientSession(headers=self._get_headers('https://www.redfin.com/'), timeout=self.timeout, connector=connector) as session:
                # Get autocomplete results
                async with session.get(search_url) as response:
                    if response.status == 200:
                        text = await response.text()
                        # Redfin returns {}&&{...} format
                        if '&&' in text:
                            text = text.split('&&')[1]
                        try:
                            data = json.loads(text)
                            payload = data.get('payload', {})
                            sections = payload.get('sections', [])
                            
                            for section in sections:
                                rows = section.get('rows', [])
                                for row in rows:
                                    if row.get('type') == 'ADDRESS':
                                        # Found the property
                                        property_url = row.get('url')
                                        if property_url:
                                            result["url"] = f"https://www.redfin.com{property_url}"
                                            
                                            # Fetch property page
                                            async with session.get(result["url"]) as prop_response:
                                                if prop_response.status == 200:
                                                    html = await prop_response.text()
                                                    soup = BeautifulSoup(html, 'lxml')
                                                    
                                                    result["found"] = True
                                                    
                                                    # Extract price
                                                    price_elem = soup.find('div', class_='statsValue')
                                                    if price_elem:
                                                        result["data"]["price"] = self._extract_price(price_elem.text)
                                                    
                                                    # Extract basic stats
                                                    stats = soup.find_all('div', class_='stat-block')
                                                    for stat in stats:
                                                        label = stat.find('span', class_='label')
                                                        value = stat.find('div', class_='statsValue')
                                                        if label and value:
                                                            label_text = label.text.lower()
                                                            if 'bed' in label_text:
                                                                result["data"]["bedrooms"] = self._extract_number(value.text)
                                                            elif 'bath' in label_text:
                                                                result["data"]["bathrooms"] = self._extract_number(value.text)
                                                            elif 'sq ft' in label_text or 'sqft' in label_text:
                                                                result["data"]["sqft"] = self._extract_number(value.text)
                                                    
                                                    # Extract images
                                                    img_tags = soup.find_all('img', class_='widenPhoto')
                                                    for img in img_tags[:20]:
                                                        src = img.get('src') or img.get('data-src')
                                                        if src and 'redfin' in src:
                                                            result["images"].append({
                                                                "url": src,
                                                                "source": "redfin"
                                                            })
                                                    
                                                    # Also check for background images in gallery
                                                    gallery = soup.find('div', class_='PhotosView')
                                                    if gallery:
                                                        style_imgs = gallery.find_all(style=re.compile(r'background-image'))
                                                        for elem in style_imgs[:20]:
                                                            style = elem.get('style', '')
                                                            match = re.search(r'url\(["\']?([^"\']+)["\']?\)', style)
                                                            if match:
                                                                result["images"].append({
                                                                    "url": match.group(1),
                                                                    "source": "redfin"
                                                                })
                                            break
                        except json.JSONDecodeError:
                            pass
                            
        except asyncio.TimeoutError:
            result["error"] = "Timeout"
        except Exception as e:
            result["error"] = str(e)
        
        return result

    async def search_realtor(self, address: str, city: str, state: str, zip_code: str = "") -> Dict[str, Any]:
        """Search Realtor.com for property data"""
        result = {
            "source": "realtor",
            "found": False,
            "data": {},
            "images": [],
            "url": None,
            "error": None
        }
        
        try:
            # Build search URL
            # Realtor.com URL format: /realestateandhomes-detail/ADDRESS_CITY_STATE_ZIP
            addr_slug = re.sub(r'[^a-zA-Z0-9\s]', '', address).replace(' ', '-')
            city_slug = city.replace(' ', '-')
            search_url = f"https://www.realtor.com/realestateandhomes-detail/{addr_slug}_{city_slug}_{state}"
            if zip_code:
                search_url += f"_{zip_code}"
            
            # Add small delay
            await asyncio.sleep(1)
            
            connector = aiohttp.TCPConnector(ssl=False)
            async with aiohttp.ClientSession(headers=self._get_headers('https://www.realtor.com/'), timeout=self.timeout, connector=connector) as session:
                async with session.get(search_url) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'lxml')
                        
                        # Check if we found the property
                        if soup.find('div', {'data-testid': 'property-detail'}):
                            result["found"] = True
                            result["url"] = search_url
                            
                            # Extract price
                            price_elem = soup.find('div', {'data-testid': 'list-price'})
                            if price_elem:
                                result["data"]["price"] = self._extract_price(price_elem.text)
                            
                            # Extract beds/baths/sqft
                            meta_items = soup.find_all('li', {'data-testid': re.compile(r'property-meta')})
                            for item in meta_items:
                                text = item.text.lower()
                                if 'bed' in text:
                                    result["data"]["bedrooms"] = self._extract_number(text)
                                elif 'bath' in text:
                                    result["data"]["bathrooms"] = self._extract_number(text)
                                elif 'sqft' in text or 'sq ft' in text:
                                    result["data"]["sqft"] = self._extract_number(text)
                            
                            # Extract images from gallery
                            gallery_imgs = soup.find_all('img', {'data-testid': re.compile(r'hero-image|gallery')})
                            for img in gallery_imgs[:20]:
                                src = img.get('src') or img.get('data-src')
                                if src:
                                    result["images"].append({
                                        "url": src,
                                        "source": "realtor"
                                    })
                            
                            # Also check meta og:image
                            og_image = soup.find('meta', property='og:image')
                            if og_image and og_image.get('content'):
                                result["images"].insert(0, {
                                    "url": og_image.get('content'),
                                    "source": "realtor"
                                })
                        
                        # Try JSON-LD data
                        scripts = soup.find_all('script', type='application/ld+json')
                        for script in scripts:
                            try:
                                data = json.loads(script.string)
                                if isinstance(data, dict) and data.get('@type') == 'SingleFamilyResidence':
                                    result["found"] = True
                                    result["data"].update({
                                        "description": data.get('description'),
                                        "sqft": data.get('floorSize', {}).get('value') if isinstance(data.get('floorSize'), dict) else None,
                                    })
                                    if data.get('image'):
                                        images = data['image'] if isinstance(data['image'], list) else [data['image']]
                                        for img_url in images[:20]:
                                            result["images"].append({
                                                "url": img_url,
                                                "source": "realtor"
                                            })
                            except:
                                continue
                    else:
                        result["error"] = f"HTTP {response.status}"
                        
        except asyncio.TimeoutError:
            result["error"] = "Timeout"
        except Exception as e:
            result["error"] = str(e)
        
        return result

    def get_street_view_url(self, address: str, city: str, state: str, zip_code: str = "") -> Dict[str, Any]:
        """Generate Google Street View image URL"""
        full_address = self._normalize_address(address, city, state, zip_code)
        
        # Google Street View Static API (requires API key for high-res)
        # For now, generate the embed URL that works without API key
        encoded_address = quote_plus(full_address)
        
        # Street View embed URL
        street_view_url = f"https://www.google.com/maps/embed/v1/streetview?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&location={encoded_address}&heading=0&pitch=0&fov=90"
        
        # Alternative: Use the thumbnail approach
        # This generates a static image URL
        static_url = f"https://maps.googleapis.com/maps/api/streetview?size=800x600&location={encoded_address}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8"
        
        return {
            "source": "google_street_view",
            "embed_url": street_view_url,
            "static_url": static_url,
            "address": full_address
        }

    async def scrape_property(self, address: str, city: str, state: str, zip_code: str = "") -> Dict[str, Any]:
        """
        Scrape property data from all sources
        Returns combined results with best available data
        """
        # Run all scrapers concurrently
        tasks = [
            self.search_zillow(address, city, state, zip_code),
            self.search_redfin(address, city, state, zip_code),
            self.search_realtor(address, city, state, zip_code),
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        zillow_result = results[0] if not isinstance(results[0], Exception) else {"found": False, "error": str(results[0])}
        redfin_result = results[1] if not isinstance(results[1], Exception) else {"found": False, "error": str(results[1])}
        realtor_result = results[2] if not isinstance(results[2], Exception) else {"found": False, "error": str(results[2])}
        
        # Get street view
        street_view = self.get_street_view_url(address, city, state, zip_code)
        
        # Combine data - prioritize by source reliability
        combined_data = {}
        all_images = []
        sources_found = []
        source_urls = {}
        
        # Priority order: Zillow > Redfin > Realtor
        for result, source_name in [
            (zillow_result, "zillow"),
            (redfin_result, "redfin"),
            (realtor_result, "realtor")
        ]:
            if isinstance(result, dict) and result.get("found"):
                sources_found.append(source_name)
                if result.get("url"):
                    source_urls[source_name] = result["url"]
                
                # Merge data (first found wins)
                for key, value in result.get("data", {}).items():
                    if value is not None and key not in combined_data:
                        combined_data[key] = value
                
                # Collect images
                for img in result.get("images", []):
                    if img not in all_images:
                        all_images.append(img)
        
        # Deduplicate images by URL
        seen_urls = set()
        unique_images = []
        for img in all_images:
            url = img.get("url", "")
            # Create hash of URL to check duplicates
            url_hash = hashlib.md5(url.encode()).hexdigest()
            if url_hash not in seen_urls and url:
                seen_urls.add(url_hash)
                unique_images.append(img)
        
        return {
            "success": len(sources_found) > 0,
            "address": self._normalize_address(address, city, state, zip_code),
            "sources_checked": ["zillow", "redfin", "realtor"],
            "sources_found": sources_found,
            "source_urls": source_urls,
            "data": combined_data,
            "images": unique_images[:30],  # Limit to 30 images
            "street_view": street_view,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "errors": {
                "zillow": zillow_result.get("error") if isinstance(zillow_result, dict) else str(zillow_result),
                "redfin": redfin_result.get("error") if isinstance(redfin_result, dict) else str(redfin_result),
                "realtor": realtor_result.get("error") if isinstance(realtor_result, dict) else str(realtor_result),
            }
        }


# Singleton instance
property_scraper = PropertyDataScraper()


async def scrape_property_data(address: str, city: str, state: str = "FL", zip_code: str = "") -> Dict[str, Any]:
    """
    Main function to scrape property data
    """
    return await property_scraper.scrape_property(address, city, state, zip_code)
