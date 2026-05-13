import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Shield, TrendingUp, Layers, Globe, AlertTriangle, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

const SECTIONS = [
  {
    id: 'what',
    icon: BookOpen,
    color: 'blue',
    title: 'What is an ETF?',
    content: `An ETF (Exchange-Traded Fund) is a basket of securities — stocks, bonds, or other assets — that trades on a stock exchange just like a single stock.

When you buy one share of SPY (the S&P 500 ETF), you're instantly buying a tiny piece of all 500 companies in the S&P 500 index. Instead of buying Apple, Microsoft, Amazon, Google, and 496 others separately, you buy one ticker and own all of them proportionally.

ETFs are priced and traded throughout the day (unlike mutual funds, which price once at market close). They typically have very low expense ratios — some as low as 0.03% per year — because most are "passively managed," meaning a computer tracks an index rather than a human picking stocks.`,
    example: {
      title: 'Real Example: VTI',
      body: "One share of VTI (~$265) gives you ownership in 3,800+ US companies — Apple, Microsoft, ExxonMobil, small regional banks, and everything in between. Expense ratio: 0.03%/year. That's $0.30/year on $1,000 invested.",
    }
  },
  {
    id: 'vs-stocks',
    icon: TrendingUp,
    color: 'emerald',
    title: 'ETFs vs Individual Stocks',
    content: null,
    comparison: [
      { aspect: 'Diversification',   etf: 'Built-in — one ticker = hundreds of companies', stock: 'Single company — all risk concentrated' },
      { aspect: 'Research required', etf: 'Minimal — just understand the index it tracks', stock: 'Deep research needed on financials, management, competitors' },
      { aspect: 'Volatility',        etf: 'Lower — bad news at one company barely moves it', stock: 'Higher — one bad earnings report can drop 20% overnight' },
      { aspect: 'Upside potential',  etf: 'Moderate — tracks the average of many companies', stock: 'Higher — a great pick can 10x, but most underperform the index' },
      { aspect: 'Cost',              etf: 'Expense ratio 0.03–0.75%/year', stock: 'No ongoing fee, but transaction costs and taxes on trades' },
      { aspect: 'Time commitment',   etf: 'Low — buy and hold, rebalance occasionally', stock: 'High — requires monitoring news, earnings, sector trends' },
      { aspect: 'Tax efficiency',    etf: 'High — fewer internal transactions trigger capital gains', stock: 'Depends on your trading frequency' },
    ]
  },
  {
    id: 'types',
    icon: Layers,
    color: 'purple',
    title: 'Types of ETFs',
    types: [
      {
        name: 'Broad Market ETFs',
        badge: 'Core',
        badgeColor: 'blue',
        examples: 'VTI, VOO, SPY, QQQ',
        desc: 'Track a broad index like the entire US stock market or the S&P 500. These are the backbone of most long-term portfolios. Ultra-low costs, extreme diversification, and decades of proven returns.',
        risk: 'Low–Medium',
        forWho: 'Everyone — especially beginners and passive investors',
      },
      {
        name: 'Sector ETFs',
        badge: 'Tactical',
        badgeColor: 'amber',
        examples: 'XLK (Tech), XLV (Healthcare), XLE (Energy), SMH (Semis)',
        desc: 'Focus on a single sector of the economy. Useful if you have a strong view on one industry but want diversification within it. Still holds dozens of companies, just all in one area.',
        risk: 'Medium',
        forWho: 'Investors with sector-specific conviction',
      },
      {
        name: 'Thematic ETFs',
        badge: 'High Risk',
        badgeColor: 'orange',
        examples: 'BOTZ (AI/Robotics), URA (Uranium), ARKK (Innovation), ICLN (Clean Energy)',
        desc: 'Track a specific trend or theme. These are highly concentrated and often more volatile. The theme may play out over years, or it may not. Expense ratios are typically higher (0.5–0.75%).',
        risk: 'High',
        forWho: 'Experienced investors with high risk tolerance and long time horizons',
      },
      {
        name: 'International ETFs',
        badge: 'Diversification',
        badgeColor: 'teal',
        examples: 'VEA (Developed Markets), VWO (Emerging Markets), INDA (India), EWJ (Japan)',
        desc: 'Expose your portfolio to companies outside the US. Reduces dependence on the US economy. Emerging markets offer higher growth potential but more volatility. Currency risk is a factor.',
        risk: 'Medium–High',
        forWho: 'Investors seeking geographic diversification',
      },
      {
        name: 'Dividend ETFs',
        badge: 'Income',
        badgeColor: 'green',
        examples: 'SCHD, VYM, JEPI, HDV',
        desc: 'Hold companies with strong dividend histories. Generate regular income through distributions. SCHD is particularly popular for quality screening. JEPI uses covered calls to boost income.',
        risk: 'Low–Medium',
        forWho: 'Income-focused investors, retirees, or those wanting passive cash flow',
      },
      {
        name: 'Bond ETFs',
        badge: 'Defensive',
        badgeColor: 'slate',
        examples: 'AGG, BND, TLT, SHY',
        desc: 'Hold bonds instead of stocks. Move differently from equities — often rise when stocks fall. TLT (long-term Treasuries) is particularly sensitive to interest rate changes.',
        risk: 'Low',
        forWho: 'Conservative investors, those nearing retirement, portfolio balancers',
      },
    ]
  },
  {
    id: 'risks',
    icon: AlertTriangle,
    color: 'red',
    title: 'ETF Risks to Understand',
    risks: [
      { title: 'Tracking Error', desc: 'An ETF may not perfectly replicate its index due to fees, timing, or sampling. Usually small for major ETFs but worth checking for niche funds.' },
      { title: 'Liquidity Risk', desc: 'Very niche ETFs may have low trading volume, leading to wide bid-ask spreads. Stick to ETFs with >$500M AUM for easy entry and exit.' },
      { title: 'Concentration in "Diversified" ETFs', desc: 'QQQ is technically diversified (100 stocks) but 40%+ is in just Apple, Microsoft, Amazon, and Nvidia. "Diversified" doesn\'t always mean balanced.' },
      { title: 'Thematic ETF Risk', desc: 'Thematic ETFs like ARKK or BOTZ can drop 50–80% if the theme falls out of favor. They\'re not core holdings.' },
      { title: 'Expense Ratio Compounding', desc: 'Even small fees compound over time. A 0.75% ER on a $100K portfolio costs $750/year — vs $30/year for a 0.03% ETF. Over 30 years, this difference is massive.' },
      { title: 'Overlap', desc: 'Owning SPY, VOO, and QQQ doesn\'t mean 3× diversification — they share most of the same top holdings. Always check overlap before adding another ETF.' },
      { title: 'Currency Risk (International ETFs)', desc: 'When you own VEA or VWO, your returns are affected by foreign currency movements against the dollar, not just company performance.' },
    ]
  },
  {
    id: 'howto',
    icon: CheckCircle,
    color: 'emerald',
    title: 'How to Think About Building an ETF Portfolio',
    steps: [
      { num: '01', title: 'Start with a core', desc: 'A simple VTI + VXUS (total world ex-US) or just VT gives you global diversification in 1–2 ETFs. This alone beats most actively managed funds over the long term.' },
      { num: '02', title: 'Add sectors intentionally', desc: 'If you have strong conviction in tech, semis, or clean energy — add a sector ETF as a satellite position (5–15% of portfolio), not as your core.' },
      { num: '03', title: 'Check expense ratios', desc: 'For core positions, use ETFs with <0.10% ER (VOO, VTI, SCHB). For sector/thematic, 0.35–0.75% is acceptable if you have real conviction.' },
      { num: '04', title: 'Avoid overlap', desc: 'Use the ETF Explorer and check your portfolio analysis for overlap alerts before adding a new fund. Don\'t pay double fees for the same exposure.' },
      { num: '05', title: 'Match risk to timeline', desc: 'If you\'re 20–35, you can handle more equity ETFs. If you\'re 50+, consider adding bond ETFs (AGG, BND) to reduce volatility.' },
    ]
  },
]

const COLOR_MAP = {
  blue: 'bg-blue-500/10 text-blue-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  purple: 'bg-purple-500/10 text-purple-400',
  red: 'bg-red-500/10 text-red-400',
  teal: 'bg-teal-500/10 text-teal-400',
}
const BADGE_MAP = {
  blue: 'bg-blue-500/15 text-blue-400',
  amber: 'bg-amber-500/15 text-amber-400',
  orange: 'bg-orange-500/15 text-orange-400',
  teal: 'bg-teal-500/15 text-teal-400',
  green: 'bg-emerald-500/15 text-emerald-400',
  slate: 'bg-slate-700 text-slate-400',
}

function Section({ section }) {
  const [open, setOpen] = useState(true)
  const Icon = section.icon

  return (
    <div className="card mb-4">
      <button className="w-full flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className={clsx('rounded-lg p-2', COLOR_MAP[section.color])}>
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-white text-lg">{section.title}</h2>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="mt-5 space-y-4">
          {/* Plain text content */}
          {section.content && section.content.split('\n\n').map((para, i) => (
            <p key={i} className="text-slate-300 text-sm leading-relaxed">{para}</p>
          ))}

          {/* Example box */}
          {section.example && (
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-lg p-4">
              <p className="text-blue-400 font-semibold text-sm mb-1">{section.example.title}</p>
              <p className="text-slate-300 text-sm leading-relaxed">{section.example.body}</p>
            </div>
          )}

          {/* Comparison table */}
          {section.comparison && (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Aspect</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-500 uppercase tracking-wide">ETF</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-500 uppercase tracking-wide">Individual Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {section.comparison.map((row, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-medium text-slate-300">{row.aspect}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs leading-relaxed">{row.etf}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs leading-relaxed">{row.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Types */}
          {section.types && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section.types.map(t => (
                <div key={t.name} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-slate-200 text-sm">{t.name}</span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', BADGE_MAP[t.badgeColor])}>
                      {t.badge}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed mb-2">{t.desc}</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-slate-500">Risk: <span className="text-slate-300">{t.risk}</span></span>
                    <span className="text-slate-500">Examples: <span className="font-mono text-blue-400">{t.examples}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Risks */}
          {section.risks && (
            <div className="space-y-3">
              {section.risks.map(r => (
                <div key={r.title} className="flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-200 text-sm">{r.title}</p>
                    <p className="text-slate-400 text-xs leading-relaxed mt-0.5">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Steps */}
          {section.steps && (
            <div className="space-y-3">
              {section.steps.map(s => (
                <div key={s.num} className="flex gap-4">
                  <span className="text-blue-500 font-mono font-bold text-lg shrink-0 w-8">{s.num}</span>
                  <div>
                    <p className="font-semibold text-slate-200 text-sm">{s.title}</p>
                    <p className="text-slate-400 text-xs leading-relaxed mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ETFEducationPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="w-5 h-5 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">ETF Guide</h1>
      </div>
      <p className="text-slate-400 text-sm mb-8">
        Everything you need to understand ETFs — what they are, how they compare to stocks, the different types, and the risks involved.
      </p>

      {SECTIONS.map(section => (
        <Section key={section.id} section={section} />
      ))}

      <p className="text-slate-600 text-xs text-center mt-6 leading-relaxed">
        This guide is for educational purposes only. Nothing here constitutes investment advice. Always do your own research and consider consulting a licensed financial advisor.
      </p>
    </div>
  )
}
