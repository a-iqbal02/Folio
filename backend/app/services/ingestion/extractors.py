"""
Extractors: file bytes → raw pandas DataFrame with original column names.

Each extractor returns a DataFrame or raises ValueError with a clear message.
"""

import io
import re
import logging
from typing import Optional
import pandas as pd

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# CSV
# ---------------------------------------------------------------------------

def extract_csv(file_bytes: bytes) -> pd.DataFrame:
    """
    Try Fidelity-specific parser first, then generic CSV fallback.
    """
    # Fidelity CSV detection: contains 'Account Number' header
    text = file_bytes.decode("utf-8-sig", errors="replace")
    if "Account Number" in text and "Symbol" in text and "Current Value" in text:
        df = _parse_fidelity_csv(text)
        if df is not None and len(df) > 0:
            logger.info("Parsed using Fidelity CSV parser.")
            return df

    # Generic CSV fallback
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        for sep in (",", "\t", ";", "|"):
            try:
                df = pd.read_csv(
                    io.BytesIO(file_bytes),
                    sep=sep,
                    encoding=encoding,
                    thousands=",",
                    na_values=["--", "N/A", "n/a", "-", ""],
                    skip_blank_lines=True,
                )
                if df.shape[1] >= 2 and df.shape[0] >= 1:
                    return _drop_empty_rows(df)
            except Exception:
                continue
    raise ValueError(
        "Could not parse CSV. Make sure the file has at least 2 columns with a header row."
    )


def _parse_fidelity_csv(text: str) -> Optional[pd.DataFrame]:
    """
    Parse Fidelity's brokerage CSV export format.

    Known quirks:
    - UTF-8 BOM at start
    - Dollar signs and +/- prefixes on price/value columns
    - Percentage signs on gain/loss columns
    - Trailing rows: cash row (no symbol or numeric price), pending activity row,
      then multiple lines of legal disclaimer text
    - 'Average Cost Basis' is per-share cost, 'Cost Basis Total' is total cost
    """
    lines = text.splitlines()

    # Find the header row (contains 'Symbol')
    header_idx = None
    for i, line in enumerate(lines):
        if "Symbol" in line and "Quantity" in line:
            header_idx = i
            break

    if header_idx is None:
        return None

    # Find the last data row — stop at first blank line after data starts
    data_lines = [lines[header_idx]]
    for line in lines[header_idx + 1:]:
        stripped = line.strip()
        # Stop at blank lines or disclaimer text
        if not stripped:
            break
        # Stop at lines that look like disclaimer (long sentences, no commas in right places)
        if stripped.startswith('"The data') or stripped.startswith('"Brokerage') or stripped.startswith('"Date downloaded'):
            break
        data_lines.append(line)

    if len(data_lines) < 2:
        return None

    csv_text = "\n".join(data_lines)
    try:
        df = pd.read_csv(io.StringIO(csv_text), encoding="utf-8", index_col=False)
    except Exception as e:
        logger.warning(f"Fidelity CSV parse error: {e}")
        return None

    # Drop rows where Symbol is blank, NaN, or known non-holding values
    if "Symbol" in df.columns:
        df = df[df["Symbol"].notna()].copy()
        df = df[~df["Symbol"].astype(str).str.strip().isin(
            ["", "nan", "Pending activity", "Account Number"]
        )].copy()
        # Drop cash/money market rows (symbol ends with **)
        df = df[~df["Symbol"].astype(str).str.endswith("**")].copy()
    else:
        return None

    if df.empty:
        return None

    # Clean monetary columns — strip $, commas, leading +
    money_cols = [
        "Last Price", "Last Price Change", "Current Value",
        "Today's Gain/Loss Dollar", "Total Gain/Loss Dollar",
        "Cost Basis Total", "Average Cost Basis",
    ]
    pct_cols = [
        "Today's Gain/Loss Percent", "Total Gain/Loss Percent", "Percent Of Account"
    ]

    for col in money_cols:
        if col in df.columns:
            df[col] = df[col].apply(_clean_money)

    for col in pct_cols:
        if col in df.columns:
            df[col] = df[col].apply(_clean_pct)

    # Rename to standard schema
    rename = {
        "Symbol":                   "ticker",
        "Description":              "name",
        "Quantity":                 "shares",
        "Current Value":            "market_value",
        "Cost Basis Total":         "cost_basis",
        "Total Gain/Loss Dollar":   "gain_loss",
        "Total Gain/Loss Percent":  "gain_loss_pct",
        "Last Price":               "price",
    }
    df.rename(columns={k: v for k, v in rename.items() if k in df.columns}, inplace=True)

    # Keep only standard columns that exist
    keep = ["ticker", "name", "shares", "market_value", "cost_basis", "gain_loss", "gain_loss_pct", "price"]
    df = df[[c for c in keep if c in df.columns]].copy()

    # Drop rows without a valid market_value
    if "market_value" in df.columns:
        df = df[pd.to_numeric(df["market_value"], errors="coerce") > 0].copy()

    df.reset_index(drop=True, inplace=True)
    return df


def _clean_money(val) -> Optional[float]:
    """Convert '$1,234.56' or '+$7.83' or '-$3.11' to float."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip().replace(",", "").replace("$", "").replace("+", "")
    try:
        return float(s)
    except ValueError:
        return None


def _clean_pct(val) -> Optional[float]:
    """Convert '+1.50%' or '-3.11%' to float."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip().replace("%", "").replace("+", "")
    try:
        return float(s)
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Excel
# ---------------------------------------------------------------------------

def extract_excel(file_bytes: bytes) -> pd.DataFrame:
    """Read first non-empty sheet from .xlsx or .xls."""
    try:
        xf = pd.ExcelFile(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Cannot open Excel file: {e}")

    for sheet in xf.sheet_names:
        try:
            df = pd.read_excel(
                xf,
                sheet_name=sheet,
                thousands=",",
                na_values=["--", "N/A", "n/a", "-", ""],
            )
            df = _drop_empty_rows(df)
            if df.shape[1] >= 2 and df.shape[0] >= 1:
                return df
        except Exception:
            continue

    raise ValueError("Excel file appears empty or has no parseable sheet.")


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------

def extract_pdf(file_bytes: bytes) -> pd.DataFrame:
    """
    Strategy:
    1. pdfplumber table extraction
    2. Fidelity-specific text parser
    3. Generic text parsing
    4. OCR fallback (requires Tesseract)
    """
    try:
        import pdfplumber
    except ImportError:
        raise ValueError("pdfplumber is not installed.")

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        all_tables = []
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                if table and len(table) > 1:
                    all_tables.append(table)

        if all_tables:
            df = _tables_to_dataframe(all_tables)
            if df is not None and df.shape[0] >= 1:
                return df

        text = "\n".join(page.extract_text() or "" for page in pdf.pages).strip()

    if text:
        df = _parse_fidelity_pdf(text)
        if df is not None and df.shape[0] >= 1:
            logger.info("Parsed PDF using Fidelity layout parser.")
            return df

        df = _parse_text_as_table(text)
        if df is not None and df.shape[0] >= 1:
            return df

    return _ocr_pdf(file_bytes)


def _parse_fidelity_pdf(text: str) -> Optional[pd.DataFrame]:
    """Parse Fidelity's portfolio PDF format."""
    lines = text.splitlines()
    ticker_pattern = re.compile(r'^([A-Z]{1,5}(?:\.[A-Z]{1,2})?)\s*$')

    records = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        m = ticker_pattern.match(line)
        if m:
            ticker = m.group(1)
            if ticker in ('ETF', 'IRA', 'ROTH', 'CASH', 'USD', 'AM', 'PM', 'ET',
                          'HELD', 'IN', 'NOT', 'SOME', 'AS', 'OF', 'THE'):
                i += 1
                continue

            name = None
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if next_line and not ticker_pattern.match(next_line) and not next_line.startswith('$'):
                    name = next_line
                    i += 1

            current_value = None
            cost_basis = None
            quantity = None

            for j in range(i + 1, min(i + 20, len(lines))):
                scan = lines[j].strip()
                qty_match = re.match(r'^([\d]+\.[\d]{1,6})$', scan)
                if qty_match and quantity is None:
                    val = float(qty_match.group(1).replace(',', ''))
                    if val < 500:
                        quantity = val

                cv_match = re.match(r'^\$([\d,]+\.\d{2})$', scan)
                if cv_match and current_value is None:
                    current_value = float(cv_match.group(1).replace(',', ''))
                elif cv_match and current_value is not None and cost_basis is None:
                    cost_basis = float(cv_match.group(1).replace(',', ''))

                if j > i + 2 and ticker_pattern.match(scan):
                    break

            if current_value is not None:
                records.append({
                    'ticker': ticker,
                    'name': name,
                    'shares': quantity,
                    'market_value': current_value,
                    'cost_basis': cost_basis,
                })
        i += 1

    if not records:
        return None
    return pd.DataFrame(records)


def _tables_to_dataframe(tables: list) -> Optional[pd.DataFrame]:
    best = max(tables, key=lambda t: len(t) * len(t[0]) if t else 0)
    if not best or len(best) < 2:
        return None

    header = [str(c).strip() if c else f"col_{i}" for i, c in enumerate(best[0])]
    rows = []
    for row in best[1:]:
        if any(cell for cell in row):
            rows.append([str(c).strip() if c is not None else "" for c in row])

    if not rows:
        return None

    df = pd.DataFrame(rows, columns=header)
    df.replace({"": None, "--": None, "N/A": None}, inplace=True)
    return df


def _parse_text_as_table(text: str) -> Optional[pd.DataFrame]:
    lines = [l for l in text.splitlines() if l.strip()]
    if len(lines) < 2:
        return None

    for sep in ("\t", "  ", " "):
        try:
            df = pd.read_csv(
                io.StringIO(text),
                sep=sep,
                engine="python",
                thousands=",",
                na_values=["--", "N/A", ""],
                skip_blank_lines=True,
            )
            if df.shape[1] >= 2 and df.shape[0] >= 1:
                return _drop_empty_rows(df)
        except Exception:
            continue
    return None


def _ocr_pdf(file_bytes: bytes) -> pd.DataFrame:
    try:
        from PIL import Image
        import pytesseract
    except ImportError:
        raise ValueError(
            "This PDF appears to be scanned (image-based). "
            "To parse it, install Tesseract OCR and the pytesseract Python package. "
            "See README for setup instructions."
        )

    try:
        import pdfplumber
        images = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                img = page.to_image(resolution=200).original
                images.append(img)
    except Exception as e:
        raise ValueError(f"Could not render PDF pages for OCR: {e}")

    if not images:
        raise ValueError("No pages found in PDF.")

    full_text = "\n".join(
        pytesseract.image_to_string(img, config="--psm 6") for img in images
    )
    df = _parse_text_as_table(full_text)
    if df is None or df.shape[0] < 1:
        raise ValueError(
            "OCR ran but could not extract a table from the PDF. "
            "Try uploading a text-based PDF or CSV."
        )
    return df


# ---------------------------------------------------------------------------
# Image
# ---------------------------------------------------------------------------

def extract_image(file_bytes: bytes, content_type: str = "image/png") -> pd.DataFrame:
    try:
        from PIL import Image
        import pytesseract
    except ImportError:
        raise ValueError(
            "Image parsing requires Tesseract OCR. "
            "Please install Tesseract and pytesseract. See README for instructions."
        )

    try:
        img = Image.open(io.BytesIO(file_bytes))
        if img.width < 1200:
            scale = 1200 / img.width
            img = img.resize((int(img.width * scale), int(img.height * scale)))
        text = pytesseract.image_to_string(img, config="--psm 6")
    except Exception as e:
        raise ValueError(f"OCR failed: {e}")

    df = _parse_text_as_table(text)
    if df is None or df.shape[0] < 1:
        raise ValueError(
            "OCR completed but could not detect a portfolio table. "
            "For best results, upload a clean screenshot with clear column headers. "
            "Alternatively, export a CSV from your brokerage — it will parse perfectly."
        )
    return df


# ---------------------------------------------------------------------------
# Plain text / paste
# ---------------------------------------------------------------------------

def extract_text(text: str) -> pd.DataFrame:
    if not text or not text.strip():
        raise ValueError("No text provided.")

    df = _parse_text_as_table(text)
    if df is None or df.shape[0] < 1:
        raise ValueError(
            "Could not parse pasted text as a table. "
            "Make sure you copy the full row and header from your spreadsheet."
        )
    return df


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _drop_empty_rows(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.replace("", None, inplace=True)
    df.dropna(how="all", inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df
