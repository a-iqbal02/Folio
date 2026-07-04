# PortfolioLens

A production-grade portfolio analysis web app that ingests holdings from virtually any source — CSV, Excel, PDF, images, or pasted text — and delivers educational insights on concentration, risk, diversification, sector allocation, and ETF alternatives.

Built as a recruiter-ready full-stack MVP demonstrating: FastAPI, React, Tailwind CSS, pandas, SQLite/PostgreSQL, JWT auth, Anthropic API, yfinance, OCR, and a universal file ingestion pipeline.

Anonymous, no-login portfolio upload/analysis is fully supported — accounts are optional and add persistent saved portfolios, plus a live ETF screener on top.

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
| Auth | JWT (PyJWT) + bcrypt password hashing |
| Data | pandas, pdfplumber, openpyxl, pytesseract |
| Market Data | Stooq.com (primary) + Yahoo Finance chart API (fallback) — free, no API key |
| AI Chatbot | Anthropic claude-sonnet-4-20250514 |
| Database | SQLite for local dev, PostgreSQL in production (SQLAlchemy ORM + Alembic migrations) |
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
# Edit .env and add your ANTHROPIC_API_KEY and a real SECRET_KEY (used to sign JWT auth tokens)
```

Apply database migrations (creates all tables, including the accounts/portfolios/ETF-cache tables added in Phase A/B):
```bash
alembic upgrade head
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
| POST | `/api/upload` | Upload file or paste text (optionally authenticated — auto-saves to your account if logged in) |
| POST | `/api/manual` | Submit manual holdings |
| GET | `/api/portfolio/{session_id}` | Get full dashboard JSON (guest session) |
| POST | `/api/chat` | Ask the AI assistant |
| GET | `/api/snapshot/{session_id}` | Download PDF snapshot |
| DELETE | `/api/portfolio/{session_id}` | Clear session data |
| GET | `/api/market/compare` | Normalized multi-ticker price comparison |
| POST | `/api/auth/register` | Create an account (returns a JWT) |
| POST | `/api/auth/login` | Log in (returns a JWT) |
| GET | `/api/auth/me` | Current authenticated user |
| POST | `/api/portfolios/claim` | Save a guest session into your account |
| GET | `/api/portfolios` | List your saved portfolios |
| GET / PATCH / DELETE | `/api/portfolios/{id}` | Get / rename / delete a saved portfolio |
| POST | `/api/portfolios/{id}/refresh` | Recompute analytics for a saved portfolio |
| GET | `/api/screener/etfs` | Search/filter/sort the curated ETF universe with live prices |
| GET | `/api/screener/etfs/{ticker}` | ETF detail + price history |

---

## Accounts & Persistent Portfolios

Uploading and analyzing a portfolio never requires an account — the original anonymous, session-based flow (`/api/upload` → `/api/portfolio/{session_id}`) works exactly as before and is unaffected by auth.

Creating an account (email + password, JWT-based) additionally unlocks:
- **Auto-save on upload** — every upload you make while logged in is saved to your account automatically.
- **Claim a guest session** — analyzed a portfolio before logging in? Click "Save to my account" on its dashboard to keep it.
- **`/account`** — view, rename, and delete your saved portfolios.

Auth tokens are stateless JWTs (no server-side session store, no `/logout` endpoint needed — the client just discards the token). Set `SECRET_KEY` to a long random value in production; never use the `.env.example` default.

---

## ETF Screener

`/etf-explorer` is backed by a curated universe of 224+ real ETFs (`backend/app/data/etf_universe.py`) — not the full ~3,000+ US-listed universe, since that scale of live coverage requires a paid market-data API. Expense ratios and AUM are manually curated (approximate); live price, 1-year return, and YTD return are fetched for every ticker via the free Stooq/Yahoo pipeline and refreshed by an in-process background loop every 6 hours, cached in the `etf_price_cache` table so the screener never blocks on a live fetch.

---

## Sample Files

See `samples/sample_portfolio.csv` for a test file you can upload immediately.

---

## Moving to PostgreSQL

Change one line in `.env` (the legacy `postgres://` scheme some hosts hand back, e.g. Railway, is normalized automatically):
```
DATABASE_URL=postgresql://user:password@localhost/portfoliolens
```

Then apply migrations against it:
```bash
alembic upgrade head
```

The SQLAlchemy models and all queries are database-agnostic. Schema changes now go through Alembic (`backend/migrations/`) rather than relying on auto-created tables, so production upgrades are explicit and reversible.

---

## Disclaimer

PortfolioLens is an educational analysis tool. It does not provide financial advice, investment recommendations, or tax guidance. All insights are observational and informational in nature.

---

## License

MIT
