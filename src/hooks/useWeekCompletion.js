import { useState, useEffect } from 'react'
import { useMemory } from '../context/MemoryContext'
import { readDailyEntry } from '../utils/dailyEntry'
import { getWeekDateKeysContaining } from '../utils/dateHelpers'

/**
 * Returns { [dateStr]: sessionComplete } for the 7 days of the current week.
 */
export function useWeekCompletion(todayStr) {
  const { folderHandle } = useMemory()
  const [weekCompletion, setWeekCompletion] = useState({})

  useEffect(() => {
    if (!folderHandle || !todayStr) return
    const dates = getWeekDateKeysContaining(todayStr)
    let cancelled = false
    Promise.all(
      dates.map(async (d) => {
        const entry = await readDailyEntry(folderHandle, d)
        return [d, entry?.sessionComplete ?? false]
      })
    ).then((pairs) => {
      if (cancelled) return
      setWeekCompletion(Object.fromEntries(pairs))
    })
    return () => { cancelled = true }
  }, [folderHandle, todayStr])

  return weekCompletion
}
