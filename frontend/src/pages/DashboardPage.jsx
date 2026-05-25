import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle, ArrowLeft, LayoutDashboard, Sparkles } from 'lucide-react'
import { api } from '../utils/api'
import { useSavedSessions } from '../hooks/useSession'

import SummaryBar from '../components/dashboard/SummaryBar'
import ScoreCards from '../components/dashboard/ScoreCards'
import AllocationCharts from '../components/dashboard/AllocationCharts'
import BenchmarkChart from '../components/dashboard/BenchmarkChart'
import HoldingsTable from '../components/dashboard/HoldingsTable'
import ConcentrationWarnings from '../components/dashboard/ConcentrationWarnings'
import EtfRecommendations from '../components/dashboard/EtfRecommendations'
import AgeGuidance from '../components/dashboard/AgeGuidance'
import GainsSummary from '../components/dashboard/GainsSummary'
import ChatPanel from '../components/dashboard/ChatPanel'
import ExportBar from '../components/dashboard/ExportBar'
import SimpleView from '../components/dashboard/SimpleView'
import PerformanceChart from '../components/dashboard/PerformanceChart'

export default function DashboardPage() {
  const { sessionId } = useParams()
  const location = useLocation()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()

  const [analytics, setAnalytics] = useState(location.state?.analytics || null)
  const [loading, setLoading] = useState(!analytics)
  const [error, setError] = useState(null)
  // Default to Simple view; Advanced requires explicit ?view=advanced or toggle
  const [view, setView] = useState(searchParams.get('view') === 'advanced' ? 'advanced' : 'simple')
  const { saveSession } = useSavedSessions()

  useEffect(() => {
    if (analytics) {
      const filename = location.state?.filename || 'Portfolio'
      saveSession(sessionId, analytics, filename)
      return
    }
    api.getPortfolio(sessionId)
      .then((data) => {
        setAnalytics(data)
        saveSession(sessionId, data, 'Portfolio')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-red-300">{error}</p>
      <button onClick={() => nav('/upload')} className="btn-primary">Upload Again</button>
    </div>
  )

  const { summary, holdings, sector_breakdown, asset_class_breakdown,
          concentration, risk_score, diversification_score, benchmark,
          etf_recommendations, age_guidance, gains_summary } = analytics

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4">
        <button
          onClick={() => nav('/upload')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> New Analysis
        </button>

        {/* View toggle */}
        <div className="flex items-center bg-slate-900 border border-slate-700/60 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setView('advanced')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'advanced'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Advanced
          </button>
          <button
            onClick={() => setView('simple')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === 'simple'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Simple
          </button>
        </div>

        <div className="shrink-0">
          <ExportBar sessionId={sessionId} />
        </div>
      </div>

      {/* ── Simple View ── */}
      {view === 'simple' && (
        <SimpleView
          analytics={analytics}
          sessionId={sessionId}
          onAdvancedClick={() => setView('advanced')}
        />
      )}

      {/* ── Advanced View ── */}
      {view === 'advanced' && (
        <div className="px-4 md:px-8 py-6 space-y-6 max-w-screen-2xl mx-auto">
          {/* Summary */}
          <SummaryBar summary={summary} />

          {/* Score Cards */}
          <ScoreCards risk={risk_score} diversification={diversification_score} concentration={concentration} />

          {/* Gains summary (if available) */}
          {gains_summary?.available && <GainsSummary gains={gains_summary} />}

          {/* Age guidance */}
          {age_guidance && <AgeGuidance guidance={age_guidance} />}

          {/* Allocation Charts */}
          <AllocationCharts sectors={sector_breakdown} assetClasses={asset_class_breakdown} holdings={holdings} />

          {/* Benchmark */}
          {benchmark?.available && <BenchmarkChart benchmark={benchmark} />}

          {/* Portfolio vs S&P 500 line chart */}
          <PerformanceChart sessionId={sessionId} />

          {/* Warnings */}
          {concentration?.warnings?.length > 0 && (
            <ConcentrationWarnings warnings={concentration.warnings} />
          )}

          {/* ETF Recommendations */}
          {etf_recommendations?.recommendations?.length > 0 && (
            <EtfRecommendations etfData={etf_recommendations} />
          )}

          {/* Holdings Table */}
          <HoldingsTable holdings={holdings} />

          {/* AI Chat Panel */}
          <ChatPanel sessionId={sessionId} />

          {/* Disclaimer */}
          <div className="text-center pb-8">
            <p className="text-slate-600 text-xs max-w-2xl mx-auto leading-relaxed">
              {analytics.disclaimer}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
