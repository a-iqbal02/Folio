"""
Validator & Enricher: validates tickers against yfinance and enriches each holding
with sector, industry, asset class, beta, dividend yield, expense ratio, etc.

ETF sector resolution order:
  1. Curated static map (most reliable for known ETFs)
  2. yfinance sector field (works for stocks, rarely for ETFs)
  3. Name-based keyword inference (last resort)
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

import pandas as pd
import yfinance as yf

from app.config import settings

logger = logging.getLogger(__name__)

_ticker_cache: dict[str, dict] = {}

QUOTE_TYPE_MAP = {
    "EQUITY": "Stock",
    "ETF": "ETF",
    "MUTUALFUND": "Mutual Fund",
    "FUTURE": "Futures",
    "INDEX": "Index",
    "CRYPTOCURRENCY": "Crypto",
    "CURRENCY": "Currency",
    "OPTION": "Option",
}

UNKNOWN_ENRICHMENT = {
    "name": None,
    "asset_class": "Unknown",
    "sector": "Unknown",
    "industry": "Unknown",
    "beta": None,
    "dividend_yield": None,
    "expense_ratio": None,
    "current_price": None,
    "valid": False,
}

# ---------------------------------------------------------------------------
# Curated ETF metadata — sector, theme, and diversification tier
# Covers the most common ETFs held by retail investors.
# "broad_market" = True means this ETF is inherently diversified (suppress
# single-position concentration warnings).
# ---------------------------------------------------------------------------
ETF_METADATA: dict[str, dict] = {
    # Broad US Market
    "SPY":   {"sector": "Broad Market", "theme": "US Large Cap Blend",       "broad_market": True,  "name": "SPDR S&P 500 ETF Trust"},
    "IVV":   {"sector": "Broad Market", "theme": "US Large Cap Blend",       "broad_market": True,  "name": "iShares Core S&P 500 ETF"},
    "VOO":   {"sector": "Broad Market", "theme": "US Large Cap Blend",       "broad_market": True,  "name": "Vanguard S&P 500 ETF"},
    "VTI":   {"sector": "Broad Market", "theme": "US Total Market",          "broad_market": True,  "name": "Vanguard Total Stock Market ETF"},
    "ITOT":  {"sector": "Broad Market", "theme": "US Total Market",          "broad_market": True,  "name": "iShares Core S&P Total US Stock Market ETF"},
    "SCHB":  {"sector": "Broad Market", "theme": "US Total Market",          "broad_market": True,  "name": "Schwab US Broad Market ETF"},
    "SPLG":  {"sector": "Broad Market", "theme": "US Large Cap Blend",       "broad_market": True,  "name": "SPDR Portfolio S&P 500 ETF"},
    # Growth / Nasdaq
    "QQQ":   {"sector": "Technology",   "theme": "Nasdaq-100",               "broad_market": False, "name": "Invesco QQQ Trust"},
    "QQQM":  {"sector": "Technology",   "theme": "Nasdaq-100",               "broad_market": False, "name": "Invesco Nasdaq 100 ETF"},
    "VUG":   {"sector": "Broad Market", "theme": "US Large Cap Growth",      "broad_market": True,  "name": "Vanguard Growth ETF"},
    "SCHG":  {"sector": "Broad Market", "theme": "US Large Cap Growth",      "broad_market": True,  "name": "Schwab US Large-Cap Growth ETF"},
    "SPYG":  {"sector": "Broad Market", "theme": "S&P 500 Growth",           "broad_market": True,  "name": "SPDR Portfolio S&P 500 Growth ETF"},
    "VOOG":  {"sector": "Broad Market", "theme": "S&P 500 Growth",           "broad_market": True,  "name": "Vanguard S&P 500 Growth ETF"},
    # Value
    "VTV":   {"sector": "Broad Market", "theme": "US Large Cap Value",       "broad_market": True,  "name": "Vanguard Value ETF"},
    "SCHV":  {"sector": "Broad Market", "theme": "US Large Cap Value",       "broad_market": True,  "name": "Schwab US Large-Cap Value ETF"},
    "IVE":   {"sector": "Broad Market", "theme": "S&P 500 Value",            "broad_market": True,  "name": "iShares S&P 500 Value ETF"},
    "SPYV":  {"sector": "Broad Market", "theme": "S&P 500 Value",            "broad_market": True,  "name": "SPDR Portfolio S&P 500 Value ETF"},
    # International
    "VEA":   {"sector": "International","theme": "Developed Markets",        "broad_market": True,  "name": "Vanguard Developed Markets ETF"},
    "VWO":   {"sector": "International","theme": "Emerging Markets",         "broad_market": True,  "name": "Vanguard Emerging Markets ETF"},
    "IEMG":  {"sector": "International","theme": "Emerging Markets",         "broad_market": True,  "name": "iShares Core MSCI Emerging Markets ETF"},
    "EFA":   {"sector": "International","theme": "EAFE Developed Markets",   "broad_market": True,  "name": "iShares MSCI EAFE ETF"},
    "VT":    {"sector": "Broad Market", "theme": "Global Total Market",      "broad_market": True,  "name": "Vanguard Total World Stock ETF"},
    "ACWI":  {"sector": "Broad Market", "theme": "Global Total Market",      "broad_market": True,  "name": "iShares MSCI ACWI ETF"},
    "FEMR":  {"sector": "International","theme": "Emerging Markets",         "broad_market": True,  "name": "Fidelity Enhanced Emerging Markets ETF"},
    "FENI":  {"sector": "International","theme": "International Developed",  "broad_market": True,  "name": "Fidelity Enhanced International ETF"},
    # Sector ETFs
    "XLK":   {"sector": "Technology",   "theme": "Tech Sector",              "broad_market": False, "name": "Technology Select Sector SPDR Fund"},
    "VGT":   {"sector": "Technology",   "theme": "Tech Sector",              "broad_market": False, "name": "Vanguard Information Technology ETF"},
    "SMH":   {"sector": "Technology",   "theme": "Semiconductors",           "broad_market": False, "name": "VanEck Semiconductor ETF"},
    "SOXX":  {"sector": "Technology",   "theme": "Semiconductors",           "broad_market": False, "name": "iShares Semiconductor ETF"},
    "DRAM":  {"sector": "Technology",   "theme": "Memory / Semiconductors",  "broad_market": False, "name": "Roundhill Memory ETF"},
    "XLV":   {"sector": "Healthcare",   "theme": "Healthcare Sector",        "broad_market": False, "name": "Health Care Select Sector SPDR Fund"},
    "VHT":   {"sector": "Healthcare",   "theme": "Healthcare Sector",        "broad_market": False, "name": "Vanguard Health Care ETF"},
    "IBB":   {"sector": "Healthcare",   "theme": "Biotech",                  "broad_market": False, "name": "iShares Biotechnology ETF"},
    "XLF":   {"sector": "Financials",   "theme": "Financials Sector",        "broad_market": False, "name": "Financial Select Sector SPDR Fund"},
    "VFH":   {"sector": "Financials",   "theme": "Financials Sector",        "broad_market": False, "name": "Vanguard Financials ETF"},
    "XLE":   {"sector": "Energy",       "theme": "Energy Sector",            "broad_market": False, "name": "Energy Select Sector SPDR Fund"},
    "VDE":   {"sector": "Energy",       "theme": "Energy Sector",            "broad_market": False, "name": "Vanguard Energy ETF"},
    "URA":   {"sector": "Energy",       "theme": "Uranium / Nuclear Energy", "broad_market": False, "name": "Global X Uranium ETF"},
    "ICLN":  {"sector": "Energy",       "theme": "Clean Energy",             "broad_market": False, "name": "iShares Global Clean Energy ETF"},
    "XLRE":  {"sector": "Real Estate",  "theme": "REITs",                    "broad_market": False, "name": "Real Estate Select Sector SPDR Fund"},
    "VNQ":   {"sector": "Real Estate",  "theme": "REITs",                    "broad_market": False, "name": "Vanguard Real Estate ETF"},
    "XLU":   {"sector": "Utilities",    "theme": "Utilities Sector",         "broad_market": False, "name": "Utilities Select Sector SPDR Fund"},
    "XLB":   {"sector": "Materials",    "theme": "Materials Sector",         "broad_market": False, "name": "Materials Select Sector SPDR Fund"},
    "XLI":   {"sector": "Industrials",  "theme": "Industrials Sector",       "broad_market": False, "name": "Industrial Select Sector SPDR Fund"},
    "XLY":   {"sector": "Consumer Discretionary", "theme": "Consumer Disc.", "broad_market": False, "name": "Consumer Discret Select Sector SPDR"},
    "XLP":   {"sector": "Consumer Staples", "theme": "Consumer Staples",     "broad_market": False, "name": "Consumer Staples Select Sector SPDR"},
    "XLC":   {"sector": "Communication Services", "theme": "Comm. Services", "broad_market": False, "name": "Communication Services Select Sector SPDR"},
    # Thematic
    "AIS":   {"sector": "Technology",   "theme": "Artificial Intelligence",  "broad_market": False, "name": "VictoryShares AI & Tech ETF"},
    "BOTZ":  {"sector": "Technology",   "theme": "Robotics & AI",            "broad_market": False, "name": "Global X Robotics & AI ETF"},
    "AIQ":   {"sector": "Technology",   "theme": "Artificial Intelligence",  "broad_market": False, "name": "Global X Artificial Intelligence ETF"},
    "ARKK":  {"sector": "Technology",   "theme": "Disruptive Innovation",    "broad_market": False, "name": "ARK Innovation ETF"},
    "DRIV":  {"sector": "Consumer Discretionary", "theme": "EV / Autonomous","broad_market": False, "name": "Global X Autonomous & EV ETF"},
    # Dividend / Income
    "SCHD":  {"sector": "Broad Market", "theme": "Dividend Income",          "broad_market": True,  "name": "Schwab US Dividend Equity ETF"},
    "VYM":   {"sector": "Broad Market", "theme": "High Dividend Yield",      "broad_market": True,  "name": "Vanguard High Dividend Yield ETF"},
    "JEPI":  {"sector": "Broad Market", "theme": "Equity Premium Income",    "broad_market": True,  "name": "JPMorgan Equity Premium Income ETF"},
    "DVY":   {"sector": "Broad Market", "theme": "Select Dividend",          "broad_market": True,  "name": "iShares Select Dividend ETF"},
    # Low Vol
    "USMV":  {"sector": "Broad Market", "theme": "Min Volatility",           "broad_market": True,  "name": "iShares MSCI USA Min Vol Factor ETF"},
    "SPLV":  {"sector": "Broad Market", "theme": "Low Volatility",           "broad_market": True,  "name": "Invesco S&P 500 Low Volatility ETF"},
    # Bonds
    "AGG":   {"sector": "Fixed Income", "theme": "US Aggregate Bonds",       "broad_market": True,  "name": "iShares Core US Aggregate Bond ETF"},
    "BND":   {"sector": "Fixed Income", "theme": "US Total Bond Market",     "broad_market": True,  "name": "Vanguard Total Bond Market ETF"},
    "TLT":   {"sector": "Fixed Income", "theme": "Long-Term Treasuries",     "broad_market": False, "name": "iShares 20+ Year Treasury Bond ETF"},
    "SHY":   {"sector": "Fixed Income", "theme": "Short-Term Treasuries",    "broad_market": True,  "name": "iShares 1-3 Year Treasury Bond ETF"},
}


async def validate_and_enrich(df: pd.DataFrame) -> pd.DataFrame:
    tickers = df["ticker"].unique().tolist()
    enrichments = await _fetch_all(tickers)

    for field in UNKNOWN_ENRICHMENT:
        df[field] = df["ticker"].map(lambda t: enrichments.get(t, UNKNOWN_ENRICHMENT)[field])

    # Add broad_market flag — used by concentration warnings
    df["broad_market"] = df["ticker"].map(
        lambda t: ETF_METADATA.get(t, {}).get("broad_market", False)
    )
    df["etf_theme"] = df["ticker"].map(
        lambda t: ETF_METADATA.get(t, {}).get("theme", None)
    )

    # Fill name gaps
    if "name" in df.columns:
        df["name"] = df.apply(
            lambda r: r["name"] if pd.notna(r.get("name")) and str(r.get("name", "")).strip()
            else enrichments.get(r["ticker"], UNKNOWN_ENRICHMENT)["name"],
            axis=1,
        )
    else:
        df["name"] = df["ticker"].map(lambda t: enrichments.get(t, UNKNOWN_ENRICHMENT)["name"])

    return df


async def _fetch_all(tickers: list[str]) -> dict[str, dict]:
    semaphore = asyncio.Semaphore(settings.ticker_concurrency)
    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor(max_workers=settings.ticker_concurrency)

    async def fetch_one(ticker: str) -> tuple[str, dict]:
        if ticker in _ticker_cache:
            return ticker, _ticker_cache[ticker]
        async with semaphore:
            try:
                result = await asyncio.wait_for(
                    loop.run_in_executor(executor, _fetch_ticker_sync, ticker),
                    timeout=settings.ticker_fetch_timeout,
                )
            except asyncio.TimeoutError:
                logger.warning(f"Timeout fetching {ticker}")
                result = _from_static(ticker)
            except Exception as e:
                logger.warning(f"Error fetching {ticker}: {e}")
                result = _from_static(ticker)
            _ticker_cache[ticker] = result
            return ticker, result

    tasks = [fetch_one(t) for t in tickers]
    results = await asyncio.gather(*tasks)
    return dict(results)


def _from_static(ticker: str) -> dict:
    """Return enrichment from the curated static map when yfinance fails."""
    static = ETF_METADATA.get(ticker)
    if static:
        return {
            **UNKNOWN_ENRICHMENT,
            "name": static.get("name"),
            "asset_class": "ETF",
            "sector": static.get("sector", "Unknown"),
            "industry": static.get("theme", "Unknown"),
            "valid": True,
        }
    return {**UNKNOWN_ENRICHMENT}


def _fetch_ticker_sync(ticker: str) -> dict:
    """Synchronous yfinance fetch — run in executor. Static map takes priority for ETFs."""
    # Check static map first — more reliable for ETF metadata
    static = ETF_METADATA.get(ticker)

    try:
        info = yf.Ticker(ticker).info
        if not info or len(info) < 5:
            return _from_static(ticker)

        quote_type = info.get("quoteType", "")
        asset_class = QUOTE_TYPE_MAP.get(quote_type, quote_type or "Unknown")

        expense_ratio = (
            info.get("annualReportExpenseRatio")
            or info.get("fundOperatingExpenseRatio")
        )

        # Sector resolution: static map → yfinance → name inference
        if static and static.get("sector") and static["sector"] != "Unknown":
            sector = static["sector"]
        elif info.get("sector"):
            sector = info["sector"]
        else:
            sector = _infer_sector_from_name(
                info.get("longName", "") or info.get("shortName", "")
            ) or "Unknown"

        # Industry: use ETF theme from static map if available
        industry = (
            (static.get("theme") if static else None)
            or info.get("industry")
            or "Unknown"
        )

        name = (
            (static.get("name") if static else None)
            or info.get("longName")
            or info.get("shortName")
            or None
        )

        return {
            "name": name,
            "asset_class": asset_class,
            "sector": sector,
            "industry": industry,
            "beta": info.get("beta") or None,
            "dividend_yield": info.get("dividendYield") or None,
            "expense_ratio": expense_ratio,
            "current_price": info.get("currentPrice") or info.get("regularMarketPrice") or None,
            "valid": True,
        }

    except Exception as e:
        logger.debug(f"yfinance error for {ticker}: {e}")
        return _from_static(ticker)


_SECTOR_KEYWORDS = {
    "Technology": ["tech", "software", "semiconductor", "cloud", "cyber", "ai", "digital", "nasdaq", "innovation"],
    "Healthcare": ["health", "bio", "pharma", "medical", "gene", "genomic"],
    "Financials": ["bank", "finance", "financial", "insurance", "invest"],
    "Energy": ["energy", "oil", "gas", "solar", "wind", "clean energy", "uranium", "nuclear"],
    "Industrials": ["industrial", "defense", "aerospace", "manufacturing"],
    "Consumer Discretionary": ["consumer discretionary", "retail", "auto", "luxury", "ev", "electric vehicle"],
    "Real Estate": ["reit", "real estate", "property"],
    "Utilities": ["utility", "utilities", "electric", "water"],
    "Materials": ["material", "mining", "metal", "chemical"],
    "Communication Services": ["media", "telecom", "communication", "wireless"],
    "Consumer Staples": ["staple", "food", "beverage", "household"],
    "International": ["international", "emerging", "global", "world", "eafe", "developed markets"],
    "Broad Market": ["s&p 500", "total market", "total stock", "total world", "dividend", "growth etf", "value etf"],
    "Fixed Income": ["bond", "treasury", "fixed income", "aggregate", "yield"],
}


def _infer_sector_from_name(name: str) -> str | None:
    if not name:
        return None
    name_lower = name.lower()
    for sector, keywords in _SECTOR_KEYWORDS.items():
        if any(kw in name_lower for kw in keywords):
            return sector
    return None
