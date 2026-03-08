/**
 * Parse [KAIZEN YEARLY NOTES] block from pasted text.
 */

const START_MARKER = '[KAIZEN YEARLY NOTES — COPY THIS BACK TO YOUR APP]'
const END_MARKER = '[END KAIZEN YEARLY NOTES]'

const FIELD_TO_KEY = {
  YEAR: 'year',
  THE_YEAR_IN_ONE_SENTENCE: 'theYearInOneSentence',
  WHO_ARRIVED_IN_JANUARY: 'whoArrivedInJanuary',
  WHO_IS_HERE_NOW: 'whoIsHereNow',
  THE_DEEPEST_TRANSFORMATION: 'theDeepestTransformation',
  THE_STUBBORN_PATTERN: 'theStubbornPattern',
  THE_UNCLAIMED_STRENGTH: 'theUnclaimedStrength',
  THE_YEAR_S_QUESTION: 'theYearsQuestion',
  WHAT_THIS_YEAR_WAS_REALLY_ABOUT: 'whatThisYearWasReallyAbout',
  WHAT_THE_NEXT_YEAR_IS_CALLING_FOR: 'whatTheNextYearIsCallingFor',
  LETTER_TO_THE_NEXT_YEAR: 'letterToTheNextYear',
  USER_FACING_YEARLY_REFLECTION: 'userFacingYearlyReflection',
}

const MULTI_LINE = new Set(['LETTER_TO_THE_NEXT_YEAR', 'USER_FACING_YEARLY_REFLECTION'])

export function parseYearlyNotes(rawText) {
  const raw = (rawText || '').trim()
  const startIdx = raw.indexOf(START_MARKER)
  const endIdx = raw.indexOf(END_MARKER)

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return { error: "The yearly notes block wasn't found in what you pasted." }
  }

  const block = raw.slice(startIdx + START_MARKER.length, endIdx).trim()
  const lines = block.split(/\r?\n/)
  const result = {
    year: '',
    theYearInOneSentence: '',
    whoArrivedInJanuary: '',
    whoIsHereNow: '',
    theDeepestTransformation: '',
    theStubbornPattern: '',
    theUnclaimedStrength: '',
    theYearsQuestion: '',
    whatThisYearWasReallyAbout: '',
    whatTheNextYearIsCallingFor: '',
    letterToTheNextYear: '',
    userFacingYearlyReflection: '',
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
