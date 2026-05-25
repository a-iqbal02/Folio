import { useState, useMemo } from 'react'
import { Search, TrendingUp, Filter, ChevronDown, ChevronUp, Flame, Star, ArrowUpDown, SlidersHorizontal, X } from 'lucide-react'
import clsx from 'clsx'

// ── ETF Database ────────────────────────────────────────────────────────────────
// aumNum is assets under management in billions for sorting
const ETF_DATABASE = [
  // BROAD MARKET
  { ticker:"VTI",  name:"Vanguard Total Stock Market ETF",         er:0.03, category:"Broad Market",            tags:["core","total market","beginner","popular"],       aum:"$450B", aumNum:450, desc:"Every publicly traded US company — 3,800+ holdings in one fund." },
  { ticker:"VOO",  name:"Vanguard S&P 500 ETF",                    er:0.03, category:"Broad Market",            tags:["core","s&p 500","beginner","popular"],            aum:"$550B", aumNum:550, desc:"500 largest US companies. One of the lowest-cost S&P 500 funds." },
  { ticker:"IVV",  name:"iShares Core S&P 500 ETF",                er:0.03, category:"Broad Market",            tags:["core","s&p 500","beginner"],                     aum:"$530B", aumNum:530, desc:"iShares version of the S&P 500 — equally low cost as VOO." },
  { ticker:"SPY",  name:"SPDR S&P 500 ETF Trust",                  er:0.09, category:"Broad Market",            tags:["core","s&p 500","liquid","popular"],              aum:"$580B", aumNum:580, desc:"The original S&P 500 ETF. Most liquid ETF in the world." },
  { ticker:"SCHB", name:"Schwab US Broad Market ETF",              er:0.03, category:"Broad Market",            tags:["core","total market","low cost"],                 aum:"$28B",  aumNum:28,  desc:"Total US market at rock-bottom cost." },
  { ticker:"VT",   name:"Vanguard Total World Stock ETF",          er:0.07, category:"Broad Market",            tags:["core","global","international","one-fund"],       aum:"$38B",  aumNum:38,  desc:"Every publicly traded company globally in one ticker." },
  { ticker:"ITOT", name:"iShares Core S&P Total US Stock Market",  er:0.03, category:"Broad Market",            tags:["core","total market","low cost"],                 aum:"$60B",  aumNum:60,  desc:"Total US market from iShares — ultra low cost." },
  // GROWTH
  { ticker:"QQQ",  name:"Invesco QQQ Trust (Nasdaq-100)",          er:0.20, category:"Growth",                  tags:["growth","nasdaq","tech-heavy","popular"],         aum:"$280B", aumNum:280, desc:"Top 100 non-financial Nasdaq companies. Heavy tech weighting." },
  { ticker:"QQQM", name:"Invesco Nasdaq 100 ETF",                  er:0.15, category:"Growth",                  tags:["growth","nasdaq","long-term","low cost"],         aum:"$35B",  aumNum:35,  desc:"Same index as QQQ but cheaper — better for long-term holders." },
  { ticker:"VUG",  name:"Vanguard Growth ETF",                     er:0.04, category:"Growth",                  tags:["growth","large cap","low cost"],                  aum:"$130B", aumNum:130, desc:"US large-cap growth stocks at an extremely low expense ratio." },
  { ticker:"SCHG", name:"Schwab US Large-Cap Growth ETF",          er:0.04, category:"Growth",                  tags:["growth","large cap","low cost"],                  aum:"$30B",  aumNum:30,  desc:"Large-cap growth at Schwab's ultra-low cost." },
  { ticker:"VOOG", name:"Vanguard S&P 500 Growth ETF",             er:0.10, category:"Growth",                  tags:["growth","s&p 500"],                              aum:"$14B",  aumNum:14,  desc:"Growth-tilted slice of the S&P 500." },
  { ticker:"SPYG", name:"SPDR Portfolio S&P 500 Growth ETF",       er:0.04, category:"Growth",                  tags:["growth","s&p 500","low cost"],                   aum:"$25B",  aumNum:25,  desc:"S&P 500 growth stocks only — very low cost." },
  { ticker:"IWF",  name:"iShares Russell 1000 Growth ETF",         er:0.19, category:"Growth",                  tags:["growth","large cap","russell"],                   aum:"$95B",  aumNum:95,  desc:"Large-cap US growth stocks from the Russell 1000 index." },
  // VALUE
  { ticker:"VTV",  name:"Vanguard Value ETF",                      er:0.04, category:"Value",                   tags:["value","large cap","dividend","low cost"],        aum:"$115B", aumNum:115, desc:"US large-cap value stocks. Low cost, long track record." },
  { ticker:"SCHV", name:"Schwab US Large-Cap Value ETF",           er:0.04, category:"Value",                   tags:["value","large cap","low cost"],                   aum:"$12B",  aumNum:12,  desc:"Large-cap value at Schwab's rock-bottom cost." },
  { ticker:"IVE",  name:"iShares S&P 500 Value ETF",               er:0.18, category:"Value",                   tags:["value","s&p 500"],                               aum:"$22B",  aumNum:22,  desc:"Value-tilted S&P 500 from iShares." },
  { ticker:"SPYV", name:"SPDR Portfolio S&P 500 Value ETF",        er:0.04, category:"Value",                   tags:["value","s&p 500","low cost"],                    aum:"$18B",  aumNum:18,  desc:"S&P 500 value stocks only — very low cost." },
  { ticker:"IWD",  name:"iShares Russell 1000 Value ETF",          er:0.19, category:"Value",                   tags:["value","large cap","russell"],                    aum:"$60B",  aumNum:60,  desc:"Large-cap US value stocks from the Russell 1000." },
  // DIVIDEND
  { ticker:"SCHD", name:"Schwab US Dividend Equity ETF",           er:0.06, category:"Dividend & Income",       tags:["dividend","income","popular","quality"],          aum:"$65B",  aumNum:65,  desc:"High-quality US dividend payers screened for consistency." },
  { ticker:"VYM",  name:"Vanguard High Dividend Yield ETF",        er:0.06, category:"Dividend & Income",       tags:["dividend","income","yield"],                     aum:"$55B",  aumNum:55,  desc:"Broad basket of high-yield US dividend stocks." },
  { ticker:"JEPI", name:"JPMorgan Equity Premium Income ETF",      er:0.35, category:"Dividend & Income",       tags:["income","covered calls","monthly","popular"],    aum:"$35B",  aumNum:35,  desc:"Monthly income via equity and covered call options." },
  { ticker:"JEPQ", name:"JPMorgan Nasdaq Equity Premium Income",   er:0.35, category:"Dividend & Income",       tags:["income","covered calls","nasdaq","monthly"],     aum:"$18B",  aumNum:18,  desc:"Same covered call strategy as JEPI but on Nasdaq-100 names." },
  { ticker:"DVY",  name:"iShares Select Dividend ETF",             er:0.38, category:"Dividend & Income",       tags:["dividend","income","yield"],                     aum:"$14B",  aumNum:14,  desc:"US stocks with consistently high dividends." },
  { ticker:"HDV",  name:"iShares Core High Dividend ETF",          er:0.08, category:"Dividend & Income",       tags:["dividend","income","quality"],                   aum:"$10B",  aumNum:10,  desc:"High-yield US dividend stocks with a quality filter." },
  { ticker:"DGRO", name:"iShares Core Dividend Growth ETF",        er:0.08, category:"Dividend & Income",       tags:["dividend","growth","quality"],                   aum:"$28B",  aumNum:28,  desc:"Companies with a history of growing their dividends." },
  { ticker:"DIVO", name:"Amplify CWP Enhanced Dividend Income",    er:0.55, category:"Dividend & Income",       tags:["dividend","covered calls","income"],             aum:"$3B",   aumNum:3,   desc:"Blue-chip dividend stocks plus covered calls for extra income." },
  // TECHNOLOGY
  { ticker:"XLK",  name:"Technology Select Sector SPDR Fund",      er:0.10, category:"Technology",              tags:["tech","sector","large cap"],                     aum:"$72B",  aumNum:72,  desc:"Large-cap US tech — Apple, Microsoft, Nvidia are top holdings." },
  { ticker:"VGT",  name:"Vanguard Information Technology ETF",     er:0.10, category:"Technology",              tags:["tech","sector","broad"],                         aum:"$75B",  aumNum:75,  desc:"Broad US tech sector — 300+ holdings." },
  { ticker:"IYW",  name:"iShares US Technology ETF",               er:0.40, category:"Technology",              tags:["tech","sector"],                                 aum:"$15B",  aumNum:15,  desc:"US technology sector from iShares." },
  { ticker:"FTEC", name:"Fidelity MSCI Information Technology ETF",er:0.08, category:"Technology",              tags:["tech","sector","low cost","fidelity"],           aum:"$10B",  aumNum:10,  desc:"Fidelity's ultra-low-cost tech sector ETF." },
  // SEMICONDUCTORS
  { ticker:"SOXX", name:"iShares Semiconductor ETF",               er:0.35, category:"Semiconductors",          tags:["semis","chips","trending","popular"],             aum:"$14B",  aumNum:14,  desc:"30 US semiconductor companies — Intel, Nvidia, TSMC, ASML." },
  { ticker:"SMH",  name:"VanEck Semiconductor ETF",                er:0.35, category:"Semiconductors",          tags:["semis","chips","trending","popular"],             aum:"$22B",  aumNum:22,  desc:"25 largest global semiconductor stocks." },
  { ticker:"DRAM", name:"Roundhill Memory ETF",                    er:0.75, category:"Semiconductors",          tags:["semis","memory","chips","niche","trending"],      aum:"$0.3B", aumNum:0.3, desc:"Pure-play memory chip companies — Samsung, Micron, SK Hynix." },
  { ticker:"SOXQ", name:"Invesco PHLX Semiconductor ETF",          er:0.19, category:"Semiconductors",          tags:["semis","chips","low cost"],                      aum:"$1B",   aumNum:1,   desc:"Broader semiconductor exposure at a lower cost than SOXX or SMH." },
  { ticker:"PSI",  name:"Invesco Semiconductors ETF",              er:0.57, category:"Semiconductors",          tags:["semis","chips","equal weight"],                  aum:"$0.5B", aumNum:0.5, desc:"Equal-weighted semiconductor exposure." },
  // ARTIFICIAL INTELLIGENCE
  { ticker:"AIQ",  name:"Global X Artificial Intelligence ETF",    er:0.68, category:"Artificial Intelligence", tags:["AI","trending","thematic","popular"],            aum:"$1.2B", aumNum:1.2, desc:"Companies developing or meaningfully using AI technology globally." },
  { ticker:"BOTZ", name:"Global X Robotics & AI ETF",              er:0.68, category:"Artificial Intelligence", tags:["AI","robotics","trending"],                      aum:"$2B",   aumNum:2,   desc:"Robotics, automation, and AI companies globally." },
  { ticker:"IRBO", name:"iShares Robotics and AI Multisector ETF", er:0.47, category:"Artificial Intelligence", tags:["AI","robotics","diversified"],                   aum:"$0.5B", aumNum:0.5, desc:"Broader AI and robotics exposure — more diversified than BOTZ." },
  { ticker:"WTAI", name:"WisdomTree Artificial Intelligence ETF",  er:0.45, category:"Artificial Intelligence", tags:["AI","trending"],                                 aum:"$0.3B", aumNum:0.3, desc:"AI-focused companies with a quality and growth tilt." },
  { ticker:"AIS",  name:"VictoryShares AI & Tech ETF",             er:0.45, category:"Artificial Intelligence", tags:["AI","tech","trending"],                          aum:"$0.6B", aumNum:0.6, desc:"AI and technology companies with factor-based selection." },
  { ticker:"CHAT", name:"Roundhill Generative AI & Tech ETF",      er:0.75, category:"Artificial Intelligence", tags:["AI","generative AI","trending","niche"],         aum:"$0.2B", aumNum:0.2, desc:"Pure-play generative AI companies." },
  { ticker:"THNQ", name:"ROBO Global Artificial Intelligence ETF", er:0.68, category:"Artificial Intelligence", tags:["AI","trending","global"],                        aum:"$0.4B", aumNum:0.4, desc:"Global AI companies spanning hardware, software, and services." },
  // DATA CENTERS & CLOUD
  { ticker:"CLOU", name:"Global X Cloud Computing ETF",            er:0.68, category:"Data Centers & Cloud",    tags:["cloud","saas","trending"],                       aum:"$0.8B", aumNum:0.8, desc:"SaaS and cloud infrastructure companies globally." },
  { ticker:"SKYY", name:"First Trust Cloud Computing ETF",         er:0.60, category:"Data Centers & Cloud",    tags:["cloud","trending"],                              aum:"$2.5B", aumNum:2.5, desc:"Broad cloud computing — one of the oldest cloud ETFs." },
  { ticker:"WCLD", name:"WisdomTree Cloud Computing ETF",          er:0.45, category:"Data Centers & Cloud",    tags:["cloud","saas","trending"],                       aum:"$0.6B", aumNum:0.6, desc:"Pure-play cloud companies screened for revenue growth." },
  { ticker:"PAVE", name:"Global X U.S. Infrastructure Development",er:0.47, category:"Data Centers & Cloud",    tags:["infrastructure","data centers","trending"],      aum:"$7B",   aumNum:7,   desc:"US infrastructure buildout — includes data center construction and power grid." },
  // SPACE & DEFENSE
  { ticker:"UFO",  name:"Procure Space ETF",                       er:0.75, category:"Space & Defense",         tags:["space","trending","niche"],                      aum:"$0.1B", aumNum:0.1, desc:"Companies deriving revenue from space-related activities." },
  { ticker:"ARKX", name:"ARK Space Exploration & Innovation ETF",  er:0.75, category:"Space & Defense",         tags:["space","innovation","trending","niche"],         aum:"$0.2B", aumNum:0.2, desc:"Space exploration and aerospace innovation." },
  { ticker:"XAR",  name:"SPDR S&P Aerospace & Defense ETF",        er:0.35, category:"Space & Defense",         tags:["space","defense","aerospace"],                   aum:"$1.5B", aumNum:1.5, desc:"Aerospace and defense — Lockheed, Raytheon, and space primes." },
  { ticker:"ITA",  name:"iShares US Aerospace & Defense ETF",      er:0.40, category:"Space & Defense",         tags:["space","defense","aerospace","popular"],         aum:"$6B",   aumNum:6,   desc:"US aerospace and defense — Raytheon, Boeing, L3Harris." },
  { ticker:"PPA",  name:"Invesco Aerospace & Defense ETF",         er:0.57, category:"Space & Defense",         tags:["defense","aerospace","space"],                   aum:"$2B",   aumNum:2,   desc:"Equal-weighted aerospace and defense companies." },
  // GLOBAL MARKETS (ex-US country & regional)
  { ticker:"VWO",  name:"Vanguard Emerging Markets Stock ETF",     er:0.08, category:"Global Markets",          tags:["emerging","china","broad","popular"],            aum:"$80B",  aumNum:80,  desc:"Broad emerging markets — China, India, Taiwan, Brazil." },
  { ticker:"IEMG", name:"iShares Core MSCI Emerging Markets",      er:0.09, category:"Global Markets",          tags:["emerging","china","broad"],                     aum:"$72B",  aumNum:72,  desc:"Broad emerging markets coverage from iShares." },
  { ticker:"MCHI", name:"iShares MSCI China ETF",                  er:0.57, category:"Global Markets",          tags:["china","trending"],                              aum:"$4B",   aumNum:4,   desc:"Large and mid-cap Chinese companies — Alibaba, Tencent." },
  { ticker:"KWEB", name:"KraneShares CSI China Internet ETF",      er:0.69, category:"Global Markets",          tags:["china","internet","trending"],                   aum:"$5B",   aumNum:5,   desc:"Chinese internet and e-commerce. High growth, high volatility." },
  { ticker:"INDA", name:"iShares MSCI India ETF",                  er:0.64, category:"Global Markets",          tags:["india","trending","growth"],                    aum:"$9B",   aumNum:9,   desc:"Large and mid-cap Indian companies. Fast-growing economy." },
  { ticker:"EWJ",  name:"iShares MSCI Japan ETF",                  er:0.50, category:"Global Markets",          tags:["japan","developed"],                             aum:"$10B",  aumNum:10,  desc:"Large and mid-cap Japanese stocks. Toyota, Sony, SoftBank." },
  { ticker:"EWT",  name:"iShares MSCI Taiwan ETF",                 er:0.57, category:"Global Markets",          tags:["taiwan","semis"],                                aum:"$5B",   aumNum:5,   desc:"Taiwanese companies — heavily weighted toward TSMC and tech." },
  { ticker:"EWY",  name:"iShares MSCI South Korea ETF",            er:0.57, category:"Global Markets",          tags:["korea","semis"],                                 aum:"$3B",   aumNum:3,   desc:"South Korean companies — Samsung, SK Hynix, Hyundai." },
  { ticker:"EWG",  name:"iShares MSCI Germany ETF",                er:0.50, category:"Global Markets",          tags:["europe","germany"],                              aum:"$1.5B", aumNum:1.5, desc:"German large and mid-cap companies — industrial and export heavy." },
  { ticker:"EWU",  name:"iShares MSCI United Kingdom ETF",         er:0.50, category:"Global Markets",          tags:["europe","uk","dividend"],                       aum:"$2B",   aumNum:2,   desc:"UK large and mid-cap companies. High dividend yields historically." },
  { ticker:"EWQ",  name:"iShares MSCI France ETF",                 er:0.50, category:"Global Markets",          tags:["europe","france"],                               aum:"$0.8B", aumNum:0.8, desc:"French large and mid-cap companies — luxury, energy, banking." },
  { ticker:"EWL",  name:"iShares MSCI Switzerland ETF",            er:0.50, category:"Global Markets",          tags:["europe","switzerland"],                          aum:"$0.7B", aumNum:0.7, desc:"Swiss companies — Nestlé, Novartis, Roche, UBS." },
  { ticker:"EZU",  name:"iShares MSCI Eurozone ETF",               er:0.50, category:"Global Markets",          tags:["europe","eurozone","broad"],                     aum:"$7B",   aumNum:7,   desc:"Eurozone companies — Germany, France, Netherlands, and more." },
  { ticker:"FEMR", name:"Fidelity Enhanced Emerging Markets ETF",  er:0.39, category:"Global Markets",          tags:["emerging","fidelity"],                           aum:"$2B",   aumNum:2,   desc:"Emerging markets with Fidelity factor-enhanced selection." },
  { ticker:"AAXJ", name:"iShares MSCI All Country Asia ex Japan",  er:0.69, category:"Global Markets",          tags:["asia","ex-japan","broad"],                       aum:"$3B",   aumNum:3,   desc:"Asia ex-Japan — China, Korea, India, Taiwan, Hong Kong." },
  { ticker:"EWZ",  name:"iShares MSCI Brazil ETF",                 er:0.57, category:"Global Markets",          tags:["brazil","emerging","latin america"],             aum:"$4B",   aumNum:4,   desc:"Brazilian companies — heavy commodities and financials exposure." },
  { ticker:"EWC",  name:"iShares MSCI Canada ETF",                 er:0.50, category:"Global Markets",          tags:["canada","commodities"],                          aum:"$3B",   aumNum:3,   desc:"Canadian companies — banks, energy, and materials heavy." },
  // INTERNATIONAL DEVELOPED (broad)
  { ticker:"VEA",  name:"Vanguard Developed Markets ETF",          er:0.05, category:"International",           tags:["international","europe","japan","developed","popular"],aum:"$115B",aumNum:115,desc:"Developed markets outside the US — Europe, Japan, Australia, Canada." },
  { ticker:"EFA",  name:"iShares MSCI EAFE ETF",                   er:0.32, category:"International",           tags:["international","europe","japan","developed"],    aum:"$48B",  aumNum:48,  desc:"Europe, Australasia, and Far East developed markets." },
  { ticker:"SCHF", name:"Schwab International Equity ETF",         er:0.06, category:"International",           tags:["international","developed","low cost"],          aum:"$40B",  aumNum:40,  desc:"Developed markets ex-US at a very low cost." },
  { ticker:"FENI", name:"Fidelity Enhanced International ETF",     er:0.39, category:"International",           tags:["international","developed","fidelity"],          aum:"$1.5B", aumNum:1.5, desc:"International developed market stocks with Fidelity factor enhancement." },
  // ENERGY & COMMODITIES
  { ticker:"XLE",  name:"Energy Select Sector SPDR Fund",          er:0.10, category:"Energy & Commodities",    tags:["energy","oil","gas","sector"],                   aum:"$38B",  aumNum:38,  desc:"Large-cap US oil and gas — ExxonMobil, Chevron, ConocoPhillips." },
  { ticker:"VDE",  name:"Vanguard Energy ETF",                     er:0.10, category:"Energy & Commodities",    tags:["energy","oil","gas","sector","low cost"],        aum:"$8B",   aumNum:8,   desc:"Broad US energy sector coverage." },
  { ticker:"URA",  name:"Global X Uranium ETF",                    er:0.69, category:"Energy & Commodities",    tags:["uranium","nuclear","trending","niche"],           aum:"$3B",   aumNum:3,   desc:"Global uranium miners and nuclear fuel. Nuclear energy revival play." },
  { ticker:"NLR",  name:"VanEck Uranium+Nuclear Energy ETF",       er:0.60, category:"Energy & Commodities",    tags:["uranium","nuclear","trending"],                  aum:"$1B",   aumNum:1,   desc:"Uranium miners plus nuclear power plant operators globally." },
  { ticker:"ICLN", name:"iShares Global Clean Energy ETF",         er:0.40, category:"Energy & Commodities",    tags:["clean energy","solar","wind","trending"],        aum:"$2B",   aumNum:2,   desc:"Solar, wind, and clean energy companies globally." },
  { ticker:"TAN",  name:"Invesco Solar ETF",                       er:0.69, category:"Energy & Commodities",    tags:["solar","clean energy","trending","niche"],       aum:"$1B",   aumNum:1,   desc:"Pure-play solar energy companies globally." },
  { ticker:"FAN",  name:"First Trust Global Wind Energy ETF",      er:0.60, category:"Energy & Commodities",    tags:["wind","clean energy","trending"],                aum:"$0.3B", aumNum:0.3, desc:"Global wind energy — turbine makers, wind farm operators." },
  { ticker:"GLD",  name:"SPDR Gold Shares",                        er:0.40, category:"Energy & Commodities",    tags:["gold","commodities","hedge","macro"],            aum:"$70B",  aumNum:70,  desc:"Tracks the price of gold. Used as inflation hedge and safe haven." },
  { ticker:"SLV",  name:"iShares Silver Trust",                    er:0.50, category:"Energy & Commodities",    tags:["silver","commodities","macro"],                  aum:"$12B",  aumNum:12,  desc:"Tracks the price of silver — more volatile than gold." },
  { ticker:"PDBC", name:"Invesco Optimum Yield Diversified Commodity",er:0.59,category:"Energy & Commodities", tags:["commodities","oil","metals","diversified"],      aum:"$4B",   aumNum:4,   desc:"Broad commodity exposure across energy, metals, and agriculture." },
  // HEALTHCARE & BIOTECH
  { ticker:"XLV",  name:"Health Care Select Sector SPDR Fund",     er:0.10, category:"Healthcare & Biotech",    tags:["healthcare","sector","large cap"],               aum:"$38B",  aumNum:38,  desc:"Large-cap US healthcare — J&J, UnitedHealth, Eli Lilly." },
  { ticker:"VHT",  name:"Vanguard Health Care ETF",                er:0.10, category:"Healthcare & Biotech",    tags:["healthcare","broad","sector","low cost"],        aum:"$18B",  aumNum:18,  desc:"Broad US healthcare sector, 400+ holdings." },
  { ticker:"IBB",  name:"iShares Biotechnology ETF",               er:0.45, category:"Healthcare & Biotech",    tags:["biotech","healthcare","trending"],               aum:"$7B",   aumNum:7,   desc:"US biotech and pharmaceutical companies. High growth, high volatility." },
  { ticker:"XBI",  name:"SPDR S&P Biotech ETF",                    er:0.35, category:"Healthcare & Biotech",    tags:["biotech","healthcare","equal weight"],           aum:"$6B",   aumNum:6,   desc:"Equal-weight biotech — smaller companies get more representation." },
  { ticker:"ARKG", name:"ARK Genomic Revolution ETF",              er:0.75, category:"Healthcare & Biotech",    tags:["genomics","biotech","innovation","trending"],    aum:"$1.5B", aumNum:1.5, desc:"Genomics, gene editing, and molecular diagnostics companies." },
  { ticker:"FHLC", name:"Fidelity MSCI Health Care Index ETF",     er:0.08, category:"Healthcare & Biotech",    tags:["healthcare","low cost","fidelity"],              aum:"$3B",   aumNum:3,   desc:"Fidelity's ultra-low-cost healthcare sector ETF." },
  // FINANCIALS
  { ticker:"XLF",  name:"Financial Select Sector SPDR Fund",       er:0.10, category:"Financials",              tags:["financials","banks","sector","popular"],         aum:"$42B",  aumNum:42,  desc:"Large-cap US financials — JPMorgan, Berkshire, Visa, Mastercard." },
  { ticker:"VFH",  name:"Vanguard Financials ETF",                 er:0.10, category:"Financials",              tags:["financials","banks","broad","low cost"],         aum:"$10B",  aumNum:10,  desc:"Broad US financial sector coverage." },
  { ticker:"KBE",  name:"SPDR S&P Bank ETF",                       er:0.35, category:"Financials",              tags:["banks","financials","niche"],                    aum:"$2B",   aumNum:2,   desc:"US commercial banks and thrifts." },
  { ticker:"KBWB", name:"Invesco KBW Bank ETF",                    er:0.35, category:"Financials",              tags:["banks","financials","niche"],                    aum:"$1.5B", aumNum:1.5, desc:"24 leading US banking companies." },
  { ticker:"FINX", name:"Global X FinTech ETF",                    er:0.68, category:"Financials",              tags:["fintech","payments","trending"],                 aum:"$0.4B", aumNum:0.4, desc:"Financial technology — digital payments, lending platforms, insurtech." },
  // REAL ESTATE
  { ticker:"VNQ",  name:"Vanguard Real Estate ETF",                er:0.12, category:"Real Estate",             tags:["reits","real estate","income","popular"],        aum:"$30B",  aumNum:30,  desc:"Broad US REIT exposure — office, retail, residential, industrial." },
  { ticker:"XLRE", name:"Real Estate Select Sector SPDR Fund",     er:0.10, category:"Real Estate",             tags:["reits","real estate","income"],                  aum:"$6B",   aumNum:6,   desc:"US REITs from the S&P 500 — large cap only." },
  { ticker:"SRVR", name:"Pacer Data & Infrastructure Real Estate", er:0.60, category:"Real Estate",             tags:["data centers","infrastructure","reits"],         aum:"$0.4B", aumNum:0.4, desc:"Data center and communication tower REITs — Equinix, American Tower." },
  { ticker:"HOMZ", name:"Hoya Capital Housing ETF",                er:0.30, category:"Real Estate",             tags:["housing","real estate","niche"],                 aum:"$0.2B", aumNum:0.2, desc:"Residential housing — REITs, homebuilders, home improvement." },
  // LOW VOLATILITY
  { ticker:"USMV", name:"iShares MSCI USA Min Vol Factor ETF",     er:0.15, category:"Low Volatility",          tags:["low vol","defensive","stability","popular"],     aum:"$25B",  aumNum:25,  desc:"US stocks historically less volatile than the market." },
  { ticker:"SPLV", name:"Invesco S&P 500 Low Volatility ETF",      er:0.25, category:"Low Volatility",          tags:["low vol","defensive","s&p 500"],                 aum:"$8B",   aumNum:8,   desc:"100 S&P 500 stocks with lowest realized volatility." },
  { ticker:"XLU",  name:"Utilities Select Sector SPDR Fund",       er:0.10, category:"Low Volatility",          tags:["utilities","defensive","income"],                aum:"$14B",  aumNum:14,  desc:"US utilities — low beta, steady dividends, recession-resistant." },
  { ticker:"XLP",  name:"Consumer Staples Select Sector SPDR",     er:0.10, category:"Low Volatility",          tags:["staples","defensive","income"],                  aum:"$15B",  aumNum:15,  desc:"Consumer staples — food, household goods. Historically defensive." },
  { ticker:"EFAV", name:"iShares MSCI EAFE Min Vol Factor ETF",    er:0.20, category:"Low Volatility",          tags:["low vol","international","defensive"],           aum:"$10B",  aumNum:10,  desc:"International developed market stocks with lower volatility." },
  // FIXED INCOME
  { ticker:"AGG",  name:"iShares Core US Aggregate Bond ETF",      er:0.03, category:"Fixed Income",            tags:["bonds","fixed income","core","low cost","popular"],aum:"$115B",aumNum:115,desc:"Benchmark US bond ETF — Treasuries, MBS, investment-grade corps." },
  { ticker:"BND",  name:"Vanguard Total Bond Market ETF",          er:0.03, category:"Fixed Income",            tags:["bonds","fixed income","core","low cost"],        aum:"$110B", aumNum:110, desc:"Total US bond market at Vanguard's rock-bottom cost." },
  { ticker:"TLT",  name:"iShares 20+ Year Treasury Bond ETF",      er:0.15, category:"Fixed Income",            tags:["bonds","treasuries","duration","macro"],         aum:"$50B",  aumNum:50,  desc:"Long-duration Treasuries. Moves inversely with interest rates." },
  { ticker:"SHY",  name:"iShares 1-3 Year Treasury Bond ETF",      er:0.15, category:"Fixed Income",            tags:["bonds","treasuries","short duration"],           aum:"$24B",  aumNum:24,  desc:"Short-term Treasuries — lower interest rate risk." },
  { ticker:"HYG",  name:"iShares iBoxx High Yield Corporate Bond", er:0.48, category:"Fixed Income",            tags:["bonds","high yield","income"],                   aum:"$14B",  aumNum:14,  desc:"High-yield corporate bonds. Higher income, higher credit risk." },
  { ticker:"TIPS", name:"iShares TIPS Bond ETF",                   er:0.19, category:"Fixed Income",            tags:["bonds","inflation","treasuries"],                aum:"$18B",  aumNum:18,  desc:"Treasury Inflation-Protected Securities — adjust for inflation." },
  { ticker:"SGOV", name:"iShares 0-3 Month Treasury Bond ETF",     er:0.09, category:"Fixed Income",            tags:["bonds","cash","short term","safe"],              aum:"$30B",  aumNum:30,  desc:"Ultra-short Treasury bills — essentially a cash equivalent with yield." },
  // INNOVATION / DISRUPTIVE
  { ticker:"ARKK", name:"ARK Innovation ETF",                      er:0.75, category:"Innovation",              tags:["innovation","disruptive","high risk","trending"], aum:"$7B",   aumNum:7,   desc:"Disruptive innovation — Tesla, Coinbase, CRISPR. High conviction, high volatility." },
  { ticker:"ARKW", name:"ARK Next Generation Internet ETF",        er:0.75, category:"Innovation",              tags:["internet","innovation","trending"],               aum:"$1.5B", aumNum:1.5, desc:"Next-gen internet — cloud, AI, blockchain, streaming." },
  { ticker:"ARKF", name:"ARK Fintech Innovation ETF",              er:0.75, category:"Innovation",              tags:["fintech","innovation","trending"],                aum:"$0.8B", aumNum:0.8, desc:"Financial technology — mobile payments, digital wallets, blockchain." },
  { ticker:"DRIV", name:"Global X Autonomous & EV ETF",            er:0.68, category:"Innovation",              tags:["ev","autonomous","trending","niche"],             aum:"$0.5B", aumNum:0.5, desc:"Electric vehicles and autonomous driving companies globally." },
  { ticker:"LIT",  name:"Global X Lithium & Battery Tech ETF",     er:0.75, category:"Innovation",              tags:["lithium","ev","batteries","trending"],            aum:"$1.2B", aumNum:1.2, desc:"Lithium miners and battery technology — EV supply chain." },
  { ticker:"CTEC", name:"Global X CleanTech ETF",                  er:0.50, category:"Innovation",              tags:["cleantech","ev","innovation","trending"],         aum:"$0.3B", aumNum:0.3, desc:"Companies enabling the clean technology transition globally." },
  // CYBERSECURITY
  { ticker:"CIBR", name:"First Trust NASDAQ Cybersecurity ETF",    er:0.60, category:"Cybersecurity",           tags:["cybersecurity","tech","trending","popular"],     aum:"$6B",   aumNum:6,   desc:"Companies providing cybersecurity hardware, software, and services." },
  { ticker:"HACK", name:"ETFMG Prime Cyber Security ETF",          er:0.60, category:"Cybersecurity",           tags:["cybersecurity","tech","trending"],                aum:"$1.5B", aumNum:1.5, desc:"Global cybersecurity — CrowdStrike, Palo Alto, Fortinet." },
  { ticker:"BUG",  name:"Global X Cybersecurity ETF",              er:0.50, category:"Cybersecurity",           tags:["cybersecurity","tech","trending"],                aum:"$0.5B", aumNum:0.5, desc:"Pure-play cybersecurity companies — focused and concentrated." },
  { ticker:"IHAK", name:"iShares Cybersecurity and Tech ETF",      er:0.47, category:"Cybersecurity",           tags:["cybersecurity","tech","trending"],                aum:"$0.8B", aumNum:0.8, desc:"Global cybersecurity and technology companies from iShares." },
  // NEW & TRENDING
  { ticker:"NVDL", name:"GraniteShares 2x Long NVDA Daily ETF",    er:1.15, category:"New & Trending",          tags:["leveraged","nvidia","AI","high risk","trending"], aum:"$5B",   aumNum:5,   desc:"2x leveraged NVDA exposure. Extremely high risk — not for buy-and-hold." },
  { ticker:"MSFO", name:"YieldMax MSFT Option Income Strategy",    er:0.99, category:"New & Trending",          tags:["covered calls","income","microsoft","new"],       aum:"$0.5B", aumNum:0.5, desc:"Monthly income from Microsoft via covered call strategy." },
  { ticker:"BITO", name:"ProShares Bitcoin Strategy ETF",          er:0.95, category:"New & Trending",          tags:["bitcoin","crypto","trending","new"],              aum:"$2B",   aumNum:2,   desc:"Bitcoin futures exposure — first US Bitcoin ETF. Not spot Bitcoin." },
  { ticker:"IBIT", name:"iShares Bitcoin Trust ETF",               er:0.25, category:"New & Trending",          tags:["bitcoin","crypto","spot","trending","new"],      aum:"$40B",  aumNum:40,  desc:"Spot Bitcoin ETF from BlackRock. Direct Bitcoin exposure in a brokerage account." },
  { ticker:"FBTC", name:"Fidelity Wise Origin Bitcoin Fund",       er:0.25, category:"New & Trending",          tags:["bitcoin","crypto","spot","trending","new"],      aum:"$20B",  aumNum:20,  desc:"Fidelity's spot Bitcoin ETF — direct Bitcoin exposure." },
  { ticker:"ETHA", name:"iShares Ethereum Trust ETF",              er:0.25, category:"New & Trending",          tags:["ethereum","crypto","spot","trending","new"],     aum:"$3B",   aumNum:3,   desc:"Spot Ethereum ETF from BlackRock. Direct ETH exposure." },
  { ticker:"GRID", name:"First Trust NASDAQ Clean Edge Smart Grid", er:0.58, category:"New & Trending",          tags:["infrastructure","power grid","AI","trending"],   aum:"$0.8B", aumNum:0.8, desc:"Smart grid and power infrastructure — critical for AI data center buildout." },
  { ticker:"PFUT", name:"Putnam Sustainable Future ETF",           er:0.64, category:"New & Trending",          tags:["esg","sustainable","new","trending"],             aum:"$0.2B", aumNum:0.2, desc:"Companies aligned with sustainable development goals." },
]

const UNIQUE_ETFS = ETF_DATABASE.filter((etf, index, self) =>
  index === self.findIndex(e => e.ticker === etf.ticker)
)

const TRENDING = [
  { label: "🤖 AI",               filter: "Artificial Intelligence" },
  { label: "💾 Semiconductors",    filter: "Semiconductors" },
  { label: "🏢 Data Centers",      filter: "Data Centers & Cloud" },
  { label: "🚀 Space & Defense",   filter: "Space & Defense" },
  { label: "🔒 Cybersecurity",     filter: "Cybersecurity" },
  { label: "⚛️ Uranium",           filter: "Energy & Commodities", tag: "uranium" },
  { label: "💰 Dividend Income",   filter: "Dividend & Income" },
  { label: "🔋 Clean Energy",      filter: "Energy & Commodities", tag: "clean energy" },
  { label: "₿ Crypto ETFs",       filter: "New & Trending", tag: "crypto" },
  { label: "🧬 Biotech",           filter: "Healthcare & Biotech" },
  { label: "🇨🇳 China",            filter: "Global Markets", tag: "china" },
  { label: "🇯🇵 Japan",            filter: "Global Markets", tag: "japan" },
  { label: "🇰🇷 Korea",            filter: "Global Markets", tag: "korea" },
  { label: "🌍 Europe",            filter: "Global Markets", tag: "europe" },
  { label: "🌏 Emerging Markets",  filter: "Global Markets", tag: "emerging" },
  { label: "💡 Innovation",        filter: "Innovation" },
]

const ALL_CATEGORIES = [...new Set(UNIQUE_ETFS.map(e => e.category))].sort()

const SORT_OPTIONS = [
  { value: "aum_desc",   label: "AUM: Largest first" },
  { value: "aum_asc",    label: "AUM: Smallest first" },
  { value: "er_asc",     label: "Expense Ratio: Lowest first" },
  { value: "er_desc",    label: "Expense Ratio: Highest first" },
  { value: "ticker_asc", label: "Ticker A→Z" },
  { value: "popular",    label: "Most Popular" },
]

const ER_FILTERS = [
  { label: "All",          min: 0,   max: 99 },
  { label: "Ultra-low ≤0.10%", min: 0, max: 0.10 },
  { label: "Low ≤0.35%",   min: 0,   max: 0.35 },
  { label: "High >0.35%",  min: 0.35, max: 99 },
]

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
            <ERBadge er={etf.er} />
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{etf.aum} AUM</span>
          </div>
          <p className="text-slate-200 text-sm font-medium leading-snug">{etf.name}</p>
          {expanded && (
            <>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">{etf.desc}</p>
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
  const [search, setSearch]               = useState('')
  const [activeTrend, setActiveTrend]     = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortBy, setSortBy]               = useState('aum_desc')
  const [erFilter, setErFilter]           = useState(0)   // index into ER_FILTERS
  const [expandedTicker, setExpandedTicker] = useState(null)
  const [showFilters, setShowFilters]     = useState(false)

  const filtered = useMemo(() => {
    let results = UNIQUE_ETFS

    // Trend filter
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

    // ER filter
    const ef = ER_FILTERS[erFilter]
    results = results.filter(e => e.er > ef.min - 0.0001 && e.er <= ef.max)

    // Sort
    results = [...results]
    switch (sortBy) {
      case 'aum_desc':    results.sort((a, b) => b.aumNum - a.aumNum); break
      case 'aum_asc':     results.sort((a, b) => a.aumNum - b.aumNum); break
      case 'er_asc':      results.sort((a, b) => a.er - b.er); break
      case 'er_desc':     results.sort((a, b) => b.er - a.er); break
      case 'ticker_asc':  results.sort((a, b) => a.ticker.localeCompare(b.ticker)); break
      case 'popular':     results.sort((a, b) => (b.tags.includes('popular') ? 1 : 0) - (a.tags.includes('popular') ? 1 : 0)); break
    }

    return results
  }, [search, activeCategory, activeTrend, sortBy, erFilter])

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

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">ETF Explorer</h1>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Browse {UNIQUE_ETFS.length}+ ETFs by theme, region, or category. Click any card to expand details.
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

      {/* ── Trending themes strip ── */}
      <div className="mb-5">
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
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
              )}
            >
              {t.label}
            </button>
          ))}
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
            <option value="All">All Categories ({UNIQUE_ETFS.length})</option>
            {ALL_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat} ({UNIQUE_ETFS.filter(e => e.category === cat).length})
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
        ETF Explorer is for educational purposes only. Expense ratios and AUM are approximate. Nothing here constitutes investment advice.
      </p>
    </div>
  )
}
