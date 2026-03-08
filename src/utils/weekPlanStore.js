/**
 * Weekly plan file: /YYYY/week-[WW].json
 */

async function ensurePermission(handle) {
  if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    await handle.requestPermission({ mode: 'readwrite' })
  }
}

function defaultWeekPlan(year, weekNumber, dateRange) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const intentions = {}
  days.forEach((d) => { intentions[d] = [] })
  return {
    weekNumber,
    year,
    dateRange,
    intentions,
    lastModified: new Date().toISOString(),
  }
}

/**
 * Read week plan. Returns null if file does not exist.
 */
export async function readWeekPlan(handle, year, weekNumber) {
  if (!handle || typeof handle.getDirectoryHandle !== 'function') return null
  try {
    await ensurePermission(handle)
    const yearDir = await handle.getDirectoryHandle(String(year), { create: false })
    const fileHandle = await yearDir.getFileHandle(`week-${weekNumber}.json`, { create: false })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Write week plan. Creates YYYY/ if needed.
 */
export async function writeWeekPlan(handle, data) {
  if (!handle || typeof handle.getDirectoryHandle !== 'function') return
  try {
    await ensurePermission(handle)
    const payload = { ...data, lastModified: new Date().toISOString() }
    const yearDir = await handle.getDirectoryHandle(String(data.year), { create: true })
    const fileHandle = await yearDir.getFileHandle(`week-${data.weekNumber}.json`, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(payload, null, 2))
    await writable.close()
  } catch (err) {
    console.error('Failed to write week plan:', err)
  }
}

export { defaultWeekPlan }
