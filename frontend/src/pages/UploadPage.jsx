import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileText, ClipboardPaste, Loader2, AlertCircle,
  CheckCircle2, X, Plus, Trash2, TableProperties, Sparkles,
  ArrowRight, Info
} from 'lucide-react'
import clsx from 'clsx'
import { api } from '../utils/api'

const ACCEPTED = '.csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.txt'
const MAX_MB = 50
const EMPTY_ROW = () => ({ ticker: '', shares: '', avg_cost: '', market_value: '' })

const TABS = [
  { id: 'file',   label: 'Upload File',    icon: Upload,           desc: 'CSV, Excel, PDF, image' },
  { id: 'paste',  label: 'Paste Text',     icon: ClipboardPaste,   desc: 'Copy from spreadsheet' },
  { id: 'manual', label: 'Manual Entry',   icon: TableProperties,  desc: 'Type in your holdings' },
]

export default function UploadPage() {
  const nav = useNavigate()

  // shared
  const [tab, setTab]       = useState('file')
  const [age, setAge]       = useState('')
  const [goals, setGoals]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)
  const [parseFailFallback, setParseFailFallback] = useState(false)

  // file tab
  const [file, setFile]       = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  // paste tab
  const [pasteText, setPasteText] = useState('')

  // manual tab
  const [rows, setRows] = useState([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()])

  // ── file helpers ──────────────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSetFile(f)
  }, [])

  function validateAndSetFile(f) {
    if (f.size > MAX_MB * 1024 * 1024) { setError(`File too large. Max ${MAX_MB} MB.`); return }
    setError(null); setParseFailFallback(false); setFile(f)
  }

  // ── manual row helpers ────────────────────────────────────────────────────
  function updateRow(i, field, val) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function addRow()    { setRows(r => [...r, EMPTY_ROW()]) }
  function removeRow(i){ if (rows.length > 1) setRows(r => r.filter((_, idx) => idx !== i)) }

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError(null); setParseFailFallback(false); setLoading(true)
    try {
      const ageVal = age ? parseInt(age) : null
      let data

      if (tab === 'file') {
        if (!file) throw new Error('Please select a file.')
        data = await api.uploadFile(file, ageVal, goals)

      } else if (tab === 'paste') {
        if (!pasteText.trim()) throw new Error('Please paste some portfolio data.')
        data = await api.pasteText(pasteText.trim(), ageVal, goals)

      } else {
        // manual
        const holdings = buildHoldings()
        if (holdings.error) throw new Error(holdings.error)
        data = await api.manualEntry(holdings.data, ageVal, goals)
      }

      nav(`/dashboard/${data.session_id}`, {
        state: { analytics: data.analytics, filename: file?.name || (tab === 'paste' ? 'Pasted Data' : 'Manual Entry') }
      })
    } catch (err) {
      const msg = err.message || 'Something went wrong.'
      // If it's a parse error, offer the manual fallback
      if (tab !== 'manual' && (
        msg.toLowerCase().includes('parse') ||
        msg.toLowerCase().includes('no holdings') ||
        msg.toLowerCase().includes('could not') ||
        msg.toLowerCase().includes('unrecognized') ||
        msg.toLowerCase().includes('no valid') ||
        msg.toLowerCase().includes('422') ||
        msg.toLowerCase().includes('unexpected')
      )) {
        setParseFailFallback(true)
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function buildHoldings() {
    const holdings = rows
      .filter(r => r.ticker.trim())
      .map(r => {
        const shares     = r.shares    ? parseFloat(r.shares)   : null
        const avgCost    = r.avg_cost  ? parseFloat(r.avg_cost) : null
        const marketVal  = r.market_value ? parseFloat(r.market_value) : null
        const costBasis  = (avgCost && shares) ? avgCost * shares : null
        return { ticker: r.ticker.trim().toUpperCase(), shares, cost_basis: costBasis, market_value: marketVal }
      })

    if (holdings.length === 0)
      return { error: 'Add at least one holding with a ticker symbol.' }

    const missing = holdings.filter(h => !h.market_value && !h.shares)
    if (missing.length > 0)
      return { error: `Missing shares or market value for: ${missing.map(h => h.ticker).join(', ')}. Add shares or a market value so we can fetch the price.` }

    return { data: holdings }
  }

  const canSubmit = !loading && (
    (tab === 'file'   && !!file) ||
    (tab === 'paste'  && !!pasteText.trim()) ||
    (tab === 'manual' && rows.some(r => r.ticker.trim()))
  )

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">
          Drop your folio.<br />
          <span className="text-blue-400">We'll do the rest.</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Upload a brokerage export, paste copied data, or enter holdings manually — your portfolio is analyzed in seconds.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-7">
        {TABS.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setError(null); setParseFailFallback(false) }}
            className={clsx(
              'flex-1 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all',
              tab === id ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            <span className={clsx('text-xs font-normal hidden sm:block', tab === id ? 'text-blue-200' : 'text-slate-600')}>{desc}</span>
          </button>
        ))}
      </div>

      {/* ── File tab ── */}
      {tab === 'file' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200',
            dragging
              ? 'border-blue-400 bg-blue-500/5 scale-[1.01]'
              : file
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/40'
          )}
        >
          <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden"
            onChange={(e) => e.target.files[0] && validateAndSetFile(e.target.files[0])} />
          {file ? (
            <>
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-emerald-400 font-semibold">{file.name}</p>
              <p className="text-slate-500 text-sm mt-1">{(file.size / 1024).toFixed(0)} KB · ready to analyze</p>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); setError(null) }}
                className="mt-3 text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 text-xs">
                <X className="w-3 h-3" /> Remove
              </button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-7 h-7 text-blue-400" />
              </div>
              <p className="text-slate-200 font-semibold text-lg">Drop your portfolio file here</p>
              <p className="text-slate-500 text-sm mt-2">or click to browse from your computer</p>
              <p className="text-slate-600 text-xs mt-3">Supported: CSV · Excel · PDF · PNG/JPG · TXT — up to 50 MB</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {['Fidelity', 'Schwab', 'Robinhood', 'Vanguard', 'TD Ameritrade'].map(b => (
                  <span key={b} className="text-xs bg-slate-800/80 text-slate-500 px-2 py-0.5 rounded-full">{b}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Paste tab ── */}
      {tab === 'paste' && (
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-2">
            Paste copied spreadsheet rows below (include the header row)
          </label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={10}
            placeholder={'Symbol\tShares\tMarket Value\nAAPL\t50\t9250\nMSFT\t30\t12450'}
            className="input font-mono text-xs leading-relaxed resize-none"
          />
          <p className="text-slate-600 text-xs mt-1.5">
            Copy directly from your brokerage table (Ctrl+A, Ctrl+C in the holdings view) and paste here.
          </p>
        </div>
      )}

      {/* ── Manual Entry tab ── */}
      {tab === 'manual' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-slate-500" />
            <p className="text-slate-500 text-xs">
              Enter a ticker and either the number of shares <em>or</em> the current market value. We'll auto-fetch prices for anything missing.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticker *</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Shares</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Cost / Share</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Market Value ($)</th>
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
                    <td className="px-2 py-2">
                      <input
                        value={row.ticker}
                        onChange={e => updateRow(i, 'ticker', e.target.value.toUpperCase())}
                        placeholder="AAPL"
                        className="input py-1.5 text-sm font-mono font-bold text-blue-400 uppercase w-24"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number" min="0"
                        value={row.shares}
                        onChange={e => updateRow(i, 'shares', e.target.value)}
                        placeholder="50"
                        className="input py-1.5 text-sm w-24"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number" min="0"
                        value={row.avg_cost}
                        onChange={e => updateRow(i, 'avg_cost', e.target.value)}
                        placeholder="175.00"
                        className="input py-1.5 text-sm w-28"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number" min="0"
                        value={row.market_value}
                        onChange={e => updateRow(i, 'market_value', e.target.value)}
                        placeholder="8750"
                        className="input py-1.5 text-sm w-28"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={() => removeRow(i)} disabled={rows.length <= 1}
                        className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-20">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={addRow}
            className="mt-3 flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <Plus className="w-4 h-4" /> Add row
          </button>
        </div>
      )}

      {/* ── Parse-fail fallback banner ── */}
      {parseFailFallback && (
        <div className="mt-5 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-amber-300 text-sm font-semibold mb-1.5">Couldn't fully read your file</p>
          <p className="text-amber-200/70 text-xs mb-3 leading-relaxed">
            We couldn't automatically parse this file. Switch to <strong>Manual Entry</strong> to enter your holdings directly — or try pasting copied data from your brokerage.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setTab('manual'); setError(null); setParseFailFallback(false) }}
              className="flex items-center gap-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg px-3 py-1.5 transition-colors"
            >
              <TableProperties className="w-3.5 h-3.5" /> Switch to Manual Entry
            </button>
            <button
              onClick={() => { setTab('paste'); setError(null); setParseFailFallback(false) }}
              className="flex items-center gap-1.5 text-xs bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 border border-slate-600 rounded-lg px-3 py-1.5 transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5" /> Try Paste Text
            </button>
          </div>
        </div>
      )}

      {/* ── Age + Goals ── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Your age <span className="text-slate-600">(optional)</span>
          </label>
          <input type="number" min="18" max="100" value={age}
            onChange={e => setAge(e.target.value)} placeholder="e.g. 28" className="input w-28" />
          <p className="text-slate-600 text-xs mt-1">Unlocks age-based guidance</p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Investment goals <span className="text-slate-600">(optional)</span>
          </label>
          <textarea value={goals} onChange={e => setGoals(e.target.value)} rows={3}
            placeholder="e.g. Long-term growth, interested in AI and tech, want passive income…"
            className="input resize-none text-sm leading-relaxed" />
          <p className="text-slate-600 text-xs mt-1">Unlocks goal-matched ETF suggestions</p>
        </div>
      </div>

      {/* ── Error ── */}
      {error && !parseFailFallback && (
        <div className="mt-5 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm leading-relaxed">{error}</p>
        </div>
      )}

      {/* ── Submit ── */}
      <div className="mt-7">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base disabled:opacity-50"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing your portfolio…</>
            : <><Sparkles className="w-4 h-4" /> Analyze My Portfolio <ArrowRight className="w-4 h-4" /></>
          }
        </button>
      </div>

      <p className="mt-4 text-slate-600 text-xs text-center">
        Your data is processed in-memory and never shared with third parties.
      </p>
    </div>
  )
}
