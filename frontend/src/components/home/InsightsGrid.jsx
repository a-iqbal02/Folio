import { AlertCircle, AlertTriangle, Layers, Lightbulb } from 'lucide-react'
import { SAMPLE } from './sampleData'

const SEVERITY = {
  high:   { icon: AlertCircle,   color: 'text-red-400' },
  medium: { icon: AlertTriangle, color: 'text-amber-400' },
}

function PanelHeader({ children }) {
  return <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">{children}</h2>
}

function ConcentrationWarnings() {
  return (
    <div className="border border-slate-800 rounded-md p-4">
      <PanelHeader>Concentration Warnings</PanelHeader>
      <ul className="space-y-2.5">
        {SAMPLE.warnings.map((w) => {
          const { icon: Icon, color } = SEVERITY[w.severity]
          return (
            <li key={w.text} className="flex items-start gap-2.5 text-sm text-slate-300">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} aria-hidden="true" />
              {w.text}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EtfOverlap() {
  return (
    <div className="border border-slate-800 rounded-md p-4">
      <PanelHeader>ETF Overlap</PanelHeader>
      <div className="flex items-start gap-2.5 text-sm text-slate-300">
        <Layers className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" aria-hidden="true" />
        <div>
          <p className="text-slate-200 font-medium mb-1">{SAMPLE.overlap.group}</p>
          <p>{SAMPLE.overlap.text}</p>
        </div>
      </div>
    </div>
  )
}

function BenchmarkComparison() {
  const rows = [...SAMPLE.sectors].sort((a, b) => Math.abs(b.pct - b.sp500Pct) - Math.abs(a.pct - a.sp500Pct))
  return (
    <div className="border border-slate-800 rounded-md p-4">
      <PanelHeader>Benchmark Comparison</PanelHeader>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left font-medium text-slate-500 text-[11px] uppercase tracking-wide pb-2">Sector</th>
            <th className="text-right font-medium text-slate-500 text-[11px] uppercase tracking-wide pb-2">You</th>
            <th className="text-right font-medium text-slate-500 text-[11px] uppercase tracking-wide pb-2">S&amp;P 500</th>
            <th className="text-right font-medium text-slate-500 text-[11px] uppercase tracking-wide pb-2">Delta</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 4).map((s) => {
            const delta = s.pct - s.sp500Pct
            return (
              <tr key={s.name} className="border-b border-slate-800/60 last:border-0">
                <td className="py-1.5 text-slate-300 truncate">{s.name}</td>
                <td className="py-1.5 text-right font-mono text-slate-300">{s.pct}%</td>
                <td className="py-1.5 text-right font-mono text-slate-500">{s.sp500Pct}%</td>
                <td className={`py-1.5 text-right font-mono ${delta > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                  {delta >= 0 ? '+' : ''}{delta}pp
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Suggestions() {
  return (
    <div className="border border-slate-800 rounded-md p-4">
      <PanelHeader>Suggestions</PanelHeader>
      <ul className="space-y-2.5">
        {SAMPLE.suggestions.map((s) => (
          <li key={s} className="flex items-start gap-2.5 text-sm text-slate-300">
            <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
            {s}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function InsightsGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <ConcentrationWarnings />
      <EtfOverlap />
      <BenchmarkComparison />
      <Suggestions />
    </div>
  )
}
