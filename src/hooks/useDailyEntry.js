import { useState, useEffect, useCallback, useRef } from 'react'
import { useMemory } from '../context/MemoryContext'
import {
  readDailyEntry,
  writeDailyEntry,
  defaultEntry,
  getTodayDateString,
} from '../utils/dailyEntry'

/**
 * Load and persist today's daily entry. Auto-saves on every update.
 */
export function useDailyEntry() {
  const { folderHandle } = useMemory()
  const today = getTodayDateString()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimeoutRef = useRef(null)
  const pendingRef = useRef(null)

  // Load today's entry on mount or when handle/today changes
  useEffect(() => {
    let cancelled = false
    if (!folderHandle) {
      setEntry(defaultEntry(today))
      setLoading(false)
      return
    }
    setLoading(true)
    readDailyEntry(folderHandle, today)
      .then((data) => {
        if (cancelled) return
        setEntry(data ? { ...defaultEntry(today), ...data } : defaultEntry(today))
      })
      .catch(() => {
        if (!cancelled) setEntry(defaultEntry(today))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [folderHandle, today])

  const save = useCallback(
    async (fullEntry) => {
      if (!folderHandle || !fullEntry) return
      setSaving(true)
      try {
        await writeDailyEntry(folderHandle, fullEntry)
      } finally {
        setSaving(false)
        pendingRef.current = null
      }
    },
    [folderHandle]
  )

  const scheduleSave = useCallback(
    (fullEntry) => {
      if (!fullEntry) return
      pendingRef.current = fullEntry
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null
        save(pendingRef.current)
      }, 150)
    },
    [save]
  )

  const updateEntry = useCallback((partial) => {
    setEntry((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        ...partial,
        habits:
          partial.habits !== undefined ? { ...prev.habits, ...partial.habits } : prev.habits,
        journal:
          partial.journal !== undefined ? { ...prev.journal, ...partial.journal } : prev.journal,
      }
      scheduleSave(next)
      return next
    })
  }, [scheduleSave])

  return { entry, updateEntry, loading, saving }
}
