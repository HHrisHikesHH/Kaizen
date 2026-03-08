/**
 * Daily entry file path: /YYYY/MM/YYYY-MM-DD.json
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDate()
  const month = d.toLocaleDateString('en-GB', { month: 'long' })
  const dayName = DAY_NAMES[d.getDay()]
  return `${dayName}, the ${getOrdinal(day)} of ${month}`
}

export function getDayOfYear(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const start = new Date(d.getFullYear(), 0, 0)
  const diff = d - start
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

import { JOURNAL_PROMPTS } from './prompts'

export function defaultEntry(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const dayOfWeek = DAY_NAMES[d.getDay()]
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
 */
export async function writeDailyEntry(handle, data) {
  if (!handle || typeof handle.getDirectoryHandle !== 'function') return
  try {
    await ensurePermission(handle)
    const [y, m, filename] = pathForDate(data.date)
    const yearDir = await handle.getDirectoryHandle(y, { create: true })
    const monthDir = await yearDir.getDirectoryHandle(m, { create: true })
    const fileHandle = await monthDir.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
  } catch (err) {
    console.error('Failed to write daily entry:', err)
  }
}
