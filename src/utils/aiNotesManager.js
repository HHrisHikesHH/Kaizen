/**
 * AI notes: /AI_notes/week-[WW]-[YYYY]-notes.json
 */

async function ensurePermission(handle) {
  if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    await handle.requestPermission({ mode: 'readwrite' })
  }
}

function fileName(weekNumber, year) {
  return `week-${weekNumber}-${year}-notes.json`
}

/**
 * Get last session's notes (previous week). For week 1, returns null.
 */
export async function getLastSessionNotes(year, weekNumber, folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return null
  if (weekNumber <= 1) {
    return getSessionNotes(year - 1, 52, folderHandle)
  }
  return getSessionNotes(year, weekNumber - 1, folderHandle)
}

/**
 * Get notes for a specific week.
 */
export async function getSessionNotes(year, weekNumber, folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return null
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const fileHandle = await aiDir.getFileHandle(fileName(weekNumber, year), { create: false })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Save parsed session notes to /AI_notes/week-[WW]-[YYYY]-notes.json
 */
export async function saveSessionNotes(notes, year, weekNumber, folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: true })
    const fileHandle = await aiDir.getFileHandle(fileName(weekNumber, year), { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(notes, null, 2))
    await writable.close()
  } catch (err) {
    console.error('Failed to save session notes:', err)
  }
}

/**
 * All notes files, sorted by year then week (oldest first).
 */
export async function getAllSessionNotes(folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return []
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const files = []
    for await (const [name, handle] of aiDir.entries()) {
      if (handle.kind === 'file' && name.startsWith('week-') && name.endsWith('-notes.json')) {
        const match = name.match(/week-(\d+)-(\d+)-notes\.json/)
        if (match) {
          const weekNum = parseInt(match[1], 10)
          const year = parseInt(match[2], 10)
          files.push({ year, weekNumber: weekNum, name })
        }
      }
    }
    files.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.weekNumber - b.weekNumber))
    const results = []
    for (const { year, weekNumber } of files) {
      const notes = await getSessionNotes(year, weekNumber, folderHandle)
      if (notes) results.push({ year, weekNumber, notes })
    }
    return results
  } catch {
    return []
  }
}
