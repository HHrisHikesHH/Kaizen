/**
 * Parse the [KAIZEN SESSION NOTES] block from pasted text.
 */

const START_MARKER = '[KAIZEN SESSION NOTES — COPY THIS BACK TO YOUR APP]'
const END_MARKER = '[END KAIZEN NOTES]'

const FIELD_NAMES = [
  'WEEK',
  'DATE',
  'EMOTIONAL_WEATHER',
  'WHAT_THEY_ARE_SITTING_WITH',
  'LANGUAGE_SHIFTS',
  'INTENTION_VS_REALITY',
  'MOMENT_OF_AWARENESS',
  'PATTERN_NOTICED',
  'WATCH_FOR_NEXT_WEEK',
  'ONE_QUESTION_I_AM_HOLDING',
  'LETTER_TO_NEXT_SESSION',
  'USER_FACING_REFLECTION',
]

const MULTI_LINE_FIELDS = new Set(['LETTER_TO_NEXT_SESSION', 'USER_FACING_REFLECTION'])

const FIELD_TO_KEY = {
  WEEK: 'weekNumber',
  DATE: 'sessionDate',
  EMOTIONAL_WEATHER: 'emotionalWeather',
  WHAT_THEY_ARE_SITTING_WITH: 'whatTheyAreSittingWith',
  LANGUAGE_SHIFTS: 'languageShifts',
  INTENTION_VS_REALITY: 'intentionVsReality',
  MOMENT_OF_AWARENESS: 'momentOfAwareness',
  PATTERN_NOTICED: 'patternNoticed',
  WATCH_FOR_NEXT_WEEK: 'watchForNextWeek',
  ONE_QUESTION_I_AM_HOLDING: 'oneQuestionIAmHolding',
  LETTER_TO_NEXT_SESSION: 'letterToNextSession',
  USER_FACING_REFLECTION: 'userFacingReflection',
}

export function parseSessionNotes(rawText) {
  const raw = (rawText || '').trim()
  const startIdx = raw.indexOf(START_MARKER)
  const endIdx = raw.indexOf(END_MARKER)

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return {
      error:
        "The notes block wasn't found in what you pasted. Ask your AI companion to provide the closing format and paste that section here.",
    }
  }

  const block = raw.slice(startIdx + START_MARKER.length, endIdx).trim()
  const lines = block.split(/\r?\n/)
  const result = {
    weekNumber: '',
    sessionDate: '',
    emotionalWeather: '',
    whatTheyAreSittingWith: '',
    languageShifts: '',
    intentionVsReality: '',
    momentOfAwareness: '',
    patternNoticed: '',
    watchForNextWeek: '',
    oneQuestionIAmHolding: '',
    letterToNextSession: '',
    userFacingReflection: '',
  }

  let i = 0
  let currentMultiLine = null
  let multiLineBuffer = []

  while (i < lines.length) {
    const line = lines[i]
    const fieldMatch = line.match(/^([A-Z_]+):\s*(.*)$/)
    const isKnownField = fieldMatch && FIELD_TO_KEY[fieldMatch[1]]

    if (currentMultiLine) {
      if (isKnownField) {
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
      if (MULTI_LINE_FIELDS.has(fieldMatch[1])) {
        currentMultiLine = fieldMatch[1]
        multiLineBuffer = [value]
      } else {
        if (key === 'weekNumber' && /^\d+$/.test(value)) {
          result[key] = parseInt(value, 10)
        } else if (key === 'weekNumber') {
          result[key] = value
        } else {
          result[key] = value
        }
      }
    }
    i++
  }

  if (currentMultiLine) {
    result[FIELD_TO_KEY[currentMultiLine]] = multiLineBuffer.join('\n').trim()
  }

  const emptyCount = FIELD_NAMES.filter((f) => {
    const v = result[FIELD_TO_KEY[f]]
    return v === '' || v == null
  }).length
  if (emptyCount > 3) {
    result.warning = 'Some fields seem empty. The reflection will still be saved.'
  }

  return result
}
