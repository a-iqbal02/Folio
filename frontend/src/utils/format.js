export const fmt = {
  currency: (v) =>
    v == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v),
  pct: (v, dec = 1) => (v == null ? '—' : `${Number(v).toFixed(dec)}%`),
  num: (v, dec = 2) => (v == null ? '—' : Number(v).toFixed(dec)),
  gain: (v) => {
    if (v == null) return '—'
    const prefix = v >= 0 ? '+' : ''
    return `${prefix}${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)}`
  },
  gainPct: (v) => {
    if (v == null) return '—'
    return `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`
  },
}

export function severityColor(severity) {
  return { high: 'red', medium: 'orange', low: 'yellow' }[severity] || 'gray'
}

export function scoreColor(score) {
  if (score >= 70) return '#10b981'
  if (score >= 45) return '#f59e0b'
  return '#ef4444'
}
