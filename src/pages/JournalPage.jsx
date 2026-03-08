import { useRef, useEffect, useCallback } from 'react'
import { useDailyEntry } from '../hooks/useDailyEntry'
import { useIsMobile } from '../hooks/useIsMobile'
import { DiyaVideo } from '../components/DiyaVideo'
import './JournalPage.css'

const JOURNALING_MIN_WORDS = 20

function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function JournalPage() {
  const isMobile = useIsMobile()
  const { entry, updateEntry, loading } = useDailyEntry()
  const textareaRef = useRef(null)

  const updateJournalEntry = useCallback(
    (text) => {
      const wordCount = countWords(text)
      updateEntry({
        journal: {
          entry: text,
          wordCount,
          timeSpent: entry?.journal?.timeSpent ?? 0,
        },
      })
      if (wordCount >= JOURNALING_MIN_WORDS && !entry?.habits?.journaling?.logged) {
        updateEntry({ habits: { journaling: { logged: true } } })
      }
    },
    [updateEntry, entry?.habits?.journaling?.logged]
  )

  useEffect(() => {
    if (!textareaRef.current) return
    const el = textareaRef.current
    el.style.height = 'auto'
    el.style.height = `${Math.max(200, el.scrollHeight)}px`
  }, [entry?.journal?.entry])

  if (loading || !entry) {
    return (
      <div className="journal-page journal-page--loading">
        <span className="journal-page__loader">…</span>
      </div>
    )
  }

  const prompt = entry.journal?.prompt ?? ''
  const journalEntry = entry.journal?.entry ?? ''
  const wordCount = entry.journal?.wordCount ?? 0

  return (
    <div className="journal-page">
      {/* Light cast: warm wash from where the diya sits, over the writing area */}
      <div className="journal-page__light-cast" aria-hidden />

      {/* Fixed diya on the right — hidden on mobile */}
      {!isMobile && (
        <DiyaVideo
          width={280}
          height={280}
          showGlow
          fixed
          className="journal-page__diya"
        />
      )}

      <div className="journal-page__writing">
        <h1 className="journal-page__heading">What is true tonight?</h1>
        <p className="journal-page__prompt">{prompt}</p>
        <textarea
          ref={textareaRef}
          className="journal-page__textarea"
          placeholder="Begin when you are ready..."
          value={journalEntry}
          onChange={(e) => updateJournalEntry(e.target.value)}
          rows={6}
        />
        {wordCount > 0 && (
          <p className="journal-page__wordcount">{wordCount} words</p>
        )}
      </div>
    </div>
  )
}
