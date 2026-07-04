import { useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector
} from 'recharts'

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const CustomTooltip = ({ active, payload }) => {
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

export default function DonutChart({ data, colors, title, valueKey = 'weight_pct', nameKey, subtitle }) {
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
          <Tooltip content={<CustomTooltip />} />
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
