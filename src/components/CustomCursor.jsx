import { useState, useEffect, useRef } from 'react'

export function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [variant, setVariant] = useState('default')
  const [visible, setVisible] = useState(false)
  const rafRef = useRef(null)
  const lastRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const isTouch = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    )
    if (isTouch) return

    document.body.classList.add('cursor-active')

    const handleMove = (e) => {
      lastRef.current = { x: e.clientX, y: e.clientY }
      if (!visible) setVisible(true)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setPos({ x: lastRef.current.x, y: lastRef.current.y })
        rafRef.current = null
      })
    }

    const handleOver = (e) => {
      const target = e.target?.closest?.('button, a, [role="button"], input, textarea, [contenteditable="true"]')
      if (target) {
        if (target.matches?.('input, textarea, [contenteditable="true"]')) {
          setVariant('input')
        } else {
          setVariant('hover')
        }
      } else {
        setVariant('default')
      }
    }

    const handleLeave = () => setVisible(false)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseover', handleOver)
    document.documentElement.addEventListener('mouseleave', handleLeave)

    return () => {
      document.body.classList.remove('cursor-active')
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseover', handleOver)
      document.documentElement.removeEventListener('mouseleave', handleLeave)
    }
  }, [visible])

  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null

  const size = variant === 'input' ? { width: 4, height: 20 } : variant === 'hover' ? { width: 16, height: 16 } : { width: 8, height: 8 }
  const isPill = variant === 'input'

  return (
    <div
      className="custom-cursor"
      aria-hidden
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        opacity: visible ? (variant === 'hover' ? 0.5 : 0.7) : 0,
        borderRadius: isPill ? 2 : '50%',
      }}
    />
  )
}
