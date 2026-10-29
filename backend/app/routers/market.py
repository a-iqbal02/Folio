"""
Market data router — public endpoints (no session required).
Powers the ETF comparison chart.
"""
import logging

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.services.market.price_fetch import (
    fetch_closes,
    fetch_intraday_closes,
    PERIOD_DAYS as _PERIOD_DAYS,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/market", tags=["market"])

_VALID_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "3y", "5y"}
_VALID_QUOTE_PERIODS = {"1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y"}


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


# ── Single-ticker quote / price lookup ──────────────────────────────────────

@router.get("/quote")
def get_quote(ticker: str, period: str = "1mo"):
    """
    Raw (non-normalised) price history for a single stock or ETF ticker —
    any symbol, not limited to the curated screener universe. Powers the
    Stock Lookup page.

    Query params:
      ticker — a single symbol, e.g. "AAPL"
      period — one of: 1d | 5d | 1mo | 3mo | 6mo | 1y | 2y | 5y
    """
    ticker = ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Provide a ticker symbol.")

    if period not in _VALID_QUOTE_PERIODS:
        period = "1mo"

    if period == "1d":
        series = fetch_intraday_closes(ticker)
        if series is None or series.empty:
            raise HTTPException(
                status_code=502,
                detail=f"Intraday data isn't available for {ticker} right now "
                       f"(markets may be closed, or the symbol may be wrong). Try a longer period.",
            )
        is_intraday = True
    else:
        days = _PERIOD_DAYS[period]
        series = fetch_closes(ticker, days)
        if series is None or series.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No price data found for '{ticker}'. Check the symbol and try again.",
            )
        is_intraday = False

    # Downsample to ≤ 390 points (enough for a full trading day at 1-minute
    # resolution) so the browser doesn't choke on long daily histories.
    step = max(1, len(series) // 390)
    idx = list(range(0, len(series), step))
    if idx[-1] != len(series) - 1:
        idx.append(len(series) - 1)

    date_fmt = "%Y-%m-%d %H:%M" if is_intraday else "%Y-%m-%d"
    labels = [series.index[i].strftime(date_fmt) for i in idx]
    prices = [round(float(series.iloc[i]), 2) for i in idx]

    first = float(series.iloc[0])
    last = float(series.iloc[-1])
    change_pct = round((last / first - 1) * 100, 2) if first else None

    return {
        "ticker":         ticker,
        "period":         period,
        "is_intraday":    is_intraday,
        "labels":         labels,
        "prices":         prices,
        "current_price":  round(last, 2),
        "change_pct":     change_pct,
        "period_high":    round(float(series.max()), 2),
        "period_low":     round(float(series.min()), 2),
    }
