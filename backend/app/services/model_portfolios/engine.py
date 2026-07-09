"""
Model portfolio analytics: allocation breakdown, blended expense ratio, and
a hypothetical historical-backtest performance line vs SPY. Reuses the same
free Stooq/Yahoo price-fetch pipeline as the screener (Phase B) and the same
align/normalize/blend algorithm as the uploaded-portfolio performance chart
(routers/portfolio.py's get_portfolio_performance) -- just applied to a
fixed named weight set instead of a user's uploaded holdings.
"""
import logging
import concurrent.futures

import pandas as pd

from app.data.etf_universe import ETF_UNIVERSE
from app.data.model_portfolios import TICKER_ASSET_CLASS
from app.services.market.price_fetch import fetch_closes_for_period

logger = logging.getLogger(__name__)

_ER_BY_TICKER = {e["ticker"]: e["expense_ratio"] for e in ETF_UNIVERSE}


def get_allocation_breakdown(portfolio: dict) -> list[dict]:
    """Asset-class breakdown (US Equities / International Equities / Bonds /
    Commodities) -- the same 4 categories used by the risk questionnaire, so
    it's directly comparable to a risk-quiz result's target allocation."""
    totals: dict[str, float] = {}
    for h in portfolio["holdings"]:
        category = TICKER_ASSET_CLASS.get(h["ticker"], "Other")
        totals[category] = totals.get(category, 0) + h["weight"]
    return [{"category": category, "weight_pct": round(weight, 1)} for category, weight in totals.items()]


def get_blended_expense_ratio(portfolio: dict) -> float:
    total = sum(
        (h["weight"] / 100.0) * _ER_BY_TICKER.get(h["ticker"], 0.0)
        for h in portfolio["holdings"]
    )
    return round(total, 4)


def get_performance(portfolio: dict, period: str = "3y") -> dict:
    """
    Hypothetical, non-rebalanced, buy-and-hold blend of daily closes at the
    portfolio's static target weights, vs SPY. NOT dividend-adjusted total
    return -- Stooq's free daily closes are close-price only for most
    symbols, so this is an approximation, not an audited backtest figure.
    """
    holdings = portfolio["holdings"]
    weights = {h["ticker"]: h["weight"] / 100.0 for h in holdings}

    spy_series = fetch_closes_for_period("SPY", period)
    if spy_series is None or spy_series.empty:
        return None

    ticker_series: dict[str, pd.Series] = {}

    def _fetch_one(t):
        return t, fetch_closes_for_period(t, period)

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = [pool.submit(_fetch_one, t) for t in weights]
        for fut in concurrent.futures.as_completed(futures):
            t, s = fut.result()
            if s is not None and not s.empty:
                ticker_series[t] = s

    frames: dict[str, pd.Series] = {"SPY": spy_series}
    frames.update(ticker_series)
    closes = pd.DataFrame(frames).ffill().dropna(how="all")

    if closes.empty or "SPY" not in closes.columns:
        return None

    base = closes.iloc[0]
    normalized = closes.div(base) * 100.0

    matched_w = {t: weights[t] for t in weights if t in normalized.columns}
    total_mw = sum(matched_w.values())
    if total_mw < 0.01:
        logger.warning(f"model_portfolios: no tickers matched for {portfolio['id']}, using SPY as proxy")
        blended = normalized["SPY"].copy()
    else:
        matched_w = {t: w / total_mw for t, w in matched_w.items()}
        blended = pd.Series(0.0, index=closes.index)
        for t, w in matched_w.items():
            blended = blended + normalized[t].ffill() * w
        start = float(blended.iloc[0])
        if start > 0:
            blended = blended / start * 100.0

    spy = normalized["SPY"]

    daily_returns = blended.pct_change().dropna()
    annualized_volatility_pct = (
        round(float(daily_returns.std() * (252 ** 0.5) * 100), 2) if len(daily_returns) > 1 else None
    )
    total_return_pct = round(float(blended.iloc[-1] - 100), 2)

    step = max(1, len(closes) // 252)
    idx = list(range(0, len(closes), step))

    return {
        "labels": [closes.index[i].strftime("%Y-%m-%d") for i in idx],
        "portfolio": [round(float(blended.iloc[i]), 2) for i in idx],
        "spy": [round(float(spy.iloc[i]), 2) for i in idx],
        "period": period,
        "total_return_pct": total_return_pct,
        "annualized_volatility_pct": annualized_volatility_pct,
    }
