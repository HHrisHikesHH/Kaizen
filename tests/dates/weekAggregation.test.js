/**
 * Regression tests for audit P0-2 (weekly aggregation read the wrong days in
 * timezones east of UTC) and P0-3 (memory hand-off skipped week 53).
 */
import { describe, it, expect } from 'vitest'
import { generateWeekSummary } from '../../src/utils/aggregateWeek.js'
import { getLastSessionNotes } from '../../src/utils/aiNotesManager.js'
import { readDailyEntry } from '../../src/utils/dailyEntry.js'
import { createFakeFileSystem } from '../support/fakeFileSystem.js'
import { TZ, consecutiveKeys } from '../support/time.js'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function entryFor(key) {
  const [y, m, d] = key.split('-').map(Number)
  const dayOfWeek = DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return {
    date: key,
    dayOfWeek,
    sessionComplete: true,
    habits: {
      eating: { logged: true, note: `ate on ${key}` },
      movement: { logged: true, note: '' },
      reading: { logged: true, pages: 10, note: '' },
      meditation: { logged: true, minutes: 5, note: '' },
      journaling: { logged: true },
    },
    journal: { prompt: 'p', entry: `journal for ${key}`, wordCount: 3, timeSpent: 0 },
    mood: `mood-${key}`,
    closingWord: `word-${key}`,
    divaExtinguished: true,
  }
}

function seedDays(fs, keys) {
  for (const key of keys) {
    const [y, m] = key.split('-')
    fs.seed(`${y}/${m}/${key}.json`, entryFor(key))
  }
}

describe(`weekly aggregation (TZ=${TZ})`, () => {
  it('C: Monday–Saturday of 2026-W45 read exactly Nov 2 – Nov 7', async () => {
    const fs = createFakeFileSystem()
    // Include the neighbouring Sundays as decoys: they must not be read.
    seedDays(fs, consecutiveKeys('2026-11-01', 8))

    const summary = await generateWeekSummary(2026, 45, fs.root)

    const expected = consecutiveKeys('2026-11-02', 6)
    expect(summary.journalEntries.map((j) => j.date)).toEqual(expected)
    expect(summary.journalEntries.map((j) => j.entry)).toEqual(expected.map((k) => `journal for ${k}`))
    expect(summary.journalEntries.map((j) => j.dayOfWeek)).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    expect(summary.moodSequence).toEqual(expected.map((k) => `mood-${k}`))
    expect(summary.daysLogged).toBe(6)
    expect(summary.missedDays).toEqual([])
    expect(summary.habitSummary.eating.notes).toEqual(expected.map((k) => `ate on ${k}`))
  })

  it('reports genuinely missing days by their real weekday', async () => {
    const fs = createFakeFileSystem()
    seedDays(fs, ['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-07'])
    const summary = await generateWeekSummary(2026, 45, fs.root)
    expect(summary.missedDays).toEqual(['Wednesday', 'Friday'])
    expect(summary.daysLogged).toBe(4)
  })

  it('E: week 53 aggregates Dec 28 2026 – Jan 2 2027 across the year folder boundary', async () => {
    const fs = createFakeFileSystem()
    seedDays(fs, consecutiveKeys('2026-12-27', 8))
    const summary = await generateWeekSummary(2026, 53, fs.root)
    expect(summary.journalEntries.map((j) => j.date)).toEqual(consecutiveKeys('2026-12-28', 6))
    expect(summary.year).toBe(2026)
    expect(summary.weekNumber).toBe(53)
  })

  it('G: reads the existing week plan file for the week', async () => {
    const fs = createFakeFileSystem()
    fs.seed('2026/week-45.json', {
      weekNumber: 45,
      year: 2026,
      intentions: { Monday: [{ id: '1', text: 'walk', complete: true }], Tuesday: [{ id: '2', text: 'read', complete: false }] },
    })
    const summary = await generateWeekSummary(2026, 45, fs.root)
    expect(summary.weeklyIntentions.total).toBe(2)
    expect(summary.weeklyIntentions.completed).toBe(1)
  })
})

describe(`AI memory hand-off between weeks (TZ=${TZ})`, () => {
  function fsWithNotes() {
    return createFakeFileSystem({
      files: {
        'AI_notes/week-44-2026-notes.json': { marker: '2026-W44' },
        'AI_notes/week-52-2025-notes.json': { marker: '2025-W52' },
        'AI_notes/week-52-2026-notes.json': { marker: '2026-W52' },
        'AI_notes/week-53-2026-notes.json': { marker: '2026-W53' },
      },
    })
  }

  it('2027-W01 receives the notes from 2026-W53', async () => {
    const notes = await getLastSessionNotes(2027, 1, fsWithNotes().root)
    expect(notes?.marker).toBe('2026-W53')
  })

  it('G: 2026-W01 still receives the notes from 2025-W52 (52-week year)', async () => {
    const notes = await getLastSessionNotes(2026, 1, fsWithNotes().root)
    expect(notes?.marker).toBe('2025-W52')
  })

  it('G: mid-year weeks still receive the previous week’s notes', async () => {
    const notes = await getLastSessionNotes(2026, 45, fsWithNotes().root)
    expect(notes?.marker).toBe('2026-W44')
  })
})

describe(`historical records stay addressable by their stored key (TZ=${TZ})`, () => {
  it('G: a file is read back for exactly the key in its path, in any timezone', async () => {
    const fs = createFakeFileSystem()
    seedDays(fs, ['2026-11-06', '2026-11-07'])
    expect((await readDailyEntry(fs.root, '2026-11-06')).journal.entry).toBe('journal for 2026-11-06')
    expect((await readDailyEntry(fs.root, '2026-11-07')).journal.entry).toBe('journal for 2026-11-07')
  })
})
