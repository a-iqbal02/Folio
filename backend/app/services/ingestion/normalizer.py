"""
Normalizer: maps arbitrary brokerage column names to our standard schema.

Standard schema columns:
    ticker        — required
    name          — optional
    shares        — optional (can infer from market_value / price)
    market_value  — required
    cost_basis    — optional
    gain_loss     — optional
    gain_loss_pct — optional
    weight        — computed after normalization
    price         — optional (used to infer market_value if missing)

Uses rapidfuzz for fuzzy matching when exact matches fail.
"""

import re
import logging
import pandas as pd
from rapidfuzz import process, fuzz

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Column alias registry
# Each key is the standard field name; the list contains known aliases.
# ---------------------------------------------------------------------------

COLUMN_ALIASES: dict[str, list[str]] = {
    "ticker": [
        "symbol", "ticker", "stock", "security", "tick", "instrument",
        "cusip", "isin", "secid", "asset", "stock symbol",
    ],
    "name": [
        "name", "description", "desc", "company", "fund name", "fund",
        "holding", "investment", "security name", "long name", "issuer",
        "product name",
    ],
    "shares": [
        "shares", "quantity", "qty", "units", "position", "amount",
        "shares held", "number of shares", "share qty", "num shares",
        "shares/units",
    ],
    "market_value": [
        "market value", "current value", "value", "mkt val", "mkt value",
        "total value", "current market value", "market val", "port value",
        "portfolio value", "total market value", "ending value",
        "market value ($)", "current value ($)", "value ($)",
    ],
    "cost_basis": [
        "cost basis", "cost", "avg cost", "average cost", "total cost",
        "book value", "cost basis total", "purchase price", "original cost",
        "avg price", "adjusted cost", "cost per share", "basis",
    ],
    "gain_loss": [
        "gain/loss", "gain loss", "unrealized gain", "unrealized g/l",
        "profit/loss", "p/l", "unrealized p&l", "total gain",
        "total gain/loss", "unrealized gain/loss", "unrealized pnl",
        "gain or loss", "net gain", "g/l",
    ],
    "gain_loss_pct": [
        "gain/loss %", "return %", "gain %", "pct change", "% gain",
        "return", "total return %", "% return", "gain/loss percentage",
        "unrealized g/l %", "% change",
    ],
    "price": [
        "price", "current price", "last price", "mkt price", "market price",
        "close", "closing price", "last", "last close",
    ],
}

# Minimum fuzzy match score (0–100) to accept as a match
FUZZY_THRESHOLD = 72

# Required fields — pipeline fails if neither is present after normalization
REQUIRED_FIELDS = {"ticker", "market_value"}


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    1. Clean column names.
    2. Map to standard schema using exact then fuzzy matching.
    3. Coerce numeric columns.
    4. Compute weight column.
    5. Drop rows with no ticker or no market_value.
    """
    df = df.copy()
    df.reset_index(drop=True, inplace=True)  # prevent index alignment errors in pandas 3.0

    # Build cleaned-name → original-name lookup
    cleaned_to_orig: dict[str, str] = {}
    for col in df.columns:
        cleaned = _clean_col_name(col)
        if cleaned:
            cleaned_to_orig[cleaned] = col

    # Build mapping: standard_field → original_column_name
    mapping: dict[str, str] = _build_mapping(list(cleaned_to_orig.keys()), cleaned_to_orig)

    if "ticker" not in mapping and "market_value" not in mapping:
        raise ValueError(
            "Could not identify a ticker or market value column. "
            "Please make sure your file has column headers like 'Symbol', 'Ticker', "
            "'Market Value', or 'Current Value'."
        )

    # Rename only mapped columns, drop everything else
    rename_map = {mapping[std]: std for std in mapping}
    df.rename(columns=rename_map, inplace=True)
    standard_cols = [c for c in COLUMN_ALIASES.keys() if c in df.columns] + ["price"]
    df = df[[c for c in standard_cols if c in df.columns]].copy()
    df.reset_index(drop=True, inplace=True)

    # Coerce numeric columns — skip if already numeric (e.g. from Fidelity parser)
    import numpy as np
    for col in ["shares", "market_value", "cost_basis", "gain_loss", "gain_loss_pct", "price"]:
        if col not in df.columns:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            continue  # already clean, no parsing needed
        # String column — parse each value
        vals = df[col].tolist() if hasattr(df[col], 'tolist') else list(df[col])
        df[col] = [_parse_numeric(v) for v in vals]

    # Infer market_value from price × shares if missing
    if "market_value" not in df.columns and "price" in df.columns and "shares" in df.columns:
        df["market_value"] = df["price"] * df["shares"]

    # Drop rows without market_value or with market_value = 0
    if "market_value" in df.columns:
        df = df[df["market_value"].notna() & (df["market_value"] > 0)].copy()
    else:
        raise ValueError("No market value column could be identified or inferred.")

    # Clean ticker column
    if "ticker" in df.columns:
        df["ticker"] = df["ticker"].astype(str).str.strip().str.upper()
        df["ticker"] = df["ticker"].str.replace(r"[^A-Z0-9.\-]", "", regex=True)
        # Drop rows with empty/invalid tickers
        df = df[df["ticker"].str.len() >= 1].copy()
    else:
        raise ValueError("No ticker/symbol column could be identified.")

    # Compute portfolio weight (0.0 – 1.0)
    total = df["market_value"].sum()
    df["weight"] = df["market_value"] / total if total > 0 else 0.0

    df.reset_index(drop=True, inplace=True)
    return df


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _clean_col_name(col: str) -> str:
    """Lowercase, strip, collapse whitespace and punctuation."""
    col = str(col).lower().strip()
    col = re.sub(r"[\(\)\$%#@!]", " ", col)
    col = re.sub(r"\s+", " ", col).strip()
    return col


def _build_mapping(cleaned_cols: list[str], cleaned_to_orig: dict[str, str]) -> dict[str, str]:
    """
    For each standard field, find the best matching cleaned column name.
    Returns: {standard_field: original_column_name}
    """
    mapping: dict[str, str] = {}
    used_orig: set[str] = set()

    for std_field, aliases in COLUMN_ALIASES.items():
        # Exact match first
        for alias in aliases:
            if alias in cleaned_cols:
                orig = cleaned_to_orig[alias]
                if orig not in used_orig:
                    mapping[std_field] = orig
                    used_orig.add(orig)
                    break

        if std_field in mapping:
            continue

        # Fuzzy match as fallback
        candidates = [c for c in cleaned_cols if cleaned_to_orig[c] not in used_orig]
        if not candidates:
            continue

        all_aliases = " ".join(aliases[:4])  # combine top aliases for matching
        result = process.extractOne(
            all_aliases,
            candidates,
            scorer=fuzz.partial_ratio,
            score_cutoff=FUZZY_THRESHOLD,
        )
        if result:
            best_col, score, _ = result
            orig = cleaned_to_orig[best_col]
            mapping[std_field] = orig
            used_orig.add(orig)
            logger.debug(f"Fuzzy mapped '{std_field}' ← '{orig}' (score={score})")

    return mapping


def _parse_numeric(value) -> float | None:
    """Parse a cell that may be a string like '$1,234.56' or '(123.45)' (negative)."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)

    s = str(value).strip()
    # Remove currency symbols and commas
    s = re.sub(r"[$£€,\s]", "", s)
    # Handle parenthetical negatives: (123.45) → -123.45
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    # Remove trailing % sign (for gain_loss_pct stored as string)
    s = s.rstrip("%")

    try:
        return float(s)
    except ValueError:
        return None
