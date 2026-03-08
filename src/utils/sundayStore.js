/**
 * Sunday session state: /YYYY/week-[WW]-sunday.json
 */

async function ensurePermission(handle) {
  if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    await handle.requestPermission({ mode: 'readwrite' })
  }
}

export function defaultSundayState(year, weekNumber) {
  return {
    weekNumber,
    year,
    morningComplete: false,
    eveningComplete: false,
    packageGeneratedAt: null,
    packageCopiedAt: null,
    pasteReceivedAt: null,
    sessionNotes: null,
    userFacingReflection: null,
  }
}

export async function readSundayState(handle, year, weekNumber) {
  if (!handle?.getDirectoryHandle) return null
  try {
    await ensurePermission(handle)
    const yearDir = await handle.getDirectoryHandle(String(year), { create: false })
    const fileHandle = await yearDir.getFileHandle(`week-${weekNumber}-sunday.json`, { create: false })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function writeSundayState(handle, data) {
  if (!handle?.getDirectoryHandle) return
  try {
    await ensurePermission(handle)
    const yearDir = await handle.getDirectoryHandle(String(data.year), { create: true })
    const fileHandle = await yearDir.getFileHandle(`week-${data.weekNumber}-sunday.json`, {
      create: true,
    })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
  } catch (err) {
    console.error('Failed to write Sunday state:', err)
  }
}
