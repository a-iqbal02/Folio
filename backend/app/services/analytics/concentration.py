"""
Concentration Analysis:
  - Herfindahl-Hirschman Index (HHI)
  - Top holdings
  - Smart concentration warnings — distinguishes broad ETFs from single stocks
  - Sector concentration warnings
"""

import pandas as pd


# Tickers always treated as broad/diversified regardless of enrichment data
KNOWN_BROAD_ETFS = {
    "SPY", "IVV", "VOO", "VTI", "ITOT", "SCHB", "SPLG",
    "VUG", "SCHG", "SPYG", "VOOG", "VTV", "SCHV", "IVE", "SPYV",
    "VEA", "VWO", "IEMG", "EFA", "VT", "ACWI", "FEMR", "FENI",
    "SCHD", "VYM", "JEPI", "DVY", "USMV", "SPLV",
    "AGG", "BND", "SHY",
}


def compute_concentration(df: pd.DataFrame) -> dict:
    weights = df["weight"].values

    hhi = float((weights ** 2).sum())
    hhi_score = round(hhi * 100, 1)

    if hhi < 0.10:
        concentration_label, concentration_color = "Low", "green"
    elif hhi < 0.20:
        concentration_label, concentration_color = "Moderate", "yellow"
    elif hhi < 0.35:
        concentration_label, concentration_color = "High", "orange"
    else:
        concentration_label, concentration_color = "Very High", "red"

    top_n = min(10, len(df))
    top_holdings = (
        df.nlargest(top_n, "market_value")[
            ["ticker", "name", "market_value", "weight", "sector", "asset_class"]
        ]
        .copy()
        .assign(weight_pct=lambda d: (d["weight"] * 100).round(2))
        .to_dict("records")
    )

    top5_weight = float(df.nlargest(5, "weight")["weight"].sum() * 100)
    top10_weight = float(df.nlargest(10, "weight")["weight"].sum() * 100)

    warnings = _generate_warnings(df)

    return {
        "hhi": round(hhi, 4),
        "hhi_score": hhi_score,
        "concentration_label": concentration_label,
        "concentration_color": concentration_color,
        "top5_weight_pct": round(top5_weight, 1),
        "top10_weight_pct": round(top10_weight, 1),
        "top_holdings": top_holdings,
        "warnings": warnings,
    }


def _is_broad_etf(row: pd.Series) -> bool:
    """
    Return True if this holding is a broadly diversified fund that
    should not trigger single-position concentration warnings.

    Logic:
      1. Ticker is in the hardcoded broad ETF set
      2. broad_market flag set by validator (from curated ETF map)
      3. Asset class is ETF and sector is 'Broad Market'
    """
    ticker = str(row.get("ticker", "")).upper()
    if ticker in KNOWN_BROAD_ETFS:
        return True
    if row.get("broad_market") is True:
        return True
    if row.get("asset_class") == "ETF" and row.get("sector") in ("Broad Market", "International"):
        return True
    return False


def _generate_warnings(df: pd.DataFrame) -> list[dict]:
    warnings = []

    for _, row in df.iterrows():
        pct = round(row["weight"] * 100, 1)
        ticker = row["ticker"]
        asset_class = row.get("asset_class", "Unknown")

        if row["weight"] <= 0.15:
            continue

        if _is_broad_etf(row):
            # Broad market ETF at high weight — informational only, not a risk warning
            if pct >= 40:
                warnings.append({
                    "type": "etf_weight_info",
                    "severity": "info",
                    "ticker": ticker,
                    "title": f"{ticker} is {pct}% of your portfolio",
                    "description": (
                        f"{ticker} is a broadly diversified fund, so a {pct}% position "
                        f"does not carry the same risk as a single-stock concentration. "
                        f"However, at this weight it largely determines your portfolio's "
                        f"overall performance — consider whether that aligns with your goals."
                    ),
                })
            # Below 40% in a broad ETF — no warning at all
            continue

        # Sector ETF at high weight — moderate concern
        if asset_class == "ETF":
            sector = row.get("sector", "Unknown")
            theme = row.get("industry", row.get("etf_theme", ""))
            severity = "high" if pct > 35 else "medium"
            warnings.append({
                "type": "sector_etf_concentration",
                "severity": severity,
                "ticker": ticker,
                "title": f"{ticker} is {pct}% of your portfolio",
                "description": (
                    f"{ticker} is a sector/thematic ETF ({theme or sector}), "
                    f"representing {pct}% of your portfolio. "
                    f"Unlike broad market ETFs, sector ETFs concentrate exposure "
                    f"in a specific industry, amplifying both upside and downside "
                    f"from sector-specific events."
                ),
            })
            continue

        # Individual stock — full concentration warning
        severity = "high" if pct > 25 else "medium"
        warnings.append({
            "type": "single_stock",
            "severity": severity,
            "ticker": ticker,
            "title": f"{ticker} is {pct}% of your portfolio",
            "description": (
                f"A single stock representing {pct}% of your portfolio creates "
                f"meaningful idiosyncratic risk — the company's performance alone "
                f"could significantly move your overall portfolio. "
                f"Diversification guidelines typically suggest keeping individual "
                f"stock positions below 5–10% to limit single-company exposure."
            ),
        })

    # Sector concentration (excluding Broad Market and Unknown)
    if "sector" in df.columns:
        sector_weights = df.groupby("sector")["weight"].sum()
        for sector, weight in sector_weights.items():
            if sector in ("Unknown", "Broad Market", "International", "Fixed Income", None):
                continue
            if weight > 0.45:
                pct = round(weight * 100, 1)
                warnings.append({
                    "type": "sector_concentration",
                    "severity": "high" if weight > 0.60 else "medium",
                    "ticker": None,
                    "title": f"{sector} sector is {pct}% of your portfolio",
                    "description": (
                        f"Your portfolio has {pct}% allocated to {sector}. "
                        f"The S&P 500 weights this sector at roughly "
                        f"{_sp500_sector_weight(sector)}%. "
                        f"Heavy sector concentration amplifies sector-specific volatility "
                        f"and correlation between your holdings."
                    ),
                })

    # Very few holdings
    if len(df) <= 2:
        warnings.append({
            "type": "low_diversification",
            "severity": "high",
            "ticker": None,
            "title": "Very few holdings detected",
            "description": (
                f"Your portfolio contains {len(df)} holding(s). "
                f"Even if each is a diversified ETF, having so few positions "
                f"limits your ability to rebalance or manage risk across different objectives."
            ),
        })

    return warnings


def _sp500_sector_weight(sector: str) -> str:
    return {
        "Technology": "31%", "Financials": "13%", "Healthcare": "13%",
        "Consumer Discretionary": "10%", "Industrials": "9%",
        "Communication Services": "9%", "Consumer Staples": "6%",
        "Energy": "4%", "Real Estate": "2%", "Utilities": "2%", "Materials": "2%",
    }.get(sector, "~3–5%")
