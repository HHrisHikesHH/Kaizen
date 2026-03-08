import { useCallback } from 'react'
import { useDailyEntry } from '../hooks/useDailyEntry'
import { HabitCards } from '../components/HabitCards'
import { formatDateDisplay } from '../utils/dailyEntry'
import './HabitsPage.css'

export function HabitsPage() {
  const { entry, updateEntry, loading } = useDailyEntry()

  const updateHabit = useCallback(
    (key, data) => {
      updateEntry({ habits: { [key]: data } })
    },
    [updateEntry]
  )

  if (loading || !entry) {
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
          <h1 className="habits-page__title">Habits</h1>
          <p className="habits-page__date">{formatDateDisplay(entry.date)}</p>
        </header>
        <HabitCards habits={entry.habits} updateHabit={updateHabit} />
        <p className="habits-page__hint">
          Complete your day — journal, mood, and closing word — on Home.
        </p>
      </div>
    </div>
  )
}
