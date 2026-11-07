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
  const before = await fileHandle.getFile()
  if (before.size > 0) return 'existing'

  // Exclusive mode: while this writer is open, no other File System Access API
  // writer (another Kaizen tab, say) can open the file, and if one is already
  // open this rejects with NoModificationAllowedError. That error is passed
  // up: the connection fails closed, with no fallback to the default (siloed)
  // mode. It does not stop other programs or sync clients writing the file.
  const writable = await fileHandle.createWritable({ mode: 'exclusive' })
  try {
    await assertExclusiveWriterHeld(fileHandle)
    // createWritable() writes to a swap file and close() replaces whatever is
    // at the path, so check again just before committing: if anything changed
    // the file meanwhile (a sync client, another program), discard our write.
    await writable.write(JSON.stringify(data, null, 2))
    const now = await fileHandle.getFile()
    if (now.size !== 0 || now.lastModified !== before.lastModified) {
      await writable.abort()
      return 'existing'
    }
  } catch (error) {
    await writable.abort().catch(() => {})
    throw error
  }
  // What the File System Access API cannot guarantee (it has no exclusive
  // create and no compare-and-swap, and the exclusive writer only locks out
  // other writers using this API in this browser, not other programs or sync
  // clients):
  //  - a change by another program landing between the check above and
  //    close() is not seen;
  //  - a zero-byte file that appeared between checkMemoryFile() and
  //    create: true looks exactly like the one create: true makes, so it
  //    receives the default memory (it had no bytes to lose).
  // See tests/storage/memoryFileRace.test.js.
  await writable.close()
  return 'created'
}

/**
 * A browser that does not know createWritable's `mode` option ignores it and
 * opens an ordinary siloed writer. Detect that rather than silently running
 * without the lock: while our exclusive writer is open, a second writer must
 * be refused with NoModificationAllowedError.
 */
async function assertExclusiveWriterHeld(fileHandle) {
  let probe
  try {
    probe = await fileHandle.createWritable()
  } catch (error) {
    if (error?.name === 'NoModificationAllowedError') return
    throw error
  }
  await probe.abort().catch(() => {})
  const error = new Error('This browser did not lock kaizen_memory.json for exclusive writing.')
  error.name = 'ExclusiveWriteUnsupportedError'
  throw error
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
 *      or { ok: false, reason: 'missing' }
 *      or { ok: false, reason: 'error', stage: 'check' | 'create' | 'remember', error }.
 */
export async function connectChosenFolder(handle, { createIfMissing = true, saveHandle = saveFolderHandle } = {}) {
  let stage = 'check'
  try {
    const check = await checkMemoryFile(handle)
    if (check.status === 'error') return { ok: false, reason: 'error', stage, error: check.error }
    if (check.status === 'missing' && !createIfMissing) return { ok: false, reason: 'missing' }

    stage = 'create'
    const memory = check.status === 'exists' ? 'existing' : await initializeMemoryFileIfMissing(handle)
    stage = 'remember'
    await saveHandle(handle)
    return { ok: true, memory }
  } catch (error) {
    return { ok: false, reason: 'error', stage, error }
  }
}

/**
 * Words for a failed connection. The folder was not connected, and no existing
 * file in it was changed.
 */
export function describeConnectError(error, stage = 'check') {
  const name = error?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Kaizen was not allowed to open this folder, so it was not connected. Nothing already in it was changed. Choose the folder again and allow Kaizen to view and edit its files.'
  }
  if (name === 'TypeMismatchError') {
    return 'This folder has a folder named kaizen_memory.json where Kaizen expects a file, so it was not connected. Nothing already in it was changed.'
  }
  if (name === 'NoModificationAllowedError') {
    return 'Another Kaizen tab or program was writing kaizen_memory.json in this folder at the same moment, so it was not connected. Nothing already in it was changed. Close other Kaizen tabs and try again.'
  }
  if (name === 'ExclusiveWriteUnsupportedError') {
    return 'This browser could not reserve kaizen_memory.json while starting a new memory, so the folder was not connected. Nothing already in it was changed. Please update Chrome and try again.'
  }
  if (stage === 'create') {
    return 'Kaizen could not start a new memory in this folder, so it was not connected. Nothing already in it was changed, though an empty kaizen_memory.json may have been left behind. Please try again.'
  }
  if (stage === 'remember') {
    return 'Kaizen could not remember this folder, so it was not connected. Nothing already in it was changed. Please try again.'
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
