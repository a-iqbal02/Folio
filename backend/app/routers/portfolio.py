import json
import logging
from datetime import datetime, timezone

import httpx
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portfolio import Session as DBSession, AnalyticsCache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["portfolio"])

_VALID_PERIODS = {"6mo", "1y", "2y", "5y"}

# Browser-like headers so Yahoo Finance doesn't reject the request
_YF_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept":          "application/json, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer":         "https://finance.yahoo.com/",
    "Origin":          "https://finance.yahoo.com",
}


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


def _fetch_closes(ticker: str, period: str) -> "pd.Series | None":
    """
    Fetch daily adjusted-close prices from Yahoo Finance chart API.
    Returns a timezone-naive pd.Series(float, DatetimeIndex) or None on failure.
    Uses httpx directly — bypasses yfinance history() which has version-specific
    MultiIndex quirks and can be rate-limited for bulk historical requests.
    """
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    params = {
        "range":          period,
        "interval":       "1d",
        "includePrePost": "false",
        "events":         "div,splits",
    }
    try:
        resp = httpx.get(
            url, params=params, headers=_YF_HEADERS,
            timeout=20.0, follow_redirects=True,
        )
        resp.raise_for_status()
        body = resp.json()

        results = (body.get("chart") or {}).get("result") or []
        if not results:
            logger.warning(f"perf: no chart result for {ticker} — {body.get('chart',{}).get('error')}")
            return None

        r          = results[0]
        timestamps = r.get("timestamp") or []
        adjclose   = ((r.get("indicators") or {}).get("adjclose") or [{}])[0]
        prices     = adjclose.get("adjclose") or []

        # fallback: use regular close if adjclose absent
        if not prices:
            prices = ((r.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []

        if not timestamps or not prices or len(timestamps) != len(prices):
            logger.warning(f"perf: bad data arrays for {ticker} (ts={len(timestamps)} px={len(prices)})")
            return None

        dates = [
            datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
            for ts in timestamps
        ]
        s = pd.Series(prices, index=pd.DatetimeIndex(dates), name=ticker, dtype=float)
        return s.dropna()

    except httpx.HTTPStatusError as exc:
        logger.warning(f"perf: HTTP {exc.response.status_code} for {ticker}")
        return None
    except Exception as exc:
        logger.warning(f"perf: fetch failed for {ticker}: {exc}")
        return None


@router.get("/portfolio/{session_id}/performance")
def get_portfolio_performance(
    session_id: str,
    period: str = "1y",
    db: Session = Depends(get_db),
):
    """
    Portfolio vs SPY normalised performance.
    Both series start at 100 at period start; end value = total return %.

    Uses Yahoo Finance chart API via httpx (browser-like headers).
    Top-5 holdings only; falls back to SPY proxy if none resolve.
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

    # Always need SPY
    spy_series = _fetch_closes("SPY", period)
    if spy_series is None or spy_series.empty:
        raise HTTPException(
            status_code=502,
            detail="Yahoo Finance is temporarily unavailable. Please try again in a moment.",
        )

    # Portfolio tickers — failures are non-fatal
    ticker_series: dict[str, pd.Series] = {}
    for t in top5:
        s = _fetch_closes(t, period)
        if s is not None and not s.empty:
            ticker_series[t] = s

    logger.info(
        f"perf {session_id[:8]}: period={period} "
        f"portfolio={len(ticker_series)}/{len(top5)} tickers ok"
    )

    # Combine into aligned DataFrame
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
        matched_w = {t: w / total_mw for t, w in matched_w.items()}
        portfolio  = pd.Series(0.0, index=closes.index)
        for t, w in matched_w.items():
            portfolio = portfolio + normalized[t].ffill() * w
        start = float(portfolio.iloc[0])
        if start > 0:
            portfolio = portfolio / start * 100.0

    spy = normalized["SPY"]

    # Downsample to ≤ 252 points
    step = max(1, len(closes) // 252)
    idx  = list(range(0, len(closes), step))

    return {
        "labels":    [closes.index[i].strftime("%Y-%m-%d") for i in idx],
        "portfolio": [round(float(portfolio.iloc[i]), 2) for i in idx],
        "spy":       [round(float(spy.iloc[i]), 2) for i in idx],
        "period":    period,
    }
