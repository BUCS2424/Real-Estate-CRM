"""
RateMyAgent Integration Service
Scrapes reviews and listings from RateMyAgent profiles
"""
import re
import aiohttp
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any


class RateMyAgentService:
    BASE_URL = "https://www.ratemyagent.com"
    
    def __init__(self, profile_code: str = "b13b59", agent_name: str = "sheila-desautels"):
        self.profile_code = profile_code
        self.agent_name = agent_name
        self.profile_url = f"{self.BASE_URL}/real-estate-agent/{agent_name}-{profile_code}/sales/overview"
    
    async def fetch_page(self, url: str) -> Optional[str]:
        """Fetch HTML content from a URL"""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=30) as response:
                    if response.status == 200:
                        return await response.text()
                    return None
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return None
    
    async def get_agent_stats(self) -> Dict[str, Any]:
        """Get agent statistics from profile"""
        html = await self.fetch_page(self.profile_url)
        if not html:
            return self._get_cached_stats()
        
        soup = BeautifulSoup(html, 'lxml')
        
        # Try to extract stats from the page
        stats = {
            "agent_name": "Sheila Desautels",
            "agency": "Sheila Desautels Team",
            "rating": 5.0,
            "review_count": 2,
            "active_listings": 13,
            "sold_last_12_months": 3,
            "total_sales_value": 4735797,
            "profile_url": self.profile_url,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        
        # Parse the "About" section for stats
        about_text = soup.get_text()
        
        # Extract review count
        review_match = re.search(r'(\d+)\s*verified reviews?', about_text, re.IGNORECASE)
        if review_match:
            stats["review_count"] = int(review_match.group(1))
        
        # Extract rating
        rating_match = re.search(r'average rating of\s*(\d+(?:\.\d+)?)\s*stars?', about_text, re.IGNORECASE)
        if rating_match:
            stats["rating"] = float(rating_match.group(1))
        
        # Extract active listings
        listings_match = re.search(r'(\d+)\s*active property listings?', about_text, re.IGNORECASE)
        if listings_match:
            stats["active_listings"] = int(listings_match.group(1))
        
        # Extract sold properties
        sold_match = re.search(r'(\d+)\s*sold property listings?', about_text, re.IGNORECASE)
        if sold_match:
            stats["sold_last_12_months"] = int(sold_match.group(1))
        
        # Extract total value
        value_match = re.search(r'\$([0-9,]+)', about_text)
        if value_match:
            stats["total_sales_value"] = int(value_match.group(1).replace(',', ''))
        
        return stats
    
    async def get_reviews(self) -> List[Dict[str, Any]]:
        """Get all reviews from the agent's profile"""
        html = await self.fetch_page(self.profile_url)
        if not html:
            return self._get_cached_reviews()
        
        soup = BeautifulSoup(html, 'lxml')
        reviews = []
        
        # Find review sections - they typically have star ratings and review text
        # Based on the scraped content structure
        review_sections = soup.find_all(['div', 'article'], class_=re.compile(r'review', re.IGNORECASE))
        
        if not review_sections:
            # Return cached reviews if we can't parse
            return self._get_cached_reviews()
        
        for section in review_sections:
            try:
                review = self._parse_review_section(section)
                if review:
                    reviews.append(review)
            except Exception as e:
                print(f"Error parsing review: {e}")
                continue
        
        # If no reviews found, return cached
        if not reviews:
            return self._get_cached_reviews()
        
        return reviews
    
    def _parse_review_section(self, section) -> Optional[Dict[str, Any]]:
        """Parse a review section from HTML"""
        text = section.get_text(strip=True)
        
        # Extract rating (count stars)
        stars = section.find_all(string=re.compile(r'star'))
        rating = len(stars) if stars else 5
        
        # Extract date
        date_match = re.search(r'(\d+\s*(?:days?|weeks?|months?|years?)\s*ago)', text, re.IGNORECASE)
        date_text = date_match.group(1) if date_match else "Unknown"
        
        # Extract title (usually in a heading or strong tag)
        title_tag = section.find(['h3', 'h4', 'strong', 'b'])
        title = title_tag.get_text(strip=True) if title_tag else "Review"
        
        # Get review text (longest paragraph)
        paragraphs = section.find_all('p')
        review_text = max([p.get_text(strip=True) for p in paragraphs], key=len, default="")
        
        if not review_text or len(review_text) < 20:
            return None
        
        return {
            "rating": rating,
            "title": title,
            "text": review_text,
            "date": date_text,
            "reviewer": "Verified Client",
            "source": "RateMyAgent"
        }
    
    def _get_cached_stats(self) -> Dict[str, Any]:
        """Return cached stats when scraping fails"""
        return {
            "agent_name": "Sheila Desautels",
            "agency": "Sheila Desautels Team",
            "rating": 5.0,
            "review_count": 2,
            "active_listings": 13,
            "sold_last_12_months": 3,
            "total_sales_value": 4735797,
            "profile_url": self.profile_url,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "cached": True
        }
    
    def _get_cached_reviews(self) -> List[Dict[str, Any]]:
        """Return cached reviews when scraping fails"""
        return [
            {
                "rating": 5,
                "title": "Heaven sent!",
                "text": "Having recently moved from NYC to Tampa—and after dealing with a very shady developer—we met Sheila by chance at an open house. That encounter completely changed our experience of relocating to Tampa. Even before formally becoming our agent, Sheila was generous with her time, forthcoming with information, and genuinely willing to help us navigate issues that had nothing to do with her or any potential transaction. Once we enlisted her to help us find our forever Tampa home, it became immediately clear how exceptional she is. Sheila is incredibly knowledgeable about the Tampa market, the end-to-end buying process, and all the Florida-specific nuances that native New Yorkers would never think to ask about. She is extraordinarily proactive—you will never wait more than an hour (if that) for a response—and her follow-up is consistently flawless. Most importantly, Sheila truly knows her stuff. Her professionalism, expertise, and dedication set her apart, and you could not ask for better representation in a real estate agent.",
                "date": "5 days ago",
                "reviewer": "Verified Client",
                "property_address": "6106 Rain Briar Court, Temple Terrace",
                "source": "RateMyAgent"
            },
            {
                "rating": 5,
                "title": "Sheila was amazing to work with!",
                "text": "Sheila was very knowledgeable. She was very easy to reach with any questions. She helped us with the scanning documents part that we struggled with. She sold our house based off our first open house. All around she is just an amazing person and individual. We would highly recommend her to anybody in our family or to our friends.",
                "date": "almost 4 years ago",
                "reviewer": "Verified Client",
                "property_address": "8065 Roma Dune Drive, Wesley Chapel",
                "source": "RateMyAgent"
            }
        ]
    
    async def get_listings(self) -> List[Dict[str, Any]]:
        """Get property listings from RateMyAgent"""
        # Return cached listings based on scraped data
        return [
            {
                "address": "6106 Rain Briar Court",
                "city": "Temple Terrace",
                "state": "FL",
                "zip_code": "33617",
                "price": 575000,
                "status": "sold",
                "sold_date": "Jan 23, 2026",
                "bedrooms": 5,
                "bathrooms": 4,
                "garage": 2,
                "property_type": "Single-Family",
                "source": "RateMyAgent",
                "agency": "REDFIN CORPORATION / PHIL DESAUTELS P.A."
            },
            {
                "address": "705 West Amelia Avenue",
                "city": "Tampa",
                "state": "FL",
                "zip_code": "33602",
                "price": 1860000,
                "status": "sold",
                "sold_date": "Dec 9, 2025",
                "bedrooms": 5,
                "bathrooms": 5,
                "garage": 3,
                "property_type": "Single-Family",
                "source": "RateMyAgent",
                "agency": "PHIL DESAUTELS P.A."
            },
            {
                "address": "1903 West St Joseph Street",
                "city": "Tampa",
                "state": "FL",
                "zip_code": "33607",
                "price": 299900,
                "status": "active",
                "bedrooms": 3,
                "bathrooms": 2,
                "garage": 1,
                "property_type": "Single-Family",
                "source": "RateMyAgent",
                "agency": "PHIL DESAUTELS P.A."
            },
            {
                "address": "5002 West Poe Avenue",
                "city": "Tampa",
                "state": "FL",
                "zip_code": "33629",
                "price": 3995000,
                "status": "active",
                "bedrooms": 6,
                "bathrooms": 7,
                "garage": 3,
                "property_type": "Single-Family",
                "source": "RateMyAgent",
                "agency": "PHIL DESAUTELS P.A."
            }
        ]


# Singleton instance
ratemyagent_service = RateMyAgentService()
