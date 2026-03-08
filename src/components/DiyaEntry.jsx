import { useRef, useState, useEffect } from 'react'
import diyaVideo from '../assets/diya.mp4'
import './DiyaEntry.css'

const FADE_IN_DELAY_MS = 2000
const MAX_VIDEO_MS = 6000
const FADE_OUT_MS = 1500

export function DiyaEntry({ onFinish }) {
  const videoRef = useRef(null)
  const [titleVisible, setTitleVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    let done = false
    const t1 = setTimeout(() => setTitleVisible(true), FADE_IN_DELAY_MS)

    function startFadeOut() {
      if (done) return
      done = true
      setFadeOut(true)
      setTimeout(() => onFinish(), FADE_OUT_MS)
    }

    const v = videoRef.current
    if (v) v.addEventListener('ended', startFadeOut)
    const t2 = setTimeout(startFadeOut, MAX_VIDEO_MS)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (v) v.removeEventListener('ended', startFadeOut)
    }
  }, [onFinish])

  return (
    <div className={`diya-entry ${fadeOut ? 'diya-entry--fade-out' : ''}`}>
      <video
        ref={videoRef}
        className="diya-entry__video"
        src={diyaVideo}
        muted
        playsInline
        autoPlay
        width={320}
      />
      <span className={`diya-entry__title ${titleVisible ? 'diya-entry__title--visible' : ''}`}>
        Kaizen
      </span>
    </div>
  )
}
