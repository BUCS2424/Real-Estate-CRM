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
        """Search Zillow for property data using their public search"""
        result = {
            "source": "zillow",
            "found": False,
            "data": {},
            "images": [],
            "url": None,
            "error": None
        }
        
        try:
            # Build search URL - use simpler format
            addr_parts = address.lower().replace('.', '').replace(',', '').split()
            addr_slug = '-'.join(addr_parts)
            city_slug = city.lower().replace(' ', '-')
            
            # Try direct property URL format
            property_url = f"https://www.zillow.com/homedetails/{addr_slug}-{city_slug}-{state.lower()}-{zip_code}"
            
            # Add delay to avoid rate limiting
            await asyncio.sleep(2)
            
            connector = aiohttp.TCPConnector(ssl=False)
            headers = self._get_headers('https://www.google.com/')
            headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            
            async with aiohttp.ClientSession(headers=headers, timeout=self.timeout, connector=connector) as session:
                # Try the search page approach
                search_query = f"{address}, {city}, {state} {zip_code}".strip()
                search_url = f"https://www.zillow.com/homes/{quote_plus(search_query)}_rb/"
                
                async with session.get(search_url, allow_redirects=True) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'lxml')
                        
                        result["url"] = str(response.url)
                        
                        # Look for JSON data in script tags
                        for script in soup.find_all('script'):
                            if script.string and 'zpid' in script.string:
                                try:
                                    # Try to find image URLs in the script
                                    img_matches = re.findall(r'https://[^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*', script.string)
                                    for img_url in img_matches[:15]:
                                        if 'zillow' in img_url.lower() or 'zillowstatic' in img_url.lower():
                                            result["images"].append({
                                                "url": img_url.split('?')[0],  # Remove query params
                                                "source": "zillow"
                                            })
                                except:
                                    pass
                        
                        # Try to find images in img tags
                        for img in soup.find_all('img'):
                            src = img.get('src', '') or img.get('data-src', '')
                            if src and ('zillow' in src or 'zillowstatic' in src) and any(ext in src.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                                if src not in [i['url'] for i in result["images"]]:
                                    result["images"].append({
                                        "url": src.split('?')[0],
                                        "source": "zillow"
                                    })
                        
                        # Try to extract property data from page
                        # Price
                        price_patterns = [
                            soup.find('span', {'data-testid': 'price'}),
                            soup.find('span', class_=re.compile(r'price', re.I)),
                            soup.find('div', {'data-testid': 'price'}),
                        ]
                        for elem in price_patterns:
                            if elem:
                                result["data"]["price"] = self._extract_price(elem.text)
                                result["found"] = True
                                break
                        
                        # Beds/Baths/Sqft from various possible locations
                        stat_texts = soup.get_text()
                        bed_match = re.search(r'(\d+)\s*(?:bd|bed|bedroom)', stat_texts, re.I)
                        bath_match = re.search(r'(\d+\.?\d*)\s*(?:ba|bath|bathroom)', stat_texts, re.I)
                        sqft_match = re.search(r'([\d,]+)\s*(?:sq\s*ft|sqft|square\s*feet)', stat_texts, re.I)
                        
                        if bed_match:
                            result["data"]["bedrooms"] = int(bed_match.group(1))
                            result["found"] = True
                        if bath_match:
                            result["data"]["bathrooms"] = float(bath_match.group(1))
                            result["found"] = True
                        if sqft_match:
                            result["data"]["sqft"] = int(sqft_match.group(1).replace(',', ''))
                            result["found"] = True
                        
                        if result["images"]:
                            result["found"] = True
                            
                    else:
                        result["error"] = f"HTTP {response.status}"
                        
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
            # Add delay
            await asyncio.sleep(2)
            
            # Build search query
            search_query = f"{address}, {city}, {state} {zip_code}".strip()
            
            connector = aiohttp.TCPConnector(ssl=False)
            headers = self._get_headers('https://www.google.com/')
            
            async with aiohttp.ClientSession(headers=headers, timeout=self.timeout, connector=connector) as session:
                # Use Redfin's autocomplete API
                autocomplete_url = f"https://www.redfin.com/stingray/do/location-autocomplete?location={quote_plus(search_query)}&v=2"
                
                async with session.get(autocomplete_url) as response:
                    if response.status == 200:
                        text = await response.text()
                        # Redfin returns {}&&{...} format
                        if '&&' in text:
                            text = text.split('&&', 1)[1]
                        
                        try:
                            data = json.loads(text)
                            payload = data.get('payload', {})
                            sections = payload.get('sections', [])
                            
                            property_url = None
                            for section in sections:
                                rows = section.get('rows', [])
                                for row in rows:
                                    if row.get('type') == 'ADDRESS' and row.get('url'):
                                        property_url = f"https://www.redfin.com{row['url']}"
                                        break
                                if property_url:
                                    break
                            
                            if property_url:
                                await asyncio.sleep(1)
                                result["url"] = property_url
                                
                                async with session.get(property_url) as prop_response:
                                    if prop_response.status == 200:
                                        html = await prop_response.text()
                                        soup = BeautifulSoup(html, 'lxml')
                                        result["found"] = True
                                        
                                        # Extract images from various sources
                                        # 1. Look for image URLs in scripts
                                        for script in soup.find_all('script'):
                                            if script.string:
                                                img_matches = re.findall(r'https://ssl\.cdn-redfin\.com/[^"\']+\.(?:jpg|jpeg|png|webp)', script.string)
                                                for img_url in img_matches[:15]:
                                                    if img_url not in [i['url'] for i in result["images"]]:
                                                        result["images"].append({
                                                            "url": img_url,
                                                            "source": "redfin"
                                                        })
                                        
                                        # 2. Look in img tags
                                        for img in soup.find_all('img'):
                                            src = img.get('src', '') or img.get('data-src', '')
                                            if src and 'redfin' in src and any(ext in src.lower() for ext in ['.jpg', '.jpeg', '.png']):
                                                if src not in [i['url'] for i in result["images"]]:
                                                    result["images"].append({
                                                        "url": src,
                                                        "source": "redfin"
                                                    })
                                        
                                        # 3. Look for background images
                                        for elem in soup.find_all(style=re.compile(r'background.*url')):
                                            style = elem.get('style', '')
                                            match = re.search(r'url\(["\']?([^"\']+)["\']?\)', style)
                                            if match and 'redfin' in match.group(1):
                                                if match.group(1) not in [i['url'] for i in result["images"]]:
                                                    result["images"].append({
                                                        "url": match.group(1),
                                                        "source": "redfin"
                                                    })
                                        
                                        # Extract property data from page text
                                        page_text = soup.get_text()
                                        
                                        # Price
                                        price_match = re.search(r'\$[\d,]+', page_text)
                                        if price_match:
                                            result["data"]["price"] = self._extract_price(price_match.group())
                                        
                                        # Beds/Baths/Sqft
                                        bed_match = re.search(r'(\d+)\s*(?:Beds?|BD)', page_text, re.I)
                                        bath_match = re.search(r'(\d+\.?\d*)\s*(?:Baths?|BA)', page_text, re.I)
                                        sqft_match = re.search(r'([\d,]+)\s*(?:Sq\.?\s*Ft|SF)', page_text, re.I)
                                        
                                        if bed_match:
                                            result["data"]["bedrooms"] = int(bed_match.group(1))
                                        if bath_match:
                                            result["data"]["bathrooms"] = float(bath_match.group(1))
                                        if sqft_match:
                                            result["data"]["sqft"] = int(sqft_match.group(1).replace(',', ''))
                                    else:
                                        result["error"] = f"Property page HTTP {prop_response.status}"
                        except json.JSONDecodeError as e:
                            result["error"] = f"JSON decode error: {str(e)}"
                    else:
                        result["error"] = f"HTTP {response.status}"
                            
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
            # Add longer delay for Realtor (they rate limit aggressively)
            await asyncio.sleep(3)
            
            # Build search URL
            addr_slug = re.sub(r'[^a-zA-Z0-9\s]', '', address).replace(' ', '-')
            city_slug = city.replace(' ', '-')
            search_url = f"https://www.realtor.com/realestateandhomes-detail/{addr_slug}_{city_slug}_{state}"
            if zip_code:
                search_url += f"_{zip_code}"
            
            connector = aiohttp.TCPConnector(ssl=False)
            headers = self._get_headers('https://www.google.com/')
            
            async with aiohttp.ClientSession(headers=headers, timeout=self.timeout, connector=connector) as session:
                async with session.get(search_url, allow_redirects=True) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'lxml')
                        result["url"] = str(response.url)
                        
                        # Look for images in various places
                        # 1. Check og:image meta tag
                        og_image = soup.find('meta', property='og:image')
                        if og_image and og_image.get('content'):
                            result["images"].append({
                                "url": og_image.get('content'),
                                "source": "realtor"
                            })
                            result["found"] = True
                        
                        # 2. Look for images in script tags
                        for script in soup.find_all('script'):
                            if script.string:
                                # Find image URLs
                                img_matches = re.findall(r'https://[^"\']+rdcpix\.com/[^"\']+\.(?:jpg|jpeg|png|webp)', script.string)
                                for img_url in img_matches[:15]:
                                    clean_url = img_url.split('?')[0]
                                    if clean_url not in [i['url'] for i in result["images"]]:
                                        result["images"].append({
                                            "url": clean_url,
                                            "source": "realtor"
                                        })
                                        result["found"] = True
                        
                        # 3. Look in img tags
                        for img in soup.find_all('img'):
                            src = img.get('src', '') or img.get('data-src', '')
                            if src and ('rdcpix' in src or 'realtor' in src) and any(ext in src.lower() for ext in ['.jpg', '.jpeg', '.png']):
                                clean_url = src.split('?')[0]
                                if clean_url not in [i['url'] for i in result["images"]]:
                                    result["images"].append({
                                        "url": clean_url,
                                        "source": "realtor"
                                    })
                                    result["found"] = True
                        
                        # Extract property data
                        page_text = soup.get_text()
                        
                        # Price
                        price_match = re.search(r'\$[\d,]+', page_text)
                        if price_match:
                            result["data"]["price"] = self._extract_price(price_match.group())
                        
                        # Beds/Baths/Sqft
                        bed_match = re.search(r'(\d+)\s*(?:bed|bd)', page_text, re.I)
                        bath_match = re.search(r'(\d+\.?\d*)\s*(?:bath|ba)', page_text, re.I)
                        sqft_match = re.search(r'([\d,]+)\s*(?:sqft|sq\s*ft)', page_text, re.I)
                        
                        if bed_match:
                            result["data"]["bedrooms"] = int(bed_match.group(1))
                        if bath_match:
                            result["data"]["bathrooms"] = float(bath_match.group(1))
                        if sqft_match:
                            result["data"]["sqft"] = int(sqft_match.group(1).replace(',', ''))
                        
                        # Check JSON-LD data
                        for script in soup.find_all('script', type='application/ld+json'):
                            try:
                                data = json.loads(script.string)
                                if isinstance(data, dict):
                                    if data.get('@type') in ['SingleFamilyResidence', 'House', 'Apartment']:
                                        result["found"] = True
                                        if data.get('description'):
                                            result["data"]["description"] = data['description']
                                        if data.get('image'):
                                            images = data['image'] if isinstance(data['image'], list) else [data['image']]
                                            for img_url in images[:10]:
                                                if img_url not in [i['url'] for i in result["images"]]:
                                                    result["images"].append({
                                                        "url": img_url,
                                                        "source": "realtor"
                                                    })
                            except:
                                continue
                                
                    elif response.status == 429:
                        result["error"] = "Rate limited - try again later"
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
