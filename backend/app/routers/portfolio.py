import json
import logging

import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portfolio import Session as DBSession, AnalyticsCache
from app.services.market.price_fetch import fetch_closes_for_period

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


# ── Performance endpoint ───────────────────────────────────────────────────────

@router.get("/portfolio/{session_id}/performance")
def get_portfolio_performance(
    session_id: str,
    period: str = "1y",
    db: Session = Depends(get_db),
):
    """
    Portfolio vs SPY normalised performance.
    Both series start at 100 at period start; end value = total return %.
    Data fetched from Stooq (primary) with Yahoo Finance as fallback.
    """
    cache = db.query(AnalyticsCache).filter_by(session_id=session_id).first()
    if not cache:
        raise HTTPException(status_code=404, detail="Session not found.")

    if period not in _VALID_PERIODS:
        period = "1y"

    analytics = json.loads(cache.analytics_json)
    holdings  = analytics.get("holdings", [])
    if not holdings:
        raise HTTPException(status_code=400, detail="No holdings data.")

    # Build weight map (weight_pct is 0-100)
    raw_weights: dict[str, float] = {}
    for h in holdings:
        t = str(h.get("ticker") or "").strip().upper()
        w = float(h.get("weight_pct") or 0)
        if t and w > 0:
            raw_weights[t] = w / 100.0

    if not raw_weights:
        raise HTTPException(status_code=400, detail="No valid holdings.")

    top5 = sorted(raw_weights, key=lambda t: -raw_weights[t])[:5]

    # Always need SPY benchmark
    spy_series = fetch_closes_for_period("SPY", period)
    if spy_series is None or spy_series.empty:
        raise HTTPException(
            status_code=502,
            detail="Market data is temporarily unavailable. Please try again in a moment.",
        )

    # Portfolio tickers — fetch in parallel using threads
    import concurrent.futures
    ticker_series: dict[str, pd.Series] = {}

    def _fetch_one(t):
        s = fetch_closes_for_period(t, period)
        return t, s

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = [pool.submit(_fetch_one, t) for t in top5]
        for fut in concurrent.futures.as_completed(futures):
            t, s = fut.result()
            if s is not None and not s.empty:
                ticker_series[t] = s

    logger.info(
        f"perf {session_id[:8]}: period={period} "
        f"portfolio={len(ticker_series)}/{len(top5)} tickers ok"
    )

    # Align into a single DataFrame
    frames: dict[str, pd.Series] = {"SPY": spy_series}
    frames.update(ticker_series)
    closes = pd.DataFrame(frames).ffill().dropna(how="all")

    if closes.empty or "SPY" not in closes.columns:
        raise HTTPException(status_code=500, detail="Could not build price DataFrame.")

    # Normalise to 100 at first date
    base       = closes.iloc[0]
    normalized = closes.div(base) * 100.0

    # Weighted portfolio line
    matched_w  = {t: raw_weights[t] for t in top5 if t in normalized.columns}
    total_mw   = sum(matched_w.values())

    if total_mw < 0.01:
        logger.warning(f"perf {session_id[:8]}: no tickers matched — using SPY as proxy")
        portfolio = normalized["SPY"].copy()
    else:
        matched_w  = {t: w / total_mw for t, w in matched_w.items()}
        portfolio  = pd.Series(0.0, index=closes.index)
        for t, w in matched_w.items():
            portfolio = portfolio + normalized[t].ffill() * w
        start = float(portfolio.iloc[0])
        if start > 0:
            portfolio = portfolio / start * 100.0

    spy = normalized["SPY"]

    # Downsample to ≤ 252 points for the chart
    step = max(1, len(closes) // 252)
    idx  = list(range(0, len(closes), step))

    return {
        "labels":    [closes.index[i].strftime("%Y-%m-%d") for i in idx],
        "portfolio": [round(float(portfolio.iloc[i]), 2) for i in idx],
        "spy":       [round(float(spy.iloc[i]), 2) for i in idx],
        "period":    period,
    }
