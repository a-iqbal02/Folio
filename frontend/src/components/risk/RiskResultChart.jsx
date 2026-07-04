import { useNavigate } from 'react-router-dom'
import { ArrowRight, RotateCcw } from 'lucide-react'
import DonutChart from '../shared/DonutChart'

const ALLOCATION_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b']

export default function RiskResultChart({ result, onRetake }) {
  const nav = useNavigate()
  const { score, bucket, allocation, description } = result

  const chartData = Object.entries(allocation).map(([category, weight_pct]) => ({
    category,
    weight_pct,
  }))

  return (
    <div>
      <div className="text-center mb-6">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-1">Your risk profile</p>
        <h2 className="text-3xl font-extrabold text-white mb-2">{bucket}</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">{description}</p>
        <p className="text-slate-600 text-xs mt-2">Score: {score} / 25</p>
      </div>

      <DonutChart
        data={chartData}
        colors={ALLOCATION_COLORS}
        title="Suggested Asset Allocation"
        nameKey="category"
        subtitle="Hover slices for details"
      />

      <div className="flex flex-col sm:flex-row gap-2 mt-6">
        <button
          onClick={() => nav(`/model-portfolios?bucket=${encodeURIComponent(bucket)}`)}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          See matching Model Portfolios <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onRetake}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Retake
        </button>
      </div>
    </div>
  )
}
