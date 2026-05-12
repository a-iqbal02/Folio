import { TrendingUp, TrendingDown } from 'lucide-react'
import { fmt } from '../../utils/format'
import clsx from 'clsx'

export default function GainsSummary({ gains }) {
  if (!gains?.available) return null
  const positive = gains.total_gain_loss >= 0

  return (
    <div className="card">
      <div className="card-header">Unrealized Gains / Losses</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric label="Total Cost Basis"  value={fmt.currency(gains.total_cost_basis)} />
        <Metric label="Total Market Value" value={fmt.currency(gains.total_market_value)} />
        <Metric
          label="Unrealized G/L"
          value={fmt.gain(gains.total_gain_loss)}
          sub={fmt.gainPct(gains.total_gain_loss_pct)}
          positive={positive}
          icon={positive ? TrendingUp : TrendingDown}
        />
        <Metric
          label="Winners / Losers"
          value={`${gains.positions_with_gains} / ${gains.positions_with_losses}`}
        />
      </div>
    </div>
  )
}

function Metric({ label, value, sub, positive, icon: Icon }) {
  return (
    <div>
      <p className="text-slate-500 text-xs">{label}</p>
      <p className={clsx(
        'font-bold text-lg mt-0.5',
        positive === true ? 'text-emerald-400' : positive === false ? 'text-red-400' : 'text-white'
      )}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}
