/**
 * Generate yearly reflection context from all quarterly and monthly notes and weekly summaries for the year.
 */

import { getQuarterlyNotes, getMonthlyNotes } from './aiNotesManager'

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

export async function generateYearlyPackage(year, folderHandle) {
  const quarters = await Promise.all(
    [1, 2, 3, 4].map((q) => getQuarterlyNotes(q, year, folderHandle))
  )
  if (quarters.some((q) => !q)) return null

  const memory = await readMemoryFile(folderHandle)

  const lines = []
  lines.push('════════════════════════════════════════════════')
  lines.push('KAIZEN — YEARLY REFLECTION')
  lines.push(`${year} · A full year of honest practice.`)
  lines.push('')
  lines.push('This is the most comprehensive context this app generates.')
  lines.push('It contains an entire year of observation.')
  lines.push('Read it before the conversation.')
  lines.push('Arrive with reverence.')
  lines.push('This person has shown up, night after night, for a year.')
  lines.push('Whatever you witness here — honour it.')
  if (memory?.practitionerName) lines.push(`Practitioner: ${memory.practitionerName}`)
  lines.push('════════════════════════════════════════════════')
  lines.push('')
  lines.push('WHO YOU ARE IN THIS CONVERSATION')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('A full year.')
  lines.push('This conversation is unlike the others.')
  lines.push('Do not look for weekly patterns or monthly seasons.')
  lines.push('Look for the arc of the whole year — who this person was in January,')
  lines.push('who they are now.')
  lines.push('What beliefs did they hold in January that have quietly dissolved?')
  lines.push('What fears surfaced repeatedly?')
  lines.push('What strengths emerged that they haven\'t fully claimed?')
  lines.push('What does this year say about the direction of this life?')
  lines.push('')
  lines.push('This is the conversation that mirrors a year of practice.')
  lines.push('Hold it with everything you have.')
  lines.push('')

  const quarterSummaries = quarters.map((n, i) => ({ quarter: i + 1, notes: n }))
  lines.push('QUARTERLY REFLECTIONS THIS YEAR')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  quarterSummaries.forEach(({ quarter, notes }) => {
    lines.push(`Q${quarter}: ${(notes.userFacingQuarterlyReflection || '').slice(0, 200)}…`)
  })
  lines.push('')

  const monthSummaries = []
  for (let m = 1; m <= 12; m++) {
    const n = await getMonthlyNotes(m, year, folderHandle)
    if (n?.userFacingMonthlyReflection) {
      monthSummaries.push({ month: m, notes: n })
    }
  }
  if (monthSummaries.length > 0) {
    lines.push('MONTHLY REFLECTIONS (condensed)')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    monthSummaries.forEach(({ month, notes }) => {
      const name = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long' })
      lines.push(`${name}: ${(notes.userFacingMonthlyReflection || '').slice(0, 120)}…`)
    })
    lines.push('')
  }

  lines.push('════════════════════════════════════════════════')
  lines.push('REQUIRED CLOSING FORMAT')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('[KAIZEN YEARLY NOTES — COPY THIS BACK TO YOUR APP]')
  lines.push('YEAR:')
  lines.push('THE_YEAR_IN_ONE_SENTENCE:')
  lines.push('WHO_ARRIVED_IN_JANUARY:')
  lines.push('WHO_IS_HERE_NOW:')
  lines.push('THE_DEEPEST_TRANSFORMATION:')
  lines.push('THE_STUBBORN_PATTERN:')
  lines.push('THE_UNCLAIMED_STRENGTH:')
  lines.push('THE_YEAR_S_QUESTION:')
  lines.push('WHAT_THIS_YEAR_WAS_REALLY_ABOUT:')
  lines.push('WHAT_THE_NEXT_YEAR_IS_CALLING_FOR:')
  lines.push('LETTER_TO_THE_NEXT_YEAR:')
  lines.push('USER_FACING_YEARLY_REFLECTION:')
  lines.push('[END KAIZEN YEARLY NOTES]')
  lines.push('')
  lines.push('USER_FACING_YEARLY_REFLECTION: The most important piece of writing in the app.')
  lines.push('8-10 sentences. Second person. Written as if from someone who has watched you')
  lines.push('for an entire year with complete attention and care. Not about habits. About the person.')
  lines.push('════════════════════════════════════════════════')

  return lines.join('\n')
}
