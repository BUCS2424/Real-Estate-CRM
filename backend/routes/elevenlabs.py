"""
ElevenLabs AI Routes
Configure and use ElevenLabs for TTS, voice generation, etc.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import httpx

from utils.auth import get_current_user
from models.user import UserRole
from database import db

router = APIRouter(prefix="/elevenlabs", tags=["ElevenLabs AI"])

ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"


class ElevenLabsConfig(BaseModel):
    api_key: str = ""
    enabled: bool = False
    default_voice_id: str = ""
    default_model: str = "eleven_multilingual_v2"
    use_for_tts: bool = True
    use_for_social_media: bool = False


class TestKeyRequest(BaseModel):
    api_key: str


class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    model_id: Optional[str] = None


@router.get("/config")
async def get_elevenlabs_config(current_user: dict = Depends(get_current_user)):
    """Get ElevenLabs configuration"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.settings.find_one({"type": "elevenlabs_config"}, {"_id": 0})
    
    if not config:
        return {
            "api_key": "",
            "enabled": False,
            "default_voice_id": "",
            "default_model": "eleven_multilingual_v2",
            "use_for_tts": True,
            "use_for_social_media": False,
            "configured": False,
            "voices": []
        }
    
    # Mask API key for display (show last 4 chars)
    masked_key = ""
    if config.get("api_key"):
        key = config["api_key"]
        masked_key = "•" * (len(key) - 4) + key[-4:] if len(key) > 4 else key
    
    return {
        "api_key": config.get("api_key", ""),  # Return full key for form
        "enabled": config.get("enabled", False),
        "default_voice_id": config.get("default_voice_id", ""),
        "default_model": config.get("default_model", "eleven_multilingual_v2"),
        "use_for_tts": config.get("use_for_tts", True),
        "use_for_social_media": config.get("use_for_social_media", False),
        "configured": bool(config.get("api_key")),
        "voices": config.get("cached_voices", [])
    }


@router.post("/config")
async def save_elevenlabs_config(config: ElevenLabsConfig, current_user: dict = Depends(get_current_user)):
    """Save ElevenLabs configuration"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config_doc = {
        "type": "elevenlabs_config",
        "api_key": config.api_key,
        "enabled": config.enabled,
        "default_voice_id": config.default_voice_id,
        "default_model": config.default_model,
        "use_for_tts": config.use_for_tts,
        "use_for_social_media": config.use_for_social_media,
        "updated_by": current_user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.settings.update_one(
        {"type": "elevenlabs_config"},
        {"$set": config_doc},
        upsert=True
    )
    
    return {"message": "ElevenLabs configuration saved"}


@router.post("/test")
async def test_elevenlabs_connection(request: TestKeyRequest, current_user: dict = Depends(get_current_user)):
    """Test ElevenLabs API connection"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{ELEVENLABS_API_URL}/voices",
                headers={"xi-api-key": request.api_key}
            )
            
            if response.status_code == 200:
                data = response.json()
                voices = [
                    {
                        "voice_id": v.get("voice_id"),
                        "name": v.get("name"),
                        "category": v.get("category", "custom")
                    }
                    for v in data.get("voices", [])
                ]
                
                # Cache voices in config
                await db.settings.update_one(
                    {"type": "elevenlabs_config"},
                    {"$set": {"cached_voices": voices}},
                    upsert=True
                )
                
                return {"success": True, "message": "Connection successful", "voices": voices}
            elif response.status_code == 401:
                return {"success": False, "error": "Invalid API key"}
            else:
                return {"success": False, "error": f"API error: {response.status_code}"}
                
    except httpx.TimeoutException:
        return {"success": False, "error": "Connection timed out"}
    except Exception as e:
        return {"success": False, "error": f"Connection error: {str(e)}"}


@router.get("/voices")
async def get_voices(current_user: dict = Depends(get_current_user)):
    """Get available ElevenLabs voices"""
    config = await db.settings.find_one({"type": "elevenlabs_config"})
    
    if not config or not config.get("api_key"):
        raise HTTPException(status_code=400, detail="ElevenLabs not configured")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{ELEVENLABS_API_URL}/voices",
                headers={"xi-api-key": config["api_key"]}
            )
            
            if response.status_code == 200:
                data = response.json()
                voices = [
                    {
                        "voice_id": v.get("voice_id"),
                        "name": v.get("name"),
                        "category": v.get("category", "custom"),
                        "preview_url": v.get("preview_url")
                    }
                    for v in data.get("voices", [])
                ]
                
                # Update cache
                await db.settings.update_one(
                    {"type": "elevenlabs_config"},
                    {"$set": {"cached_voices": voices}}
                )
                
                return {"voices": voices}
            else:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch voices")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tts")
async def text_to_speech(request: TTSRequest, current_user: dict = Depends(get_current_user)):
    """Convert text to speech using ElevenLabs"""
    config = await db.settings.find_one({"type": "elevenlabs_config"})
    
    if not config or not config.get("api_key"):
        raise HTTPException(status_code=400, detail="ElevenLabs not configured")
    
    if not config.get("enabled"):
        raise HTTPException(status_code=400, detail="ElevenLabs is disabled")
    
    voice_id = request.voice_id or config.get("default_voice_id")
    model_id = request.model_id or config.get("default_model", "eleven_multilingual_v2")
    
    if not voice_id:
        raise HTTPException(status_code=400, detail="No voice selected")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{ELEVENLABS_API_URL}/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": config["api_key"],
                    "Content-Type": "application/json"
                },
                json={
                    "text": request.text,
                    "model_id": model_id,
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75
                    }
                }
            )
            
            if response.status_code == 200:
                # Return audio data
                # In production, you'd save this to storage and return a URL
                return {
                    "success": True,
                    "message": "Audio generated successfully",
                    "content_type": response.headers.get("content-type", "audio/mpeg")
                }
            else:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                return {
                    "success": False,
                    "error": error_data.get("detail", {}).get("message", f"TTS failed: {response.status_code}")
                }
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/usage")
async def get_usage(current_user: dict = Depends(get_current_user)):
    """Get ElevenLabs usage/subscription info"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.settings.find_one({"type": "elevenlabs_config"})
    
    if not config or not config.get("api_key"):
        raise HTTPException(status_code=400, detail="ElevenLabs not configured")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{ELEVENLABS_API_URL}/user/subscription",
                headers={"xi-api-key": config["api_key"]}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch usage")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
