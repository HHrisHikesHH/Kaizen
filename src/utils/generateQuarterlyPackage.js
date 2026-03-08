/**
 * Generate quarterly reflection context from 3 monthly notes.
 */

import { getMonthlyNotes, getQuarterlyNotes } from './aiNotesManager'

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

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const QUARTER_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }

export async function generateQuarterlyPackage(quarter, year, folderHandle) {
  const months = QUARTER_MONTHS[quarter]
  const monthlyNotes = []
  for (const m of months) {
    const n = await getMonthlyNotes(m, year, folderHandle)
    if (n) monthlyNotes.push({ month: m, notes: n })
  }
  if (monthlyNotes.length < 3) return null

  const memory = await readMemoryFile(folderHandle)
  const startMonth = MONTH_NAMES[months[0]]
  const endMonth = MONTH_NAMES[months[2]]

  const lines = []
  lines.push('════════════════════════════════════════════════')
  lines.push('KAIZEN — QUARTERLY REFLECTION')
  lines.push(`Q${quarter} ${year} · ${startMonth} through ${endMonth}`)
  lines.push('A season of practice.')
  if (memory?.practitionerName) lines.push(`Practitioner: ${memory.practitionerName}`)
  lines.push('════════════════════════════════════════════════')
  lines.push('')
  lines.push('WHO YOU ARE IN THIS CONVERSATION')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('Three months. A season.')
  lines.push(`This conversation looks for the arc of a season — what began in ${startMonth},`)
  lines.push(`what shifted in ${MONTH_NAMES[months[1]]}, what arrived by ${endMonth}.`)
  lines.push('Seasons have their own logic. Find the logic of this one.')
  lines.push('')

  const priorQuarter = quarter === 1 ? 4 : quarter - 1
  const priorYear = quarter === 1 ? year - 1 : year
  const priorQuarterly = await getQuarterlyNotes(priorQuarter, priorYear, folderHandle)
  if (priorQuarterly?.letterToNextQuarter) {
    lines.push('PRIOR QUARTERLY NOTES')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push(priorQuarterly.letterToNextQuarter)
    lines.push('')
  }

  lines.push('THIS QUARTER — MONTHLY SUMMARIES')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  monthlyNotes.forEach(({ month, notes }) => {
    lines.push('')
    lines.push(`${MONTH_NAMES[month]}:`)
    lines.push(`  Emotional season: ${notes.emotionalSeason || '—'}`)
    lines.push(`  Dominant pattern: ${notes.dominantPattern || '—'}`)
    if (notes.userFacingMonthlyReflection) {
      lines.push(`  Reflection: ${(notes.userFacingMonthlyReflection || '').slice(0, 300)}…`)
    }
  })
  lines.push('')
  lines.push('════════════════════════════════════════════════')
  lines.push('REQUIRED CLOSING FORMAT')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('[KAIZEN QUARTERLY NOTES — COPY THIS BACK TO YOUR APP]')
  lines.push('QUARTER:')
  lines.push('YEAR:')
  lines.push('THE_SEASON_IN_ONE_SENTENCE:')
  lines.push('WHAT_BEGAN_THIS_QUARTER:')
  lines.push('WHAT_COMPLETED_THIS_QUARTER:')
  lines.push('WHAT_TRANSFORMED:')
  lines.push('SHADOW_PATTERN:')
  lines.push('EMERGING_STRENGTH:')
  lines.push('CARRY_INTO_NEXT_QUARTER:')
  lines.push('LETTER_TO_NEXT_QUARTER:')
  lines.push('USER_FACING_QUARTERLY_REFLECTION:')
  lines.push('[END KAIZEN QUARTERLY NOTES]')
  lines.push('════════════════════════════════════════════════')

  return lines.join('\n')
}
