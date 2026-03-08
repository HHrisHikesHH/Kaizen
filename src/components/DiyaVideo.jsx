import { useRef, useEffect } from 'react'
import diyaVideoSrc from '../assets/diya.mp4'
import './DiyaVideo.css'

/**
 * Seamless diya video: radial mask + mix-blend-mode: screen so the flame
 * floats in the void with no rectangular edges. Optional ambient glow.
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
      className={`diya-video ${showGlow ? 'diya-video--glow' : ''} ${fixed ? 'diya-video--fixed' : ''} ${extinguishing ? 'diya-video--extinguishing' : ''} ${className}`.trim()}
      style={{ '--diya-width': `${width}px`, '--diya-height': `${height}px` }}
      aria-hidden
    >
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
