import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import { TrendingUp, DollarSign, Info } from 'lucide-react'

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const fmtShort = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return fmt.format(v)
}

const PRESETS = [
  { label: 'S&P 500 avg', rate: 10.5 },
  { label: 'Conservative', rate: 6.0 },
  { label: 'Aggressive',   rate: 14.0 },
  { label: 'HYSA ~5%',     rate: 5.0 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm shadow-xl min-w-[200px]">
      <p className="font-bold text-white mb-2">Year {label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-6">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold text-white">{fmt.format(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function GrowthCalculatorPage() {
  const [initial, setInitial]     = useState(10000)
  const [monthly, setMonthly]     = useState(500)
  const [rate, setRate]           = useState(10.5)
  const [years, setYears]         = useState(30)
  const [inflation, setInflation] = useState(false)
  const INFLATION_RATE = 3.0

  const data = useMemo(() => {
    const points = []
    let balance = initial
    let balanceNoGrowth = initial
    let totalContributed = initial
    const monthlyRate = rate / 100 / 12
    const inflationMonthly = INFLATION_RATE / 100 / 12

    for (let y = 0; y <= years; y++) {
      const realBalance = inflation
        ? balance / Math.pow(1 + INFLATION_RATE / 100, y)
        : balance

      points.push({
        year: y,
        'Portfolio Value': Math.round(balance),
        'Total Contributed': Math.round(totalContributed),
        ...(inflation ? { 'Inflation-Adjusted': Math.round(realBalance) } : {}),
      })

      // Compound monthly for the year
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyRate) + monthly
        balanceNoGrowth += monthly
        totalContributed += monthly
      }
    }
    return points
  }, [initial, monthly, rate, years, inflation])

  const finalValue = data[data.length - 1]?.['Portfolio Value'] || 0
  const totalContributed = data[data.length - 1]?.['Total Contributed'] || 0
  const totalGrowth = finalValue - totalContributed
  const growthMultiple = totalContributed > 0 ? (finalValue / totalContributed).toFixed(1) : '—'

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Growth Calculator</h1>
      </div>
      <p className="text-slate-400 text-sm mb-8">
        Estimate how your portfolio could grow over time based on regular contributions and assumed returns.
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <label className="card-header">Starting Amount</label>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="number" min="0" value={initial}
              onChange={e => setInitial(Math.max(0, Number(e.target.value)))}
              className="input"
            />
          </div>
        </div>
        <div className="card">
          <label className="card-header">Monthly Contribution</label>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="number" min="0" value={monthly}
              onChange={e => setMonthly(Math.max(0, Number(e.target.value)))}
              className="input"
            />
          </div>
        </div>
        <div className="card">
          <label className="card-header">Annual Return Rate (%)</label>
          <div className="space-y-3">
            <input
              type="range" min="1" max="25" step="0.5" value={rate}
              onChange={e => setRate(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setRate(p.rate)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      rate === p.rate
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <span className="text-blue-400 font-bold text-lg">{rate}%</span>
            </div>
          </div>
        </div>
        <div className="card">
          <label className="card-header">Time Horizon (Years)</label>
          <div className="space-y-3">
            <input
              type="range" min="1" max="50" step="1" value={years}
              onChange={e => setYears(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {[10, 20, 30, 40].map(y => (
                  <button
                    key={y}
                    onClick={() => setYears(y)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      years === y
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {y}yr
                  </button>
                ))}
              </div>
              <span className="text-blue-400 font-bold text-lg">{years} yrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle inflation */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setInflation(p => !p)}
          className={`relative w-10 h-5 rounded-full transition-colors ${inflation ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${inflation ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
        <span className="text-slate-400 text-sm">Show inflation-adjusted value (3% assumed)</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: `Value in ${years} yrs`, value: fmt.format(finalValue), color: 'text-emerald-400' },
          { label: 'Total Contributed', value: fmt.format(totalContributed), color: 'text-blue-400' },
          { label: 'Total Growth', value: fmt.format(totalGrowth), color: 'text-amber-400' },
          { label: 'Growth Multiple', value: `${growthMultiple}×`, color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className="text-slate-500 text-xs mb-1">{label}</p>
            <p className={`font-bold text-xl ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card">
        <div className="card-header">Portfolio Growth Over Time</div>
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradContrib" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradInflation" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }}
              label={{ value: 'Years', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={fmtShort} width={56} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 8 }} />
            <Area type="monotone" dataKey="Portfolio Value"
              stroke="#3b82f6" fill="url(#gradPortfolio)" strokeWidth={2.5} dot={false} />
            <Area type="monotone" dataKey="Total Contributed"
              stroke="#10b981" fill="url(#gradContrib)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            {inflation && (
              <Area type="monotone" dataKey="Inflation-Adjusted"
                stroke="#f59e0b" fill="url(#gradInflation)" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 flex gap-2 bg-slate-800/50 rounded-lg p-4">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-slate-500 text-xs leading-relaxed">
          This calculator uses compound interest with monthly contributions. Results are hypothetical projections
          and do not guarantee future performance. Historical S&P 500 average is approximately 10–11% before inflation.
          Past returns do not predict future results. This is not financial advice.
        </p>
      </div>
    </div>
  )
}
