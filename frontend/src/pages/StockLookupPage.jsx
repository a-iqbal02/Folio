import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { Search, Loader2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { api } from '../utils/api'

const PERIODS = [
  { key: '1d',  label: '1D' },
  { key: '5d',  label: '1W' },
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1y',  label: '1Y' },
  { key: '2y',  label: '2Y' },
  { key: '5y',  label: '5Y' },
]

const POPULAR = [
  { ticker: 'AAPL', label: 'Apple' },
  { ticker: 'MSFT', label: 'Microsoft' },
  { ticker: 'NVDA', label: 'Nvidia' },
  { ticker: 'SPY',  label: 'S&P 500' },
  { ticker: 'QQQ',  label: 'Nasdaq' },
  { ticker: 'VTI',  label: 'Total Market' },
  { ticker: 'TSLA', label: 'Tesla' },
  { ticker: 'AMZN', label: 'Amazon' },
]

function fmtPrice(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
}

function QuoteTooltip({ active, payload, label, isIntraday }) {
  if (!active || !payload?.length) return null
  const d = new Date(label)
  const dateLabel = isIntraday
    ? d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{dateLabel}</p>
      <p className="text-slate-100 font-bold">{fmtPrice(payload[0].value)}</p>
    </div>
  )
}

export default function StockLookupPage() {
  const [ticker,  setTicker]  = useState('AAPL')
  const [input,   setInput]   = useState('')
  const [period,  setPeriod]  = useState('3mo')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const fetchQuote = useCallback(async (t, p) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getQuote(t, p)
      setData(res)
    } catch (e) {
      setError(e.message || 'Could not load price data.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQuote(ticker, period) }, [ticker, period, fetchQuote])

  function lookup(raw) {
    const t = raw.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '')
    if (!t) return
    setTicker(t)
    setInput('')
  }

  const chartRows = data ? data.labels.map((date, i) => ({ date, price: data.prices[i] })) : []
  const isUp = data?.change_pct != null && data.change_pct >= 0

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-500/10 rounded-xl p-2.5 shrink-0">
          <Search className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Stock Lookup</h1>
          <p className="text-slate-500 text-sm">Look up any stock or ETF's price history, from the past day to 5 years</p>
        </div>
      </div>

      {/* ── Search card ── */}
      <div className="card space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') lookup(input) }}
            placeholder="Type a ticker… AAPL, VOO, TSLA"
            maxLength={12}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/60"
          />
          <button
            onClick={() => lookup(input)}
            disabled={!input.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Search className="w-4 h-4" /> Look up
          </button>
        </div>

        <div>
          <p className="text-xs text-slate-600 font-semibold uppercase tracking-widest mb-2">Popular</p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR.map(({ ticker: t, label }) => (
              <button
                key={t}
                onClick={() => lookup(t)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                  ticker === t
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                }`}
              >
                {t}<span className="text-slate-500 ml-1">· {label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quote card ── */}
      <div className="card">
        {/* Ticker + price header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="text-2xl font-bold text-slate-100">{ticker}</p>
            {data && !loading && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-semibold text-slate-200">{fmtPrice(data.current_price)}</span>
                {data.change_pct != null && (
                  <span className={`flex items-center gap-0.5 text-sm font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {isUp ? '+' : ''}{data.change_pct.toFixed(2)}%
                  </span>
                )}
              </div>
            )}
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
            <span className="text-sm">Fetching price data…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center gap-3" style={{ height: 280 }}>
            <p className="text-slate-500 text-sm text-center max-w-sm">{error}</p>
            <button
              onClick={() => fetchQuote(ticker, period)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg px-3 py-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Try again
            </button>
          </div>
        )}

        {/* Chart */}
        {!loading && !error && chartRows.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartRows} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="quoteFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#475569', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={d => {
                    const dt = new Date(d)
                    return data.is_intraday
                      ? dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${Math.round(v)}`}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<QuoteTooltip isIntraday={data.is_intraday} />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isUp ? '#10b981' : '#ef4444'}
                  strokeWidth={2}
                  fill="url(#quoteFill)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Stat row */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800">
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-widest mb-0.5">Period High</p>
                <p className="text-sm font-semibold text-slate-200">{fmtPrice(data.period_high)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-widest mb-0.5">Period Low</p>
                <p className="text-sm font-semibold text-slate-200">{fmtPrice(data.period_low)}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="text-slate-700 text-xs text-center pb-4">
        For educational purposes only — not investment advice. Data provided by Stooq.com / Yahoo Finance.
      </p>
    </div>
  )
}
