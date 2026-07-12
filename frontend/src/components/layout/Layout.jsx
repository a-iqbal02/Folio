import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Upload, Home, Clock, X, DollarSign, TrendingUp, BookOpen, Calculator,
  Menu, ChevronRight, GitCompare, User, UserPlus, LogOut, LogIn,
  ShieldQuestion, Layers, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import clsx from 'clsx'
import { useSavedSessions } from '../../hooks/useSession'
import { useAuth } from '../../hooks/useAuth'
import FolioLogo from './FolioLogo'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/',       label: 'Home',   icon: Home },
      { to: '/upload', label: 'Upload', icon: Upload },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { to: '/risk-assessment',  label: 'Risk Assessment',  icon: ShieldQuestion },
      { to: '/model-portfolios', label: 'Model Portfolios', icon: Layers, badge: 'New' },
    ],
  },
  {
    label: 'Research',
    items: [
      { to: '/etf-explorer',      label: 'ETF Explorer', icon: TrendingUp },
      { to: '/etf-compare',       label: 'ETF Compare',  icon: GitCompare },
      { to: '/etf-guide',         label: 'ETF Guide',    icon: BookOpen },
      { to: '/growth-calculator', label: 'Growth Calc',  icon: Calculator },
    ],
  },
]

const FLAT_NAV = NAV_GROUPS.flatMap((g) => g.items)
const SIDEBAR_COLLAPSED_KEY = 'folio_sidebar_collapsed'

function fmtCurrency(v) {
  if (!v) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

function navLinkClass({ isActive }) {
  return clsx(
    'flex items-center gap-2.5 pl-2.5 pr-2 py-2 rounded-md text-sm font-medium transition-colors duration-150 border-l-2',
    isActive
      ? 'border-blue-500 bg-slate-800/70 text-white'
      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
  )
}

function NavList({ collapsed, onNavigate }) {
  return (
    <nav aria-label="Primary" className="px-3 py-3 space-y-1">
      {NAV_GROUPS.map((group, i) => (
        <div key={group.label} role="group" aria-labelledby={`nav-group-${i}`}>
          {collapsed ? (
            i > 0 && <div className="border-t border-slate-800/60 my-2" />
          ) : (
            <p id={`nav-group-${i}`} className="text-xs font-semibold uppercase tracking-widest text-slate-600 px-3 pt-3 pb-1.5">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map(({ to, label, icon: Icon, badge }) => (
              <div key={to} className="relative group/item">
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={onNavigate}
                  aria-label={label}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) => clsx(navLinkClass({ isActive }), collapsed && 'justify-center px-0')}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate min-w-0">{label}</span>
                          {badge && (
                            <span className="ml-auto text-[10px] leading-none bg-orange-500/20 text-orange-400 px-1.5 py-1 rounded-full font-semibold shrink-0">
                              {badge}
                            </span>
                          )}
                        </>
                      )}
                      {badge && collapsed && (
                        <span className="absolute top-1 right-2.5 w-1.5 h-1.5 rounded-full bg-orange-400" aria-hidden="true" />
                      )}
                    </>
                  )}
                </NavLink>
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded-md border border-slate-700 opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 transition-opacity z-50">
                    {label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function AuthSection({ collapsed, onNavigate }) {
  const nav = useNavigate()
  const { user, logout } = useAuth()

  const go = (to) => { nav(to); onNavigate?.() }
  const doLogout = () => { logout(); onNavigate?.() }

  const btnBase = 'flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

  if (user) {
    if (collapsed) {
      return (
        <div className="px-2 py-3 border-t border-slate-800 flex flex-col items-center gap-2">
          <button onClick={() => go('/account')} title="Account" aria-label="Account" className={clsx(btnBase, 'w-9 h-9')}>
            <User className="w-4 h-4" />
          </button>
          <button onClick={doLogout} title="Log out" aria-label="Log out" className={clsx(btnBase, 'w-9 h-9 hover:text-red-400')}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )
    }
    return (
      <div className="px-3 py-3 border-t border-slate-800 space-y-0.5">
        <button
          onClick={() => go('/account')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="bg-blue-600/20 text-blue-400 rounded-full p-1.5 shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="truncate">{user.email}</span>
        </button>
        <button
          onClick={doLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <LogOut className="w-3.5 h-3.5" /> Log out
        </button>
      </div>
    )
  }

  if (collapsed) {
    return (
      <div className="px-2 py-3 border-t border-slate-800 flex flex-col items-center gap-2">
        <button onClick={() => go('/login')} title="Log in" aria-label="Log in" className={clsx(btnBase, 'w-9 h-9')}>
          <LogIn className="w-4 h-4" />
        </button>
        <button onClick={() => go('/register')} title="Sign up" aria-label="Sign up" className={clsx(btnBase, 'w-9 h-9 bg-blue-600 text-white hover:bg-blue-500 hover:text-white')}>
          <UserPlus className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="px-3 py-3 border-t border-slate-800 flex gap-2">
      <button
        onClick={() => go('/login')}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <LogIn className="w-3.5 h-3.5" /> Log in
      </button>
      <button
        onClick={() => go('/register')}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Sign up
      </button>
    </div>
  )
}

export default function Layout() {
  const nav = useNavigate()
  const { sessions, removeSession, renameSession } = useSavedSessions()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true' } catch (_) { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed)) } catch (_) {}
  }, [collapsed])

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
      <aside
        className={clsx(
          'hidden md:flex flex-col bg-slate-900 border-r border-slate-800 shrink-0 sticky top-0 h-screen transition-[width] duration-150',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        <div className={clsx('py-4 border-b border-slate-800 flex items-center', collapsed ? 'justify-center px-2' : 'px-4')}>
          <FolioLogo size={28} showWordmark={!collapsed} showTagline={false} />
        </div>

        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="mx-2 mt-2 flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <><ChevronsLeft className="w-4 h-4" /> <span className="text-xs font-medium">Collapse</span></>}
        </button>

        <div id="sidebar-nav" className="border-b border-slate-800 pb-2">
          <NavList collapsed={collapsed} />
        </div>

        {/* Recent sessions (hidden when collapsed — needs the wider view) */}
        {!collapsed && sessions.length > 0 && (
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

        <div className="mt-auto">
          <AuthSection collapsed={collapsed} />
          <div className={clsx('py-3 border-t border-slate-800', collapsed ? 'px-2 text-center' : 'px-5')}>
            {!collapsed && <p className="text-slate-600 text-xs">Educational use only · Not financial advice</p>}
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <FolioLogo size={28} showWordmark showTagline={false} />
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

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
              <FolioLogo size={28} showWordmark showTagline={false} />
              <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="text-slate-500 hover:text-white p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-b border-slate-800 pb-2">
              <NavList collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
            </div>

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

            <div className="mt-auto">
              <AuthSection collapsed={false} onNavigate={() => setMobileMenuOpen(false)} />
              <div className="px-5 py-4 border-t border-slate-800">
                <p className="text-slate-600 text-xs">Educational use only · Not financial advice</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Mobile bottom tab bar ── */}
      <nav aria-label="Quick navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-around px-2 py-2">
        {FLAT_NAV.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              clsx('flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 md:overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  )
}
