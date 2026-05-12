import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { fmt } from '../../utils/format'
import clsx from 'clsx'

const COLS = [
  { key: 'ticker',       label: 'Ticker',        numeric: false },
  { key: 'name',         label: 'Name',           numeric: false },
  { key: 'weight_pct',   label: 'Weight',         numeric: true  },
  { key: 'market_value', label: 'Market Value',   numeric: true  },
  { key: 'shares',       label: 'Shares',         numeric: true  },
  { key: 'gain_loss',    label: 'Gain / Loss',    numeric: true  },
  { key: 'asset_class',  label: 'Asset Class',    numeric: false },
  { key: 'sector',       label: 'Sector',         numeric: false },
  { key: 'beta',         label: 'Beta',           numeric: true  },
  { key: 'dividend_yield', label: 'Div Yield',   numeric: true  },
]

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-blue-400" />
    : <ChevronDown className="w-3 h-3 text-blue-400" />
}

export default function HoldingsTable({ holdings }) {
  const [sortCol, setSortCol] = useState('weight_pct')
  const [sortDir, setSortDir] = useState('desc')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 15

  function handleSort(col) {
    if (col === sortCol) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (holdings || []).filter(
      (h) => !q || (h.ticker || '').toLowerCase().includes(q) || (h.name || '').toLowerCase().includes(q)
    )
  }, [holdings, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? -Infinity
      const bv = b[sortCol] ?? -Infinity
      if (av === bv) return 0
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortCol, sortDir])

  const pages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="card-header mb-0">Holdings ({filtered.length})</div>
        <input
          type="text"
          placeholder="Search ticker or name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          className="input w-52 text-xs py-1.5"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              {COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap"
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((h, i) => {
              const gainColor = h.gain_loss > 0 ? 'text-emerald-400' : h.gain_loss < 0 ? 'text-red-400' : 'text-slate-400'
              return (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-400 whitespace-nowrap">{h.ticker}</td>
                  <td className="px-4 py-3 text-slate-300 max-w-[180px] truncate" title={h.name}>{h.name || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-200 font-medium">{h.weight_pct != null ? `${h.weight_pct.toFixed(1)}%` : '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-200">{fmt.currency(h.market_value)}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{h.shares != null ? Number(h.shares).toLocaleString() : '—'}</td>
                  <td className={clsx('px-4 py-3 text-right font-medium', gainColor)}>{fmt.gain(h.gain_loss)}</td>
                  <td className="px-4 py-3">
                    {h.asset_class ? (
                      <span className={clsx('badge', h.asset_class === 'ETF' ? 'badge-blue' : h.asset_class === 'Stock' ? 'badge-green' : 'badge-gray')}>
                        {h.asset_class}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{h.sector || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{h.beta != null ? Number(h.beta).toFixed(2) : '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{h.dividend_yield != null ? fmt.pct(h.dividend_yield * 100) : '—'}</td>
                </tr>
              )
            })}
            {pageData.length === 0 && (
              <tr><td colSpan={COLS.length} className="px-4 py-8 text-center text-slate-600">No holdings match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
          <span>Page {page + 1} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="btn-ghost py-1 px-3 text-xs disabled:opacity-30">← Prev</button>
            <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} className="btn-ghost py-1 px-3 text-xs disabled:opacity-30">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
