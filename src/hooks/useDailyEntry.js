import { useState, useEffect, useCallback, useRef } from 'react'
import { createEntrySaver } from '../utils/entrySaver'
import { useMemory } from '../context/MemoryContext'
import {
  readDailyEntry,
  writeDailyEntry,
  defaultEntry,
  getTodayDateString,
  mergeEntry,
} from '../utils/dailyEntry'

/**
 * Load and persist today's daily entry.
 * updateEntry autosaves after a short pause; commitEntry saves immediately and
 * resolves once the file is written (use it before anything reads the file).
 */
export function useDailyEntry() {
  const { folderHandle } = useMemory()
  const today = getTodayDateString()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const entryRef = useRef(null)
  const saverRef = useRef(null)

  // One saver per folder: debounced autosave + immediate flush, writes in order.
  useEffect(() => {
    if (!folderHandle) {
      saverRef.current = null
      return
    }
    const saver = createEntrySaver(async (fullEntry) => {
      setSaving(true)
      try {
        return await writeDailyEntry(folderHandle, fullEntry)
      } finally {
        setSaving(false)
      }
    })
    saverRef.current = saver
    return () => {
      // Keep the latest edit rather than dropping it when the folder changes.
      if (saverRef.current === saver) saverRef.current = null
    }
  }, [folderHandle])

  const applyUpdate = useCallback((partial) => {
    const prev = entryRef.current
    if (!prev) return null
    const next = mergeEntry(prev, partial)
    entryRef.current = next
    setEntry(next)
    return next
  }, [])

  /** Update in memory and autosave after a short pause. */
  const updateEntry = useCallback((partial) => {
    const next = applyUpdate(partial)
    if (next) saverRef.current?.schedule(next)
  }, [applyUpdate])

  /**
   * Update in memory and save immediately. Resolves to { entry, saved }:
   * `saved` is true only once this version of the entry is on disk.
   */
  const commitEntry = useCallback(async (partial) => {
    const next = applyUpdate(partial)
    if (!next || !saverRef.current) return { entry: next, saved: false }
    const saved = await saverRef.current.flush(next)
    return { entry: next, saved }
  }, [applyUpdate])

  return { entry, updateEntry, commitEntry, loading, saving }
}
