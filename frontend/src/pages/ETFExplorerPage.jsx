import { useState, useMemo, useEffect } from 'react'
import { Search, TrendingUp, ChevronDown, ChevronUp, Flame, Star, X, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../utils/api'

const TRENDING = [
  { label: "🤖 AI",              emoji: "🤖", name: "AI & Robotics",     filter: "Artificial Intelligence",    tag: null,
    card:   "hover:border-violet-500/40 hover:bg-violet-500/5",   active: "border-violet-400/60 bg-violet-500/15" },
  { label: "💾 Semiconductors",  emoji: "💾", name: "Semiconductors",    filter: "Semiconductors",             tag: null,
    card:   "hover:border-blue-500/40 hover:bg-blue-500/5",       active: "border-blue-400/60 bg-blue-500/15" },
  { label: "🏢 Data Centers",    emoji: "🏢", name: "Data Centers",      filter: "Data Centers & Cloud",       tag: null,
    card:   "hover:border-cyan-500/40 hover:bg-cyan-500/5",       active: "border-cyan-400/60 bg-cyan-500/15" },
  { label: "🚀 Space & Defense", emoji: "🚀", name: "Space & Defense",   filter: "Space & Defense",            tag: null,
    card:   "hover:border-indigo-500/40 hover:bg-indigo-500/5",   active: "border-indigo-400/60 bg-indigo-500/15" },
  { label: "🔒 Cybersecurity",   emoji: "🔒", name: "Cybersecurity",     filter: "Cybersecurity",              tag: null,
    card:   "hover:border-orange-500/40 hover:bg-orange-500/5",   active: "border-orange-400/60 bg-orange-500/15" },
  { label: "⚛️ Uranium",         emoji: "⚛️", name: "Uranium & Nuclear", filter: "Energy & Commodities",       tag: "uranium",
    card:   "hover:border-yellow-500/40 hover:bg-yellow-500/5",   active: "border-yellow-400/60 bg-yellow-500/15" },
  { label: "💰 Dividend Income", emoji: "💰", name: "Dividend Income",   filter: "Dividend & Income",          tag: null,
    card:   "hover:border-emerald-500/40 hover:bg-emerald-500/5", active: "border-emerald-400/60 bg-emerald-500/15" },
  { label: "🔋 Clean Energy",    emoji: "🔋", name: "Clean Energy",      filter: "Energy & Commodities",       tag: "clean energy",
    card:   "hover:border-teal-500/40 hover:bg-teal-500/5",       active: "border-teal-400/60 bg-teal-500/15" },
  { label: "₿ Crypto ETFs",     emoji: "₿",  name: "Crypto ETFs",       filter: "New & Trending",             tag: "crypto",
    card:   "hover:border-amber-500/40 hover:bg-amber-500/5",     active: "border-amber-400/60 bg-amber-500/15" },
  { label: "🧬 Biotech",         emoji: "🧬", name: "Biotech & Health",  filter: "Healthcare & Biotech",       tag: null,
    card:   "hover:border-pink-500/40 hover:bg-pink-500/5",       active: "border-pink-400/60 bg-pink-500/15" },
  { label: "🇨🇳 China",          emoji: "🇨🇳", name: "China",             filter: "Global Markets",             tag: "china",
    card:   "hover:border-red-500/40 hover:bg-red-500/5",         active: "border-red-400/60 bg-red-500/15" },
  { label: "🇯🇵 Japan",          emoji: "🇯🇵", name: "Japan",             filter: "Global Markets",             tag: "japan",
    card:   "hover:border-rose-500/40 hover:bg-rose-500/5",       active: "border-rose-400/60 bg-rose-500/15" },
  { label: "🇰🇷 Korea",          emoji: "🇰🇷", name: "South Korea",       filter: "Global Markets",             tag: "korea",
    card:   "hover:border-sky-500/40 hover:bg-sky-500/5",         active: "border-sky-400/60 bg-sky-500/15" },
  { label: "🌍 Europe",          emoji: "🌍", name: "Europe",            filter: "Global Markets",             tag: "europe",
    card:   "hover:border-purple-500/40 hover:bg-purple-500/5",   active: "border-purple-400/60 bg-purple-500/15" },
  { label: "🌏 Emerging Markets",emoji: "🌏", name: "Emerging Markets",  filter: "Global Markets",             tag: "emerging",
    card:   "hover:border-green-500/40 hover:bg-green-500/5",     active: "border-green-400/60 bg-green-500/15" },
  { label: "💡 Innovation",      emoji: "💡", name: "Innovation & EV",   filter: "Innovation",                 tag: null,
    card:   "hover:border-yellow-500/40 hover:bg-yellow-500/5",   active: "border-yellow-400/60 bg-yellow-500/15" },
]

const SORT_OPTIONS = [
  { value: "aum_desc",        label: "AUM: Largest first" },
  { value: "aum_asc",         label: "AUM: Smallest first" },
  { value: "return_1y_desc",  label: "1Y Return: Highest first" },
  { value: "er_asc",          label: "Expense Ratio: Lowest first" },
  { value: "er_desc",         label: "Expense Ratio: Highest first" },
  { value: "ticker_asc",      label: "Ticker A→Z" },
  { value: "popular",         label: "Most Popular" },
]

const ER_FILTERS = [
  { label: "All",          min: 0,   max: 99 },
  { label: "Ultra-low ≤0.10%", min: 0, max: 0.10 },
  { label: "Low ≤0.35%",   min: 0,   max: 0.35 },
  { label: "High >0.35%",  min: 0.35, max: 99 },
]

function fmtAum(b) {
  if (b == null) return '—'
  return b >= 1 ? `$${b}B` : `$${Math.round(b * 1000)}M`
}

function ERBadge({ er }) {
  const color = er <= 0.10 ? 'text-emerald-400 bg-emerald-500/10'
              : er <= 0.35 ? 'text-yellow-400 bg-yellow-500/10'
              : 'text-orange-400 bg-orange-500/10'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {er.toFixed(2)}% ER
    </span>
  )
}

function ReturnBadge({ pct }) {
  if (pct == null) return <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">1Y —</span>
  const positive = pct >= 0
  return (
    <span className={clsx(
      'text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5',
      positive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
    )}>
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}% 1Y
    </span>
  )
}

function ETFCard({ etf, expanded, onToggle }) {
  return (
    <div
      className="card hover:border-slate-600 transition-all duration-200 cursor-pointer select-none"
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono font-bold text-blue-400 text-base">{etf.ticker}</span>
            <ERBadge er={etf.expense_ratio} />
            <ReturnBadge pct={etf.return_1y_pct} />
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{fmtAum(etf.aum_approx_b)} AUM</span>
          </div>
          <p className="text-slate-200 text-sm font-medium leading-snug">{etf.name}</p>
          {expanded && (
            <>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">{etf.description}</p>
              <p className="text-slate-500 text-xs mt-2">
                {etf.last_price != null ? `Last price: $${etf.last_price.toFixed(2)}` : 'Price unavailable'}
                {etf.issuer ? ` · ${etf.issuer}` : ''}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {etf.tags.map(tag => (
                  <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700/60">{tag}</span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="shrink-0 text-slate-600 mt-0.5">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
    </div>
  )
}

export default function ETFExplorerPage() {
  const [etfs, setEtfs]                   = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [search, setSearch]               = useState('')
  const [activeTrend, setActiveTrend]     = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortBy, setSortBy]               = useState('aum_desc')
  const [erFilter, setErFilter]           = useState(0)   // index into ER_FILTERS
  const [expandedTicker, setExpandedTicker] = useState(null)
  const [showFilters, setShowFilters]     = useState(false)

  useEffect(() => {
    api.listScreenerEtfs()
      .then(data => setEtfs(data.results))
      .catch(err => setError(err.message || 'Failed to load ETFs.'))
      .finally(() => setLoading(false))
  }, [])

  const allCategories = useMemo(() => [...new Set(etfs.map(e => e.category))].sort(), [etfs])

  const filtered = useMemo(() => {
    let results = etfs

    if (activeTrend) {
      const trend = TRENDING.find(t => t.label === activeTrend)
      if (trend) {
        results = results.filter(e =>
          e.category === trend.filter &&
          (!trend.tag || e.tags.includes(trend.tag))
        )
      }
    } else if (activeCategory !== 'All') {
      results = results.filter(e => e.category === activeCategory)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      results = results.filter(e =>
        e.ticker.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some(t => t.includes(q)) ||
        e.category.toLowerCase().includes(q)
      )
    }

    const ef = ER_FILTERS[erFilter]
    results = results.filter(e => e.expense_ratio > ef.min - 0.0001 && e.expense_ratio <= ef.max)

    results = [...results]
    switch (sortBy) {
      case 'aum_desc':       results.sort((a, b) => b.aum_approx_b - a.aum_approx_b); break
      case 'aum_asc':        results.sort((a, b) => a.aum_approx_b - b.aum_approx_b); break
      case 'er_asc':         results.sort((a, b) => a.expense_ratio - b.expense_ratio); break
      case 'er_desc':        results.sort((a, b) => b.expense_ratio - a.expense_ratio); break
      case 'ticker_asc':     results.sort((a, b) => a.ticker.localeCompare(b.ticker)); break
      case 'return_1y_desc': results.sort((a, b) => (b.return_1y_pct ?? -Infinity) - (a.return_1y_pct ?? -Infinity)); break
      case 'popular':        results.sort((a, b) => (b.tags.includes('popular') ? 1 : 0) - (a.tags.includes('popular') ? 1 : 0)); break
    }

    return results
  }, [etfs, search, activeCategory, activeTrend, sortBy, erFilter])

  function selectTrend(label) {
    setActiveTrend(prev => prev === label ? null : label)
    setActiveCategory('All')
    setSearch('')
    setExpandedTicker(null)
  }

  function clearAll() {
    setActiveTrend(null)
    setActiveCategory('All')
    setSearch('')
    setErFilter(0)
    setSortBy('aum_desc')
  }

  const hasActiveFilter = activeTrend || activeCategory !== 'All' || search || erFilter > 0

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        <p className="text-slate-500 text-sm">Loading ETF screener…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-24 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">ETF Explorer</h1>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Browse {etfs.length}+ curated ETFs by theme, region, or category — with live prices and 1-year returns.
        Click any card to expand details.
      </p>

      {/* ── Search ── */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveTrend(null); setActiveCategory('All') }}
          placeholder="Search by ticker, name, category, or theme…"
          className="input pl-10 text-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">
            Clear
          </button>
        )}
      </div>

      {/* ── Trending themes grid ── */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-orange-400" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Trending Themes</p>
          {activeTrend && (
            <button
              onClick={() => setActiveTrend(null)}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {TRENDING.map(t => {
            const count = etfs.filter(e =>
              e.category === t.filter && (!t.tag || e.tags.includes(t.tag))
            ).length
            const isActive = activeTrend === t.label
            return (
              <button
                key={t.label}
                onClick={() => selectTrend(t.label)}
                className={clsx(
                  'relative text-left rounded-xl p-3 border transition-all duration-200',
                  isActive
                    ? t.active
                    : `bg-slate-800/40 border-slate-700/60 ${t.card}`
                )}
              >
                <div className="text-2xl mb-1.5 select-none leading-none">{t.emoji}</div>
                <p className={clsx(
                  'text-xs font-semibold truncate leading-tight',
                  isActive ? 'text-white' : 'text-slate-200'
                )}>
                  {t.name}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">{count} funds</p>
                {isActive && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white/60" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Filter / Sort bar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
        {/* Category dropdown */}
        <div className="relative">
          <select
            value={activeCategory}
            onChange={e => { setActiveCategory(e.target.value); setActiveTrend(null) }}
            className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 pr-8 cursor-pointer hover:border-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="All">All Categories ({etfs.length})</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat} ({etfs.filter(e => e.category === cat).length})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
        </div>

        {/* ER filter */}
        <div className="relative">
          <select
            value={erFilter}
            onChange={e => setErFilter(Number(e.target.value))}
            className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 pr-8 cursor-pointer hover:border-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {ER_FILTERS.map((f, i) => (
              <option key={f.label} value={i}>{f.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 pr-8 cursor-pointer hover:border-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
        </div>

        {/* Clear all */}
        {hasActiveFilter && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors ml-auto"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* ── Result count ── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-sm">
          {activeTrend
            ? <span>Theme: <strong className="text-slate-300">{activeTrend}</strong></span>
            : activeCategory !== 'All'
              ? <span>Category: <strong className="text-slate-300">{activeCategory}</strong></span>
              : search
                ? <span>Results for <strong className="text-slate-300">"{search}"</strong></span>
                : <span>All ETFs</span>}
          <span className="ml-2 text-slate-600">· {filtered.length} fund{filtered.length !== 1 ? 's' : ''}</span>
        </p>
      </div>

      {/* ── Results grid ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <Star className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>No ETFs match your filters.</p>
          <button onClick={clearAll} className="mt-3 text-xs text-blue-400 hover:text-blue-300">Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(etf => (
            <ETFCard
              key={etf.ticker}
              etf={etf}
              expanded={expandedTicker === etf.ticker}
              onToggle={() => setExpandedTicker(p => p === etf.ticker ? null : etf.ticker)}
            />
          ))}
        </div>
      )}

      <p className="text-slate-700 text-xs text-center mt-10 leading-relaxed max-w-2xl mx-auto">
        ETF Explorer covers a hand-picked set of {etfs.length}+ funds — not the full universe of 3,000+ US-listed ETFs.
        Expense ratios and AUM are approximate; prices and returns update periodically. For educational purposes only — nothing here constitutes investment advice.
      </p>
    </div>
  )
}
