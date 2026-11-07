/**
 * Fails fast if the worker is not running in the timezone the run asked for.
 * The timezone must come from the process environment at startup; tests must
 * never change process.env.TZ while running.
 *
 * The check compares UTC offsets rather than zone names, because ICU may
 * report a canonical alias (e.g. Asia/Kolkata resolves as Asia/Calcutta).
 */
const requested = process.env.TZ
if (!requested) throw new Error('TZ is not set. Run tests through `npm test` or `npm run test:unit`.')

function offsetMinutesIn(timeZone, instant) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(instant)
  const get = (t) => Number(parts.find((p) => p.type === t).value)
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return Math.round((asUTC - Math.floor(instant.getTime() / 60000) * 60000) / 60000)
}

// Sample both hemispheres' summer and winter.
const samples = [Date.UTC(2026, 0, 15, 12), Date.UTC(2026, 6, 15, 12), Date.UTC(2026, 3, 5, 12), Date.UTC(2026, 10, 6, 12)]
for (const ms of samples) {
  const instant = new Date(ms)
  const expected = offsetMinutesIn(requested, instant)
  const actual = -instant.getTimezoneOffset()
  if (expected !== actual) {
    throw new Error(
      `Test worker timezone mismatch: TZ=${requested} expects UTC offset ${expected} min at ${instant.toISOString()} ` +
        `but the runtime uses ${actual} min (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`
    )
  }
}
