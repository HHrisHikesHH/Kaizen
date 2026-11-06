import { describe, it, expect } from 'vitest'
import {
  defaultEntry,
  formatDateDisplay,
  getDayOfYear,
  readDailyEntry,
  writeDailyEntry,
} from '../../src/utils/dailyEntry.js'
import { JOURNAL_PROMPTS } from '../../src/utils/prompts.js'
import { createFakeFileSystem } from '../support/fakeFileSystem.js'
import { TZ } from '../support/time.js'

describe(`daily entry utilities (TZ=${TZ})`, () => {
  it('builds the default entry for a date key', () => {
    const e = defaultEntry('2026-11-06')
    expect(e.date).toBe('2026-11-06')
    expect(e.dayOfWeek).toBe('Friday')
    expect(e.sessionComplete).toBe(false)
    expect(Object.keys(e.habits)).toEqual(['eating', 'movement', 'reading', 'meditation', 'journaling'])
    expect(e.journal.prompt).toBe(JOURNAL_PROMPTS[getDayOfYear('2026-11-06') % JOURNAL_PROMPTS.length])
  })

  it.each([
    ['2026-01-01', 1],
    ['2026-11-06', 310],
    ['2026-12-31', 365],
    ['2024-12-31', 366],
    ['2026-03-09', 68],
  ])('day of year for %s is %i', (key, n) => {
    expect(getDayOfYear(key)).toBe(n)
  })

  it.each([
    ['2026-11-06', 'Friday, the 6th of November'],
    ['2026-11-01', 'Sunday, the 1st of November'],
    ['2026-11-02', 'Monday, the 2nd of November'],
    ['2026-11-03', 'Tuesday, the 3rd of November'],
    ['2026-11-11', 'Wednesday, the 11th of November'],
    ['2026-11-12', 'Thursday, the 12th of November'],
    ['2026-11-13', 'Friday, the 13th of November'],
    ['2026-11-21', 'Saturday, the 21st of November'],
    ['2026-11-22', 'Sunday, the 22nd of November'],
  ])('formats %s as "%s"', (key, text) => {
    expect(formatDateDisplay(key)).toBe(text)
  })

  it('writes to YYYY/MM/YYYY-MM-DD.json and reads it back', async () => {
    const fs = createFakeFileSystem()
    const entry = { ...defaultEntry('2026-11-06'), mood: 'at peace' }
    await writeDailyEntry(fs.root, entry)
    expect(fs.list()).toEqual(['2026/11/2026-11-06.json'])
    expect(await readDailyEntry(fs.root, '2026-11-06')).toEqual(entry)
  })

  it('returns null for a day that has no file', async () => {
    const fs = createFakeFileSystem()
    expect(await readDailyEntry(fs.root, '2026-11-06')).toBeNull()
  })

  // Characterization of behaviour the audit flagged (P0-4, P0-5). These
  // document what the code does today so the storage phase can change it
  // deliberately; they are not statements of desired behaviour.
  describe('current error handling (to be redesigned in the storage phase)', () => {
    it('treats corrupt JSON the same as a missing file', async () => {
      const fs = createFakeFileSystem({ files: { '2026/11/2026-11-06.json': '{"date": "2026-11-06", "jour' } })
      expect(await readDailyEntry(fs.root, '2026-11-06')).toBeNull()
    })

    it('treats a permission request that needs user activation the same as a missing file', async () => {
      const fs = createFakeFileSystem({ files: { '2026/11/2026-11-06.json': defaultEntry('2026-11-06') } })
      fs.setPermission('prompt').setRequestPermissionBehavior('throw')
      expect(await readDailyEntry(fs.root, '2026-11-06')).toBeNull()
    })

    it('swallows write failures and leaves the previous file content', async () => {
      const fs = createFakeFileSystem({ files: { '2026/11/2026-11-06.json': { date: '2026-11-06', mood: 'old' } } })
      fs.failWrites(/2026-11-06\.json$/, { stage: 'close' })
      const original = console.error
      console.error = () => {}
      try {
        await expect(writeDailyEntry(fs.root, { date: '2026-11-06', mood: 'new' })).resolves.toBeUndefined()
      } finally {
        console.error = original
      }
      expect(fs.readJSON('2026/11/2026-11-06.json').mood).toBe('old')
    })
  })
})
