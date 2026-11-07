/**
 * Connecting a folder must never replace an existing kaizen_memory.json.
 *
 * Regression: onboarding called ensureMemoryFileInFolder(), which always
 * wrote { initialized, createdAt } with create: true, so choosing a folder
 * that already held a Kaizen memory (for example a restored backup) replaced
 * its stored name and createdAt. Settings checked first, but treated every
 * error, including a refused permission, as "no memory file", and then
 * offered to initialise the folder.
 *
 * Only a NotFoundError means the file is absent. Any other error stops the
 * connection: nothing is written and the folder handle is not saved.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  MEMORY_FILE_NAME,
  checkMemoryFile,
  initializeMemoryFileIfMissing,
  connectChosenFolder,
  describeConnectError,
  readMemoryFile,
} from '../../src/utils/memoryStore.js'
import { createFakeFileSystem } from '../support/fakeFileSystem.js'

// Deliberately not the app's own formatting (tabs, key order, trailing
// newline), so any rewrite, even of identical data, would change the bytes.
const EXISTING_MEMORY =
  '{\n\t"practitionerName": "SYNTHETIC — Asha",\n\t"name": "SYNTHETIC — Asha",\n\t"createdAt": "2024-12-30T19:04:11.000Z",\n\t"initialized": true\n}\n'

function folderWithMemory(content = EXISTING_MEMORY) {
  return createFakeFileSystem({
    files: {
      [MEMORY_FILE_NAME]: content,
      '2026/11/2026-11-07.json': { date: '2026-11-07', sessionComplete: true },
    },
  })
}

function emptyFolder() {
  return createFakeFileSystem()
}

/** A handle whose lookups fail with the given error, like a broken disk. */
function failingHandle(error) {
  return {
    kind: 'directory',
    name: 'broken',
    getFileHandle: vi.fn(async () => {
      throw error
    }),
  }
}

function namedError(name, message = name) {
  const err = new Error(message)
  err.name = name
  return err
}

describe('checkMemoryFile', () => {
  it('reports an existing memory file without reading or writing it', async () => {
    const fs = folderWithMemory()
    expect(await checkMemoryFile(fs.root)).toEqual({ status: 'exists' })
    expect(fs.read(MEMORY_FILE_NAME)).toBe(EXISTING_MEMORY)
    expect(fs.writeLog).toEqual([])
  })

  it('reports missing only for a genuine NotFoundError', async () => {
    const fs = emptyFolder()
    expect(await checkMemoryFile(fs.root)).toEqual({ status: 'missing' })
    expect(fs.list()).toEqual([])
  })

  it('reports a refused permission as an error, not as a missing file', async () => {
    const fs = folderWithMemory().setPermission('denied')
    const result = await checkMemoryFile(fs.root)
    expect(result.status).toBe('error')
    expect(result.error.name).toBe('NotAllowedError')
  })

  it('reports a permission still at the prompt as an error', async () => {
    const fs = emptyFolder().setPermission('prompt')
    const result = await checkMemoryFile(fs.root)
    expect(result.status).toBe('error')
    expect(result.error.name).toBe('NotAllowedError')
  })

  it('reports a folder named kaizen_memory.json as an error', async () => {
    const fs = createFakeFileSystem({ files: { [`${MEMORY_FILE_NAME}/x.json`]: {} } })
    const result = await checkMemoryFile(fs.root)
    expect(result.status).toBe('error')
    expect(result.error.name).toBe('TypeMismatchError')
  })

  it('reports an unexpected failure as an error', async () => {
    const boom = new Error('disk unavailable')
    expect(await checkMemoryFile(failingHandle(boom))).toEqual({ status: 'error', error: boom })
  })

  it('reports a missing handle as an error', async () => {
    expect((await checkMemoryFile(null)).status).toBe('error')
  })
})

describe('initializeMemoryFileIfMissing', () => {
  it('leaves an existing memory file byte-identical', async () => {
    const fs = folderWithMemory()
    expect(await initializeMemoryFileIfMissing(fs.root)).toBe('existing')
    expect(fs.read(MEMORY_FILE_NAME)).toBe(EXISTING_MEMORY)
    expect(fs.writeLog).toEqual([])
  })

  it('leaves an existing but unreadable (corrupt) memory file byte-identical', async () => {
    const corrupt = '{"practitionerName": "SYNTHETIC — unterminated'
    const fs = folderWithMemory(corrupt)
    expect(await initializeMemoryFileIfMissing(fs.root)).toBe('existing')
    expect(fs.read(MEMORY_FILE_NAME)).toBe(corrupt)
    expect(fs.writeLog).toEqual([])
  })

  it('creates the default memory file in a folder that has none', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-08T10:00:00.000Z'), toFake: ['Date'] })
    try {
      const fs = emptyFolder()
      expect(await initializeMemoryFileIfMissing(fs.root)).toBe('created')
      expect(fs.list()).toEqual([MEMORY_FILE_NAME])
      expect(fs.read(MEMORY_FILE_NAME)).toBe(
        JSON.stringify({ initialized: true, createdAt: '2026-11-08T10:00:00.000Z' }, null, 2)
      )
      expect(fs.writeLog).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not write when permission is refused', async () => {
    const fs = emptyFolder().setPermission('denied')
    await expect(initializeMemoryFileIfMissing(fs.root)).rejects.toMatchObject({ name: 'NotAllowedError' })
    fs.setPermission('granted')
    expect(fs.list()).toEqual([])
    expect(fs.writeLog).toEqual([])
  })

  it('propagates an unexpected error without trying to create the file', async () => {
    const boom = new Error('disk unavailable')
    const handle = failingHandle(boom)
    await expect(initializeMemoryFileIfMissing(handle)).rejects.toBe(boom)
    expect(handle.getFileHandle).toHaveBeenCalledTimes(1)
    expect(handle.getFileHandle).toHaveBeenCalledWith(MEMORY_FILE_NAME, { create: false })
  })

  it('keeps a memory file that appears between the check and the write', async () => {
    const fs = emptyFolder()
    const realGetFileHandle = fs.root.getFileHandle.bind(fs.root)
    const handle = {
      name: fs.root.name,
      async getFileHandle(name, opts) {
        const result = realGetFileHandle(name, opts)
        // The check has just reported NotFoundError; another tab writes the file.
        if (!opts?.create) result.catch(() => fs.seed(MEMORY_FILE_NAME, EXISTING_MEMORY))
        return result
      },
    }
    expect(await initializeMemoryFileIfMissing(handle)).toBe('existing')
    expect(fs.read(MEMORY_FILE_NAME)).toBe(EXISTING_MEMORY)
    expect(fs.writeLog).toEqual([])
  })
})

describe('connectChosenFolder (onboarding: createIfMissing defaults to true)', () => {
  it('connects a folder with an existing memory without changing it', async () => {
    const fs = folderWithMemory()
    const before = new Map(fs.list().map((p) => [p, fs.read(p)]))
    const saveHandle = vi.fn(async () => {})

    expect(await connectChosenFolder(fs.root, { saveHandle })).toEqual({ ok: true, memory: 'existing' })

    expect(saveHandle).toHaveBeenCalledWith(fs.root)
    expect(fs.writeLog).toEqual([])
    expect(new Map(fs.list().map((p) => [p, fs.read(p)]))).toEqual(before)
  })

  it('keeps the stored name and createdAt readable after connecting', async () => {
    const fs = folderWithMemory()
    await connectChosenFolder(fs.root, { saveHandle: async () => {} })
    expect(await readMemoryFile(fs.root)).toEqual({
      practitionerName: 'SYNTHETIC — Asha',
      name: 'SYNTHETIC — Asha',
      createdAt: '2024-12-30T19:04:11.000Z',
      initialized: true,
    })
  })

  it('initialises a new folder, then saves its handle', async () => {
    const fs = emptyFolder()
    const order = []
    const saveHandle = vi.fn(async () => order.push(['save', fs.exists(MEMORY_FILE_NAME)]))

    expect(await connectChosenFolder(fs.root, { saveHandle })).toEqual({ ok: true, memory: 'created' })

    expect(order).toEqual([['save', true]])
    const data = fs.readJSON(MEMORY_FILE_NAME)
    expect(Object.keys(data).sort()).toEqual(['createdAt', 'initialized'])
    expect(data.initialized).toBe(true)
    expect(Number.isNaN(Date.parse(data.createdAt))).toBe(false)
  })

  it('does not initialise or save the handle when permission is refused (onboarding stays put)', async () => {
    const fs = emptyFolder().setPermission('denied')
    const saveHandle = vi.fn(async () => {})

    const result = await connectChosenFolder(fs.root, { saveHandle })

    expect(result).toMatchObject({ ok: false, reason: 'error' })
    expect(result.error.name).toBe('NotAllowedError')
    expect(saveHandle).not.toHaveBeenCalled()
    fs.setPermission('granted')
    expect(fs.list()).toEqual([])
  })

  it('does not overwrite an existing memory when permission is refused', async () => {
    const fs = folderWithMemory().setPermission('denied')
    const saveHandle = vi.fn(async () => {})

    expect((await connectChosenFolder(fs.root, { saveHandle })).ok).toBe(false)

    expect(saveHandle).not.toHaveBeenCalled()
    fs.setPermission('granted')
    expect(fs.read(MEMORY_FILE_NAME)).toBe(EXISTING_MEMORY)
    expect(fs.writeLog).toEqual([])
  })

  it('returns an unexpected check error and saves nothing', async () => {
    const boom = new Error('disk unavailable')
    const handle = failingHandle(boom)
    const saveHandle = vi.fn(async () => {})

    expect(await connectChosenFolder(handle, { saveHandle })).toEqual({ ok: false, reason: 'error', error: boom })
    expect(saveHandle).not.toHaveBeenCalled()
    expect(handle.getFileHandle).toHaveBeenCalledTimes(1)
  })

  it('returns a failed initial write and does not save the handle', async () => {
    const fs = emptyFolder().failWrites(MEMORY_FILE_NAME, { stage: 'close' })
    const saveHandle = vi.fn(async () => {})

    const result = await connectChosenFolder(fs.root, { saveHandle })

    expect(result).toMatchObject({ ok: false, reason: 'error' })
    expect(result.error.name).toBe('InvalidStateError')
    expect(saveHandle).not.toHaveBeenCalled()
    expect(fs.writeLog).toEqual([])
  })

  it('reports a failure to remember the folder as a failed connection', async () => {
    const fs = folderWithMemory()
    const idbError = namedError('UnknownError', 'IndexedDB unavailable')

    const result = await connectChosenFolder(fs.root, { saveHandle: async () => { throw idbError } })

    expect(result).toEqual({ ok: false, reason: 'error', error: idbError })
    expect(fs.read(MEMORY_FILE_NAME)).toBe(EXISTING_MEMORY)
  })
})

describe('connectChosenFolder (Settings reconnect: createIfMissing false, then confirm)', () => {
  it('reconnects an existing memory without changing it', async () => {
    const fs = folderWithMemory()
    const saveHandle = vi.fn(async () => {})

    expect(await connectChosenFolder(fs.root, { createIfMissing: false, saveHandle })).toEqual({
      ok: true,
      memory: 'existing',
    })
    expect(saveHandle).toHaveBeenCalledWith(fs.root)
    expect(fs.read(MEMORY_FILE_NAME)).toBe(EXISTING_MEMORY)
    expect(fs.writeLog).toEqual([])
  })

  it('asks before initialising a folder without memory, writing nothing yet', async () => {
    const fs = emptyFolder()
    const saveHandle = vi.fn(async () => {})

    expect(await connectChosenFolder(fs.root, { createIfMissing: false, saveHandle })).toEqual({
      ok: false,
      reason: 'missing',
    })
    expect(saveHandle).not.toHaveBeenCalled()
    expect(fs.list()).toEqual([])

    // The user confirms "yes, continue".
    expect(await connectChosenFolder(fs.root, { saveHandle })).toEqual({ ok: true, memory: 'created' })
    expect(saveHandle).toHaveBeenCalledTimes(1)
    expect(fs.exists(MEMORY_FILE_NAME)).toBe(true)
  })

  it('does not offer to initialise when permission is refused', async () => {
    const fs = folderWithMemory().setPermission('denied')
    const saveHandle = vi.fn(async () => {})

    const result = await connectChosenFolder(fs.root, { createIfMissing: false, saveHandle })

    expect(result.reason).toBe('error') // not 'missing', so no "new practice" prompt
    expect(saveHandle).not.toHaveBeenCalled()
    fs.setPermission('granted')
    expect(fs.read(MEMORY_FILE_NAME)).toBe(EXISTING_MEMORY)
  })

  it('keeps a memory file that appeared while the confirmation was open', async () => {
    const fs = emptyFolder()
    const saveHandle = vi.fn(async () => {})
    expect((await connectChosenFolder(fs.root, { createIfMissing: false, saveHandle })).reason).toBe('missing')

    fs.seed(MEMORY_FILE_NAME, EXISTING_MEMORY) // e.g. a backup extracted into the folder meanwhile

    expect(await connectChosenFolder(fs.root, { saveHandle })).toEqual({ ok: true, memory: 'existing' })
    expect(fs.read(MEMORY_FILE_NAME)).toBe(EXISTING_MEMORY)
    expect(fs.writeLog).toEqual([])
  })
})

describe('describeConnectError', () => {
  it('explains a refused permission', () => {
    expect(describeConnectError(namedError('NotAllowedError'))).toMatch(/not allowed/)
    expect(describeConnectError(namedError('SecurityError'))).toMatch(/not allowed/)
  })

  it('explains a folder in place of the memory file', () => {
    expect(describeConnectError(namedError('TypeMismatchError'))).toMatch(/kaizen_memory\.json/)
  })

  it('gives a general message otherwise, and every message says nothing was changed', () => {
    const messages = [
      describeConnectError(new Error('disk unavailable')),
      describeConnectError(undefined),
      describeConnectError(namedError('NotAllowedError')),
      describeConnectError(namedError('TypeMismatchError')),
    ]
    for (const m of messages) {
      expect(m).toMatch(/was not connected/)
      expect(m).toMatch(/Nothing already in it was changed/)
    }
  })
})
