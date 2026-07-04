"""
Analytics Engine: orchestrates all analysis modules and produces the
final dashboard JSON from an enriched holdings DataFrame.
"""

import pandas as pd

from app.services.analytics.concentration import compute_concentration
from app.services.analytics.benchmark import (
    compute_benchmark_comparison,
    compute_risk_score,
    compute_diversification_score,
    get_age_guidance,
)
from app.services.analytics.etf_matcher import get_etf_recommendations


def run_analytics(df: pd.DataFrame, age: int | None = None, goals: str = "") -> dict:
    """
    Main entry point. Returns the complete dashboard data structure.
    All monetary values are in USD. All percentages are 0–100.
    """
    total_value = float(df["market_value"].sum())

    # Holdings for the table (sorted by weight desc)
    holdings_records = (
        df.sort_values("weight", ascending=False)
        .assign(weight_pct=lambda d: (d["weight"] * 100).round(2))
        .to_dict("records")
    )
    # Convert NaN to None for JSON serialization
    holdings_records = [_clean_nans(r) for r in holdings_records]

    # Sector breakdown
    sector_breakdown = _compute_breakdown(df, "sector")
    asset_class_breakdown = _compute_breakdown(df, "asset_class")

    # Analysis modules
    concentration = compute_concentration(df)
    risk_score = compute_risk_score(df)
    diversification_score = compute_diversification_score(df)
    benchmark = compute_benchmark_comparison(df)
    etf_recs = get_etf_recommendations(df, goals)
    age_guidance = get_age_guidance(df, age) if age else None

    # Cost basis / gain-loss summary
    gains_summary = _gains_summary(df)

    # Summary metrics
    total_holdings = len(df)
    unique_sectors = int(df["sector"].nunique()) if "sector" in df.columns else 0

    result = {
        "summary": {
            "total_value": total_value,
            "total_holdings": total_holdings,
            "unique_sectors": unique_sectors,
            "has_cost_basis": gains_summary["available"],
        },
        "holdings": holdings_records,
        "sector_breakdown": sector_breakdown,
        "asset_class_breakdown": asset_class_breakdown,
        "concentration": concentration,
        "risk_score": risk_score,
        "diversification_score": diversification_score,
        "benchmark": benchmark,
        "etf_recommendations": etf_recs,
        "age_guidance": age_guidance,
        "gains_summary": gains_summary,
        "disclaimer": (
            "PortfolioLens provides educational analysis only. "
            "Nothing here constitutes financial advice, a solicitation, "
            "or a recommendation to buy or sell any security."
        ),
    }
    return _deep_clean_nans(result)


def _compute_breakdown(df: pd.DataFrame, column: str) -> list[dict]:
    """Generic breakdown by a categorical column."""
    if column not in df.columns:
        return []

    breakdown = (
        df.groupby(column)
        .agg(
            weight=("weight", "sum"),
            market_value=("market_value", "sum"),
            count=("ticker", "count"),
        )
        .reset_index()
        .sort_values("weight", ascending=False)
    )

    return [
        {
            column: row[column] or "Unknown",
            "weight_pct": round(row["weight"] * 100, 2),
            "market_value": round(row["market_value"], 2),
            "count": int(row["count"]),
        }
        for _, row in breakdown.iterrows()
    ]


def _gains_summary(df: pd.DataFrame) -> dict:
    """Summarize unrealized gains/losses if cost_basis data is available."""
    if "cost_basis" not in df.columns or df["cost_basis"].isna().all():
        return {"available": False}

    valid = df[df["cost_basis"].notna() & (df["cost_basis"] > 0)].copy()
    if valid.empty:
        return {"available": False}

    total_market_value = valid["market_value"].sum()
    total_cost = valid["cost_basis"].sum()
    total_gain = total_market_value - total_cost
    total_gain_pct = (total_gain / total_cost * 100) if total_cost > 0 else 0

    winners = valid[valid["market_value"] > valid["cost_basis"]]
    losers = valid[valid["market_value"] < valid["cost_basis"]]

    return {
        "available": True,
        "total_market_value": round(total_market_value, 2),
        "total_cost_basis": round(total_cost, 2),
        "total_gain_loss": round(total_gain, 2),
        "total_gain_loss_pct": round(total_gain_pct, 2),
        "positions_with_gains": int(len(winners)),
        "positions_with_losses": int(len(losers)),
    }


def _clean_nans(record: dict) -> dict:
    """Replace NaN/inf values with None for JSON serialization."""
    import math
    cleaned = {}
    for k, v in record.items():
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            cleaned[k] = None
        else:
            cleaned[k] = v
    return cleaned


def _deep_clean_nans(value):
    """Recursively replace NaN/inf floats with None anywhere in a nested
    dict/list structure, so the full analytics response is always valid
    JSON regardless of which sub-module produced the stray NaN."""
    import math

    if isinstance(value, float):
        return None if (math.isnan(value) or math.isinf(value)) else value
    if isinstance(value, dict):
        return {k: _deep_clean_nans(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_deep_clean_nans(v) for v in value]
    return value
