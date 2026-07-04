"""
Market data router — public endpoints (no session required).
Powers the ETF comparison chart.
"""
import logging

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.services.market.price_fetch import fetch_closes, PERIOD_DAYS as _PERIOD_DAYS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/market", tags=["market"])

_VALID_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "3y", "5y"}


@router.get("/compare")
def compare_tickers(tickers: str, period: str = "1y"):
    """
    Return normalised (base=100) price series for up to 4 tickers.

    Query params:
      tickers — comma-separated, e.g. "SPY,QQQ,VTI"  (max 4)
      period  — one of: 1mo | 3mo | 6mo | 1y | 2y | 3y | 5y
    """
    if period not in _VALID_PERIODS:
        period = "1y"

    raw = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    ticker_list = list(dict.fromkeys(raw))[:4]   # deduplicate, cap at 4
    if not ticker_list:
        raise HTTPException(status_code=400, detail="Provide at least one ticker.")

    days = _PERIOD_DAYS[period]

    # Fetch in parallel
    import concurrent.futures
    raw_series: dict[str, pd.Series] = {}

    def _fetch_one(t):
        return t, fetch_closes(t, days)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for t, s in pool.map(_fetch_one, ticker_list):
            if s is not None and not s.empty:
                raw_series[t] = s

    if not raw_series:
        raise HTTPException(
            status_code=502,
            detail="Could not fetch data for any of the requested tickers. "
                   "Check that the tickers are valid US-listed symbols.",
        )

    # Align on a common date index (SPY / first ticker drives the timeline)
    closes = pd.DataFrame(raw_series).ffill().dropna(how="all")
    if closes.empty:
        raise HTTPException(status_code=500, detail="Could not build a price DataFrame.")

    base       = closes.iloc[0]
    normalized = (closes.div(base) * 100.0).round(2)

    # Downsample to ≤ 252 points so the browser doesn't choke on 5-year data
    step = max(1, len(normalized) // 252)
    idx  = list(range(0, len(normalized), step))

    labels = [normalized.index[i].strftime("%Y-%m-%d") for i in idx]

    series_out = []
    for t in ticker_list:
        if t not in normalized.columns:
            series_out.append({"ticker": t, "data": [], "return_pct": None, "ok": False})
            continue
        col  = normalized[t]
        data = [round(float(col.iloc[i]), 2) for i in idx]
        last = float(col.iloc[-1])
        series_out.append({
            "ticker":     t,
            "data":       data,
            "return_pct": round(last - 100, 2),
            "ok":         True,
        })

    return {"period": period, "labels": labels, "series": series_out}
