"""
Shared free-data price fetching: Stooq.com primary, Yahoo Finance chart API
fallback. Consolidates logic that used to be duplicated (near-verbatim)
across routers/market.py and routers/portfolio.py. Used by those routers
plus the ETF screener (services/market/price_refresh.py) and model
portfolio backtests.

Neither source requires an API key. Stooq is preferred because it does not
block server IPs; Yahoo is kept as a fallback via a direct httpx call to its
chart API (bypassing the yfinance package's crumb/cookie requirement).
"""
import logging
from datetime import datetime, timezone, timedelta

import httpx
import pandas as pd

logger = logging.getLogger(__name__)

VALID_PERIODS = {"1mo", "3mo", "6mo", "1y", "2y", "3y", "5y"}
PERIOD_DAYS = {
    "1mo": 35,
    "3mo": 95,
    "6mo": 185,
    "1y": 370,
    "2y": 740,
    "3y": 1100,
    "5y": 1830,
}

# Browser-like headers for the Yahoo Finance fallback.
_YF_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
    "Origin": "https://finance.yahoo.com",
}


def _days_to_yahoo_range(days: int) -> str:
    """Yahoo's chart API takes a period-like `range` string, not a day count."""
    for period, period_days in sorted(PERIOD_DAYS.items(), key=lambda kv: kv[1]):
        if days <= period_days:
            return period
    return "5y"


def fetch_stooq_closes(ticker: str, days: int) -> "pd.Series | None":
    """
    Fetch daily closing prices from Stooq.com — free, no API key, doesn't
    block server IPs. Returns a timezone-naive pd.Series(float, DatetimeIndex)
    sorted ascending, or None on failure.
    """
    end_dt = datetime.now(tz=timezone.utc)
    start_dt = end_dt - timedelta(days=days)
    sym = f"{ticker.lower()}.us"
    d1 = start_dt.strftime("%Y%m%d")
    d2 = end_dt.strftime("%Y%m%d")
    url = f"https://stooq.com/q/d/l/?s={sym}&d1={d1}&d2={d2}&i=d"

    try:
        resp = httpx.get(
            url,
            timeout=20.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; bot)"},
        )
        resp.raise_for_status()

        text = resp.text.strip()
        if not text or len(text) < 30:
            logger.warning(f"stooq: empty response for {ticker}")
            return None
        first_line = text.split("\n")[0].lower()
        if "no data" in first_line or "exceeded" in first_line or "date" not in first_line:
            logger.warning(f"stooq: bad response for {ticker}: {text[:80]}")
            return None

        lines = text.split("\n")
        records = []
        for line in lines[1:]:
            parts = line.strip().split(",")
            if len(parts) < 5:
                continue
            try:
                date_str = parts[0].strip()
                close_val = float(parts[4].strip())
                records.append((date_str, close_val))
            except (ValueError, IndexError):
                continue

        if not records:
            logger.warning(f"stooq: no parseable rows for {ticker}")
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
        logger.warning(f"stooq: HTTP {exc.response.status_code} for {ticker}")
        return None
    except Exception as exc:
        logger.warning(f"stooq: failed for {ticker}: {exc}")
        return None


def fetch_yahoo_closes(ticker: str, days: int) -> "pd.Series | None":
    """
    Yahoo Finance chart API fallback (direct httpx call, bypassing the
    yfinance package's crumb/cookie issue). May be blocked on some server
    IPs but kept as a secondary option.
    """
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    params = {
        "range": _days_to_yahoo_range(days),
        "interval": "1d",
        "includePrePost": "false",
        "events": "div,splits",
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
            return None

        r = results[0]
        timestamps = r.get("timestamp") or []
        adjclose = ((r.get("indicators") or {}).get("adjclose") or [{}])[0]
        prices = adjclose.get("adjclose") or []

        if not prices:
            prices = ((r.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []

        if not timestamps or not prices or len(timestamps) != len(prices):
            return None

        dates = [
            datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
            for ts in timestamps
        ]
        s = pd.Series(prices, index=pd.DatetimeIndex(dates), name=ticker, dtype=float)
        return s.dropna()

    except httpx.HTTPStatusError as exc:
        logger.warning(f"yahoo: HTTP {exc.response.status_code} for {ticker}")
        return None
    except Exception as exc:
        logger.warning(f"yahoo: fetch failed for {ticker}: {exc}")
        return None


def fetch_closes(ticker: str, days: int) -> "pd.Series | None":
    """Primary: Stooq -> Fallback: Yahoo Finance. Returns pd.Series or None."""
    result = fetch_stooq_closes(ticker, days)
    if result is not None and not result.empty:
        return result

    logger.info(f"price_fetch: stooq failed for {ticker}, trying Yahoo Finance")
    return fetch_yahoo_closes(ticker, days)


def fetch_closes_for_period(ticker: str, period: str) -> "pd.Series | None":
    """Convenience wrapper: takes a period string ('1y', '6mo', ...) instead
    of a raw day count. Unrecognized periods fall back to '1y'."""
    days = PERIOD_DAYS.get(period, PERIOD_DAYS["1y"])
    return fetch_closes(ticker, days)
