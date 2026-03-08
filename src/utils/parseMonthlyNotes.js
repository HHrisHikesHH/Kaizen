/**
 * Parse the [KAIZEN MONTHLY NOTES] block from pasted text.
 */

const START_MARKER = '[KAIZEN MONTHLY NOTES — COPY THIS BACK TO YOUR APP]'
const END_MARKER = '[END KAIZEN MONTHLY NOTES]'

const FIELD_TO_KEY = {
  MONTH: 'month',
  YEAR: 'year',
  EMOTIONAL_SEASON: 'emotionalSeason',
  DOMINANT_PATTERN: 'dominantPattern',
  WHAT_IS_INTEGRATING: 'whatIsIntegrating',
  WHAT_IS_STILL_RESISTED: 'whatIsStillResisted',
  LANGUAGE_EVOLUTION: 'languageEvolution',
  MONTH_IN_ONE_SENTENCE: 'monthInOneSentence',
  CARRY_INTO_NEXT_MONTH: 'carryIntoNextMonth',
  LETTER_TO_NEXT_MONTH: 'letterToNextMonth',
  USER_FACING_MONTHLY_REFLECTION: 'userFacingMonthlyReflection',
}

const MULTI_LINE = new Set(['LETTER_TO_NEXT_MONTH', 'USER_FACING_MONTHLY_REFLECTION'])

export function parseMonthlyNotes(rawText) {
  const raw = (rawText || '').trim()
  const startIdx = raw.indexOf(START_MARKER)
  const endIdx = raw.indexOf(END_MARKER)

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return {
      error:
        "The monthly notes block wasn't found. Paste the section that starts with [KAIZEN MONTHLY NOTES — COPY THIS BACK TO YOUR APP] and ends with [END KAIZEN MONTHLY NOTES].",
    }
  }

  const block = raw.slice(startIdx + START_MARKER.length, endIdx).trim()
  const lines = block.split(/\r?\n/)
  const result = {
    month: '',
    year: '',
    emotionalSeason: '',
    dominantPattern: '',
    whatIsIntegrating: '',
    whatIsStillResisted: '',
    languageEvolution: '',
    monthInOneSentence: '',
    carryIntoNextMonth: '',
    letterToNextMonth: '',
    userFacingMonthlyReflection: '',
  }

  let i = 0
  let currentMultiLine = null
  let multiLineBuffer = []

  while (i < lines.length) {
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
      i++
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
        if (key === 'month' && /^\d+$/.test(value)) result[key] = parseInt(value, 10)
        if (key === 'year' && /^\d+$/.test(value)) result[key] = parseInt(value, 10)
      }
    }
    i++
  }

  if (currentMultiLine) {
    result[FIELD_TO_KEY[currentMultiLine]] = multiLineBuffer.join('\n').trim()
  }

  return result
}
