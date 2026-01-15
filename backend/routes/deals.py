from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, timezone
import uuid
from database import db
from models.deal import DealCreate, DealResponse, StageUpdate
from models.user import UserRole
from utils.auth import get_current_user, require_role

router = APIRouter()

@router.post("", response_model=DealResponse)
async def create_deal(deal: DealCreate, current_user: dict = Depends(get_current_user)):
    deal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    deal_doc = {
        "id": deal_id,
        **deal.model_dump(),
        "created_at": now
    }
    await db.deals.insert_one(deal_doc)
    deal_doc.pop("_id", None)
    return DealResponse(**deal_doc)

@router.get("", response_model=List[DealResponse])
async def get_deals(current_user: dict = Depends(get_current_user)):
    deals = await db.deals.find({}, {"_id": 0}).to_list(1000)
    return [DealResponse(**d) for d in deals]

@router.get("/{deal_id}", response_model=DealResponse)
async def get_deal(deal_id: str, current_user: dict = Depends(get_current_user)):
    deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return DealResponse(**deal)

@router.patch("/{deal_id}/stage", response_model=DealResponse)
async def update_deal_stage(deal_id: str, stage_update: StageUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.deals.update_one({"id": deal_id}, {"$set": {"stage": stage_update.stage}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    updated = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    return DealResponse(**updated)

@router.delete("/{deal_id}")
async def delete_deal(deal_id: str, current_user: dict = Depends(require_role([UserRole.SUPERUSER, UserRole.ADMIN]))):
    result = await db.deals.delete_one({"id": deal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    return {"message": "Deal deleted"}
