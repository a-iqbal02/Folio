import { useState, useMemo } from 'react'
import { Search, TrendingUp, Filter, ExternalLink, ChevronDown, ChevronUp, Flame, Star } from 'lucide-react'
import clsx from 'clsx'

// ---------------------------------------------------------------------------
// Full ETF database — 120+ funds across all categories
// ---------------------------------------------------------------------------
const ETF_DATABASE = [
  // ── BROAD MARKET ──────────────────────────────────────────────────────────
  { ticker:"VTI",  name:"Vanguard Total Stock Market ETF",         er:0.03,  category:"Broad Market",         tags:["core","total market","beginner"],            aum:"$450B", desc:"Every publicly traded US company in one fund — 3,800+ holdings." },
  { ticker:"VOO",  name:"Vanguard S&P 500 ETF",                    er:0.03,  category:"Broad Market",         tags:["core","s&p 500","beginner"],                 aum:"$550B", desc:"500 largest US companies. One of the lowest-cost S&P 500 funds." },
  { ticker:"IVV",  name:"iShares Core S&P 500 ETF",                er:0.03,  category:"Broad Market",         tags:["core","s&p 500","beginner"],                 aum:"$530B", desc:"iShares version of the S&P 500 — equally low cost as VOO." },
  { ticker:"SPY",  name:"SPDR S&P 500 ETF Trust",                  er:0.09,  category:"Broad Market",         tags:["core","s&p 500","liquid"],                   aum:"$580B", desc:"The original S&P 500 ETF. Most liquid ETF in the world — favored by traders." },
  { ticker:"SCHB", name:"Schwab US Broad Market ETF",              er:0.03,  category:"Broad Market",         tags:["core","total market","beginner"],            aum:"$28B",  desc:"Total US market at Schwab's rock-bottom cost." },
  { ticker:"VT",   name:"Vanguard Total World Stock ETF",          er:0.07,  category:"Broad Market",         tags:["core","global","international"],             aum:"$38B",  desc:"Every publicly traded company in the world — US and international in one ticker." },

  // ── GROWTH ────────────────────────────────────────────────────────────────
  { ticker:"QQQ",  name:"Invesco QQQ Trust (Nasdaq-100)",          er:0.20,  category:"Growth",               tags:["growth","nasdaq","tech-heavy"],              aum:"$280B", desc:"Top 100 non-financial Nasdaq companies. Heavy tech weighting." },
  { ticker:"QQQM", name:"Invesco Nasdaq 100 ETF",                  er:0.15,  category:"Growth",               tags:["growth","nasdaq","long-term"],               aum:"$35B",  desc:"Same index as QQQ but cheaper — better suited for long-term buy-and-hold." },
  { ticker:"VUG",  name:"Vanguard Growth ETF",                     er:0.04,  category:"Growth",               tags:["growth","large cap","low cost"],             aum:"$130B", desc:"US large-cap growth stocks at an extremely low expense ratio." },
  { ticker:"SCHG", name:"Schwab US Large-Cap Growth ETF",          er:0.04,  category:"Growth",               tags:["growth","large cap","low cost"],             aum:"$30B",  desc:"Large-cap growth at Schwab's ultra-low cost." },
  { ticker:"VOOG", name:"Vanguard S&P 500 Growth ETF",             er:0.10,  category:"Growth",               tags:["growth","s&p 500"],                         aum:"$14B",  desc:"Growth-tilted slice of the S&P 500." },
  { ticker:"SPYG", name:"SPDR Portfolio S&P 500 Growth ETF",       er:0.04,  category:"Growth",               tags:["growth","s&p 500","low cost"],              aum:"$25B",  desc:"S&P 500 growth stocks only — very low cost." },

  // ── VALUE ─────────────────────────────────────────────────────────────────
  { ticker:"VTV",  name:"Vanguard Value ETF",                      er:0.04,  category:"Value",                tags:["value","large cap","dividend"],              aum:"$115B", desc:"US large-cap value stocks. Low cost, long track record." },
  { ticker:"SCHV", name:"Schwab US Large-Cap Value ETF",           er:0.04,  category:"Value",                tags:["value","large cap","low cost"],              aum:"$12B",  desc:"Large-cap value at Schwab's rock-bottom cost." },
  { ticker:"IVE",  name:"iShares S&P 500 Value ETF",               er:0.18,  category:"Value",                tags:["value","s&p 500"],                          aum:"$22B",  desc:"Value-tilted S&P 500 from iShares." },
  { ticker:"SPYV", name:"SPDR Portfolio S&P 500 Value ETF",        er:0.04,  category:"Value",                tags:["value","s&p 500","low cost"],               aum:"$18B",  desc:"S&P 500 value stocks only — very low cost." },

  // ── DIVIDEND / INCOME ─────────────────────────────────────────────────────
  { ticker:"SCHD", name:"Schwab US Dividend Equity ETF",           er:0.06,  category:"Dividend & Income",    tags:["dividend","income","popular"],               aum:"$65B",  desc:"High-quality US dividend payers screened for consistency. One of the most popular income ETFs." },
  { ticker:"VYM",  name:"Vanguard High Dividend Yield ETF",        er:0.06,  category:"Dividend & Income",    tags:["dividend","income","yield"],                 aum:"$55B",  desc:"Broad basket of high-yield US dividend stocks." },
  { ticker:"JEPI", name:"JPMorgan Equity Premium Income ETF",      er:0.35,  category:"Dividend & Income",    tags:["income","covered calls","monthly"],          aum:"$35B",  desc:"Monthly income via equity + covered call options. Lower volatility than pure equity." },
  { ticker:"JEPQ", name:"JPMorgan Nasdaq Equity Premium Income",   er:0.35,  category:"Dividend & Income",    tags:["income","covered calls","nasdaq","monthly"], aum:"$18B",  desc:"Same covered call strategy as JEPI but on Nasdaq-100 names." },
  { ticker:"DVY",  name:"iShares Select Dividend ETF",             er:0.38,  category:"Dividend & Income",    tags:["dividend","income","yield"],                 aum:"$14B",  desc:"US stocks with consistently high dividends, screened for quality." },
  { ticker:"HDV",  name:"iShares Core High Dividend ETF",          er:0.08,  category:"Dividend & Income",    tags:["dividend","income","quality"],               aum:"$10B",  desc:"High-yield US dividend stocks with an additional quality filter." },
  { ticker:"DIVO", name:"Amplify CWP Enhanced Dividend Income",    er:0.55,  category:"Dividend & Income",    tags:["dividend","covered calls","income"],         aum:"$3B",   desc:"Blue-chip dividend stocks plus selective covered calls for extra income." },

  // ── TECHNOLOGY ────────────────────────────────────────────────────────────
  { ticker:"XLK",  name:"Technology Select Sector SPDR Fund",      er:0.10,  category:"Technology",           tags:["tech","sector","large cap"],                 aum:"$72B",  desc:"Large-cap US tech — Apple, Microsoft, Nvidia are top holdings." },
  { ticker:"VGT",  name:"Vanguard Information Technology ETF",     er:0.10,  category:"Technology",           tags:["tech","sector","broad"],                     aum:"$75B",  desc:"Broad US tech sector — 300+ holdings from large to small cap." },
  { ticker:"IYW",  name:"iShares US Technology ETF",               er:0.40,  category:"Technology",           tags:["tech","sector"],                             aum:"$15B",  desc:"US technology sector from iShares." },

  // ── SEMICONDUCTORS ────────────────────────────────────────────────────────
  { ticker:"SOXX", name:"iShares Semiconductor ETF",               er:0.35,  category:"Semiconductors",       tags:["semis","chips","trending"],                  aum:"$14B",  desc:"30 US semiconductor companies. Intel, Nvidia, TSMC, ASML." },
  { ticker:"SMH",  name:"VanEck Semiconductor ETF",                er:0.35,  category:"Semiconductors",       tags:["semis","chips","trending"],                  aum:"$22B",  desc:"25 largest global semiconductor stocks. Highly concentrated in TSMC and Nvidia." },
  { ticker:"DRAM", name:"Roundhill Memory ETF",                    er:0.75,  category:"Semiconductors",       tags:["semis","memory","chips","niche"],             aum:"$0.3B", desc:"Pure-play memory chip companies — Samsung, Micron, SK Hynix. Highly concentrated." },
  { ticker:"SOXQ", name:"Invesco PHLX Semiconductor ETF",          er:0.19,  category:"Semiconductors",       tags:["semis","chips","low cost"],                  aum:"$1B",   desc:"Broader semiconductor exposure at a lower cost than SOXX or SMH." },

  // ── ARTIFICIAL INTELLIGENCE ───────────────────────────────────────────────
  { ticker:"AIQ",  name:"Global X Artificial Intelligence ETF",    er:0.68,  category:"Artificial Intelligence", tags:["AI","trending","thematic"],              aum:"$1.2B", desc:"Companies developing or meaningfully using AI technology globally." },
  { ticker:"BOTZ", name:"Global X Robotics & AI ETF",              er:0.68,  category:"Artificial Intelligence", tags:["AI","robotics","trending"],              aum:"$2B",   desc:"Robotics, automation, and AI companies globally." },
  { ticker:"IRBO", name:"iShares Robotics and AI Multisector ETF", er:0.47,  category:"Artificial Intelligence", tags:["AI","robotics","diversified"],           aum:"$0.5B", desc:"Broader AI and robotics exposure — more diversified than BOTZ." },
  { ticker:"WTAI", name:"WisdomTree Artificial Intelligence ETF",  er:0.45,  category:"Artificial Intelligence", tags:["AI","trending"],                         aum:"$0.3B", desc:"AI-focused companies with a quality and growth tilt." },
  { ticker:"AIS",  name:"VictoryShares AI & Tech ETF",             er:0.45,  category:"Artificial Intelligence", tags:["AI","tech","trending"],                  aum:"$0.6B", desc:"AI and technology companies with a factor-based selection methodology." },
  { ticker:"CHAT", name:"Roundhill Generative AI & Tech ETF",      er:0.75,  category:"Artificial Intelligence", tags:["AI","generative AI","trending","niche"], aum:"$0.2B", desc:"Pure-play generative AI companies — the most direct AI ETF available." },

  // ── DATA CENTERS & CLOUD ──────────────────────────────────────────────────
  { ticker:"CLOU", name:"Global X Cloud Computing ETF",            er:0.68,  category:"Data Centers & Cloud",  tags:["cloud","data centers","trending"],          aum:"$0.8B", desc:"Software-as-a-service and cloud infrastructure companies globally." },
  { ticker:"SKYY", name:"First Trust Cloud Computing ETF",         er:0.60,  category:"Data Centers & Cloud",  tags:["cloud","data centers","trending"],          aum:"$2.5B", desc:"Broad cloud computing exposure — one of the oldest cloud ETFs." },
  { ticker:"WCLD", name:"WisdomTree Cloud Computing ETF",          er:0.45,  category:"Data Centers & Cloud",  tags:["cloud","saas","trending"],                  aum:"$0.6B", desc:"Pure-play cloud companies screened for revenue growth." },
  { ticker:"SRVR", name:"Pacer Data & Infrastructure Real Estate", er:0.60,  category:"Data Centers & Cloud",  tags:["data centers","infrastructure","reits"],    aum:"$0.4B", desc:"Data center and communication tower REITs — infrastructure of the internet." },

  // ── SPACE ─────────────────────────────────────────────────────────────────
  { ticker:"UFO",  name:"Procure Space ETF",                       er:0.75,  category:"Space",                tags:["space","trending","niche"],                  aum:"$0.1B", desc:"Companies that derive revenue from space-related activities." },
  { ticker:"ARKX", name:"ARK Space Exploration & Innovation ETF",  er:0.75,  category:"Space",                tags:["space","innovation","trending","niche"],     aum:"$0.2B", desc:"Space exploration and aerospace innovation — SpaceX suppliers, satellite firms." },
  { ticker:"XAR",  name:"SPDR S&P Aerospace & Defense ETF",       er:0.35,  category:"Space",                tags:["space","defense","aerospace"],               aum:"$1.5B", desc:"Aerospace and defense companies — includes space primes like Lockheed, Raytheon." },
  { ticker:"ITA",  name:"iShares US Aerospace & Defense ETF",      er:0.40,  category:"Space",                tags:["space","defense","aerospace"],               aum:"$6B",   desc:"US aerospace and defense — Raytheon, Boeing, L3Harris." },

  // ── ASIAN MARKETS ─────────────────────────────────────────────────────────
  { ticker:"VWO",  name:"Vanguard Emerging Markets Stock ETF",     er:0.08,  category:"Asian Markets",        tags:["asia","emerging","china","india"],            aum:"$80B",  desc:"Broad emerging markets — heavy China, India, Taiwan, Brazil exposure." },
  { ticker:"IEMG", name:"iShares Core MSCI Emerging Markets",      er:0.09,  category:"Asian Markets",        tags:["asia","emerging","china","india"],            aum:"$72B",  desc:"Broad emerging markets coverage from iShares." },
  { ticker:"EEM",  name:"iShares MSCI Emerging Markets ETF",       er:0.68,  category:"Asian Markets",        tags:["asia","emerging","liquid"],                  aum:"$18B",  desc:"Original emerging markets ETF — widely traded but higher cost." },
  { ticker:"MCHI", name:"iShares MSCI China ETF",                  er:0.57,  category:"Asian Markets",        tags:["china","asia","trending"],                   aum:"$4B",   desc:"Large and mid-cap Chinese companies — Alibaba, Tencent, JD.com." },
  { ticker:"KWEB", name:"KraneShares CSI China Internet ETF",      er:0.69,  category:"Asian Markets",        tags:["china","internet","asia","trending"],         aum:"$5B",   desc:"Chinese internet and e-commerce companies. High growth, high volatility." },
  { ticker:"INDA", name:"iShares MSCI India ETF",                  er:0.64,  category:"Asian Markets",        tags:["india","asia","trending","growth"],           aum:"$9B",   desc:"Large and mid-cap Indian companies. One of the fastest-growing major economies." },
  { ticker:"INDY", name:"iShares India 50 ETF",                    er:0.93,  category:"Asian Markets",        tags:["india","asia","niche"],                      aum:"$1B",   desc:"50 largest Indian stocks — more concentrated India exposure than INDA." },
  { ticker:"EWJ",  name:"iShares MSCI Japan ETF",                  er:0.50,  category:"Asian Markets",        tags:["japan","asia","developed"],                  aum:"$10B",  desc:"Large and mid-cap Japanese stocks. Toyota, Sony, SoftBank." },
  { ticker:"AAXJ", name:"iShares MSCI All Country Asia ex Japan",  er:0.69,  category:"Asian Markets",        tags:["asia","ex-japan","broad"],                   aum:"$3B",   desc:"Asia ex-Japan — covers China, Korea, India, Taiwan, Hong Kong." },
  { ticker:"FEMR", name:"Fidelity Enhanced Emerging Markets ETF",  er:0.39,  category:"Asian Markets",        tags:["emerging","asia","fidelity"],                aum:"$2B",   desc:"Emerging markets with Fidelity's factor-enhanced stock selection." },

  // ── ENERGY & COMMODITIES ──────────────────────────────────────────────────
  { ticker:"XLE",  name:"Energy Select Sector SPDR Fund",          er:0.10,  category:"Energy",               tags:["energy","oil","gas","sector"],               aum:"$38B",  desc:"Large-cap US oil and gas companies — ExxonMobil, Chevron, ConocoPhillips." },
  { ticker:"VDE",  name:"Vanguard Energy ETF",                     er:0.10,  category:"Energy",               tags:["energy","oil","gas","sector"],               aum:"$8B",   desc:"Broad US energy sector coverage." },
  { ticker:"URA",  name:"Global X Uranium ETF",                    er:0.69,  category:"Energy",               tags:["uranium","nuclear","trending","niche"],       aum:"$3B",   desc:"Global uranium miners and nuclear fuel companies. Beneficiary of nuclear energy revival." },
  { ticker:"NLR",  name:"VanEck Uranium+Nuclear Energy ETF",       er:0.60,  category:"Energy",               tags:["uranium","nuclear","trending"],              aum:"$1B",   desc:"Uranium miners plus nuclear power plant operators globally." },
  { ticker:"ICLN", name:"iShares Global Clean Energy ETF",         er:0.40,  category:"Energy",               tags:["clean energy","solar","wind","trending"],    aum:"$2B",   desc:"Solar, wind, and clean energy companies globally." },
  { ticker:"TAN",  name:"Invesco Solar ETF",                       er:0.69,  category:"Energy",               tags:["solar","clean energy","trending","niche"],   aum:"$1B",   desc:"Pure-play solar energy companies globally." },
  { ticker:"FCAN", name:"First Trust Canada AlphaDEX Fund",        er:0.80,  category:"Energy",               tags:["energy","canada","commodities"],             aum:"$0.2B", desc:"Canadian equities with heavy natural resources and energy exposure." },

  // ── HEALTHCARE & BIOTECH ──────────────────────────────────────────────────
  { ticker:"XLV",  name:"Health Care Select Sector SPDR Fund",     er:0.10,  category:"Healthcare & Biotech", tags:["healthcare","sector","large cap"],            aum:"$38B",  desc:"Large-cap US healthcare — Johnson & Johnson, UnitedHealth, Eli Lilly." },
  { ticker:"VHT",  name:"Vanguard Health Care ETF",                er:0.10,  category:"Healthcare & Biotech", tags:["healthcare","broad","sector"],               aum:"$18B",  desc:"Broad US healthcare sector, 400+ holdings." },
  { ticker:"IBB",  name:"iShares Biotechnology ETF",               er:0.45,  category:"Healthcare & Biotech", tags:["biotech","healthcare","trending"],            aum:"$7B",   desc:"US biotech and pharmaceutical companies. High growth potential, high volatility." },
  { ticker:"XBI",  name:"SPDR S&P Biotech ETF",                    er:0.35,  category:"Healthcare & Biotech", tags:["biotech","healthcare","equal weight"],        aum:"$6B",   desc:"Equal-weight biotech — gives smaller companies more representation than IBB." },
  { ticker:"ARKG", name:"ARK Genomic Revolution ETF",              er:0.75,  category:"Healthcare & Biotech", tags:["genomics","biotech","innovation","trending"], aum:"$1.5B", desc:"Genomics, gene editing, and molecular diagnostics companies." },

  // ── FINANCIALS ────────────────────────────────────────────────────────────
  { ticker:"XLF",  name:"Financial Select Sector SPDR Fund",       er:0.10,  category:"Financials",           tags:["financials","banks","sector"],               aum:"$42B",  desc:"Large-cap US financials — JPMorgan, Berkshire, Visa, Mastercard." },
  { ticker:"VFH",  name:"Vanguard Financials ETF",                 er:0.10,  category:"Financials",           tags:["financials","banks","broad"],                aum:"$10B",  desc:"Broad US financial sector coverage." },
  { ticker:"KBE",  name:"SPDR S&P Bank ETF",                       er:0.35,  category:"Financials",           tags:["banks","financials","niche"],                aum:"$2B",   desc:"US commercial banks and thrifts — more concentrated bank exposure." },
  { ticker:"KBWB", name:"Invesco KBW Bank ETF",                    er:0.35,  category:"Financials",           tags:["banks","financials","niche"],                aum:"$1.5B", desc:"24 leading US banking companies." },

  // ── REAL ESTATE ───────────────────────────────────────────────────────────
  { ticker:"VNQ",  name:"Vanguard Real Estate ETF",                er:0.12,  category:"Real Estate",          tags:["reits","real estate","income"],              aum:"$30B",  desc:"Broad US REIT exposure — office, retail, residential, industrial." },
  { ticker:"XLRE", name:"Real Estate Select Sector SPDR Fund",     er:0.10,  category:"Real Estate",          tags:["reits","real estate","income"],              aum:"$6B",   desc:"US REITs from the S&P 500 — large cap only." },
  { ticker:"SRVR", name:"Pacer Data & Infrastructure Real Estate", er:0.60,  category:"Real Estate",          tags:["data centers","infrastructure","reits"],     aum:"$0.4B", desc:"Data center and communication tower REITs." },
  { ticker:"HOMZ", name:"Hoya Capital Housing ETF",                er:0.30,  category:"Real Estate",          tags:["housing","real estate","niche"],             aum:"$0.2B", desc:"Residential housing across REITs, homebuilders, and home improvement." },

  // ── LOW VOLATILITY / DEFENSIVE ────────────────────────────────────────────
  { ticker:"USMV", name:"iShares MSCI USA Min Vol Factor ETF",     er:0.15,  category:"Low Volatility",       tags:["low vol","defensive","stability"],           aum:"$25B",  desc:"US stocks historically less volatile than the market." },
  { ticker:"SPLV", name:"Invesco S&P 500 Low Volatility ETF",      er:0.25,  category:"Low Volatility",       tags:["low vol","defensive","s&p 500"],             aum:"$8B",   desc:"100 S&P 500 stocks with lowest realized volatility." },
  { ticker:"XLU",  name:"Utilities Select Sector SPDR Fund",       er:0.10,  category:"Low Volatility",       tags:["utilities","defensive","income"],            aum:"$14B",  desc:"US utilities — low beta, steady dividends, recession-resistant." },
  { ticker:"XLP",  name:"Consumer Staples Select Sector SPDR",     er:0.10,  category:"Low Volatility",       tags:["staples","defensive","income"],              aum:"$15B",  desc:"Consumer staples — food, household goods, tobacco. Historically defensive." },

  // ── FIXED INCOME / BONDS ──────────────────────────────────────────────────
  { ticker:"AGG",  name:"iShares Core US Aggregate Bond ETF",      er:0.03,  category:"Fixed Income",         tags:["bonds","fixed income","core","low cost"],    aum:"$115B", desc:"The benchmark US bond ETF — Treasuries, MBS, and investment-grade corps." },
  { ticker:"BND",  name:"Vanguard Total Bond Market ETF",          er:0.03,  category:"Fixed Income",         tags:["bonds","fixed income","core","low cost"],    aum:"$110B", desc:"Total US bond market at Vanguard's rock-bottom cost." },
  { ticker:"TLT",  name:"iShares 20+ Year Treasury Bond ETF",      er:0.15,  category:"Fixed Income",         tags:["bonds","treasuries","duration","macro"],     aum:"$50B",  desc:"Long-duration Treasuries. Moves inversely with interest rates." },
  { ticker:"SHY",  name:"iShares 1-3 Year Treasury Bond ETF",      er:0.15,  category:"Fixed Income",         tags:["bonds","treasuries","short duration"],       aum:"$24B",  desc:"Short-term Treasuries — lower interest rate risk." },
  { ticker:"HYG",  name:"iShares iBoxx High Yield Corporate Bond", er:0.48,  category:"Fixed Income",         tags:["bonds","high yield","junk","income"],        aum:"$14B",  desc:"High-yield (junk) corporate bonds. Higher income, higher credit risk." },

  // ── INTERNATIONAL DEVELOPED ───────────────────────────────────────────────
  { ticker:"VEA",  name:"Vanguard Developed Markets ETF",          er:0.05,  category:"International",        tags:["international","europe","japan","developed"], aum:"$115B", desc:"Developed markets outside the US — Europe, Japan, Australia, Canada." },
  { ticker:"EFA",  name:"iShares MSCI EAFE ETF",                   er:0.32,  category:"International",        tags:["international","europe","japan","developed"], aum:"$48B",  desc:"Europe, Australasia, and Far East developed markets." },
  { ticker:"SCHF", name:"Schwab International Equity ETF",         er:0.06,  category:"International",        tags:["international","developed","low cost"],      aum:"$40B",  desc:"Developed markets ex-US at a very low cost." },
  { ticker:"FENI", name:"Fidelity Enhanced International ETF",     er:0.39,  category:"International",        tags:["international","developed","fidelity"],      aum:"$1.5B", desc:"International developed market stocks with Fidelity's factor enhancement." },
  { ticker:"EWG",  name:"iShares MSCI Germany ETF",                er:0.50,  category:"International",        tags:["europe","germany","country"],                aum:"$1.5B", desc:"German large and mid-cap companies — industrial and export heavy." },

  // ── INNOVATION / DISRUPTIVE ───────────────────────────────────────────────
  { ticker:"ARKK", name:"ARK Innovation ETF",                      er:0.75,  category:"Innovation",           tags:["innovation","disruptive","high risk","trending"], aum:"$7B", desc:"Disruptive innovation — Tesla, Coinbase, Roku, CRISPR. High conviction, high volatility." },
  { ticker:"ARKW", name:"ARK Next Generation Internet ETF",        er:0.75,  category:"Innovation",           tags:["internet","innovation","trending"],           aum:"$1.5B", desc:"Next-gen internet — cloud, AI, blockchain, streaming." },
  { ticker:"ARKF", name:"ARK Fintech Innovation ETF",              er:0.75,  category:"Innovation",           tags:["fintech","innovation","trending"],            aum:"$0.8B", desc:"Financial technology — mobile payments, digital wallets, blockchain." },
  { ticker:"DRIV", name:"Global X Autonomous & EV ETF",            er:0.68,  category:"Innovation",           tags:["ev","autonomous","trending","niche"],         aum:"$0.5B", desc:"Electric vehicles and autonomous driving companies globally." },
  { ticker:"LIT",  name:"Global X Lithium & Battery Tech ETF",     er:0.75,  category:"Innovation",           tags:["lithium","ev","batteries","trending"],        aum:"$1.2B", desc:"Lithium miners and battery technology companies — EV supply chain." },

  // ── CYBERSECURITY ─────────────────────────────────────────────────────────
  { ticker:"CIBR", name:"First Trust NASDAQ Cybersecurity ETF",    er:0.60,  category:"Cybersecurity",        tags:["cybersecurity","tech","trending"],            aum:"$6B",   desc:"Companies providing cybersecurity hardware, software, and services." },
  { ticker:"HACK", name:"ETFMG Prime Cyber Security ETF",          er:0.60,  category:"Cybersecurity",        tags:["cybersecurity","tech","trending"],            aum:"$1.5B", desc:"Global cybersecurity companies — CrowdStrike, Palo Alto, Fortinet." },
  { ticker:"BUG",  name:"Global X Cybersecurity ETF",              er:0.50,  category:"Cybersecurity",        tags:["cybersecurity","tech","trending"],            aum:"$0.5B", desc:"Pure-play cybersecurity companies — focused and concentrated." },
]

// ---------------------------------------------------------------------------
// Trending categories config
// ---------------------------------------------------------------------------
const TRENDING = [
  { label: "🤖 Artificial Intelligence", filter: "Artificial Intelligence" },
  { label: "💾 Semiconductors",           filter: "Semiconductors" },
  { label: "🏢 Data Centers & Cloud",     filter: "Data Centers & Cloud" },
  { label: "🚀 Space",                    filter: "Space" },
  { label: "🌏 Asian Markets",            filter: "Asian Markets" },
  { label: "⚛️ Uranium & Nuclear",        filter: "Energy", tag: "uranium" },
  { label: "🔒 Cybersecurity",            filter: "Cybersecurity" },
  { label: "💡 Innovation",               filter: "Innovation" },
  { label: "💰 Dividend Income",          filter: "Dividend & Income" },
  { label: "🔋 Clean Energy",             filter: "Energy", tag: "clean energy" },
  { label: "🇮🇳 India",                   filter: "Asian Markets", tag: "india" },
  { label: "🧬 Biotech & Genomics",       filter: "Healthcare & Biotech" },
]

const ALL_CATEGORIES = [...new Set(ETF_DATABASE.map(e => e.category))].sort()

const fmt = {
  er: (v) => `${(v * 100).toFixed(2)}%`,
}

function ERBadge({ er }) {
  const color = er <= 0.10 ? 'text-emerald-400 bg-emerald-500/10'
              : er <= 0.35 ? 'text-yellow-400 bg-yellow-500/10'
              : 'text-orange-400 bg-orange-500/10'
  return (
    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', color)}>
      {fmt.er(er)} ER
    </span>
  )
}

function AUMBadge({ aum }) {
  return (
    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
      {aum} AUM
    </span>
  )
}

function ETFCard({ etf, expanded, onToggle }) {
  return (
    <div
      className="card hover:border-slate-700 transition-all duration-200 cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono font-bold text-blue-400 text-base">{etf.ticker}</span>
            <ERBadge er={etf.er} />
            <AUMBadge aum={etf.aum} />
          </div>
          <p className="text-slate-200 text-sm font-medium leading-snug">{etf.name}</p>
          {expanded && (
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">{etf.desc}</p>
          )}
          {expanded && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {etf.tags.map(tag => (
                <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                  {tag}
                </span>
              ))}
            </div>
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
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeTrend, setActiveTrend] = useState(null)
  const [expandedTicker, setExpandedTicker] = useState(null)
  const [showAllCategories, setShowAllCategories] = useState(false)

  const filtered = useMemo(() => {
    let results = ETF_DATABASE

    // Trending filter
    if (activeTrend) {
      const trend = TRENDING.find(t => t.label === activeTrend)
      if (trend) {
        results = results.filter(e =>
          e.category === trend.filter &&
          (!trend.tag || e.tags.includes(trend.tag))
        )
      }
    }
    // Category filter
    else if (activeCategory !== 'All') {
      results = results.filter(e => e.category === activeCategory)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      results = results.filter(e =>
        e.ticker.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.desc.toLowerCase().includes(q) ||
        e.tags.some(t => t.includes(q)) ||
        e.category.toLowerCase().includes(q)
      )
    }

    return results
  }, [search, activeCategory, activeTrend])

  function selectTrend(label) {
    setActiveTrend(prev => prev === label ? null : label)
    setActiveCategory('All')
  }

  function selectCategory(cat) {
    setActiveCategory(cat)
    setActiveTrend(null)
  }

  const visibleCategories = showAllCategories ? ALL_CATEGORIES : ALL_CATEGORIES.slice(0, 8)

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">ETF Explorer</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Browse 120+ ETFs by category, theme, or trend. All expense ratios and AUM shown.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveTrend(null); setActiveCategory('All') }}
          placeholder="Search by ticker, name, category, or theme…"
          className="input pl-10 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
          >
            Clear
          </button>
        )}
      </div>

      {/* Trending */}
      {!search && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-orange-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Trending Themes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TRENDING.map(t => (
              <button
                key={t.label}
                onClick={() => selectTrend(t.label)}
                className={clsx(
                  'text-sm px-3 py-1.5 rounded-lg border font-medium transition-all duration-150',
                  activeTrend === t.label
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      {!search && !activeTrend && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">All Categories</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => selectCategory('All')}
              className={clsx(
                'text-xs px-3 py-1.5 rounded-lg border font-medium transition-all',
                activeCategory === 'All'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
              )}
            >
              All ({ETF_DATABASE.length})
            </button>
            {visibleCategories.map(cat => {
              const count = ETF_DATABASE.filter(e => e.category === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => selectCategory(cat)}
                  className={clsx(
                    'text-xs px-3 py-1.5 rounded-lg border font-medium transition-all',
                    activeCategory === cat
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                  )}
                >
                  {cat} ({count})
                </button>
              )
            })}
            {ALL_CATEGORIES.length > 8 && (
              <button
                onClick={() => setShowAllCategories(p => !p)}
                className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-slate-700 text-slate-500 hover:text-slate-300 transition-all"
              >
                {showAllCategories ? '↑ Less' : `+${ALL_CATEGORIES.length - 8} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-sm">
          {activeTrend
            ? <span>Showing <strong className="text-slate-300">{activeTrend}</strong></span>
            : activeCategory !== 'All'
              ? <span>Category: <strong className="text-slate-300">{activeCategory}</strong></span>
              : search
                ? <span>Results for <strong className="text-slate-300">"{search}"</strong></span>
                : <span>All ETFs</span>
          }
          <span className="ml-2 text-slate-600">· {filtered.length} fund{filtered.length !== 1 ? 's' : ''}</span>
        </p>
        {(activeTrend || activeCategory !== 'All' || search) && (
          <button
            onClick={() => { setActiveTrend(null); setActiveCategory('All'); setSearch('') }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ETF grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <Star className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>No ETFs match your search.</p>
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
        ETF Explorer is for educational purposes only. Expense ratios and AUM are approximate and may be outdated.
        Nothing here constitutes investment advice. Always verify fund details at the issuer's website before investing.
      </p>
    </div>
  )
}
