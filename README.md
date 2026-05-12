# PortfolioLens

A production-grade portfolio analysis web app that ingests holdings from virtually any source — CSV, Excel, PDF, images, or pasted text — and delivers educational insights on concentration, risk, diversification, sector allocation, and ETF alternatives.

Built as a recruiter-ready full-stack MVP demonstrating: FastAPI, React, Tailwind CSS, pandas, SQLite, Anthropic API, yfinance, OCR, and a universal file ingestion pipeline.

---

## Architecture Overview

```
Input File
  └─ detect type
       └─ extract raw table (pdfplumber / openpyxl / pandas / pytesseract)
            └─ remove PII (account #, SSN, names, addresses)
                 └─ fuzzy-match columns → standard schema
                      └─ validate + enrich tickers (yfinance)
                           └─ run analytics engine
                                └─ return dashboard JSON
```

All file types share one normalized output schema. There is no separate parsing logic per brokerage.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, React Router |
| Backend | FastAPI, Python 3.13, Uvicorn |
| Data | pandas, pdfplumber, openpyxl, pytesseract |
| Market Data | yfinance |
| AI Chatbot | Anthropic claude-sonnet-4-20250514 |
| Database | SQLite (SQLAlchemy ORM — swappable to PostgreSQL) |
| Export | ReportLab PDF |

---

## Prerequisites

### Required
- Python 3.11+
- Node.js 18+
- Anthropic API key

### For OCR (image + scanned PDF support) — Optional
Install Tesseract OCR:
- **Windows**: Download from https://github.com/UB-Mannheim/tesseract/wiki, install to `C:\Program Files\Tesseract-OCR`, add to PATH
- **macOS**: `brew install tesseract`
- **Linux**: `sudo apt install tesseract-ocr`

If Tesseract is not installed, image/scanned-PDF uploads will return a descriptive error rather than silently failing.

---

## Setup

### 1. Clone and enter the project
```bash
git clone https://github.com/yourhandle/portfoliolens.git
cd portfoliolens
```

### 2. Backend setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Frontend setup
```bash
cd ../frontend
npm install
```

### 4. Run the app

Terminal 1 — Backend:
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Terminal 2 — Frontend:
```bash
cd frontend
npm run dev
```

Open http://localhost:5173

---

## Supported Input Formats

| Format | Method | Notes |
|--------|--------|-------|
| `.csv` | File upload | Any brokerage export |
| `.xlsx` / `.xls` | File upload | First sheet with headers |
| `.pdf` | File upload | Text-based PDFs; OCR fallback if Tesseract installed |
| `.png` / `.jpg` / `.jpeg` / `.webp` | File upload | Requires Tesseract |
| `.txt` | File upload | Tab or comma delimited |
| Paste | Text input | Paste spreadsheet data directly |
| Manual | Form | Enter tickers + shares by hand |

---

## Column Auto-Detection

The normalizer auto-detects these column names (and common variants/misspellings):

| Standard Field | Recognized Aliases |
|---------------|-------------------|
| `ticker` | symbol, stock, security, tick |
| `shares` | quantity, qty, units, position |
| `market_value` | current value, mkt val, total value |
| `cost_basis` | cost, avg cost, book value, total cost |
| `gain_loss` | unrealized g/l, profit/loss, p/l |
| `name` | description, company, fund name, holding |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file or paste text |
| POST | `/api/manual` | Submit manual holdings |
| GET | `/api/portfolio/{session_id}` | Get full dashboard JSON |
| POST | `/api/chat` | Ask the AI assistant |
| GET | `/api/snapshot/{session_id}` | Download PDF snapshot |
| DELETE | `/api/portfolio/{session_id}` | Clear session data |

---

## Sample Files

See `samples/sample_portfolio.csv` for a test file you can upload immediately.

---

## Moving to PostgreSQL

Change one line in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost/portfoliolens
```

The SQLAlchemy models and all queries are database-agnostic.

---

## Disclaimer

PortfolioLens is an educational analysis tool. It does not provide financial advice, investment recommendations, or tax guidance. All insights are observational and informational in nature.

---

## License

MIT
