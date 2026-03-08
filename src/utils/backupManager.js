/**
 * Memory backup: ZIP the entire connected folder and trigger download.
 */

import JSZip from 'jszip'

async function ensurePermission(handle) {
  if (handle?.queryPermission && (await handle.queryPermission({ mode: 'read' })) !== 'granted') {
    await handle.requestPermission({ mode: 'read' })
  }
}

/**
 * Recursively add a folder and all its contents to a JSZip folder.
 */
async function addFolderToZip(folderHandle, zipFolder) {
  await ensurePermission(folderHandle)
  for await (const [name, handle] of folderHandle.entries()) {
    if (handle.kind === 'file') {
      const file = await handle.getFile()
      const content = await file.arrayBuffer()
      zipFolder.file(name, content)
    } else if (handle.kind === 'directory') {
      const subFolder = zipFolder.folder(name)
      await addFolderToZip(handle, subFolder)
    }
  }
}

/**
 * Create a ZIP of the entire connected folder and trigger download.
 * Filename: kaizen-memory-[YYYY-MM-DD].zip
 */
export async function createMemoryBackup(folderHandle) {
  if (!folderHandle || typeof folderHandle.entries !== 'function') {
    throw new Error('No folder connected')
  }
  const zip = new JSZip()
  await addFolderToZip(folderHandle, zip)
  const date = new Date()
  const dateStr = date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0')
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kaizen-memory-${dateStr}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Recursively sum file sizes in the folder.
 */
async function sumFolderSize(folderHandle) {
  await ensurePermission(folderHandle)
  let total = 0
  for await (const [, handle] of folderHandle.entries()) {
    if (handle.kind === 'file') {
      const file = await handle.getFile()
      total += file.size
    } else if (handle.kind === 'directory') {
      total += await sumFolderSize(handle)
    }
  }
  return total
}

/**
 * Return approximate total size as a string: "~2.4 MB" or "~847 KB"
 */
export async function estimateMemorySize(folderHandle) {
  if (!folderHandle || typeof folderHandle.entries !== 'function') return '—'
  try {
    const bytes = await sumFolderSize(folderHandle)
    if (bytes >= 1024 * 1024) {
      const mb = bytes / (1024 * 1024)
      return `~${mb.toFixed(1)} MB`
    }
    const kb = Math.round(bytes / 1024)
    return `~${kb} KB`
  } catch {
    return '—'
  }
}
