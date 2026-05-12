import { scoreColor } from '../../utils/format'

function Gauge({ score, color, label, description, subtitle }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, score || 0))
  const offset = circ * (1 - pct / 100)

  return (
    <div className="card flex flex-col items-center text-center">
      <div className="card-header w-full text-left">{label}</div>
      <svg width="130" height="130" viewBox="0 0 130 130" className="my-1">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="65" y="61" textAnchor="middle" fill="white" fontSize="22" fontWeight="700">
          {score ?? '—'}
        </text>
        <text x="65" y="78" textAnchor="middle" fill="#94a3b8" fontSize="10">
          / 100
        </text>
      </svg>
      <p className="font-semibold text-sm" style={{ color }}>{subtitle}</p>
      <p className="text-slate-500 text-xs mt-1.5 leading-relaxed px-2">{description}</p>
    </div>
  )
}

export default function ScoreCards({ risk, diversification, concentration }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Gauge
        score={risk?.score}
        color={risk?.color || '#94a3b8'}
        label="Risk Score"
        subtitle={risk?.label || 'Unavailable'}
        description={risk?.description || 'Beta data unavailable for your holdings.'}
      />
      <Gauge
        score={diversification?.score}
        color={diversification?.color || '#94a3b8'}
        label="Diversification Score"
        subtitle={diversification?.label || 'N/A'}
        description={`Holdings: ${diversification?.components?.holdings_score?.toFixed(0) ?? '?'} · Sectors: ${diversification?.components?.sector_score?.toFixed(0) ?? '?'} · Spread: ${diversification?.components?.hhi_score?.toFixed(0) ?? '?'}`}
      />
      <Gauge
        score={concentration?.hhi_score}
        color={concentration?.concentration_color === 'green' ? '#10b981'
            : concentration?.concentration_color === 'yellow' ? '#f59e0b'
            : concentration?.concentration_color === 'orange' ? '#f97316'
            : '#ef4444'}
        label="Concentration (HHI)"
        subtitle={concentration?.concentration_label || 'N/A'}
        description={`Top 5 holdings: ${concentration?.top5_weight_pct ?? '—'}% · Top 10: ${concentration?.top10_weight_pct ?? '—'}%`}
      />
    </div>
  )
}
