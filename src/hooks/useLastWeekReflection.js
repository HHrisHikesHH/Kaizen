import { useState, useEffect } from 'react'
import { useMemory } from '../context/MemoryContext'
import { getWeekSummary } from '../utils/aggregateWeek'
import { getWeekDateRange, formatWeekRange } from '../utils/dateHelpers'
import { getWeekNumber } from '../utils/dateHelpers'

/**
 * Returns the reflection from the most recently completed Sunday session
 * (last week's week). Used to show the reflection card on Home Mon–Sat.
 */
export function useLastWeekReflection() {
  const { folderHandle } = useMemory()
  const [reflection, setReflection] = useState(null)

  useEffect(() => {
    if (!folderHandle) return
    const now = new Date()
    const year = now.getFullYear()
    const currentWeek = getWeekNumber(now)
    const lastWeek = currentWeek <= 1 ? 52 : currentWeek - 1
    const lastYear = currentWeek <= 1 ? year - 1 : year

    getWeekSummary(lastYear, lastWeek, folderHandle).then((summary) => {
      if (summary?.userFacingReflection) {
        const { start, end } = getWeekDateRange(lastYear, lastWeek)
        setReflection({
          userFacingReflection: summary.userFacingReflection,
          weekNumber: lastWeek,
          year: lastYear,
          dateRange: formatWeekRange(start, end),
        })
      } else {
        setReflection(null)
      }
    }).catch(() => setReflection(null))
  }, [folderHandle])

  return reflection
}
