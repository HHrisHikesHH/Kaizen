/**
 * Date helpers for week boundaries, display, and file names.
 * Week = ISO week (Mon–Sun); we use Mon–Sat for the practice week.
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** ISO week number (1–53) for the given date */
export function getWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

/** Monday and Saturday of the given ISO week (practice week = Mon–Sat) */
export function getWeekDateRange(year, weekNumber) {
  const jan4 = new Date(year, 0, 4)
  const mon = new Date(jan4)
  mon.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (weekNumber - 1) * 7)
  const sat = new Date(mon)
  sat.setDate(mon.getDate() + 5)
  return { start: mon, end: sat }
}

/** Array of 6 Date objects: Monday through Saturday */
export function getDatesForWeek(year, weekNumber) {
  const { start } = getWeekDateRange(year, weekNumber)
  const dates = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d)
  }
  return dates
}

/** "Monday, the 3rd of March" */
export function formatDateForDisplay(date) {
  const d = date instanceof Date ? date : new Date(date)
  const day = d.getDate()
  const month = d.toLocaleDateString('en-GB', { month: 'long' })
  const dayName = DAY_NAMES[d.getDay()]
  return `${dayName}, the ${getOrdinal(day)} of ${month}`
}

/** "Mar 3" */
export function formatDateShort(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

/** "YYYY-MM-DD.json" */
export function getDayFileName(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}.json`
}

/** "YYYY-MM-DD" */
export function toDateString(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.toISOString().slice(0, 10)
}

export function isToday(date) {
  const d = date instanceof Date ? date : new Date(date)
  const today = new Date()
  return toDateString(d) === toDateString(today)
}

export function isSaturday(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.getDay() === 6
}

export function isSunday(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.getDay() === 0
}

export function getDayOfWeek(date) {
  const d = date instanceof Date ? date : new Date(date)
  return DAY_NAMES[d.getDay()]
}

/** "Mar 3 – Mar 9" for display */
export function formatWeekRange(start, end) {
  return `${formatDateShort(start)} – ${formatDateShort(end)}`
}
