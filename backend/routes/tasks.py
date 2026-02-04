from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone, timedelta
import uuid
from database import db
from models.task import TaskCreate, TaskResponse, StatusUpdate, TaskUpdate
from utils.auth import get_current_user

router = APIRouter()


async def create_task_notification(user_id: str, task: dict, notification_type: str, message: str):
    """Create a notification for a task"""
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "task",
        "title": f"Task: {task.get('title', 'Unknown')}",
        "message": message,
        "read": False,
        "data": {
            "task_id": task.get("id"),
            "notification_type": notification_type
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification


@router.post("", response_model=TaskResponse)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    task_data = task.model_dump()
    if task_data.get("notifications"):
        task_data["notifications"] = task_data["notifications"]
    else:
        task_data["notifications"] = {
            "enabled": True,
            "remind_before_hours": 24,
            "remind_on_due": True,
            "email_notification": False
        }
    
    task_doc = {
        "id": task_id,
        **task_data,
        "created_at": now,
        "updated_at": now
    }
    await db.tasks.insert_one(task_doc)
    task_doc.pop("_id", None)
    
    # Create notification for task creation
    await create_task_notification(
        current_user["id"],
        task_doc,
        "created",
        f"New task created: {task.title}"
    )
    
    # If task has due date and notifications enabled, create reminder notification
    if task.due_date and task_data.get("notifications", {}).get("enabled"):
        remind_hours = task_data.get("notifications", {}).get("remind_before_hours", 24)
        due_dt = datetime.fromisoformat(task.due_date.replace('Z', '+00:00')) if 'T' in task.due_date else datetime.strptime(task.due_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        remind_time = due_dt - timedelta(hours=remind_hours)
        
        # Store reminder info in task for future notification dispatch
        await db.tasks.update_one(
            {"id": task_id},
            {"$set": {"reminder_scheduled": remind_time.isoformat()}}
        )
    
    return TaskResponse(**task_doc)


@router.get("", response_model=List[TaskResponse])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    return [TaskResponse(**t) for t in tasks]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse(**task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task_update: TaskUpdate, current_user: dict = Depends(get_current_user)):
    """Update a task"""
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {k: v for k, v in task_update.model_dump().items() if v is not None}
    
    if "notifications" in update_data and update_data["notifications"]:
        update_data["notifications"] = update_data["notifications"]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    # Create notification for task update
    await create_task_notification(
        current_user["id"],
        {**task, **update_data},
        "updated",
        f"Task updated: {update_data.get('title', task.get('title'))}"
    )
    
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return TaskResponse(**updated)


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(task_id: str, status_update: StatusUpdate, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    old_status = task.get("status")
    new_status = status_update.status
    
    result = await db.tasks.update_one(
        {"id": task_id}, 
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Create notification for status change
    status_labels = {
        "todo": "To Do",
        "in_progress": "In Progress",
        "done": "Done"
    }
    
    if new_status == "done":
        await create_task_notification(
            current_user["id"],
            task,
            "completed",
            f"Task completed: {task.get('title')}"
        )
    else:
        await create_task_notification(
            current_user["id"],
            task,
            "status_changed",
            f"Task '{task.get('title')}' moved to {status_labels.get(new_status, new_status)}"
        )
    
    updated = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return TaskResponse(**updated)


@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Create notification for task deletion
    await create_task_notification(
        current_user["id"],
        task,
        "deleted",
        f"Task deleted: {task.get('title')}"
    )
    
    return {"message": "Task deleted"}


@router.get("/due/today")
async def get_tasks_due_today(current_user: dict = Depends(get_current_user)):
    """Get tasks due today"""
    today = datetime.now(timezone.utc).date().isoformat()
    tasks = await db.tasks.find(
        {"due_date": {"$regex": f"^{today}"}},
        {"_id": 0}
    ).to_list(100)
    return tasks


@router.get("/due/upcoming")
async def get_upcoming_tasks(days: int = 7, current_user: dict = Depends(get_current_user)):
    """Get tasks due in the next X days"""
    today = datetime.now(timezone.utc).date()
    end_date = today + timedelta(days=days)
    
    tasks = await db.tasks.find(
        {
            "due_date": {
                "$gte": today.isoformat(),
                "$lte": end_date.isoformat()
            },
            "status": {"$ne": "done"}
        },
        {"_id": 0}
    ).to_list(100)
    return tasks
