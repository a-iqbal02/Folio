import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Loader2, Trash2, Pencil, DollarSign, Upload } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

function fmtCurrency(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth()
  const nav = useNavigate()
  const [portfolios, setPortfolios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setPortfolios(await api.listPortfolios())
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load portfolios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { nav('/login', { state: { from: '/account' } }); return }
    refresh()
  }, [authLoading, user, nav, refresh])

  async function handleDelete(id) {
    if (!window.confirm('Delete this saved portfolio? This cannot be undone.')) return
    await api.deletePortfolio(id)
    refresh()
  }

  async function commitRename(id) {
    if (editName.trim()) {
      await api.renamePortfolio(id, editName.trim())
      refresh()
    }
    setEditingId(null)
  }

  if (authLoading || (loading && !error)) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 flex justify-center">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">My Portfolios</h1>
        <p className="text-slate-400 text-sm">Signed in as {user?.email}</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-sm text-red-400 mb-6">
          {error}
        </div>
      )}

      {portfolios.length === 0 ? (
        <div className="border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7 text-blue-400" />
          </div>
          <p className="text-slate-200 font-semibold text-lg mb-1">No saved portfolios yet</p>
          <p className="text-slate-500 text-sm mb-5">Upload a portfolio while signed in and it'll be saved here automatically.</p>
          <button
            onClick={() => nav('/upload')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" /> Upload a portfolio
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {portfolios.map((p) => (
            <div
              key={p.id}
              className="group flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="bg-slate-700 rounded-lg p-2 shrink-0">
                <DollarSign className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                {editingId === p.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitRename(p.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(p.id); if (e.key === 'Escape') setEditingId(null) }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-slate-700 border border-blue-500/50 rounded px-2 py-1 text-sm text-white outline-none"
                  />
                ) : (
                  <>
                    <p className="text-slate-200 text-sm font-medium truncate">{p.name}</p>
                    <p className="text-slate-500 text-xs">{fmtCurrency(p.total_value)}</p>
                  </>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditName(p.name) }}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-all p-1.5 rounded shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1.5 rounded shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
