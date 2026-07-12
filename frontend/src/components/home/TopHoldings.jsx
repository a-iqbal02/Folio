import { SAMPLE } from './sampleData'

const fmtCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function TopHoldings() {
  return (
    <div className="border border-slate-800 rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Top Holdings</h2>
        <span className="text-[11px] text-slate-600">by weight</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left font-medium text-slate-500 text-[11px] uppercase tracking-wide pb-2">Ticker</th>
            <th className="text-right font-medium text-slate-500 text-[11px] uppercase tracking-wide pb-2">Weight</th>
            <th className="text-right font-medium text-slate-500 text-[11px] uppercase tracking-wide pb-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE.holdings.map((h) => (
            <tr key={h.ticker} className="border-b border-slate-800/60 last:border-0">
              <td className="py-2">
                <span className="font-mono font-bold text-blue-400">{h.ticker}</span>
                <span className="block text-[11px] text-slate-600 truncate max-w-[140px]">{h.name}</span>
              </td>
              <td className="py-2 text-right font-mono text-slate-300">{h.weight}%</td>
              <td className="py-2 text-right font-mono text-slate-400">{fmtCurrency.format(h.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
