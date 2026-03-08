import './BrowserWall.css'

function UnlitDiyaIcon({ size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2v4M12 18v4M12 6c-2 1-3 3-3 5a3 3 0 0 0 6 0c0-2-1-4-3-5z" />
      <ellipse cx="12" cy="20" rx="3" ry="1" fill="currentColor" opacity="0.4" />
    </svg>
  )
}

export function BrowserWall() {
  return (
    <div className="browser-wall">
      <div className="browser-wall__icon">
        <UnlitDiyaIcon size={48} />
      </div>
      <h1 className="browser-wall__title">Kaizen requires Chrome</h1>
      <p className="browser-wall__body">
        The way this app keeps your memory —
        entirely on your device, under your control —
        requires a feature that only Chrome currently supports.
        <br /><br />
        This is intentional. Your practice stays with you,
        not on any server.
        <br /><br />
        Open this page in Chrome to begin.
      </p>
    </div>
  )
}
