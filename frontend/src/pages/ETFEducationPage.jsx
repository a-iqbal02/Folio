import { useState, useMemo } from 'react'
import {
  BookOpen, ChevronDown, ChevronUp, AlertTriangle, CheckCircle,
  Calculator, Brain, ChevronRight, Check, X as XIcon,
  Trophy, Zap, TrendingUp, TrendingDown, Layers, BarChart3,
  Info, ExternalLink
} from 'lucide-react'
import clsx from 'clsx'

// ── ETF type detail data ─────────────────────────────────────────────────────
const ETF_DETAILS = {
  'VTI':  { topHoldings: [['Apple','6.5%'],['Microsoft','6.2%'],['Nvidia','5.8%'],['Amazon','3.7%'],['Meta','2.5%']], returns: { '6mo':'+12.1%','1yr':'+24.0%','3yr':'+7.2%','5yr':'+14.1%' }, positive: true },
  'VOO':  { topHoldings: [['Apple','7.1%'],['Microsoft','6.8%'],['Nvidia','6.3%'],['Amazon','4.0%'],['Meta','2.8%']], returns: { '6mo':'+12.4%','1yr':'+24.8%','3yr':'+7.8%','5yr':'+14.6%' }, positive: true },
  'QQQ':  { topHoldings: [['Apple','9.0%'],['Microsoft','8.7%'],['Nvidia','8.2%'],['Amazon','5.2%'],['Meta','4.3%']], returns: { '6mo':'+14.2%','1yr':'+26.9%','3yr':'+6.1%','5yr':'+19.2%' }, positive: true },
  'SCHD': { topHoldings: [['Verizon','4.2%'],['Altria','4.1%'],['AbbVie','4.0%'],['Chevron','3.9%'],['TI','3.8%']], returns: { '6mo':'+8.1%','1yr':'+13.2%','3yr':'+4.4%','5yr':'+11.8%' }, positive: true },
  'VYM':  { topHoldings: [['Broadcom','3.4%'],['JPMorgan','3.2%'],['Exxon','3.1%'],['J&J','2.9%'],['P&G','2.7%']], returns: { '6mo':'+7.8%','1yr':'+12.1%','3yr':'+5.1%','5yr':'+10.2%' }, positive: true },
  'JEPI': { topHoldings: [['Amazon','1.8%'],['Microsoft','1.7%'],['Alphabet','1.6%'],['Apple','1.6%'],['Meta','1.5%']], returns: { '6mo':'+5.2%','1yr':'+9.4%','3yr':'+5.0%','5yr':'N/A' }, positive: true },
  'AGG':  { topHoldings: [['US Treasury','42%'],['Mortgage-Backed','27%'],['Corp. Bonds','25%'],['Agency','4%'],['Other','2%']], returns: { '6mo':'+2.8%','1yr':'+4.2%','3yr':'-1.2%','5yr':'+0.8%' }, positive: false },
  'BND':  { topHoldings: [['US Treasury','44%'],['Mortgage-Backed','22%'],['Corp. Bonds','25%'],['Agency','5%'],['Other','4%']], returns: { '6mo':'+2.7%','1yr':'+4.0%','3yr':'-1.1%','5yr':'+0.7%' }, positive: false },
  'ARKK': { topHoldings: [['Tesla','9.5%'],['Coinbase','9.0%'],['Roku','8.1%'],['UiPath','7.2%'],['CRISPR Tx','5.8%']], returns: { '6mo':'+18.4%','1yr':'+28.1%','3yr':'-22.4%','5yr':'-6.2%' }, positive: false },
  'VEA':  { topHoldings: [['Nestlé','1.8%'],['Samsung','1.7%'],['ASML','1.6%'],['Toyota','1.5%'],['Novo Nordisk','1.5%']], returns: { '6mo':'+9.1%','1yr':'+11.4%','3yr':'+1.8%','5yr':'+6.2%' }, positive: true },
  'VWO':  { topHoldings: [['Taiwan Semi.','5.5%'],['Tencent','3.8%'],['Samsung','3.2%'],['Alibaba','2.1%'],['Reliance','1.6%']], returns: { '6mo':'+8.4%','1yr':'+8.9%','3yr':'-0.8%','5yr':'+4.1%' }, positive: true },
  'XLK':  { topHoldings: [['Apple','22%'],['Microsoft','22%'],['Nvidia','20%'],['Broadcom','4.5%'],['Salesforce','2.1%']], returns: { '6mo':'+14.8%','1yr':'+26.1%','3yr':'+9.2%','5yr':'+22.4%' }, positive: true },
  'XLV':  { topHoldings: [['UnitedHealth','9.2%'],['Eli Lilly','8.8%'],['J&J','6.1%'],['AbbVie','5.4%'],['Merck','4.9%']], returns: { '6mo':'+4.2%','1yr':'+6.8%','3yr':'+4.1%','5yr':'+8.2%' }, positive: true },
}

// ── Sections ─────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'what', icon: BookOpen, color: 'blue', title: "What is an ETF?",
    relatedETFs: ['VTI','VOO','SPY'],
    content: `An ETF (Exchange-Traded Fund) is a basket of securities — stocks, bonds, or other assets — that trades on a stock exchange just like a single stock.\n\nWhen you buy one share of SPY (the S&P 500 ETF), you're instantly buying a tiny piece of all 500 companies in the S&P 500 index. Instead of buying Apple, Microsoft, Amazon, Google, and 496 others separately, you buy one ticker and own all of them proportionally.\n\nETFs are priced and traded throughout the day (unlike mutual funds, which price once at market close). They typically have very low expense ratios — some as low as 0.03% per year — because most are "passively managed," meaning a computer tracks an index rather than a human picking stocks.`,
    example: { title: 'Real Example: VTI', body: "One share of VTI (~$265) gives you ownership in 3,800+ US companies — Apple, Microsoft, ExxonMobil, small regional banks, and everything in between. Expense ratio: 0.03%/year. That's $0.30/year on $1,000 invested." }
  },
  {
    id: 'vs-stocks', icon: TrendingUp, color: 'emerald', title: 'ETFs vs Individual Stocks',
    relatedETFs: ['QQQ','VTI','VOO'],
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
    relatedETFs: ['VTI','SCHD','XLK','VEA'],
    types: [
      { name: 'Broad Market ETFs',  badge: 'Core',      badgeColor: 'blue',   ticker: 'VTI',  examples: 'VTI, VOO, SPY, QQQ',                          desc: 'Track a broad index like the entire US stock market. The backbone of most long-term portfolios. Ultra-low costs, extreme diversification.',     risk: 'Low–Medium', forWho: 'Everyone — especially beginners' },
      { name: 'Sector ETFs',        badge: 'Tactical',  badgeColor: 'amber',  ticker: 'XLK',  examples: 'XLK (Tech), XLV (Healthcare), XLE (Energy)',   desc: 'Focus on a single sector. Useful with a strong view on one industry while still diversifying within it.',                                      risk: 'Medium',     forWho: 'Investors with sector conviction' },
      { name: 'Thematic ETFs',      badge: 'High Risk', badgeColor: 'orange', ticker: 'ARKK', examples: 'BOTZ (AI), URA (Uranium), ARKK (Innovation)',  desc: 'Track a specific trend or theme. Highly concentrated and more volatile. Expense ratios are typically higher (0.5–0.75%).',                     risk: 'High',       forWho: 'Experienced, high risk tolerance' },
      { name: 'International ETFs', badge: 'Diversify', badgeColor: 'teal',   ticker: 'VEA',  examples: 'VEA (Developed), VWO (Emerging), EWJ (Japan)', desc: 'Expose your portfolio to companies outside the US. Reduces US-economy dependence. Currency risk is a factor.',                                 risk: 'Medium–High',forWho: 'Geographic diversification seekers' },
      { name: 'Dividend ETFs',      badge: 'Income',    badgeColor: 'green',  ticker: 'SCHD', examples: 'SCHD, VYM, JEPI, HDV',                        desc: 'Hold companies with strong dividend histories. Generate regular income. SCHD is popular for quality screening. JEPI uses covered calls.',      risk: 'Low–Medium', forWho: 'Income-focused investors, retirees' },
      { name: 'Bond ETFs',          badge: 'Defensive', badgeColor: 'slate',  ticker: 'BND',  examples: 'AGG, BND, TLT, SHY',                          desc: 'Hold bonds instead of stocks. Often rise when stocks fall. TLT is particularly sensitive to interest rate changes.',                            risk: 'Low',        forWho: 'Conservative investors, pre-retirees' },
    ]
  },
  {
    id: 'risks', icon: AlertTriangle, color: 'red', title: 'ETF Risks to Understand',
    relatedETFs: ['ARKK','QQQ','TLT'],
    risks: [
      { title: 'Tracking Error',            desc: "An ETF may not perfectly replicate its index due to fees or sampling. Usually small for major ETFs but worth checking for niche funds." },
      { title: 'Liquidity Risk',            desc: "Very niche ETFs may have low trading volume, leading to wide bid-ask spreads. Stick to ETFs with >$500M AUM for easy entry and exit." },
      { title: 'Hidden Concentration',      desc: "QQQ is technically diversified (100 stocks) but 40%+ is in just Apple, Microsoft, Amazon, and Nvidia. 'Diversified' doesn't always mean balanced." },
      { title: 'Thematic ETF Risk',         desc: "Thematic ETFs like ARKK or BOTZ can drop 50–80% if the theme falls out of favor. They're not core holdings." },
      { title: 'Expense Ratio Compounding', desc: "Even small fees compound over time. A 0.75% ER on a $100K portfolio costs $750/year — vs $30/year for a 0.03% ETF. Over 30 years, this difference is massive." },
      { title: 'Overlap',                   desc: "Owning SPY, VOO, and QQQ doesn't mean 3× diversification — they share most of the same top holdings." },
      { title: 'Currency Risk',             desc: "When you own VEA or VWO, your returns are affected by foreign currency movements against the dollar." },
    ]
  },
  {
    id: 'howto', icon: CheckCircle, color: 'emerald', title: 'How to Build an ETF Portfolio',
    relatedETFs: ['VTI','SCHD','AGG'],
    steps: [
      { num: '01', title: 'Start with a core',        desc: 'A simple VTI + VXUS or just VT gives you global diversification in 1–2 ETFs. This alone beats most actively managed funds long-term.' },
      { num: '02', title: 'Add sectors intentionally', desc: 'If you have strong conviction in tech, semis, or clean energy — add a sector ETF as a satellite position (5–15%), not your core.' },
      { num: '03', title: 'Check expense ratios',      desc: 'For core positions, use ETFs with <0.10% ER. For sector/thematic, 0.35–0.75% is acceptable if you have real conviction.' },
      { num: '04', title: 'Avoid overlap',             desc: "Don't pay double fees for the same exposure. Check the ETF Explorer for overlap alerts before adding a new fund." },
      { num: '05', title: 'Match risk to timeline',    desc: "If you're 20–35, you can handle more equity ETFs. If you're 50+, consider adding bond ETFs (AGG, BND) to reduce volatility." },
    ]
  },
]

const QUIZ = [
  { q: 'An ETF with 0.75% ER vs 0.03% — on $10,000, how much MORE per year with the expensive one?', options: ['$7.20','$72.00','$0.72','$720.00'], answer: 1, explanation: '$10,000 × 0.75% = $75/yr vs $10,000 × 0.03% = $3/yr. Difference = $72/yr. Over 30 years this compounds to tens of thousands.' },
  { q: 'Which ETF gives the broadest US market exposure?', options: ['QQQ (Nasdaq-100)','SPY (S&P 500)','VTI (Total Stock Market)','XLK (Technology)'], answer: 2, explanation: 'VTI tracks the entire US stock market — ~3,800 companies. SPY only holds 500. QQQ is tech-heavy. XLK is a single sector.' },
  { q: 'You own SPY, VOO, and IVV. How diversified are you?', options: ['Very — three separate ETFs','Barely — all three track the S&P 500 with near-identical holdings','Moderately — each has slightly different holdings','Completely — 500 stocks each'], answer: 1, explanation: 'SPY, VOO, and IVV all track the S&P 500. You have triple exposure to the same 500 stocks and pay three expense ratios for the same result.' },
  { q: 'What does a beta of 1.5 mean for an ETF?', options: ['It returns 1.5× the market every year','It typically moves 50% more than the market — up and down','It has 50% lower risk than the market','It tracks 1.5 indices simultaneously'], answer: 1, explanation: 'Beta measures market sensitivity. Beta 1.5 means if the market drops 10%, this ETF typically drops 15% — but also gains more in bull markets.' },
  { q: 'Which is a THEMATIC ETF (most concentrated/risky)?', options: ['AGG (US Bonds)','VTI (Total Market)','ARKK (Innovation)','VEA (Developed Markets)'], answer: 2, explanation: 'ARKK is thematic — focused on disruptive innovation, highly concentrated, volatile. It dropped ~75% from its 2021 peak.' },
]

const COLOR_MAP = { blue:'bg-blue-500/10 text-blue-400', emerald:'bg-emerald-500/10 text-emerald-400', purple:'bg-purple-500/10 text-purple-400', red:'bg-red-500/10 text-red-400', teal:'bg-teal-500/10 text-teal-400' }
const BADGE_MAP  = { blue:'bg-blue-500/15 text-blue-400', amber:'bg-amber-500/15 text-amber-400', orange:'bg-orange-500/15 text-orange-400', teal:'bg-teal-500/15 text-teal-400', green:'bg-emerald-500/15 text-emerald-400', slate:'bg-slate-700 text-slate-400' }


// ── ETF Detail Panel ─────────────────────────────────────────────────────────
function ETFDetailPanel({ ticker, onClose }) {
  const data = ETF_DETAILS[ticker]
  if (!data) return null
  return (
    <div className="mt-3 bg-slate-900/80 border border-blue-500/20 rounded-xl p-4 text-xs">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono font-bold text-blue-400 text-sm">{ticker}</span>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-slate-500 font-semibold uppercase tracking-wider mb-2">Top Holdings</p>
          {data.topHoldings.map(([name, pct]) => (
            <div key={name} className="flex justify-between mb-1">
              <span className="text-slate-400 truncate mr-2">{name}</span>
              <span className="text-slate-300 font-semibold shrink-0">{pct}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-slate-500 font-semibold uppercase tracking-wider mb-2">Returns (approx)</p>
          {Object.entries(data.returns).map(([period, ret]) => {
            const pos = ret.startsWith('+')
            const neg = ret.startsWith('-')
            return (
              <div key={period} className="flex justify-between mb-1">
                <span className="text-slate-500">{period}</span>
                <span className={pos ? 'text-emerald-400 font-semibold' : neg ? 'text-red-400 font-semibold' : 'text-slate-400'}>{ret}</span>
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-slate-700 text-xs mt-2 italic">Data is approximate. Past performance ≠ future results.</p>
    </div>
  )
}


// ── Expense Ratio Calculator ─────────────────────────────────────────────────
function ERCalculator() {
  const [amount, setAmount] = useState(10000)
  const [er2, setEr2]       = useState(0.75)
  const [years, setYears]   = useState(20)
  const er1 = 0.03
  const growth = 7

  const calc = useMemo(() => {
    const r    = growth / 100
    const v1   = amount * Math.pow(1 + (r - er1 / 100), years)
    const v2   = amount * Math.pow(1 + (r - er2 / 100), years)
    return { v1, v2, saved: v1 - v2 }
  }, [amount, er2, years])

  const fmt = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n)

  return (
    <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-blue-400" />
        <p className="font-semibold text-white text-sm">Fee Impact Calculator</p>
      </div>
      <div className="space-y-3 text-xs">
        <div>
          <div className="flex justify-between mb-1"><span className="text-slate-400">Investment</span><span className="text-white font-bold">{fmt(amount)}</span></div>
          <input type="range" min="1000" max="100000" step="1000" value={amount} onChange={e=>setAmount(+e.target.value)} className="w-full accent-blue-500 h-1.5" />
        </div>
        <div>
          <div className="flex justify-between mb-1"><span className="text-slate-400">Years</span><span className="text-white font-bold">{years}yr</span></div>
          <input type="range" min="5" max="40" value={years} onChange={e=>setYears(+e.target.value)} className="w-full accent-emerald-500 h-1.5" />
        </div>
        <div>
          <div className="flex justify-between mb-1"><span className="text-slate-400">Expensive ER</span><span className="text-red-400 font-bold">{er2.toFixed(2)}%</span></div>
          <input type="range" min="0.10" max="1.50" step="0.05" value={er2} onChange={e=>setEr2(+e.target.value)} className="w-full accent-red-500 h-1.5" />
        </div>
      </div>
      <div className="mt-4 space-y-2 text-xs">
        <div className="flex justify-between p-2 bg-emerald-500/10 rounded-lg">
          <span className="text-emerald-400">Low-cost (0.03% ER)</span>
          <span className="text-emerald-300 font-bold">{fmt(calc.v1)}</span>
        </div>
        <div className="flex justify-between p-2 bg-red-500/10 rounded-lg">
          <span className="text-red-400">Expensive ({er2}% ER)</span>
          <span className="text-red-300 font-bold">{fmt(calc.v2)}</span>
        </div>
        <div className="flex justify-between p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <span className="text-blue-400 font-semibold">You save</span>
          <span className="text-blue-300 font-bold text-sm">{fmt(calc.saved)}</span>
        </div>
      </div>
    </div>
  )
}


// ── Sidebar: contextual ETF cards ─────────────────────────────────────────────
function SidebarETFCards({ tickers }) {
  const [activeTicker, setActiveTicker] = useState(null)
  const detail = activeTicker ? ETF_DETAILS[activeTicker] : null

  return (
    <div className="space-y-2">
      {tickers.filter(t => ETF_DETAILS[t]).map(ticker => {
        const d = ETF_DETAILS[ticker]
        const isOpen = activeTicker === ticker
        return (
          <div key={ticker} className={clsx("rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden",
            isOpen ? "border-blue-500/30 bg-slate-800/80" : "border-slate-700/40 bg-slate-800/40 hover:border-slate-600")}>
            <div className="flex items-center justify-between px-3 py-2.5" onClick={() => setActiveTicker(p => p === ticker ? null : ticker)}>
              <div>
                <span className="font-mono font-bold text-blue-400 text-sm">{ticker}</span>
                {d.positive
                  ? <span className="ml-2 text-emerald-400 text-xs font-semibold">{d.returns['1yr']} 1yr</span>
                  : <span className="ml-2 text-red-400 text-xs font-semibold">{d.returns['1yr']} 1yr</span>
                }
              </div>
              {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
            </div>
            {isOpen && (
              <div className="px-3 pb-3 text-xs">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                  {d.topHoldings.slice(0,4).map(([n,p]) => (
                    <div key={n} className="flex justify-between">
                      <span className="text-slate-500 truncate mr-1">{n}</span>
                      <span className="text-slate-300 shrink-0">{p}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap mt-2">
                  {Object.entries(d.returns).map(([period, ret]) => (
                    <span key={period} className={clsx("px-2 py-0.5 rounded-full text-xs font-semibold",
                      ret.startsWith('+') ? 'bg-emerald-500/15 text-emerald-400' : ret.startsWith('-') ? 'bg-red-500/15 text-red-400' : 'bg-slate-700 text-slate-400'
                    )}>{period}: {ret}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


// ── Quiz ─────────────────────────────────────────────────────────────────────
function QuizSection() {
  const [current, setCurrent]   = useState(0)
  const [selected, setSelected] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [results, setResults]   = useState([])
  const [done, setDone]         = useState(false)

  const q = QUIZ[current]

  function confirm() {
    if (selected === null) return
    setConfirmed(true)
    setResults(prev => [...prev, selected === q.answer])
  }

  function next() {
    if (current + 1 >= QUIZ.length) { setDone(true); return }
    setCurrent(c => c + 1); setSelected(null); setConfirmed(false)
  }

  function restart() {
    setCurrent(0); setSelected(null); setConfirmed(false); setResults([]); setDone(false)
  }

  const score = results.filter(Boolean).length

  if (done) {
    const pct = Math.round((score / QUIZ.length) * 100)
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-center">
        <Trophy className={clsx("w-12 h-12 mx-auto mb-3", pct>=80?"text-amber-400":pct>=60?"text-blue-400":"text-slate-500")} />
        <p className="text-white font-bold text-xl mb-1">{score} / {QUIZ.length} correct</p>
        <p className={clsx("text-sm mb-4", pct>=80?"text-amber-400":pct>=60?"text-blue-400":"text-slate-400")}>
          {pct>=80?"ETF Pro! 🎉":pct>=60?"Solid understanding 👍":"Keep reading the guide and try again!"}
        </p>
        <div className="flex gap-2 justify-center mb-4">
          {results.map((r,i) => <span key={i} className={clsx("w-8 h-8 rounded-full flex items-center justify-center",r?"bg-emerald-500/20 text-emerald-400":"bg-red-500/20 text-red-400")}>{r?<Check className="w-4 h-4"/>:<XIcon className="w-4 h-4"/>}</span>)}
        </div>
        <button onClick={restart} className="btn-primary text-sm px-6 py-2">Retake Quiz</button>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-purple-400"/><p className="font-semibold text-white text-sm">Knowledge Check</p></div>
        <span className="text-slate-500 text-xs">{current+1} / {QUIZ.length}</span>
      </div>
      <div className="flex gap-1.5 mb-4">
        {QUIZ.map((_,i) => <div key={i} className={clsx("h-1.5 flex-1 rounded-full transition-all",
          i<results.length?(results[i]?"bg-emerald-500":"bg-red-500"):i===current?"bg-blue-500":"bg-slate-700")}/>)}
      </div>
      <p className="text-slate-200 text-sm font-medium mb-4 leading-relaxed">{q.q}</p>
      <div className="space-y-2 mb-4">
        {q.options.map((opt,i) => (
          <button key={i} onClick={()=>!confirmed&&setSelected(i)} className={clsx("w-full text-left px-4 py-3 rounded-xl text-sm transition-all border",
            !confirmed&&i!==selected&&"border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-700/40 bg-slate-800/40",
            !confirmed&&i===selected&&"border-blue-500 bg-blue-500/10 text-white",
            confirmed&&i===q.answer&&"border-emerald-500 bg-emerald-500/15 text-emerald-300",
            confirmed&&i===selected&&i!==q.answer&&"border-red-500 bg-red-500/15 text-red-300",
            confirmed&&i!==selected&&i!==q.answer&&"border-slate-700 text-slate-600 bg-slate-800/20",
          )}>
            <span className="flex items-center gap-3">
              <span className={clsx("w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0",
                !confirmed&&"border-slate-600 text-slate-500",
                confirmed&&i===q.answer&&"border-emerald-500 bg-emerald-500 text-white",
                confirmed&&i===selected&&i!==q.answer&&"border-red-500 bg-red-500 text-white",
              )}>
                {confirmed&&i===q.answer?<Check className="w-3 h-3"/>:confirmed&&i===selected&&i!==q.answer?<XIcon className="w-3 h-3"/>:String.fromCharCode(65+i)}
              </span>
              {opt}
            </span>
          </button>
        ))}
      </div>
      {confirmed && <div className="bg-slate-700/40 border border-slate-700 rounded-xl p-3 mb-4 text-xs text-slate-300 leading-relaxed"><span className="font-semibold text-slate-200">Explanation: </span>{q.explanation}</div>}
      <div className="flex gap-2">
        {!confirmed
          ? <button onClick={confirm} disabled={selected===null} className="btn-primary text-sm px-5 py-2 disabled:opacity-40">Confirm Answer</button>
          : <button onClick={next} className="btn-primary text-sm px-5 py-2 flex items-center gap-1.5">{current+1>=QUIZ.length?"See Results":"Next Question"}<ChevronRight className="w-3.5 h-3.5"/></button>
        }
      </div>
    </div>
  )
}


// ── Section ───────────────────────────────────────────────────────────────────
function Section({ section, idx, total, isOpen, onToggle }) {
  const [detailTicker, setDetailTicker] = useState(null)
  const Icon = section.icon
  return (
    <div className={clsx("mb-3 rounded-2xl border transition-all duration-200",isOpen?"border-slate-700 bg-slate-900/60":"border-slate-800/60 hover:border-slate-700/60")}>
      <button className="w-full flex items-center justify-between px-5 py-4" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className={clsx('rounded-xl p-2',COLOR_MAP[section.color])}><Icon className="w-4 h-4"/></div>
          <div className="text-left">
            <p className="text-slate-500 text-xs">{String(idx+1).padStart(2,'0')} / {String(total).padStart(2,'0')}</p>
            <h2 className="font-bold text-white text-base leading-tight">{section.title}</h2>
          </div>
        </div>
        <div className={clsx("w-7 h-7 rounded-lg flex items-center justify-center transition-colors",isOpen?"bg-slate-700 text-slate-300":"text-slate-600")}>
          {isOpen?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5">
          <div className="border-t border-slate-800/60 pt-4 space-y-4">
            {section.content && section.content.split('\n\n').map((p,i)=><p key={i} className="text-slate-300 text-sm leading-relaxed">{p}</p>)}
            {section.example && (
              <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-4">
                <p className="text-blue-400 font-semibold text-sm mb-1.5">{section.example.title}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{section.example.body}</p>
              </div>
            )}
            {section.comparison && (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-800 bg-slate-900/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Aspect</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-500 uppercase tracking-wide">✦ ETF</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-blue-500 uppercase tracking-wide">Stock</th>
                  </tr></thead>
                  <tbody>{section.comparison.map((row,i)=>(
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-300 text-xs">{row.aspect}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs leading-relaxed">{row.etf}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs leading-relaxed">{row.stock}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            {section.types && (
              <div className="grid grid-cols-1 gap-3">
                {section.types.map(t => (
                  <div key={t.name} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 hover:border-slate-600 transition-colors">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold text-slate-200 text-sm">{t.name}</span>
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold',BADGE_MAP[t.badgeColor])}>{t.badge}</span>
                      <button
                        onClick={()=>setDetailTicker(p=>p===t.ticker?null:t.ticker)}
                        className="ml-auto flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 transition-colors"
                      >
                        <BarChart3 className="w-3 h-3"/>
                        {detailTicker===t.ticker ? 'Hide' : 'Details'}
                      </button>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed mb-2">{t.desc}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span><span className="text-slate-500">Risk: </span><span className="text-slate-300">{t.risk}</span></span>
                      <span><span className="text-slate-500">For: </span><span className="text-slate-400">{t.forWho}</span></span>
                      <span><span className="text-slate-500">E.g.: </span><span className="font-mono text-blue-400">{t.examples}</span></span>
                    </div>
                    {detailTicker === t.ticker && ETF_DETAILS[t.ticker] && <ETFDetailPanel ticker={t.ticker} onClose={()=>setDetailTicker(null)}/>}
                  </div>
                ))}
              </div>
            )}
            {section.risks && (
              <div className="space-y-3">
                {section.risks.map(r=>(
                  <div key={r.title} className="flex gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl hover:border-red-500/20 transition-colors">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"/>
                    <div><p className="font-semibold text-slate-200 text-sm">{r.title}</p><p className="text-slate-400 text-xs leading-relaxed mt-0.5">{r.desc}</p></div>
                  </div>
                ))}
              </div>
            )}
            {section.steps && (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-800"/>
                <div className="space-y-4">
                  {section.steps.map(s=>(
                    <div key={s.num} className="flex gap-4 relative">
                      <span className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0 z-10">{s.num}</span>
                      <div className="pt-1"><p className="font-semibold text-slate-200 text-sm">{s.title}</p><p className="text-slate-400 text-xs leading-relaxed mt-0.5">{s.desc}</p></div>
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


// ── Page ──────────────────────────────────────────────────────────────────────
export default function ETFEducationPage() {
  const [openSection, setOpenSection] = useState('what')

  const currentIdx  = SECTIONS.findIndex(s => s.id === openSection)
  const progressPct = Math.round(((currentIdx + 1) / SECTIONS.length) * 100)
  const currentSection = SECTIONS[currentIdx]

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1"><BookOpen className="w-5 h-5 text-blue-400"/><h1 className="text-2xl font-bold text-white">ETF Guide</h1></div>
      <p className="text-slate-400 text-sm mb-6">Learn everything about ETFs — from basics to risks. Interactive tools included.</p>

      {/* Progress */}
      <div className="mb-6 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-slate-400 font-medium">Progress</span>
          <span className="text-blue-400 font-semibold">{currentIdx+1} / {SECTIONS.length}</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500" style={{width:`${progressPct}%`}}/>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {SECTIONS.map((s,i) => (
            <button key={s.id} onClick={()=>setOpenSection(s.id)}
              className={clsx("shrink-0 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all whitespace-nowrap",
                openSection===s.id?"border-blue-500 bg-blue-500/15 text-blue-300":"border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
              )}>{s.title.split(' ').slice(0,2).join(' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: sections */}
        <div className="flex-1 min-w-0">
          {SECTIONS.map((s,i) => (
            <Section key={s.id} section={s} idx={i} total={SECTIONS.length}
              isOpen={openSection===s.id} onToggle={()=>setOpenSection(p=>p===s.id?null:s.id)}/>
          ))}

          {/* Quiz */}
          <div className="mt-4 mb-3">
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-purple-400"/><h2 className="font-bold text-white text-lg">Test Your Knowledge</h2></div>
            <p className="text-slate-500 text-xs mt-1 mb-4">5 questions — takes ~2 minutes</p>
          </div>
          <QuizSection />
        </div>

        {/* Right: sticky sidebar */}
        <div className="lg:w-72 lg:shrink-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            {/* Contextual ETF cards */}
            {currentSection && currentSection.relatedETFs?.some(t => ETF_DETAILS[t]) && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                  ETFs for "{currentSection.title.split(' ').slice(0,2).join(' ')}"
                </p>
                <SidebarETFCards tickers={currentSection.relatedETFs} />
              </div>
            )}

            {/* Expense ratio calculator */}
            <ERCalculator />

            {/* Key concepts */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Quick Reference</p>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Ultra-low ER', value: '≤ 0.10%', color: 'text-emerald-400', desc: 'Core holding quality' },
                  { label: 'Low ER',       value: '0.10–0.35%', color: 'text-yellow-400', desc: 'Acceptable for sectors' },
                  { label: 'High ER',      value: '> 0.35%', color: 'text-orange-400', desc: 'Thematic/active funds' },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between p-2 bg-slate-800/60 rounded-lg">
                    <div><p className={r.color+' font-semibold'}>{r.label}</p><p className="text-slate-600">{r.desc}</p></div>
                    <span className={r.color+' font-mono font-bold'}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 text-xs text-slate-500">
                <p>• AUM &gt; $1B = good liquidity</p>
                <p>• Beta &gt; 1 = more volatile than market</p>
                <p>• Beta &lt; 1 = less volatile than market</p>
                <p>• Overlap = owning same stocks twice</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-slate-600 text-xs text-center mt-8 leading-relaxed">
        For educational purposes only. Not investment advice. Always do your own research.
      </p>
    </div>
  )
}
