export default function FolioLogo({ size = 40, showWordmark = true, showTagline = false }) {
  const r = size / 2
  // All coordinates scale relative to size
  const s = size / 92  // base design is 92px

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: showWordmark ? 10 : 0, position: 'relative' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 92 92"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Circle background */}
        <circle cx="46" cy="46" r="46" fill="#0f1e3c"/>

        {/* F: 3 horizontal bars, left side, decreasing width */}
        <rect x="10" y="20" width="34" height="11" rx="3" fill="#3b82f6"/>
        <rect x="10" y="37" width="24" height="11" rx="3" fill="#60a5fa"/>
        <rect x="10" y="54" width="15" height="11" rx="3" fill="#93c5fd"/>

        {/* O: pie donut, right side */}
        <path d="M50,46 L50,18 A28,28 0 0,1 78,46 Z" fill="#2563eb"/>
        <path d="M50,46 L78,46 A28,28 0 0,1 60,72 Z" fill="#60a5fa" opacity="0.9"/>
        <path d="M50,46 L60,72 A28,28 0 0,1 50,18 Z" fill="#1d4ed8" opacity="0.85"/>
        {/* Donut hole */}
        <circle cx="50" cy="46" r="11" fill="#0f1e3c"/>

        {/* Subtle divider */}
        <line x1="46" y1="10" x2="46" y2="82" stroke="white" strokeWidth="0.8" opacity="0.12"/>

        {/* Amber dot at top-right of O — arc starts here */}
        <circle cx="75" cy="20" r="5" fill="#f59e0b"/>
      </svg>

      {showWordmark && (
        <div style={{ position: 'relative' }}>
          {/* Amber arc from O dot over to i dot — drawn in absolute positioned SVG */}
          <svg
            style={{ position: 'absolute', top: -18, left: -8, pointerEvents: 'none', overflow: 'visible' }}
            width="120"
            height="30"
            viewBox="0 0 120 30"
          >
            {/* Arc from left (where O dot exits circle) curving to i dot position */}
            <path
              d="M2,22 Q48,-4 88,18"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* i dot at end of arc */}
            <circle cx="88" cy="18" r="4.5" fill="#f59e0b"/>
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: size * 0.52,
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}>
              folio
            </span>
            {showTagline && (
              <span style={{
                fontSize: size * 0.16,
                fontWeight: 500,
                color: '#60a5fa',
                letterSpacing: '0.18em',
                marginTop: 2,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                PORTFOLIO ANALYSIS
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
