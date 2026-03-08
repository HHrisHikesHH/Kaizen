/**
 * Growth page data: presence map, awareness arc, closing words, quiet stats.
 * Reads from daily entries and AI_notes.
 */

import { readDailyEntry } from './dailyEntry'
import { getAllSessionNotes } from './aiNotesManager'
import { toDateString } from './dateHelpers'

async function ensurePermission(handle) {
  if (handle?.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    await handle.requestPermission({ mode: 'readwrite' })
  }
}

/**
 * Scan folder for earliest and latest daily entry dates.
 */
export async function getPracticeDateRange(folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return { earliest: null, latest: null }
  try {
    await ensurePermission(folderHandle)
    const dates = []
    for await (const [yearStr, yearHandle] of folderHandle.entries()) {
      if (yearHandle.kind !== 'directory' || !/^\d{4}$/.test(yearStr)) continue
      for await (const [monthStr, monthHandle] of yearHandle.entries()) {
        if (monthHandle.kind !== 'directory' || !/^\d{2}$/.test(monthStr)) continue
        for await (const [fileName] of monthHandle.entries()) {
          const m = fileName.match(/^(\d{4}-\d{2}-\d{2})\.json$/)
          if (m) dates.push(m[1])
        }
      }
    }
    if (dates.length === 0) return { earliest: null, latest: null }
    dates.sort()
    return { earliest: dates[0], latest: dates[dates.length - 1] }
  } catch {
    return { earliest: null, latest: null }
  }
}

/**
 * Generate all dates from start to end (inclusive).
 */
function dateRange(startStr, endStr) {
  const out = []
  const start = new Date(startStr + 'T12:00:00')
  const end = new Date(endStr + 'T12:00:00')
  const today = toDateString(new Date())
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = toDateString(d)
    if (ds > today) break
    out.push(ds)
  }
  return out
}

/**
 * Presence map: one entry per day from earliest to today.
 * Each: { dateStr, sessionComplete, wordCount, closingWord, habitsCount }
 */
export async function getPresenceMapData(folderHandle) {
  const { earliest } = await getPracticeDateRange(folderHandle)
  const today = toDateString(new Date())
  if (!earliest) return []
  const dates = dateRange(earliest, today)
  const BATCH = 40
  const results = []
  for (let i = 0; i < dates.length; i += BATCH) {
    const chunk = dates.slice(i, i + BATCH)
    const entries = await Promise.all(chunk.map((d) => readDailyEntry(folderHandle, d)))
    chunk.forEach((dateStr, j) => {
      const e = entries[j]
      const sessionComplete = e?.sessionComplete ?? false
      const wordCount = e?.journal?.wordCount ?? 0
      const closingWord = (e?.closingWord ?? '').trim()
      const habits = e?.habits ?? {}
      const habitsCount = ['eating', 'movement', 'reading', 'meditation', 'journaling'].filter(
        (k) => habits[k]?.logged
      ).length
      results.push({
        dateStr,
        sessionComplete,
        wordCount,
        closingWord,
        habitsCount,
      })
    })
  }
  return results
}

/**
 * Journal word count data for awareness arc: [{ dateStr, wordCount }] for days with wordCount > 0.
 */
export function getJournalArcData(presenceMapData) {
  return presenceMapData
    .filter((d) => (d.wordCount ?? 0) > 0)
    .map((d) => ({ dateStr: d.dateStr, wordCount: d.wordCount }))
}

/**
 * All closing words in chronological order (non-empty).
 */
export function getClosingWordsRiver(presenceMapData) {
  return presenceMapData
    .map((d) => (d.closingWord || '').trim())
    .filter(Boolean)
}

/**
 * Count files in AI_notes matching a pattern (e.g. monthly-*-notes.json).
 */
export async function countAINotesByPattern(folderHandle, pattern) {
  if (!folderHandle?.getDirectoryHandle) return 0
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    let count = 0
    for await (const [name] of aiDir.entries()) {
      if (typeof pattern === 'string' && name.startsWith(pattern) && name.endsWith('-notes.json')) count += 1
      if (pattern instanceof RegExp && pattern.test(name)) count += 1
    }
    return count
  } catch {
    return 0
  }
}

/**
 * Quiet statistics at bottom of Growth page.
 */
export async function getQuietStats(folderHandle, presenceMapData) {
  const present = presenceMapData.filter((d) => d.sessionComplete).length
  const totalDays = presenceMapData.length
  const passed = totalDays - present

  let journalEntries = 0
  let totalWords = 0
  presenceMapData.forEach((d) => {
    if (d.wordCount > 0) {
      journalEntries += 1
      totalWords += d.wordCount
    }
  })

  const weeklyNotes = await getAllSessionNotes(folderHandle)
  const sundaySessions = weeklyNotes.length

  const monthlyReflections = await countAINotesByPattern(folderHandle, 'monthly-')

  let longestContinuity = 0
  let run = 0
  presenceMapData.forEach((d) => {
    if (d.sessionComplete) {
      run += 1
      longestContinuity = Math.max(longestContinuity, run)
    } else {
      run = 0
    }
  })

  const firstDate = presenceMapData[0]?.dateStr ?? null

  return {
    firstDate,
    daysPresent: present,
    daysPassed: passed,
    journalEntries,
    totalWords,
    pagesRead: 0,
    minutesStillness: 0,
    sundaySessions,
    monthlyReflections,
    longestContinuity,
    totalDays,
  }
}

/**
 * Enrich quiet stats with reading/meditation from daily entries (optional second pass).
 */
export async function enrichQuietStats(folderHandle, stats, presenceMapData) {
  let pagesRead = 0
  let minutesStillness = 0
  const dateStrs = presenceMapData.map((d) => d.dateStr)
  const BATCH = 50
  for (let i = 0; i < dateStrs.length; i += BATCH) {
    const chunk = dateStrs.slice(i, i + BATCH)
    const entries = await Promise.all(chunk.map((d) => readDailyEntry(folderHandle, d)))
    entries.forEach((e) => {
      if (e?.habits?.reading?.pages) pagesRead += e.habits.reading.pages
      if (e?.habits?.meditation?.minutes) minutesStillness += e.habits.meditation.minutes
    })
  }
  return { ...stats, pagesRead, minutesStillness }
}
