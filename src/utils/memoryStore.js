/**
 * Persist the user's chosen folder handle in IndexedDB (Chrome).
 * File System Access API: handle can be stored and reused with permission.
 */

const DB_NAME = 'kaizen-memory'
const STORE_NAME = 'store'
const HANDLE_KEY = 'folderHandle'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME)
    }
  })
}

export async function saveFolderHandle(handle) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

export async function getFolderHandle() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result ?? null)
  })
}

export const MEMORY_FILE_NAME = 'kaizen_memory.json'

function defaultMemoryData() {
  return { initialized: true, createdAt: new Date().toISOString() }
}

/**
 * Find out whether the folder already holds kaizen_memory.json.
 *
 *   { status: 'exists' }          the file is there (its contents are not read)
 *   { status: 'missing' }         the browser reported NotFoundError
 *   { status: 'error', error }    anything else: permission refused, a folder
 *                                 with that name, an unexpected failure
 *
 * Only NotFoundError counts as absence. Every other error means "we could not
 * tell", and callers must not treat that as an empty folder.
 */
export async function checkMemoryFile(handle) {
  if (!handle || typeof handle.getFileHandle !== 'function') {
    return { status: 'error', error: new TypeError('No folder was chosen.') }
  }
  try {
    await handle.getFileHandle(MEMORY_FILE_NAME, { create: false })
    return { status: 'exists' }
  } catch (error) {
    if (error?.name === 'NotFoundError') return { status: 'missing' }
    return { status: 'error', error }
  }
}

/**
 * Create kaizen_memory.json only if the folder does not have one.
 * Never overwrites: an existing file is left byte-for-byte as it was.
 *
 * Resolves 'existing' or 'created'. Rejects (without writing) when the check
 * fails for any reason other than NotFoundError, or when the write fails.
 */
export async function initializeMemoryFileIfMissing(handle, data = defaultMemoryData()) {
  const check = await checkMemoryFile(handle)
  if (check.status === 'exists') return 'existing'
  if (check.status === 'error') throw check.error

  const fileHandle = await handle.getFileHandle(MEMORY_FILE_NAME, { create: true })
  // If a file appeared since the check, it has content: keep it.
  const current = await fileHandle.getFile()
  if (current.size > 0) return 'existing'

  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
  return 'created'
}

/**
 * Connect a folder the user just chose, without ever replacing its memory.
 *
 * - existing memory file → left untouched, handle saved
 * - no memory file       → created only when createIfMissing is true, then handle saved;
 *                          otherwise { ok: false, reason: 'missing' } and nothing is written
 * - any other error      → nothing is written and the handle is NOT saved
 *
 * Returns { ok: true, memory: 'existing' | 'created' }
 *      or { ok: false, reason: 'missing' | 'error', error? }.
 */
export async function connectChosenFolder(handle, { createIfMissing = true, saveHandle = saveFolderHandle } = {}) {
  try {
    const check = await checkMemoryFile(handle)
    if (check.status === 'error') return { ok: false, reason: 'error', error: check.error }
    if (check.status === 'missing' && !createIfMissing) return { ok: false, reason: 'missing' }

    const memory = check.status === 'exists' ? 'existing' : await initializeMemoryFileIfMissing(handle)
    await saveHandle(handle)
    return { ok: true, memory }
  } catch (error) {
    return { ok: false, reason: 'error', error }
  }
}

/**
 * Words for a failed connection. The folder was not connected, and no existing
 * file in it was changed.
 */
export function describeConnectError(error) {
  const name = error?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Kaizen was not allowed to open this folder, so it was not connected. Nothing already in it was changed. Choose the folder again and allow Kaizen to view and edit its files.'
  }
  if (name === 'TypeMismatchError') {
    return 'This folder has a folder named kaizen_memory.json where Kaizen expects a file, so it was not connected. Nothing already in it was changed.'
  }
  return 'Kaizen could not check this folder for an existing memory, so it was not connected. Nothing already in it was changed. Please try again.'
}

/**
 * Read kaizen_memory.json from the folder.
 */
export async function readMemoryFile(handle) {
  if (!handle?.getFileHandle) return null
  try {
    const fileHandle = await handle.getFileHandle('kaizen_memory.json', { create: false })
    const file = await fileHandle.getFile()
    const text = await file.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Update kaizen_memory.json with partial data (merge with existing).
 */
export async function updateMemoryFile(handle, updates) {
  if (!handle?.getFileHandle) return
  const existing = await readMemoryFile(handle)
  const data = { ...(existing || {}), ...updates }
  const fileHandle = await handle.getFileHandle('kaizen_memory.json', { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}
