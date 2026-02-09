"""
SkyReels V3 Video Generation Service
Generates AI avatar videos using SkyReels API
"""
import os
import io
import httpx
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime

SKYREELS_API_KEY = os.environ.get('SKYREELS_API_KEY')

# API Endpoints - try multiple providers
VYRO_API_URL = "https://api.vyro.ai/v2/video/image-to-video"
PIAPI_URL = "https://api.piapi.ai/api/v1/task"
SKYREELS_DIRECT_URL = "https://api.skyreels.ai/v1/generate"


class SkyReelsService:
    """Service for generating AI avatar videos using SkyReels"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or SKYREELS_API_KEY
        self.client = httpx.AsyncClient(timeout=120.0)
    
    async def close(self):
        await self.client.aclose()
    
    async def generate_avatar_video(
        self,
        image_url: str = None,
        image_bytes: bytes = None,
        prompt: str = "Professional real estate agent speaking confidently",
        audio_url: str = None,
        audio_bytes: bytes = None,
        style: str = "skyreels-i2v",
        aspect_ratio: str = "9:16",
        duration: int = 5
    ) -> Dict[str, Any]:
        """
        Generate an avatar video from an image
        
        Args:
            image_url: URL to the avatar image
            image_bytes: Raw image bytes (alternative to URL)
            prompt: Description of the video to generate
            audio_url: URL to audio file for lip-sync
            audio_bytes: Raw audio bytes for lip-sync
            style: Video generation style
            aspect_ratio: Output aspect ratio (9:16, 16:9, 1:1)
            duration: Video duration in seconds
        
        Returns:
            Dict with video URL or error
        """
        if not self.api_key:
            return {"success": False, "error": "SkyReels API key not configured"}
        
        # Try Vyro/Imagine API first
        result = await self._try_vyro_api(image_url, image_bytes, prompt, style, aspect_ratio)
        if result.get("success"):
            return result
        
        # Try PiAPI as fallback
        result = await self._try_piapi(image_url, prompt, aspect_ratio, duration)
        if result.get("success"):
            return result
        
        # Try direct SkyReels API
        result = await self._try_skyreels_direct(image_url, prompt, audio_url, aspect_ratio)
        return result
    
    async def _try_vyro_api(
        self,
        image_url: str,
        image_bytes: bytes,
        prompt: str,
        style: str,
        aspect_ratio: str
    ) -> Dict[str, Any]:
        """Try generating video via Vyro/Imagine API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}"
            }
            
            # Build form data
            data = {
                "prompt": prompt,
                "style": style,
                "aspect_ratio": aspect_ratio
            }
            
            files = None
            if image_bytes:
                files = {"image": ("avatar.jpg", image_bytes, "image/jpeg")}
            elif image_url:
                # Download image first
                img_response = await self.client.get(image_url)
                if img_response.status_code == 200:
                    files = {"image": ("avatar.jpg", img_response.content, "image/jpeg")}
            
            if not files:
                return {"success": False, "error": "No image provided"}
            
            response = await self.client.post(
                VYRO_API_URL,
                headers=headers,
                data=data,
                files=files
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "video_url": result.get("video_url") or result.get("output"),
                    "provider": "vyro",
                    "data": result
                }
            else:
                return {
                    "success": False,
                    "error": f"Vyro API error: {response.status_code}",
                    "details": response.text
                }
                
        except Exception as e:
            return {"success": False, "error": f"Vyro API exception: {str(e)}"}
    
    async def _try_piapi(
        self,
        image_url: str,
        prompt: str,
        aspect_ratio: str,
        duration: int
    ) -> Dict[str, Any]:
        """Try generating video via PiAPI - Primary provider"""
        try:
            headers = {
                "x-api-key": self.api_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "Qubico/skyreels",
                "task_type": "img2video",
                "input": {
                    "prompt": f"FPS-24, {prompt}",
                    "negative_prompt": "chaotic, distortion, morphing, blurry, low quality",
                    "image": image_url,
                    "aspect_ratio": aspect_ratio,
                    "guidance_scale": 3.5
                }
            }
            
            response = await self.client.post(
                PIAPI_URL,
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                data = result.get("data", result)
                return {
                    "success": True,
                    "video_url": data.get("output", {}).get("video") if isinstance(data.get("output"), dict) else data.get("output"),
                    "task_id": data.get("task_id") or result.get("task_id"),
                    "status": data.get("status"),
                    "provider": "piapi",
                    "data": result
                }
            else:
                return {
                    "success": False,
                    "error": f"PiAPI error: {response.status_code}",
                    "details": response.text
                }
                
        except Exception as e:
            return {"success": False, "error": f"PiAPI exception: {str(e)}"}
    
    async def _try_skyreels_direct(
        self,
        image_url: str,
        prompt: str,
        audio_url: str,
        aspect_ratio: str
    ) -> Dict[str, Any]:
        """Try generating video via direct SkyReels API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "skyreels-v3-standard",
                "mode": "single_avatar",
                "prompt": prompt,
                "reference_image": image_url,
                "aspect_ratio": aspect_ratio
            }
            
            if audio_url:
                payload["audio_url"] = audio_url
                payload["lip_sync"] = True
            
            response = await self.client.post(
                SKYREELS_DIRECT_URL,
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "video_url": result.get("video_url") or result.get("output"),
                    "task_id": result.get("task_id"),
                    "provider": "skyreels",
                    "data": result
                }
            else:
                return {
                    "success": False,
                    "error": f"SkyReels API error: {response.status_code}",
                    "details": response.text
                }
                
        except Exception as e:
            return {"success": False, "error": f"SkyReels exception: {str(e)}"}
    
    async def check_task_status(self, task_id: str, provider: str = "skyreels") -> Dict[str, Any]:
        """Check the status of a video generation task"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}"
            }
            
            if provider == "piapi":
                url = f"{PIAPI_URL}/status/{task_id}"
            else:
                url = f"https://api.skyreels.ai/v1/tasks/{task_id}"
            
            response = await self.client.get(url, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "status": result.get("status"),
                    "video_url": result.get("video_url") or result.get("output"),
                    "progress": result.get("progress", 0),
                    "data": result
                }
            else:
                return {"success": False, "error": f"Status check failed: {response.status_code}"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}


# Singleton instance
_skyreels_service = None

def get_skyreels_service() -> SkyReelsService:
    global _skyreels_service
    if _skyreels_service is None:
        _skyreels_service = SkyReelsService()
    return _skyreels_service


async def generate_property_video(
    property_address: str,
    agent_image_url: str = None,
    agent_name: str = "Your Agent",
    custom_script: str = None
) -> Dict[str, Any]:
    """
    Generate a property introduction video with AI avatar
    
    Args:
        property_address: The property address for the video
        agent_image_url: URL to the agent's headshot
        agent_name: Name of the agent
        custom_script: Custom script for the video (optional)
    
    Returns:
        Dict with video URL or error
    """
    service = get_skyreels_service()
    
    # Generate default prompt if no custom script
    if not custom_script:
        prompt = f"""Professional real estate agent {agent_name} presenting a property. 
        The agent is speaking confidently and warmly, making eye contact with the camera.
        Natural hand gestures, professional attire, friendly smile.
        High quality, professional lighting, corporate video style."""
    else:
        prompt = custom_script
    
    try:
        result = await service.generate_avatar_video(
            image_url=agent_image_url,
            prompt=prompt,
            aspect_ratio="9:16",
            duration=10
        )
        return result
    finally:
        await service.close()
