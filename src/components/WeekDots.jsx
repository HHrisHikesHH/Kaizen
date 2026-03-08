import { useMemo } from 'react'
import { getTodayDateString } from '../utils/dailyEntry'
import './WeekDots.css'

/**
 * Get the Monday of the week containing the given date (ISO string).
 */
function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toISOString().slice(0, 10)
}

/**
 * Load completion for each day of the week from... we don't have a hook for "week data" yet.
 * For now we only have today's entry. So we can show: today complete/incomplete, and other dots as "future" or "past" (we'd need to load other days to know past complete/missed). Spec says:
 * - Future days: --color-stone
 * - Today incomplete: --color-ember, slow pulse
 * - Today complete: --color-gold
 * - Past complete: --color-flame
 * - Past missed: --color-stone with subtle inner shadow
 * So we need completion data for the week. For Phase 1 we only have today's entry in memory. So we have two options: (1) WeekDots only shows 7 dots and we need to pass in completion map for the week, and we'd need to load 7 days of entries - heavy. (2) We show dots but only "today" is accurate; others we'd need to read from folder. Let me add a way to get week completion: we could have useWeekCompletion(handle) that reads the 7 files for the current week. That would mean 7 async reads on load - or we could do it lazily. Simpler: pass completion from parent. Parent (HomePage) has only today's entry. So we need to load the rest of the week. I'll create a hook useWeekCompletion(folderHandle) that returns { 'YYYY-MM-DD': boolean } for the 7 days. It can read in parallel. Let me add that and then WeekDots can use it.
 * Actually re-reading the spec: "A 7-dot row representing the current week." So we need completion for 7 days. I'll add a small util that given folderHandle and weekStart returns promises for each day, and a hook useWeekCompletion that returns a map. So when we're on Home we'll need to load week data. Let me add getWeekDateStrings(dateStr) and readDailyEntry for each, then in HomePage we could do a useEffect that loads the week when we have handle. Or we do it inside WeekDots: WeekDots(folderHandle, todayDateStr) and it loads the 7 entries. That would mean WeekDots uses useMemory and useDailyEntry for today, but for other days it needs to read from folder. So WeekDots could use useMemory and have a state for weekCompletion. On mount it reads 7 files (could be slow). Alternatively HomePage loads week completion and passes it down. I'll do: useWeekCompletion(handle) that returns { dateStr: sessionComplete } for the 7 days of current week. It will need to read 7 entries. I'll implement readDailyEntry for each day and set state.
 */
function getWeekDateStrings(dateStr) {
  const start = getWeekStart(dateStr)
  const out = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start + 'T12:00:00')
    d.setDate(d.getDate() + i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export function WeekDots({ weekCompletion = {}, today }) {
  const weekDates = useMemo(() => getWeekDateStrings(today), [today])

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
