import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portfolio import Session as DBSession, AnalyticsCache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["portfolio"])


@router.get("/portfolio/{session_id}")
def get_portfolio(session_id: str, db: Session = Depends(get_db)):
    """Retrieve cached analytics for a session."""
    cache = db.query(AnalyticsCache).filter_by(session_id=session_id).first()
    if not cache:
        raise HTTPException(status_code=404, detail="Session not found. It may have expired.")
    return json.loads(cache.analytics_json)


@router.delete("/portfolio/{session_id}")
def delete_portfolio(session_id: str, db: Session = Depends(get_db)):
    """Delete all data for a session."""
    session = db.query(DBSession).filter_by(id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    db.delete(session)
    db.commit()
    return {"deleted": True}
