from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
import uuid
from database import db
from models.task import TaskCreate, TaskResponse, StatusUpdate
from utils.auth import get_current_user

router = APIRouter()

@router.post("", response_model=TaskResponse)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    task_doc = {
        "id": task_id,
        **task.model_dump(),
        "created_at": now
    }
    await db.tasks.insert_one(task_doc)
    task_doc.pop("_id", None)
    return TaskResponse(**task_doc)

@router.get("", response_model=List[TaskResponse])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    return [TaskResponse(**t) for t in tasks]

@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(task_id: str, status_update: StatusUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.update_one({"id": task_id}, {"$set": {"status": status_update.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return TaskResponse(**updated)

@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}
