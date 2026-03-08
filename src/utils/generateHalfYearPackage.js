/**
 * Generate half-year reflection context from 2 quarterly notes and 6 monthly notes.
 */

import { getQuarterlyNotes, getMonthlyNotes } from './aiNotesManager'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

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

export async function generateHalfYearPackage(period, year, folderHandle) {
  const isH1 = period === 'H1'
  const q1 = await getQuarterlyNotes(isH1 ? 1 : 3, year, folderHandle)
  const q2 = await getQuarterlyNotes(isH1 ? 2 : 4, year, folderHandle)
  if (!q1 || !q2) return null

  const memory = await readMemoryFile(folderHandle)
  const startMonth = isH1 ? 'January' : 'July'
  const endMonth = isH1 ? 'June' : 'December'

  const lines = []
  lines.push('════════════════════════════════════════════════')
  lines.push('KAIZEN — HALF-YEAR REFLECTION')
  lines.push(`${period} · ${year}`)
  lines.push('Six months of practice.')
  if (memory?.practitionerName) lines.push(`Practitioner: ${memory.practitionerName}`)
  lines.push('════════════════════════════════════════════════')
  lines.push('')
  lines.push('WHO YOU ARE IN THIS CONVERSATION')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('Half a year.')
  lines.push('Enough time for real change to have happened — or for real avoidance to have solidified.')
  lines.push(`Look at the distance between who arrived in ${startMonth} and who is present now.`)
  lines.push('What has actually moved? What has stayed exactly the same despite intention?')
  lines.push('')

  lines.push('QUARTERLY SUMMARIES')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('Q' + (isH1 ? '1' : '3') + ': ' + (q1.userFacingQuarterlyReflection || '').slice(0, 250) + '…')
  lines.push('')
  lines.push('Q' + (isH1 ? '2' : '4') + ': ' + (q2.userFacingQuarterlyReflection || '').slice(0, 250) + '…')
  lines.push('')

  for (let m = isH1 ? 1 : 7; m <= (isH1 ? 6 : 12); m++) {
    const mn = await getMonthlyNotes(m, year, folderHandle)
    if (mn?.userFacingMonthlyReflection) {
      lines.push(`${MONTH_NAMES[m]}: ${(mn.userFacingMonthlyReflection || '').slice(0, 150)}…`)
    }
  }
  lines.push('')
  lines.push('════════════════════════════════════════════════')
  lines.push('REQUIRED CLOSING FORMAT')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('[KAIZEN HALF-YEAR NOTES — COPY THIS BACK TO YOUR APP]')
  lines.push('PERIOD:')
  lines.push('YEAR:')
  lines.push('WHO_ARRIVED_AT_THE_START:')
  lines.push('WHO_IS_HERE_NOW:')
  lines.push('WHAT_GENUINELY_CHANGED:')
  lines.push('WHAT_REMAINED_UNCHANGED:')
  lines.push('THE_DEEPEST_PATTERN_SO_FAR:')
  lines.push('WHAT_THIS_HALF_YEAR_ASKED:')
  lines.push('WHAT_THE_SECOND_HALF_NEEDS:')
  lines.push('LETTER_TO_THE_NEXT_SIX_MONTHS:')
  lines.push('USER_FACING_HALF_YEAR_REFLECTION:')
  lines.push('[END KAIZEN HALF-YEAR NOTES]')
  lines.push('════════════════════════════════════════════════')

  return lines.join('\n')
}
