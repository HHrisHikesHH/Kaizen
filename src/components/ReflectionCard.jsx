import { getWeekDateRange, formatWeekRange } from '../utils/dateHelpers'
import './ReflectionCard.css'

export function ReflectionCard({ userFacingReflection, weekNumber, year, dateRange, compact }) {
  const displayRange = dateRange ?? (year && weekNumber
    ? formatWeekRange(
        getWeekDateRange(year, weekNumber).start,
        getWeekDateRange(year, weekNumber).end
      )
    : '')

  return (
    <article className={`reflection-card ${compact ? 'reflection-card--compact' : ''}`}>
      <div className="reflection-card__glow" aria-hidden />
      <p className="reflection-card__label">THIS WEEK&apos;S REFLECTION</p>
      <div className="reflection-card__gap" />
      <div className="reflection-card__text">{userFacingReflection}</div>
      <div className="reflection-card__gap reflection-card__gap--bottom" />
      <p className="reflection-card__meta">
        Week {weekNumber} · {displayRange}
      </p>
    </article>
  )
}
