import { useState, useEffect } from 'react'
import { useMemory } from '../context/MemoryContext'
import { readDailyEntry } from '../utils/dailyEntry'

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d)
  monday.setDate(diff)
  return monday.toISOString().slice(0, 10)
}

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

/**
 * Returns { [dateStr]: sessionComplete } for the 7 days of the current week.
 */
export function useWeekCompletion(todayStr) {
  const { folderHandle } = useMemory()
  const [weekCompletion, setWeekCompletion] = useState({})

  useEffect(() => {
    if (!folderHandle || !todayStr) return
    const dates = getWeekDateStrings(todayStr)
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
