"""
Social Media Service
Handles posting to various social media platforms
"""
import os
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class SocialMediaService:
    """Service for managing social media integrations"""
    
    def __init__(self):
        self.platforms = {
            "facebook": FacebookService(),
            "instagram": InstagramService(),
            "linkedin": LinkedInService(),
            "twitter": TwitterService(),
            "tiktok": TikTokService(),
            "pinterest": PinterestService()
        }
    
    async def publish_to_platform(self, platform: str, post: dict) -> Dict[str, Any]:
        """Publish a post to a specific platform"""
        from database import db
        
        # Get account credentials
        account = await db.social_accounts.find_one({
            "platform": platform,
            "is_active": True
        })
        
        if not account:
            return {"success": False, "error": f"No connected {platform} account"}
        
        service = self.platforms.get(platform)
        if not service:
            return {"success": False, "error": f"Unsupported platform: {platform}"}
        
        try:
            result = await service.publish(account, post)
            return result
        except Exception as e:
            logger.error(f"Error publishing to {platform}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def generate_content(
        self,
        prompt_type: str,
        property_data: Optional[dict],
        custom_prompt: Optional[str],
        platforms: List[str],
        tone: str
    ) -> Dict[str, Any]:
        """Generate AI content for social media"""
        try:
            # Build the prompt based on type
            if prompt_type == "listing" and property_data:
                prompt = self._build_listing_prompt(property_data, tone, platforms)
            elif prompt_type == "open_house" and property_data:
                prompt = self._build_open_house_prompt(property_data, tone)
            elif prompt_type == "market_update":
                prompt = self._build_market_update_prompt(tone)
            elif prompt_type == "testimonial":
                prompt = self._build_testimonial_prompt(tone)
            elif custom_prompt:
                prompt = f"Write a {tone} social media post about: {custom_prompt}"
            else:
                prompt = f"Write a {tone} social media post for a real estate agent."
            
            # Use Emergent LLM integration
            from emergentintegrations.llm.chat import chat, ModelName
            
            system_prompt = """You are a social media expert for a luxury real estate agency. 
            Create engaging, platform-optimized content. Keep posts concise but impactful.
            Include relevant emojis sparingly. Don't include hashtags in the main content - those will be added separately.
            For Instagram/TikTok, make it more casual and engaging.
            For LinkedIn, keep it professional.
            For Facebook, balance professional with personal touch."""
            
            response = await chat(
                api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
                prompt=prompt,
                system_prompt=system_prompt,
                model=ModelName.GEMINI_3_FLASH
            )
            
            content = response.message if hasattr(response, 'message') else str(response)
            
            # Generate platform-specific versions if multiple platforms
            versions = {}
            if len(platforms) > 1:
                for platform in platforms:
                    versions[platform] = await self._adapt_for_platform(content, platform)
            else:
                versions[platforms[0]] = content
            
            return {
                "success": True,
                "content": content,
                "versions": versions,
                "hashtags": await self.suggest_hashtags(content, platforms[0] if platforms else "instagram")
            }
            
        except Exception as e:
            logger.error(f"Error generating AI content: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _build_listing_prompt(self, property_data: dict, tone: str, platforms: List[str]) -> str:
        address = property_data.get("address", "Beautiful property")
        price = property_data.get("price", "")
        beds = property_data.get("bedrooms", "")
        baths = property_data.get("bathrooms", "")
        sqft = property_data.get("sqft", "")
        features = property_data.get("features", [])
        
        return f"""Write a {tone} social media post for this property listing:
        
        Address: {address}
        Price: ${price:,} if price else 'Contact for pricing'
        Bedrooms: {beds}
        Bathrooms: {baths}
        Square Feet: {sqft}
        Key Features: {', '.join(features[:5]) if features else 'Luxury finishes throughout'}
        
        Target platforms: {', '.join(platforms)}
        Make it compelling and include a call to action."""
    
    def _build_open_house_prompt(self, property_data: dict, tone: str) -> str:
        address = property_data.get("address", "")
        return f"""Write a {tone} social media announcement for an upcoming open house:
        
        Property: {address}
        
        Include excitement, urgency, and a call to action. Mention that it's a great opportunity to tour the home."""
    
    def _build_market_update_prompt(self, tone: str) -> str:
        return f"""Write a {tone} social media post sharing a real estate market insight or tip.
        Focus on being helpful to potential buyers or sellers.
        Include actionable advice."""
    
    def _build_testimonial_prompt(self, tone: str) -> str:
        return f"""Write a {tone} social media post template for sharing a client testimonial.
        Make it feel authentic and grateful.
        Include a thank you to the client and mention the positive experience."""
    
    async def _adapt_for_platform(self, content: str, platform: str) -> str:
        """Adapt content for specific platform requirements"""
        # Character limits and style adjustments
        limits = {
            "twitter": 280,
            "linkedin": 3000,
            "facebook": 63206,
            "instagram": 2200,
            "tiktok": 2200,
            "pinterest": 500
        }
        
        limit = limits.get(platform, 2000)
        if len(content) > limit:
            content = content[:limit-3] + "..."
        
        return content
    
    async def suggest_hashtags(self, content: str, platform: str) -> List[str]:
        """Suggest relevant hashtags based on content and platform"""
        # Base real estate hashtags
        base_hashtags = {
            "facebook": ["realestate", "homeforsale", "realtor", "dreamhome", "househunting"],
            "instagram": ["realestate", "realtor", "homeforsale", "luxuryrealestate", "dreamhome", 
                         "househunting", "newhome", "realtorlife", "homesforsale", "property"],
            "linkedin": ["realestate", "property", "investment", "realestateagent", "homebuying"],
            "twitter": ["realestate", "homeforsale", "realtor", "property"],
            "tiktok": ["realestate", "househunting", "homesforsale", "realtor", "dreamhome", "housetour"],
            "pinterest": ["realestate", "dreamhome", "homedecor", "homedesign", "luxuryhomes"]
        }
        
        hashtags = base_hashtags.get(platform, base_hashtags["instagram"])
        
        # Add location-based hashtags if detected
        locations = ["florida", "orlando", "miami", "tampa", "jacksonville"]
        content_lower = content.lower()
        for loc in locations:
            if loc in content_lower:
                hashtags.insert(0, f"{loc}realestate")
                hashtags.insert(1, f"{loc}realtor")
                break
        
        # Platform-specific hashtag limits
        limits = {
            "instagram": 30,
            "tiktok": 5,
            "twitter": 3,
            "facebook": 5,
            "linkedin": 5,
            "pinterest": 10
        }
        
        return ["#" + h for h in hashtags[:limits.get(platform, 10)]]


class FacebookService:
    """Facebook/Meta Graph API integration"""
    
    async def publish(self, account: dict, post: dict) -> Dict[str, Any]:
        """Publish to Facebook Page"""
        access_token = account.get("access_token")
        page_id = account.get("page_id") or account.get("account_id")
        
        if not access_token or not page_id:
            return {"success": False, "error": "Missing Facebook credentials"}
        
        try:
            async with httpx.AsyncClient() as client:
                # Check if post has media
                if post.get("media"):
                    # Post with image
                    media = post["media"][0]
                    if media.get("type") == "video":
                        # Video post
                        response = await client.post(
                            f"https://graph.facebook.com/v18.0/{page_id}/videos",
                            data={
                                "access_token": access_token,
                                "file_url": media["url"],
                                "description": post["content"]
                            }
                        )
                    else:
                        # Image post
                        response = await client.post(
                            f"https://graph.facebook.com/v18.0/{page_id}/photos",
                            data={
                                "access_token": access_token,
                                "url": media["url"],
                                "caption": post["content"]
                            }
                        )
                else:
                    # Text-only post
                    response = await client.post(
                        f"https://graph.facebook.com/v18.0/{page_id}/feed",
                        data={
                            "access_token": access_token,
                            "message": post["content"]
                        }
                    )
                
                result = response.json()
                
                if "id" in result:
                    return {"success": True, "post_id": result["id"]}
                else:
                    return {"success": False, "error": result.get("error", {}).get("message", "Unknown error")}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}


class InstagramService:
    """Instagram Graph API integration (requires Facebook Business)"""
    
    async def publish(self, account: dict, post: dict) -> Dict[str, Any]:
        """Publish to Instagram Business Account"""
        access_token = account.get("access_token")
        ig_user_id = account.get("account_id")
        
        if not access_token or not ig_user_id:
            return {"success": False, "error": "Missing Instagram credentials"}
        
        if not post.get("media"):
            return {"success": False, "error": "Instagram requires an image or video"}
        
        try:
            async with httpx.AsyncClient() as client:
                media = post["media"][0]
                
                # Step 1: Create media container
                if media.get("type") == "video":
                    container_response = await client.post(
                        f"https://graph.facebook.com/v18.0/{ig_user_id}/media",
                        data={
                            "access_token": access_token,
                            "video_url": media["url"],
                            "caption": post["content"],
                            "media_type": "REELS"
                        }
                    )
                else:
                    container_response = await client.post(
                        f"https://graph.facebook.com/v18.0/{ig_user_id}/media",
                        data={
                            "access_token": access_token,
                            "image_url": media["url"],
                            "caption": post["content"]
                        }
                    )
                
                container = container_response.json()
                
                if "id" not in container:
                    return {"success": False, "error": container.get("error", {}).get("message", "Failed to create media")}
                
                # Step 2: Publish the container
                publish_response = await client.post(
                    f"https://graph.facebook.com/v18.0/{ig_user_id}/media_publish",
                    data={
                        "access_token": access_token,
                        "creation_id": container["id"]
                    }
                )
                
                result = publish_response.json()
                
                if "id" in result:
                    return {"success": True, "post_id": result["id"]}
                else:
                    return {"success": False, "error": result.get("error", {}).get("message", "Failed to publish")}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}


class LinkedInService:
    """LinkedIn API integration"""
    
    async def publish(self, account: dict, post: dict) -> Dict[str, Any]:
        """Publish to LinkedIn"""
        access_token = account.get("access_token")
        person_urn = account.get("account_id")
        
        if not access_token or not person_urn:
            return {"success": False, "error": "Missing LinkedIn credentials"}
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0"
                }
                
                # Build post payload
                payload = {
                    "author": f"urn:li:person:{person_urn}",
                    "lifecycleState": "PUBLISHED",
                    "specificContent": {
                        "com.linkedin.ugc.ShareContent": {
                            "shareCommentary": {
                                "text": post["content"]
                            },
                            "shareMediaCategory": "NONE"
                        }
                    },
                    "visibility": {
                        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                    }
                }
                
                # Add media if present
                if post.get("media"):
                    media = post["media"][0]
                    payload["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "IMAGE"
                    payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [{
                        "status": "READY",
                        "originalUrl": media["url"]
                    }]
                
                response = await client.post(
                    "https://api.linkedin.com/v2/ugcPosts",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    return {"success": True, "post_id": result.get("id", "posted")}
                else:
                    return {"success": False, "error": f"LinkedIn API error: {response.status_code}"}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}


class TwitterService:
    """Twitter/X API integration"""
    
    async def publish(self, account: dict, post: dict) -> Dict[str, Any]:
        """Publish to Twitter/X"""
        # Twitter API v2 requires OAuth 2.0 and costs $100/month for write access
        # This is a placeholder that will work when credentials are provided
        
        bearer_token = account.get("access_token")
        
        if not bearer_token:
            return {"success": False, "error": "Missing Twitter credentials"}
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {bearer_token}",
                    "Content-Type": "application/json"
                }
                
                payload = {"text": post["content"][:280]}  # Twitter character limit
                
                response = await client.post(
                    "https://api.twitter.com/2/tweets",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    return {"success": True, "post_id": result.get("data", {}).get("id")}
                else:
                    return {"success": False, "error": f"Twitter API error: {response.status_code}"}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}


class TikTokService:
    """TikTok API integration"""
    
    async def publish(self, account: dict, post: dict) -> Dict[str, Any]:
        """Publish to TikTok"""
        access_token = account.get("access_token")
        
        if not access_token:
            return {"success": False, "error": "Missing TikTok credentials"}
        
        if not post.get("media") or post["media"][0].get("type") != "video":
            return {"success": False, "error": "TikTok requires a video"}
        
        try:
            async with httpx.AsyncClient() as client:
                # TikTok Content Posting API
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                
                video_url = post["media"][0]["url"]
                
                # Initialize video upload
                init_response = await client.post(
                    "https://open.tiktokapis.com/v2/post/publish/video/init/",
                    headers=headers,
                    json={
                        "post_info": {
                            "title": post["content"][:150],
                            "privacy_level": "PUBLIC_TO_EVERYONE",
                            "disable_duet": False,
                            "disable_comment": False,
                            "disable_stitch": False
                        },
                        "source_info": {
                            "source": "PULL_FROM_URL",
                            "video_url": video_url
                        }
                    }
                )
                
                if init_response.status_code == 200:
                    result = init_response.json()
                    return {"success": True, "post_id": result.get("data", {}).get("publish_id")}
                else:
                    return {"success": False, "error": f"TikTok API error: {init_response.status_code}"}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}


class PinterestService:
    """Pinterest API integration"""
    
    async def publish(self, account: dict, post: dict) -> Dict[str, Any]:
        """Publish to Pinterest"""
        access_token = account.get("access_token")
        
        if not access_token:
            return {"success": False, "error": "Missing Pinterest credentials"}
        
        if not post.get("media"):
            return {"success": False, "error": "Pinterest requires an image"}
        
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                
                media = post["media"][0]
                
                payload = {
                    "board_id": account.get("page_id"),  # Pinterest board ID
                    "media_source": {
                        "source_type": "image_url",
                        "url": media["url"]
                    },
                    "title": post["content"][:100],
                    "description": post["content"][:500],
                    "alt_text": post["content"][:500]
                }
                
                response = await client.post(
                    "https://api.pinterest.com/v5/pins",
                    headers=headers,
                    json=payload
                )
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    return {"success": True, "post_id": result.get("id")}
                else:
                    return {"success": False, "error": f"Pinterest API error: {response.status_code}"}
                    
        except Exception as e:
            return {"success": False, "error": str(e)}


# Singleton instance
social_service = SocialMediaService()
