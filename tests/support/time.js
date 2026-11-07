/**
 * Timezone-aware test oracles. These use Intl (the platform's tz database),
 * not the application's date code, so they are an independent reference.
 */

export const TZ = process.env.TZ

const keyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The calendar date (YYYY-MM-DD) a wall clock in the current TZ shows at this instant. */
export function wallClockKey(instant) {
  return keyFormatter.format(instant)
}

/** Consecutive local date keys starting at `startKey` (inclusive). */
export function consecutiveKeys(startKey, count) {
  const [y, m, d] = startKey.split('-').map(Number)
  const out = []
  for (let i = 0; i < count; i++) {
    // Date.UTC arithmetic: calendar days only, immune to DST.
    out.push(new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10))
  }
  return out
}
