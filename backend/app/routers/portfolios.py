import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portfolio import Session as DBSession, AnalyticsCache
from app.models.portfolio_account import (
    Portfolio,
    PortfolioHolding,
    PortfolioAnalyticsCache,
    Transaction,
)
from app.models.user import User
from app.services.auth.dependencies import get_current_user
from app.services.ingestion.pipeline import run_pipeline
from app.services.analytics.engine import run_analytics

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/portfolios", tags=["portfolios"])


class ClaimRequest(BaseModel):
    session_id: str
    name: Optional[str] = None


class RenameRequest(BaseModel):
    name: str


class PortfolioSummary(BaseModel):
    id: str
    name: str
    total_value: Optional[float] = None
    filename: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


def _get_owned_portfolio(portfolio_id: str, user: User, db: Session) -> Portfolio:
    portfolio = db.get(Portfolio, portfolio_id)
    if portfolio is None or portfolio.user_id != user.id:
        raise HTTPException(status_code=404, detail="Portfolio not found.")
    return portfolio


@router.post("/claim", status_code=201)
def claim_session(req: ClaimRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Copy an anonymous guest session's data into a new portfolio owned by
    the current user. Does not modify or delete the original guest session."""
    session = db.query(DBSession).filter_by(id=req.session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found. It may have expired.")

    cache = db.query(AnalyticsCache).filter_by(session_id=req.session_id).first()
    if cache is None:
        raise HTTPException(status_code=404, detail="No analytics found for this session.")

    portfolio_id = str(uuid.uuid4())
    portfolio = Portfolio(
        id=portfolio_id,
        user_id=user.id,
        name=req.name or session.filename or "My Portfolio",
        source_session_id=session.id,
        age=session.age,
        total_value=session.total_value,
        filename=session.filename,
    )
    db.add(portfolio)

    for holding in session.holdings:
        db.add(
            PortfolioHolding(
                portfolio_id=portfolio_id,
                ticker=holding.ticker,
                name=holding.name,
                shares=holding.shares,
                market_value=holding.market_value,
                weight=holding.weight,
                cost_basis=holding.cost_basis,
                gain_loss=holding.gain_loss,
                gain_loss_pct=holding.gain_loss_pct,
                asset_class=holding.asset_class,
                sector=holding.sector,
                industry=holding.industry,
                dividend_yield=holding.dividend_yield,
                expense_ratio=holding.expense_ratio,
                beta=holding.beta,
                current_price=holding.current_price,
                broad_market=holding.broad_market,
                etf_theme=holding.etf_theme,
            )
        )

    db.add(PortfolioAnalyticsCache(portfolio_id=portfolio_id, analytics_json=cache.analytics_json))
    db.add(
        Transaction(
            portfolio_id=portfolio_id,
            event_type="claim",
            total_value_snapshot=session.total_value,
            note=f"Claimed from guest session {session.id}",
        )
    )
    db.commit()

    return {"portfolio_id": portfolio_id}


@router.get("")
def list_portfolios(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    portfolios = db.query(Portfolio).filter_by(user_id=user.id).order_by(Portfolio.updated_at.desc()).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "total_value": p.total_value,
            "filename": p.filename,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
        }
        for p in portfolios
    ]


@router.get("/{portfolio_id}")
def get_portfolio(portfolio_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    portfolio = _get_owned_portfolio(portfolio_id, user, db)
    cache = db.get(PortfolioAnalyticsCache, portfolio.id)
    if cache is None:
        raise HTTPException(status_code=404, detail="No analytics found for this portfolio.")
    return json.loads(cache.analytics_json)


@router.patch("/{portfolio_id}")
def rename_portfolio(
    portfolio_id: str, req: RenameRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    portfolio = _get_owned_portfolio(portfolio_id, user, db)
    portfolio.name = req.name
    db.commit()
    return {"id": portfolio.id, "name": portfolio.name}


@router.delete("/{portfolio_id}")
def delete_portfolio(portfolio_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    portfolio = _get_owned_portfolio(portfolio_id, user, db)
    db.delete(portfolio)
    db.commit()
    return {"deleted": True}


@router.post("/{portfolio_id}/refresh")
async def refresh_portfolio(
    portfolio_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Re-run ingestion for the portfolio's original uploaded file is not
    supported (the raw file isn't retained) — this recomputes analytics from
    the currently stored holdings instead, refreshing enrichment/market data."""
    portfolio = _get_owned_portfolio(portfolio_id, user, db)

    import pandas as pd

    rows = [
        {
            "ticker": h.ticker,
            "name": h.name,
            "shares": h.shares,
            "market_value": h.market_value,
            "weight": h.weight,
            "cost_basis": h.cost_basis,
            "gain_loss": h.gain_loss,
            "gain_loss_pct": h.gain_loss_pct,
            "asset_class": h.asset_class,
            "sector": h.sector,
            "industry": h.industry,
            "dividend_yield": h.dividend_yield,
            "expense_ratio": h.expense_ratio,
            "beta": h.beta,
            "current_price": h.current_price,
        }
        for h in portfolio.holdings
    ]
    df = pd.DataFrame(rows)
    analytics = run_analytics(df, portfolio.age, portfolio.goals or "")

    cache = db.get(PortfolioAnalyticsCache, portfolio.id)
    if cache is None:
        cache = PortfolioAnalyticsCache(portfolio_id=portfolio.id, analytics_json=json.dumps(analytics))
        db.add(cache)
    else:
        cache.analytics_json = json.dumps(analytics)

    portfolio.total_value = analytics["summary"]["total_value"]
    db.add(
        Transaction(
            portfolio_id=portfolio.id,
            event_type="refresh",
            total_value_snapshot=portfolio.total_value,
        )
    )
    db.commit()

    return json.loads(cache.analytics_json)
