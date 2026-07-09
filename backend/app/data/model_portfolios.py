"""
Curated model portfolios, one per Phase C risk bucket. Holdings are real,
low-cost, liquid ETFs already known to the codebase (see etf_universe.py
for their expense ratios). Weights approximate the target asset mix for
each risk bucket defined in services/risk/scoring.py.
"""

MODEL_PORTFOLIOS: list[dict] = [
    {
        "id": "capital-preserver",
        "name": "Capital Preserver",
        "risk_bucket": "Conservative",
        "description": "A bond-heavy mix built to limit downside swings while still keeping some growth exposure.",
        "holdings": [
            {"ticker": "BND", "weight": 50},
            {"ticker": "VTI", "weight": 20},
            {"ticker": "VXUS", "weight": 10},
            {"ticker": "SGOV", "weight": 15},
            {"ticker": "GLD", "weight": 5},
        ],
        "tags": ["conservative", "income", "low volatility"],
    },
    {
        "id": "steady-saver",
        "name": "Steady Saver",
        "risk_bucket": "Moderate",
        "description": "Meaningful bond ballast paired with a growing equity slice for investors who want some upside with a cushion.",
        "holdings": [
            {"ticker": "BND", "weight": 45},
            {"ticker": "VTI", "weight": 35},
            {"ticker": "VXUS", "weight": 15},
            {"ticker": "GLD", "weight": 5},
        ],
        "tags": ["moderate", "balanced-income"],
    },
    {
        "id": "balanced-builder",
        "name": "Balanced Builder",
        "risk_bucket": "Balanced",
        "description": "An even split between growth and stability across US equities, international equities, and bonds.",
        "holdings": [
            {"ticker": "VTI", "weight": 45},
            {"ticker": "BND", "weight": 30},
            {"ticker": "VXUS", "weight": 20},
            {"ticker": "GLD", "weight": 5},
        ],
        "tags": ["balanced", "core"],
    },
    {
        "id": "growth-seeker",
        "name": "Growth Seeker",
        "risk_bucket": "Growth",
        "description": "Equity-heavy with a growth tilt via Nasdaq-100 exposure, for investors focused on long-term appreciation.",
        "holdings": [
            {"ticker": "VTI", "weight": 40},
            {"ticker": "VXUS", "weight": 25},
            {"ticker": "QQQM", "weight": 15},
            {"ticker": "BND", "weight": 15},
            {"ticker": "GLD", "weight": 5},
        ],
        "tags": ["growth", "tech-tilt"],
    },
    {
        "id": "aggressive-growth",
        "name": "Aggressive Growth",
        "risk_bucket": "Aggressive",
        "description": "No bonds — maximum equity exposure with a growth tilt, for investors comfortable with large swings.",
        "holdings": [
            {"ticker": "VTI", "weight": 45},
            {"ticker": "VXUS", "weight": 30},
            {"ticker": "QQQM", "weight": 20},
            {"ticker": "GLD", "weight": 5},
        ],
        "tags": ["aggressive", "high growth"],
    },
]

# Maps each holding ticker to one of the same 4 asset categories used by the
# risk questionnaire (services/risk/scoring.py), so "allocation breakdown"
# here is directly comparable to a risk-quiz result's target allocation.
# This is an asset-class split, not a GICS sector drill-down of each fund's
# underlying holdings -- that would require a paid look-through data
# provider, which is out of scope (see Phase B's free-data-only decision).
TICKER_ASSET_CLASS: dict[str, str] = {
    "VTI": "US Equities",
    "QQQM": "US Equities",
    "VXUS": "International Equities",
    "BND": "Bonds",
    "SGOV": "Bonds",
    "GLD": "Commodities",
}
