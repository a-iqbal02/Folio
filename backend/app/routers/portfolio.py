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
    Both series start at 100; the final value shows total return %.
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

    # Build weight map from all holdings (weight_pct already 0-100)
    raw_weights: dict[str, float] = {}
    for h in holdings:
        ticker = str(h.get("ticker") or "").strip().upper()
        w = float(h.get("weight_pct") or 0)
        if ticker and w > 0:
            raw_weights[ticker] = w / 100.0   # convert to fraction

    if not raw_weights:
        raise HTTPException(status_code=400, detail="No valid ticker weights.")

    # Top 20 by weight to keep the yfinance call fast
    top_tickers = sorted(raw_weights, key=lambda t: -raw_weights[t])[:20]
    weights = {t: raw_weights[t] for t in top_tickers}

    fetch_list = top_tickers + ["SPY"]

    try:
        raw = yf.download(
            fetch_list,
            period=period,
            auto_adjust=True,
            progress=False,
            threads=True,
        )
    except Exception as exc:
        logger.error(f"yfinance download failed: {exc}")
        raise HTTPException(status_code=500, detail="Market data fetch failed.")

    # Extract Close prices — shape depends on number of tickers
    if isinstance(raw.columns, pd.MultiIndex):
        closes = raw["Close"]
    elif "Close" in raw.columns:
        # Single ticker returned a flat DataFrame
        name = fetch_list[0] if len(fetch_list) == 1 else "SPY"
        closes = raw[["Close"]].rename(columns={"Close": name})
    else:
        closes = raw

    if isinstance(closes, pd.Series):
        closes = closes.to_frame(name=fetch_list[0])

    # Clean: forward-fill gaps, drop entirely empty rows
    closes = closes.ffill().dropna(how="all")

    if closes.empty or "SPY" not in closes.columns:
        raise HTTPException(status_code=500, detail="SPY benchmark data unavailable.")

    # Normalize everything to 100 at the first date
    base = closes.iloc[0].replace(0.0, float("nan"))
    normalized = (closes / base) * 100.0

    # Weighted portfolio line
    portfolio = pd.Series(0.0, index=closes.index)
    weight_sum = 0.0
    for ticker, w in weights.items():
        if ticker in normalized.columns:
            col = normalized[ticker].ffill()
            portfolio = portfolio + col * w
            weight_sum += w

    if weight_sum < 0.01:
        raise HTTPException(status_code=400, detail="No portfolio tickers matched market data.")

    # Re-normalize portfolio so it starts at exactly 100
    start_val = float(portfolio.iloc[0])
    if start_val > 0:
        portfolio = portfolio / start_val * 100.0

    spy = normalized["SPY"]

    # Downsample to ≤ 252 points so the JSON payload stays small
    step = max(1, len(closes) // 252)
    idx = list(range(0, len(closes), step))

    return {
        "labels":    [closes.index[i].strftime("%Y-%m-%d") for i in idx],
        "portfolio": [round(float(portfolio.iloc[i]), 2) for i in idx],
        "spy":       [round(float(spy.iloc[i]), 2) for i in idx],
        "period":    period,
    }
