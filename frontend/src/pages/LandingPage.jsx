import { useNavigate } from 'react-router-dom'
import { Upload, PenSquare, ShieldCheck, BarChart3, TrendingUp, Layers } from 'lucide-react'
import FolioLogo from '../components/layout/FolioLogo'

const FEATURES = [
  { icon: ShieldCheck, title: 'Concentration Analysis', desc: 'HHI scoring, per-position warnings, and sector overlap detection.' },
  { icon: BarChart3,   title: 'Benchmark Comparison',  desc: 'See how your sector weights compare to the S&P 500.' },
  { icon: TrendingUp,  title: 'Risk Scoring',           desc: 'Weighted-beta risk score calibrated to your actual holdings.' },
  { icon: Layers,      title: 'ETF Insights',           desc: 'Detect redundant ETF overlap and consolidation opportunities.' },
]

export default function LandingPage() {
  const nav = useNavigate()
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        {/* Large logo mark */}
        <div className="mb-8 flex justify-center">
          <FolioLogo size={72} showWordmark={true} showTagline={true} />
        </div>

        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          <span className="text-blue-400 text-xs font-semibold tracking-wide uppercase">Educational Analysis Tool</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight max-w-3xl">
          Understand what's inside<br />
          <span className="text-blue-400">your portfolio</span>
        </h1>
        <p className="mt-5 text-slate-400 text-lg max-w-xl leading-relaxed">
          Upload any brokerage export and get instant analysis on concentration,
          risk exposure, sector allocation, and ETF alternatives.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-9">
          <button onClick={() => nav('/upload')} className="btn-primary flex items-center gap-2 text-base px-7 py-3">
            <Upload className="w-4 h-4" /> Upload a File
          </button>
          <button onClick={() => nav('/manual')} className="btn-ghost flex items-center gap-2 text-base px-7 py-3">
            <PenSquare className="w-4 h-4" /> Enter Manually
          </button>
        </div>
        <p className="mt-5 text-slate-600 text-xs">
          Supports CSV · Excel · PDF · Images · Paste · Manual entry
        </p>
      </section>

      {/* Feature cards */}
      <section className="border-t border-slate-800 px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card hover:border-slate-700 transition-colors">
              <div className="flex items-start gap-4">
                <div className="bg-blue-500/10 rounded-lg p-2.5 shrink-0">
                  <Icon className="text-blue-400 w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 mb-1">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <div className="border-t border-slate-800 px-6 py-4 text-center">
        <p className="text-slate-600 text-xs max-w-xl mx-auto">
          Folio is an educational tool. Nothing displayed constitutes financial advice, a recommendation to buy or sell, or investment guidance. Always consult a licensed financial advisor.
        </p>
      </div>
    </div>
  )
}
