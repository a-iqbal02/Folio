import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portfolio import AnalyticsCache
from app.services.ai.assistant import stream_chat_response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[dict] = []


@router.post("/chat")
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """Stream AI assistant response based on portfolio analytics."""
    cache = db.query(AnalyticsCache).filter_by(session_id=req.session_id).first()
    if not cache:
        raise HTTPException(status_code=404, detail="Session not found.")

    analytics = json.loads(cache.analytics_json)

    async def generate():
        async for token in stream_chat_response(req.message, req.history, analytics):
            yield token

    return StreamingResponse(generate(), media_type="text/plain")
