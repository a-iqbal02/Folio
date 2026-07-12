import { SAMPLE } from './sampleData'

const fmtCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function riskColor(score) {
  if (score >= 70) return '#ef4444'
  if (score >= 50) return '#f59e0b'
  return '#10b981'
}

function concentrationColor(score) {
  if (score < 40) return '#f97316'
  if (score < 65) return '#f59e0b'
  return '#10b981'
}

export default function MetricsRow() {
  const { totalValue, dailyChangeAbs, dailyChangePct, concentration, risk, benchmark1y } = SAMPLE
  const outperform = benchmark1y.portfolio - benchmark1y.sp500

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-800 border border-slate-800 rounded-md">
      <div className="px-4 py-3.5">
        <p className="text-[11px] text-slate-500 mb-1">Portfolio Value</p>
        <p className="font-mono text-xl font-bold text-white">{fmtCurrency.format(totalValue)}</p>
        <p className="text-xs text-emerald-400 mt-0.5">
          +{fmtCurrency.format(dailyChangeAbs)} ({dailyChangePct}%) today
        </p>
      </div>

      <div className="px-4 py-3.5">
        <p className="text-[11px] text-slate-500 mb-1">Concentration</p>
        <p className="text-xl font-bold" style={{ color: concentrationColor(concentration.score) }}>{concentration.score}</p>
        <p className="text-xs text-slate-500 mt-0.5">{concentration.label} · top 5 = {concentration.top5Pct}%</p>
      </div>

      <div className="px-4 py-3.5">
        <p className="text-[11px] text-slate-500 mb-1">Risk Level</p>
        <p className="text-xl font-bold" style={{ color: riskColor(risk.score) }}>{risk.score}</p>
        <p className="text-xs text-slate-500 mt-0.5">{risk.label}</p>
      </div>

      <div className="px-4 py-3.5">
        <p className="text-[11px] text-slate-500 mb-1">1Y vs. S&amp;P 500</p>
        <p className="font-mono text-xl font-bold text-emerald-400">+{benchmark1y.portfolio}%</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {outperform >= 0 ? '+' : ''}{outperform.toFixed(1)}pp vs. S&amp;P ({benchmark1y.sp500}%)
        </p>
      </div>
    </div>
  )
}
