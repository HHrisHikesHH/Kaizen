/**
 * Generate the monthly reflection context package from 4 week summaries and 4 weekly AI notes.
 */

import { getWeekSummary } from './aggregateWeek'
import { getSessionNotes } from './aiNotesManager'
import { getWeekDateRange, formatWeekRange } from './dateHelpers'

function getWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

/** Weeks whose Sunday falls in the given calendar month. */
function getWeeksInMonth(year, month) {
  const result = []
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const d = new Date(first)
  while (d <= last) {
    if (d.getDay() === 0) {
      const y = d.getFullYear()
      const weekNum = getWeekNumber(d)
      result.push({ year: y, weekNumber: weekNum })
    }
    d.setDate(d.getDate() + 1)
  }
  return result
}

async function readMemoryFile(folderHandle) {
  if (!folderHandle?.getFileHandle) return null
  try {
    const fileHandle = await folderHandle.getFileHandle('kaizen_memory.json', { create: false })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function readMonthlyNotes(folderHandle, month, year) {
  if (!folderHandle?.getDirectoryHandle) return null
  try {
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const mm = String(month).padStart(2, '0')
    const fileHandle = await aiDir.getFileHandle(`monthly-${mm}-${year}-notes.json`, { create: false })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export async function generateMonthlyPackage(year, month, folderHandle) {
  const weeks = getWeeksInMonth(year, month)
  if (weeks.length === 0) return null

  const summaries = []
  const notes = []
  for (const { year: y, weekNumber } of weeks) {
    const sum = await getWeekSummary(y, weekNumber, folderHandle)
    if (sum) summaries.push(sum)
    const n = await getSessionNotes(y, weekNumber, folderHandle)
    if (n) notes.push({ year: y, weekNumber, notes: n })
  }

  const memory = await readMemoryFile(folderHandle)
  const monthsPracticed = memory?.monthsPracticed ?? 1
  const practitionerName = memory?.practitionerName ?? memory?.name ?? null

  const monthName = MONTH_NAMES[month]
  const weekRange = summaries.length
    ? `Weeks ${summaries[0].weekNumber} through ${summaries[summaries.length - 1].weekNumber}`
    : ''

  const lines = []

  lines.push('════════════════════════════════════════════════')
  lines.push('KAIZEN — MONTHLY REFLECTION CONTEXT')
  lines.push(`${monthName} ${year} · ${weekRange}`)
  lines.push(`Months practiced: ${monthsPracticed}`)
  if (practitionerName) lines.push(`Practitioner: ${practitionerName}`)
  lines.push('════════════════════════════════════════════════')
  lines.push('')
  lines.push('WHO YOU ARE IN THIS CONVERSATION')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`You have been walking with this person for ${monthsPracticed} month(s).`)
  lines.push('This monthly session asks you to look across the whole month —')
  lines.push('not the individual weeks. Patterns that are invisible week')
  lines.push('to week may become visible here.')
  lines.push('What season did this month represent in their inner life?')
  lines.push('')

  const priorMonth = month === 1 ? 12 : month - 1
  const priorYear = month === 1 ? year - 1 : year
  const priorMonthly = await readMonthlyNotes(folderHandle, priorMonth, priorYear)
  if (priorMonthly && priorMonthly.userFacingMonthlyReflection) {
    lines.push('════════════════════════════════════════════════')
    lines.push('PRIOR MONTHLY NOTES')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push(priorMonthly.userFacingMonthlyReflection)
    if (priorMonthly.carryIntoNextMonth) lines.push('')
    if (priorMonthly.carryIntoNextMonth) lines.push('Carry into next month: ' + priorMonthly.carryIntoNextMonth)
    lines.push('')
  }

  lines.push('════════════════════════════════════════════════')
  lines.push('THIS MONTH — AGGREGATE')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  let totalDaysLogged = 0
  let totalPossible = 0
  const allMoods = []
  const allClosingWords = []
  let totalPages = 0
  let totalMinutes = 0
  const allJournalEntries = []
  const sundayReflections = []

  summaries.forEach((s) => {
    totalDaysLogged += s.daysLogged ?? 0
    totalPossible += 6
    if (s.moodSequence) allMoods.push(...s.moodSequence)
    if (s.closingWords) allClosingWords.push(...s.closingWords)
    const h = s.habitSummary || {}
    if (h.reading?.totalPages) totalPages += h.reading.totalPages
    if (h.meditation?.totalMinutes) totalMinutes += h.meditation.totalMinutes
    if (s.journalEntries) allJournalEntries.push(...s.journalEntries)
  })
  notes.forEach(({ notes: n }) => {
    if (n.userFacingReflection) sundayReflections.push(n.userFacingReflection)
  })

  lines.push('')
  lines.push(`Days present: ${totalDaysLogged} of ${totalPossible}`)
  lines.push('')
  lines.push('Mood sequence (all weeks, day by day):')
  lines.push(allMoods.map((m) => m || '—').join(' → '))
  lines.push('')
  lines.push('Closing words (all weeks):')
  lines.push(allClosingWords.map((w) => w || '—').join(' · '))
  lines.push('')
  lines.push(`Reading total: ${totalPages} pages`)
  lines.push(`Meditation total: ${totalMinutes} minutes`)
  lines.push('')
  lines.push(`Journal: ${allJournalEntries.length} entries this month.`)
  if (allJournalEntries.length > 0) {
    const totalWords = allJournalEntries.reduce((acc, j) => acc + (j.wordCount || 0), 0)
    lines.push(`Total words: ${totalWords}`)
    lines.push('')
    lines.push('Sample entries (first, middle, last):')
    const step = Math.max(1, Math.floor(allJournalEntries.length / 3))
    ;[0, step, allJournalEntries.length - 1].filter((i) => i < allJournalEntries.length).forEach((i) => {
      const j = allJournalEntries[i]
      lines.push(`--- ${j.dayOfWeek} ${j.date} (${j.wordCount || 0} words) ---`)
      lines.push((j.entry || '').slice(0, 400) + (j.entry?.length > 400 ? '…' : ''))
      lines.push('')
    })
  }
  lines.push('')
  lines.push('Sunday reflections from AI this month:')
  sundayReflections.forEach((r, i) => {
    lines.push(`Week ${i + 1}: ${(r || '').slice(0, 200)}${(r || '').length > 200 ? '…' : ''}`)
  })
  lines.push('')

  lines.push('WEEKLY NOTES SUMMARY (condensed)')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  notes.forEach(({ year: y, weekNumber, notes: n }, i) => {
    const { start } = getWeekDateRange(y, weekNumber)
    const range = formatWeekRange(start, new Date(start.getTime() + 5 * 86400000))
    lines.push(`Week ${weekNumber} (${range}):`)
    if (n.patternNoticed) lines.push(`  Pattern noticed: ${n.patternNoticed}`)
    if (n.watchForNextWeek) lines.push(`  Watch for: ${n.watchForNextWeek}`)
    if (n.letterToNextSession) lines.push(`  Letter: ${(n.letterToNextSession || '').slice(0, 150)}…`)
    lines.push('')
  })

  lines.push('════════════════════════════════════════════════')
  lines.push('MONTHLY SESSION GUIDANCE')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('This conversation looks for:')
  lines.push('- Patterns that only a month reveals')
  lines.push('- Emotional seasons — did this month have a consistent weather?')
  lines.push('- The gap between who they were on Week 1 and Week 4 of this month')
  lines.push('- Habits that are genuinely integrating vs habits still resisted')
  lines.push('- What their journal language is doing across 30 days')
  lines.push('- What they keep returning to — in their writing, in their struggles')
  lines.push('Do not summarize the weeks. Find what the weeks together reveal.')
  lines.push('')
  lines.push('════════════════════════════════════════════════')
  lines.push('REQUIRED CLOSING FORMAT')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('[KAIZEN MONTHLY NOTES — COPY THIS BACK TO YOUR APP]')
  lines.push('MONTH:')
  lines.push('YEAR:')
  lines.push('EMOTIONAL_SEASON:')
  lines.push('DOMINANT_PATTERN:')
  lines.push('WHAT_IS_INTEGRATING:')
  lines.push('WHAT_IS_STILL_RESISTED:')
  lines.push('LANGUAGE_EVOLUTION:')
  lines.push('MONTH_IN_ONE_SENTENCE:')
  lines.push('CARRY_INTO_NEXT_MONTH:')
  lines.push('LETTER_TO_NEXT_MONTH:')
  lines.push('USER_FACING_MONTHLY_REFLECTION:')
  lines.push('[END KAIZEN MONTHLY NOTES]')
  lines.push('')
  lines.push('USER_FACING_MONTHLY_REFLECTION: Warmer and wider than the weekly reflection.')
  lines.push('4-6 sentences. Second person. Not about what they did — about who they are becoming.')
  lines.push('Written as if looking at someone from a distance with great care.')
  lines.push('════════════════════════════════════════════════')

  return lines.join('\n')
}
