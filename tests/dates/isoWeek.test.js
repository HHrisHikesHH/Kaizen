/**
 * Regression tests for audit P0-3: the app paired the ISO week number with the
 * calendar year (getFullYear), which breaks around New Year, and capped weeks at 52.
 */
import { describe, it, expect } from 'vitest'
import * as dates from '../../src/utils/dateHelpers.js'
import { TZ, wallClockKey, consecutiveKeys } from '../support/time.js'

// [local date, isoYear, isoWeek] — independently known ISO 8601 values.
const KNOWN = [
  ['2026-11-06', 2026, 45],
  ['2026-12-28', 2026, 53],
  ['2026-12-31', 2026, 53],
  ['2027-01-01', 2026, 53],
  ['2027-01-03', 2026, 53],
  ['2027-01-04', 2027, 1],
  ['2025-12-29', 2026, 1],
  ['2026-01-01', 2026, 1],
  ['2026-01-04', 2026, 1],
  ['2024-12-30', 2025, 1],
  ['2025-12-28', 2025, 52],
  ['2023-01-01', 2022, 52],
  ['2020-12-31', 2020, 53],
  ['2021-01-03', 2020, 53],
  ['2010-01-03', 2009, 53],
  ['2024-02-29', 2024, 9],
]

function local(key, h = 12, min = 0) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, h, min)
}

describe(`ISO weeks (TZ=${TZ})`, () => {
  describe('existing getWeekNumber (week number only)', () => {
    it.each(KNOWN)('%s is week %i-W%i', (key, _isoYear, isoWeek) => {
      expect(dates.getWeekNumber(local(key, 0, 0))).toBe(isoWeek)
      expect(dates.getWeekNumber(local(key, 23, 59))).toBe(isoWeek)
    })
  })

  describe('getISOWeek returns { isoYear, isoWeek }', () => {
    it.each(KNOWN)('%s → %i-W%i at any time of day', (key, isoYear, isoWeek) => {
      for (const [h, m] of [[0, 0], [1, 0], [12, 0], [23, 30], [23, 59]]) {
        expect(dates.getISOWeek(local(key, h, m))).toEqual({ isoYear, isoWeek })
      }
    })

    it('D: Sunday January 3, 2027 resolves to 2026-W53', () => {
      expect(dates.getISOWeek(local('2027-01-03', 10))).toEqual({ isoYear: 2026, isoWeek: 53 })
    })
  })

  describe('weeks per ISO year', () => {
    it.each([
      [2015, 53], [2020, 53], [2026, 53], [2032, 53],
      [2021, 52], [2024, 52], [2025, 52], [2027, 52],
    ])('%i has %i weeks', (year, n) => {
      expect(dates.getISOWeeksInYear(year)).toBe(n)
    })
  })

  describe('week boundaries', () => {
    it('E: 2026-W53 begins Monday Dec 28 2026 and covers Dec 28 – Jan 3', () => {
      const start = dates.getISOWeekStart(2026, 53)
      const end = dates.getISOWeekEnd(2026, 53)
      expect(wallClockKey(start)).toBe('2026-12-28')
      expect(dates.getDayOfWeek(start)).toBe('Monday')
      expect(wallClockKey(end)).toBe('2027-01-03')
      expect(dates.getDayOfWeek(end)).toBe('Sunday')
      expect(dates.getISOWeekDateKeys(2026, 53)).toEqual(consecutiveKeys('2026-12-28', 7))
    })

    it('practice week (Mon–Sat) of 2026-W53 is Dec 28 – Jan 2', () => {
      const { start, end } = dates.getWeekDateRange(2026, 53)
      expect(wallClockKey(start)).toBe('2026-12-28')
      expect(wallClockKey(end)).toBe('2027-01-02')
      expect(dates.getDatesForWeek(2026, 53).map(wallClockKey)).toEqual(consecutiveKeys('2026-12-28', 6))
    })

    it('every week from 2009 to 2033 is 7 contiguous days starting on Monday', () => {
      const problems = []
      let prevEndKey = null
      for (let y = 2009; y <= 2033; y++) {
        const n = dates.getISOWeeksInYear(y)
        for (let w = 1; w <= n; w++) {
          const keys = dates.getISOWeekDateKeys(y, w)
          if (keys.length !== 7) problems.push(`${y}-W${w} has ${keys.length} days`)
          if (dates.getDayOfWeek(dates.parseLocalDateKey(keys[0])) !== 'Monday') problems.push(`${y}-W${w} starts ${keys[0]}`)
          if (prevEndKey && consecutiveKeys(prevEndKey, 2)[1] !== keys[0]) problems.push(`gap before ${y}-W${w}`)
          for (const k of keys) {
            const got = dates.getISOWeek(dates.parseLocalDateKey(k))
            if (got.isoYear !== y || got.isoWeek !== w) problems.push(`${k} → ${got.isoYear}-W${got.isoWeek}, expected ${y}-W${w}`)
          }
          prevEndKey = keys[6]
        }
      }
      expect(problems.slice(0, 5)).toEqual([])
    })

    it('rejects weeks that do not exist', () => {
      expect(() => dates.getISOWeekStart(2025, 53)).toThrow(RangeError)
      expect(() => dates.getISOWeekStart(2026, 0)).toThrow(RangeError)
      expect(() => dates.getISOWeekStart(2026, 54)).toThrow(RangeError)
    })
  })

  describe('F: navigating between weeks', () => {
    const w = (isoYear, isoWeek) => ({ isoYear, isoWeek })

    it('reaches week 53 and continues into the next year', () => {
      expect(dates.shiftISOWeek(w(2026, 52), 1)).toEqual(w(2026, 53))
      expect(dates.shiftISOWeek(w(2026, 53), 1)).toEqual(w(2027, 1))
      expect(dates.shiftISOWeek(w(2026, 52), 2)).toEqual(w(2027, 1))
    })

    it('goes back from week 1 to the previous year’s last week (52 or 53)', () => {
      expect(dates.shiftISOWeek(w(2027, 1), -1)).toEqual(w(2026, 53))
      expect(dates.shiftISOWeek(w(2026, 1), -1)).toEqual(w(2025, 52))
      expect(dates.shiftISOWeek(w(2021, 1), -1)).toEqual(w(2020, 53))
    })

    it('handles identity and long jumps', () => {
      expect(dates.shiftISOWeek(w(2026, 45), 0)).toEqual(w(2026, 45))
      expect(dates.shiftISOWeek(w(2026, 45), 105)).toEqual(w(2028, 45))
      expect(dates.shiftISOWeek(w(2028, 45), -105)).toEqual(w(2026, 45))
    })

    it('compares weeks chronologically', () => {
      expect(dates.compareISOWeeks(w(2026, 53), w(2027, 1))).toBeLessThan(0)
      expect(dates.compareISOWeeks(w(2027, 1), w(2026, 53))).toBeGreaterThan(0)
      expect(dates.compareISOWeeks(w(2026, 45), w(2026, 45))).toBe(0)
    })
  })
})
