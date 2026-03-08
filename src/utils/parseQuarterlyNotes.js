/**
 * Parse [KAIZEN QUARTERLY NOTES] block from pasted text.
 */

const START_MARKER = '[KAIZEN QUARTERLY NOTES — COPY THIS BACK TO YOUR APP]'
const END_MARKER = '[END KAIZEN QUARTERLY NOTES]'

const FIELD_TO_KEY = {
  QUARTER: 'quarter',
  YEAR: 'year',
  THE_SEASON_IN_ONE_SENTENCE: 'theSeasonInOneSentence',
  WHAT_BEGAN_THIS_QUARTER: 'whatBeganThisQuarter',
  WHAT_COMPLETED_THIS_QUARTER: 'whatCompletedThisQuarter',
  WHAT_TRANSFORMED: 'whatTransformed',
  SHADOW_PATTERN: 'shadowPattern',
  EMERGING_STRENGTH: 'emergingStrength',
  CARRY_INTO_NEXT_QUARTER: 'carryIntoNextQuarter',
  LETTER_TO_NEXT_QUARTER: 'letterToNextQuarter',
  USER_FACING_QUARTERLY_REFLECTION: 'userFacingQuarterlyReflection',
}

const MULTI_LINE = new Set(['LETTER_TO_NEXT_QUARTER', 'USER_FACING_QUARTERLY_REFLECTION'])

export function parseQuarterlyNotes(rawText) {
  const raw = (rawText || '').trim()
  const startIdx = raw.indexOf(START_MARKER)
  const endIdx = raw.indexOf(END_MARKER)

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return { error: "The quarterly notes block wasn't found in what you pasted." }
  }

  const block = raw.slice(startIdx + START_MARKER.length, endIdx).trim()
  const lines = block.split(/\r?\n/)
  const result = {
    quarter: '',
    year: '',
    theSeasonInOneSentence: '',
    whatBeganThisQuarter: '',
    whatCompletedThisQuarter: '',
    whatTransformed: '',
    shadowPattern: '',
    emergingStrength: '',
    carryIntoNextQuarter: '',
    letterToNextQuarter: '',
    userFacingQuarterlyReflection: '',
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
        if (key === 'quarter' && /^[1-4]$/.test(value)) result[key] = parseInt(value, 10)
        if (key === 'year' && /^\d+$/.test(value)) result[key] = parseInt(value, 10)
      }
    }
  }

  if (currentMultiLine) {
    result[FIELD_TO_KEY[currentMultiLine]] = multiLineBuffer.join('\n').trim()
  }

  return result
}
