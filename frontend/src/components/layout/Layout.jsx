import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Upload, Home, Clock, X, DollarSign, TrendingUp, BookOpen, Calculator, Menu, ChevronRight, GitCompare } from 'lucide-react'
import clsx from 'clsx'
import { useSavedSessions } from '../../hooks/useSession'
import FolioLogo from './FolioLogo'

const NAV = [
  { to: '/',                  label: 'Home',          icon: Home },
  { to: '/upload',            label: 'Upload',        icon: Upload },
  { to: '/etf-explorer',      label: 'ETF Explorer',  icon: TrendingUp, badge: 'New' },
  { to: '/etf-guide',         label: 'ETF Guide',     icon: BookOpen },
  { to: '/growth-calculator', label: 'Growth Calc',   icon: Calculator },
  { to: '/etf-compare',       label: 'ETF Compare',   icon: GitCompare },
]

function fmtCurrency(v) {
  if (!v) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

export default function Layout() {
  const nav = useNavigate()
  const { sessions, removeSession, renameSession } = useSavedSessions()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  function startRename(s, e) {
    e.stopPropagation()
    setEditingId(s.sessionId)
    setEditName(s.filename)
  }

  function commitRename(sessionId, e) {
    e?.stopPropagation()
    if (editName.trim()) renameSession(sessionId, editName.trim())
    setEditingId(null)
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 bg-slate-900 border-r border-slate-800 shrink-0 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-slate-800">
          <FolioLogo size={36} showWordmark showTagline={false} />
        </div>

        <nav className="px-3 py-4 space-y-0.5 border-b border-slate-800">
          {NAV.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
              {badge && (
                <span className="ml-auto text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-semibold">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <div className="px-3 py-4 flex-1 overflow-y-auto min-h-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 px-2 mb-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Recent
            </p>
            <div className="space-y-1">
              {sessions.map((s) => (
                <div
                  key={s.sessionId}
                  className="group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                  onClick={() => editingId !== s.sessionId && nav(`/dashboard/${s.sessionId}`)}
                >
                  <div className="bg-slate-700 rounded p-1 shrink-0">
                    <DollarSign className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === s.sessionId ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={() => commitRename(s.sessionId)}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(s.sessionId, e); if (e.key === 'Escape') setEditingId(null) }}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-slate-700 border border-blue-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                      />
                    ) : (
                      <>
                        <p
                          className="text-slate-300 text-xs font-medium truncate cursor-text"
                          onDoubleClick={e => startRename(s, e)}
                          title="Double-click to rename"
                        >
                          {s.filename}
                        </p>
                        <p className="text-slate-600 text-xs">{fmtCurrency(s.totalValue) || `${s.holdings} holdings`}</p>
                      </>
                    )}
                  </div>
                  {editingId !== s.sessionId && (
                    <button
                      onClick={e => { e.stopPropagation(); removeSession(s.sessionId) }}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5 rounded shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 py-4 border-t border-slate-800 mt-auto">
          <p className="text-slate-600 text-xs">Educational use only · Not financial advice</p>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <FolioLogo size={30} showWordmark showTagline={false} />
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile slide-out menu ── */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="md:hidden fixed top-0 right-0 h-full w-72 z-50 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl">
            <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
              <FolioLogo size={30} showWordmark showTagline={false} />
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="px-3 py-4 space-y-0.5 border-b border-slate-800">
              {NAV.map(({ to, label, icon: Icon, badge }) => (
                <NavLink
                  key={to} to={to} end={to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {badge && <span className="ml-auto text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">{badge}</span>}
                  <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-600" />
                </NavLink>
              ))}
            </nav>

            {/* Recent on mobile */}
            {sessions.length > 0 && (
              <div className="px-3 py-4 flex-1 overflow-y-auto">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 px-2 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Recent
                </p>
                {sessions.map((s) => (
                  <div
                    key={s.sessionId}
                    className="group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                    onClick={() => { nav(`/dashboard/${s.sessionId}`); setMobileMenuOpen(false) }}
                  >
                    <div className="bg-slate-700 rounded p-1 shrink-0"><DollarSign className="w-3 h-3 text-slate-400" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-xs font-medium truncate">{s.filename}</p>
                      <p className="text-slate-600 text-xs">{fmtCurrency(s.totalValue) || `${s.holdings} holdings`}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeSession(s.sessionId) }}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="px-5 py-4 border-t border-slate-800">
              <p className="text-slate-600 text-xs">Educational use only · Not financial advice</p>
            </div>
          </div>
        </>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-around px-2 py-2">
        {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              clsx('flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl text-xs font-medium transition-colors',
                isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 md:overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  )
}
