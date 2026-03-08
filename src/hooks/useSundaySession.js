import { useState, useEffect, useCallback } from 'react'
import { useMemory } from '../context/MemoryContext'
import {
  readSundayState,
  writeSundayState,
  defaultSundayState,
} from '../utils/sundayStore'
import { getWeekNumber, getWeekDateRange, formatWeekRange } from '../utils/dateHelpers'

export function useSundaySession(year, weekNumber) {
  const { folderHandle } = useMemory()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)

  const { start, end } = getWeekDateRange(year, weekNumber)
  const dateRange = formatWeekRange(start, end)

  useEffect(() => {
    let cancelled = false
    if (!folderHandle || year == null || weekNumber == null) {
      setState(null)
      setLoading(false)
      return
    }
    setLoading(true)
    readSundayState(folderHandle, year, weekNumber)
      .then((data) => {
        if (cancelled) return
        setState(data ?? defaultSundayState(year, weekNumber))
      })
      .catch(() => {
        if (!cancelled) setState(defaultSundayState(year, weekNumber))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [folderHandle, year, weekNumber])

  const updateState = useCallback(
    (partial) => {
      setState((prev) => {
        if (!prev) return prev
        const next = { ...prev, ...partial }
        if (folderHandle) writeSundayState(folderHandle, next)
        return next
      })
    },
    [folderHandle]
  )

  return { state, loading, updateState, dateRange }
}
