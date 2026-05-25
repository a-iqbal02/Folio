import { useMemo, useState } from 'react'
import { Shield, PieChart, Layers, TrendingUp, TrendingDown, Copy, Check, ChevronRight } from 'lucide-react'
import { fmt } from '../../utils/format'
import FolioLogo from '../layout/FolioLogo'
import PerformanceChart from './PerformanceChart'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700/40 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-slate-500 text-xs">{label}</span>
      </div>
      <p className="font-bold text-lg leading-tight" style={{ color: color || 'white' }}>{value}</p>
      {sub && <p className="text-slate-500 text-xs">{sub}</p>}
    </div>
  )
}

function SectorBar({ sector, portfolioPct, sp500Pct, delta, status }) {
  const maxPct = 40
  const barWidth = Math.min(100, (portfolioPct / maxPct) * 100)
  const sp500Width = Math.min(100, (sp500Pct / maxPct) * 100)
  const barColor = status === 'overweight' ? '#3b82f6' : status === 'underweight' ? '#8b5cf6' : '#475569'
  const short = sector
    .replace('Consumer Discretionary', 'Cons. Discret.')
    .replace('Consumer Staples', 'Cons. Staples')
    .replace('Communication Services', 'Comm. Services')

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400 w-28 shrink-0 truncate">{short}</span>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, background: barColor }} />
        </div>
        <div className="h-1 bg-slate-700/30 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-slate-500/60" style={{ width: `${sp500Width}%` }} />
        </div>
      </div>
      <span className="font-semibold text-white w-10 text-right">{portfolioPct.toFixed(1)}%</span>
      <span className={`w-10 text-right ${delta > 0 ? 'text-blue-400' : delta < 0 ? 'text-purple-400' : 'text-slate-500'}`}>
        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
      </span>
    </div>
  )
}

export default function SimpleView({ analytics, sessionId, onAdvancedClick }) {
  const [copied, setCopied] = useState(false)
  const { summary, risk_score, diversification_score, gains_summary, benchmark, concentration } = analytics

  const topHoldings = useMemo(
    () => (concentration?.top_holdings || []).slice(0, 5),
    [concentration]
  )

  const benchmarkSectors = useMemo(() => {
    if (!benchmark?.available) return []
    return [...benchmark.sectors]
      .filter(s => s.portfolio_pct > 0.5 || s.sp500_pct > 0.5)
      .sort((a, b) => b.portfolio_pct - a.portfolio_pct)
      .slice(0, 6)
  }, [benchmark])

  const spTilt = useMemo(() => {
    if (!benchmark?.available) return null
    const over = benchmark.sectors.filter(s => s.status === 'overweight').length
    const under = benchmark.sectors.filter(s => s.status === 'underweight').length
    if (over > under + 1) return { label: 'Growth Tilt', color: '#3b82f6', detail: `${over} sectors overweight vs S&P 500` }
    if (under > over + 1) return { label: 'Defensive', color: '#8b5cf6', detail: `${under} sectors underweight vs S&P 500` }
    return { label: 'Balanced', color: '#10b981', detail: 'Close to S&P 500 sector weights' }
  }, [benchmark])

  const isPositive = (gains_summary?.total_gain_loss ?? 0) >= 0

  function copyLink() {
    // Always share the simple view URL
    const base = sessionId
      ? `${window.location.origin}/dashboard/${sessionId}?view=simple`
      : window.location.href
    navigator.clipboard.writeText(base).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-8 px-4">
      <div className="w-full max-w-md space-y-3">

        {/* ── Main Card ── */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #0f1e3c 0%, #1e293b 50%, #0f172a 100%)' }}>

          {/* Decorative blobs */}
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-7">
            {/* Logo + date */}
            <div className="flex items-center justify-between mb-7">
              <FolioLogo size={34} showWordmark />
              <span className="text-slate-600 text-xs">{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            </div>

            {/* Hero: portfolio value */}
            <div className="mb-6">
              <p className="text-slate-400 text-sm mb-1">Total Portfolio Value</p>
              <p className="text-5xl font-extrabold text-white tracking-tight tabular-nums">
                {fmt.currency(summary?.total_value)}
              </p>
              {gains_summary?.available && (
                <div className="flex items-center gap-2 mt-2">
                  {isPositive
                    ? <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                    : <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />
                  }
                  <span className={`font-bold text-base ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt.gain(gains_summary.total_gain_loss)}
                  </span>
                  {gains_summary.total_gain_loss_pct != null && (
                    <span className={`text-sm ${isPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                      ({fmt.gainPct(gains_summary.total_gain_loss_pct)})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 4-stat grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <StatCard
                icon={Shield}
                label="Risk Level"
                value={risk_score?.label || 'N/A'}
                sub={`Score: ${risk_score?.score ?? '—'}/100`}
                color={risk_score?.color}
              />
              <StatCard
                icon={PieChart}
                label="Diversification"
                value={diversification_score?.label || 'N/A'}
                sub={`Score: ${diversification_score?.score ?? '—'}/100`}
                color={diversification_score?.color}
              />
              <StatCard
                icon={Layers}
                label="Holdings"
                value={summary?.total_holdings ?? '—'}
                sub={`${summary?.unique_sectors ?? '—'} sectors`}
              />
              {spTilt ? (
                <StatCard
                  icon={TrendingUp}
                  label="vs S&P 500"
                  value={spTilt.label}
                  sub={spTilt.detail}
                  color={spTilt.color}
                />
              ) : (
                <StatCard
                  icon={TrendingUp}
                  label="Sectors"
                  value={`${summary?.unique_sectors ?? '—'}`}
                  sub="unique sectors"
                />
              )}
            </div>

            {/* Top holdings */}
            {topHoldings.length > 0 && (
              <div className="mb-5">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2.5">Top Holdings</p>
                <div className="space-y-2">
                  {topHoldings.map((h, i) => (
                    <div key={h.ticker} className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-700/80 flex items-center justify-center text-xs text-slate-500 font-bold shrink-0">{i + 1}</span>
                      <span className="font-mono font-bold text-blue-400 text-sm w-14 shrink-0">{h.ticker}</span>
                      <span className="text-slate-500 text-xs truncate flex-1">{h.name || ''}</span>
                      <span className="font-semibold text-sm text-white">{h.weight_pct?.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* S&P 500 comparison */}
            {benchmarkSectors.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">vs S&P 500 Sectors</p>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-blue-500 inline-block" /> You</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-1 rounded-sm bg-slate-500/60 inline-block" /> S&P</span>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {benchmarkSectors.map(s => (
                    <SectorBar
                      key={s.sector}
                      sector={s.sector}
                      portfolioPct={s.portfolio_pct}
                      sp500Pct={s.sp500_pct}
                      delta={s.delta}
                      status={s.status}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Performance line chart (compact) */}
            {analytics?.holdings?.length > 0 && (
              <div className="mb-5 -mx-1">
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3 px-1">Performance</p>
                <PerformanceChart holdings={analytics.holdings} compact />
              </div>
            )}

            {/* Footer inside card */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-700/40">
              <p className="text-slate-600 text-xs">For educational purposes only</p>
              <button
                onClick={onAdvancedClick}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Full Analysis <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={copyLink}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-700/50 bg-slate-800/40 hover:bg-slate-700/40 text-slate-300 hover:text-white text-sm font-medium transition-all"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Link copied!' : 'Copy share link'}
        </button>

      </div>
    </div>
  )
}
