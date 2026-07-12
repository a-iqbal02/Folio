import { SAMPLE } from './sampleData'

export default function SectorAllocation() {
  const sectors = [...SAMPLE.sectors].sort((a, b) => b.pct - a.pct)
  const max = Math.max(...sectors.map((s) => s.pct))

  return (
    <div className="border border-slate-800 rounded-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Sector Allocation</h2>
        <span className="text-[11px] text-slate-600">{sectors.length} sectors</span>
      </div>

      <div className="space-y-2.5">
        {sectors.map((s) => (
          <div key={s.name} className="flex items-center gap-3">
            <span className="w-44 shrink-0 text-sm text-slate-300 truncate">{s.name}</span>
            <div className="flex-1 h-4 bg-slate-800/60 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm"
                style={{ width: `${(s.pct / max) * 100}%`, backgroundColor: s.color }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-sm text-slate-200">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
