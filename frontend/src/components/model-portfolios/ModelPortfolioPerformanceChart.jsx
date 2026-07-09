import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Loader2, RefreshCw } from 'lucide-react'
import { api } from '../../utils/api'

const PERIODS = [
  { key: '1y', label: '1Y' },
  { key: '2y', label: '2Y' },
  { key: '3y', label: '3Y' },
  { key: '5y', label: '5Y' },
]

function ReturnBadge({ value, label, color }) {
  const pct = value != null ? (value - 100).toFixed(1) : null
  const pos = pct !== null && parseFloat(pct) >= 0
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block w-6 h-0.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-xs text-slate-400">{label}</span>
      {pct !== null && (
        <span className={`text-xs font-bold tabular-nums ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
          {pos ? '+' : ''}{pct}%
        </span>
      )}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const port = payload.find(p => p.dataKey === 'portfolio')
  const spy = payload.find(p => p.dataKey === 'spy')
  const fmt = v => v != null ? `${(v - 100).toFixed(1)}%` : '—'
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="text-slate-400 mb-1.5">
        {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      {port && <p className="text-blue-400 font-semibold">Portfolio: <span className="text-white">{fmt(port.value)}</span></p>}
      {spy && <p className="text-slate-400 font-semibold">S&P 500:   <span className="text-white">{fmt(spy.value)}</span></p>}
    </div>
  )
}

export default function ModelPortfolioPerformanceChart({ portfolioId }) {
  const [chartData, setChartData] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('3y')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setChartData(null)
    try {
      const data = await api.getModelPortfolioPerformance(portfolioId, period)
      if (!data?.labels?.length) {
        setError('No performance data returned.')
        return
      }
      const rows = data.labels.map((date, i) => ({
        date,
        portfolio: data.portfolio[i],
        spy: data.spy[i],
      }))
      setChartData(rows)
      setMeta({ totalReturn: data.total_return_pct, volatility: data.annualized_volatility_pct })
    } catch (e) {
      setError(e.message || 'Could not load performance data.')
    } finally {
      setLoading(false)
    }
  }, [portfolioId, period])

  useEffect(() => { fetchData() }, [fetchData])

  const lastPort = chartData?.[chartData.length - 1]?.portfolio
  const lastSpy = chartData?.[chartData.length - 1]?.spy

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500/10 rounded-lg p-2 shrink-0">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-200 text-sm">Hypothetical Backtest vs S&amp;P 500</p>
            <p className="text-slate-500 text-xs">Normalised to 100 at period start</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 bg-slate-800/60 rounded-lg p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                period === p.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!loading && !error && chartData && (
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <ReturnBadge value={lastPort} label="This Portfolio" color="#3b82f6" />
          <ReturnBadge value={lastSpy} label="S&P 500 (SPY)" color="#64748b" />
          {meta?.volatility != null && (
            <span className="text-xs text-slate-500">Annualized volatility: <span className="text-slate-300 font-semibold">{meta.volatility}%</span></span>
          )}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-2 text-slate-500" style={{ height: 220 }}>
          <Loader2 className="w-5 h-5 animate-spin text-blue-500/60" />
          <span className="text-sm">Fetching market data…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-2 text-slate-600 text-xs text-center px-4" style={{ height: 220 }}>
          <p className="text-slate-500">{error}</p>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 rounded-lg px-3 py-1.5 mt-1"
          >
            <RefreshCw className="w-3 h-3" /> Try again
          </button>
        </div>
      )}

      {!loading && !error && chartData && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#475569', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={d => new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#475569', fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${Math.round(v)}`}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="portfolio" stroke="#3b82f6" strokeWidth={2}
              dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
            <Line type="monotone" dataKey="spy" stroke="#64748b" strokeWidth={1.5}
              strokeDasharray="4 3" dot={false} activeDot={{ r: 3, fill: '#64748b' }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      <p className="text-slate-600 text-xs mt-3 leading-relaxed">
        Hypothetical backtest: static weights, not rebalanced, based on historical closing prices —
        not dividend-adjusted total return. Past performance does not indicate future results.
      </p>
    </div>
  )
}
