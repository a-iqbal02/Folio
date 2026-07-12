// Single, internally-consistent sample dataset used across the home
// dashboard (metrics, sector allocation, holdings, insights) so numbers
// agree with each other the way a real analyzed portfolio's would.

export const SAMPLE = {
  totalValue: 284650,
  dailyChangeAbs: 1824,
  dailyChangePct: 0.65,

  concentration: { score: 34, label: 'High', top5Pct: 61.0 },
  risk: { score: 68, label: 'Moderate-High' },
  benchmark1y: { portfolio: 18.4, sp500: 14.1 },

  // Sums to 100. sp500Pct is the S&P 500's actual weight for that sector,
  // used both in the sector panel and the benchmark comparison panel.
  sectors: [
    { name: 'Technology',             pct: 42, sp500Pct: 19, color: '#3b82f6' },
    { name: 'Financials',             pct: 15, sp500Pct: 13, color: '#8b5cf6' },
    { name: 'Healthcare',             pct: 12, sp500Pct: 11, color: '#14b8a6' },
    { name: 'Consumer Discretionary', pct: 11, sp500Pct: 10, color: '#f97316' },
    { name: 'Communication Services', pct: 9,  sp500Pct: 9,  color: '#06b6d4' },
    { name: 'Industrials',            pct: 6,  sp500Pct: 8,  color: '#84cc16' },
    { name: 'Energy',                 pct: 5,  sp500Pct: 4,  color: '#ec4899' },
  ],

  // weight sums to ~72%, matching a realistic "top 7 of ~20 holdings" slice
  holdings: [
    { ticker: 'AAPL',  name: 'Apple Inc.',            weight: 18.2, value: 51806 },
    { ticker: 'NVDA',  name: 'NVIDIA Corp.',          weight: 14.6, value: 41559 },
    { ticker: 'MSFT',  name: 'Microsoft Corp.',       weight: 11.3, value: 32166 },
    { ticker: 'QQQ',   name: 'Invesco QQQ Trust',     weight: 9.8,  value: 27896 },
    { ticker: 'GOOGL', name: 'Alphabet Inc.',         weight: 7.1,  value: 20210 },
    { ticker: 'JPM',   name: 'JPMorgan Chase & Co.',  weight: 6.4,  value: 18218 },
    { ticker: 'V',     name: 'Visa Inc.',             weight: 4.8,  value: 13663 },
  ],

  warnings: [
    { severity: 'high',   text: 'AAPL is 18.2% of the portfolio — a single-position concentration risk.' },
    { severity: 'medium', text: 'Top 5 holdings account for 61% of total value.' },
  ],

  overlap: {
    group: 'Nasdaq-100 / Growth',
    text: 'QQQ overlaps roughly 54% with your individual AAPL, NVDA, and MSFT positions — you may be paying an expense ratio for exposure you already hold directly.',
  },

  suggestions: [
    'Trim AAPL or add offsetting positions to reduce single-stock concentration.',
    'International exposure is 0% — consider a fund like VXUS for diversification.',
    'QQQ duplicates exposure already held directly; consolidating could simplify tracking.',
  ],
}
