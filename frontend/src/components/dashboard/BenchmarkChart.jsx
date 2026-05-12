import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, LabelList
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const portfolio = payload.find(p => p.dataKey === 'portfolio')
  const sp500 = payload.find(p => p.dataKey === 'sp500')
  const delta = (portfolio?.value || 0) - (sp500?.value || 0)
  const status = delta > 0.5 ? 'Overweight' : delta < -0.5 ? 'Underweight' : 'Neutral'
  const statusColor = delta > 0.5 ? '#3b82f6' : delta < -0.5 ? '#8b5cf6' : '#64748b'

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm shadow-xl min-w-[200px]">
      <p className="font-bold text-white mb-3 text-base">{label}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-center gap-6">
          <span className="text-slate-400">Your Portfolio</span>
          <span className="font-semibold text-blue-400">{portfolio?.value?.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-center gap-6">
          <span className="text-slate-400">S&P 500</span>
          <span className="font-semibold text-slate-300">{sp500?.value?.toFixed(1)}%</span>
        </div>
        <div className="border-t border-slate-700 pt-2 flex justify-between items-center">
          <span className="text-slate-400">Difference</span>
          <span className="font-bold" style={{ color: statusColor }}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}% ({status})
          </span>
        </div>
      </div>
    </div>
  )
}

export default function BenchmarkChart({ benchmark }) {
  if (!benchmark?.available) return null

  const data = benchmark.sectors
    .filter((s) => s.sector !== 'Unknown' && (s.portfolio_pct > 0.1 || s.sp500_pct > 0.1))
    .sort((a, b) => b.portfolio_pct - a.portfolio_pct)
    .map((s) => ({
      sector: s.sector
        .replace('Consumer Discretionary', 'Con. Discretionary')
        .replace('Consumer Staples', 'Con. Staples')
        .replace('Communication Services', 'Comm. Services')
        .replace('Financial Services', 'Financials'),
      portfolio: parseFloat(s.portfolio_pct.toFixed(1)),
      sp500: parseFloat(s.sp500_pct.toFixed(1)),
      delta: s.delta,
      status: s.status,
      fullSector: s.sector,
    }))

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="card-header mb-0">Portfolio vs S&P 500 Sector Weights</div>
          <p className="text-slate-500 text-xs mt-1 mb-4">
            Hover any bar for details · Reference: S&P 500 {benchmark.sp500_reference_date}
          </p>
        </div>
        <div className="flex gap-4 text-xs text-slate-500 shrink-0 mt-1">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Overweight</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" /> Underweight</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-600 inline-block" /> Neutral</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={data}
          margin={{ top: 16, right: 16, left: 0, bottom: 60 }}
          barGap={3}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="sector"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            angle={-40}
            textAnchor="end"
            interval={0}
            tickLine={false}
            axisLine={{ stroke: '#1e293b' }}
            height={70}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            unit="%"
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.06)' }} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingBottom: 8 }}
            formatter={(val) => val === 'portfolio' ? 'Your Portfolio' : 'S&P 500'}
          />
          <Bar dataKey="portfolio" name="portfolio" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.status === 'overweight' ? '#3b82f6'
                  : d.status === 'underweight' ? '#8b5cf6'
                  : '#475569'
                }
              />
            ))}
            <LabelList
              dataKey="portfolio"
              position="top"
              formatter={(v) => v > 2 ? `${v}%` : ''}
              style={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }}
            />
          </Bar>
          <Bar dataKey="sp500" name="sp500" fill="#334155" stroke="#475569" strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={36}>
            <LabelList
              dataKey="sp500"
              position="top"
              formatter={(v) => v > 2 ? `${v}%` : ''}
              style={{ fill: '#64748b', fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
