from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
import mimetypes
import boto3
from botocore.config import Config
from database import db
from models.user import UserRole
from utils.auth import get_current_user

router = APIRouter()

# Default subfolders for each property
DEFAULT_SUBFOLDERS = ["gallery", "videos", "documents"]

async def get_idrive_client():
    """Get configured iDrive S3 client if available"""
    from models.storage import StorageProviderType
    
    provider = await db.storage_providers.find_one({
        "provider_type": StorageProviderType.IDRIVE,
        "is_active": True
    })
    
    if not provider or not provider.get("credentials"):
        return None, None, None
    
    creds = provider["credentials"]
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

def get_file_type(filename: str) -> str:
    """Determine file type from extension"""
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    
    image_exts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
    video_exts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v']
    doc_exts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv']
    
    if ext in image_exts:
        return 'image'
    elif ext in video_exts:
        return 'video'
    elif ext in doc_exts:
        return 'document'
    else:
        return 'other'

def format_size(size_bytes: int) -> str:
    """Format bytes to human readable size"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"

async def create_default_subfolders(storage_folder: str, client, bucket: str):
    """Create default subfolders for a property"""
    if not client or not bucket:
        return
    
    for subfolder in DEFAULT_SUBFOLDERS:
        try:
            placeholder_key = f"{storage_folder}/{subfolder}/.folder"
            client.put_object(
                Bucket=bucket,
                Key=placeholder_key,
                Body=b'',
                ContentType='application/x-directory'
            )
        except Exception as e:
            print(f"Warning: Could not create subfolder {subfolder}: {e}")

# ============ FOLDER LISTING ============

@router.get("/folders")
async def get_all_property_folders(current_user: dict = Depends(get_current_user)):
    """Get all property folders for the media library sidebar"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all properties with storage folders
    properties = await db.properties.find(
        {"storage_folder": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "address": 1, "city": 1, "state": 1, "storage_folder": 1}
    ).to_list(1000)
    
    folders = []
    for prop in properties:
        folders.append({
            "id": prop["id"],
            "name": f"{prop.get('address', 'Property')}",
            "location": f"{prop.get('city', '')}, {prop.get('state', '')}",
            "path": prop.get("storage_folder", ""),
            "subfolders": DEFAULT_SUBFOLDERS + await get_custom_subfolders(prop.get("storage_folder", ""))
        })
    
    return folders

async def get_custom_subfolders(storage_folder: str) -> List[str]:
    """Get custom subfolders created by user (stored in DB)"""
    custom = await db.media_folders.find(
        {"parent_path": storage_folder},
        {"_id": 0, "name": 1}
    ).to_list(100)
    return [f["name"] for f in custom]

@router.get("/folders/{property_id}")
async def get_property_folder_contents(
    property_id: str,
    subfolder: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get contents of a property folder or subfolder"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get property
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop or not prop.get("storage_folder"):
        raise HTTPException(status_code=404, detail="Property folder not found")
    
    storage_folder = prop["storage_folder"]
    target_path = f"{storage_folder}/{subfolder}" if subfolder else storage_folder
    
    client, bucket, endpoint = await get_idrive_client()
    if not client or not bucket:
        # Return empty if iDrive not configured
        return {"files": [], "subfolders": DEFAULT_SUBFOLDERS if not subfolder else []}
    
    try:
        # List objects in the folder
        response = client.list_objects_v2(
            Bucket=bucket,
            Prefix=f"{target_path}/",
            Delimiter='/'
        )
        
        files = []
        subfolders = []
        
        # Get subfolders
        if 'CommonPrefixes' in response:
            for prefix in response['CommonPrefixes']:
                folder_name = prefix['Prefix'].rstrip('/').split('/')[-1]
                if folder_name and folder_name != '.folder':
                    subfolders.append(folder_name)
        
        # Get files
        if 'Contents' in response:
            for obj in response['Contents']:
                key = obj['Key']
                filename = key.split('/')[-1]
                
                # Skip folder placeholders
                if filename == '.folder' or not filename:
                    continue
                
                file_type = get_file_type(filename)
                file_url = f"{endpoint}/{bucket}/{key}"
                
                files.append({
                    "id": key,
                    "name": filename,
                    "path": key,
                    "url": file_url,
                    "type": file_type,
                    "size": obj.get('Size', 0),
                    "size_formatted": format_size(obj.get('Size', 0)),
                    "last_modified": obj.get('LastModified').isoformat() if obj.get('LastModified') else None
                })
        
        # If at root level and no subfolders found, return defaults
        if not subfolder and not subfolders:
            subfolders = DEFAULT_SUBFOLDERS
        
        return {
            "property_id": property_id,
            "current_path": target_path,
            "files": files,
            "subfolders": subfolders
        }
        
    except Exception as e:
        print(f"Error listing folder: {e}")
        return {"files": [], "subfolders": DEFAULT_SUBFOLDERS if not subfolder else []}

# ============ FILE OPERATIONS ============

@router.post("/upload/{property_id}")
async def upload_file(
    property_id: str,
    file: UploadFile = File(...),
    subfolder: str = Form("gallery"),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file to a property's folder"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get property
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop or not prop.get("storage_folder"):
        raise HTTPException(status_code=404, detail="Property folder not found")
    
    client, bucket, endpoint = await get_idrive_client()
    if not client or not bucket:
        raise HTTPException(status_code=400, detail="iDrive storage not configured")
    
    storage_folder = prop["storage_folder"]
    
    # Generate unique filename to avoid conflicts
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
    unique_name = f"{str(uuid.uuid4())[:8]}_{file.filename}"
    file_key = f"{storage_folder}/{subfolder}/{unique_name}"
    
    try:
        content = await file.read()
        content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or 'application/octet-stream'
        
        client.put_object(
            Bucket=bucket,
            Key=file_key,
            Body=content,
            ContentType=content_type
        )
        
        file_url = f"{endpoint}/{bucket}/{file_key}"
        file_type = get_file_type(file.filename)
        
        return {
            "message": "File uploaded successfully",
            "file": {
                "id": file_key,
                "name": unique_name,
                "path": file_key,
                "url": file_url,
                "type": file_type,
                "size": len(content),
                "size_formatted": format_size(len(content))
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.delete("/file")
async def delete_file(
    file_path: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a file from storage"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    client, bucket, endpoint = await get_idrive_client()
    if not client or not bucket:
        raise HTTPException(status_code=400, detail="iDrive storage not configured")
    
    try:
        client.delete_object(Bucket=bucket, Key=file_path)
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@router.put("/file/rename")
async def rename_file(
    file_path: str,
    new_name: str,
    current_user: dict = Depends(get_current_user)
):
    """Rename a file (copy to new name, delete old)"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    client, bucket, endpoint = await get_idrive_client()
    if not client or not bucket:
        raise HTTPException(status_code=400, detail="iDrive storage not configured")
    
    try:
        # Get the folder path
        folder_path = '/'.join(file_path.split('/')[:-1])
        new_key = f"{folder_path}/{new_name}"
        
        # Copy to new name
        client.copy_object(
            Bucket=bucket,
            CopySource=f"{bucket}/{file_path}",
            Key=new_key
        )
        
        # Delete old file
        client.delete_object(Bucket=bucket, Key=file_path)
        
        new_url = f"{endpoint}/{bucket}/{new_key}"
        
        return {
            "message": "File renamed successfully",
            "new_path": new_key,
            "new_url": new_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rename failed: {str(e)}")

# ============ FOLDER OPERATIONS ============

@router.post("/folder/create")
async def create_folder(
    property_id: str,
    folder_name: str,
    parent_subfolder: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Create a custom folder within a property"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get property
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop or not prop.get("storage_folder"):
        raise HTTPException(status_code=404, detail="Property folder not found")
    
    client, bucket, endpoint = await get_idrive_client()
    if not client or not bucket:
        raise HTTPException(status_code=400, detail="iDrive storage not configured")
    
    storage_folder = prop["storage_folder"]
    
    # Build folder path
    if parent_subfolder:
        folder_path = f"{storage_folder}/{parent_subfolder}/{folder_name}"
    else:
        folder_path = f"{storage_folder}/{folder_name}"
    
    try:
        # Create folder placeholder
        client.put_object(
            Bucket=bucket,
            Key=f"{folder_path}/.folder",
            Body=b'',
            ContentType='application/x-directory'
        )
        
        # Store custom folder in DB for quick retrieval
        await db.media_folders.insert_one({
            "id": str(uuid.uuid4()),
            "property_id": property_id,
            "name": folder_name,
            "parent_path": storage_folder if not parent_subfolder else f"{storage_folder}/{parent_subfolder}",
            "full_path": folder_path,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"message": "Folder created successfully", "path": folder_path}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create folder: {str(e)}")

@router.delete("/folder")
async def delete_folder(
    folder_path: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a folder and all its contents"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    client, bucket, endpoint = await get_idrive_client()
    if not client or not bucket:
        raise HTTPException(status_code=400, detail="iDrive storage not configured")
    
    try:
        # List all objects in folder
        response = client.list_objects_v2(Bucket=bucket, Prefix=f"{folder_path}/")
        
        if 'Contents' in response:
            objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
            if objects_to_delete:
                client.delete_objects(Bucket=bucket, Delete={'Objects': objects_to_delete})
        
        # Remove from DB
        await db.media_folders.delete_one({"full_path": folder_path})
        
        return {"message": "Folder deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete folder: {str(e)}")

# ============ INITIALIZE DEFAULT FOLDERS ============

@router.post("/initialize/{property_id}")
async def initialize_property_folders(
    property_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Initialize default folders (gallery, videos, documents) for a property"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    prop = await db.properties.find_one({"id": property_id}, {"_id": 0})
    if not prop or not prop.get("storage_folder"):
        raise HTTPException(status_code=404, detail="Property folder not found")
    
    client, bucket, endpoint = await get_idrive_client()
    if not client or not bucket:
        raise HTTPException(status_code=400, detail="iDrive storage not configured")
    
    await create_default_subfolders(prop["storage_folder"], client, bucket)
    
    return {"message": "Default folders initialized", "folders": DEFAULT_SUBFOLDERS}
