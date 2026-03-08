import { useState, useEffect, useRef, useCallback } from 'react'
import { useDailyEntry } from '../hooks/useDailyEntry'
import { useWeekCompletion } from '../hooks/useWeekCompletion'
import { getTodayDateString } from '../utils/dailyEntry'
import { DateQuoteDiya } from '../components/DateQuoteDiya'
import { HabitCards } from '../components/HabitCards'
import { NightlyJournal } from '../components/NightlyJournal'
import { ClosingSection } from '../components/ClosingSection'
import { ClosingScreen } from '../components/ClosingScreen'
import { LockedView } from '../components/LockedView'
import { WeekDots } from '../components/WeekDots'
import './HomePage.css'

const JOURNALING_MIN_WORDS = 20

function countWords(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function HomePage() {
  const { entry, updateEntry, loading } = useDailyEntry()
  const today = getTodayDateString()
  const weekCompletion = useWeekCompletion(today)

  const [phase, setPhase] = useState('active') // 'active' | 'fading' | 'closing' | 'locked'

  const updateHabit = useCallback(
    (key, data) => {
      updateEntry({ habits: { [key]: data } })
    },
    [updateEntry]
  )

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


  const handleComplete = useCallback(() => {
    updateEntry({ sessionComplete: true, divaExtinguished: true })
    setPhase('fading')
    setTimeout(() => setPhase('closing'), 1500)
    setTimeout(() => setPhase('locked'), 4500)
  }, [updateEntry])

  if (loading || !entry) {
    return (
      <div className="home-page home-page--loading">
        <span className="home-page__loader">…</span>
      </div>
    )
  }

  const locked = entry.sessionComplete && entry.divaExtinguished
  const showClosingScreen = phase === 'closing'

  if (locked && phase === 'locked') {
    return (
      <div className="home-page">
        <div className="home-page__glow home-page__glow--dim" aria-hidden />
        <div className="home-page__content">
          <LockedView dateStr={entry.date} closingWord={entry.closingWord} />
        </div>
      </div>
    )
  }

  return (
    <>
      {showClosingScreen && <ClosingScreen />}

      <div
        className={`home-page ${phase === 'fading' ? 'home-page--fading' : ''}`}
      >
        <div
          className={`home-page__glow ${phase === 'fading' ? 'home-page__glow--dim' : ''}`}
          aria-hidden
        />
        <div className="home-page__content">
          <DateQuoteDiya
            dateStr={entry.date}
            sessionComplete={entry.sessionComplete}
          />
          <HabitCards
            habits={entry.habits}
            updateHabit={updateHabit}
          />
          <NightlyJournal
            prompt={entry.journal?.prompt ?? ''}
            entry={entry.journal?.entry ?? ''}
            wordCount={entry.journal?.wordCount ?? 0}
            onChange={updateJournalEntry}
          />
          <ClosingSection
            mood={entry.mood}
            closingWord={entry.closingWord}
            onMoodChange={(mood) => updateEntry({ mood })}
            onClosingWordChange={(closingWord) => updateEntry({ closingWord })}
            onComplete={handleComplete}
          />
          <WeekDots
            weekCompletion={{ ...weekCompletion, [today]: weekCompletion[today] ?? entry?.sessionComplete }}
            today={today}
          />
        </div>
      </div>
    </>
  )
}
