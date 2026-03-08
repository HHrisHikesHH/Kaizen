import { useState, useEffect, useCallback } from 'react'
import { useMemory } from '../context/MemoryContext'
import { readWeekPlan, writeWeekPlan, defaultWeekPlan } from '../utils/weekPlanStore'
import { getWeekDateRange, formatWeekRange } from '../utils/dateHelpers'
import { generateWeekSummary, saveWeekSummary } from '../utils/aggregateWeek'

function uuid() {
  return crypto.randomUUID?.() ?? `_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/**
 * Load and persist week plan for a given year/week.
 * Auto-saves on every change.
 */
export function useWeekPlan(year, weekNumber) {
  const { folderHandle } = useMemory()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  const { start, end } = getWeekDateRange(year, weekNumber)
  const dateRange = `${formatWeekRange(start, end)}, ${year}`

  useEffect(() => {
    let cancelled = false
    if (!folderHandle) {
      setPlan(null)
      setLoading(false)
      return
    }
    setLoading(true)
    readWeekPlan(folderHandle, year, weekNumber)
      .then((data) => {
        if (cancelled) return
        if (data) {
          setPlan(data)
        } else {
          setPlan(defaultWeekPlan(year, weekNumber, dateRange))
        }
      })
      .catch(() => {
        if (!cancelled) setPlan(defaultWeekPlan(year, weekNumber, dateRange))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [folderHandle, year, weekNumber, dateRange])

  const persist = useCallback(
    (next) => {
      if (!folderHandle || !next) return
      writeWeekPlan(folderHandle, next)
      setPlan(next)
      generateWeekSummary(year, weekNumber, folderHandle).then((summary) => {
        if (summary) saveWeekSummary(summary, folderHandle)
      })
    },
    [folderHandle, year, weekNumber]
  )

  const addIntention = useCallback(
    (dayName, text) => {
      if (!text.trim() || !plan) return
      const next = {
        ...plan,
        intentions: {
          ...plan.intentions,
          [dayName]: [
            ...(plan.intentions[dayName] ?? []),
            {
              id: uuid(),
              text: text.trim(),
              complete: false,
              addedAt: new Date().toISOString(),
            },
          ],
        },
      }
      persist(next)
    },
    [plan, persist]
  )

  const toggleIntention = useCallback(
    (dayName, id) => {
      if (!plan) return
      const list = (plan.intentions[dayName] ?? []).map((item) =>
        item.id === id ? { ...item, complete: !item.complete } : item
      )
      const next = {
        ...plan,
        intentions: { ...plan.intentions, [dayName]: list },
      }
      persist(next)
    },
    [plan, persist]
  )

  const deleteIntention = useCallback(
    (dayName, id) => {
      if (!plan) return
      const list = (plan.intentions[dayName] ?? []).filter((item) => item.id !== id)
      const next = {
        ...plan,
        intentions: { ...plan.intentions, [dayName]: list },
      }
      persist(next)
    },
    [plan, persist]
  )

  return {
    plan,
    loading,
    addIntention,
    toggleIntention,
    deleteIntention,
    dateRange,
  }
}
