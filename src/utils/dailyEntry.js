/**
 * Daily entry file path: /YYYY/MM/YYYY-MM-DD.json
 *
 * The date key is the user's local calendar date (see dateHelpers.js).
 */

import { JOURNAL_PROMPTS } from './prompts'
import {
  formatDateForDisplay,
  getDayOfWeek,
  getLocalDayOfYear,
  getTodayKey,
  parseLocalDateKey,
} from './dateHelpers'

export function formatDateDisplay(dateStr) {
  return formatDateForDisplay(dateStr)
}

export function getDayOfYear(dateStr) {
  return getLocalDayOfYear(dateStr)
}

/** Today's local date key. Kept as the name existing callers use. */
export function getTodayDateString() {
  return getTodayKey()
}

export function defaultEntry(dateStr) {
  const dayOfWeek = getDayOfWeek(parseLocalDateKey(dateStr))
  const dayOfYear = getDayOfYear(dateStr)
  const prompt = JOURNAL_PROMPTS[dayOfYear % JOURNAL_PROMPTS.length]
  return {
    date: dateStr,
    dayOfWeek,
    sessionComplete: false,
    habits: {
      eating: { logged: false, note: '' },
      movement: { logged: false, note: '' },
      reading: { logged: false, pages: 0, note: '' },
      meditation: { logged: false, minutes: 0, note: '' },
      journaling: { logged: false },
    },
    journal: {
      prompt,
      entry: '',
      wordCount: 0,
      timeSpent: 0,
    },
    mood: '',
    closingWord: '',
    divaExtinguished: false,
  }
}

/**
 * Get folder path segments for date: [YYYY, MM, filename]
 */
/** Apply a partial update; `habits` and `journal` are merged one level deep. */
export function mergeEntry(prev, partial) {
  return {
    ...prev,
    ...partial,
    habits: partial.habits !== undefined ? { ...prev.habits, ...partial.habits } : prev.habits,
    journal: partial.journal !== undefined ? { ...prev.journal, ...partial.journal } : prev.journal,
  }
}

function pathForDate(dateStr) {
  const [y, m] = dateStr.split('-')
  return [y, m, `${dateStr}.json`]
}

/**
 * Ensure we have permission to read/write. Chrome may require re-prompt.
 */
async function ensurePermission(handle) {
  if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    await handle.requestPermission({ mode: 'readwrite' })
  }
}

/**
 * Read daily entry for date from the user's folder. Returns null if file missing or error.
 */
export async function readDailyEntry(handle, dateStr) {
  if (!handle || typeof handle.getDirectoryHandle !== 'function') return null
  try {
    await ensurePermission(handle)
    const [y, m, filename] = pathForDate(dateStr)
    const yearDir = await handle.getDirectoryHandle(y, { create: false })
    const monthDir = await yearDir.getDirectoryHandle(m, { create: false })
    const fileHandle = await monthDir.getFileHandle(filename, { create: false })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Write daily entry to the user's folder. Creates YYYY/MM/ if needed.
 * Returns true once the file is committed, false if the write failed.
 */
export async function writeDailyEntry(handle, data) {
  if (!handle || typeof handle.getDirectoryHandle !== 'function') return false
  try {
    await ensurePermission(handle)
    const [y, m, filename] = pathForDate(data.date)
    const yearDir = await handle.getDirectoryHandle(y, { create: true })
    const monthDir = await yearDir.getDirectoryHandle(m, { create: true })
    const fileHandle = await monthDir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
    return true
  } catch (err) {
    console.error('Failed to write daily entry:', err)
    return false
  }
}
