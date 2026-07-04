import DonutChart from '../shared/DonutChart'

const SECTOR_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6','#a78bfa','#fb7185',
]
const ASSET_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4']
const HOLDINGS_COLORS = [
  '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316',
  '#84cc16','#ec4899','#14b8a6','#a78bfa','#fb7185','#fbbf24','#34d399',
  '#60a5fa','#f472b6','#a3e635','#38bdf8','#fb923c','#c084fc',
]

export default function AllocationCharts({ sectors, assetClasses, holdings }) {
  // Build top holdings chart data — top 12 by weight, rest as "Other"
  const topN = 12
  const sortedHoldings = [...(holdings || [])].sort((a, b) => b.weight_pct - a.weight_pct)
  const topHoldings = sortedHoldings.slice(0, topN)
  const otherWeight = sortedHoldings.slice(topN).reduce((sum, h) => sum + (h.weight_pct || 0), 0)
  const otherValue = sortedHoldings.slice(topN).reduce((sum, h) => sum + (h.market_value || 0), 0)

  const holdingsChartData = topHoldings.map(h => ({
    ticker: h.ticker,
    weight_pct: parseFloat((h.weight_pct || 0).toFixed(1)),
    market_value: h.market_value,
  }))
  if (otherWeight > 0.1) {
    holdingsChartData.push({ ticker: 'Other', weight_pct: parseFloat(otherWeight.toFixed(1)), market_value: otherValue })
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Sector + Asset Class */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DonutChart
          data={sectors || []}
          colors={SECTOR_COLORS}
          title="Sector Allocation"
          nameKey="sector"
          subtitle="Hover slices for details"
        />
        <DonutChart
          data={assetClasses || []}
          colors={ASSET_COLORS}
          title="Asset Class Allocation"
          nameKey="asset_class"
          subtitle="Hover slices for details"
        />
      </div>

      {/* Row 2: Individual Holdings */}
      {holdingsChartData.length > 0 && (
        <DonutChart
          data={holdingsChartData}
          colors={HOLDINGS_COLORS}
          title="Holdings Breakdown"
          nameKey="ticker"
          subtitle={`Top ${Math.min(topN, holdingsChartData.length)} positions by weight · Hover for details`}
        />
      )}
    </div>
  )
}
