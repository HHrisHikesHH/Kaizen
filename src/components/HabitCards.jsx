import { HabitCard } from './HabitCard'
import './HabitCards.css'

const HABIT_KEYS = ['eating', 'movement', 'reading', 'meditation', 'journaling']

export function HabitCards({ habits, updateHabit }) {
  return (
    <section className="habit-cards">
      <h2 className="habit-cards__heading">How did you tend to yourself today?</h2>
      {HABIT_KEYS.map((key) => (
        <HabitCard
          key={key}
          habitKey={key}
          data={habits[key] || { logged: false, note: '', pages: 0, minutes: 0 }}
          onChange={(next) => updateHabit(key, next)}
        />
      ))}
    </section>
  )
}
