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
 * Monthly notes: /AI_notes/monthly-[MM]-[YYYY]-notes.json
 */
export async function getMonthlyNotes(month, year, folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return null
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const mm = String(month).padStart(2, '0')
    const fileHandle = await aiDir.getFileHandle(`monthly-${mm}-${year}-notes.json`, { create: false })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function saveMonthlyNotes(notes, month, year, folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: true })
    const mm = String(month).padStart(2, '0')
    const fileHandle = await aiDir.getFileHandle(`monthly-${mm}-${year}-notes.json`, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(notes, null, 2))
    await writable.close()
  } catch (err) {
    console.error('Failed to save monthly notes:', err)
  }
}

/**
 * Quarterly: /AI_notes/quarterly-Q[N]-[YYYY]-notes.json
 */
export async function getQuarterlyNotes(quarter, year, folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return null
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const fileHandle = await aiDir.getFileHandle(`quarterly-Q${quarter}-${year}-notes.json`, { create: false })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function saveQuarterlyNotes(notes, quarter, year, folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: true })
    const fileHandle = await aiDir.getFileHandle(`quarterly-Q${quarter}-${year}-notes.json`, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(notes, null, 2))
    await writable.close()
  } catch (err) {
    console.error('Failed to save quarterly notes:', err)
  }
}

/**
 * Half-year: /AI_notes/half-H1-[YYYY]-notes.json, half-H2-[YYYY]-notes.json
 */
export async function getHalfYearNotes(period, year, folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return null
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const fileHandle = await aiDir.getFileHandle(`half-${period}-${year}-notes.json`, { create: false })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function saveHalfYearNotes(notes, period, year, folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: true })
    const fileHandle = await aiDir.getFileHandle(`half-${period}-${year}-notes.json`, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(notes, null, 2))
    await writable.close()
  } catch (err) {
    console.error('Failed to save half-year notes:', err)
  }
}

/**
 * Yearly: /AI_notes/yearly-[YYYY]-notes.json
 */
export async function getYearlyNotes(year, folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return null
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const fileHandle = await aiDir.getFileHandle(`yearly-${year}-notes.json`, { create: false })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function saveYearlyNotes(notes, year, folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: true })
    const fileHandle = await aiDir.getFileHandle(`yearly-${year}-notes.json`, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(notes, null, 2))
    await writable.close()
  } catch (err) {
    console.error('Failed to save yearly notes:', err)
  }
}

/**
 * List all monthly/quarterly/half/yearly notes for Growth page.
 */
export async function getAllMonthlyNotes(folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return []
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const files = []
    for await (const [name, handle] of aiDir.entries()) {
      if (handle.kind === 'file' && /^monthly-\d{2}-\d{4}-notes\.json$/.test(name)) {
        const m = name.match(/monthly-(\d{2})-(\d{4})-notes\.json/)
        if (m) files.push({ month: parseInt(m[1], 10), year: parseInt(m[2], 10), name })
      }
    }
    files.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
    const results = []
    for (const { month, year } of files) {
      const notes = await getMonthlyNotes(month, year, folderHandle)
      if (notes) results.push({ month, year, notes })
    }
    return results
  } catch {
    return []
  }
}

export async function getAllQuarterlyNotes(folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return []
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const files = []
    for await (const [name, handle] of aiDir.entries()) {
      if (handle.kind === 'file' && /^quarterly-Q[1-4]-\d{4}-notes\.json$/.test(name)) {
        const m = name.match(/quarterly-Q([1-4])-(\d{4})-notes\.json/)
        if (m) files.push({ quarter: parseInt(m[1], 10), year: parseInt(m[2], 10), name })
      }
    }
    files.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.quarter - b.quarter))
    const results = []
    for (const { quarter, year } of files) {
      const notes = await getQuarterlyNotes(quarter, year, folderHandle)
      if (notes) results.push({ quarter, year, notes })
    }
    return results
  } catch {
    return []
  }
}

export async function getAllHalfYearNotes(folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return []
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const files = []
    for await (const [name, handle] of aiDir.entries()) {
      if (handle.kind === 'file' && /^half-H[12]-\d{4}-notes\.json$/.test(name)) {
        const m = name.match(/half-(H[12])-(\d{4})-notes\.json/)
        if (m) files.push({ period: m[1], year: parseInt(m[2], 10), name })
      }
    }
    files.sort((a, b) => (a.year !== b.year ? a.year - b.year : (a.period === 'H1' ? -1 : 1)))
    const results = []
    for (const { period, year } of files) {
      const notes = await getHalfYearNotes(period, year, folderHandle)
      if (notes) results.push({ period, year, notes })
    }
    return results
  } catch {
    return []
  }
}

export async function getAllYearlyNotes(folderHandle) {
  if (!folderHandle?.getDirectoryHandle) return []
  try {
    await ensurePermission(folderHandle)
    const aiDir = await folderHandle.getDirectoryHandle('AI_notes', { create: false })
    const files = []
    for await (const [name, handle] of aiDir.entries()) {
      if (handle.kind === 'file' && /^yearly-\d{4}-notes\.json$/.test(name)) {
        const m = name.match(/yearly-(\d{4})-notes\.json/)
        if (m) files.push({ year: parseInt(m[1], 10), name })
      }
    }
    files.sort((a, b) => a.year - b.year)
    const results = []
    for (const { year } of files) {
      const notes = await getYearlyNotes(year, folderHandle)
      if (notes) results.push({ year, notes })
    }
    return results
  } catch {
    return []
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
