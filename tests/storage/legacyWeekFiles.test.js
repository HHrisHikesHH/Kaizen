/**
 * Week plans and summaries saved by versions before the ISO-year fix used the
 * calendar year of "today" with the ISO week number. These tests pin down
 * that those files stay reachable under the week they belong to, are never
 * merged with or substituted for the canonical file, and are never changed.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  LEGACY_KEYING_LAST_DAY,
  getLegacyWeekLocations,
  getWeeksSharingLocation,
  resolveWeekRecords,
  canWriteWeekFile,
} from '../../src/utils/weekFileCompat.js'
import { readWeekPlan, writeWeekPlan, defaultWeekPlan } from '../../src/utils/weekPlanStore.js'
import { getWeekSummary, saveWeekSummary, generateWeekSummary } from '../../src/utils/aggregateWeek.js'
import { createFakeFileSystem } from '../support/fakeFileSystem.js'
import { TZ } from '../support/time.js'

afterEach(() => vi.restoreAllMocks())

function quietConsole() {
  vi.spyOn(console, 'error').mockImplementation(() => {})
}

function plan(year, weekNumber, text, extra = {}) {
  return {
    weekNumber,
    year,
    dateRange: `legacy ${year}-${weekNumber}`,
    intentions: {
      Monday: [{ id: `${year}-${weekNumber}-a`, text, complete: false, addedAt: '2025-12-29T19:00:00.000Z' }],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    },
    lastModified: '2025-12-30T08:00:00.000Z',
    ...extra,
  }
}

function summary(year, weekNumber, note) {
  return { weekNumber, year, dateRange: `legacy ${year}-${weekNumber}`, daysLogged: 2, note }
}

/** Every file's exact bytes, to prove nothing changed. */
function snapshot(fs) {
  return Object.fromEntries(fs.list().map((p) => [p, fs.read(p)]))
}

describe(`legacy week locations (TZ=${TZ})`, () => {
  it('2025-W01 may have been saved under 2024 on Dec 30–31 2024', () => {
    expect(getLegacyWeekLocations(2025, 1)).toEqual([
      { year: 2024, week: 1, days: ['2024-12-30', '2024-12-31'] },
    ])
  })

  it('2026-W01 may have been saved under 2025 on Dec 29–31 2025', () => {
    expect(getLegacyWeekLocations(2026, 1)).toEqual([
      { year: 2025, week: 1, days: ['2025-12-29', '2025-12-30', '2025-12-31'] },
    ])
  })

  it('2026-W53 may be saved under 2027 if an old version runs on Jan 1–3 2027', () => {
    expect(LEGACY_KEYING_LAST_DAY).toBe('2027-01-03')
    expect(getLegacyWeekLocations(2026, 53)).toEqual([
      { year: 2027, week: 53, days: ['2027-01-01', '2027-01-02', '2027-01-03'] },
    ])
  })

  it('ordinary weeks and weeks after the cutoff have no legacy location', () => {
    expect(getLegacyWeekLocations(2026, 45)).toEqual([])
    expect(getLegacyWeekLocations(2025, 52)).toEqual([])
    expect(getLegacyWeekLocations(2027, 1)).toEqual([])
    // 2030-W01 starts Dec 30 2029, but only this version writes files then.
    expect(getLegacyWeekLocations(2030, 1)).toEqual([])
    expect(getLegacyWeekLocations(2026, 54)).toEqual([])
  })

  it('identifies canonical files that are also another week’s legacy file', () => {
    expect(getWeeksSharingLocation(2024, 1)).toEqual([{ isoYear: 2025, isoWeek: 1 }])
    expect(getWeeksSharingLocation(2025, 1)).toEqual([{ isoYear: 2026, isoWeek: 1 }])
    expect(getWeeksSharingLocation(2026, 1)).toEqual([])
    expect(getWeeksSharingLocation(2026, 53)).toEqual([])
    expect(getWeeksSharingLocation(2026, 45)).toEqual([])
    expect(getWeeksSharingLocation(2029, 1)).toEqual([])
  })
})

describe(`reading legacy week plans (TZ=${TZ})`, () => {
  it('a legacy 2025-W01 plan is accessible from 2025-W01', async () => {
    const legacyPlan = plan(2024, 1, 'begin the year gently')
    const fs = createFakeFileSystem({ files: { '2024/week-1.json': legacyPlan } })

    const r = await resolveWeekRecords(fs.root, 'plan', 2025, 1)
    expect(r.status).toBe('legacy-only')
    expect(r.canonical).toEqual({ path: '2025/week-1.json', state: 'missing' })
    expect(r.legacy).toHaveLength(1)
    expect(r.legacy[0]).toMatchObject({ path: '2024/week-1.json', state: 'ok', days: ['2024-12-30', '2024-12-31'] })
    expect(r.legacy[0].data).toEqual(legacyPlan)
    expect(r.writable).toBe(true) // writing 2025/week-1.json can't touch 2024/week-1.json
  })

  it('a legacy 2026-W01 plan is accessible from 2026-W01', async () => {
    const legacyPlan = plan(2025, 1, 'walk after dinner')
    const fs = createFakeFileSystem({ files: { '2025/week-1.json': legacyPlan } })

    const r = await resolveWeekRecords(fs.root, 'plan', 2026, 1)
    expect(r.status).toBe('legacy-only')
    expect(r.legacy.map((l) => l.path)).toEqual(['2025/week-1.json'])
    expect(r.legacy[0].data).toEqual(legacyPlan)
  })

  it('a canonical ISO-year plan is read normally, with no legacy noise', async () => {
    const own = plan(2026, 45, 'read 20 pages')
    const fs = createFakeFileSystem({ files: { '2026/week-45.json': own } })

    const r = await resolveWeekRecords(fs.root, 'plan', 2026, 45)
    expect(r).toMatchObject({ status: 'canonical', writable: true, legacy: [], sharedWith: [] })
    expect(r.canonical.data).toEqual(own)
    expect(await readWeekPlan(fs.root, 2026, 45)).toEqual(own)
  })

  it('reports nothing stored as missing', async () => {
    const fs = createFakeFileSystem()
    const r = await resolveWeekRecords(fs.root, 'plan', 2026, 1)
    expect(r).toMatchObject({ status: 'missing', legacy: [], writable: true })
  })

  it('when both files exist, returns both intact and merges neither', async () => {
    // Old code wrote Dec 29–31 2025 to 2025/week-1.json and Jan 1–4 2026 to 2026/week-1.json.
    const december = plan(2025, 1, 'december intention')
    const january = plan(2026, 1, 'january intention')
    const fs = createFakeFileSystem({ files: { '2025/week-1.json': december, '2026/week-1.json': january } })

    const r = await resolveWeekRecords(fs.root, 'plan', 2026, 1)
    expect(r.status).toBe('conflict')
    expect(r.canonical.data).toEqual(january)
    expect(r.legacy.map((l) => l.data)).toEqual([december])
    // The ordinary reader still returns only the canonical record, unmerged.
    expect(await readWeekPlan(fs.root, 2026, 1)).toEqual(january)
  })

  it('2025-W01 split across 2024/ and 2025/ keeps both halves', async () => {
    const dec = plan(2024, 1, 'dec 30 intention')
    const jan = plan(2025, 1, 'jan 2 intention')
    const fs = createFakeFileSystem({ files: { '2024/week-1.json': dec, '2025/week-1.json': jan } })

    const r = await resolveWeekRecords(fs.root, 'plan', 2025, 1)
    expect(r.status).toBe('conflict')
    expect(r.canonical.data).toEqual(jan)
    expect(r.legacy[0].data).toEqual(dec)
    // 2025/week-1.json is also old 2026-W01 data, so it must not be overwritten from here.
    expect(r.sharedWith).toEqual([{ isoYear: 2026, isoWeek: 1 }])
    expect(r.writable).toBe(false)
  })

  it('reports an unreadable legacy file instead of hiding it', async () => {
    const fs = createFakeFileSystem({ files: { '2025/week-1.json': '{ not json' } })
    const r = await resolveWeekRecords(fs.root, 'plan', 2026, 1)
    expect(r.status).toBe('legacy-only')
    expect(r.legacy[0]).toMatchObject({ path: '2025/week-1.json', state: 'unreadable' })
    expect(fs.read('2025/week-1.json')).toBe('{ not json')
  })

  it('an unreadable canonical file is not writable', async () => {
    const fs = createFakeFileSystem({ files: { '2026/week-45.json': '{ truncated' } })
    const r = await resolveWeekRecords(fs.root, 'plan', 2026, 45)
    expect(r.canonical.state).toBe('unreadable')
    expect(r.writable).toBe(false)
  })
})

describe(`reading legacy week summaries (TZ=${TZ})`, () => {
  it('the legacy 2025-W01 and 2026-W01 summaries remain accessible', async () => {
    const s2024 = summary(2024, 1, 'written Dec 30 2024')
    const s2025 = summary(2025, 1, 'written Dec 29 2025')
    const fs = createFakeFileSystem({
      files: { '2024/week-1-summary.json': s2024, '2025/week-1-summary.json': s2025 },
    })

    const w2025 = await resolveWeekRecords(fs.root, 'summary', 2025, 1)
    expect(w2025.canonical).toMatchObject({ path: '2025/week-1-summary.json', state: 'ok', data: s2025 })
    expect(w2025.legacy).toMatchObject([{ path: '2024/week-1-summary.json', state: 'ok', data: s2024 }])
    expect(w2025.status).toBe('conflict')

    const w2026 = await resolveWeekRecords(fs.root, 'summary', 2026, 1)
    expect(w2026.status).toBe('legacy-only')
    expect(w2026.legacy).toMatchObject([{ path: '2025/week-1-summary.json', state: 'ok', data: s2025 }])
  })

  it('getWeekSummary never substitutes a legacy summary for a missing canonical one', async () => {
    const fs = createFakeFileSystem({ files: { '2025/week-1-summary.json': summary(2025, 1, 'x') } })
    expect(await getWeekSummary(2026, 1, fs.root)).toBeNull()
    expect(await getWeekSummary(2025, 1, fs.root)).toMatchObject({ note: 'x' })
  })

  it('a canonical ISO-year summary works normally', async () => {
    const fs = createFakeFileSystem()
    const s = summary(2026, 53, 'last week of 2026')
    expect(await saveWeekSummary(s, fs.root)).toBe(true)
    expect(fs.readJSON('2026/week-53-summary.json')).toEqual(s)
    expect(await getWeekSummary(2026, 53, fs.root)).toEqual(s)
  })
})

describe(`existing records stay unchanged (TZ=${TZ})`, () => {
  const seeded = () =>
    createFakeFileSystem({
      files: {
        '2024/week-1.json': plan(2024, 1, 'dec 30 2024'),
        '2024/week-1-summary.json': summary(2024, 1, 'a'),
        '2025/week-1.json': plan(2025, 1, 'jan 2025 and dec 2025'),
        '2025/week-1-summary.json': summary(2025, 1, 'b'),
        '2026/week-1.json': plan(2026, 1, 'jan 2026'),
      },
    })

  it('resolving records performs no writes', async () => {
    const fs = seeded()
    const before = snapshot(fs)
    for (const [y, w] of [[2024, 1], [2025, 1], [2026, 1], [2026, 53]]) {
      await resolveWeekRecords(fs.root, 'plan', y, w)
      await resolveWeekRecords(fs.root, 'summary', y, w)
    }
    expect(fs.writeLog).toEqual([])
    expect(snapshot(fs)).toEqual(before)
  })

  it('refuses to overwrite a plan file that also holds another week’s legacy record', async () => {
    quietConsole()
    const fs = seeded()
    const before = snapshot(fs)
    expect(await canWriteWeekFile(fs.root, 'plan', 2025, 1)).toBe(false)
    expect(await canWriteWeekFile(fs.root, 'plan', 2024, 1)).toBe(false)
    expect(await writeWeekPlan(fs.root, plan(2025, 1, 'overwrite attempt'))).toBe(false)
    expect(await writeWeekPlan(fs.root, plan(2024, 1, 'overwrite attempt'))).toBe(false)
    expect(snapshot(fs)).toEqual(before)
  })

  it('refuses to overwrite a summary file that also holds another week’s legacy record', async () => {
    quietConsole()
    const fs = seeded()
    const before = snapshot(fs)
    expect(await saveWeekSummary(summary(2025, 1, 'overwrite'), fs.root)).toBe(false)
    const regenerated = await generateWeekSummary(2024, 1, fs.root)
    expect(await saveWeekSummary(regenerated, fs.root)).toBe(false)
    expect(snapshot(fs)).toEqual(before)
  })

  it('refuses to overwrite an unreadable file', async () => {
    quietConsole()
    const fs = createFakeFileSystem({ files: { '2026/week-45.json': '{ truncated' } })
    expect(await writeWeekPlan(fs.root, plan(2026, 45, 'new'))).toBe(false)
    expect(fs.read('2026/week-45.json')).toBe('{ truncated')
  })

  it('editing the canonical week in a conflict writes only the canonical file', async () => {
    const fs = seeded()
    const before = snapshot(fs)
    const r = await resolveWeekRecords(fs.root, 'plan', 2026, 1)
    expect(r).toMatchObject({ status: 'conflict', writable: true })

    const edited = { ...r.canonical.data, intentions: { ...r.canonical.data.intentions, Friday: [{ id: 'n', text: 'new', complete: false }] } }
    expect(await writeWeekPlan(fs.root, edited)).toBe(true)

    expect(fs.writeLog.map((w) => w.path)).toEqual(['2026/week-1.json'])
    for (const path of Object.keys(before)) {
      if (path !== '2026/week-1.json') expect(fs.read(path)).toBe(before[path])
    }
    const after = await resolveWeekRecords(fs.root, 'plan', 2026, 1)
    expect(after.canonical.data.intentions.Friday[0].text).toBe('new')
    expect(after.legacy[0].data).toEqual(JSON.parse(before['2025/week-1.json']))
  })

  it('new weeks are written to their ISO-year paths, including week 53', async () => {
    const fs = createFakeFileSystem({ files: { '2025/week-1.json': plan(2025, 1, 'keep') } })
    const before = fs.read('2025/week-1.json')
    for (const [y, w] of [[2026, 53], [2027, 1], [2026, 45]]) {
      expect(await writeWeekPlan(fs.root, defaultWeekPlan(y, w, 'range'))).toBe(true)
    }
    expect(fs.writeLog.map((w) => w.path)).toEqual(['2026/week-53.json', '2027/week-1.json', '2026/week-45.json'])
    expect(fs.exists('2027/week-53.json')).toBe(false)
    expect(fs.read('2025/week-1.json')).toBe(before)
    // Rewriting an existing ordinary canonical week still works.
    expect(await writeWeekPlan(fs.root, defaultWeekPlan(2026, 53, 'again'))).toBe(true)
    expect(fs.readJSON('2026/week-53.json').dateRange).toBe('again')
  })
})
