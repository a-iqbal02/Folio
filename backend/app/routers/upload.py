import json
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portfolio import Session as DBSession, Holding, AnalyticsCache
from app.services.ingestion.pipeline import run_pipeline, run_text_pipeline, run_manual_pipeline
from app.services.analytics.engine import run_analytics

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["upload"])


class PasteRequest(BaseModel):
    text: str
    age: Optional[int] = None
    goals: Optional[str] = ""


class ManualHolding(BaseModel):
    ticker: str
    shares: Optional[float] = None
    cost_basis: Optional[float] = None
    market_value: Optional[float] = None


class ManualRequest(BaseModel):
    holdings: list[ManualHolding]
    age: Optional[int] = None
    goals: Optional[str] = ""


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    age: Optional[int] = Form(None),
    goals: Optional[str] = Form(""),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 50 MB.")

    try:
        df = await run_pipeline(contents, file.filename, file.content_type or "")
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected pipeline error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while processing your file.")

    return await _save_and_return(df, age, goals or "", file.filename, db)


@router.post("/paste")
async def paste_text(req: PasteRequest, db: Session = Depends(get_db)):
    try:
        df = await run_text_pipeline(req.text)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return await _save_and_return(df, req.age, req.goals or "", "paste", db)


@router.post("/manual")
async def manual_entry(req: ManualRequest, db: Session = Depends(get_db)):
    holdings = [h.model_dump() for h in req.holdings]
    try:
        df = await run_manual_pipeline(holdings)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return await _save_and_return(df, req.age, req.goals or "", "manual", db)


async def _save_and_return(df, age, goals, filename, db):
    session_id = str(uuid.uuid4())
    analytics = run_analytics(df, age, goals)

    db_session = DBSession(
        id=session_id,
        age=age,
        total_value=analytics["summary"]["total_value"],
        filename=filename,
    )
    db.add(db_session)

    for _, row in df.iterrows():
        holding = Holding(
            session_id=session_id,
            ticker=str(row.get("ticker", "")),
            name=row.get("name"),
            shares=row.get("shares"),
            market_value=float(row.get("market_value", 0)),
            weight=float(row.get("weight", 0)),
            cost_basis=row.get("cost_basis"),
            gain_loss=row.get("gain_loss"),
            gain_loss_pct=row.get("gain_loss_pct"),
            asset_class=row.get("asset_class"),
            sector=row.get("sector"),
            industry=row.get("industry"),
            dividend_yield=row.get("dividend_yield"),
            expense_ratio=row.get("expense_ratio"),
            beta=row.get("beta"),
            current_price=row.get("current_price"),
        )
        db.add(holding)

    cache = AnalyticsCache(
        session_id=session_id,
        analytics_json=json.dumps(analytics),
    )
    db.add(cache)
    db.commit()

    return JSONResponse({"session_id": session_id, "analytics": analytics})
