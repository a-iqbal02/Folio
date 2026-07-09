import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layers, Loader2, AlertCircle, ArrowLeft, Info } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../utils/api'
import DonutChart from '../components/shared/DonutChart'
import ModelPortfolioPerformanceChart from '../components/model-portfolios/ModelPortfolioPerformanceChart'

const ALLOCATION_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b']

const BUCKET_STYLES = {
  Conservative: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  Moderate: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  Balanced: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  Growth: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  Aggressive: 'text-red-400 bg-red-500/10 border-red-500/30',
}

function BucketBadge({ bucket }) {
  const style = BUCKET_STYLES[bucket] || 'text-slate-400 bg-slate-500/10 border-slate-500/30'
  return (
    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', style)}>
      {bucket}
    </span>
  )
}

function PortfolioCard({ portfolio, highlighted, onClick }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'card cursor-pointer transition-all duration-200 hover:border-slate-600',
        highlighted && 'border-blue-500/60 bg-blue-500/5 ring-1 ring-blue-500/30'
      )}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <BucketBadge bucket={portfolio.risk_bucket} />
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
          {(portfolio.blended_expense_ratio).toFixed(2)}% blended ER
        </span>
      </div>
      <p className="text-slate-100 font-semibold text-base mb-1">{portfolio.name}</p>
      <p className="text-slate-400 text-xs leading-relaxed mb-3">{portfolio.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {portfolio.holdings.map(h => (
          <span key={h.ticker} className="font-mono text-xs bg-slate-800 text-blue-300 px-2 py-0.5 rounded-full border border-slate-700/60">
            {h.ticker} {h.weight}%
          </span>
        ))}
      </div>
    </div>
  )
}

function PortfolioDetail({ portfolio, onBack }) {
  const chartData = portfolio.allocation_breakdown.map(a => ({ category: a.category, weight_pct: a.weight_pct }))

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> All Model Portfolios
      </button>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <BucketBadge bucket={portfolio.risk_bucket} />
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
          {portfolio.blended_expense_ratio.toFixed(2)}% blended expense ratio
        </span>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">{portfolio.name}</h1>
      <p className="text-slate-400 text-sm mb-6 max-w-2xl">{portfolio.description}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="card-header">Holdings</div>
          <div className="space-y-2">
            {portfolio.holdings.map(h => (
              <div key={h.ticker} className="flex items-center justify-between border-b border-slate-800 last:border-0 pb-2 last:pb-0">
                <span className="font-mono text-sm font-semibold text-blue-400">{h.ticker}</span>
                <span className="text-slate-300 text-sm font-semibold">{h.weight}%</span>
              </div>
            ))}
          </div>
        </div>

        <DonutChart
          data={chartData}
          colors={ALLOCATION_COLORS}
          title="Asset Allocation"
          nameKey="category"
          subtitle="Hover slices for details"
        />
      </div>

      <ModelPortfolioPerformanceChart portfolioId={portfolio.id} />

      <div className="flex items-start gap-2 bg-slate-800/40 border border-slate-800 rounded-lg px-4 py-3 mt-4 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          "Asset Allocation" reflects each holding's broad asset class (US/International Equities, Bonds, Commodities) —
          not a sector-by-sector look-through of each fund's underlying holdings. Expense ratios are approximate.
          Nothing here is investment advice.
        </p>
      </div>
    </div>
  )
}

export default function ModelPortfoliosPage() {
  const [searchParams] = useSearchParams()
  const [portfolios, setPortfolios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  const bucketParam = searchParams.get('bucket')

  useEffect(() => {
    api.listModelPortfolios()
      .then(data => {
        setPortfolios(data)
        if (bucketParam) {
          const match = data.find(p => p.risk_bucket.toLowerCase() === bucketParam.toLowerCase())
          if (match) setSelectedId(match.id)
        }
      })
      .catch(err => setError(err.message || 'Failed to load model portfolios.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = useMemo(() => portfolios.find(p => p.id === selectedId), [portfolios, selectedId])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        <p className="text-slate-500 text-sm">Loading model portfolios…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {selected ? (
        <PortfolioDetail portfolio={selected} onBack={() => setSelectedId(null)} />
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Model Portfolios</h1>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            5 curated, low-cost ETF portfolios — one per risk profile. Click any card for holdings, allocation, and a
            hypothetical historical backtest.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {portfolios.map(p => (
              <PortfolioCard
                key={p.id}
                portfolio={p}
                highlighted={bucketParam && p.risk_bucket.toLowerCase() === bucketParam.toLowerCase()}
                onClick={() => setSelectedId(p.id)}
              />
            ))}
          </div>

          <p className="text-slate-700 text-xs text-center mt-10 leading-relaxed max-w-2xl mx-auto">
            Model portfolios are educational examples, not personalized investment advice. Historical performance is a
            hypothetical, non-rebalanced backtest and does not indicate future results.
          </p>
        </>
      )}
    </div>
  )
}
