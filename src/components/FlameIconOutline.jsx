/** Unlit diya outline for non-Sunday state */
export function FlameIconOutline({ size = 48, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4M12 18v4M12 6c-2 1-3 3-3 5a3 3 0 0 0 6 0c0-2-1-4-3-5z" />
      <path d="M12 11v2M10 10l1 1M14 10l-1 1M12 14l-1.5 2M12 14l1.5 2" />
      <ellipse cx="12" cy="20" rx="3" ry="1" />
    </svg>
  )
}
