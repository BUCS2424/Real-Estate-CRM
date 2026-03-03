"""
SkyReels V3 Video Generation Service
Generates AI avatar videos using SkyReels API via APIFree.ai
"""
import os
import httpx
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime

SKYREELS_API_KEY = os.environ.get('SKYREELS_API_KEY')

# APIFree.ai endpoints
APIFREE_BASE_URL = "https://api.apifree.ai"
APIFREE_SUBMIT_URL = f"{APIFREE_BASE_URL}/v1/video/submit"


class SkyReelsService:
    """Service for generating AI avatar videos using SkyReels via APIFree.ai"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or SKYREELS_API_KEY
    
    async def generate_avatar_video(
        self,
        image_url: str = None,
        image_bytes: bytes = None,
        prompt: str = "Professional real estate agent speaking confidently to the camera",
        audio_url: str = None,
        audio_bytes: bytes = None,
        style: str = "skyreels-i2v",
        aspect_ratio: str = "9:16",
        duration: int = 5
    ) -> Dict[str, Any]:
        """
        Generate an avatar video from an image using APIFree.ai SkyReels V3
        
        Args:
            image_url: URL to the avatar image (first frame)
            prompt: Description of the video to generate
            audio_url: URL to audio file for lip-sync (optional)
            aspect_ratio: Output aspect ratio (9:16, 16:9, 1:1)
        
        Returns:
            Dict with request_id for status polling or error
        """
        if not self.api_key:
            return {"success": False, "error": "SkyReels API key not configured"}
        
        if not image_url:
            return {"success": False, "error": "Image URL is required for video generation"}
        
        return await self._submit_apifree_video(image_url, prompt, audio_url)
    
    async def _submit_apifree_video(
        self,
        image_url: str,
        prompt: str,
        audio_url: str = None
    ) -> Dict[str, Any]:
        """Submit video generation request to APIFree.ai"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                # Use default audio if none provided
                if not audio_url:
                    audio_url = "https://static.apifree.ai/static/a/20260128/skyreels-v3-standard-single-avatar-audio.mp3"
                
                payload = {
                    "model": "skywork-ai/skyreels-v3/standard/single-avatar",
                    "first_frame_image": image_url,
                    "audios": [audio_url],
                    "prompt": prompt
                }
                
                response = await client.post(
                    APIFREE_SUBMIT_URL,
                    headers=headers,
                    json=payload
                )
                
                result = response.json()
                
                if response.status_code == 200 and result.get("code") == 200:
                    request_id = result.get("resp_data", {}).get("request_id")
                    return {
                        "success": True,
                        "request_id": request_id,
                        "task_id": request_id,  # Alias for frontend compatibility
                        "status": "processing",
                        "provider": "apifree",
                        "message": "Video generation started. Poll status endpoint for progress.",
                        "data": result
                    }
                else:
                    error_msg = result.get("code_msg") or result.get("error", {}).get("message", "Unknown error")
                    return {
                        "success": False,
                        "error": f"APIFree error: {error_msg}",
                        "details": result
                    }
                
        except Exception as e:
            return {"success": False, "error": f"APIFree exception: {str(e)}"}
    
    async def check_task_status(self, request_id: str, provider: str = "apifree") -> Dict[str, Any]:
        """Check the status of a video generation task"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.api_key}"
                }
                
                status_url = f"{APIFREE_BASE_URL}/v1/video/{request_id}/status"
                
                response = await client.get(status_url, headers=headers)
                result = response.json()
                
                if response.status_code == 200 and result.get("code") == 200:
                    resp_data = result.get("resp_data", {})
                    status = resp_data.get("status")
                    
                    # If success, get the video result
                    video_url = None
                    if status == "success":
                        video_result = await self._get_video_result(request_id)
                        if video_result.get("success"):
                            video_url = video_result.get("video_url")
                    
                    return {
                        "success": True,
                        "request_id": request_id,
                        "status": status,
                        "video_url": video_url,
                        "time_info": resp_data.get("time"),
                        "data": result
                    }
                else:
                    error_msg = result.get("code_msg", "Status check failed")
                    return {
                        "success": False,
                        "error": error_msg,
                        "details": result
                    }
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _get_video_result(self, request_id: str) -> Dict[str, Any]:
        """Get the video result after generation is complete"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {
                    "Authorization": f"Bearer {self.api_key}"
                }
                
                result_url = f"{APIFREE_BASE_URL}/v1/video/{request_id}/result"
                
                response = await client.get(result_url, headers=headers)
                result = response.json()
                
                if response.status_code == 200 and result.get("code") == 200:
                    resp_data = result.get("resp_data", {})
                    video_list = resp_data.get("video_list", [])
                    video_url = video_list[0] if video_list else None
                    
                    return {
                        "success": True,
                        "video_url": video_url,
                        "video_list": video_list,
                        "usage": resp_data.get("usage"),
                        "data": result
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get("code_msg", "Failed to get result")
                    }
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_video_result(self, request_id: str) -> Dict[str, Any]:
        """Public method to get video result"""
        return await self._get_video_result(request_id)


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
        Dict with request_id or error
    """
    service = get_skyreels_service()
    
    # Generate default prompt if no custom script
    if not custom_script:
        prompt = f"""Professional real estate agent {agent_name} presenting the property at {property_address}.
        The agent is speaking confidently and warmly, making eye contact with the camera.
        Natural hand gestures, professional attire, friendly smile."""
    else:
        prompt = custom_script
    
    result = await service.generate_avatar_video(
        image_url=agent_image_url,
        prompt=prompt
    )
    return result
