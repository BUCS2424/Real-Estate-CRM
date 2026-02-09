"""
SkyReels Video Generation Routes
API endpoints for generating AI avatar videos via APIFree.ai
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from database import db
from utils.auth import get_current_user
from services.skyreels_service import get_skyreels_service, generate_property_video

router = APIRouter()


class VideoGenerationRequest(BaseModel):
    image_url: Optional[str] = None
    prompt: str = "Professional person speaking confidently to the camera"
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
    """Generate an AI avatar video using APIFree.ai SkyReels V3"""
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
            "image_url": request.image_url,
            "request_id": result.get("request_id"),
            "result": result,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-with-image")
async def generate_video_with_upload(
    image: UploadFile = File(...),
    prompt: str = Form(default="Professional person speaking confidently to the camera"),
    aspect_ratio: str = Form(default="9:16"),
    duration: int = Form(default=5),
    current_user: dict = Depends(get_current_user)
):
    """
    Generate an AI avatar video with uploaded image.
    Note: For APIFree.ai, we need a publicly accessible image URL.
    Consider uploading to media library first.
    """
    # For now, return an error since APIFree requires a URL
    return {
        "success": False,
        "error": "Please upload your image to the Media Library first, then use the image URL",
        "message": "APIFree.ai requires a publicly accessible image URL. Upload your image to the Media Library and use the resulting URL."
    }


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
            "request_id": result.get("request_id"),
            "result": result,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{request_id}")
async def check_video_status(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check the status of a video generation task"""
    service = get_skyreels_service()
    
    try:
        result = await service.check_task_status(request_id)
        
        # Update the record if we have a video URL
        if result.get("video_url"):
            await db.video_generations.update_one(
                {"request_id": request_id},
                {"$set": {
                    "video_url": result.get("video_url"),
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/result/{request_id}")
async def get_video_result(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get the final video result after generation is complete"""
    service = get_skyreels_service()
    
    try:
        result = await service.get_video_result(request_id)
        
        # Update the record with the video URL
        if result.get("success") and result.get("video_url"):
            await db.video_generations.update_one(
                {"request_id": request_id},
                {"$set": {
                    "video_url": result.get("video_url"),
                    "video_list": result.get("video_list"),
                    "usage": result.get("usage"),
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        "key_preview": f"{api_key[:8]}..." if api_key else None,
        "provider": "APIFree.ai",
        "model": "skywork-ai/skyreels-v3/pro/single-avatar",
        "features": [
            "Image-to-Video (Avatar)",
            "Audio-driven lip sync",
            "Custom prompts"
        ],
        "requirements": {
            "image": "Publicly accessible URL (upload to Media Library first)",
            "audio": "Optional - uses default if not provided"
        }
    }
