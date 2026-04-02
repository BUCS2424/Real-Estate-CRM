"""Staff Chat routes — single shared chat room with file upload support."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from datetime import datetime, timezone
import uuid
import mimetypes
from database import db
from utils.auth import get_current_user

router = APIRouter(prefix="/staff-chat", tags=["Staff Chat"])

CHAT_FOLDER = "chats"


async def _get_idrive_client():
    """Reuse the iDrive client setup from media routes."""
    import boto3
    from botocore.config import Config
    provider = await db.storage_providers.find_one({"provider_type": "idrive", "is_default": True})
    if not provider:
        provider = await db.storage_providers.find_one({"provider_type": "idrive"})
    if not provider:
        return None, None, None
    creds = provider.get("credentials", {})
    settings = provider.get("settings", {})
    if not creds.get("access_key") or not creds.get("secret_key"):
        return None, None, None
    endpoint = settings.get("endpoint", "https://v2v7.la.idrivee2-14.com")
    client = boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id=creds["access_key"],
        aws_secret_access_key=creds["secret_key"],
        config=Config(signature_version='s3v4')
    )
    bucket = settings.get("bucket", "")
    return client, bucket, endpoint


@router.get("/messages")
async def get_messages(
    before: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get chat messages, newest first."""
    query = {}
    if before:
        query["created_at"] = {"$lt": before}
    messages = await db.staff_chat.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    for m in messages:
        if "_id" in m:
            if "id" not in m:
                m["id"] = str(m.pop("_id"))
            else:
                m.pop("_id", None)
    messages.reverse()
    return messages


@router.post("/messages")
async def send_message(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send a text message."""
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message text is required")

    now = datetime.now(timezone.utc).isoformat()
    msg = {
        "id": str(uuid.uuid4()),
        "text": text,
        "sender_id": current_user.get("id"),
        "sender_name": current_user.get("name", "Unknown"),
        "sender_role": current_user.get("role", "client"),
        "attachments": [],
        "created_at": now,
    }
    await db.staff_chat.insert_one(msg)
    msg.pop("_id", None)
    return msg


@router.post("/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    message: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file (image/video/doc) and create a chat message with it."""
    client, bucket, endpoint = await _get_idrive_client()
    if not client or not bucket:
        raise HTTPException(status_code=400, detail="iDrive storage not configured. Set up storage in Settings first.")

    content = await file.read()
    max_size = 50 * 1024 * 1024  # 50MB
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Max 50MB.")

    ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    unique_name = f"{str(uuid.uuid4())[:8]}_{file.filename}"
    file_key = f"{CHAT_FOLDER}/{unique_name}"
    content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or 'application/octet-stream'

    try:
        client.put_object(Bucket=bucket, Key=file_key, Body=content, ContentType=content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    file_url = f"{endpoint}/{bucket}/{file_key}"

    image_exts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
    video_exts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v']
    file_type = 'image' if ext in image_exts else 'video' if ext in video_exts else 'document'

    now = datetime.now(timezone.utc).isoformat()
    msg = {
        "id": str(uuid.uuid4()),
        "text": message.strip() or "",
        "sender_id": current_user.get("id"),
        "sender_name": current_user.get("name", "Unknown"),
        "sender_role": current_user.get("role", "client"),
        "attachments": [{
            "id": str(uuid.uuid4()),
            "url": file_url,
            "filename": file.filename,
            "type": file_type,
            "size": len(content),
            "content_type": content_type,
        }],
        "created_at": now,
    }
    await db.staff_chat.insert_one(msg)
    msg.pop("_id", None)
    return msg


@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a message (own messages or admin)."""
    msg = await db.staff_chat.find_one({"id": message_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.get("sender_id") != current_user.get("id") and current_user.get("role") not in ["superuser", "admin"]:
        raise HTTPException(status_code=403, detail="Cannot delete other users' messages")
    await db.staff_chat.delete_one({"id": message_id})
    return {"message": "Deleted"}
