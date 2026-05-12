"""
PII Cleaner: removes or redacts sensitive personal/financial identifiers
before the data leaves the ingestion pipeline.

Approach:
  1. Drop columns whose names suggest they contain sensitive identifiers.
  2. Scan remaining cell values for PII patterns (SSN, account numbers, etc.)
     and replace matches with [REDACTED].
"""

import re
import pandas as pd


# Column name patterns to drop outright
_SENSITIVE_COLUMN_PATTERNS = re.compile(
    r"(account[\s_#]*(number|num|no|#)?|acct|ssn|social[\s_]*security|"
    r"tax[\s_]*id|ein|tin|routing|aba|address|street|city|zip|phone|"
    r"email|dob|date[\s_]*of[\s_]*birth|national[\s_]*id)",
    re.IGNORECASE,
)

# Cell-level PII patterns to redact
_PII_PATTERNS = [
    # SSN: 123-45-6789 or 123456789
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    # EIN/TIN: 12-3456789
    re.compile(r"\b\d{2}-\d{7}\b"),
    # Account numbers: 8–17 consecutive digits (bank/brokerage)
    re.compile(r"\b\d{8,17}\b"),
    # Routing numbers: exactly 9 digits
    re.compile(r"\b\d{9}\b"),
    # US phone numbers
    re.compile(r"\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}"),
    # Email addresses
    re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"),
    # US zip codes (5 or 9 digit)
    re.compile(r"\b\d{5}(?:-\d{4})?\b"),
]


def clean_pii(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of df with PII columns dropped and PII values redacted."""
    df = df.copy()

    # 1. Drop sensitive columns
    cols_to_drop = [
        col for col in df.columns
        if _SENSITIVE_COLUMN_PATTERNS.search(str(col))
    ]
    if cols_to_drop:
        df.drop(columns=cols_to_drop, inplace=True)

    # 2. Redact PII in remaining string cells
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].apply(_redact_cell)

    return df


def _redact_cell(value) -> str:
    """Apply all PII patterns to a single cell value."""
    if value is None or not isinstance(value, str):
        return value

    result = value
    for pattern in _PII_PATTERNS:
        result = pattern.sub("[REDACTED]", result)
    return result
