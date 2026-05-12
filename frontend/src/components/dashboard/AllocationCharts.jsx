import { useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector
} from 'recharts'

const SECTOR_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6','#a78bfa','#fb7185',
]
const ASSET_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4']
const HOLDINGS_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316',
  '#84cc16','#ec4899','#14b8a6','#a78bfa','#fb7185','#fbbf24','#34d399',
  '#60a5fa','#f472b6','#a3e635','#38bdf8','#fb923c','#c084fc',
]

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const CustomTooltip = ({ active, payload, nameKey }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm shadow-xl min-w-[160px]">
      <p className="font-semibold text-white mb-2">{d.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Weight</span>
          <span className="font-bold text-white">{d.value?.toFixed(1)}%</span>
        </div>
        {d.payload?.market_value && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Value</span>
            <span className="text-slate-300">{fmt.format(d.payload.market_value)}</span>
          </div>
        )}
        {d.payload?.count && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Holdings</span>
            <span className="text-slate-300">{d.payload.count}</span>
          </div>
        )}
      </div>
    </div>
  )
}

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  )
}

function DonutChart({ data, colors, title, valueKey = 'weight_pct', nameKey, subtitle }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const RADIAN = Math.PI / 180

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    if (value < 5) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="700">
        {value.toFixed(0)}%
      </text>
    )
  }

  return (
    <div className="card">
      <div className="card-header">{title}</div>
      {subtitle && <p className="text-slate-500 text-xs mb-2 -mt-2">{subtitle}</p>}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={108}
            paddingAngle={2}
            labelLine={false}
            label={renderLabel}
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={colors[i % colors.length]}
                stroke="transparent"
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip nameKey={nameKey} />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(val) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{val}</span>}
            wrapperStyle={{ paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function AllocationCharts({ sectors, assetClasses, holdings }) {
  // Build top holdings chart data — top 12 by weight, rest as "Other"
  const topN = 12
  const sortedHoldings = [...(holdings || [])].sort((a, b) => b.weight_pct - a.weight_pct)
  const topHoldings = sortedHoldings.slice(0, topN)
  const otherWeight = sortedHoldings.slice(topN).reduce((sum, h) => sum + (h.weight_pct || 0), 0)
  const otherValue = sortedHoldings.slice(topN).reduce((sum, h) => sum + (h.market_value || 0), 0)

  const holdingsChartData = topHoldings.map(h => ({
    ticker: h.ticker,
    weight_pct: parseFloat((h.weight_pct || 0).toFixed(1)),
    market_value: h.market_value,
  }))
  if (otherWeight > 0.1) {
    holdingsChartData.push({ ticker: 'Other', weight_pct: parseFloat(otherWeight.toFixed(1)), market_value: otherValue })
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Sector + Asset Class */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DonutChart
          data={sectors || []}
          colors={SECTOR_COLORS}
          title="Sector Allocation"
          nameKey="sector"
          subtitle="Hover slices for details"
        />
        <DonutChart
          data={assetClasses || []}
          colors={ASSET_COLORS}
          title="Asset Class Allocation"
          nameKey="asset_class"
          subtitle="Hover slices for details"
        />
      </div>

      {/* Row 2: Individual Holdings */}
      {holdingsChartData.length > 0 && (
        <DonutChart
          data={holdingsChartData}
          colors={HOLDINGS_COLORS}
          title="Holdings Breakdown"
          nameKey="ticker"
          subtitle={`Top ${Math.min(topN, holdingsChartData.length)} positions by weight · Hover for details`}
        />
      )}
    </div>
  )
}
