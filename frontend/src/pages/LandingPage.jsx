import { useNavigate } from 'react-router-dom'
import { Upload, ShieldCheck, BarChart3, Layers } from 'lucide-react'
import DashboardPreview from '../components/landing/DashboardPreview'

const CAPABILITIES = [
  { icon: ShieldCheck, text: 'Concentration scoring (HHI) with per-position warnings' },
  { icon: BarChart3,   text: 'Sector weights benchmarked against the S&P 500' },
  { icon: Layers,      text: 'ETF overlap detection across your full holdings list' },
]

export default function LandingPage() {
  const nav = useNavigate()

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
      <section className="grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-10 items-start">
        {/* Intro */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400/80 mb-3">
            Portfolio Analysis
          </p>
          <h1 className="text-3xl md:text-[2.25rem] font-bold text-white leading-[1.15] mb-4">
            See what's actually in your portfolio.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-6 max-w-md">
            Folio analyzes concentration, risk, sector exposure, benchmark performance, and ETF
            overlap — from a brokerage export, pasted holdings, or manual entry. No account
            required to try it.
          </p>

          <div className="flex flex-wrap gap-3 mb-3">
            <button
              onClick={() => nav('/upload')}
              className="btn-primary flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <Upload className="w-4 h-4" /> Upload portfolio
            </button>
            <button
              onClick={() => nav('/upload?sample=1')}
              className="btn-ghost flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Try sample portfolio
            </button>
          </div>
          <button
            onClick={() => nav('/upload?tab=manual')}
            className="text-sm text-slate-500 hover:text-slate-300 underline underline-offset-2 decoration-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            or enter holdings manually
          </button>

          <ul className="mt-10 space-y-3 border-t border-slate-800 pt-6">
            {CAPABILITIES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-slate-400">
                <Icon className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Live product preview */}
        <DashboardPreview />
      </section>

      {/* Disclaimer */}
      <div className="border-t border-slate-800 mt-14 pt-5 text-center">
        <p className="text-slate-600 text-xs max-w-xl mx-auto">
          Folio is an educational tool. Nothing displayed constitutes financial advice, a
          recommendation to buy or sell, or investment guidance. Always consult a licensed
          financial advisor.
        </p>
      </div>
    </div>
  )
}
