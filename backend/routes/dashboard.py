from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from database import db
from utils.auth import get_current_user

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Get counts
    contacts_count = await db.contacts.count_documents({})
    deals_count = await db.deals.count_documents({})
    tasks_count = await db.tasks.count_documents({})
    properties_count = await db.properties.count_documents({})
    
    # Pipeline value
    pipeline = await db.deals.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$value"}}}
    ]).to_list(1)
    pipeline_value = pipeline[0]["total"] if pipeline else 0
    
    # Deals by stage
    stages = await db.deals.aggregate([
        {"$group": {"_id": "$stage", "count": {"$sum": 1}, "value": {"$sum": "$value"}}}
    ]).to_list(10)
    
    # Recent activity
    recent_contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    recent_deals = await db.deals.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    
    # Tasks due today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tasks_due_today = await db.tasks.count_documents({
        "due_date": {"$regex": f"^{today}"},
        "status": {"$ne": "completed"}
    })
    
    # Bookings today
    bookings_today = await db.bookings.count_documents({
        "date": today,
        "status": {"$ne": "cancelled"}
    })
    
    # New leads this week
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_leads_week = await db.leads.count_documents({"created_at": {"$gte": week_ago}})
    
    return {
        "contacts": contacts_count,
        "deals": deals_count,
        "tasks": tasks_count,
        "properties": properties_count,
        "pipeline_value": pipeline_value,
        "stages": stages,
        "recent_contacts": recent_contacts,
        "recent_deals": recent_deals,
        "tasks_due_today": tasks_due_today,
        "bookings_today": bookings_today,
        "new_leads_week": new_leads_week
    }
