export default function FolioLogo({ size = 40, showWordmark = true, showTagline = false }) {
  // All coordinates scale relative to size
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
        {/* Ring — stroke only, no fill, blends with whatever surface it sits on */}
        <circle cx="46" cy="46" r="38" stroke="#3b82f6" strokeWidth="4"/>

        {/* Data rows, upper-left */}
        <rect x="24" y="29" width="19" height="4.5" rx="2.25" fill="#60a5fa"/>
        <rect x="24" y="38" width="14" height="4.5" rx="2.25" fill="#60a5fa" opacity="0.75"/>
        <rect x="24" y="47" width="9"  height="4.5" rx="2.25" fill="#60a5fa" opacity="0.55"/>

        {/* Ascending bars, lower-right */}
        <rect x="47" y="58" width="6" height="10" rx="1.5" fill="#3b82f6"/>
        <rect x="56" y="52" width="6" height="16" rx="1.5" fill="#3b82f6"/>
        <rect x="65" y="43" width="6" height="25" rx="1.5" fill="#3b82f6"/>

        {/* Trend line + end dot */}
        <path d="M47,60 L59,49 L71,35" stroke="#93c5fd" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="71" cy="35" r="4" fill="#93c5fd"/>
      </svg>

      {showWordmark && (
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              display: 'flex',
              alignItems: 'flex-start',
              fontSize: size * 0.52,
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}>
              folio
              <span style={{
                display: 'inline-block',
                width: size * 0.09,
                height: size * 0.09,
                borderRadius: '50%',
                background: '#3b82f6',
                marginLeft: size * 0.04,
                marginTop: size * 0.02,
              }} />
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
