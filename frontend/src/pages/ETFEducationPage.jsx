import { useState, useMemo } from 'react'
import {
  BookOpen, ChevronDown, ChevronUp, Shield, TrendingUp, Layers,
  Globe, AlertTriangle, CheckCircle, Calculator, Brain,
  ChevronRight, ChevronLeft, Check, X as XIcon, Trophy, Zap
} from 'lucide-react'
import clsx from 'clsx'

// ── Data ────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'what', icon: BookOpen, color: 'blue', title: 'What is an ETF?',
    content: `An ETF (Exchange-Traded Fund) is a basket of securities — stocks, bonds, or other assets — that trades on a stock exchange just like a single stock.\n\nWhen you buy one share of SPY (the S&P 500 ETF), you're instantly buying a tiny piece of all 500 companies in the S&P 500 index. Instead of buying Apple, Microsoft, Amazon, Google, and 496 others separately, you buy one ticker and own all of them proportionally.\n\nETFs are priced and traded throughout the day (unlike mutual funds, which price once at market close). They typically have very low expense ratios — some as low as 0.03% per year — because most are "passively managed," meaning a computer tracks an index rather than a human picking stocks.`,
    example: { title: 'Real Example: VTI', body: "One share of VTI (~$265) gives you ownership in 3,800+ US companies — Apple, Microsoft, ExxonMobil, small regional banks, and everything in between. Expense ratio: 0.03%/year. That's $0.30/year on $1,000 invested." }
  },
  {
    id: 'vs-stocks', icon: TrendingUp, color: 'emerald', title: 'ETFs vs Individual Stocks',
    content: null,
    comparison: [
      { aspect: 'Diversification',   etf: 'Built-in — one ticker = hundreds of companies',          stock: 'Single company — all risk concentrated' },
      { aspect: 'Research required', etf: 'Minimal — understand the index it tracks',                stock: 'Deep research on financials, management, competitors' },
      { aspect: 'Volatility',        etf: 'Lower — bad news at one company barely moves it',         stock: 'Higher — one bad earnings report can drop 20% overnight' },
      { aspect: 'Upside potential',  etf: 'Moderate — tracks the average of many companies',         stock: 'Higher — a great pick can 10x, but most underperform the index' },
      { aspect: 'Cost',              etf: 'Expense ratio 0.03–0.75%/year',                           stock: 'No ongoing fee, but monitoring costs time' },
      { aspect: 'Time commitment',   etf: 'Low — buy and hold, rebalance occasionally',              stock: 'High — monitor news, earnings, sector trends' },
      { aspect: 'Tax efficiency',    etf: 'High — fewer internal transactions trigger capital gains', stock: 'Depends on your trading frequency' },
    ]
  },
  {
    id: 'types', icon: Layers, color: 'purple', title: 'Types of ETFs',
    types: [
      { name: 'Broad Market ETFs', badge: 'Core',         badgeColor: 'blue',   examples: 'VTI, VOO, SPY, QQQ',                           desc: 'Track a broad index like the entire US stock market or the S&P 500. The backbone of most long-term portfolios. Ultra-low costs, extreme diversification.',      risk: 'Low–Medium', forWho: 'Everyone — especially beginners and passive investors' },
      { name: 'Sector ETFs',       badge: 'Tactical',     badgeColor: 'amber',  examples: 'XLK (Tech), XLV (Healthcare), XLE (Energy)',    desc: 'Focus on a single sector. Useful with a strong view on one industry while still diversifying within it.',                                                       risk: 'Medium',     forWho: 'Investors with sector-specific conviction' },
      { name: 'Thematic ETFs',     badge: 'High Risk',    badgeColor: 'orange', examples: 'BOTZ (AI/Robotics), URA (Uranium), ARKK',       desc: 'Track a specific trend or theme. Highly concentrated and often more volatile. Expense ratios are typically higher (0.5–0.75%).',                               risk: 'High',       forWho: 'Experienced investors with high risk tolerance' },
      { name: 'International ETFs',badge: 'Diversify',    badgeColor: 'teal',   examples: 'VEA (Developed), VWO (Emerging), EWJ (Japan)',  desc: 'Expose your portfolio to companies outside the US. Reduces dependence on the US economy. Currency risk is a factor.',                                        risk: 'Medium–High',forWho: 'Investors seeking geographic diversification' },
      { name: 'Dividend ETFs',     badge: 'Income',       badgeColor: 'green',  examples: 'SCHD, VYM, JEPI, HDV',                         desc: 'Hold companies with strong dividend histories. Generate regular income through distributions. SCHD is particularly popular for quality screening.',              risk: 'Low–Medium', forWho: 'Income-focused investors, retirees' },
      { name: 'Bond ETFs',         badge: 'Defensive',    badgeColor: 'slate',  examples: 'AGG, BND, TLT, SHY',                           desc: 'Hold bonds instead of stocks. Move differently from equities — often rise when stocks fall. TLT is particularly sensitive to interest rate changes.',       risk: 'Low',        forWho: 'Conservative investors, those nearing retirement' },
    ]
  },
  {
    id: 'risks', icon: AlertTriangle, color: 'red', title: 'ETF Risks to Understand',
    risks: [
      { title: 'Tracking Error',             desc: 'An ETF may not perfectly replicate its index due to fees, timing, or sampling. Usually small for major ETFs but worth checking for niche funds.' },
      { title: 'Liquidity Risk',             desc: 'Very niche ETFs may have low trading volume, leading to wide bid-ask spreads. Stick to ETFs with >$500M AUM for easy entry and exit.' },
      { title: 'Hidden Concentration',       desc: 'QQQ is technically diversified (100 stocks) but 40%+ is in just Apple, Microsoft, Amazon, and Nvidia. "Diversified" doesn\'t always mean balanced.' },
      { title: 'Thematic ETF Risk',          desc: 'Thematic ETFs like ARKK or BOTZ can drop 50–80% if the theme falls out of favor. They\'re not core holdings.' },
      { title: 'Expense Ratio Compounding',  desc: 'Even small fees compound over time. A 0.75% ER on a $100K portfolio costs $750/year — vs $30/year for a 0.03% ETF. Over 30 years, this difference is massive.' },
      { title: 'Overlap',                    desc: 'Owning SPY, VOO, and QQQ doesn\'t mean 3× diversification — they share most of the same top holdings. Always check overlap before adding another ETF.' },
      { title: 'Currency Risk',              desc: 'When you own VEA or VWO, your returns are affected by foreign currency movements against the dollar, not just company performance.' },
    ]
  },
  {
    id: 'howto', icon: CheckCircle, color: 'emerald', title: 'How to Build an ETF Portfolio',
    steps: [
      { num: '01', title: 'Start with a core',       desc: 'A simple VTI + VXUS (total world ex-US) or just VT gives you global diversification in 1–2 ETFs. This alone beats most actively managed funds over the long term.' },
      { num: '02', title: 'Add sectors intentionally',desc: 'If you have strong conviction in tech, semis, or clean energy — add a sector ETF as a satellite position (5–15% of portfolio), not as your core.' },
      { num: '03', title: 'Check expense ratios',    desc: 'For core positions, use ETFs with <0.10% ER (VOO, VTI, SCHB). For sector/thematic, 0.35–0.75% is acceptable if you have real conviction.' },
      { num: '04', title: 'Avoid overlap',           desc: 'Use the ETF Explorer and check your portfolio analysis for overlap alerts before adding a new fund. Don\'t pay double fees for the same exposure.' },
      { num: '05', title: 'Match risk to timeline',  desc: 'If you\'re 20–35, you can handle more equity ETFs. If you\'re 50+, consider adding bond ETFs (AGG, BND) to reduce volatility.' },
    ]
  },
]

const QUIZ = [
  {
    q: 'An ETF with a 0.75% expense ratio vs one with 0.03% — on a $10,000 investment, how much MORE do you pay per year with the expensive one?',
    options: ['$7.20', '$72.00', '$0.72', '$720.00'],
    answer: 1,
    explanation: '$10,000 × 0.75% = $75/year vs $10,000 × 0.03% = $3/year. Difference = $72/year. Over 30 years this compounds to tens of thousands of dollars lost to fees.'
  },
  {
    q: 'Which ETF gives you the broadest US market exposure?',
    options: ['QQQ (Nasdaq-100)', 'SPY (S&P 500)', 'VTI (Total Stock Market)', 'XLK (Technology)'],
    answer: 2,
    explanation: 'VTI tracks the entire US stock market — ~3,800 companies. SPY only holds 500. QQQ is tech-heavy. XLK is a single sector.'
  },
  {
    q: 'You own SPY, VOO, and IVV. How diversified are you?',
    options: [
      'Very diversified — three separate ETFs',
      'Not really — all three track the S&P 500 with near-identical holdings',
      'Moderately — each has slightly different holdings',
      'Completely diversified — 500 stocks each'
    ],
    answer: 1,
    explanation: 'SPY, VOO, and IVV all track the S&P 500. You essentially have triple exposure to the same 500 stocks and pay three expense ratios for the same result.'
  },
  {
    q: 'What does "beta" of 1.5 mean for an ETF?',
    options: [
      'It returns 1.5× the market every year',
      'It typically moves 50% more than the market — up and down',
      'It has 50% lower risk than the market',
      'It tracks 1.5 indices simultaneously'
    ],
    answer: 1,
    explanation: 'Beta measures sensitivity to market movements. A beta of 1.5 means if the market drops 10%, this ETF typically drops 15%. It also means bigger gains in bull markets.'
  },
  {
    q: 'Which of these is a THEMATIC ETF (highest risk/most concentrated)?',
    options: ['AGG (US Aggregate Bonds)', 'VTI (Total Market)', 'ARKK (Innovation)', 'VEA (Developed Markets)'],
    answer: 2,
    explanation: 'ARKK is a thematic ETF focused on disruptive innovation — highly concentrated and volatile. It dropped ~75% from its 2021 peak. AGG is bonds, VTI is total market, VEA is international developed.'
  },
]

// ── Helpers ─────────────────────────────────────────────────────────────────────

const COLOR_MAP = { blue:'bg-blue-500/10 text-blue-400', emerald:'bg-emerald-500/10 text-emerald-400', purple:'bg-purple-500/10 text-purple-400', red:'bg-red-500/10 text-red-400', teal:'bg-teal-500/10 text-teal-400' }
const BADGE_MAP  = { blue:'bg-blue-500/15 text-blue-400', amber:'bg-amber-500/15 text-amber-400', orange:'bg-orange-500/15 text-orange-400', teal:'bg-teal-500/15 text-teal-400', green:'bg-emerald-500/15 text-emerald-400', slate:'bg-slate-700 text-slate-400' }


// ── Interactive Expense Ratio Calculator ────────────────────────────────────────

function ERCalculator() {
  const [amount, setAmount]   = useState(10000)
  const [er1, setEr1]         = useState(0.03)
  const [er2, setEr2]         = useState(0.75)
  const [years, setYears]     = useState(20)
  const [growth, setGrowth]   = useState(7)

  const calc = useMemo(() => {
    const r = growth / 100
    const net1 = r - er1 / 100
    const net2 = r - er2 / 100
    const v1 = amount * Math.pow(1 + net1, years)
    const v2 = amount * Math.pow(1 + net2, years)
    const saved = v1 - v2
    const feePaid1 = amount * Math.pow(1 + r, years) - v1
    const feePaid2 = amount * Math.pow(1 + r, years) - v2
    return { v1, v2, saved, feePaid1, feePaid2 }
  }, [amount, er1, er2, years, growth])

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-4 h-4 text-blue-400" />
        <p className="font-semibold text-white text-sm">Interactive Expense Ratio Calculator</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5 text-xs">
        <label className="block">
          <span className="text-slate-400 block mb-1">Starting investment</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">$</span>
            <input type="number" value={amount} onChange={e => setAmount(+e.target.value)} min="1000" step="1000"
              className="input py-1.5 text-sm w-full" />
          </div>
        </label>
        <label className="block">
          <span className="text-slate-400 block mb-1">Years invested</span>
          <input type="range" min="5" max="40" value={years} onChange={e => setYears(+e.target.value)}
            className="w-full accent-blue-500" />
          <span className="text-slate-300 font-bold">{years} years</span>
        </label>
        <label className="block">
          <span className="text-slate-400 block mb-1">Annual market return</span>
          <input type="range" min="3" max="12" value={growth} onChange={e => setGrowth(+e.target.value)}
            className="w-full accent-emerald-500" />
          <span className="text-slate-300 font-bold">{growth}% / year</span>
        </label>
        <label className="block">
          <span className="text-slate-400 block mb-1">Expensive ETF ER (%)</span>
          <input type="range" min="0.10" max="1.50" step="0.05" value={er2} onChange={e => setEr2(+e.target.value)}
            className="w-full accent-red-500" />
          <span className="text-red-400 font-bold">{er2.toFixed(2)}% / year</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
          <p className="text-emerald-400 text-xs mb-1">Low-cost ETF ({er1}% ER)</p>
          <p className="text-emerald-300 font-bold text-xl">{fmt(calc.v1)}</p>
          <p className="text-emerald-600 text-xs mt-0.5">fees paid: {fmt(calc.feePaid1)}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-red-400 text-xs mb-1">Expensive ETF ({er2}% ER)</p>
          <p className="text-red-300 font-bold text-xl">{fmt(calc.v2)}</p>
          <p className="text-red-600 text-xs mt-0.5">fees paid: {fmt(calc.feePaid2)}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <p className="text-blue-400 text-xs mb-1">You save by going low-cost</p>
          <p className="text-blue-300 font-bold text-xl">{fmt(calc.saved)}</p>
          <p className="text-blue-600 text-xs mt-0.5">over {years} years</p>
        </div>
      </div>
    </div>
  )
}


// ── Quiz component ──────────────────────────────────────────────────────────────

function QuizSection() {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)   // index of chosen answer
  const [confirmed, setConfirmed] = useState(false)
  const [results, setResults] = useState([])        // array of booleans
  const [done, setDone] = useState(false)

  const q = QUIZ[current]
  const score = results.filter(Boolean).length

  function choose(i) {
    if (confirmed) return
    setSelected(i)
  }

  function confirm() {
    if (selected === null) return
    const correct = selected === q.answer
    setConfirmed(true)
    setResults(prev => [...prev, correct])
  }

  function next() {
    if (current + 1 >= QUIZ.length) { setDone(true); return }
    setCurrent(c => c + 1)
    setSelected(null)
    setConfirmed(false)
  }

  function restart() {
    setCurrent(0); setSelected(null); setConfirmed(false)
    setResults([]); setDone(false)
  }

  if (done) {
    const pct = Math.round((score / QUIZ.length) * 100)
    const msg = pct >= 80 ? "ETF Pro! 🎉" : pct >= 60 ? "Solid understanding 👍" : "Keep learning — re-read the guide and try again!"
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-center">
        <Trophy className={clsx("w-12 h-12 mx-auto mb-3", pct >= 80 ? "text-amber-400" : pct >= 60 ? "text-blue-400" : "text-slate-500")} />
        <p className="text-white font-bold text-xl mb-1">{score} / {QUIZ.length} correct</p>
        <p className={clsx("text-sm mb-4", pct >= 80 ? "text-amber-400" : pct >= 60 ? "text-blue-400" : "text-slate-400")}>{msg}</p>
        <div className="flex gap-2 justify-center">
          {results.map((r, i) => (
            <span key={i} className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold", r ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
              {r ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
            </span>
          ))}
        </div>
        <button onClick={restart} className="mt-5 btn-primary text-sm px-6 py-2">Retake Quiz</button>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <p className="font-semibold text-white text-sm">Knowledge Check</p>
        </div>
        <span className="text-slate-500 text-xs">Question {current + 1} of {QUIZ.length}</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 mb-4">
        {QUIZ.map((_, i) => (
          <div key={i} className={clsx("h-1 flex-1 rounded-full transition-all",
            i < results.length ? (results[i] ? "bg-emerald-500" : "bg-red-500")
            : i === current ? "bg-blue-500" : "bg-slate-700"
          )} />
        ))}
      </div>

      <p className="text-slate-200 text-sm font-medium mb-4 leading-relaxed">{q.q}</p>

      <div className="space-y-2 mb-4">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.answer
          const isChosen  = i === selected
          return (
            <button key={i} onClick={() => choose(i)}
              className={clsx(
                "w-full text-left px-4 py-3 rounded-xl text-sm transition-all border",
                !confirmed && !isChosen && "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-700/40 bg-slate-800/40",
                !confirmed && isChosen  && "border-blue-500 bg-blue-500/10 text-white",
                confirmed && isCorrect  && "border-emerald-500 bg-emerald-500/15 text-emerald-300",
                confirmed && isChosen && !isCorrect && "border-red-500 bg-red-500/15 text-red-300",
                confirmed && !isChosen && !isCorrect && "border-slate-700 text-slate-600 bg-slate-800/20",
              )}
            >
              <span className="flex items-center gap-3">
                <span className={clsx("w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0",
                  !confirmed && "border-slate-600 text-slate-500",
                  confirmed && isCorrect && "border-emerald-500 bg-emerald-500 text-white",
                  confirmed && isChosen && !isCorrect && "border-red-500 bg-red-500 text-white",
                )}>
                  {confirmed && isCorrect ? <Check className="w-3 h-3" /> : confirmed && isChosen && !isCorrect ? <XIcon className="w-3 h-3" /> : String.fromCharCode(65 + i)}
                </span>
                {opt}
              </span>
            </button>
          )
        })}
      </div>

      {confirmed && (
        <div className="bg-slate-700/40 border border-slate-700/60 rounded-xl p-3 mb-4 text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-slate-200">Explanation: </span>{q.explanation}
        </div>
      )}

      <div className="flex gap-2">
        {!confirmed ? (
          <button onClick={confirm} disabled={selected === null}
            className="btn-primary text-sm px-5 py-2 disabled:opacity-40">
            Confirm Answer
          </button>
        ) : (
          <button onClick={next} className="btn-primary text-sm px-5 py-2 flex items-center gap-1.5">
            {current + 1 >= QUIZ.length ? "See Results" : "Next Question"}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}


// ── Section component ───────────────────────────────────────────────────────────

function Section({ section, sectionIndex, totalSections, isOpen, onToggle }) {
  const Icon = section.icon

  return (
    <div className={clsx("mb-3 rounded-2xl border transition-all duration-200",
      isOpen ? "border-slate-700 bg-slate-900/60" : "border-slate-800/60 hover:border-slate-700/60"
    )}>
      <button
        className="w-full flex items-center justify-between px-5 py-4"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={clsx('rounded-xl p-2', COLOR_MAP[section.color])}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-slate-500 text-xs">{String(sectionIndex + 1).padStart(2, '0')} / {String(totalSections).padStart(2, '0')}</p>
            <h2 className="font-bold text-white text-base leading-tight">{section.title}</h2>
          </div>
        </div>
        <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
          isOpen ? "bg-slate-700 text-slate-300" : "text-slate-600"
        )}>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5">
          <div className="border-t border-slate-800/60 pt-4 space-y-4">

            {section.content && section.content.split('\n\n').map((para, i) => (
              <p key={i} className="text-slate-300 text-sm leading-relaxed">{para}</p>
            ))}

            {section.example && (
              <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-4">
                <p className="text-blue-400 font-semibold text-sm mb-1.5">{section.example.title}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{section.example.body}</p>
              </div>
            )}

            {section.comparison && (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Aspect</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-500 uppercase tracking-wide">✦ ETF</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-blue-500 uppercase tracking-wide">Individual Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.comparison.map((row, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-300 text-xs">{row.aspect}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs leading-relaxed">{row.etf}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs leading-relaxed">{row.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section.types && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.types.map(t => (
                  <div key={t.name} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 hover:border-slate-600 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-slate-200 text-sm">{t.name}</span>
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', BADGE_MAP[t.badgeColor])}>{t.badge}</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed mb-2.5">{t.desc}</p>
                    <div className="space-y-1 text-xs">
                      <p><span className="text-slate-500">Risk: </span><span className="text-slate-300">{t.risk}</span></p>
                      <p><span className="text-slate-500">For: </span><span className="text-slate-400">{t.forWho}</span></p>
                      <p><span className="text-slate-500">Examples: </span><span className="font-mono text-blue-400">{t.examples}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {section.risks && (
              <div className="space-y-3">
                {section.risks.map(r => (
                  <div key={r.title} className="flex gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl hover:border-red-500/20 transition-colors">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">{r.title}</p>
                      <p className="text-slate-400 text-xs leading-relaxed mt-0.5">{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expense ratio calculator lives inside the Risk section */}
            {section.id === 'risks' && <ERCalculator />}

            {section.steps && (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-800" />
                <div className="space-y-4">
                  {section.steps.map((s, i) => (
                    <div key={s.num} className="flex gap-4 relative">
                      <span className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0 z-10">
                        {s.num}
                      </span>
                      <div className="pt-1">
                        <p className="font-semibold text-slate-200 text-sm">{s.title}</p>
                        <p className="text-slate-400 text-xs leading-relaxed mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


// ── Page ────────────────────────────────────────────────────────────────────────

export default function ETFEducationPage() {
  const [openSection, setOpenSection] = useState('what')

  const completedCount = SECTIONS.findIndex(s => s.id === openSection)
  const progressPct    = Math.round(((completedCount) / SECTIONS.length) * 100)

  function toggleSection(id) {
    setOpenSection(prev => prev === id ? null : id)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="w-5 h-5 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">ETF Guide</h1>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Everything you need to understand ETFs — from basics to risks. Take the quiz at the end to test your knowledge.
      </p>

      {/* Progress bar */}
      <div className="mb-6 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-slate-400 font-medium">Your progress</span>
          <span className="text-blue-400 font-semibold">
            {SECTIONS.findIndex(s => s.id === openSection) + 1} / {SECTIONS.length} sections
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, progressPct)}%` }}
          />
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setOpenSection(s.id)}
              className={clsx(
                "shrink-0 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all",
                openSection === s.id
                  ? "border-blue-500 bg-blue-500/15 text-blue-300"
                  : "border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
              )}
            >
              {s.title.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section, i) => (
        <Section
          key={section.id}
          section={section}
          sectionIndex={i}
          totalSections={SECTIONS.length}
          isOpen={openSection === section.id}
          onToggle={() => toggleSection(section.id)}
        />
      ))}

      {/* Quiz */}
      <div className="mt-6 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <h2 className="font-bold text-white text-lg">Test Your Knowledge</h2>
        </div>
        <p className="text-slate-500 text-xs mt-1">5 questions — takes about 2 minutes</p>
      </div>
      <QuizSection />

      <p className="text-slate-600 text-xs text-center mt-8 leading-relaxed">
        This guide is for educational purposes only. Nothing here constitutes investment advice. Always do your own research and consider consulting a licensed financial advisor.
      </p>
    </div>
  )
}
