import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useDailyEntry } from '../hooks/useDailyEntry'
import { useWeekCompletion } from '../hooks/useWeekCompletion'
import { useMemory } from '../context/MemoryContext'
import { getTodayDateString } from '../utils/dailyEntry'
import { getWeekNumber, getDayOfWeek } from '../utils/dateHelpers'
import { generateWeekSummary, saveWeekSummary } from '../utils/aggregateWeek'
import { useWeekPlan } from '../hooks/useWeekPlan'
import { useLastWeekReflection } from '../hooks/useLastWeekReflection'
import { ReflectionCard } from '../components/ReflectionCard'
import { DateQuoteDiya } from '../components/DateQuoteDiya'
import { DiyaVideo } from '../components/DiyaVideo'
import { HabitCards } from '../components/HabitCards'
import { TodayIntentions } from '../components/TodayIntentions'
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
  const { folderHandle } = useMemory()
  const { entry, updateEntry, loading } = useDailyEntry()
  const today = getTodayDateString()
  const weekCompletion = useWeekCompletion(today)
  const diyaSlotRef = useRef(null)
  const now = new Date()
  const { plan: weekPlan, toggleIntention: toggleWeekIntention } = useWeekPlan(
    now.getFullYear(),
    getWeekNumber(now)
  )
  const todayDayName = getDayOfWeek(now)
  const todayIntentions = (weekPlan?.intentions?.[todayDayName] ?? []).filter(Boolean)
  const lastWeekReflection = useLastWeekReflection()

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
    if (folderHandle && entry?.date) {
      const d = new Date(entry.date + 'T12:00:00')
      const year = d.getFullYear()
      const weekNum = getWeekNumber(d)
      generateWeekSummary(year, weekNum, folderHandle).then((summary) => {
        if (summary) saveWeekSummary(summary, folderHandle)
      })
    }
    setTimeout(() => setPhase('closing'), 1500)
    setTimeout(() => setPhase('locked'), 4500)
  }, [updateEntry, folderHandle, entry?.date])

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
      {showClosingScreen && (
        <ClosingScreen
          variant={
            entry?.date &&
            new Date(entry.date + 'T12:00:00').getDay() === 6
              ? 'saturday'
              : 'default'
          }
        />
      )}

      <div
        className={`home-page ${phase === 'fading' ? 'home-page--fading' : ''}`}
      >
        <div
          className={`home-page__glow ${phase === 'fading' ? 'home-page__glow--dim' : ''}`}
          aria-hidden
        />
        <div className="home-page__content">
          {/* Floating diya: portaled to body so position:fixed is relative to viewport (not the page-transition transform). At top it follows the hero slot; when scrolled past threshold it pins to right, upper third. */}
          {(diyaPosition.left !== null || diyaPosition.pinned) &&
            createPortal(
              <div
                className="home-page__diya-float"
                style={
                  diyaPosition.pinned
                    ? { right: '4rem', top: '75%', left: 'auto', bottom: 'auto' }
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
              </div>,
              document.body
            )}
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
          {todayIntentions.length > 0 && (
            <TodayIntentions
              intentions={todayIntentions}
              onToggle={(id) => toggleWeekIntention(todayDayName, id)}
            />
          )}
          {lastWeekReflection && (
            <div className="home-page__reflection-wrap">
              <ReflectionCard
                userFacingReflection={lastWeekReflection.userFacingReflection}
                weekNumber={lastWeekReflection.weekNumber}
                year={lastWeekReflection.year}
                dateRange={lastWeekReflection.dateRange}
                compact
              />
            </div>
          )}
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
