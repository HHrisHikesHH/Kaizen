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

  // KNOWN DEFECT (found while writing these tests; belongs to the AI phase).
  // The quarterly, half-year and yearly parsers use a `for` loop whose
  // `continue` skips the line that ends a multi-line field. In the closing
  // format the letter is immediately followed by the user-facing reflection,
  // so that reflection is silently dropped. The weekly and monthly parsers use
  // a `while` loop and are not affected. These assertions describe the correct
  // behaviour; `it.fails` keeps the suite green until the AI phase fixes the
  // parsers, at which point `.fails` must be removed.
  it.fails('KNOWN DEFECT: quarterly keeps the reflection that follows the letter', () => {
    const r = parseQuarterlyNotes(`[KAIZEN QUARTERLY NOTES — COPY THIS BACK TO YOUR APP]
LETTER_TO_NEXT_QUARTER: Keep going.
USER_FACING_QUARTERLY_REFLECTION: A season.
[END KAIZEN QUARTERLY NOTES]`)
    expect(r).toMatchObject({ letterToNextQuarter: 'Keep going.', userFacingQuarterlyReflection: 'A season.' })
  })

  it.fails('KNOWN DEFECT: half-year keeps the reflection that follows the letter', () => {
    const r = parseHalfYearNotes(`[KAIZEN HALF-YEAR NOTES — COPY THIS BACK TO YOUR APP]
LETTER_TO_THE_NEXT_SIX_MONTHS: Onward.
USER_FACING_HALF_YEAR_REFLECTION: Six months.
[END KAIZEN HALF-YEAR NOTES]`)
    expect(r).toMatchObject({ letterToTheNextSixMonths: 'Onward.', userFacingHalfYearReflection: 'Six months.' })
  })

  it.fails('KNOWN DEFECT: yearly keeps the reflection that follows the letter', () => {
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
