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

/**
 * Write kaizen_memory.json into the chosen folder (init or update).
 */
export async function ensureMemoryFileInFolder(handle, data = { initialized: true, createdAt: new Date().toISOString() }) {
  if (!handle || typeof handle.getFileHandle !== 'function') return
  const fileHandle = await handle.getFileHandle('kaizen_memory.json', { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}
