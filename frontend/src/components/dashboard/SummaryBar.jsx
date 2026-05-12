import { fmt } from '../../utils/format'
import { DollarSign, Layers, PieChart, TrendingUp } from 'lucide-react'

export default function SummaryBar({ summary }) {
  const metrics = [
    { label: 'Total Portfolio Value', value: fmt.currency(summary?.total_value), icon: DollarSign, color: 'blue' },
    { label: 'Holdings',             value: summary?.total_holdings ?? '—',      icon: Layers,      color: 'purple' },
    { label: 'Sectors',              value: summary?.unique_sectors ?? '—',       icon: PieChart,    color: 'emerald' },
    { label: 'Cost Basis Available', value: summary?.has_cost_basis ? 'Yes' : 'No', icon: TrendingUp, color: 'amber' },
  ]

  const colorMap = {
    blue:    'bg-blue-500/10 text-blue-400',
    purple:  'bg-purple-500/10 text-purple-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber:   'bg-amber-500/10 text-amber-400',
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="card flex items-center gap-4">
          <div className={`${colorMap[color]} rounded-xl p-3 shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-slate-500 text-xs leading-tight">{label}</p>
            <p className="text-white font-bold text-xl mt-0.5 truncate">{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
