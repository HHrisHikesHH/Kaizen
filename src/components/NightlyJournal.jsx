import { useRef, useEffect } from 'react'
import './NightlyJournal.css'

export function NightlyJournal({ prompt, entry, wordCount, onChange }) {
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!textareaRef.current) return
    const el = textareaRef.current
    el.style.height = 'auto'
    el.style.height = `${Math.max(200, el.scrollHeight)}px`
  }, [entry])

  return (
    <section className="nightly-journal">
      <h2 className="nightly-journal__heading">What is true tonight?</h2>
      <p className="nightly-journal__prompt">{prompt}</p>
      <textarea
        ref={textareaRef}
        className="nightly-journal__textarea"
        placeholder="Begin when you are ready..."
        value={entry}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
      />
      {wordCount > 0 && (
        <p className="nightly-journal__wordcount">{wordCount} words</p>
      )}
    </section>
  )
}
