import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Loader2, AlertCircle, Info } from 'lucide-react'
import { api } from '../utils/api'

const EMPTY_ROW = () => ({ ticker: '', shares: '', avg_cost_per_share: '', market_value: '' })

export default function ManualPage() {
  const nav = useNavigate()
  const [rows, setRows] = useState([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()])
  const [age, setAge] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function update(i, field, val) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function addRow() { setRows((r) => [...r, EMPTY_ROW()]) }
  function removeRow(i) {
    if (rows.length <= 1) return
    setRows((r) => r.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    const holdings = rows
      .filter((r) => r.ticker.trim())
      .map((r) => {
        const shares = r.shares ? parseFloat(r.shares) : null
        const avgCost = r.avg_cost_per_share ? parseFloat(r.avg_cost_per_share) : null
        const marketValue = r.market_value ? parseFloat(r.market_value) : null

        // Compute total cost basis from avg cost × shares if both provided
        const costBasis = (avgCost && shares) ? avgCost * shares : null

        return {
          ticker: r.ticker.trim().toUpperCase(),
          shares,
          cost_basis: costBasis,
          market_value: marketValue,
        }
      })

    if (holdings.length === 0) {
      setError('Add at least one holding with a ticker symbol.')
      return
    }

    // Validate: every row needs either market_value OR shares (so we can auto-fetch)
    const missingData = holdings.filter(h => !h.market_value && !h.shares)
    if (missingData.length > 0) {
      setError(`Missing shares or market value for: ${missingData.map(h => h.ticker).join(', ')}. Add shares so market value can be auto-fetched, or enter the total market value directly.`)
      return
    }

    setError(null)
    setLoading(true)
    try {
      const data = await api.manualEntry(holdings, age ? parseInt(age) : null)
      nav(`/dashboard/${data.session_id}`, { state: { analytics: data.analytics, filename: 'Manual Entry' } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-white mb-1">Manual Entry</h1>
      <p className="text-slate-400 text-sm mb-3">
        Enter each position. Market value is auto-fetched from live prices if you leave it blank.
      </p>

      {/* Field guide */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 mb-6 flex gap-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300 space-y-1 leading-relaxed">
          <p><strong>Shares</strong> — number of shares you own (e.g. 10.91)</p>
          <p><strong>Avg Cost/Share</strong> — what you paid per share on average (e.g. $18.35). Optional.</p>
          <p><strong>Total Market Value</strong> — current dollar value of the position (e.g. $273.50). Leave blank to auto-fetch from live price × shares.</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              {['Ticker *', 'Shares *', 'Avg Cost / Share ($)', 'Total Market Value ($)', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.ticker}
                    onChange={(e) => update(i, 'ticker', e.target.value.toUpperCase())}
                    placeholder="AAPL"
                    className="input font-mono uppercase w-24"
                    maxLength={10}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.shares}
                    onChange={(e) => update(i, 'shares', e.target.value)}
                    placeholder="10.5"
                    className="input w-24"
                    min="0"
                    step="any"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.avg_cost_per_share}
                    onChange={(e) => update(i, 'avg_cost_per_share', e.target.value)}
                    placeholder="Optional"
                    className="input w-32"
                    min="0"
                    step="any"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.market_value}
                    onChange={(e) => update(i, 'market_value', e.target.value)}
                    placeholder="Auto-fetch"
                    className="input w-36"
                    min="0"
                    step="any"
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => removeRow(i)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded"
                    disabled={rows.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addRow} className="mt-3 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
        <Plus className="w-4 h-4" /> Add row
      </button>

      <div className="mt-6">
        <label className="text-xs font-medium text-slate-400 block mb-1.5">
          Your age <span className="text-slate-600">(optional)</span>
        </label>
        <input
          type="number" min="18" max="100"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="e.g. 23"
          className="input w-28"
        />
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm leading-relaxed">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary mt-7 w-full flex items-center justify-center gap-2 py-3 text-base"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Fetching live prices &amp; analyzing…</>
          : 'Analyze Portfolio'}
      </button>
      <p className="mt-3 text-slate-600 text-xs text-center">
        Live prices are fetched from Yahoo Finance. Allow 10–20 seconds for large portfolios.
      </p>
    </div>
  )
}
