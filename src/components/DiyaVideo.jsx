import { useRef, useEffect, useState } from 'react'
import diyaVideoSrc from '../assets/diya.mp4'
import { useIsMobile } from '../hooks/useIsMobile'
import './DiyaVideo.css'

/**
 * Seamless diya video: radial mask + mix-blend-mode: screen so the flame
 * floats in the void with no rectangular edges. Optional ambient glow.
 * Tooltip "आपो दीप भव" on hover (desktop only).
 */
export function DiyaVideo({
  src = diyaVideoSrc,
  width = 160,
  height = 160,
  showGlow = false,
  fixed = false,
  extinguishing = false,
  className = '',
}) {
  const videoRef = useRef(null)
  const isMobile = useIsMobile()
  const [hover, setHover] = useState(false)
  const [tooltipExiting, setTooltipExiting] = useState(false)
  const exitTimeoutRef = useRef(null)
  const showTooltip = !isMobile && hover && !extinguishing
  const showTooltipEl = showTooltip || tooltipExiting

  useEffect(() => {
    if (showTooltip) setTooltipExiting(false)
  }, [showTooltip])

  const handleMouseLeave = () => {
    setHover(false)
    if (showTooltip) {
      setTooltipExiting(true)
      exitTimeoutRef.current = setTimeout(() => setTooltipExiting(false), 300)
    }
  }

  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (extinguishing) {
      el.pause()
    } else {
      el.play().catch(() => {})
    }
  }, [extinguishing])

  return (
    <div
      className={`diya-video ${showGlow ? 'diya-video--glow' : ''} ${fixed ? 'diya-video--fixed' : ''} ${extinguishing ? 'diya-video--extinguishing' : ''} ${!isMobile ? 'diya-video--tooltip-enabled' : ''} ${className}`.trim()}
      style={{ '--diya-width': `${width}px`, '--diya-height': `${height}px` }}
      aria-hidden
      onMouseEnter={() => setHover(true)}
      onMouseLeave={handleMouseLeave}
    >
      {showTooltipEl && (
        <div className={`diya-video__tooltip ${tooltipExiting ? 'diya-video__tooltip--out' : ''}`} role="tooltip">
          <span className="diya-video__tooltip-main">आपो दीप भव</span>
          <span className="diya-video__tooltip-sub">be a light unto yourself</span>
        </div>
      )}
      <video
        ref={videoRef}
        className="diya-video__video"
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        width={width}
        height={height}
      />
    </div>
  )
}
