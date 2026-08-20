import os
import uuid
import shutil
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from database import db, MONGO_URL, DB_NAME
from models.user import UserRole
from utils.auth import require_role

router = APIRouter()

BACKUP_DIR = "/app/backend/backups"
os.makedirs(BACKUP_DIR, exist_ok=True)


@router.get("/backup/list")
async def list_backups(current_user: dict = Depends(require_role([UserRole.SUPERUSER]))):
    backups = await db.db_backups.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return backups


@router.post("/backup/create")
async def create_backup(current_user: dict = Depends(require_role([UserRole.SUPERUSER]))):
    backup_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    timestamp_label = now.strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"backup_{timestamp_label}.zip"
    dump_dir = os.path.join(BACKUP_DIR, f"_dump_{backup_id}")
    zip_path_no_ext = os.path.join(BACKUP_DIR, backup_id)
    final_zip_path = f"{zip_path_no_ext}.zip"

    proc = await asyncio.create_subprocess_exec(
        "mongodump",
        f"--uri={MONGO_URL}",
        f"--db={DB_NAME}",
        f"--out={dump_dir}",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        shutil.rmtree(dump_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"mongodump failed: {stderr.decode()[:500]}")

    # Zip the dumped collection files (dump_dir/<DB_NAME>/*.bson + *.metadata.json)
    db_dump_path = os.path.join(dump_dir, DB_NAME)
    shutil.make_archive(zip_path_no_ext, "zip", db_dump_path)
    shutil.rmtree(dump_dir, ignore_errors=True)

    size_bytes = os.path.getsize(final_zip_path)
    collections = await db.list_collection_names()

    backup_doc = {
        "id": backup_id,
        "filename": filename,
        "size_bytes": size_bytes,
        "collection_count": len(collections),
        "status": "completed",
        "created_at": now.isoformat(),
        "created_by": current_user.get("name", current_user.get("email")),
    }
    await db.db_backups.insert_one(backup_doc)
    backup_doc.pop("_id", None)
    return backup_doc


@router.get("/backup/{backup_id}/download")
async def download_backup(backup_id: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER]))):
    backup = await db.db_backups.find_one({"id": backup_id})
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    zip_path = os.path.join(BACKUP_DIR, f"{backup_id}.zip")
    if not os.path.exists(zip_path):
        raise HTTPException(status_code=404, detail="Backup file missing on disk")
    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=backup["filename"],
    )


@router.delete("/backup/{backup_id}")
async def delete_backup(backup_id: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER]))):
    backup = await db.db_backups.find_one({"id": backup_id})
    if not backup:
        raise HTTPException(status_code=404, detail="Backup not found")
    zip_path = os.path.join(BACKUP_DIR, f"{backup_id}.zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)
    await db.db_backups.delete_one({"id": backup_id})
    return {"message": "Backup deleted"}
