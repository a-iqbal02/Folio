import { Layers, AlertTriangle, BarChart3, Target, Sparkles } from 'lucide-react'
import clsx from 'clsx'

const TYPE_CFG = {
  consolidation: { icon: Layers,        label: 'Consolidation Opportunity', color: 'blue'   },
  overlap:        { icon: AlertTriangle, label: 'ETF Overlap Detected',       color: 'amber'  },
  broad_market:   { icon: BarChart3,     label: 'Broad Market Exposure',      color: 'purple' },
  goal_based:     { icon: Target,        label: 'Aligned with Your Goals',    color: 'green'  },
}

const COLOR_STYLES = {
  blue:   { wrap: 'bg-blue-500/8 border-blue-500/20',   icon: 'text-blue-400',   label: 'text-blue-400'   },
  amber:  { wrap: 'bg-amber-500/8 border-amber-500/20', icon: 'text-amber-400',  label: 'text-amber-400'  },
  purple: { wrap: 'bg-purple-500/8 border-purple-500/20',icon:'text-purple-400', label: 'text-purple-400' },
  green:  { wrap: 'bg-emerald-500/8 border-emerald-500/20', icon: 'text-emerald-400', label: 'text-emerald-400' },
}

function EtfChip({ etf }) {
  return (
    <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2.5 text-xs hover:border-slate-500 transition-colors">
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="font-mono font-bold text-blue-400 text-sm">{etf.ticker}</p>
        {etf.expense_ratio != null && (
          <span className="text-emerald-400 font-semibold">{(etf.expense_ratio * 100).toFixed(2)}% ER</span>
        )}
      </div>
      <p className="text-slate-300 font-medium leading-snug">{etf.name}</p>
      {etf.description && (
        <p className="text-slate-500 mt-0.5 leading-snug">{etf.description}</p>
      )}
    </div>
  )
}

function RecCard({ rec }) {
  const cfg = TYPE_CFG[rec.type] || TYPE_CFG.broad_market
  const colors = COLOR_STYLES[cfg.color]
  const Icon = cfg.icon

  return (
    <div className={clsx('border rounded-xl p-5', colors.wrap)}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={clsx('w-4 h-4 shrink-0', colors.icon)} />
        <span className={clsx('text-xs font-bold uppercase tracking-wider', colors.label)}>
          {rec.goal_label ? `${cfg.label} — ${rec.goal_label}` : cfg.label}
        </span>
      </div>
      <p className="font-semibold text-slate-100 text-sm mb-1.5">{rec.title}</p>
      <p className="text-slate-400 text-xs leading-relaxed mb-4">{rec.description}</p>
      {rec.etf_options?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rec.etf_options.map((e) => <EtfChip key={e.ticker} etf={e} />)}
        </div>
      )}
      {rec.overlapping_tickers?.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {rec.overlapping_tickers.map(t => (
            <span key={t} className="font-mono text-xs bg-amber-500/15 text-amber-300 px-2 py-1 rounded">{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EtfRecommendations({ etfData }) {
  const goalRecs = etfData.recommendations.filter(r => r.type === 'goal_based')
  const autoRecs = etfData.recommendations.filter(r => r.type !== 'goal_based')

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="card-header mb-0">ETF Insights & Recommendations</div>
        {etfData.goals_analyzed && (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-semibold">Goal-matched</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Goal-based recommendations first */}
        {goalRecs.map((rec, i) => <RecCard key={`goal-${i}`} rec={rec} />)}
        {/* Auto-detected recommendations */}
        {autoRecs.map((rec, i) => <RecCard key={`auto-${i}`} rec={rec} />)}
      </div>

      <p className="text-slate-600 text-xs mt-5 leading-relaxed border-t border-slate-800 pt-4">
        {etfData.disclaimer}
      </p>
    </div>
  )
}
