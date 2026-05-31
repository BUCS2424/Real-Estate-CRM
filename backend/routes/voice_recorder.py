"""
Voice Recorder Routes
- Upload audio recordings from browser MediaRecorder API
- Transcribe with OpenAI Whisper (via emergentintegrations)
- Summarize with Claude Sonnet (via emergentintegrations)
- Store recordings and metadata in MongoDB
"""
import os
import uuid
import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from database import db
from utils.auth import get_current_user

router = APIRouter()

RECORDINGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "recordings")
os.makedirs(RECORDINGS_DIR, exist_ok=True)

CATEGORIES = ["Client Meeting", "Property Notes", "Personal Note", "Follow-Up", "Market Update", "Other"]

# ── Helpers ───────────────────────────────────────────────────────────────────

def _recording_path(recording_id: str, ext: str = "webm") -> str:
    return os.path.join(RECORDINGS_DIR, f"{recording_id}.{ext}")


async def _transcribe(audio_path: str) -> str:
    """Transcribe an audio file using OpenAI Whisper."""
    from emergentintegrations.llm.openai import OpenAISpeechToText
    from dotenv import load_dotenv
    load_dotenv()

    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise ValueError("EMERGENT_LLM_KEY not configured")

    stt = OpenAISpeechToText(api_key=api_key)
    with open(audio_path, "rb") as f:
        response = await stt.transcribe(
            file=f,
            model="whisper-1",
            response_format="json",
            language="en",
            prompt=(
                "This is a real estate professional's voice note. "
                "It may include client names, property addresses, pricing, and meeting details."
            ),
        )
    return response.text or ""


async def _summarize(transcript: str, category: str, title: str) -> dict:
    """Summarize a transcript using Claude Sonnet."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    from dotenv import load_dotenv
    load_dotenv()

    api_key = os.getenv("EMERGENT_LLM_KEY")
    if not api_key:
        raise ValueError("EMERGENT_LLM_KEY not configured")

    chat = LlmChat(
        api_key=api_key,
        session_id=f"voice-summary-{uuid.uuid4()}",
        system_message=(
            "You are an expert assistant for Hidden Haven Realty, helping real estate agent "
            "Sheila Desautels. You create structured summaries from voice recordings. "
            "Always respond with valid JSON only — no markdown, no explanation."
        ),
    ).with_model("anthropic", "claude-sonnet-4-6")

    prompt = f"""Analyze this real estate voice recording transcript and return a JSON object with:
- "summary": A 2-4 sentence executive summary
- "key_points": Array of 3-6 key points (strings)
- "action_items": Array of specific follow-up tasks or next steps (strings, may be empty)
- "people_mentioned": Array of names/parties mentioned (strings, may be empty)
- "properties_mentioned": Array of property addresses or descriptions mentioned (strings, may be empty)
- "sentiment": "positive", "neutral", or "needs_attention"
- "topics": Array of 2-5 topic tags

Category: {category}
Title: {title}

Transcript:
{transcript[:4000]}

Respond with ONLY the JSON object."""

    response = await chat.send_message(UserMessage(text=prompt))
    try:
        # Strip any accidental markdown fences
        clean = response.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(clean)
    except Exception:
        # Fallback if JSON parse fails
        return {
            "summary": response[:500],
            "key_points": [],
            "action_items": [],
            "people_mentioned": [],
            "properties_mentioned": [],
            "sentiment": "neutral",
            "topics": [category],
        }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/save")
async def save_recording(
    audio: UploadFile = File(...),
    title: str = Form("Voice Note"),
    category: str = Form("Personal Note"),
    duration_seconds: int = Form(0),
    auto_process: bool = Form(True),
    current_user: dict = Depends(get_current_user),
):
    """Upload audio, save to disk, optionally transcribe + summarize."""
    recording_id = str(uuid.uuid4())

    # Determine extension from content type
    ct = audio.content_type or "audio/webm"
    ext_map = {
        "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3",
        "audio/mp4": "mp4", "audio/wav": "wav", "audio/m4a": "m4a",
        "audio/x-m4a": "m4a",
    }
    ext = ext_map.get(ct, "webm")
    audio_path = _recording_path(recording_id, ext)

    content = await audio.read()
    with open(audio_path, "wb") as f:
        f.write(content)

    doc = {
        "id": recording_id,
        "title": title or "Voice Note",
        "category": category if category in CATEGORIES else "Other",
        "duration_seconds": duration_seconds,
        "file_path": audio_path,
        "file_ext": ext,
        "file_size_kb": round(len(content) / 1024, 1),
        "transcript": None,
        "summary": None,
        "processing_status": "saved",
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.voice_recordings.insert_one(doc)

    if auto_process and len(content) > 1000:
        # Kick off background transcription + summarization
        import asyncio
        asyncio.create_task(_process_recording(recording_id, audio_path, title, category))

    doc.pop("_id", None)
    return {**doc, "processing": auto_process, "audio_url": f"/api/static/recordings/{recording_id}.{ext}"}


async def _process_recording(recording_id: str, audio_path: str, title: str, category: str):
    """Background task: transcribe then summarize."""
    try:
        await db.voice_recordings.update_one(
            {"id": recording_id}, {"$set": {"processing_status": "transcribing"}}
        )
        transcript = await _transcribe(audio_path)
        await db.voice_recordings.update_one(
            {"id": recording_id},
            {"$set": {"transcript": transcript, "processing_status": "summarizing"}},
        )

        if transcript.strip():
            ai_summary = await _summarize(transcript, category, title)
            await db.voice_recordings.update_one(
                {"id": recording_id},
                {"$set": {
                    "summary": ai_summary,
                    "processing_status": "complete",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
        else:
            await db.voice_recordings.update_one(
                {"id": recording_id}, {"$set": {"processing_status": "no_speech_detected"}}
            )
    except Exception as e:
        print(f"[Voice] Processing error for {recording_id}: {e}")
        await db.voice_recordings.update_one(
            {"id": recording_id}, {"$set": {"processing_status": "error", "error": str(e)}}
        )


@router.post("/{recording_id}/reprocess")
async def reprocess_recording(recording_id: str, current_user: dict = Depends(get_current_user)):
    """Re-run transcription + summarization on an existing recording."""
    rec = await db.voice_recordings.find_one({"id": recording_id}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="Recording not found")

    audio_path = rec.get("file_path")
    if not audio_path or not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found on disk")

    import asyncio
    asyncio.create_task(_process_recording(recording_id, audio_path, rec["title"], rec["category"]))
    return {"message": "Reprocessing started"}


@router.get("")
async def list_recordings(
    category: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    query = {"created_by": current_user["id"]}
    if category:
        query["category"] = category

    recordings = await db.voice_recordings.find(query, {"_id": 0, "file_path": 0}) \
        .sort("created_at", -1).limit(limit).to_list(limit)

    # Inject audio URL
    API_BASE = os.environ.get("SITE_URL", "")
    for r in recordings:
        ext = r.get("file_ext", "webm")
        r["audio_url"] = f"/api/static/recordings/{r['id']}.{ext}"
    return recordings


@router.get("/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    return {"categories": CATEGORIES}


@router.get("/{recording_id}")
async def get_recording(recording_id: str, current_user: dict = Depends(get_current_user)):
    rec = await db.voice_recordings.find_one(
        {"id": recording_id, "created_by": current_user["id"]}, {"_id": 0, "file_path": 0}
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recording not found")
    ext = rec.get("file_ext", "webm")
    rec["audio_url"] = f"/api/static/recordings/{rec['id']}.{ext}"
    return rec


@router.patch("/{recording_id}")
async def update_recording(
    recording_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    allowed = {"title", "category"}
    update = {k: v for k, v in payload.items() if k in allowed}
    if not update:
        return {"message": "Nothing to update"}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.voice_recordings.update_one({"id": recording_id, "created_by": current_user["id"]}, {"$set": update})
    return {"message": "Updated"}


@router.delete("/{recording_id}")
async def delete_recording(recording_id: str, current_user: dict = Depends(get_current_user)):
    rec = await db.voice_recordings.find_one(
        {"id": recording_id, "created_by": current_user["id"]}, {"_id": 0}
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")

    # Delete file
    audio_path = rec.get("file_path")
    if audio_path and os.path.exists(audio_path):
        os.remove(audio_path)

    await db.voice_recordings.delete_one({"id": recording_id})
    return {"message": "Deleted"}
