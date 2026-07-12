import { useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'
import MetricsRow from '../components/home/MetricsRow'
import SectorAllocation from '../components/home/SectorAllocation'
import TopHoldings from '../components/home/TopHoldings'
import InsightsGrid from '../components/home/InsightsGrid'

export default function LandingPage() {
  const nav = useNavigate()

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-5">
      {/* Top row: title, description, actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-800 mb-4">
        <div>
          <h1 className="text-lg font-bold text-white">Portfolio Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analyze concentration, risk, sector exposure, and ETF overlap in your holdings.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => nav('/upload?sample=1')}
            className="btn-ghost text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Try Sample Portfolio
          </button>
          <button
            onClick={() => nav('/upload')}
            className="btn-primary text-sm flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Portfolio
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-600 mb-4">
        Showing example data. Upload a portfolio or try the sample above to see your own.
      </p>

      {/* Metrics row */}
      <div className="mb-3">
        <MetricsRow />
      </div>

      {/* Sector allocation (large, left) + top holdings (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 mb-3 items-start">
        <SectorAllocation />
        <TopHoldings />
      </div>

      {/* Insights: warnings, overlap, benchmark comparison, suggestions */}
      <InsightsGrid />

      {/* Disclaimer */}
      <div className="border-t border-slate-800 mt-6 pt-4">
        <p className="text-slate-600 text-xs max-w-2xl">
          Folio is an educational tool. Nothing displayed constitutes financial advice, a
          recommendation to buy or sell, or investment guidance. Always consult a licensed
          financial advisor.
        </p>
      </div>
    </div>
  )
}
