/**
 * Callers of the date engine that read stored files by ISO week, plus the
 * compatibility guarantees for legacy (year, week) pairs.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import * as dates from '../../src/utils/dateHelpers.js'
import { detectAvailableCycles } from '../../src/utils/cycleDetector.js'
import { generateMonthlyPackage } from '../../src/utils/generateMonthlyPackage.js'
import { createFakeFileSystem } from '../support/fakeFileSystem.js'
import { TZ, wallClockKey, consecutiveKeys } from '../support/time.js'

afterEach(() => vi.useRealTimers())

describe(`week lookups by month (TZ=${TZ})`, () => {
  it('counts the Sunday of 2026-W53 (Jan 3 2027) toward January 2027', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2027, 1, 15, 12))
    const fs = createFakeFileSystem({
      files: { '2026/week-53-sunday.json': { year: 2026, weekNumber: 53, eveningComplete: true } },
    })
    const { monthlyCycles } = await detectAvailableCycles(fs.root)
    const jan = monthlyCycles.find((c) => c.year === 2027 && c.month === 1)
    expect(jan?.weeksComplete).toBe(1)
  })

  it('still counts mid-year Sundays from their existing files', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 20, 12))
    const fs = createFakeFileSystem({
      files: {
        '2026/week-45-sunday.json': { eveningComplete: true }, // Sunday Nov 8
        '2026/week-46-sunday.json': { eveningComplete: true }, // Sunday Nov 15
      },
    })
    const { monthlyCycles } = await detectAvailableCycles(fs.root)
    expect(monthlyCycles.find((c) => c.year === 2026 && c.month === 11)?.weeksComplete).toBe(2)
  })

  it('the January 2027 package reads the 2026-W53 summary', async () => {
    const fs = createFakeFileSystem({
      files: {
        '2026/week-53-summary.json': {
          weekNumber: 53,
          year: 2026,
          daysLogged: 5,
          moodSequence: ['calm'],
          closingWords: ['still'],
          habitSummary: {},
          journalEntries: [],
        },
      },
    })
    const text = await generateMonthlyPackage(2027, 1, fs.root)
    expect(text).toContain('Weeks 53 through')
    expect(text).toMatch(/Days present: 5 of/)
  })
})

describe(`compatibility helpers (TZ=${TZ})`, () => {
  it('getWeekDateKeysContaining returns the Mon–Sun keys around a date', () => {
    expect(dates.getWeekDateKeysContaining('2027-01-01')).toEqual(consecutiveKeys('2026-12-28', 7))
    expect(dates.getWeekDateKeysContaining(new Date(2026, 10, 6, 23, 30))).toEqual(consecutiveKeys('2026-11-02', 7))
  })

  it('legacy out-of-range (year, week) pairs still render instead of throwing', () => {
    // e.g. a record saved by the old code as year=2027, week=53
    expect(() => dates.getWeekDateRange(2027, 53)).not.toThrow()
    expect(() => dates.getDatesForWeek(2025, 53)).not.toThrow()
  })

  it('existing week ranges are unchanged for ordinary weeks', () => {
    const { start, end } = dates.getWeekDateRange(2026, 45)
    expect(wallClockKey(start)).toBe('2026-11-02')
    expect(wallClockKey(end)).toBe('2026-11-07')
  })

  it('display helpers read date keys as local dates', () => {
    expect(dates.formatDateForDisplay('2026-11-06')).toBe('Friday, the 6th of November')
    expect(dates.formatDateShort('2026-11-06')).toBe('6 Nov')
    expect(dates.getDayOfWeek('2026-11-06')).toBe('Friday')
    expect(dates.getDayFileName(new Date(2026, 10, 6, 23, 30))).toBe('2026-11-06.json')
  })
})
