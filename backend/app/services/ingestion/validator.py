"""
Validator & Enricher: validates tickers against yfinance and enriches each holding
with sector, industry, asset class, beta, dividend yield, expense ratio, etc.

Beta resolution order:
  1. Curated static beta map (reliable for known ETFs/stocks)
  2. yfinance beta field
  3. Asset-class fallback estimate
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
# Curated ETF/stock metadata
# ---------------------------------------------------------------------------
ETF_METADATA: dict[str, dict] = {
    # Broad US Market
    "SPY":   {"sector": "Broad Market", "theme": "US Large Cap Blend",       "broad_market": True,  "beta": 1.00, "name": "SPDR S&P 500 ETF Trust"},
    "IVV":   {"sector": "Broad Market", "theme": "US Large Cap Blend",       "broad_market": True,  "beta": 1.00, "name": "iShares Core S&P 500 ETF"},
    "VOO":   {"sector": "Broad Market", "theme": "US Large Cap Blend",       "broad_market": True,  "beta": 1.00, "name": "Vanguard S&P 500 ETF"},
    "VTI":   {"sector": "Broad Market", "theme": "US Total Market",          "broad_market": True,  "beta": 1.00, "name": "Vanguard Total Stock Market ETF"},
    "ITOT":  {"sector": "Broad Market", "theme": "US Total Market",          "broad_market": True,  "beta": 1.00, "name": "iShares Core S&P Total US Stock Market ETF"},
    "SCHB":  {"sector": "Broad Market", "theme": "US Total Market",          "broad_market": True,  "beta": 1.00, "name": "Schwab US Broad Market ETF"},
    "SPLG":  {"sector": "Broad Market", "theme": "US Large Cap Blend",       "broad_market": True,  "beta": 1.00, "name": "SPDR Portfolio S&P 500 ETF"},
    # Growth / Nasdaq
    "QQQ":   {"sector": "Technology",   "theme": "Nasdaq-100",               "broad_market": False, "beta": 1.15, "name": "Invesco QQQ Trust"},
    "QQQM":  {"sector": "Technology",   "theme": "Nasdaq-100",               "broad_market": False, "beta": 1.15, "name": "Invesco Nasdaq 100 ETF"},
    "VUG":   {"sector": "Broad Market", "theme": "US Large Cap Growth",      "broad_market": True,  "beta": 1.05, "name": "Vanguard Growth ETF"},
    "SCHG":  {"sector": "Broad Market", "theme": "US Large Cap Growth",      "broad_market": True,  "beta": 1.05, "name": "Schwab US Large-Cap Growth ETF"},
    "VOOG":  {"sector": "Broad Market", "theme": "S&P 500 Growth",           "broad_market": True,  "beta": 1.05, "name": "Vanguard S&P 500 Growth ETF"},
    "SPYG":  {"sector": "Broad Market", "theme": "S&P 500 Growth",           "broad_market": True,  "beta": 1.05, "name": "SPDR Portfolio S&P 500 Growth ETF"},
    # Value
    "VTV":   {"sector": "Broad Market", "theme": "US Large Cap Value",       "broad_market": True,  "beta": 0.90, "name": "Vanguard Value ETF"},
    "SCHV":  {"sector": "Broad Market", "theme": "US Large Cap Value",       "broad_market": True,  "beta": 0.90, "name": "Schwab US Large-Cap Value ETF"},
    "IVE":   {"sector": "Broad Market", "theme": "S&P 500 Value",            "broad_market": True,  "beta": 0.90, "name": "iShares S&P 500 Value ETF"},
    "SPYV":  {"sector": "Broad Market", "theme": "S&P 500 Value",            "broad_market": True,  "beta": 0.90, "name": "SPDR Portfolio S&P 500 Value ETF"},
    # International
    "VEA":   {"sector": "International","theme": "Developed Markets",        "broad_market": True,  "beta": 0.85, "name": "Vanguard Developed Markets ETF"},
    "VWO":   {"sector": "International","theme": "Emerging Markets",         "broad_market": True,  "beta": 0.85, "name": "Vanguard Emerging Markets ETF"},
    "IEMG":  {"sector": "International","theme": "Emerging Markets",         "broad_market": True,  "beta": 0.85, "name": "iShares Core MSCI Emerging Markets ETF"},
    "EFA":   {"sector": "International","theme": "EAFE Developed Markets",   "broad_market": True,  "beta": 0.85, "name": "iShares MSCI EAFE ETF"},
    "VT":    {"sector": "Broad Market", "theme": "Global Total Market",      "broad_market": True,  "beta": 0.95, "name": "Vanguard Total World Stock ETF"},
    "ACWI":  {"sector": "Broad Market", "theme": "Global Total Market",      "broad_market": True,  "beta": 0.95, "name": "iShares MSCI ACWI ETF"},
    "FEMR":  {"sector": "International","theme": "Emerging Markets",         "broad_market": True,  "beta": 0.85, "name": "Fidelity Enhanced Emerging Markets ETF"},
    "FENI":  {"sector": "International","theme": "International Developed",  "broad_market": True,  "beta": 0.85, "name": "Fidelity Enhanced International ETF"},
    # Sector ETFs
    "XLK":   {"sector": "Technology",   "theme": "Tech Sector",              "broad_market": False, "beta": 1.20, "name": "Technology Select Sector SPDR Fund"},
    "VGT":   {"sector": "Technology",   "theme": "Tech Sector",              "broad_market": False, "beta": 1.20, "name": "Vanguard Information Technology ETF"},
    "SMH":   {"sector": "Technology",   "theme": "Semiconductors",           "broad_market": False, "beta": 1.45, "name": "VanEck Semiconductor ETF"},
    "SOXX":  {"sector": "Technology",   "theme": "Semiconductors",           "broad_market": False, "beta": 1.45, "name": "iShares Semiconductor ETF"},
    "DRAM":  {"sector": "Technology",   "theme": "Memory / Semiconductors",  "broad_market": False, "beta": 1.50, "name": "Roundhill Memory ETF"},
    "XLV":   {"sector": "Healthcare",   "theme": "Healthcare Sector",        "broad_market": False, "beta": 0.70, "name": "Health Care Select Sector SPDR Fund"},
    "VHT":   {"sector": "Healthcare",   "theme": "Healthcare Sector",        "broad_market": False, "beta": 0.70, "name": "Vanguard Health Care ETF"},
    "IBB":   {"sector": "Healthcare",   "theme": "Biotech",                  "broad_market": False, "beta": 0.90, "name": "iShares Biotechnology ETF"},
    "XLF":   {"sector": "Financials",   "theme": "Financials Sector",        "broad_market": False, "beta": 1.10, "name": "Financial Select Sector SPDR Fund"},
    "VFH":   {"sector": "Financials",   "theme": "Financials Sector",        "broad_market": False, "beta": 1.10, "name": "Vanguard Financials ETF"},
    "XLE":   {"sector": "Energy",       "theme": "Energy Sector",            "broad_market": False, "beta": 1.05, "name": "Energy Select Sector SPDR Fund"},
    "VDE":   {"sector": "Energy",       "theme": "Energy Sector",            "broad_market": False, "beta": 1.05, "name": "Vanguard Energy ETF"},
    "URA":   {"sector": "Energy",       "theme": "Uranium / Nuclear Energy", "broad_market": False, "beta": 1.30, "name": "Global X Uranium ETF"},
    "ICLN":  {"sector": "Energy",       "theme": "Clean Energy",             "broad_market": False, "beta": 1.10, "name": "iShares Global Clean Energy ETF"},
    "XLRE":  {"sector": "Real Estate",  "theme": "REITs",                    "broad_market": False, "beta": 0.80, "name": "Real Estate Select Sector SPDR Fund"},
    "VNQ":   {"sector": "Real Estate",  "theme": "REITs",                    "broad_market": False, "beta": 0.80, "name": "Vanguard Real Estate ETF"},
    "XLU":   {"sector": "Utilities",    "theme": "Utilities Sector",         "broad_market": False, "beta": 0.55, "name": "Utilities Select Sector SPDR Fund"},
    "XLB":   {"sector": "Materials",    "theme": "Materials Sector",         "broad_market": False, "beta": 1.05, "name": "Materials Select Sector SPDR Fund"},
    "XLI":   {"sector": "Industrials",  "theme": "Industrials Sector",       "broad_market": False, "beta": 1.05, "name": "Industrial Select Sector SPDR Fund"},
    "XLY":   {"sector": "Consumer Discretionary", "theme": "Consumer Disc.", "broad_market": False, "beta": 1.15, "name": "Consumer Discret Select Sector SPDR"},
    "XLP":   {"sector": "Consumer Staples", "theme": "Consumer Staples",     "broad_market": False, "beta": 0.60, "name": "Consumer Staples Select Sector SPDR"},
    "XLC":   {"sector": "Communication Services", "theme": "Comm. Services", "broad_market": False, "beta": 1.05, "name": "Communication Services Select Sector SPDR"},
    # Thematic
    "AIS":   {"sector": "Technology",   "theme": "Artificial Intelligence",  "broad_market": False, "beta": 1.25, "name": "VictoryShares AI & Tech ETF"},
    "BOTZ":  {"sector": "Technology",   "theme": "Robotics & AI",            "broad_market": False, "beta": 1.30, "name": "Global X Robotics & AI ETF"},
    "AIQ":   {"sector": "Technology",   "theme": "Artificial Intelligence",  "broad_market": False, "beta": 1.25, "name": "Global X Artificial Intelligence ETF"},
    "ARKK":  {"sector": "Technology",   "theme": "Disruptive Innovation",    "broad_market": False, "beta": 1.60, "name": "ARK Innovation ETF"},
    "DRIV":  {"sector": "Consumer Discretionary", "theme": "EV / Autonomous","broad_market": False, "beta": 1.20, "name": "Global X Autonomous & EV ETF"},
    "CIBR":  {"sector": "Technology",   "theme": "Cybersecurity",            "broad_market": False, "beta": 1.10, "name": "First Trust NASDAQ Cybersecurity ETF"},
    "HACK":  {"sector": "Technology",   "theme": "Cybersecurity",            "broad_market": False, "beta": 1.10, "name": "ETFMG Prime Cyber Security ETF"},
    "CLOU":  {"sector": "Technology",   "theme": "Cloud Computing",          "broad_market": False, "beta": 1.20, "name": "Global X Cloud Computing ETF"},
    "SKYY":  {"sector": "Technology",   "theme": "Cloud Computing",          "broad_market": False, "beta": 1.20, "name": "First Trust Cloud Computing ETF"},
    "UFO":   {"sector": "Industrials",  "theme": "Space",                    "broad_market": False, "beta": 1.15, "name": "Procure Space ETF"},
    "ARKX":  {"sector": "Industrials",  "theme": "Space Exploration",        "broad_market": False, "beta": 1.20, "name": "ARK Space Exploration ETF"},
    "LIT":   {"sector": "Materials",    "theme": "Lithium & Batteries",      "broad_market": False, "beta": 1.25, "name": "Global X Lithium & Battery Tech ETF"},
    "TAN":   {"sector": "Energy",       "theme": "Solar Energy",             "broad_market": False, "beta": 1.15, "name": "Invesco Solar ETF"},
    # Dividend / Income
    "SCHD":  {"sector": "Broad Market", "theme": "Dividend Income",          "broad_market": True,  "beta": 0.75, "name": "Schwab US Dividend Equity ETF"},
    "VYM":   {"sector": "Broad Market", "theme": "High Dividend Yield",      "broad_market": True,  "beta": 0.75, "name": "Vanguard High Dividend Yield ETF"},
    "JEPI":  {"sector": "Broad Market", "theme": "Equity Premium Income",    "broad_market": True,  "beta": 0.50, "name": "JPMorgan Equity Premium Income ETF"},
    "JEPQ":  {"sector": "Broad Market", "theme": "Equity Premium Income",    "broad_market": True,  "beta": 0.55, "name": "JPMorgan Nasdaq Equity Premium Income ETF"},
    "DVY":   {"sector": "Broad Market", "theme": "Select Dividend",          "broad_market": True,  "beta": 0.75, "name": "iShares Select Dividend ETF"},
    "HDV":   {"sector": "Broad Market", "theme": "High Dividend",            "broad_market": True,  "beta": 0.65, "name": "iShares Core High Dividend ETF"},
    # Low Vol
    "USMV":  {"sector": "Broad Market", "theme": "Min Volatility",           "broad_market": True,  "beta": 0.65, "name": "iShares MSCI USA Min Vol Factor ETF"},
    "SPLV":  {"sector": "Broad Market", "theme": "Low Volatility",           "broad_market": True,  "beta": 0.65, "name": "Invesco S&P 500 Low Volatility ETF"},
    # Bonds
    "AGG":   {"sector": "Fixed Income", "theme": "US Aggregate Bonds",       "broad_market": True,  "beta": 0.05, "name": "iShares Core US Aggregate Bond ETF"},
    "BND":   {"sector": "Fixed Income", "theme": "US Total Bond Market",     "broad_market": True,  "beta": 0.05, "name": "Vanguard Total Bond Market ETF"},
    "TLT":   {"sector": "Fixed Income", "theme": "Long-Term Treasuries",     "broad_market": False, "beta": -0.10,"name": "iShares 20+ Year Treasury Bond ETF"},
    "SHY":   {"sector": "Fixed Income", "theme": "Short-Term Treasuries",    "broad_market": True,  "beta": 0.02, "name": "iShares 1-3 Year Treasury Bond ETF"},
    "HYG":   {"sector": "Fixed Income", "theme": "High Yield Bonds",         "broad_market": False, "beta": 0.35, "name": "iShares iBoxx High Yield Corporate Bond ETF"},
    # Asian Markets
    "MCHI":  {"sector": "International","theme": "China",                    "broad_market": False, "beta": 0.80, "name": "iShares MSCI China ETF"},
    "KWEB":  {"sector": "International","theme": "China Internet",           "broad_market": False, "beta": 0.90, "name": "KraneShares CSI China Internet ETF"},
    "INDA":  {"sector": "International","theme": "India",                    "broad_market": False, "beta": 0.80, "name": "iShares MSCI India ETF"},
    "EWJ":   {"sector": "International","theme": "Japan",                    "broad_market": False, "beta": 0.75, "name": "iShares MSCI Japan ETF"},
}

# Asset-class fallback betas when ticker not in static map and yfinance returns nothing
ASSET_CLASS_BETA_FALLBACK = {
    "ETF":         1.00,
    "Stock":       1.10,
    "Mutual Fund": 0.95,
    "Fixed Income":0.05,
    "Crypto":      2.00,
    "Unknown":     1.00,
}


async def validate_and_enrich(df: pd.DataFrame) -> pd.DataFrame:
    tickers = df["ticker"].unique().tolist()
    enrichments = await _fetch_all(tickers)

    for field in UNKNOWN_ENRICHMENT:
        df[field] = df["ticker"].map(lambda t: enrichments.get(t, UNKNOWN_ENRICHMENT)[field])

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

    # Apply asset-class beta fallback for any holding still missing beta
    def _fill_beta(row):
        if row.get("beta") is not None:
            return row["beta"]
        asset_class = row.get("asset_class", "Unknown") or "Unknown"
        return ASSET_CLASS_BETA_FALLBACK.get(asset_class, 1.00)

    df["beta"] = df.apply(_fill_beta, axis=1)

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
    static = ETF_METADATA.get(ticker)
    if static:
        return {
            **UNKNOWN_ENRICHMENT,
            "name": static.get("name"),
            "asset_class": "ETF",
            "sector": static.get("sector", "Unknown"),
            "industry": static.get("theme", "Unknown"),
            "beta": static.get("beta"),
            "valid": True,
        }
    return {**UNKNOWN_ENRICHMENT}


def _fetch_ticker_sync(ticker: str) -> dict:
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

        # Sector: static → yfinance → name inference
        if static and static.get("sector") and static["sector"] != "Unknown":
            sector = static["sector"]
        elif info.get("sector"):
            sector = info["sector"]
        else:
            sector = _infer_sector_from_name(
                info.get("longName", "") or info.get("shortName", "")
            ) or "Unknown"

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

        # Beta: static map → yfinance → None (fallback applied later)
        beta = None
        if static and static.get("beta") is not None:
            beta = static["beta"]
        elif info.get("beta") is not None:
            beta = float(info["beta"])

        return {
            "name": name,
            "asset_class": asset_class,
            "sector": sector,
            "industry": industry,
            "beta": beta,
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
