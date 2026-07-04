"""
Public ETF screener endpoints. Merges the curated static ETF universe
(app/data/etf_universe.py) with live-fetched price/return data cached in
etf_price_cache (see services/market/price_refresh.py).
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.data.etf_universe import ETF_UNIVERSE
from app.database import get_db
from app.models.etf_price_cache import EtfPriceCache
from app.services.market.price_fetch import fetch_closes_for_period

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/screener", tags=["screener"])

_UNIVERSE_BY_TICKER = {e["ticker"]: e for e in ETF_UNIVERSE}


def _merge_price(entry: dict, cache_row: Optional[EtfPriceCache]) -> dict:
    merged = dict(entry)
    if cache_row is not None and cache_row.fetch_ok:
        merged["last_price"] = cache_row.last_price
        merged["return_1y_pct"] = cache_row.return_1y_pct
        merged["return_ytd_pct"] = cache_row.return_ytd_pct
        merged["price_updated_at"] = cache_row.as_of
    else:
        merged["last_price"] = None
        merged["return_1y_pct"] = None
        merged["return_ytd_pct"] = None
        merged["price_updated_at"] = None
    return merged


@router.get("/etfs")
def list_etfs(
    search: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    er_max: Optional[float] = Query(None, ge=0),
    sort: str = "aum_desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(len(ETF_UNIVERSE), ge=1, le=len(ETF_UNIVERSE)),
    db: Session = Depends(get_db),
):
    results = ETF_UNIVERSE

    if category and category != "All":
        results = [e for e in results if e["category"] == category]
    if tag:
        results = [e for e in results if tag.lower() in [t.lower() for t in e["tags"]]]
    if er_max is not None:
        results = [e for e in results if e["expense_ratio"] <= er_max]
    if search:
        q = search.lower()
        results = [
            e for e in results
            if q in e["ticker"].lower()
            or q in e["name"].lower()
            or q in e["description"].lower()
            or q in e["category"].lower()
            or any(q in t.lower() for t in e["tags"])
        ]

    cache_rows = {row.ticker: row for row in db.query(EtfPriceCache).all()}
    merged = [_merge_price(e, cache_rows.get(e["ticker"])) for e in results]

    sort_key_fns = {
        "aum_desc": lambda e: -e["aum_approx_b"],
        "aum_asc": lambda e: e["aum_approx_b"],
        "er_asc": lambda e: e["expense_ratio"],
        "er_desc": lambda e: -e["expense_ratio"],
        "ticker_asc": lambda e: e["ticker"],
        "return_1y_desc": lambda e: -(e["return_1y_pct"] if e["return_1y_pct"] is not None else float("-inf")),
        "popular": lambda e: 0 if "popular" in e["tags"] else 1,
    }
    merged.sort(key=sort_key_fns.get(sort, sort_key_fns["aum_desc"]))

    total = len(merged)
    start = (page - 1) * page_size
    page_items = merged[start:start + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": page_items,
    }


@router.get("/etfs/{ticker}")
def get_etf_detail(ticker: str, period: str = "1y", db: Session = Depends(get_db)):
    ticker = ticker.upper()
    entry = _UNIVERSE_BY_TICKER.get(ticker)
    if entry is None:
        raise HTTPException(status_code=404, detail="ETF not found in the curated universe.")

    cache_row = db.get(EtfPriceCache, ticker)
    merged = _merge_price(entry, cache_row)

    series = fetch_closes_for_period(ticker, period)
    if series is not None and not series.empty:
        step = max(1, len(series) // 252)
        idx = list(range(0, len(series), step))
        merged["price_history"] = {
            "period": period,
            "labels": [series.index[i].strftime("%Y-%m-%d") for i in idx],
            "values": [round(float(series.iloc[i]), 2) for i in idx],
        }
    else:
        merged["price_history"] = None

    return merged
