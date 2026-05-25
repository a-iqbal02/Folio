import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Plus, X, TrendingUp, Loader2, RefreshCw, GitCompare } from 'lucide-react'
import { api } from '../utils/api'

// ── Palette — one color per slot ─────────────────────────────────────────────
const COLORS  = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
const BG      = ['bg-blue-500/20 border-blue-500/40 text-blue-300',
                  'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
                  'bg-amber-500/20 border-amber-500/40 text-amber-300',
                  'bg-purple-500/20 border-purple-500/40 text-purple-300']

const PERIODS = [
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1y',  label: '1Y' },
  { key: '2y',  label: '2Y' },
  { key: '3y',  label: '3Y' },
  { key: '5y',  label: '5Y' },
]

// Popular quick-add suggestions
const POPULAR = [
  { ticker: 'SPY',  label: 'S&P 500' },
  { ticker: 'QQQ',  label: 'Nasdaq' },
  { ticker: 'VTI',  label: 'Total Market' },
  { ticker: 'BND',  label: 'Bonds' },
  { ticker: 'GLD',  label: 'Gold' },
  { ticker: 'SCHD', label: 'Dividends' },
  { ticker: 'VGT',  label: 'Tech' },
  { ticker: 'SOXX', label: 'Semis' },
  { ticker: 'ARKK', label: 'ARK Innov.' },
  { ticker: 'VNQ',  label: 'Real Estate' },
  { ticker: 'JEPI', label: 'Income' },
  { ticker: 'VEA',  label: 'Intl Dev.' },
]

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CompareTooltip({ active, payload, label, tickers }) {
  if (!active || !payload?.length) return null
  const fmt = v => v != null ? `${(v - 100).toFixed(2)}%` : '—'
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 shadow-xl text-xs min-w-[140px]">
      <p className="text-slate-400 mb-2">
        {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      {payload.map((p, i) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
          <span className="font-bold" style={{ color: p.stroke }}>{p.dataKey}</span>
          <span className={`font-semibold ${parseFloat(fmt(p.value)) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Return badge ──────────────────────────────────────────────────────────────
function ReturnBadge({ ticker, returnPct, colorIdx, onRemove }) {
  const pos = returnPct != null && returnPct >= 0
  return (
    <div
      className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border text-xs font-semibold ${BG[colorIdx]}`}
    >
      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[colorIdx] }} />
      <span>{ticker}</span>
      {returnPct != null && (
        <span className={pos ? 'text-emerald-400' : 'text-red-400'}>
          {pos ? '+' : ''}{returnPct.toFixed(1)}%
        </span>
      )}
      <button
        onClick={() => onRemove(ticker)}
        className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ETFComparePage() {
  const [selected, setSelected] = useState(['SPY', 'QQQ'])
  const [period,   setPeriod]   = useState('1y')
  const [input,    setInput]    = useState('')
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  // Build chart rows from API response
  const chartRows = data
    ? data.labels.map((date, i) => {
        const row = { date }
        data.series.forEach(s => { if (s.ok) row[s.ticker] = s.data[i] })
        return row
      })
    : []

  const fetchData = useCallback(async () => {
    if (selected.length === 0) { setData(null); return }
    setLoading(true)
    setError(null)
    try {
      const res = await api.compareETFs(selected.join(','), period)
      setData(res)
    } catch (e) {
      setError(e.message || 'Could not load data.')
    } finally {
      setLoading(false)
    }
  }, [selected, period])

  useEffect(() => { fetchData() }, [fetchData])

  function addTicker(ticker) {
    const t = ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '')
    if (!t || selected.includes(t) || selected.length >= 4) return
    setSelected(prev => [...prev, t])
    setInput('')
  }

  function removeTicker(ticker) {
    setSelected(prev => prev.filter(t => t !== ticker))
  }

  function handleInputKey(e) {
    if (e.key === 'Enter') addTicker(input)
  }

  // Map successful series back with their slot index
  const seriesWithIdx = data
    ? data.series.filter(s => s.ok).map(s => ({
        ...s,
        colorIdx: selected.indexOf(s.ticker),
      }))
    : []

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-500/10 rounded-xl p-2.5 shrink-0">
          <GitCompare className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">ETF Comparison</h1>
          <p className="text-slate-500 text-sm">Compare up to 4 ETFs or stocks — normalised to 100 at period start</p>
        </div>
      </div>

      {/* ── Selector card ── */}
      <div className="card space-y-4">

        {/* Selected tickers + remove */}
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {selected.length === 0 && (
            <p className="text-slate-600 text-sm">Add at least one ticker below</p>
          )}
          {selected.map((t, i) => {
            const series = data?.series.find(s => s.ticker === t)
            return (
              <ReturnBadge
                key={t}
                ticker={t}
                returnPct={series?.ok ? series.return_pct : null}
                colorIdx={i}
                onRemove={removeTicker}
              />
            )
          })}
          {selected.length < 4 && (
            <span className="text-slate-600 text-xs self-center pl-1">
              {4 - selected.length} slot{4 - selected.length !== 1 ? 's' : ''} left
            </span>
          )}
        </div>

        {/* Manual input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={handleInputKey}
            placeholder="Type any ticker… AAPL, VOO, BTC-USD"
            maxLength={12}
            disabled={selected.length >= 4}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60 disabled:opacity-40"
          />
          <button
            onClick={() => addTicker(input)}
            disabled={!input.trim() || selected.length >= 4}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Popular chips */}
        <div>
          <p className="text-xs text-slate-600 font-semibold uppercase tracking-widest mb-2">Quick add</p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR.map(({ ticker, label }) => {
              const isSelected = selected.includes(ticker)
              const isFull     = selected.length >= 4
              return (
                <button
                  key={ticker}
                  onClick={() => isSelected ? removeTicker(ticker) : addTicker(ticker)}
                  disabled={!isSelected && isFull}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : isFull
                      ? 'bg-slate-800/40 border-slate-700/40 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {ticker}
                  <span className="text-slate-500 ml-1">· {label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Chart card ── */}
      <div className="card">
        {/* Period tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-300">Performance (% return from start)</span>
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

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-500" style={{ height: 280 }}>
            <Loader2 className="w-6 h-6 animate-spin text-blue-500/60" />
            <span className="text-sm">Fetching market data…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-3" style={{ height: 280 }}>
            <p className="text-slate-500 text-sm text-center max-w-sm">{error}</p>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg px-3 py-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && selected.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-600" style={{ height: 280 }}>
            <GitCompare className="w-8 h-8" />
            <p className="text-sm">Add a ticker above to get started</p>
          </div>
        )}

        {/* Chart */}
        {!loading && !error && chartRows.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartRows} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#475569', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={d =>
                  new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                }
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${Math.round(v)}`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CompareTooltip />} />
              {seriesWithIdx.map(s => (
                <Line
                  key={s.ticker}
                  type="monotone"
                  dataKey={s.ticker}
                  stroke={COLORS[s.colorIdx]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: COLORS[s.colorIdx] }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Failed tickers note */}
        {!loading && data && data.series.some(s => !s.ok) && (
          <p className="text-xs text-slate-600 mt-2 text-center">
            ⚠ {data.series.filter(s => !s.ok).map(s => s.ticker).join(', ')} — no data found (check ticker symbols)
          </p>
        )}
      </div>

      {/* ── Disclaimer ── */}
      <p className="text-slate-700 text-xs text-center pb-4">
        Historical performance does not guarantee future results. For educational purposes only.
        Data provided by Stooq.com.
      </p>
    </div>
  )
}
