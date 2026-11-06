import { useState, useEffect, useCallback } from 'react'
import { useMemory } from '../context/MemoryContext'
import { writeWeekPlan, defaultWeekPlan } from '../utils/weekPlanStore'
import { resolveWeekRecords } from '../utils/weekFileCompat'
import { getWeekDateRange, formatWeekRange } from '../utils/dateHelpers'
import { generateWeekSummary, saveWeekSummary } from '../utils/aggregateWeek'

function uuid() {
  return crypto.randomUUID?.() ?? `_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

/**
 * Load and persist the plan for an ISO week. Auto-saves on every change.
 *
 * `plan` is always the canonical record (/ISO-year/week-N.json). Plans saved
 * by older versions under a neighbouring year are returned separately in
 * `compat.legacy` (read-only), never merged into `plan`. When saving could
 * destroy another record (`compat.writable === false`), changes are ignored.
 */
export function useWeekPlan(year, weekNumber) {
  const { folderHandle } = useMemory()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [compat, setCompat] = useState(null)

  const { start, end } = getWeekDateRange(year, weekNumber)
  const dateRange = `${formatWeekRange(start, end)}, ${year}`

  useEffect(() => {
    let cancelled = false
    if (!folderHandle) {
      setPlan(null)
      setCompat(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setCompat(null) // no saves until this week's records are known
    Promise.all([
      resolveWeekRecords(folderHandle, 'plan', year, weekNumber),
      resolveWeekRecords(folderHandle, 'summary', year, weekNumber),
    ])
      .then(([planRecords, summaryRecords]) => {
        if (cancelled) return
        const { canonical } = planRecords
        setPlan(canonical.state === 'ok' && canonical.data ? canonical.data : defaultWeekPlan(year, weekNumber, dateRange))
        setCompat({
          status: planRecords.status,
          writable: planRecords.writable,
          canonicalUnreadable: canonical.state === 'unreadable',
          sharedWith: planRecords.sharedWith,
          legacy: planRecords.legacy,
          legacySummaries: summaryRecords.legacy,
        })
      })
      .catch(() => {
        if (cancelled) return
        // Unknown state: show an empty plan but never save over whatever is stored.
        setPlan(defaultWeekPlan(year, weekNumber, dateRange))
        setCompat({ status: 'unknown', writable: false, canonicalUnreadable: true, sharedWith: [], legacy: [], legacySummaries: [] })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [folderHandle, year, weekNumber, dateRange])

  const persist = useCallback(
    (next) => {
      if (!folderHandle || !next || !compat?.writable) return
      setPlan(next)
      writeWeekPlan(folderHandle, next).then((written) => {
        if (!written) return
        generateWeekSummary(year, weekNumber, folderHandle).then((summary) => {
          if (summary) saveWeekSummary(summary, folderHandle)
        })
      })
    },
    [folderHandle, year, weekNumber, compat]
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
    compat,
  }
}
