import { useState, useEffect } from 'react'
import { useMemory } from '../context/MemoryContext'
import { getHabitHistory } from '../utils/growthData'
import { toDateString } from '../utils/dateHelpers'
import { formatDateDisplay } from '../utils/dailyEntry'
import './HabitsPage.css'

const HABIT_KEYS = ['eating', 'movement', 'reading', 'meditation', 'journaling']

const HABIT_LABELS = {
  eating: { name: 'Nourishment', symbol: '🌾' },
  movement: { name: 'Movement', symbol: '🕊' },
  reading: { name: 'Reading', symbol: '📖' },
  meditation: { name: 'Meditation', symbol: '🪔' },
  journaling: { name: 'Journaling', symbol: null },
}

const RETRO_DAYS = 28
const SCROLL_DURATION_MS = 2500

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function slowSmoothScrollToId(id) {
  const el = document.getElementById(id)
  const scrollParent = document.querySelector('.app-shell__main')
  if (!el || !scrollParent) return
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  const startTop = scrollParent.scrollTop
  const elRect = el.getBoundingClientRect()
  const parentRect = scrollParent.getBoundingClientRect()
  const targetTop = startTop + (elRect.top - parentRect.top) - 16
  const start = performance.now()
  function tick(now) {
    const elapsed = now - start
    const p = Math.min(elapsed / SCROLL_DURATION_MS, 1)
    const eased = easeInOutCubic(p)
    scrollParent.scrollTop = startTop + (targetTop - startTop) * eased
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

export function HabitsPage() {
  const { folderHandle } = useMemory()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!folderHandle) {
      setHistory([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    getHabitHistory(folderHandle)
      .then((data) => {
        if (!cancelled) setHistory(data)
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [folderHandle])

  const today = toDateString(new Date())
  const recent = history.slice(-RETRO_DAYS)
  const journalDays = [...recent]
    .reverse()
    .filter((d) => (d.journal?.entry ?? '').trim().length > 0)

  if (loading) {
    return (
      <div className="habits-page habits-page--loading">
        <span className="habits-page__loader">…</span>
      </div>
    )
  }

  return (
    <div className="habits-page">
      <div className="habits-page__glow" aria-hidden />
      <div className="habits-page__content">
        <header className="habits-page__header">
          <h1 className="habits-page__title">Habits in retrospect</h1>
          <p className="habits-page__subtitle">
            Last {RETRO_DAYS} days · Log today on Home
          </p>
        </header>

        {recent.length === 0 ? (
          <p className="habits-page__empty">
            No habit data yet. Complete days on Home and they will appear here.
          </p>
        ) : (
          <section className="habit-retro">
            {HABIT_KEYS.map((key) => {
              const label = HABIT_LABELS[key]
              const logged = recent.filter((d) => d.habits[key]).length
              const total = recent.length
              return (
                <div key={key} className="habit-retro__row">
                  <div className="habit-retro__head">
                    {label.symbol && (
                      <span className="habit-retro__symbol">{label.symbol}</span>
                    )}
                    <span className="habit-retro__name">{label.name}</span>
                    <span className="habit-retro__count">
                      {logged}/{total}
                    </span>
                  </div>
                  <div className="habit-retro__dots" aria-hidden>
                    {recent.map((day) => {
                      const hasJournal = (day.journal?.entry ?? '').trim().length > 0
                      const dotClass = `habit-retro__dot ${
                        day.habits[key] ? 'habit-retro__dot--on' : ''
                      } ${day.dateStr === today ? 'habit-retro__dot--today' : ''} ${
                        hasJournal ? 'habit-retro__dot--has-journal' : ''
                      }`
                      return hasJournal ? (
                        <a
                          key={day.dateStr}
                          href={`#journal-${day.dateStr}`}
                          className={dotClass}
                          title={`${day.dateStr} — go to journal`}
                          onClick={(e) => {
                            e.preventDefault()
                            slowSmoothScrollToId(`journal-${day.dateStr}`)
                          }}
                        />
                      ) : (
                        <span
                          key={day.dateStr}
                          className={dotClass}
                          title={day.dateStr}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {recent.length > 0 && (
          <section className="habit-retro__journal-section">
            <h2 className="habit-retro__journal-heading">Journal in retrospect</h2>
            {journalDays.length === 0 ? (
              <p className="habits-page__empty">
                No journal entries in the last {RETRO_DAYS} days.
              </p>
            ) : (
              <ul className="journal-retro-list">
                {journalDays.map((day) => (
                  <li
                    key={day.dateStr}
                    id={`journal-${day.dateStr}`}
                    className="journal-retro-item"
                  >
                    <div className="journal-retro-item__head">
                      <a
                        href={`#journal-${day.dateStr}`}
                        className="journal-retro-item__date-link"
                        onClick={(e) => {
                          e.preventDefault()
                          slowSmoothScrollToId(`journal-${day.dateStr}`)
                        }}
                      >
                        <time dateTime={day.dateStr}>
                          {formatDateDisplay(day.dateStr)}
                        </time>
                      </a>
                      {day.journal?.wordCount > 0 && (
                        <span className="journal-retro-item__words">
                          {day.journal.wordCount} words
                        </span>
                      )}
                    </div>
                    {day.journal?.prompt && (
                      <p className="journal-retro-item__prompt">
                        {day.journal.prompt}
                      </p>
                    )}
                    <p className="journal-retro-item__entry">
                      {day.journal?.entry}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
