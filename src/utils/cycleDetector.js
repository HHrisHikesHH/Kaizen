/**
 * Detect which reflection cycles (weekly, monthly, quarterly, half-yearly, yearly)
 * exist and which are "ready" (data complete but notes not yet generated).
 */

import { readSundayState } from './sundayStore'
import { getWeekDateRange } from './dateHelpers'

async function ensurePermission(handle) {
  if (handle?.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    await handle.requestPermission({ mode: 'readwrite' })
  }
}

/** Get (year, weekNumber) for every week whose Sunday falls in the given calendar month. */
function getWeeksInMonth(year, month) {
  const result = []
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const d = new Date(first)
  while (d <= last) {
    if (d.getDay() === 0) {
      const y = d.getFullYear()
      const weekEnd = new Date(d)
      weekEnd.setDate(weekEnd.getDate() - 1)
      const weekNum = getWeekNumber(weekEnd)
      result.push({ year: y, weekNumber: weekNum })
    }
    d.setDate(d.getDate() + 1)
  }
  return result
}

function getWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

/** List all AI_notes filenames matching a pattern. */
async function listAINotesFiles(folderHandle, test) {
  if (!folderHandle?.getDirectoryHandle) return []
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const names = []
    for await (const [name] of aiDir.entries()) {
      if (test(name)) names.push(name)
    }
    return names
  } catch {
    return []
  }
}

/** Parse monthly filename: monthly-MM-YYYY-notes.json */
function parseMonthlyFilename(name) {
  const m = name.match(/^monthly-(\d{2})-(\d{4})-notes\.json$/)
  return m ? { month: parseInt(m[1], 10), year: parseInt(m[2], 10) } : null
}

/** Parse quarterly: quarterly-Q[1-4]-YYYY-notes.json */
function parseQuarterlyFilename(name) {
  const m = name.match(/^quarterly-Q([1-4])-(\d{4})-notes\.json$/)
  return m ? { quarter: parseInt(m[1], 10), year: parseInt(m[2], 10) } : null
}

/** Parse half-year: half-H1-YYYY-notes.json or half-H2-YYYY-notes.json */
function parseHalfYearFilename(name) {
  const m = name.match(/^half-(H[12])-(\d{4})-notes\.json$/)
  return m ? { period: m[1], year: parseInt(m[2], 10) } : null
}

/** Parse yearly: yearly-YYYY-notes.json */
function parseYearlyFilename(name) {
  const m = name.match(/^yearly-(\d{4})-notes\.json$/)
  return m ? { year: parseInt(m[1], 10) } : null
}

/**
 * Returns { weeklyCycles, monthlyCycles, quarterlyCycles, halfYearlyCycles, yearlyCycles }.
 * A cycle has ready: true when data exists for that period but the notes file does not yet exist.
 */
export async function detectAvailableCycles(folderHandle) {
  const weeklyCycles = []
  const monthlyCycles = []
  const quarterlyCycles = []
  const halfYearlyCycles = []
  const yearlyCycles = []

  if (!folderHandle?.getDirectoryHandle) {
    return {
      weeklyCycles,
      monthlyCycles,
      quarterlyCycles,
      halfYearlyCycles,
      yearlyCycles,
    }
  }

  const allMonthly = await listAINotesFiles(folderHandle, (n) =>
    /^monthly-\d{2}-\d{4}-notes\.json$/.test(n)
  )
  const allQuarterly = await listAINotesFiles(folderHandle, (n) =>
    /^quarterly-Q[1-4]-\d{4}-notes\.json$/.test(n)
  )
  const allHalfYear = await listAINotesFiles(folderHandle, (n) =>
    /^half-H[12]-\d{4}-notes\.json$/.test(n)
  )
  const allYearly = await listAINotesFiles(folderHandle, (n) =>
    /^yearly-\d{4}-notes\.json$/.test(n)
  )

  const monthlySet = new Set(allMonthly.map((n) => parseMonthlyFilename(n)).filter(Boolean).map(({ month, year }) => `${year}-${month}`))
  const quarterlySet = new Set(allQuarterly.map((n) => parseQuarterlyFilename(n)).filter(Boolean).map(({ quarter, year }) => `Q${quarter}-${year}`))
  const halfYearSet = new Set(allHalfYear.map((n) => parseHalfYearFilename(n)).filter(Boolean).map(({ period, year }) => `${period}-${year}`))
  const yearlySet = new Set(allYearly.map((n) => parseYearlyFilename(n)).filter(Boolean).map(({ year }) => String(year)))

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  for (let y = currentYear - 2; y <= currentYear; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === currentYear && m > currentMonth) break
      const weeksInMonth = getWeeksInMonth(y, m)
      let eveningsComplete = 0
      for (const { year, weekNumber } of weeksInMonth) {
        const state = await readSundayState(folderHandle, year, weekNumber)
        if (state?.eveningComplete) eveningsComplete += 1
      }
      const key = `${y}-${m}`
      const notesExist = monthlySet.has(key)
      const ready = eveningsComplete >= 4 && !notesExist
      monthlyCycles.push({
        month: m,
        year: y,
        weeksComplete: eveningsComplete,
        notesExist,
        ready,
      })
    }
  }

  const quarterMonths = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }
  for (let y = currentYear - 2; y <= currentYear; y++) {
    for (let q = 1; q <= 4; q++) {
      const months = quarterMonths[q]
      if (y === currentYear && Math.max(...months) > currentMonth) continue
      const monthsWithNotes = months.filter((mm) => monthlySet.has(`${y}-${mm}`))
      const notesExist = quarterlySet.has(`Q${q}-${y}`)
      const ready = monthsWithNotes.length >= 3 && !notesExist
      quarterlyCycles.push({
        quarter: q,
        year: y,
        monthsComplete: monthsWithNotes.length,
        notesExist,
        ready,
      })
    }
  }

  for (let y = currentYear - 2; y <= currentYear; y++) {
    for (const period of ['H1', 'H2']) {
      const q1 = period === 'H1' ? 1 : 3
      const q2 = period === 'H1' ? 2 : 4
      const hasQ1 = quarterlySet.has(`Q${q1}-${y}`)
      const hasQ2 = quarterlySet.has(`Q${q2}-${y}`)
      const notesExist = halfYearSet.has(`${period}-${y}`)
      const ready = hasQ1 && hasQ2 && !notesExist
      halfYearlyCycles.push({
        period,
        year: y,
        quartersComplete: (hasQ1 ? 1 : 0) + (hasQ2 ? 1 : 0),
        notesExist,
        ready,
      })
    }
  }

  for (let y = currentYear - 2; y <= currentYear; y++) {
    const hasH1 = halfYearSet.has(`H1-${y}`)
    const hasH2 = halfYearSet.has(`H2-${y}`)
    const notesExist = yearlySet.has(String(y))
    const ready = hasH1 && hasH2 && !notesExist
    yearlyCycles.push({
      year: y,
      halvesComplete: (hasH1 ? 1 : 0) + (hasH2 ? 1 : 0),
      notesExist,
      ready,
    })
  }

  return {
    weeklyCycles,
    monthlyCycles: monthlyCycles.filter((c) => c.weeksComplete > 0 || c.notesExist),
    quarterlyCycles: quarterlyCycles.filter((c) => c.monthsComplete > 0 || c.notesExist),
    halfYearlyCycles: halfYearlyCycles.filter((c) => c.quartersComplete > 0 || c.notesExist),
    yearlyCycles: yearlyCycles.filter((c) => c.halvesComplete > 0 || c.notesExist),
  }
}
