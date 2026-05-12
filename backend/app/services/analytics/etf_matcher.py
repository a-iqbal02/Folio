"""
ETF Recommendations, Overlap Detection, and Goal-Based Suggestions.

Three recommendation types:
  1. Sector consolidation — 3+ individual stocks in one sector → suggest ETF
  2. ETF overlap — holding two funds tracking the same index
  3. Broad market — highly concentrated portfolios
  4. Goal-based — curated ETF suggestions based on user's stated investment goals
"""

from __future__ import annotations
import pandas as pd


# ---------------------------------------------------------------------------
# Curated ETF reference data
# ---------------------------------------------------------------------------

SECTOR_ETFS: dict[str, list[dict]] = {
    "Technology": [
        {"ticker": "XLK",  "name": "Technology Select Sector SPDR",    "expense_ratio": 0.10, "description": "Large-cap US tech — Apple, Microsoft, Nvidia"},
        {"ticker": "VGT",  "name": "Vanguard Information Technology ETF","expense_ratio": 0.10, "description": "Broad US tech sector, 300+ holdings"},
        {"ticker": "QQQ",  "name": "Invesco QQQ (Nasdaq-100)",           "expense_ratio": 0.20, "description": "Top 100 non-financial Nasdaq companies"},
        {"ticker": "SOXX", "name": "iShares Semiconductor ETF",          "expense_ratio": 0.35, "description": "30 US semiconductor companies"},
    ],
    "Healthcare": [
        {"ticker": "XLV", "name": "Health Care Select Sector SPDR", "expense_ratio": 0.10, "description": "Large-cap US healthcare companies"},
        {"ticker": "VHT", "name": "Vanguard Health Care ETF",        "expense_ratio": 0.10, "description": "Broad US healthcare, 400+ holdings"},
        {"ticker": "IBB", "name": "iShares Biotechnology ETF",       "expense_ratio": 0.45, "description": "US biotech and pharmaceutical companies"},
    ],
    "Financials": [
        {"ticker": "XLF", "name": "Financial Select Sector SPDR", "expense_ratio": 0.10, "description": "Large-cap US banks, insurance, and investment firms"},
        {"ticker": "VFH", "name": "Vanguard Financials ETF",       "expense_ratio": 0.10, "description": "Broad US financial sector"},
        {"ticker": "KBE", "name": "SPDR S&P Bank ETF",             "expense_ratio": 0.35, "description": "US commercial banks and thrifts"},
    ],
    "Consumer Discretionary": [
        {"ticker": "XLY", "name": "Consumer Discret Select Sector SPDR", "expense_ratio": 0.10, "description": "Large-cap US consumer discretionary"},
        {"ticker": "VCR", "name": "Vanguard Consumer Discretionary ETF", "expense_ratio": 0.10, "description": "Broad US consumer discretionary"},
    ],
    "Industrials": [
        {"ticker": "XLI", "name": "Industrial Select Sector SPDR", "expense_ratio": 0.10, "description": "Large-cap US industrials"},
        {"ticker": "VIS", "name": "Vanguard Industrials ETF",       "expense_ratio": 0.10, "description": "Broad US industrials"},
    ],
    "Energy": [
        {"ticker": "XLE",  "name": "Energy Select Sector SPDR",      "expense_ratio": 0.10, "description": "Large-cap US oil, gas, and energy"},
        {"ticker": "VDE",  "name": "Vanguard Energy ETF",             "expense_ratio": 0.10, "description": "Broad US energy sector"},
        {"ticker": "ICLN", "name": "iShares Global Clean Energy ETF", "expense_ratio": 0.40, "description": "Global renewable and clean energy companies"},
    ],
    "Real Estate": [
        {"ticker": "XLRE", "name": "Real Estate Select Sector SPDR", "expense_ratio": 0.10, "description": "US REITs and real estate companies"},
        {"ticker": "VNQ",  "name": "Vanguard Real Estate ETF",        "expense_ratio": 0.12, "description": "Broad US real estate investment trusts"},
    ],
    "Utilities": [
        {"ticker": "XLU", "name": "Utilities Select Sector SPDR", "expense_ratio": 0.10, "description": "Large-cap US utilities"},
        {"ticker": "VPU", "name": "Vanguard Utilities ETF",        "expense_ratio": 0.10, "description": "Broad US utilities"},
    ],
    "Materials": [
        {"ticker": "XLB", "name": "Materials Select Sector SPDR", "expense_ratio": 0.10, "description": "Large-cap US materials"},
        {"ticker": "VAW", "name": "Vanguard Materials ETF",        "expense_ratio": 0.10, "description": "Broad US materials"},
    ],
    "Communication Services": [
        {"ticker": "XLC", "name": "Communication Services Select Sector SPDR", "expense_ratio": 0.10, "description": "US communication and media companies"},
        {"ticker": "VOX", "name": "Vanguard Communication Services ETF",        "expense_ratio": 0.10, "description": "Broad US communication services"},
    ],
    "Consumer Staples": [
        {"ticker": "XLP", "name": "Consumer Staples Select Sector SPDR", "expense_ratio": 0.10, "description": "Large-cap US consumer staples"},
        {"ticker": "VDC", "name": "Vanguard Consumer Staples ETF",        "expense_ratio": 0.10, "description": "Broad US consumer staples"},
    ],
}

BROAD_MARKET_ETFS = [
    {"ticker": "VTI",  "name": "Vanguard Total Stock Market ETF",    "expense_ratio": 0.03, "description": "Every US publicly traded company in one fund"},
    {"ticker": "VOO",  "name": "Vanguard S&P 500 ETF",               "expense_ratio": 0.03, "description": "500 largest US companies — lowest cost S&P 500"},
    {"ticker": "IVV",  "name": "iShares Core S&P 500 ETF",           "expense_ratio": 0.03, "description": "S&P 500 with iShares — ultra low cost"},
    {"ticker": "SPY",  "name": "SPDR S&P 500 ETF Trust",             "expense_ratio": 0.09, "description": "The original S&P 500 ETF — most liquid in the world"},
    {"ticker": "SCHB", "name": "Schwab US Broad Market ETF",         "expense_ratio": 0.03, "description": "Total US market at Schwab's rock-bottom cost"},
    {"ticker": "ITOT", "name": "iShares Core S&P Total US Stock Mkt","expense_ratio": 0.03, "description": "Total US market with iShares"},
]

# Goal-based ETF recommendations — curated by investment objective
GOAL_ETF_MAP: dict[str, dict] = {
    "growth": {
        "label": "Growth",
        "keywords": ["growth", "aggressive", "long term", "long-term", "appreciate", "capital gains", "maximize returns", "young", "decades"],
        "etfs": [
            {"ticker": "VUG",  "name": "Vanguard Growth ETF",              "expense_ratio": 0.04, "description": "US large-cap growth stocks — low cost, diversified"},
            {"ticker": "QQQ",  "name": "Invesco QQQ (Nasdaq-100)",          "expense_ratio": 0.20, "description": "Top 100 non-financial Nasdaq — tech-heavy growth"},
            {"ticker": "QQQM", "name": "Invesco Nasdaq 100 ETF",           "expense_ratio": 0.15, "description": "Same as QQQ but lower cost — better for long-term holders"},
            {"ticker": "SCHG", "name": "Schwab US Large-Cap Growth ETF",   "expense_ratio": 0.04, "description": "Large-cap growth at ultra-low cost"},
            {"ticker": "SPYG", "name": "SPDR Portfolio S&P 500 Growth ETF","expense_ratio": 0.04, "description": "S&P 500 growth stocks only"},
        ],
        "rationale": "Growth-oriented ETFs focus on companies expected to increase earnings faster than the market average. They tend to carry higher volatility but have historically offered stronger long-term returns.",
    },
    "income": {
        "label": "Income / Dividends",
        "keywords": ["income", "dividend", "yield", "passive income", "cash flow", "retire", "retirement", "monthly", "quarterly"],
        "etfs": [
            {"ticker": "SCHD", "name": "Schwab US Dividend Equity ETF",      "expense_ratio": 0.06, "description": "High-quality US dividend payers — very popular for income"},
            {"ticker": "VYM",  "name": "Vanguard High Dividend Yield ETF",   "expense_ratio": 0.06, "description": "Broad high-yield US dividend stocks"},
            {"ticker": "JEPI", "name": "JPMorgan Equity Premium Income ETF", "expense_ratio": 0.35, "description": "Monthly income via covered calls — lower volatility"},
            {"ticker": "DVY",  "name": "iShares Select Dividend ETF",        "expense_ratio": 0.38, "description": "US stocks with consistently high dividends"},
            {"ticker": "HDV",  "name": "iShares Core High Dividend ETF",     "expense_ratio": 0.08, "description": "High dividend yield with quality screen"},
        ],
        "rationale": "Income ETFs prioritize generating regular cash distributions through dividends or options strategies. They typically hold more mature, stable companies and may be useful for investors seeking consistent cash flow.",
    },
    "stability": {
        "label": "Stability / Low Volatility",
        "keywords": ["stable", "stability", "safe", "low risk", "conservative", "protect", "defensive", "preserve", "capital preservation", "volatility"],
        "etfs": [
            {"ticker": "USMV", "name": "iShares MSCI USA Min Vol Factor ETF","expense_ratio": 0.15, "description": "US stocks historically less volatile than the market"},
            {"ticker": "SPLV", "name": "Invesco S&P 500 Low Volatility ETF", "expense_ratio": 0.25, "description": "100 S&P 500 stocks with lowest realized volatility"},
            {"ticker": "XLU",  "name": "Utilities Select Sector SPDR",       "expense_ratio": 0.10, "description": "Defensive utilities sector — historically low beta"},
            {"ticker": "XLP",  "name": "Consumer Staples Select Sector SPDR","expense_ratio": 0.10, "description": "Consumer staples — food, household goods — recession resistant"},
            {"ticker": "AGG",  "name": "iShares Core US Aggregate Bond ETF", "expense_ratio": 0.03, "description": "Broad US bond market — typically lower correlation to stocks"},
        ],
        "rationale": "Stability-focused ETFs aim to reduce portfolio volatility by holding lower-beta stocks or bonds. They may lag in bull markets but tend to hold up better during downturns.",
    },
    "international": {
        "label": "International Diversification",
        "keywords": ["international", "global", "world", "foreign", "emerging", "diversify", "outside us", "non-us", "overseas", "europe", "asia"],
        "etfs": [
            {"ticker": "VEA",  "name": "Vanguard Developed Markets ETF",       "expense_ratio": 0.05, "description": "Developed markets outside the US — Europe, Japan, Australia"},
            {"ticker": "VWO",  "name": "Vanguard Emerging Markets Stock ETF",  "expense_ratio": 0.08, "description": "Emerging market economies — China, India, Brazil"},
            {"ticker": "IEMG", "name": "iShares Core MSCI Emerging Markets",   "expense_ratio": 0.09, "description": "Broad emerging markets coverage"},
            {"ticker": "EFA",  "name": "iShares MSCI EAFE ETF",                "expense_ratio": 0.32, "description": "Europe, Australasia, and Far East developed markets"},
            {"ticker": "VT",   "name": "Vanguard Total World Stock ETF",       "expense_ratio": 0.07, "description": "Every publicly traded company in the world — one ticker"},
        ],
        "rationale": "International ETFs add geographic diversification, reducing reliance on US market performance. Developed market funds offer stability; emerging market funds offer higher growth potential with higher risk.",
    },
    "thematic": {
        "label": "Thematic / Sector Trends",
        "keywords": ["ai", "artificial intelligence", "tech", "technology", "semiconductor", "crypto", "bitcoin", "clean energy", "solar", "ev", "electric vehicle", "space", "biotech", "genomics", "innovation", "disruptive", "future", "trend"],
        "etfs": [
            {"ticker": "BOTZ", "name": "Global X Robotics & AI ETF",          "expense_ratio": 0.68, "description": "Robotics, automation, and AI companies globally"},
            {"ticker": "AIQ",  "name": "Global X Artificial Intelligence ETF", "expense_ratio": 0.68, "description": "Companies developing or using AI technology"},
            {"ticker": "SOXX", "name": "iShares Semiconductor ETF",            "expense_ratio": 0.35, "description": "30 US semiconductor companies — backbone of AI"},
            {"ticker": "ICLN", "name": "iShares Global Clean Energy ETF",      "expense_ratio": 0.40, "description": "Solar, wind, and clean energy globally"},
            {"ticker": "ARKK", "name": "ARK Innovation ETF",                   "expense_ratio": 0.75, "description": "Disruptive innovation — high risk, high volatility"},
            {"ticker": "DRIV", "name": "Global X Autonomous & EV ETF",         "expense_ratio": 0.68, "description": "Electric vehicles and autonomous driving companies"},
        ],
        "rationale": "Thematic ETFs target specific trends or technologies. They can offer concentrated exposure to a thesis you believe in, but typically carry higher fees and more volatility than broad-market funds.",
    },
    "value": {
        "label": "Value Investing",
        "keywords": ["value", "undervalued", "cheap", "bargain", "warren buffett", "fundamental", "p/e", "price to earnings"],
        "etfs": [
            {"ticker": "VTV",  "name": "Vanguard Value ETF",                  "expense_ratio": 0.04, "description": "US large-cap value stocks — extremely low cost"},
            {"ticker": "SCHV", "name": "Schwab US Large-Cap Value ETF",       "expense_ratio": 0.04, "description": "Large-cap value at Schwab's low cost"},
            {"ticker": "IVE",  "name": "iShares S&P 500 Value ETF",           "expense_ratio": 0.18, "description": "S&P 500 value segment"},
            {"ticker": "SPYV", "name": "SPDR Portfolio S&P 500 Value ETF",    "expense_ratio": 0.04, "description": "Value-tilted S&P 500 — very low cost"},
        ],
        "rationale": "Value ETFs hold stocks trading below their estimated intrinsic value based on metrics like P/E ratio, P/B ratio, or dividend yield. They have historically outperformed growth over very long time horizons.",
    },
}

ETF_OVERLAP_GROUPS = [
    {"label": "S&P 500 Trackers",        "tickers": {"SPY", "IVV", "VOO", "SPLG", "CSPX"}},
    {"label": "Total Market",             "tickers": {"VTI", "ITOT", "SCHB", "SPTM"}},
    {"label": "Nasdaq-100 / Growth",      "tickers": {"QQQ", "QQQM", "ONEQ"}},
    {"label": "Tech Sector",              "tickers": {"XLK", "VGT", "IYW"}},
    {"label": "Healthcare Sector",        "tickers": {"XLV", "VHT", "IYH"}},
    {"label": "International Developed",  "tickers": {"EFA", "VEA", "SCHF", "IDEV"}},
    {"label": "Emerging Markets",         "tickers": {"EEM", "VWO", "IEMG", "SCHE"}},
    {"label": "Real Estate",              "tickers": {"VNQ", "XLRE", "IYR", "SCHH"}},
    {"label": "Dividend Income",          "tickers": {"SCHD", "VYM", "DVY", "HDV"}},
]


def get_etf_recommendations(df: pd.DataFrame, goals: str = "") -> dict:
    """
    Returns ETF recommendations based on portfolio composition and optional user goals.
    goals: free-text string describing the user's investment objectives.
    """
    recommendations = []
    user_tickers = set(df["ticker"].str.upper())

    # --- 1. Sector consolidation ---
    if "sector" in df.columns and "asset_class" in df.columns:
        stocks_df = df[df["asset_class"] == "Stock"].copy()
        sector_counts = stocks_df.groupby("sector")["ticker"].count()

        for sector, count in sector_counts.items():
            if count >= 3 and sector in SECTOR_ETFS and sector not in ("Unknown", None):
                sector_weight = round(df[df["sector"] == sector]["weight"].sum() * 100, 1)
                sector_tickers = df[df["sector"] == sector]["ticker"].tolist()
                etf_options = [e for e in SECTOR_ETFS[sector] if e["ticker"] not in user_tickers][:2]

                if etf_options:
                    recommendations.append({
                        "type": "consolidation",
                        "title": f"Consider a {sector} ETF for your {count} individual positions",
                        "description": (
                            f"You hold {count} individual {sector} stocks "
                            f"({', '.join(sector_tickers[:5])}{'...' if len(sector_tickers) > 5 else ''}) "
                            f"representing {sector_weight}% of your portfolio. "
                            f"A single sector ETF could provide similar exposure "
                            f"with built-in diversification across more companies."
                        ),
                        "etf_options": etf_options,
                        "sector": sector,
                    })

    # --- 2. ETF overlap detection ---
    user_etfs = set(df[df["asset_class"] == "ETF"]["ticker"].str.upper()) if "asset_class" in df.columns else set()
    for group in ETF_OVERLAP_GROUPS:
        overlap = user_etfs & group["tickers"]
        if len(overlap) >= 2:
            recommendations.append({
                "type": "overlap",
                "title": f"Potential ETF overlap: {group['label']}",
                "description": (
                    f"You hold {', '.join(sorted(overlap))}, which track substantially "
                    f"similar indexes ({group['label']}). "
                    f"Holding both may not provide additional diversification "
                    f"beyond holding just one, and doubles the exposure."
                ),
                "etf_options": [],
                "overlapping_tickers": list(overlap),
            })

    # --- 3. Broad market suggestion for concentrated portfolios ---
    hhi = float((df["weight"] ** 2).sum())
    if hhi > 0.25 and len(df) < 10:
        broad_options = [e for e in BROAD_MARKET_ETFS if e["ticker"] not in user_tickers][:3]
        if broad_options:
            recommendations.append({
                "type": "broad_market",
                "title": "Consider broad market exposure for core diversification",
                "description": (
                    "Your portfolio is concentrated in a small number of positions. "
                    "A low-cost broad market ETF can provide exposure to hundreds or thousands "
                    "of companies with a single ticker, often at expense ratios under 0.05%."
                ),
                "etf_options": broad_options,
            })

    # --- 4. Goal-based recommendations ---
    goal_recs = _get_goal_based_recommendations(goals, user_tickers) if goals and goals.strip() else []
    recommendations.extend(goal_recs)

    return {
        "recommendations": recommendations,
        "goals_analyzed": bool(goals and goals.strip()),
        "disclaimer": (
            "ETF suggestions are educational observations based on portfolio composition and stated goals. "
            "They are not investment recommendations. Always review a fund's prospectus, "
            "understand its risks, and consider your own financial situation before making any changes."
        ),
    }


def _get_goal_based_recommendations(goals: str, user_tickers: set) -> list[dict]:
    """Match user's free-text goals to curated ETF categories."""
    goals_lower = goals.lower()
    matched = []

    for goal_key, goal_data in GOAL_ETF_MAP.items():
        # Check if any keyword appears in the user's goals text
        if any(kw in goals_lower for kw in goal_data["keywords"]):
            etf_options = [
                e for e in goal_data["etfs"]
                if e["ticker"] not in user_tickers
            ][:4]

            if etf_options:
                matched.append({
                    "type": "goal_based",
                    "goal_label": goal_data["label"],
                    "title": f"ETFs aligned with your goal: {goal_data['label']}",
                    "description": goal_data["rationale"],
                    "etf_options": etf_options,
                })

    # If goals were entered but nothing matched, give a general suggestion
    if not matched and goals.strip():
        general_options = [e for e in BROAD_MARKET_ETFS if e["ticker"] not in user_tickers][:3]
        matched.append({
            "type": "goal_based",
            "goal_label": "General",
            "title": "General portfolio building blocks based on your goals",
            "description": (
                "Based on your stated goals, here are broadly useful low-cost ETFs "
                "that form the core of many long-term portfolios. "
                "They offer wide diversification at minimal cost."
            ),
            "etf_options": general_options,
        })

    return matched
