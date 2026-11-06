/**
 * Regression tests for audit P0-1: day keys were derived from UTC
 * (toISOString) instead of the user's local calendar date.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import * as dates from '../../src/utils/dateHelpers.js'
import { getTodayDateString } from '../../src/utils/dailyEntry.js'
import { TZ, wallClockKey } from '../support/time.js'

afterEach(() => {
  vi.useRealTimers()
})

function atLocal(...parts) {
  // new Date(y, m, d, h, min) is interpreted in the process timezone, i.e. a wall-clock time.
  return new Date(...parts)
}

describe(`local date keys (TZ=${TZ})`, () => {
  it('A: an entry at 11:30 PM on Nov 6 2026 uses 2026-11-06', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(atLocal(2026, 10, 6, 23, 30))
    expect(getTodayDateString()).toBe('2026-11-06')
  })

  it('B: an entry at 1:00 AM on Nov 6 2026 uses 2026-11-06', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(atLocal(2026, 10, 6, 1, 0))
    expect(getTodayDateString()).toBe('2026-11-06')
  })

  it.runIf(TZ === 'America/Los_Angeles')('A (explicit instant): 2026-11-07T07:30Z is Nov 6 in Los Angeles', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-07T07:30:00Z'))
    expect(getTodayDateString()).toBe('2026-11-06')
  })

  it.runIf(TZ === 'Asia/Kolkata')('B (explicit instant): 2026-11-05T19:30Z is Nov 6 in India', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-05T19:30:00Z'))
    expect(getTodayDateString()).toBe('2026-11-06')
  })

  it('toDateString of a local midnight is that local date', () => {
    expect(dates.toDateString(atLocal(2026, 10, 6))).toBe('2026-11-06')
    expect(dates.toDateString(atLocal(2027, 0, 1))).toBe('2027-01-01')
  })

  it('toDateString matches the wall-clock date for every hour of 2026 (covers DST changes)', () => {
    const mismatches = []
    const start = Date.UTC(2026, 0, 1)
    for (let h = 0; h < 366 * 24; h++) {
      const instant = new Date(start + h * 3600_000)
      const expected = wallClockKey(instant)
      const actual = dates.toDateString(instant)
      if (actual !== expected) mismatches.push(`${instant.toISOString()} → ${actual} (wall clock ${expected})`)
    }
    expect(mismatches.slice(0, 5)).toEqual([])
  })

  it('isToday compares local calendar dates', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(atLocal(2026, 10, 6, 23, 30))
    expect(dates.isToday(atLocal(2026, 10, 6, 0, 5))).toBe(true)
    expect(dates.isToday(atLocal(2026, 10, 7, 0, 5))).toBe(false)
  })

  it('weekday names follow the local calendar', () => {
    expect(dates.getDayOfWeek(atLocal(2026, 10, 6, 23, 30))).toBe('Friday')
    expect(dates.getDayOfWeek(atLocal(2026, 10, 6, 0, 30))).toBe('Friday')
    expect(dates.getDayOfWeek(atLocal(2027, 0, 3, 12))).toBe('Sunday')
  })
})

describe(`centralized local date API (TZ=${TZ})`, () => {
  it('toLocalDateKey matches the wall clock for every hour of 2026', () => {
    const mismatches = []
    const start = Date.UTC(2026, 0, 1)
    for (let h = 0; h < 366 * 24; h++) {
      const instant = new Date(start + h * 3600_000)
      if (dates.toLocalDateKey(instant) !== wallClockKey(instant)) mismatches.push(instant.toISOString())
    }
    expect(mismatches.slice(0, 5)).toEqual([])
  })

  it('getTodayKey uses the local calendar date', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(atLocal(2026, 10, 6, 23, 30))
    expect(dates.getTodayKey()).toBe('2026-11-06')
    vi.setSystemTime(atLocal(2026, 10, 6, 1, 0))
    expect(dates.getTodayKey()).toBe('2026-11-06')
  })

  it('parseLocalDateKey round-trips and lands on the local calendar day', () => {
    for (const key of ['2026-11-06', '2026-03-08', '2026-11-01', '2026-04-05', '2026-09-27', '2027-01-03', '2024-02-29']) {
      const d = dates.parseLocalDateKey(key)
      expect(dates.toLocalDateKey(d)).toBe(key)
      expect(wallClockKey(d)).toBe(key)
    }
  })

  it('addLocalDays moves by calendar days across DST changes', () => {
    const start = dates.parseLocalDateKey('2026-03-07')
    const keys = Array.from({ length: 4 }, (_, i) => dates.toLocalDateKey(dates.addLocalDays(start, i)))
    expect(keys).toEqual(['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10'])
    const nz = dates.parseLocalDateKey('2026-09-26')
    expect(dates.toLocalDateKey(dates.addLocalDays(nz, 1))).toBe('2026-09-27')
    expect(dates.toLocalDateKey(dates.addLocalDays(nz, 2))).toBe('2026-09-28')
  })

  it('rejects malformed date keys', () => {
    expect(() => dates.parseLocalDateKey('2026-13-01')).toThrow(RangeError)
    expect(() => dates.parseLocalDateKey('2026-02-30')).toThrow(RangeError)
    expect(() => dates.parseLocalDateKey('6/11/2026')).toThrow(RangeError)
  })
})
