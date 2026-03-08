/**
 * Weekly data aggregation for the Sunday Package.
 * Reads daily entries Mon–Sat and week plan, returns structured summary.
 */

import { readDailyEntry } from './dailyEntry'
import { readWeekPlan } from './weekPlanStore'
import {
  getDatesForWeek,
  getWeekDateRange,
  formatWeekRange,
  toDateString,
  getDayOfWeek,
} from './dateHelpers'

const HABIT_KEYS = ['eating', 'movement', 'reading', 'meditation', 'journaling']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Generate week summary for the given year and ISO week number.
 * Practice week = Mon–Sat (6 days).
 */
export async function generateWeekSummary(year, weekNumber, folderHandle) {
  const dates = getDatesForWeek(year, weekNumber)
  const { start, end } = getWeekDateRange(year, weekNumber)
  const dateRangeStr = `${formatWeekRange(start, end)}, ${year}`

  const dailyEntries = await Promise.all(
    dates.map((d) => readDailyEntry(folderHandle, toDateString(d)))
  )

  const weekPlan = await readWeekPlan(folderHandle, year, weekNumber)

  const dayNames = dates.map((d) => getDayOfWeek(d))
  const missedDays = dayNames.filter((_, i) => !dailyEntries[i]?.sessionComplete)
  const daysLogged = dailyEntries.filter((e) => e?.sessionComplete).length
  const daysMissed = 6 - daysLogged

  const habitSummary = {}
  HABIT_KEYS.forEach((key) => {
    const missedOn = []
    const notes = []
    let totalPages = 0
    let totalMinutes = 0
    const dailyPages = []
    const dailyMinutes = []

    dayNames.forEach((dayName, i) => {
      const entry = dailyEntries[i]
      const habit = entry?.habits?.[key]
      const logged = habit?.logged ?? false

      if (!logged) missedOn.push(dayName)
      if (habit?.note != null) notes.push(habit.note ?? '')
      else notes.push('')

      if (key === 'reading') {
        const p = habit?.pages ?? 0
        totalPages += p
        dailyPages.push(p)
      }
      if (key === 'meditation') {
        const m = habit?.minutes ?? 0
        totalMinutes += m
        dailyMinutes.push(m)
      }
    })

    habitSummary[key] = {
      daysLogged: 6 - missedOn.length,
      daysMissed: missedOn.length,
      missedOn,
      notes,
    }
    if (key === 'reading') {
      habitSummary[key].totalPages = totalPages
      habitSummary[key].dailyPages = dailyPages
    }
    if (key === 'meditation') {
      habitSummary[key].totalMinutes = totalMinutes
      habitSummary[key].dailyMinutes = dailyMinutes
    }
  })

  const journalEntries = dailyEntries
    .map((entry, i) => {
      if (!entry?.journal?.entry?.trim()) return null
      return {
        date: toDateString(dates[i]),
        dayOfWeek: dayNames[i],
        prompt: entry.journal?.prompt ?? '',
        entry: entry.journal?.entry ?? '',
        wordCount: entry.journal?.wordCount ?? 0,
        mood: entry.mood ?? '',
        closingWord: entry.closingWord ?? '',
      }
    })
    .filter(Boolean)

  const moodSequence = dayNames.map((_, i) => dailyEntries[i]?.mood ?? '')
  const closingWords = dayNames.map((_, i) => dailyEntries[i]?.closingWord ?? '')

  let weeklyIntentions = { total: 0, completed: 0, completionRate: 0, intentions: {} }
  if (weekPlan?.intentions) {
    const intentions = weekPlan.intentions
    let total = 0
    let completed = 0
    DAY_NAMES.forEach((day) => {
      const list = intentions[day] ?? []
      total += list.length
      completed += list.filter((i) => i.complete).length
    })
    weeklyIntentions = {
      total,
      completed,
      completionRate: total > 0 ? completed / total : 0,
      intentions,
    }
  }

  const totalHabitChecks = HABIT_KEYS.reduce(
    (sum, key) => sum + habitSummary[key].daysLogged,
    0
  )
  const habitConsistencyScore = totalHabitChecks / (5 * 6)
  const journalConsistencyScore = daysLogged / 6
  const overallPresenceScore = (habitConsistencyScore + journalConsistencyScore) / 2

  return {
    weekNumber,
    year,
    dateRange: dateRangeStr,
    daysLogged,
    daysMissed,
    missedDays,
    habitSummary,
    journalEntries,
    moodSequence,
    closingWords,
    weeklyIntentions,
    habitConsistencyScore: Math.round(habitConsistencyScore * 100) / 100,
    journalConsistencyScore: Math.round(journalConsistencyScore * 100) / 100,
    overallPresenceScore: Math.round(overallPresenceScore * 100) / 100,
    generatedAt: new Date().toISOString(),
  }
}

const SUMMARY_FILENAME = (weekNumber) => `week-${weekNumber}-summary.json`

async function ensurePermission(handle) {
  if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    await handle.requestPermission({ mode: 'readwrite' })
  }
}

/**
 * Save week summary to /YYYY/week-[WW]-summary.json
 */
export async function saveWeekSummary(summary, folderHandle) {
  if (!folderHandle || typeof folderHandle.getDirectoryHandle !== 'function') return
  try {
    await ensurePermission(folderHandle)
    const yearDir = await folderHandle.getDirectoryHandle(String(summary.year), { create: true })
    const fileHandle = await yearDir.getFileHandle(SUMMARY_FILENAME(summary.weekNumber), {
      create: true,
    })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(summary, null, 2))
    await writable.close()
  } catch (err) {
    console.error('Failed to save week summary:', err)
  }
}

/**
 * Read week summary. Returns null if file does not exist.
 */
export async function getWeekSummary(year, weekNumber, folderHandle) {
  if (!folderHandle || typeof folderHandle.getDirectoryHandle !== 'function') return null
  try {
    await ensurePermission(folderHandle)
    const yearDir = await folderHandle.getDirectoryHandle(String(year), { create: false })
    const fileHandle = await yearDir.getFileHandle(SUMMARY_FILENAME(weekNumber), {
      create: false,
    })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}
