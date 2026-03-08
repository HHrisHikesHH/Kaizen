import { useState, useEffect } from 'react'
import { useMemory } from '../context/MemoryContext'
import { readDailyEntry } from '../utils/dailyEntry'
import { getDatesForWeek, toDateString } from '../utils/dateHelpers'

/**
 * Returns { [dateStr]: sessionComplete } for the 6 days (Mon–Sat) of the given week.
 */
export function useWeekDayCompletions(year, weekNumber) {
  const { folderHandle } = useMemory()
  const [completions, setCompletions] = useState({})

  useEffect(() => {
    if (!folderHandle || year == null || weekNumber == null) return
    const dates = getDatesForWeek(year, weekNumber)
    let cancelled = false
    Promise.all(
      dates.map(async (d) => {
        const dateStr = toDateString(d)
        const entry = await readDailyEntry(folderHandle, dateStr)
        return [dateStr, entry?.sessionComplete ?? false]
      })
    ).then((pairs) => {
      if (!cancelled) setCompletions(Object.fromEntries(pairs))
    })
    return () => { cancelled = true }
  }, [folderHandle, year, weekNumber])

  return completions
}
