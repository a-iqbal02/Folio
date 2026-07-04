"""
Background refresh loop for the ETF screener's live price cache.

Runs in-process (started from main.py's lifespan via asyncio.create_task),
refreshing all tickers in the curated ETF universe on a fixed interval.
An in-process loop is used instead of external cron infra to keep Phase B
deployable with zero extra Railway configuration.
"""
import asyncio
import logging
import random
from datetime import datetime, timezone

import pandas as pd

from app.config import settings
from app.data.etf_universe import ETF_UNIVERSE
from app.database import SessionLocal
from app.models.etf_price_cache import EtfPriceCache
from app.services.market.price_fetch import fetch_closes

logger = logging.getLogger(__name__)

REFRESH_INTERVAL_SECONDS = 6 * 60 * 60  # 6 hours
_FETCH_DAYS = 400  # >1y of daily closes, enough for both 1y and YTD comparisons


def _compute_returns(series: "pd.Series | None"):
    """Returns (last_price, return_1y_pct, return_ytd_pct), any of which may
    be None if there isn't enough history yet (e.g. a fund that IPO'd
    recently)."""
    if series is None or series.empty:
        return None, None, None

    last_price = float(series.iloc[-1])
    last_date = series.index[-1]

    one_year_ago = last_date - pd.Timedelta(days=365)
    hist_1y = series[series.index <= one_year_ago]
    return_1y = None
    if not hist_1y.empty:
        base = float(hist_1y.iloc[-1])
        if base > 0:
            return_1y = round((last_price / base - 1) * 100, 2)

    jan1 = pd.Timestamp(year=last_date.year, month=1, day=1)
    hist_ytd = series[series.index <= jan1]
    return_ytd = None
    if not hist_ytd.empty:
        base = float(hist_ytd.iloc[-1])
        if base > 0:
            return_ytd = round((last_price / base - 1) * 100, 2)
    else:
        this_year = series[series.index.year == last_date.year]
        if not this_year.empty:
            base = float(this_year.iloc[0])
            if base > 0:
                return_ytd = round((last_price / base - 1) * 100, 2)

    return last_price, return_1y, return_ytd


async def refresh_all_prices() -> None:
    tickers = [e["ticker"] for e in ETF_UNIVERSE]
    semaphore = asyncio.Semaphore(settings.ticker_concurrency)
    loop = asyncio.get_event_loop()
    counts = {"ok": 0, "failed": 0}

    async def _refresh_one(ticker: str) -> None:
        async with semaphore:
            await asyncio.sleep(random.uniform(0.05, 0.2))
            try:
                series = await loop.run_in_executor(None, fetch_closes, ticker, _FETCH_DAYS)
            except Exception:
                logger.exception(f"price_refresh: fetch raised for {ticker}")
                series = None

            last_price, return_1y, return_ytd = _compute_returns(series)

            db = SessionLocal()
            try:
                row = db.get(EtfPriceCache, ticker)
                if row is None:
                    row = EtfPriceCache(ticker=ticker)
                    db.add(row)

                if last_price is not None:
                    row.last_price = last_price
                    row.return_1y_pct = return_1y
                    row.return_ytd_pct = return_ytd
                    row.as_of = series.index[-1].to_pydatetime().replace(tzinfo=timezone.utc)
                    row.fetch_ok = 1
                    counts["ok"] += 1
                else:
                    row.fetch_ok = 0
                    counts["failed"] += 1
                db.commit()
            except Exception:
                logger.exception(f"price_refresh: failed to persist {ticker}")
                db.rollback()
            finally:
                db.close()

    await asyncio.gather(*[_refresh_one(t) for t in tickers])
    logger.info(
        f"price_refresh: pass complete — {counts['ok']} ok, "
        f"{counts['failed']} failed, {len(tickers)} total"
    )


async def price_refresh_loop() -> None:
    """Runs forever: refresh pass, then sleep, repeat."""
    while True:
        try:
            logger.info("price_refresh: starting refresh pass")
            await refresh_all_prices()
        except Exception:
            logger.exception("price_refresh: refresh pass failed")
        await asyncio.sleep(REFRESH_INTERVAL_SECONDS)
