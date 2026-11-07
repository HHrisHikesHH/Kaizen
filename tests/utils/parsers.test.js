import { describe, it, expect } from 'vitest'
import { parseSessionNotes } from '../../src/utils/parseSessionNotes.js'
import { parseMonthlyNotes } from '../../src/utils/parseMonthlyNotes.js'
import { parseQuarterlyNotes } from '../../src/utils/parseQuarterlyNotes.js'
import { parseHalfYearNotes } from '../../src/utils/parseHalfYearNotes.js'
import { parseYearlyNotes } from '../../src/utils/parseYearlyNotes.js'

const weekly = `Thank you for this conversation.

[KAIZEN SESSION NOTES — COPY THIS BACK TO YOUR APP]
WEEK: 45
DATE: 2026-11-08
EMOTIONAL_WEATHER: Mostly calm, a storm on Thursday.
WHAT_THEY_ARE_SITTING_WITH: Whether rest is allowed.
LANGUAGE_SHIFTS: Softer than last week.
INTENTION_VS_REALITY: Meant to read nightly; read twice.
MOMENT_OF_AWARENESS: Naming the tiredness.
PATTERN_NOTICED: Evenings drift after long calls.
WATCH_FOR_NEXT_WEEK: The hour after work.
ONE_QUESTION_I_AM_HOLDING: What does enough feel like?
LETTER_TO_NEXT_SESSION: Remember the Thursday.
They were gentle with themselves.
USER_FACING_REFLECTION: You noticed your tiredness
and did not argue with it.
[END KAIZEN NOTES]
Anything after the block is ignored.`

describe('parseSessionNotes', () => {
  it('parses every field, including multi-line ones', () => {
    const r = parseSessionNotes(weekly)
    expect(r.error).toBeUndefined()
    expect(r.weekNumber).toBe(45)
    expect(r.sessionDate).toBe('2026-11-08')
    expect(r.emotionalWeather).toBe('Mostly calm, a storm on Thursday.')
    expect(r.watchForNextWeek).toBe('The hour after work.')
    expect(r.letterToNextSession).toBe('Remember the Thursday.\nThey were gentle with themselves.')
    expect(r.userFacingReflection).toBe('You noticed your tiredness\nand did not argue with it.')
    expect(r.warning).toBeUndefined()
  })

  it('handles Windows line endings', () => {
    expect(parseSessionNotes(weekly.replace(/\n/g, '\r\n')).emotionalWeather).toBe('Mostly calm, a storm on Thursday.')
  })

  it('returns an error when the markers are missing', () => {
    expect(parseSessionNotes('just some text').error).toMatch(/notes block/)
    expect(parseSessionNotes('').error).toBeTruthy()
  })

  it('warns when most fields are empty', () => {
    const r = parseSessionNotes('[KAIZEN SESSION NOTES — COPY THIS BACK TO YOUR APP]\nUSER_FACING_REFLECTION: hi\n[END KAIZEN NOTES]')
    expect(r.userFacingReflection).toBe('hi')
    expect(r.warning).toBeTruthy()
  })

  // Audit P1 findings for the AI phase; not fixed in this phase.
  it.todo('tolerates markdown bold field names such as **WEEK:**')
  it.todo('tolerates a hyphen instead of an em dash in the start marker')
})

describe('longer-cycle parsers', () => {
  it('parses monthly notes', () => {
    const r = parseMonthlyNotes(`[KAIZEN MONTHLY NOTES — COPY THIS BACK TO YOUR APP]
MONTH: 10
YEAR: 2026
EMOTIONAL_SEASON: Late autumn.
USER_FACING_MONTHLY_REFLECTION: A month of
quiet return.
[END KAIZEN MONTHLY NOTES]`)
    expect(r).toMatchObject({ month: 10, year: 2026, emotionalSeason: 'Late autumn.', userFacingMonthlyReflection: 'A month of\nquiet return.' })
  })

  it('parses quarterly notes', () => {
    const r = parseQuarterlyNotes(`[KAIZEN QUARTERLY NOTES — COPY THIS BACK TO YOUR APP]
QUARTER: 3
YEAR: 2026
SHADOW_PATTERN: Late nights.
USER_FACING_QUARTERLY_REFLECTION: A season.
[END KAIZEN QUARTERLY NOTES]`)
    expect(r).toMatchObject({ quarter: 3, year: 2026, shadowPattern: 'Late nights.', userFacingQuarterlyReflection: 'A season.' })
  })

  // Regression tests for a fixed defect. The quarterly, half-year and yearly
  // parsers loop with `for`, and used to `continue` after closing a multi-line
  // field, so the line that ended it (in the closing format, the user-facing
  // reflection right after the letter) was skipped and silently dropped. The
  // weekly and monthly parsers use `while` and were never affected. These were
  // `it.fails` tests until the fix; their assertions are unchanged.
  it('quarterly keeps the reflection that follows the letter', () => {
    const r = parseQuarterlyNotes(`[KAIZEN QUARTERLY NOTES — COPY THIS BACK TO YOUR APP]
LETTER_TO_NEXT_QUARTER: Keep going.
USER_FACING_QUARTERLY_REFLECTION: A season.
[END KAIZEN QUARTERLY NOTES]`)
    expect(r).toMatchObject({ letterToNextQuarter: 'Keep going.', userFacingQuarterlyReflection: 'A season.' })
  })

  it('half-year keeps the reflection that follows the letter', () => {
    const r = parseHalfYearNotes(`[KAIZEN HALF-YEAR NOTES — COPY THIS BACK TO YOUR APP]
LETTER_TO_THE_NEXT_SIX_MONTHS: Onward.
USER_FACING_HALF_YEAR_REFLECTION: Six months.
[END KAIZEN HALF-YEAR NOTES]`)
    expect(r).toMatchObject({ letterToTheNextSixMonths: 'Onward.', userFacingHalfYearReflection: 'Six months.' })
  })

  it('yearly keeps the reflection that follows the letter', () => {
    const r = parseYearlyNotes(`[KAIZEN YEARLY NOTES — COPY THIS BACK TO YOUR APP]
LETTER_TO_THE_NEXT_YEAR: Dear next year.
USER_FACING_YEARLY_REFLECTION: A year.
[END KAIZEN YEARLY NOTES]`)
    expect(r).toMatchObject({ letterToTheNextYear: 'Dear next year.', userFacingYearlyReflection: 'A year.' })
  })

  it('monthly keeps the reflection that follows the letter', () => {
    const r = parseMonthlyNotes(`[KAIZEN MONTHLY NOTES — COPY THIS BACK TO YOUR APP]
LETTER_TO_NEXT_MONTH: Dear next month.
USER_FACING_MONTHLY_REFLECTION: A month.
[END KAIZEN MONTHLY NOTES]`)
    expect(r).toMatchObject({ letterToNextMonth: 'Dear next month.', userFacingMonthlyReflection: 'A month.' })
  })

  it('parses half-year notes', () => {
    const r = parseHalfYearNotes(`[KAIZEN HALF-YEAR NOTES — COPY THIS BACK TO YOUR APP]
PERIOD: H2
YEAR: 2026
USER_FACING_HALF_YEAR_REFLECTION: Six months.
[END KAIZEN HALF-YEAR NOTES]`)
    expect(r).toMatchObject({ period: 'H2', year: 2026, userFacingHalfYearReflection: 'Six months.' })
  })

  it('parses yearly notes', () => {
    const r = parseYearlyNotes(`[KAIZEN YEARLY NOTES — COPY THIS BACK TO YOUR APP]
YEAR: 2026
THE_YEAR_S_QUESTION: What stays?
USER_FACING_YEARLY_REFLECTION: A year.
[END KAIZEN YEARLY NOTES]`)
    expect(r).toMatchObject({ year: 2026, theYearsQuestion: 'What stays?', userFacingYearlyReflection: 'A year.' })
  })

  it('returns an error for each parser when its block is missing', () => {
    for (const parse of [parseMonthlyNotes, parseQuarterlyNotes, parseHalfYearNotes, parseYearlyNotes]) {
      expect(parse('nothing here').error).toBeTruthy()
    }
  })

  // Audit P0-6 belongs to the AI phase: filenames must come from the app, not these fields.
  it.todo('does not let MONTH/QUARTER/YEAR text decide where notes are saved')
})

// Regression tests for the multi-line fix in the quarterly, half-year and
// yearly parsers. Field order matches the closing format each package
// generator emits (generateQuarterlyPackage.js, generateHalfYearPackage.js,
// generateYearlyPackage.js).
const LONG_CYCLE_FORMATS = [
  {
    name: 'quarterly',
    parse: parseQuarterlyNotes,
    start: '[KAIZEN QUARTERLY NOTES — COPY THIS BACK TO YOUR APP]',
    end: '[END KAIZEN QUARTERLY NOTES]',
    letter: ['LETTER_TO_NEXT_QUARTER', 'letterToNextQuarter'],
    reflection: ['USER_FACING_QUARTERLY_REFLECTION', 'userFacingQuarterlyReflection'],
    fields: [
      ['QUARTER', '4', 'quarter', 4],
      ['YEAR', '2026', 'year', 2026],
      ['THE_SEASON_IN_ONE_SENTENCE', 'A slow, honest autumn.', 'theSeasonInOneSentence'],
      ['WHAT_BEGAN_THIS_QUARTER', 'Morning walks.', 'whatBeganThisQuarter'],
      ['WHAT_COMPLETED_THIS_QUARTER', 'The first notebook.', 'whatCompletedThisQuarter'],
      ['WHAT_TRANSFORMED', 'How evenings end.', 'whatTransformed'],
      ['SHADOW_PATTERN', 'Late nights.', 'shadowPattern'],
      ['EMERGING_STRENGTH', 'Patience.', 'emergingStrength'],
      ['CARRY_INTO_NEXT_QUARTER', 'The walks.', 'carryIntoNextQuarter'],
    ],
  },
  {
    name: 'half-year',
    parse: parseHalfYearNotes,
    start: '[KAIZEN HALF-YEAR NOTES — COPY THIS BACK TO YOUR APP]',
    end: '[END KAIZEN HALF-YEAR NOTES]',
    letter: ['LETTER_TO_THE_NEXT_SIX_MONTHS', 'letterToTheNextSixMonths'],
    reflection: ['USER_FACING_HALF_YEAR_REFLECTION', 'userFacingHalfYearReflection'],
    fields: [
      ['PERIOD', 'H2', 'period'],
      ['YEAR', '2026', 'year', 2026],
      ['WHO_ARRIVED_AT_THE_START', 'Someone in a hurry.', 'whoArrivedAtTheStart'],
      ['WHO_IS_HERE_NOW', 'Someone who pauses.', 'whoIsHereNow'],
      ['WHAT_GENUINELY_CHANGED', 'Sleep.', 'whatGenuinelyChanged'],
      ['WHAT_REMAINED_UNCHANGED', 'The love of books.', 'whatRemainedUnchanged'],
      ['THE_DEEPEST_PATTERN_SO_FAR', 'Rushing after calls.', 'theDeepestPatternSoFar'],
      ['WHAT_THIS_HALF_YEAR_ASKED', 'To slow down.', 'whatThisHalfYearAsked'],
      ['WHAT_THE_SECOND_HALF_NEEDS', 'Rest.', 'whatTheSecondHalfNeeds'],
    ],
  },
  {
    name: 'yearly',
    parse: parseYearlyNotes,
    start: '[KAIZEN YEARLY NOTES — COPY THIS BACK TO YOUR APP]',
    end: '[END KAIZEN YEARLY NOTES]',
    letter: ['LETTER_TO_THE_NEXT_YEAR', 'letterToTheNextYear'],
    reflection: ['USER_FACING_YEARLY_REFLECTION', 'userFacingYearlyReflection'],
    fields: [
      ['YEAR', '2026', 'year', 2026],
      ['THE_YEAR_IN_ONE_SENTENCE', 'A year of returning.', 'theYearInOneSentence'],
      ['WHO_ARRIVED_IN_JANUARY', 'A tired beginner.', 'whoArrivedInJanuary'],
      ['WHO_IS_HERE_NOW', 'A steadier practitioner.', 'whoIsHereNow'],
      ['THE_DEEPEST_TRANSFORMATION', 'Kindness to self.', 'theDeepestTransformation'],
      ['THE_STUBBORN_PATTERN', 'Overcommitting.', 'theStubbornPattern'],
      ['THE_UNCLAIMED_STRENGTH', 'Listening.', 'theUnclaimedStrength'],
      ['THE_YEAR_S_QUESTION', 'What is enough?', 'theYearsQuestion'],
      ['WHAT_THIS_YEAR_WAS_REALLY_ABOUT', 'Attention.', 'whatThisYearWasReallyAbout'],
      ['WHAT_THE_NEXT_YEAR_IS_CALLING_FOR', 'Depth.', 'whatTheNextYearIsCallingFor'],
    ],
  },
]

const MULTI_LINE_LETTER = 'Dear next one,\nremember the walks.\n\nGo gently.'
const MULTI_LINE_REFLECTION = 'You kept returning.\nThat was the practice.'

function closingBlock(fmt, { fields = fmt.fields, letter = MULTI_LINE_LETTER, reflection = MULTI_LINE_REFLECTION } = {}) {
  return [
    'Some conversation text before the block.',
    fmt.start,
    ...fields.map(([field, value]) => `${field}: ${value}`),
    `${fmt.letter[0]}: ${letter}`,
    `${fmt.reflection[0]}: ${reflection}`,
    fmt.end,
    'Anything after the block is ignored.',
  ].join('\n')
}

function expectedFields(fmt) {
  return Object.fromEntries(fmt.fields.map(([, value, key, parsed]) => [key, parsed ?? value]))
}

describe.each(LONG_CYCLE_FORMATS)('$name parser: multi-line fields', (fmt) => {
  it('keeps a multi-line letter and the multi-line reflection that follows it', () => {
    const r = fmt.parse(closingBlock(fmt))
    expect(r.error).toBeUndefined()
    expect(r[fmt.letter[1]]).toBe(MULTI_LINE_LETTER)
    expect(r[fmt.reflection[1]]).toBe(MULTI_LINE_REFLECTION)
  })

  it('fills every field of the full closing format, in generator order', () => {
    expect(fmt.parse(closingBlock(fmt))).toEqual({
      ...expectedFields(fmt),
      [fmt.letter[1]]: MULTI_LINE_LETTER,
      [fmt.reflection[1]]: MULTI_LINE_REFLECTION,
    })
  })

  it('gives the same result with Windows line endings', () => {
    const text = closingBlock(fmt)
    expect(fmt.parse(text.replace(/\n/g, '\r\n'))).toEqual(fmt.parse(text))
  })

  it('keeps a single-line field that comes after a multi-line field', () => {
    const r = fmt.parse([
      fmt.start,
      `${fmt.letter[0]}: First line.`,
      'Second line.',
      'YEAR: 2026',
      `${fmt.reflection[0]}: Closing.`,
      fmt.end,
    ].join('\n'))
    expect(r.year).toBe(2026)
    expect(r[fmt.letter[1]]).toBe('First line.\nSecond line.')
    expect(r[fmt.reflection[1]]).toBe('Closing.')
  })
})
