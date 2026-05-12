import { User } from 'lucide-react'
import clsx from 'clsx'

const ALIGN_COLORS = {
  aligned:     'text-emerald-400',
  aggressive:  'text-amber-400',
  conservative: 'text-blue-400',
}

export default function AgeGuidance({ guidance }) {
  if (!guidance) return null
  const { age, actual_equity_pct, suggested_equity_pct, alignment, tone, disclaimer } = guidance
  const color = ALIGN_COLORS[alignment] || 'text-slate-300'

  return (
    <div className="card border-blue-500/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-blue-500/10 rounded-lg p-2 shrink-0">
          <User className="w-4 h-4 text-blue-400" />
        </div>
        <div className="card-header mb-0">Age-Based Context (Age {age})</div>
      </div>
      <p className={clsx('text-sm font-medium mb-1', color)}>
        Alignment: {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
      </p>
      <p className="text-slate-300 text-sm leading-relaxed mb-2">{tone}</p>
      <div className="flex gap-6 text-xs text-slate-500 mt-3">
        <span>Your equity: <strong className="text-slate-300">{actual_equity_pct}%</strong></span>
        <span>Guideline suggests: <strong className="text-slate-300">~{suggested_equity_pct}%</strong></span>
      </div>
      <p className="text-slate-600 text-xs mt-3">{disclaimer}</p>
    </div>
  )
}
