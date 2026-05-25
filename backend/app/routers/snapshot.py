import json
import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portfolio import AnalyticsCache
from app.utils.snapshot import generate_snapshot_pdf
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["snapshot"])


@router.get("/snapshot/{session_id}")
def download_snapshot(session_id: str, request: Request, db: Session = Depends(get_db)):
    """Generate and return a PDF portfolio snapshot."""
    cache = db.query(AnalyticsCache).filter_by(session_id=session_id).first()
    if not cache:
        raise HTTPException(status_code=404, detail="Session not found.")

    analytics = json.loads(cache.analytics_json)

    # Share URL must point at the FRONTEND (Vercel), not the backend.
    frontend = settings.frontend_url.rstrip("/")
    share_url = f"{frontend}/dashboard/{session_id}"

    try:
        pdf_bytes = generate_snapshot_pdf(analytics, session_id, share_url)
    except Exception as e:
        logger.exception(f"PDF generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF snapshot.")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="portfoliolens-{session_id[:8]}.pdf"'
        },
    )


@router.get("/share/{session_id}")
def get_share_info(session_id: str, db: Session = Depends(get_db)):
    """Return share metadata for a session."""
    cache = db.query(AnalyticsCache).filter_by(session_id=session_id).first()
    if not cache:
        raise HTTPException(status_code=404, detail="Session not found.")

    analytics = json.loads(cache.analytics_json)
    summary = analytics.get("summary", {})

    return {
        "session_id": session_id,
        "total_value": summary.get("total_value"),
        "total_holdings": summary.get("total_holdings"),
        "risk_label": analytics.get("risk_score", {}).get("label"),
        "diversification_label": analytics.get("diversification_score", {}).get("label"),
    }
