import { useMemo } from 'react'
import { getWeekDateKeysContaining } from '../utils/dateHelpers'
import './WeekDots.css'

export function WeekDots({ weekCompletion = {}, today }) {
  const weekDates = useMemo(() => getWeekDateKeysContaining(today), [today])

  return (
    <div className="week-dots" aria-hidden>
      {weekDates.map((dateStr) => {
        const isToday = dateStr === today
        const complete = weekCompletion[dateStr]
        const isFuture = dateStr > today
        let dotClass = 'week-dots__dot'
        if (isFuture) dotClass += ' week-dots__dot--future'
        else if (isToday && !complete) dotClass += ' week-dots__dot--today-incomplete'
        else if (isToday && complete) dotClass += ' week-dots__dot--today-complete'
        else if (complete) dotClass += ' week-dots__dot--past-complete'
        else dotClass += ' week-dots__dot--past-missed'

        return <div key={dateStr} className={dotClass} title={dateStr} />
      })}
    </div>
  )
}
