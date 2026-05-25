"""
Market data router — public endpoints (no session required).
Powers the ETF comparison chart.
"""
import logging
from datetime import datetime, timezone, timedelta

import httpx
import pandas as pd
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/market", tags=["market"])

_VALID_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "3y", "5y"}
_PERIOD_DAYS = {
    "1mo":  35,
    "3mo":  95,
    "6mo":  185,
    "1y":   370,
    "2y":   740,
    "3y":   1100,
    "5y":   1830,
}


def _fetch_stooq(ticker: str, days: int) -> "pd.Series | None":
    """
    Fetch daily closing prices from Stooq.com.
    Free, no API key, doesn't block server IPs.
    Returns pd.Series(float, DatetimeIndex) sorted ascending, or None.
    """
    end_dt   = datetime.now(tz=timezone.utc)
    start_dt = end_dt - timedelta(days=days)
    sym      = f"{ticker.lower()}.us"
    d1       = start_dt.strftime("%Y%m%d")
    d2       = end_dt.strftime("%Y%m%d")
    url      = f"https://stooq.com/q/d/l/?s={sym}&d1={d1}&d2={d2}&i=d"

    try:
        resp = httpx.get(
            url, timeout=20.0, follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; bot)"},
        )
        resp.raise_for_status()

        text = resp.text.strip()
        if len(text) < 30:
            return None

        lines = text.split("\n")
        first = lines[0].lower()
        if "no data" in first or "exceeded" in first or "date" not in first:
            logger.warning(f"stooq/compare: bad header for {ticker}: {lines[0][:60]}")
            return None

        records = []
        for line in lines[1:]:
            parts = line.strip().split(",")
            if len(parts) < 5:
                continue
            try:
                records.append((parts[0].strip(), float(parts[4].strip())))
            except (ValueError, IndexError):
                continue

        if not records:
            return None

        records.sort(key=lambda x: x[0])
        s = pd.Series(
            [r[1] for r in records],
            index=pd.DatetimeIndex([r[0] for r in records]),
            name=ticker,
            dtype=float,
        )
        return s.dropna()

    except httpx.HTTPStatusError as exc:
        logger.warning(f"stooq/compare: HTTP {exc.response.status_code} for {ticker}")
        return None
    except Exception as exc:
        logger.warning(f"stooq/compare: failed for {ticker}: {exc}")
        return None


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
        return t, _fetch_stooq(t, days)

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
