"""
Benchmark Analysis, Risk Score, and Diversification Score.
"""

import pandas as pd

# S&P 500 sector weights (approximate, as of mid-2025)
SP500_SECTOR_WEIGHTS = {
    "Technology": 31.4,
    "Financials": 12.9,
    "Healthcare": 12.6,
    "Consumer Discretionary": 10.2,
    "Industrials": 8.7,
    "Communication Services": 8.6,
    "Consumer Staples": 5.9,
    "Energy": 3.7,
    "Real Estate": 2.4,
    "Utilities": 2.3,
    "Materials": 2.1,
    "Unknown": 0.0,
}

# Risk band definitions based on weighted beta
RISK_BANDS = [
    (0.0, 0.4, 0, 15, "Very Low", "#10b981"),
    (0.4, 0.7, 15, 30, "Low", "#34d399"),
    (0.7, 0.9, 30, 50, "Below Average", "#6ee7b7"),
    (0.9, 1.1, 50, 60, "Market-Like", "#fbbf24"),
    (1.1, 1.4, 60, 75, "Above Average", "#f97316"),
    (1.4, 1.8, 75, 88, "High", "#ef4444"),
    (1.8, 9.9, 88, 100, "Very High", "#b91c1c"),
]


def compute_benchmark_comparison(df: pd.DataFrame) -> dict:
    """Compare portfolio sector allocation vs S&P 500."""
    if "sector" not in df.columns:
        return {"available": False}

    portfolio_sectors = (
        df.groupby("sector")["weight"].sum() * 100
    ).to_dict()

    all_sectors = set(SP500_SECTOR_WEIGHTS.keys()) | set(portfolio_sectors.keys())
    all_sectors.discard("Unknown")

    comparison = []
    for sector in sorted(all_sectors):
        port_pct = round(portfolio_sectors.get(sector, 0.0), 2)
        sp500_pct = SP500_SECTOR_WEIGHTS.get(sector, 0.0)
        delta = round(port_pct - sp500_pct, 2)

        if delta > 5:
            status = "overweight"
        elif delta < -5:
            status = "underweight"
        else:
            status = "neutral"

        comparison.append({
            "sector": sector,
            "portfolio_pct": port_pct,
            "sp500_pct": sp500_pct,
            "delta": delta,
            "status": status,
        })

    # Sort by absolute delta descending (most deviant sectors first)
    comparison.sort(key=lambda x: abs(x["delta"]), reverse=True)

    return {
        "available": True,
        "sectors": comparison,
        "sp500_reference_date": "Mid-2025",
    }


def compute_risk_score(df: pd.DataFrame) -> dict:
    """
    Weighted-average beta → normalized 0–100 risk score.
    Holdings missing beta are excluded from the beta calculation
    but still included in the portfolio.
    """
    beta_df = df[df["beta"].notna() & (df["beta"] > 0)].copy()

    if beta_df.empty:
        return {
            "score": 50,
            "label": "Unavailable",
            "color": "#94a3b8",
            "weighted_beta": None,
            "description": (
                "Beta data could not be retrieved for your holdings. "
                "Beta measures sensitivity to market movements — "
                "a beta of 1.0 means the asset historically moves with the market."
            ),
            "coverage_pct": 0,
        }

    # Reweight beta_df to sum to 1.0 among holdings with valid beta
    total_beta_weight = beta_df["weight"].sum()
    beta_df = beta_df.copy()
    beta_df["normalized_weight"] = beta_df["weight"] / total_beta_weight
    weighted_beta = float((beta_df["beta"] * beta_df["normalized_weight"]).sum())

    # Map beta to 0–100 score
    score = _beta_to_score(weighted_beta)

    # Find risk band
    label, color = "Market-Like", "#fbbf24"
    for lo, hi, _, _, band_label, band_color in RISK_BANDS:
        if lo <= weighted_beta < hi:
            label, color = band_label, band_color
            break

    coverage_pct = round((beta_df["weight"].sum() / df["weight"].sum()) * 100, 1)

    return {
        "score": score,
        "label": label,
        "color": color,
        "weighted_beta": round(weighted_beta, 3),
        "description": _risk_description(label, weighted_beta),
        "coverage_pct": coverage_pct,
    }


def compute_diversification_score(df: pd.DataFrame) -> dict:
    """
    Composite 0–100 score from three components:
      1. Number of holdings (40% weight)
      2. Sector spread (35% weight)
      3. Inverse-HHI (25% weight)
    """
    # Component 1: Number of holdings (30 holdings → max score)
    n = len(df)
    n_score = min(100, (n / 30) * 100)

    # Component 2: Number of distinct sectors
    if "sector" in df.columns:
        sectors = df[df["sector"] != "Unknown"]["sector"].nunique()
        sector_score = min(100, (sectors / 10) * 100)
    else:
        sector_score = 50  # neutral

    # Component 3: Inverse HHI (1 - HHI) * 100
    hhi = float((df["weight"] ** 2).sum())
    hhi_score = (1 - hhi) * 100

    # Weighted composite
    composite = round(0.40 * n_score + 0.35 * sector_score + 0.25 * hhi_score, 1)
    composite = max(0, min(100, composite))

    if composite >= 75:
        label, color = "Well Diversified", "#10b981"
    elif composite >= 50:
        label, color = "Moderately Diversified", "#fbbf24"
    elif composite >= 25:
        label, color = "Concentrated", "#f97316"
    else:
        label, color = "Highly Concentrated", "#ef4444"

    return {
        "score": composite,
        "label": label,
        "color": color,
        "components": {
            "holdings_score": round(n_score, 1),
            "sector_score": round(sector_score, 1),
            "hhi_score": round(hhi_score, 1),
        },
    }


def get_age_guidance(df: pd.DataFrame, age: int) -> dict:
    """
    Provide educational age-based allocation observations.
    NOT financial advice — purely observational.
    """
    if not age or age < 18 or age > 100:
        return None

    # Traditional rule-of-thumb: bond allocation ≈ age or (110 - age) in stocks
    # Modern: (120 - age) for equities, rest in bonds/stable assets
    suggested_equity_pct = max(20, min(95, 120 - age))
    suggested_bond_pct = 100 - suggested_equity_pct

    # Compute actual equity weight
    equity_df = df[df["asset_class"].isin(["Stock", "ETF"])].copy()
    actual_equity_pct = round(equity_df["weight"].sum() * 100, 1)
    actual_bond_pct = round(100 - actual_equity_pct, 1)

    delta = actual_equity_pct - suggested_equity_pct

    if abs(delta) <= 10:
        alignment = "aligned"
        tone = "Your equity allocation is broadly in line with common age-based guidelines."
    elif delta > 10:
        alignment = "aggressive"
        tone = (
            f"At age {age}, a common guideline suggests roughly {suggested_equity_pct}% in equities. "
            f"Your portfolio appears more equity-heavy at {actual_equity_pct}%, which "
            f"may amplify both upside and downside swings."
        )
    else:
        alignment = "conservative"
        tone = (
            f"At age {age}, a common guideline suggests roughly {suggested_equity_pct}% in equities. "
            f"Your portfolio appears more conservative at {actual_equity_pct}%, "
            f"which may reduce growth potential but also volatility."
        )

    return {
        "age": age,
        "actual_equity_pct": actual_equity_pct,
        "actual_bond_pct": actual_bond_pct,
        "suggested_equity_pct": suggested_equity_pct,
        "suggested_bond_pct": suggested_bond_pct,
        "alignment": alignment,
        "tone": tone,
        "disclaimer": (
            "This is an educational observation based on simplified heuristics, "
            "not personalized financial advice."
        ),
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _beta_to_score(beta: float) -> int:
    """Map weighted beta to 0–100 risk score using the RISK_BANDS table."""
    for lo, hi, score_lo, score_hi, _, _ in RISK_BANDS:
        if lo <= beta < hi:
            fraction = (beta - lo) / (hi - lo)
            return round(score_lo + fraction * (score_hi - score_lo))
    return 95  # extremely high beta


def _risk_description(label: str, beta: float) -> str:
    descriptions = {
        "Very Low": (
            f"Your portfolio's weighted beta of {beta:.2f} suggests low sensitivity "
            f"to broad market movements. Portfolios in this range may hold significant "
            f"cash, bonds, or low-volatility equities."
        ),
        "Low": (
            f"A weighted beta of {beta:.2f} indicates below-market sensitivity. "
            f"Your portfolio may move less dramatically than the broader market in both directions."
        ),
        "Below Average": (
            f"Your weighted beta of {beta:.2f} suggests slightly below-average market sensitivity."
        ),
        "Market-Like": (
            f"A weighted beta of {beta:.2f} is close to 1.0, meaning your portfolio "
            f"historically tends to track the broad market fairly closely."
        ),
        "Above Average": (
            f"Your weighted beta of {beta:.2f} suggests above-average market sensitivity. "
            f"Expect amplified swings in both directions relative to the broad market."
        ),
        "High": (
            f"A weighted beta of {beta:.2f} indicates a high-risk profile. "
            f"Your portfolio has historically moved significantly more than the market."
        ),
        "Very High": (
            f"Your weighted beta of {beta:.2f} suggests very high market sensitivity. "
            f"This type of profile can experience dramatic swings during volatile periods."
        ),
    }
    return descriptions.get(label, f"Weighted beta: {beta:.2f}")
