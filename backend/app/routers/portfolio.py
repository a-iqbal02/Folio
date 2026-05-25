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
    Both series start at 100; end value reflects period total return.

    Fetches each ticker individually so per-ticker failures are isolated
    and don't break the whole response.  Falls back to SPY-only if no
    portfolio tickers resolve.
    """
    import pandas as pd
    import yfinance as yf

    cache = db.query(AnalyticsCache).filter_by(session_id=session_id).first()
    if not cache:
        raise HTTPException(status_code=404, detail="Session not found.")

    if period not in _VALID_PERIODS:
        period = "1y"

    analytics   = json.loads(cache.analytics_json)
    holdings    = analytics.get("holdings", [])
    if not holdings:
        raise HTTPException(status_code=400, detail="No holdings data.")

    # Build weight map  (weight_pct is already 0–100)
    raw_weights: dict[str, float] = {}
    for h in holdings:
        t = str(h.get("ticker") or "").strip().upper()
        w = float(h.get("weight_pct") or 0)
        if t and w > 0:
            raw_weights[t] = w / 100.0

    if not raw_weights:
        raise HTTPException(status_code=400, detail="No valid holdings.")

    # Top-5 only — keeps latency low
    top5 = sorted(raw_weights, key=lambda t: -raw_weights[t])[:5]

    # ── helper: fetch one ticker via the Ticker API ───────────────────────────
    def fetch_close(ticker: str) -> "pd.Series | None":
        try:
            hist = yf.Ticker(ticker).history(period=period)
            if hist.empty or "Close" not in hist.columns:
                logger.warning(f"perf: empty history for {ticker}")
                return None
            s = hist["Close"].rename(ticker)
            # Strip timezone — different yfinance builds return aware/naive indexes
            if getattr(s.index, "tz", None) is not None:
                s.index = s.index.tz_convert(None)
            return s
        except Exception as exc:
            logger.warning(f"perf: fetch failed for {ticker}: {exc}")
            return None

    # Always need SPY as benchmark
    spy_series = fetch_close("SPY")
    if spy_series is None or spy_series.empty:
        raise HTTPException(status_code=500,
                            detail="Could not fetch SPY benchmark data.")

    # Fetch portfolio tickers (failures are non-fatal)
    ticker_series: dict[str, "pd.Series"] = {}
    for t in top5:
        s = fetch_close(t)
        if s is not None and not s.empty:
            ticker_series[t] = s

    logger.info(
        f"perf {session_id[:8]}: fetched {len(ticker_series)}/{len(top5)} "
        f"portfolio tickers + SPY for period={period}"
    )

    # ── Build aligned DataFrame ───────────────────────────────────────────────
    frames: dict[str, "pd.Series"] = {"SPY": spy_series}
    frames.update(ticker_series)
    closes = pd.DataFrame(frames).ffill().dropna(how="all")

    if closes.empty or "SPY" not in closes.columns:
        raise HTTPException(status_code=500, detail="No usable price data.")

    # Normalise every column to 100 at the first date
    base       = closes.iloc[0]
    normalized = closes.div(base) * 100.0

    # ── Weighted portfolio line ───────────────────────────────────────────────
    matched_w = {t: raw_weights[t] for t in top5 if t in normalized.columns}
    total_mw  = sum(matched_w.values())

    if total_mw < 0.01:
        # No portfolio tickers resolved → show SPY as proxy
        logger.warning(f"perf {session_id[:8]}: no tickers matched, using SPY as proxy")
        portfolio = normalized["SPY"].copy()
    else:
        # Re-normalise subset weights to 1
        matched_w = {t: w / total_mw for t, w in matched_w.items()}
        portfolio  = pd.Series(0.0, index=closes.index)
        for t, w in matched_w.items():
            portfolio = portfolio + normalized[t].ffill() * w
        # Re-anchor so it starts at exactly 100
        start = float(portfolio.iloc[0])
        if start > 0:
            portfolio = portfolio / start * 100.0

    spy = normalized["SPY"]

    # Downsample to ≤ 252 points for payload size
    step = max(1, len(closes) // 252)
    idx  = list(range(0, len(closes), step))

    return {
        "labels":    [closes.index[i].strftime("%Y-%m-%d") for i in idx],
        "portfolio": [round(float(portfolio.iloc[i]), 2) for i in idx],
        "spy":       [round(float(spy.iloc[i]), 2) for i in idx],
        "period":    period,
    }
