"""
SkyReels Video Generation Routes
API endpoints for generating AI avatar videos
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from database import db
from utils.auth import get_current_user
from models.user import UserRole
from services.skyreels_service import get_skyreels_service, generate_property_video

router = APIRouter()


class VideoGenerationRequest(BaseModel):
    image_url: Optional[str] = None
    prompt: str = "Professional person speaking confidently"
    audio_url: Optional[str] = None
    aspect_ratio: str = "9:16"
    duration: int = 5


class PropertyVideoRequest(BaseModel):
    property_address: str
    agent_image_url: Optional[str] = None
    custom_script: Optional[str] = None


@router.post("/generate")
async def generate_video(
    request: VideoGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate an AI avatar video"""
    service = get_skyreels_service()
    
    try:
        result = await service.generate_avatar_video(
            image_url=request.image_url,
            prompt=request.prompt,
            audio_url=request.audio_url,
            aspect_ratio=request.aspect_ratio,
            duration=request.duration
        )
        
        # Log the generation
        await db.video_generations.insert_one({
            "user_id": current_user["id"],
            "prompt": request.prompt,
            "result": result,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-with-image")
async def generate_video_with_upload(
    image: UploadFile = File(...),
    prompt: str = Form(default="Professional person speaking confidently"),
    aspect_ratio: str = Form(default="9:16"),
    duration: int = Form(default=5),
    current_user: dict = Depends(get_current_user)
):
    """Generate an AI avatar video with uploaded image"""
    service = get_skyreels_service()
    
    try:
        image_bytes = await image.read()
        
        result = await service.generate_avatar_video(
            image_bytes=image_bytes,
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            duration=duration
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await service.close()


@router.post("/property-video")
async def generate_property_video_endpoint(
    request: PropertyVideoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate a property introduction video with AI avatar"""
    try:
        result = await generate_property_video(
            property_address=request.property_address,
            agent_image_url=request.agent_image_url,
            agent_name=current_user.get("name", "Agent"),
            custom_script=request.custom_script
        )
        
        # Log the generation
        await db.video_generations.insert_one({
            "user_id": current_user["id"],
            "type": "property_video",
            "property_address": request.property_address,
            "result": result,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{task_id}")
async def check_video_status(
    task_id: str,
    provider: str = "skyreels",
    current_user: dict = Depends(get_current_user)
):
    """Check the status of a video generation task"""
    service = get_skyreels_service()
    
    try:
        result = await service.check_task_status(task_id, provider)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await service.close()


@router.get("/history")
async def get_video_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get video generation history for current user"""
    videos = await db.video_generations.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    return {"videos": videos}


@router.get("/config")
async def get_skyreels_config(
    current_user: dict = Depends(get_current_user)
):
    """Check if SkyReels is configured"""
    import os
    api_key = os.environ.get('SKYREELS_API_KEY')
    
    return {
        "configured": bool(api_key),
        "key_preview": f"{api_key[:8]}..." if api_key else None
    }
