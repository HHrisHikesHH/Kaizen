/**
 * Kaizen's single date and calendar module.
 *
 * Two kinds of "date" exist in the app and must not be mixed:
 *
 *  1. Calendar dates — the day on the user's wall calendar. Stored as local
 *     date keys "YYYY-MM-DD" (daily entry paths, journal dates, week grids).
 *     Always derived from local Date components, never from toISOString(),
 *     which reports the UTC calendar date and is off by one for part of every
 *     day outside UTC.
 *
 *  2. Instants — moments in time (createdAt, addedAt, generatedAt, …). These
 *     stay as `new Date().toISOString()` and are not handled here.
 *
 * Weeks follow ISO 8601: Monday–Sunday, identified by { isoYear, isoWeek }.
 * The ISO year is not always the calendar year (Dec 29 2025 is 2026-W01;
 * Jan 3 2027 is 2026-W53), so a week number must always be paired with
 * getISOWeek().isoYear — never with getFullYear(). Some years have 53 weeks.
 *
 * The Kaizen "practice week" is Monday–Saturday of an ISO week; Sunday is the
 * reflection day. Storage paths such as /YYYY/week-N.json use the ISO year.
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MS_PER_DAY = 86_400_000
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad2(n) {
  return String(n).padStart(2, '0')
}

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** "YYYY-MM-DD" from calendar components (month is 1-based). */
function keyFromParts(y, m, d) {
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`
}

/** Calendar parts of a UTC-midnight timestamp used for pure day arithmetic. */
function partsFromDayMs(ms) {
  const t = new Date(ms)
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()]
}

/**
 * Accepts a Date, a local date key, or anything `new Date()` accepts.
 * Date keys are read as local calendar dates (unlike `new Date('2026-11-06')`,
 * which the platform reads as UTC midnight). Never throws; used by display helpers.
 */
function asLocalDate(value) {
  if (value instanceof Date) return value
  if (typeof value === 'string' && DATE_KEY_RE.test(value)) {
    try {
      return parseLocalDateKey(value)
    } catch {
      // fall through to platform parsing for malformed keys
    }
  }
  return new Date(value)
}

// ─── Local calendar dates ──────────────────────────────────────────────────

/** Local calendar date key "YYYY-MM-DD" for a Date (or an existing key). */
export function toLocalDateKey(date) {
  if (typeof date === 'string' && DATE_KEY_RE.test(date)) {
    parseLocalDateKey(date) // validates
    return date
  }
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) throw new RangeError(`Invalid date: ${date}`)
  return keyFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/** Today's local date key. */
export function getTodayKey(now = new Date()) {
  return toLocalDateKey(now)
}

/**
 * Parse "YYYY-MM-DD" into a Date at local noon on that calendar day.
 * Noon keeps the value on the right day even where DST shifts midnight.
 */
export function parseLocalDateKey(key) {
  const m = typeof key === 'string' ? DATE_KEY_RE.exec(key) : null
  if (!m) throw new RangeError(`Invalid date key: ${key}`)
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d, 12, 0, 0, 0)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) {
    throw new RangeError(`Invalid date key: ${key}`)
  }
  return date
}

/** Add calendar days, keeping the local time of day (DST-safe). */
export function addLocalDays(date, days) {
  const d = asLocalDate(date)
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + days,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds()
  )
}

/** Day of the year (1–366) for a local date or date key. */
export function getLocalDayOfYear(date) {
  const d = asLocalDate(date)
  const y = d.getFullYear()
  return Math.round((Date.UTC(y, d.getMonth(), d.getDate()) - Date.UTC(y, 0, 0)) / MS_PER_DAY)
}

/** "YYYY-MM-DD" — kept for existing callers; same as toLocalDateKey. */
export function toDateString(date) {
  return toLocalDateKey(date)
}

export function isToday(date) {
  return toLocalDateKey(asLocalDate(date)) === getTodayKey()
}

export function isSaturday(date) {
  return asLocalDate(date).getDay() === 6
}

export function isSunday(date) {
  return asLocalDate(date).getDay() === 0
}

/** Local weekday name, e.g. "Friday". */
export function getDayOfWeek(date) {
  return DAY_NAMES[asLocalDate(date).getDay()]
}

// ─── ISO 8601 weeks ────────────────────────────────────────────────────────

/** ISO week for calendar components, using pure day arithmetic. */
function isoWeekOfCalendarDate(y, m, d) {
  const dayMs = Date.UTC(y, m - 1, d)
  const isoDow = new Date(dayMs).getUTCDay() || 7 // Mon=1 … Sun=7
  const thursdayMs = dayMs + (4 - isoDow) * MS_PER_DAY
  const isoYear = new Date(thursdayMs).getUTCFullYear()
  const isoWeek = Math.floor((thursdayMs - Date.UTC(isoYear, 0, 1)) / MS_PER_DAY / 7) + 1
  return { isoYear, isoWeek }
}

/** UTC-midnight ms of the Monday of an ISO week (no range check). */
function isoWeekMondayMs(isoYear, isoWeek) {
  const jan4Ms = Date.UTC(isoYear, 0, 4)
  const jan4Dow = new Date(jan4Ms).getUTCDay() || 7
  return jan4Ms - (jan4Dow - 1) * MS_PER_DAY + (isoWeek - 1) * 7 * MS_PER_DAY
}

function localMidnightFromDayMs(ms) {
  const [y, m, d] = partsFromDayMs(ms)
  return new Date(y, m - 1, d)
}

/** { isoYear, isoWeek } of the local calendar date of `date` (Date or key). */
export function getISOWeek(date) {
  const d = asLocalDate(date)
  if (Number.isNaN(d.getTime())) throw new RangeError(`Invalid date: ${date}`)
  return isoWeekOfCalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/** 52 or 53. */
export function getISOWeeksInYear(isoYear) {
  // Dec 28 is always in the last ISO week of its year.
  return isoWeekOfCalendarDate(isoYear, 12, 28).isoWeek
}

export function isValidISOWeek(isoYear, isoWeek) {
  return (
    Number.isInteger(isoYear) &&
    Number.isInteger(isoWeek) &&
    isoWeek >= 1 &&
    isoWeek <= getISOWeeksInYear(isoYear)
  )
}

function assertISOWeek(isoYear, isoWeek) {
  if (!isValidISOWeek(isoYear, isoWeek)) {
    throw new RangeError(`Invalid ISO week: ${isoYear}-W${isoWeek}`)
  }
}

/** Monday of the ISO week, at local midnight. */
export function getISOWeekStart(isoYear, isoWeek) {
  assertISOWeek(isoYear, isoWeek)
  return localMidnightFromDayMs(isoWeekMondayMs(isoYear, isoWeek))
}

/** Sunday of the ISO week (the calendar day), at local midnight. */
export function getISOWeekEnd(isoYear, isoWeek) {
  assertISOWeek(isoYear, isoWeek)
  return localMidnightFromDayMs(isoWeekMondayMs(isoYear, isoWeek) + 6 * MS_PER_DAY)
}

/** The seven local date keys Monday → Sunday of the ISO week. */
export function getISOWeekDateKeys(isoYear, isoWeek) {
  assertISOWeek(isoYear, isoWeek)
  const monday = isoWeekMondayMs(isoYear, isoWeek)
  return Array.from({ length: 7 }, (_, i) => keyFromParts(...partsFromDayMs(monday + i * MS_PER_DAY)))
}

/** The seven local date keys (Mon–Sun) of the ISO week containing `date` (Date or key). */
export function getWeekDateKeysContaining(date) {
  const { isoYear, isoWeek } = getISOWeek(date)
  return getISOWeekDateKeys(isoYear, isoWeek)
}

/** Move by whole weeks, crossing year boundaries (including week 53). */
export function shiftISOWeek({ isoYear, isoWeek }, deltaWeeks) {
  assertISOWeek(isoYear, isoWeek)
  const [y, m, d] = partsFromDayMs(isoWeekMondayMs(isoYear, isoWeek) + deltaWeeks * 7 * MS_PER_DAY)
  return isoWeekOfCalendarDate(y, m, d)
}

/** Negative if a is before b, 0 if equal, positive if after. */
export function compareISOWeeks(a, b) {
  return a.isoYear - b.isoYear || a.isoWeek - b.isoWeek
}

/**
 * ISO week number (1–53) only. Kept for existing callers; to identify a week,
 * use getISOWeek(), which also returns the matching ISO year.
 */
export function getWeekNumber(date) {
  return getISOWeek(date).isoWeek
}

/**
 * Monday and Saturday of an ISO week (the practice week), at local midnight.
 * `year` is the ISO year. Out-of-range weeks are not rejected here so that any
 * legacy stored (year, week) pair still renders instead of crashing.
 */
export function getWeekDateRange(year, weekNumber) {
  const monday = isoWeekMondayMs(year, weekNumber)
  return {
    start: localMidnightFromDayMs(monday),
    end: localMidnightFromDayMs(monday + 5 * MS_PER_DAY),
  }
}

/** Array of 6 Date objects (local midnight): Monday through Saturday. */
export function getDatesForWeek(year, weekNumber) {
  const monday = isoWeekMondayMs(year, weekNumber)
  return Array.from({ length: 6 }, (_, i) => localMidnightFromDayMs(monday + i * MS_PER_DAY))
}

// ─── Display ───────────────────────────────────────────────────────────────

/** "Monday, the 3rd of March" */
export function formatDateForDisplay(date) {
  const d = asLocalDate(date)
  const month = d.toLocaleDateString('en-GB', { month: 'long' })
  return `${DAY_NAMES[d.getDay()]}, the ${getOrdinal(d.getDate())} of ${month}`
}

/** "3 Mar" */
export function formatDateShort(date) {
  return asLocalDate(date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

/** "YYYY-MM-DD.json" */
export function getDayFileName(date) {
  return `${toLocalDateKey(asLocalDate(date))}.json`
}

/** "3 Mar – 9 Mar" for display */
export function formatWeekRange(start, end) {
  return `${formatDateShort(start)} – ${formatDateShort(end)}`
}
