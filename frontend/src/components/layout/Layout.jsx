import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, Upload, PenSquare, Home, Clock, X, DollarSign, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import { useSavedSessions } from '../../hooks/useSession'

const NAV = [
  { to: '/',             label: 'Home',         icon: Home },
  { to: '/upload',       label: 'Upload',       icon: Upload },
  { to: '/manual',       label: 'Manual Entry', icon: PenSquare },
  { to: '/etf-explorer', label: 'ETF Explorer', icon: TrendingUp },
]

function fmtCurrency(v) {
  if (!v) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

export default function Layout() {
  const nav = useNavigate()
  const { sessions, removeSession } = useSavedSessions()

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex flex-col w-60 bg-slate-900 border-r border-slate-800 shrink-0">
        <div className="px-5 py-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-blue-500 w-5 h-5" />
            <span className="font-bold text-white text-lg tracking-tight">PortfolioLens</span>
          </div>
          <p className="text-slate-500 text-xs mt-1">Portfolio Analysis</p>
        </div>

        <nav className="px-3 py-4 space-y-1 border-b border-slate-800">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
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
              {to === '/etf-explorer' && (
                <span className="ml-auto text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full font-semibold">New</span>
              )}
            </NavLink>
          ))}
        </nav>

        {sessions.length > 0 && (
          <div className="px-3 py-4 flex-1 overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 px-2 mb-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Recent
            </p>
            <div className="space-y-1">
              {sessions.map((s) => (
                <div
                  key={s.sessionId}
                  className="group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                  onClick={() => nav(`/dashboard/${s.sessionId}`)}
                >
                  <div className="bg-slate-700 rounded p-1 shrink-0">
                    <DollarSign className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-xs font-medium truncate">{s.filename}</p>
                    <p className="text-slate-600 text-xs">{fmtCurrency(s.totalValue) || `${s.holdings} holdings`}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSession(s.sessionId) }}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5 rounded shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 py-4 border-t border-slate-800 mt-auto">
          <p className="text-slate-600 text-xs">Educational use only. Not financial advice.</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-blue-500 w-5 h-5" />
          <span className="font-bold text-white text-base">PortfolioLens</span>
        </div>
        <div className="flex gap-3">
          {NAV.map(({ to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx('p-1.5 rounded-md transition-colors', isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300')
              }
            >
              <Icon className="w-5 h-5" />
            </NavLink>
          ))}
        </div>
      </div>

      <main className="flex-1 md:overflow-y-auto md:pt-0 pt-14">
        <Outlet />
      </main>
    </div>
  )
}
