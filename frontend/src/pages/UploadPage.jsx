import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText, ClipboardPaste, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../utils/api'

const ACCEPTED = '.csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp,.txt'
const MAX_MB = 50

const TABS = [
  { id: 'file',  label: 'File Upload',   icon: Upload },
  { id: 'paste', label: 'Paste Text',    icon: ClipboardPaste },
]

export default function UploadPage() {
  const nav = useNavigate()
  const [tab, setTab] = useState('file')
  const [file, setFile] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [age, setAge] = useState('')
  const [goals, setGoals] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSetFile(f)
  }, [])

  function validateAndSetFile(f) {
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_MB} MB.`)
      return
    }
    setError(null)
    setFile(f)
  }

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const ageVal = age ? parseInt(age) : null
      let data
      if (tab === 'file') {
        if (!file) throw new Error('Please select a file.')
        data = await api.uploadFile(file, ageVal, goals)
      } else {
        if (!pasteText.trim()) throw new Error('Please paste some portfolio data.')
        data = await api.pasteText(pasteText.trim(), ageVal, goals)
      }
      nav(`/dashboard/${data.session_id}`, { state: { analytics: data.analytics, filename: file?.name || 'Pasted Data' } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-white mb-1">Upload Portfolio</h1>
      <p className="text-slate-400 text-sm mb-8">
        Import your holdings from a brokerage export or paste copied spreadsheet data.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 mb-7 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setError(null) }}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              tab === id ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* File drop zone */}
      {tab === 'file' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200',
            dragging
              ? 'border-blue-400 bg-blue-500/5'
              : file
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => e.target.files[0] && validateAndSetFile(e.target.files[0])}
          />
          {file ? (
            <>
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-emerald-400 font-semibold">{file.name}</p>
              <p className="text-slate-500 text-sm mt-1">{(file.size / 1024).toFixed(0)} KB</p>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="mt-3 text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 text-xs"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            </>
          ) : (
            <>
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">Drop your file here or click to browse</p>
              <p className="text-slate-500 text-xs mt-2">CSV · Excel · PDF · PNG · JPG · WEBP · TXT — up to 50 MB</p>
            </>
          )}
        </div>
      )}

      {/* Paste text zone */}
      {tab === 'paste' && (
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-2">
            Paste copied spreadsheet rows below (with header row)
          </label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={10}
            placeholder={'Symbol\tShares\tMarket Value\nAAPL\t50\t9250\nMSFT\t30\t12450'}
            className="input font-mono text-xs leading-relaxed resize-none"
          />
        </div>
      )}

      {/* Age input */}
      <div className="mt-5">
        <label className="text-xs font-medium text-slate-400 block mb-1.5">
          Your age <span className="text-slate-600">(optional — enables age-based guidance)</span>
        </label>
        <input
          type="number"
          min="18" max="100"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="e.g. 28"
          className="input w-28"
        />
      </div>

      {/* Goals input */}
      <div className="mt-5">
        <label className="text-xs font-medium text-slate-400 block mb-1.5">
          Investment goals <span className="text-slate-600">(optional — unlocks goal-matched ETF suggestions)</span>
        </label>
        <textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          rows={3}
          placeholder="e.g. I'm 23 and focused on long-term growth. I'm interested in AI and tech. I want to build passive income over time and eventually retire early."
          className="input resize-none text-sm leading-relaxed"
        />
        <p className="text-slate-600 text-xs mt-1">Write in plain English — the analyzer will match your goals to relevant ETF categories.</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm leading-relaxed">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="mt-7">
        <button
          onClick={handleSubmit}
          disabled={loading || (tab === 'file' && !file) || (tab === 'paste' && !pasteText.trim())}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : 'Analyze Portfolio'}
        </button>
      </div>

      <p className="mt-4 text-slate-600 text-xs text-center">
        Your data is processed in-memory and never shared with third parties.
      </p>
    </div>
  )
}
