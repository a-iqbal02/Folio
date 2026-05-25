import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portfolio import Session as DBSession, AnalyticsCache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["portfolio"])

_VALID_PERIODS = {"6mo", "1y", "2y", "5y"}


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


@router.get("/portfolio/{session_id}/performance")
def get_portfolio_performance(
    session_id: str,
    period: str = "1y",
    db: Session = Depends(get_db),
):
    """
    Return normalized portfolio vs SPY performance time series.
    Both series start at 100; the final value reflects total return.
    Uses top-5 holdings only to keep the yfinance call fast and reliable.
    """
    import pandas as pd
    import yfinance as yf

    cache = db.query(AnalyticsCache).filter_by(session_id=session_id).first()
    if not cache:
        raise HTTPException(status_code=404, detail="Session not found.")

    if period not in _VALID_PERIODS:
        period = "1y"

    analytics = json.loads(cache.analytics_json)
    holdings = analytics.get("holdings", [])
    if not holdings:
        raise HTTPException(status_code=400, detail="No holdings data.")

    # Build weight map (weight_pct is 0–100)
    raw_weights: dict[str, float] = {}
    for h in holdings:
        ticker = str(h.get("ticker") or "").strip().upper()
        w = float(h.get("weight_pct") or 0)
        if ticker and w > 0:
            raw_weights[ticker] = w / 100.0

    if not raw_weights:
        raise HTTPException(status_code=400, detail="No valid ticker weights.")

    # Limit to top 5 — covers the bulk of the portfolio and keeps yfinance fast
    top5 = sorted(raw_weights, key=lambda t: -raw_weights[t])[:5]
    weights = {t: raw_weights[t] for t in top5}

    # Re-normalise so the subset sums to 1
    total_w = sum(weights.values())
    weights = {t: w / total_w for t, w in weights.items()}

    fetch_list = top5 + ["SPY"]

    try:
        raw = yf.download(
            fetch_list,
            period=period,
            auto_adjust=True,
            progress=False,
        )
    except Exception as exc:
        logger.error(f"yfinance download failed: {exc}")
        raise HTTPException(status_code=500, detail="Market data fetch failed.")

    # Extract Close — MultiIndex when multiple tickers
    try:
        if isinstance(raw.columns, pd.MultiIndex):
            closes = raw["Close"]
        elif "Close" in raw.columns:
            closes = raw[["Close"]].rename(columns={"Close": top5[0]})
        else:
            closes = raw
        if isinstance(closes, pd.Series):
            closes = closes.to_frame()
    except Exception as exc:
        logger.error(f"Close extraction error: {exc}")
        raise HTTPException(status_code=500, detail="Unexpected market data format.")

    closes = closes.ffill().dropna(how="all")

    if closes.empty or "SPY" not in closes.columns:
        raise HTTPException(status_code=500, detail="SPY benchmark data unavailable.")

    # Normalise: divide each column by its first non-null value, multiply by 100
    first_row = closes.iloc[0]
    normalized = closes.div(first_row) * 100.0

    # Weighted portfolio line
    portfolio = pd.Series(0.0, index=closes.index)
    matched_w = 0.0
    for ticker, w in weights.items():
        if ticker in normalized.columns:
            portfolio += normalized[ticker].ffill() * w
            matched_w += w

    if matched_w < 0.01:
        raise HTTPException(status_code=400, detail="No portfolio tickers matched market data.")

    # Re-anchor so the series starts at exactly 100
    start = float(portfolio.iloc[0])
    if start > 0:
        portfolio = portfolio / start * 100.0

    spy = normalized["SPY"]

    # Downsample to ≤ 252 data points for payload size
    step = max(1, len(closes) // 252)
    idx  = list(range(0, len(closes), step))

    return {
        "labels":    [closes.index[i].strftime("%Y-%m-%d") for i in idx],
        "portfolio": [round(float(portfolio.iloc[i]), 2) for i in idx],
        "spy":       [round(float(spy.iloc[i]), 2) for i in idx],
        "period":    period,
    }
