"""
Ingestion Pipeline: the single entry point for all data sources.

Flow:
    Input (bytes or text)
      → detect file type
      → extract raw DataFrame (extractor module)
      → clean PII (cleaner module)
      → normalize columns to standard schema (normalizer module)
      → validate + enrich tickers (validator module)
      → return enriched DataFrame

All file types produce the same standardized DataFrame schema.
Nothing downstream needs to know what format the data came in as.
"""

import logging
from enum import Enum
from typing import Optional

import pandas as pd

from app.services.ingestion.extractors import (
    extract_csv,
    extract_excel,
    extract_pdf,
    extract_image,
    extract_text,
)
from app.services.ingestion.cleaner import clean_pii
from app.services.ingestion.normalizer import normalize_columns
from app.services.ingestion.validator import validate_and_enrich

logger = logging.getLogger(__name__)


class FileType(str, Enum):
    CSV = "csv"
    EXCEL = "excel"
    PDF = "pdf"
    IMAGE = "image"
    TEXT = "text"


def detect_file_type(filename: str, content_type: str) -> FileType:
    name = filename.lower()
    ct = (content_type or "").lower()

    if name.endswith(".csv") or "csv" in ct:
        return FileType.CSV
    if name.endswith((".xlsx", ".xls")) or "spreadsheet" in ct or "excel" in ct:
        return FileType.EXCEL
    if name.endswith(".pdf") or "pdf" in ct:
        return FileType.PDF
    if name.endswith((".png", ".jpg", ".jpeg", ".webp")) or "image" in ct:
        return FileType.IMAGE
    if name.endswith(".txt") or "text/plain" in ct:
        return FileType.TEXT

    # Unknown extension — try CSV as best guess
    return FileType.CSV


async def run_pipeline(
    file_bytes: bytes,
    filename: str,
    content_type: str,
) -> pd.DataFrame:
    """
    Full ingestion pipeline for file uploads.
    Returns enriched DataFrame or raises ValueError with a user-friendly message.
    """
    file_type = detect_file_type(filename, content_type)
    logger.info(f"Ingesting '{filename}' as {file_type}")

    # Step 1: Extract raw DataFrame
    raw_df = _extract(file_bytes, file_type, content_type)

    # Step 2: Clean PII
    cleaned_df = clean_pii(raw_df)

    # Step 3: Normalize columns
    normalized_df = normalize_columns(cleaned_df)

    # Step 4: Validate + enrich tickers
    enriched_df = await validate_and_enrich(normalized_df)

    _validate_output(enriched_df)
    return enriched_df


async def run_text_pipeline(text: str) -> pd.DataFrame:
    """Pipeline for pasted text input."""
    raw_df = extract_text(text)
    cleaned_df = clean_pii(raw_df)
    normalized_df = normalize_columns(cleaned_df)
    enriched_df = await validate_and_enrich(normalized_df)
    _validate_output(enriched_df)
    return enriched_df


async def run_manual_pipeline(holdings: list[dict]) -> pd.DataFrame:
    """
    Pipeline for manual entry.
    holdings: list of {ticker, shares, cost_basis?, market_value?}
    If market_value is missing, we fetch price from yfinance and compute it.
    """
    records = []
    for h in holdings:
        ticker = h.get("ticker", "").strip().upper()
        if not ticker:
            continue
        records.append({
            "ticker": ticker,
            "shares": h.get("shares"),
            "cost_basis": h.get("cost_basis"),
            "market_value": h.get("market_value"),
        })

    if not records:
        raise ValueError("No valid holdings provided.")

    raw_df = pd.DataFrame(records)

    # For rows missing market_value, fetch price per ticker individually
    missing_mv_mask = raw_df["market_value"].isna() | (raw_df["market_value"] == 0)
    if missing_mv_mask.any():
        tickers_to_price = raw_df.loc[missing_mv_mask, "ticker"].unique().tolist()
        price_map = _fetch_prices_individually(tickers_to_price)
        for idx in raw_df[missing_mv_mask].index:
            ticker = raw_df.at[idx, "ticker"]
            shares = raw_df.at[idx, "shares"]
            price = price_map.get(ticker)
            if price and shares:
                raw_df.at[idx, "market_value"] = round(float(price) * float(shares), 2)

    # Drop rows still missing market_value
    raw_df = raw_df[raw_df["market_value"].notna() & (raw_df["market_value"] > 0)].copy()

    if raw_df.empty:
        raise ValueError(
            "Could not auto-fetch market prices. "
            "Please fill in the Market Value column manually for each holding."
        )

    normalized_df = normalize_columns(raw_df)
    enriched_df = await validate_and_enrich(normalized_df)
    _validate_output(enriched_df)
    return enriched_df


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract(file_bytes: bytes, file_type: FileType, content_type: str) -> pd.DataFrame:
    """Route to the correct extractor."""
    if file_type == FileType.CSV:
        return extract_csv(file_bytes)
    elif file_type == FileType.EXCEL:
        return extract_excel(file_bytes)
    elif file_type == FileType.PDF:
        return extract_pdf(file_bytes)
    elif file_type == FileType.IMAGE:
        return extract_image(file_bytes, content_type)
    elif file_type == FileType.TEXT:
        return extract_text(file_bytes.decode("utf-8", errors="replace"))
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


def _validate_output(df: pd.DataFrame) -> None:
    """Raise if the enriched DataFrame is unusable."""
    if df.empty:
        raise ValueError("No valid holdings were found after processing.")
    if "ticker" not in df.columns:
        raise ValueError("Processing produced no ticker column.")
    if "market_value" not in df.columns:
        raise ValueError("Processing produced no market_value column.")
    if df["market_value"].sum() == 0:
        raise ValueError("All market values are zero — cannot compute portfolio weights.")


def _fetch_prices_individually(tickers: list[str]) -> dict[str, float]:
    """
    Fetch current price for each ticker individually.
    More resilient than batch — a single bad ticker won't break the others.
    Includes a sanity check: rejects prices that seem implausibly high for
    a fractional share (avoids yfinance returning nav/par values for some tickers).
    """
    import yfinance as yf
    result = {}
    for ticker in tickers:
        try:
            t = yf.Ticker(ticker)
            # fast_info is more reliable and faster than .info for prices
            fi = t.fast_info
            price = None
            if hasattr(fi, 'last_price') and fi.last_price and fi.last_price > 0:
                price = float(fi.last_price)
            
            if not price:
                info = t.info
                price = (
                    info.get("currentPrice")
                    or info.get("regularMarketPrice")
                    or info.get("previousClose")
                )
                if price:
                    price = float(price)

            if price and price > 0:
                # Sanity check: reject prices over $100,000 (likely a data error)
                if price > 100_000:
                    logger.warning(f"Rejected implausible price for {ticker}: ${price}")
                else:
                    result[ticker] = price
                    logger.info(f"Fetched price for {ticker}: ${price:.2f}")
            else:
                logger.warning(f"No price found for {ticker}")
        except Exception as e:
            logger.warning(f"Price fetch failed for {ticker}: {e}")
    return result


def _batch_fetch_prices(tickers: list[str]) -> dict[str, float]:
    """Fetch current prices for a list of tickers synchronously."""
    return _fetch_prices_individually(tickers)
