/**
 * Completing the daily session must save the entry before the weekly summary
 * is built, because the summary is built from the stored files.
 *
 * Regression: HomePage used to schedule the save (150 ms debounce) and build
 * the summary straight away, so the summary missed the day just completed
 * (daysLogged 0, Saturday in missedDays) and the Sunday package, which uses
 * the saved summary, reported Saturday as missed.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createEntrySaver } from '../../src/utils/entrySaver.js'
import { refreshWeekSummaryFor } from '../../src/utils/sessionSummary.js'
import { defaultEntry, mergeEntry, writeDailyEntry } from '../../src/utils/dailyEntry.js'
import { getWeekSummary } from '../../src/utils/aggregateWeek.js'
import { createFakeFileSystem } from '../support/fakeFileSystem.js'
import { TZ } from '../support/time.js'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const SATURDAY = '2026-11-07' // ISO 2026-W45

function completed(entry) {
  return mergeEntry(entry, { sessionComplete: true, divaExtinguished: true })
}

describe(`completing a daily session (TZ=${TZ})`, () => {
  it('a blank completed session is counted in the summary built after flush', async () => {
    const fs = createFakeFileSystem()
    const saver = createEntrySaver((e) => writeDailyEntry(fs.root, e))
    const entry = defaultEntry(SATURDAY)
    saver.schedule(entry) // an earlier autosave still pending

    expect(await saver.flush(completed(entry))).toBe(true)
    await refreshWeekSummaryFor(SATURDAY, fs.root)

    expect(fs.readJSON(`2026/11/${SATURDAY}.json`).sessionComplete).toBe(true)
    const summary = await getWeekSummary(2026, 45, fs.root)
    expect(summary.daysLogged).toBe(1)
    expect(summary.daysMissed).toBe(5)
    expect(summary.missedDays).not.toContain('Saturday')
  })

  it('the old order (debounced save, summary at once) misses the day: why flush is needed', async () => {
    const fs = createFakeFileSystem()
    const saver = createEntrySaver((e) => writeDailyEntry(fs.root, e))
    saver.schedule(completed(defaultEntry(SATURDAY)))
    await refreshWeekSummaryFor(SATURDAY, fs.root)
    await new Promise((r) => setTimeout(r, 200))
    await saver.idle()

    expect(fs.readJSON(`2026/11/${SATURDAY}.json`).sessionComplete).toBe(true)
    expect((await getWeekSummary(2026, 45, fs.root)).daysLogged).toBe(0)
  })

  it('does not touch the summary when the entry could not be saved', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fs = createFakeFileSystem({ files: { '2026/week-45-summary.json': { daysLogged: 3 } } })
    fs.failWrites(`2026/11/${SATURDAY}.json`, { stage: 'close' })
    const saver = createEntrySaver((e) => writeDailyEntry(fs.root, e))

    expect(await saver.flush(completed(defaultEntry(SATURDAY)))).toBe(false)
    // getFileHandle({ create: true }) leaves an empty file, as in Chrome; the entry itself never landed.
    expect(fs.read(`2026/11/${SATURDAY}.json`) ?? '').not.toContain('sessionComplete')
    expect(fs.readJSON('2026/week-45-summary.json')).toEqual({ daysLogged: 3 })
  })
})

describe(`entry saver (TZ=${TZ})`, () => {
  it('debounces autosaves and writes only the latest', async () => {
    vi.useFakeTimers()
    const writes = []
    const saver = createEntrySaver(async (e) => (writes.push(e.n), true))
    saver.schedule({ n: 1 })
    await vi.advanceTimersByTimeAsync(100)
    saver.schedule({ n: 2 })
    await vi.advanceTimersByTimeAsync(149)
    expect(writes).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    await saver.idle()
    expect(writes).toEqual([2])
  })

  it('flush replaces a pending autosave instead of writing both', async () => {
    vi.useFakeTimers()
    const writes = []
    const saver = createEntrySaver(async (e) => (writes.push(e.n), true))
    saver.schedule({ n: 1 })
    expect(await saver.flush({ n: 2 })).toBe(true)
    await vi.advanceTimersByTimeAsync(500)
    expect(writes).toEqual([2])
  })

  it('a slow earlier write cannot finish after, and overwrite, a flushed one', async () => {
    const fs = createFakeFileSystem()
    let releaseFirst
    const firstGate = new Promise((r) => (releaseFirst = r))
    let calls = 0
    const saver = createEntrySaver(async (e) => {
      calls++
      if (calls === 1) await firstGate // the autosave is still writing
      return writeDailyEntry(fs.root, e)
    }, { delayMs: 0 })

    const entry = defaultEntry(SATURDAY)
    saver.schedule(entry)
    await new Promise((r) => setTimeout(r, 5)) // autosave starts
    const flushed = saver.flush(completed(entry))
    releaseFirst()
    expect(await flushed).toBe(true)

    expect(fs.writeLog.map((w) => JSON.parse(w.content).sessionComplete)).toEqual([false, true])
    expect(fs.readJSON(`2026/11/${SATURDAY}.json`).sessionComplete).toBe(true)
  })

  it('keeps working after a failed write', async () => {
    let fail = true
    const saver = createEntrySaver(async () => {
      if (fail) throw new Error('disk')
      return true
    })
    expect(await saver.flush({})).toBe(false)
    fail = false
    expect(await saver.flush({})).toBe(true)
  })
})

describe(`daily entry helpers (TZ=${TZ})`, () => {
  it('mergeEntry merges habits and journal one level deep', () => {
    const prev = defaultEntry(SATURDAY)
    const next = mergeEntry(prev, { habits: { reading: { logged: true, pages: 4 } }, journal: { entry: 'hi' }, mood: 'calm' })
    expect(next.habits.reading).toEqual({ logged: true, pages: 4 })
    expect(next.habits.eating).toEqual(prev.habits.eating)
    expect(next.journal.entry).toBe('hi')
    expect(next.journal.prompt).toBe(prev.journal.prompt)
    expect(next.mood).toBe('calm')
    expect(prev.mood).not.toBe('calm')
  })

  it('writeDailyEntry reports whether the file was written', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fs = createFakeFileSystem()
    expect(await writeDailyEntry(fs.root, defaultEntry(SATURDAY))).toBe(true)
    fs.failWrites(`2026/11/${SATURDAY}.json`, { stage: 'write' })
    expect(await writeDailyEntry(fs.root, completed(defaultEntry(SATURDAY)))).toBe(false)
    expect(fs.readJSON(`2026/11/${SATURDAY}.json`).sessionComplete).toBe(false)
    expect(await writeDailyEntry(null, {})).toBe(false)
  })
})
