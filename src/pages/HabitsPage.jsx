import { useState, useEffect } from 'react'
import { useMemory } from '../context/MemoryContext'
import { getHabitHistory } from '../utils/growthData'
import { toDateString } from '../utils/dateHelpers'
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
                    {recent.map((day) => (
                      <span
                        key={day.dateStr}
                        className={`habit-retro__dot ${
                          day.habits[key] ? 'habit-retro__dot--on' : ''
                        } ${day.dateStr === today ? 'habit-retro__dot--today' : ''}`}
                        title={day.dateStr}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}
