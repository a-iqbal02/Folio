/**
 * PerformanceChart — fetches Yahoo Finance directly from the browser.
 *
 * Browsers are allowed by Yahoo Finance's CORS policy; Railway server IPs
 * get blocked, which is why the backend endpoint was failing.
 * We bypass the backend entirely here.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Loader2, RefreshCw } from 'lucide-react'

const PERIODS = [
  { key: '6mo', label: '6M' },
  { key: '1y',  label: '1Y' },
  { key: '2y',  label: '2Y' },
  { key: '5y',  label: '5Y' },
]

// ── Yahoo Finance chart API (browser-only, CORS-safe) ─────────────────────────
async function fetchYahooCloses(ticker, range) {
  const base = 'https://query1.finance.yahoo.com/v8/finance/chart'
  const url  = `${base}/${encodeURIComponent(ticker)}?range=${range}&interval=1d&includePrePost=false`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const body   = await res.json()
    const result = body?.chart?.result?.[0]
    if (!result) return null
    const timestamps = result.timestamp || []
    const prices     =
      result.indicators?.adjclose?.[0]?.adjclose ||
      result.indicators?.quote?.[0]?.close       || []
    if (!timestamps.length || !prices.length) return null
    return timestamps.map((ts, i) => ({
      date:  new Date(ts * 1000).toISOString().slice(0, 10),
      close: prices[i],
    })).filter(p => p.close != null)
  } catch {
    return null
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────
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
  const spy  = payload.find(p => p.dataKey === 'spy')
  const fmt  = v => v != null ? `${(v - 100).toFixed(1)}%` : '—'
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="text-slate-400 mb-1.5">
        {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      {port && <p className="text-blue-400 font-semibold">Portfolio: <span className="text-white">{fmt(port.value)}</span></p>}
      {spy  && <p className="text-slate-400 font-semibold">S&P 500:   <span className="text-white">{fmt(spy.value)}</span></p>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
// holdings: array of holding objects with {ticker, weight_pct}
// compact:  true = smaller height (used inside SimpleView)
export default function PerformanceChart({ holdings = [], compact = false }) {
  const [chartData, setChartData] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [period,    setPeriod]    = useState('1y')

  // Top-5 holdings by weight, weights re-normalised to sum to 1
  const top5 = useMemo(() => {
    const sorted = [...holdings]
      .filter(h => h.ticker && (h.weight_pct || 0) > 0)
      .sort((a, b) => (b.weight_pct || 0) - (a.weight_pct || 0))
      .slice(0, 5)
    const totalW = sorted.reduce((s, h) => s + (h.weight_pct || 0), 0)
    return sorted.map(h => ({
      ticker: h.ticker.trim().toUpperCase(),
      weight: totalW > 0 ? (h.weight_pct || 0) / totalW : 0,
    }))
  }, [holdings])

  const fetchData = useCallback(async () => {
    if (!top5.length) {
      setError('No holdings data.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setChartData(null)

    try {
      // Fetch SPY + top-5 in parallel
      const [spyRaw, ...tickerRaws] = await Promise.all([
        fetchYahooCloses('SPY',        period),
        ...top5.map(h => fetchYahooCloses(h.ticker, period)),
      ])

      if (!spyRaw?.length) {
        setError('Could not load S&P 500 data from Yahoo Finance.')
        return
      }

      // Index SPY by date
      const spyMap = Object.fromEntries(spyRaw.map(p => [p.date, p.close]))
      const spyBase = spyRaw[0].close

      // Index each ticker by date
      const tickerMaps = tickerRaws.map((raw, i) => {
        if (!raw?.length) return null
        const map  = Object.fromEntries(raw.map(p => [p.date, p.close]))
        const base = raw[0].close
        return { map, base, weight: top5[i].weight }
      })

      // Use SPY dates as the canonical timeline
      const dates = spyRaw.map(p => p.date)

      // Build chart rows
      let prevPortfolio = 100
      const rows = dates.map(date => {
        const spyNorm = spyBase > 0 ? (spyMap[date] / spyBase) * 100 : 100

        // Weighted portfolio value
        let portNorm  = 0
        let portWeight = 0
        tickerMaps.forEach(tm => {
          if (!tm) return
          const px = tm.map[date]
          if (px != null && tm.base > 0) {
            portNorm  += (px / tm.base) * 100 * tm.weight
            portWeight += tm.weight
          }
        })

        let portfolio = portWeight > 0.05
          ? portNorm / portWeight  // already normalised to 100 per ticker
          : prevPortfolio          // carry forward if data missing
        prevPortfolio = portfolio

        return { date, portfolio: +portfolio.toFixed(2), spy: +spyNorm.toFixed(2) }
      })

      setChartData(rows)
    } catch (e) {
      setError(e.message || 'Unexpected error.')
    } finally {
      setLoading(false)
    }
  }, [top5, period])

  useEffect(() => { fetchData() }, [fetchData])

  const lastPort = chartData?.[chartData.length - 1]?.portfolio
  const lastSpy  = chartData?.[chartData.length - 1]?.spy
  const chartH   = compact ? 160 : 220

  return (
    <div className={compact ? '' : 'card'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {!compact && (
            <div className="bg-blue-500/10 rounded-lg p-2 shrink-0">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
          )}
          <div>
            <p className={`font-semibold text-slate-200 ${compact ? 'text-xs' : 'text-sm'}`}>
              Portfolio vs S&amp;P 500
            </p>
            {!compact && (
              <p className="text-slate-500 text-xs">Normalised to 100 at period start</p>
            )}
          </div>
        </div>

        {/* Period tabs */}
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

      {/* Return legend */}
      {!loading && !error && chartData && (
        <div className="flex items-center gap-4 mb-3">
          <ReturnBadge value={lastPort} label="Your Portfolio" color="#3b82f6" />
          <ReturnBadge value={lastSpy}  label="S&P 500 (SPY)"  color="#64748b" />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-2 text-slate-500" style={{ height: chartH }}>
          <Loader2 className="w-5 h-5 animate-spin text-blue-500/60" />
          <span className="text-sm">Fetching market data…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-2 text-slate-600 text-xs text-center px-4" style={{ height: chartH }}>
          <p className="text-slate-500">{error}</p>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 rounded-lg px-3 py-1.5 mt-1"
          >
            <RefreshCw className="w-3 h-3" /> Try again
          </button>
        </div>
      )}

      {/* Chart */}
      {!loading && !error && chartData && (
        <ResponsiveContainer width="100%" height={chartH}>
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
    </div>
  )
}
