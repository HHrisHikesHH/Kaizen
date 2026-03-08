/**
 * Parse [KAIZEN HALF-YEAR NOTES] block from pasted text.
 */

const START_MARKER = '[KAIZEN HALF-YEAR NOTES — COPY THIS BACK TO YOUR APP]'
const END_MARKER = '[END KAIZEN HALF-YEAR NOTES]'

const FIELD_TO_KEY = {
  PERIOD: 'period',
  YEAR: 'year',
  WHO_ARRIVED_AT_THE_START: 'whoArrivedAtTheStart',
  WHO_IS_HERE_NOW: 'whoIsHereNow',
  WHAT_GENUINELY_CHANGED: 'whatGenuinelyChanged',
  WHAT_REMAINED_UNCHANGED: 'whatRemainedUnchanged',
  THE_DEEPEST_PATTERN_SO_FAR: 'theDeepestPatternSoFar',
  WHAT_THIS_HALF_YEAR_ASKED: 'whatThisHalfYearAsked',
  WHAT_THE_SECOND_HALF_NEEDS: 'whatTheSecondHalfNeeds',
  LETTER_TO_THE_NEXT_SIX_MONTHS: 'letterToTheNextSixMonths',
  USER_FACING_HALF_YEAR_REFLECTION: 'userFacingHalfYearReflection',
}

const MULTI_LINE = new Set(['LETTER_TO_THE_NEXT_SIX_MONTHS', 'USER_FACING_HALF_YEAR_REFLECTION'])

export function parseHalfYearNotes(rawText) {
  const raw = (rawText || '').trim()
  const startIdx = raw.indexOf(START_MARKER)
  const endIdx = raw.indexOf(END_MARKER)

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return { error: "The half-year notes block wasn't found in what you pasted." }
  }

  const block = raw.slice(startIdx + START_MARKER.length, endIdx).trim()
  const lines = block.split(/\r?\n/)
  const result = {
    period: '',
    year: '',
    whoArrivedAtTheStart: '',
    whoIsHereNow: '',
    whatGenuinelyChanged: '',
    whatRemainedUnchanged: '',
    theDeepestPatternSoFar: '',
    whatThisHalfYearAsked: '',
    whatTheSecondHalfNeeds: '',
    letterToTheNextSixMonths: '',
    userFacingHalfYearReflection: '',
  }

  let currentMultiLine = null
  let multiLineBuffer = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fieldMatch = line.match(/^([A-Z_]+):\s*(.*)$/)
    const isKnown = fieldMatch && FIELD_TO_KEY[fieldMatch[1]]

    if (currentMultiLine) {
      if (isKnown) {
        result[FIELD_TO_KEY[currentMultiLine]] = multiLineBuffer.join('\n').trim()
        currentMultiLine = null
        multiLineBuffer = []
        continue
      }
      multiLineBuffer.push(line)
      continue
    }

    if (fieldMatch && FIELD_TO_KEY[fieldMatch[1]]) {
      const key = FIELD_TO_KEY[fieldMatch[1]]
      const value = fieldMatch[2].trim()
      if (MULTI_LINE.has(fieldMatch[1])) {
        currentMultiLine = fieldMatch[1]
        multiLineBuffer = [value]
      } else {
        result[key] = value
        if (key === 'year' && /^\d+$/.test(value)) result[key] = parseInt(value, 10)
      }
    }
  }

  if (currentMultiLine) {
    result[FIELD_TO_KEY[currentMultiLine]] = multiLineBuffer.join('\n').trim()
  }

  return result
}
