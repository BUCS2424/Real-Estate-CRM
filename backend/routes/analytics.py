"""Analytics routes for email open/click tracking and landing page session tracking."""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse, Response
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import base64
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl

from database import db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


class SessionStartRequest(BaseModel):
    tracking_id: str
    landing_slug: Optional[str] = None
    landing_url: Optional[str] = None
    user_agent: Optional[str] = None


class SessionEndRequest(BaseModel):
    session_id: str
    duration_seconds: Optional[int] = None


TRACKING_PIXEL_BYTES = base64.b64decode(
    "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
)


@router.get("/email/open/{tracking_id}")
async def track_email_open(tracking_id: str, request: Request):
    now = datetime.now(timezone.utc).isoformat()
    await db.email_tracking.update_one(
        {"id": tracking_id},
        {
            "$set": {"last_opened_at": now},
            "$inc": {"open_count": 1},
            "$setOnInsert": {"created_at": now}
        },
        upsert=True
    )

    return Response(content=TRACKING_PIXEL_BYTES, media_type="image/gif")


@router.get("/email/click/{tracking_id}")
async def track_email_click(tracking_id: str, redirect: str):
    if not redirect:
        raise HTTPException(status_code=400, detail="Missing redirect URL")

    now = datetime.now(timezone.utc).isoformat()
    await db.email_tracking.update_one(
        {"id": tracking_id},
        {
            "$set": {"last_clicked_at": now},
            "$inc": {"click_count": 1},
            "$setOnInsert": {"created_at": now}
        },
        upsert=True
    )

    # Append tracking_id to redirect URL for fallback
    parsed = urlparse(redirect)
    query = dict(parse_qsl(parsed.query))
    query.setdefault("tracking_id", tracking_id)
    new_query = urlencode(query)
    redirect_url = urlunparse(parsed._replace(query=new_query))

    response = RedirectResponse(url=redirect_url, status_code=302)
    response.set_cookie(
        key="mls_tracking_id",
        value=tracking_id,
        max_age=60 * 60 * 24 * 14,
        httponly=False,
        samesite="lax"
    )
    return response


@router.post("/session/start")
async def start_session(request: SessionStartRequest):
    now = datetime.now(timezone.utc).isoformat()
    session_id = str(uuid.uuid4())

    await db.email_sessions.insert_one({
        "id": session_id,
        "tracking_id": request.tracking_id,
        "landing_slug": request.landing_slug,
        "landing_url": request.landing_url,
        "user_agent": request.user_agent,
        "started_at": now,
        "last_activity_at": now,
        "ended_at": None,
        "duration_seconds": None
    })

    return {"session_id": session_id}


@router.post("/session/end")
async def end_session(request: SessionEndRequest):
    now = datetime.now(timezone.utc).isoformat()

    await db.email_sessions.update_one(
        {"id": request.session_id},
        {
            "$set": {
                "ended_at": now,
                "duration_seconds": request.duration_seconds
            }
        }
    )

    return {"message": "Session closed"}
