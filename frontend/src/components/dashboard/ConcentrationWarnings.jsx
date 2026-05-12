import { AlertCircle, AlertTriangle, Info, TrendingUp } from 'lucide-react'
import clsx from 'clsx'

const SEVERITY_CFG = {
  high: {
    icon: AlertCircle,
    wrap: 'bg-red-500/10 border-red-500/20',
    title: 'text-red-400',
    body: 'text-red-300/80',
    badge: 'bg-red-500/20 text-red-400',
    label: 'High',
  },
  medium: {
    icon: AlertTriangle,
    wrap: 'bg-amber-500/10 border-amber-500/20',
    title: 'text-amber-400',
    body: 'text-amber-300/80',
    badge: 'bg-amber-500/20 text-amber-400',
    label: 'Medium',
  },
  low: {
    icon: Info,
    wrap: 'bg-blue-500/10 border-blue-500/20',
    title: 'text-blue-400',
    body: 'text-blue-300/80',
    badge: 'bg-blue-500/20 text-blue-400',
    label: 'Low',
  },
  info: {
    icon: TrendingUp,
    wrap: 'bg-slate-700/30 border-slate-600/30',
    title: 'text-slate-300',
    body: 'text-slate-400',
    badge: 'bg-slate-700 text-slate-400',
    label: 'Info',
  },
}

const TYPE_LABELS = {
  single_stock:            'Single Stock',
  sector_etf_concentration:'Sector ETF',
  sector_concentration:    'Sector',
  low_diversification:     'Diversification',
  etf_weight_info:         'ETF Weight',
}

function WarningCard({ warning }) {
  const cfg = SEVERITY_CFG[warning.severity] || SEVERITY_CFG.info
  const Icon = cfg.icon
  const typeLabel = TYPE_LABELS[warning.type] || 'Observation'

  return (
    <div className={clsx('flex gap-4 border rounded-xl p-4', cfg.wrap)}>
      <Icon className={clsx('w-5 h-5 shrink-0 mt-0.5', cfg.title)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className={clsx('font-semibold text-sm', cfg.title)}>{warning.title}</p>
          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', cfg.badge)}>
            {typeLabel}
          </span>
        </div>
        <p className={clsx('text-xs leading-relaxed', cfg.body)}>{warning.description}</p>
      </div>
    </div>
  )
}

export default function ConcentrationWarnings({ warnings }) {
  if (!warnings?.length) return null

  // Separate real warnings from informational notes
  const realWarnings = warnings.filter(w => w.severity !== 'info')
  const infoNotes = warnings.filter(w => w.severity === 'info')

  return (
    <div className="card">
      <div className="card-header">Concentration Observations</div>
      <div className="space-y-3">
        {realWarnings.map((w, i) => <WarningCard key={i} warning={w} />)}
        {infoNotes.length > 0 && (
          <>
            {realWarnings.length > 0 && <div className="border-t border-slate-800 my-1" />}
            {infoNotes.map((w, i) => <WarningCard key={`info-${i}`} warning={w} />)}
          </>
        )}
      </div>
    </div>
  )
}
