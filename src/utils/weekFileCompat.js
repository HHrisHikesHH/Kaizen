/**
 * Read-only compatibility for week files saved by versions before the ISO-year fix.
 *
 * Earlier versions named week files with the *calendar* year of "today" and
 * the ISO week number. In the days around New Year, when the calendar year
 * and the ISO year differ, a week's plan or summary could be saved under the
 * neighbouring year's folder:
 *
 *   ISO 2025-W01 (Dec 30 2024 – Jan 5 2025): Dec 30–31 → 2024/week-1*.json
 *   ISO 2026-W01 (Dec 29 2025 – Jan 4 2026): Dec 29–31 → 2025/week-1*.json
 *   ISO 2026-W53 (Dec 28 2026 – Jan 3 2027): Jan 1–3   → 2027/week-53*.json
 *     (only if an old version is still running on those days)
 *
 * Rules (see docs/date-handling.md):
 *  - New records are always written to the canonical ISO-year path.
 *  - Legacy files are only read, never written, moved, renamed or deleted.
 *  - Canonical and legacy records are returned side by side, never merged and
 *    never substituted for each other.
 *  - A canonical file that is also another week's legacy location (e.g.
 *    2025/week-1.json is both 2025-W01 and old 2026-W01 data) is not
 *    overwritten, so the other week's record cannot be lost through it.
 */

import { getISOWeekDateKeys, isValidISOWeek } from './dateHelpers'

/**
 * Last day an old version could have written a legacy name. Bounding the
 * lookup keeps files written correctly by this version (e.g. 2029/week-1.json
 * for 2029-W01) from ever being mistaken for another week's legacy record.
 */
export const LEGACY_KEYING_LAST_DAY = '2027-01-03'

const FILE_NAMES = {
  plan: (week) => `week-${week}.json`,
  summary: (week) => `week-${week}-summary.json`,
}

function fileName(kind, week) {
  const make = FILE_NAMES[kind]
  if (!make) throw new TypeError(`Unknown week file kind: ${kind}`)
  return make(week)
}

export function weekFilePath(kind, year, week) {
  return `${year}/${fileName(kind, week)}`
}

/**
 * The (year, week) locations an old version could have used for this ISO
 * week, other than the canonical one, with the days that produced them.
 */
export function getLegacyWeekLocations(isoYear, isoWeek) {
  if (!isValidISOWeek(isoYear, isoWeek)) return []
  const byYear = new Map()
  for (const key of getISOWeekDateKeys(isoYear, isoWeek)) {
    if (key > LEGACY_KEYING_LAST_DAY) continue
    const calendarYear = Number(key.slice(0, 4))
    if (calendarYear === isoYear) continue
    if (!byYear.has(calendarYear)) byYear.set(calendarYear, [])
    byYear.get(calendarYear).push(key)
  }
  return [...byYear].map(([year, days]) => ({ year, week: isoWeek, days }))
}

/**
 * Other ISO weeks whose legacy location is this (year, week) path. Non-empty
 * means the file at this path may hold records of more than one week.
 */
export function getWeeksSharingLocation(year, week) {
  return [
    { isoYear: year - 1, isoWeek: week },
    { isoYear: year + 1, isoWeek: week },
  ].filter(
    (w) =>
      isValidISOWeek(w.isoYear, w.isoWeek) &&
      getLegacyWeekLocations(w.isoYear, w.isoWeek).some((l) => l.year === year)
  )
}

export async function ensurePermission(handle) {
  if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    await handle.requestPermission({ mode: 'readwrite' })
  }
}

/** { state: 'missing' } | { state: 'ok', data } | { state: 'unreadable', error } */
async function readJSONAt(handle, year, name) {
  let file
  try {
    const yearDir = await handle.getDirectoryHandle(String(year), { create: false })
    const fileHandle = await yearDir.getFileHandle(name, { create: false })
    file = await fileHandle.getFile()
  } catch (err) {
    if (err?.name === 'NotFoundError' || err?.name === 'TypeMismatchError') return { state: 'missing' }
    return { state: 'unreadable', error: String(err?.message ?? err) }
  }
  try {
    return { state: 'ok', data: JSON.parse(await file.text()) }
  } catch (err) {
    return { state: 'unreadable', error: String(err?.message ?? err) }
  }
}

/**
 * Every stored record for one ISO week: the canonical file plus any legacy
 * files, each with its path. Reads only.
 *
 * status:
 *   'missing'      nothing stored
 *   'canonical'    only the canonical file
 *   'legacy-only'  only legacy file(s)
 *   'conflict'     canonical and legacy file(s) both exist
 *
 * writable is false when writing the canonical path could destroy a record:
 * the canonical file can't be read, or it is also another week's legacy file.
 */
export async function resolveWeekRecords(handle, kind, isoYear, isoWeek) {
  const name = fileName(kind, isoWeek)
  const canonicalPath = weekFilePath(kind, isoYear, isoWeek)
  const empty = {
    kind,
    isoYear,
    isoWeek,
    status: 'missing',
    canonical: { path: canonicalPath, state: 'missing' },
    legacy: [],
    sharedWith: [],
    writable: true,
  }
  if (!handle || typeof handle.getDirectoryHandle !== 'function') return empty

  await ensurePermission(handle)
  const canonical = { path: canonicalPath, ...(await readJSONAt(handle, isoYear, name)) }

  const legacy = []
  for (const loc of getLegacyWeekLocations(isoYear, isoWeek)) {
    const rec = await readJSONAt(handle, loc.year, name)
    if (rec.state !== 'missing') {
      legacy.push({ path: weekFilePath(kind, loc.year, loc.week), year: loc.year, week: loc.week, days: loc.days, ...rec })
    }
  }

  const hasCanonical = canonical.state !== 'missing'
  const sharedWith = hasCanonical ? getWeeksSharingLocation(isoYear, isoWeek) : []
  let status = 'missing'
  if (hasCanonical && legacy.length) status = 'conflict'
  else if (hasCanonical) status = 'canonical'
  else if (legacy.length) status = 'legacy-only'

  return {
    ...empty,
    status,
    canonical,
    legacy,
    sharedWith,
    writable: canonical.state !== 'unreadable' && sharedWith.length === 0,
  }
}

/**
 * Guard for writers: false if a file already exists at (year, week) and that
 * path is also another week's legacy location, or it exists but can't be read.
 */
export async function canWriteWeekFile(handle, kind, year, week) {
  const existing = await readJSONAt(handle, year, fileName(kind, week))
  if (existing.state === 'missing') return true
  if (existing.state === 'unreadable') return false
  return getWeeksSharingLocation(year, week).length === 0
}
