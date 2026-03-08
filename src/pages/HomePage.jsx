import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useDailyEntry } from '../hooks/useDailyEntry'
import { useWeekCompletion } from '../hooks/useWeekCompletion'
import { getTodayDateString } from '../utils/dailyEntry'
import { DateQuoteDiya } from '../components/DateQuoteDiya'
import { DiyaVideo } from '../components/DiyaVideo'
import { HabitCards } from '../components/HabitCards'
import { NightlyJournal } from '../components/NightlyJournal'
import { ClosingSection } from '../components/ClosingSection'
import { ClosingScreen } from '../components/ClosingScreen'
import { LockedView } from '../components/LockedView'
import { WeekDots } from '../components/WeekDots'
import './HomePage.css'

const JOURNALING_MIN_WORDS = 20
const DIYA_SCROLL_PIN_THRESHOLD = 180

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
  const diyaSlotRef = useRef(null)

  const [phase, setPhase] = useState('active') // 'active' | 'fading' | 'closing' | 'locked'
  const [diyaPosition, setDiyaPosition] = useState(() => ({ pinned: false, left: null, top: null }))

  const updateDiyaPosition = useCallback(() => {
    const scrollY = window.scrollY
    if (scrollY > DIYA_SCROLL_PIN_THRESHOLD) {
      setDiyaPosition((prev) => (prev.pinned ? prev : { pinned: true, left: null, top: null }))
    } else {
      const slot = diyaSlotRef.current
      if (slot) {
        const rect = slot.getBoundingClientRect()
        setDiyaPosition({ pinned: false, left: rect.left, top: rect.top })
      }
    }
  }, [])

  useLayoutEffect(() => {
    updateDiyaPosition()
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(updateDiyaPosition)
    })
    return () => cancelAnimationFrame(id)
  }, [updateDiyaPosition])

  useEffect(() => {
    window.addEventListener('scroll', updateDiyaPosition, { passive: true })
    window.addEventListener('resize', updateDiyaPosition)
    return () => {
      window.removeEventListener('scroll', updateDiyaPosition)
      window.removeEventListener('resize', updateDiyaPosition)
    }
  }, [updateDiyaPosition])

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
          {/* Single diya: at top sits beside Kaizen; when you scroll down it moves to right 3/4 height */}
          {diyaPosition.left !== null || diyaPosition.pinned ? (
          <div
            className="home-page__diya-float"
            style={
              diyaPosition.pinned
                ? { right: '2rem', bottom: '25%', left: 'auto', top: 'auto' }
                : { left: diyaPosition.left, top: diyaPosition.top, right: 'auto', bottom: 'auto' }
            }
            aria-hidden
          >
            <DiyaVideo
              width={160}
              height={160}
              showGlow
              extinguishing={phase !== 'active'}
            />
          </div>
          ) : null}
          <DateQuoteDiya
            dateStr={entry.date}
            sessionComplete={entry.sessionComplete}
            extinguishing={phase !== 'active'}
            diyaSlotRef={diyaSlotRef}
            showDiyaInSlot={diyaPosition.left === null && !diyaPosition.pinned}
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
