import { Info, AlertTriangle } from 'lucide-react'

// Static, hand-picked sample data — internally consistent (sectors sum to
// 100, top-5 holdings weight matches concentration.top5Pct) so the preview
// reads as a real snapshot rather than placeholder numbers.
const DATA = {
  totalValue: 284650,
  dailyChangeAbs: 1824,
  dailyChangePct: 0.65,
  risk: { score: 68, label: 'Moderate-High', color: '#f59e0b' },
  concentration: { score: 34, label: 'High', color: '#f97316', top5Pct: 61.0 },
  diversification: { score: 47, label: 'Below Avg', color: '#f59e0b' },
  sectors: [
    { name: 'Technology', pct: 42, color: '#3b82f6' },
    { name: 'Financials', pct: 15, color: '#8b5cf6' },
    { name: 'Healthcare', pct: 12, color: '#14b8a6' },
    { name: 'Consumer Discretionary', pct: 11, color: '#f97316' },
    { name: 'Communication Services', pct: 9, color: '#06b6d4' },
    { name: 'Industrials', pct: 6, color: '#84cc16' },
    { name: 'Energy', pct: 5, color: '#ec4899' },
  ],
  holdings: [
    { ticker: 'AAPL', weight: 18.2 },
    { ticker: 'NVDA', weight: 14.6 },
    { ticker: 'MSFT', weight: 11.3 },
    { ticker: 'QQQ', weight: 9.8 },
    { ticker: 'GOOGL', weight: 7.1 },
  ],
  benchmark: { portfolio: 18.4, sp500: 14.1 },
  warnings: {
    overlap: 'QQQ overlaps ~54% with your individual AAPL, NVDA and MSFT positions.',
    concentration: 'Technology is 42% of the portfolio — more than 2x the S&P 500 weight (19%).',
  },
}

const STATS = [
  { label: 'Risk', value: DATA.risk.score, color: DATA.risk.color, sub: DATA.risk.label },
  { label: 'Concentration', value: DATA.concentration.score, color: DATA.concentration.color, sub: DATA.concentration.label },
  { label: 'Diversification', value: DATA.diversification.score, color: DATA.diversification.color, sub: DATA.diversification.label },
]

const fmtCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function DashboardPreview() {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg shadow-black/20"
      aria-label="Example portfolio analysis with sample data"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-900/80">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-slate-700" />
          <span className="w-2 h-2 rounded-full bg-slate-700" />
          <span className="w-2 h-2 rounded-full bg-slate-700" />
        </div>
        <span className="text-xs text-slate-500 ml-2">Portfolio Overview</span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">
          Sample data
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Stat rail: value + risk/concentration/diversification, one divided strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-3 py-3">
            <p className="text-[11px] text-slate-500 mb-1">Portfolio Value</p>
            <p className="font-mono text-lg font-bold text-white">{fmtCurrency.format(DATA.totalValue)}</p>
            <p className="text-xs text-emerald-400">
              +{fmtCurrency.format(DATA.dailyChangeAbs)} ({DATA.dailyChangePct}%)
            </p>
          </div>
          {STATS.map((s) => (
            <div key={s.label} className="px-3 py-3">
              <p className="text-[11px] text-slate-500 mb-1">{s.label}</p>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Sector allocation + top holdings — deliberately different structures */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="card-header">Sector Allocation</p>
            <div className="flex h-2.5 rounded-full overflow-hidden mb-2" aria-hidden="true">
              {DATA.sectors.map((s) => (
                <div key={s.name} style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
              ))}
            </div>
            <ul className="space-y-1">
              {DATA.sectors.slice(0, 4).map((s) => (
                <li key={s.name} className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} aria-hidden="true" />
                    {s.name}
                  </span>
                  <span className="font-mono text-slate-300">{s.pct}%</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="card-header">Top Holdings</p>
            <ul className="divide-y divide-slate-800/60">
              {DATA.holdings.map((h) => (
                <li key={h.ticker} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="font-mono font-bold text-blue-400">{h.ticker}</span>
                  <span className="text-slate-400">{h.weight}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Benchmark — meter bars, not a line chart */}
        <div>
          <p className="card-header">1-Year Return vs. S&amp;P 500</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-16 text-slate-500 shrink-0">Portfolio</span>
              <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '92%' }} />
              </div>
              <span className="font-mono text-emerald-400 w-14 text-right shrink-0">+{DATA.benchmark.portfolio}%</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-16 text-slate-500 shrink-0">S&amp;P 500</span>
              <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                <div className="bg-slate-500 h-1.5 rounded-full" style={{ width: '70%' }} />
              </div>
              <span className="font-mono text-slate-400 w-14 text-right shrink-0">+{DATA.benchmark.sp500}%</span>
            </div>
          </div>
        </div>

        {/* Warnings — flush left-accent banners, not boxed cards */}
        <div className="space-y-2">
          <div className="flex gap-2.5 border-l-2 border-blue-500 bg-blue-500/5 px-3 py-2">
            <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs text-blue-300/80 leading-relaxed">{DATA.warnings.overlap}</p>
          </div>
          <div className="flex gap-2.5 border-l-2 border-amber-500 bg-amber-500/5 px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs text-amber-300/80 leading-relaxed">{DATA.warnings.concentration}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
