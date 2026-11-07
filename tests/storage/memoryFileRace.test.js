/**
 * Races while initialising kaizen_memory.json in a folder that looked empty.
 *
 * initializeMemoryFileIfMissing() checks for the file, then calls
 * getFileHandle(..., { create: true }), then writes through createWritable().
 * Something else (another tab, a sync client, the user unzipping a backup) can
 * create or fill the file at any point in between. The File System Access API
 * has no exclusive create and no compare-and-swap: createWritable().close()
 * replaces whatever the target holds at that moment.
 *
 * Windows, in order:
 *   W1  check (NotFoundError)  → getFileHandle({ create: true })
 *   W2  getFileHandle(create)  → our size check
 *   W3  our size check         → writable.close()
 *
 * W2 and W3 are detectable and must keep the other file byte-identical.
 *
 * Kaizen also writes with createWritable({ mode: 'exclusive' }). That locks out
 * other File System Access API writers in this browser (another Kaizen tab)
 * while initialisation writes, and fails closed if one is already open. It
 * does not lock out other programs or sync clients, which is why the W1–W3
 * checks stay.
 * W1 is not, for a zero-byte file only: after create: true, an empty file that
 * appeared in W1 is indistinguishable from the empty file create: true makes.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  MEMORY_FILE_NAME,
  initializeMemoryFileIfMissing,
  connectChosenFolder,
  describeConnectError,
} from '../../src/utils/memoryStore.js'
import { createFakeFileSystem } from '../support/fakeFileSystem.js'

const OTHER_MEMORY = '{\n\t"practitionerName": "SYNTHETIC — Ravi",\n\t"createdAt": "2025-03-02T08:00:00.000Z"\n}\n'

/**
 * Wraps the folder so `onEvent(stage, fs)` runs at chosen points:
 *   'checked'   after the create: false lookup reported NotFoundError       (W1)
 *   'created'   after getFileHandle({ create: true }) returned              (W2)
 *   'written'   after writable.write(), before writable.close()            (W3)
 */
function racingFolder(onEvent) {
  const fs = createFakeFileSystem()
  const root = fs.root
  const handle = {
    kind: 'directory',
    name: root.name,
    async getFileHandle(name, opts) {
      if (!opts?.create) {
        try {
          return await root.getFileHandle(name, opts)
        } catch (err) {
          if (err?.name === 'NotFoundError') onEvent('checked', fs)
          throw err
        }
      }
      const fileHandle = await root.getFileHandle(name, opts)
      onEvent('created', fs)
      return {
        kind: 'file',
        name: fileHandle.name,
        getFile: () => fileHandle.getFile(),
        async createWritable(o) {
          const w = await fileHandle.createWritable(o)
          return {
            write: async (d) => {
              await w.write(d)
              onEvent('written', fs)
            },
            close: () => w.close(),
            abort: () => w.abort(),
          }
        },
      }
    },
  }
  return { fs, handle }
}

/**
 * Another writer commits `content` to kaizen_memory.json. Creates the file if
 * absent; otherwise changes it in place, because Chrome's close() replaces
 * whatever is at the path, so Kaizen's open writable must still land on it.
 */
function overwrite(fs, content) {
  const node = fs.getNode(MEMORY_FILE_NAME)
  if (!node) return fs.seed(MEMORY_FILE_NAME, content)
  node.content = content
  node.lastModified = node.lastModified + 1000
}

describe('initializeMemoryFileIfMissing races', () => {
  it('W1: keeps a non-empty file that appears between the check and create: true', async () => {
    const { fs, handle } = racingFolder((stage, f) => stage === 'checked' && overwrite(f, OTHER_MEMORY))
    expect(await initializeMemoryFileIfMissing(handle)).toBe('existing')
    expect(fs.read(MEMORY_FILE_NAME)).toBe(OTHER_MEMORY)
    expect(fs.writeLog).toEqual([])
  })

  it('W2: keeps a file filled between create: true and the size check', async () => {
    const { fs, handle } = racingFolder((stage, f) => stage === 'created' && overwrite(f, OTHER_MEMORY))
    expect(await initializeMemoryFileIfMissing(handle)).toBe('existing')
    expect(fs.read(MEMORY_FILE_NAME)).toBe(OTHER_MEMORY)
    expect(fs.writeLog).toEqual([])
  })

  it('W3: keeps a file filled while Kaizen is writing, and does not commit', async () => {
    const { fs, handle } = racingFolder((stage, f) => stage === 'written' && overwrite(f, OTHER_MEMORY))
    expect(await initializeMemoryFileIfMissing(handle)).toBe('existing')
    expect(fs.read(MEMORY_FILE_NAME)).toBe(OTHER_MEMORY)
    expect(fs.writeLog).toEqual([])
  })

  it('W3: does not commit when an empty file is replaced by another empty file meanwhile', async () => {
    const { fs, handle } = racingFolder((stage, f) => stage === 'written' && overwrite(f, ''))
    expect(await initializeMemoryFileIfMissing(handle)).toBe('existing')
    expect(fs.read(MEMORY_FILE_NAME)).toBe('')
    expect(fs.writeLog).toEqual([])
  })

  it('W3 through connectChosenFolder: keeps the other file and still connects to it', async () => {
    const { fs, handle } = racingFolder((stage, f) => stage === 'written' && overwrite(f, OTHER_MEMORY))
    const saved = []
    expect(await connectChosenFolder(handle, { saveHandle: async (h) => saved.push(h) })).toEqual({
      ok: true,
      memory: 'existing',
    })
    expect(saved).toEqual([handle])
    expect(fs.read(MEMORY_FILE_NAME)).toBe(OTHER_MEMORY)
  })

  // Known limitation of the File System Access API, not a Kaizen bug that can
  // be fixed in this layer: getFileHandle({ create: true }) does not say
  // whether it created the file, so a zero-byte file that appears in W1 looks
  // exactly like the one Kaizen just created and receives the default memory.
  // No bytes are lost (the file was empty), but it is not byte-identical.
  // If this ever starts passing, the limitation is gone: change it to it().
  it.fails('W1 limitation: a zero-byte file that appears between the check and create: true stays byte-identical', async () => {
    const { fs, handle } = racingFolder((stage, f) => stage === 'checked' && f.seed(MEMORY_FILE_NAME, ''))
    await initializeMemoryFileIfMissing(handle)
    expect(fs.read(MEMORY_FILE_NAME)).toBe('')
  })

  it('W1 limitation is bounded: only an empty file can be affected, and it gets only the default memory', async () => {
    const { fs, handle } = racingFolder((stage, f) => stage === 'checked' && f.seed(MEMORY_FILE_NAME, ''))
    expect(await initializeMemoryFileIfMissing(handle)).toBe('created')
    expect(Object.keys(fs.readJSON(MEMORY_FILE_NAME)).sort()).toEqual(['createdAt', 'initialized'])
  })

  it('aborts the writable when the write fails, so nothing is committed', async () => {
    const fs = createFakeFileSystem().failWrites(MEMORY_FILE_NAME, { stage: 'write' })
    await expect(initializeMemoryFileIfMissing(fs.root)).rejects.toMatchObject({ name: 'InvalidStateError' })
    expect(fs.writeLog).toEqual([])
  })
})

/** Like racingFolder, but `onEvent` may be async (it awaits other writers). */
function asyncRacingFolder(onEvent) {
  const fs = createFakeFileSystem()
  const root = fs.root
  const handle = {
    kind: 'directory',
    name: root.name,
    async getFileHandle(name, opts) {
      if (!opts?.create) return root.getFileHandle(name, opts)
      const fileHandle = await root.getFileHandle(name, opts)
      await onEvent('created', fs)
      return {
        kind: 'file',
        name: fileHandle.name,
        getFile: () => fileHandle.getFile(),
        async createWritable(o) {
          const w = await fileHandle.createWritable(o)
          return {
            write: async (d) => {
              await w.write(d)
              await onEvent('written', fs)
            },
            close: () => w.close(),
            abort: () => w.abort(),
          }
        },
      }
    },
  }
  return { fs, handle }
}

describe('exclusive writer during initialisation', () => {
  it('fails closed when another tab already holds an exclusive writer: nothing committed, handle not saved', async () => {
    let other
    const { fs, handle } = asyncRacingFolder(async (stage, f) => {
      if (stage === 'created') other = await f.holdWriter(MEMORY_FILE_NAME, 'exclusive')
    })
    const saveHandle = vi.fn(async () => {})

    const result = await connectChosenFolder(handle, { saveHandle })

    expect(result).toMatchObject({ ok: false, reason: 'error', stage: 'create' })
    expect(result.error.name).toBe('NoModificationAllowedError')
    expect(saveHandle).not.toHaveBeenCalled()
    expect(fs.writeLog).toEqual([])

    // The other tab finishes; its file is what remains, byte-identical.
    await other.commit(OTHER_MEMORY)
    expect(fs.read(MEMORY_FILE_NAME)).toBe(OTHER_MEMORY)
  })

  it('fails closed when another tab holds an ordinary (siloed) writer, with no siloed fallback', async () => {
    let other
    const { fs, handle } = asyncRacingFolder(async (stage, f) => {
      if (stage === 'created') other = await f.holdWriter(MEMORY_FILE_NAME, 'siloed')
    })
    const saveHandle = vi.fn(async () => {})

    const result = await connectChosenFolder(handle, { saveHandle })

    expect(result).toMatchObject({ ok: false, stage: 'create' })
    expect(result.error.name).toBe('NoModificationAllowedError')
    expect(saveHandle).not.toHaveBeenCalled()
    // Had Kaizen fallen back to a siloed writer, it would have committed here.
    expect(fs.writeLog).toEqual([])
    await other.commit(OTHER_MEMORY)
    expect(fs.read(MEMORY_FILE_NAME)).toBe(OTHER_MEMORY)
  })

  it('keeps another tab from opening a writer while Kaizen is writing', async () => {
    let otherError
    const { fs, handle } = asyncRacingFolder(async (stage, f) => {
      if (stage !== 'written') return
      otherError = await f.holdWriter(MEMORY_FILE_NAME, 'siloed').then(
        () => null,
        (e) => e
      )
    })

    expect(await initializeMemoryFileIfMissing(handle)).toBe('created')
    expect(otherError?.name).toBe('NoModificationAllowedError')
    expect(fs.writeLog).toHaveLength(1)
    expect(Object.keys(fs.readJSON(MEMORY_FILE_NAME)).sort()).toEqual(['createdAt', 'initialized'])
  })

  it('releases the lock after success and after a failure', async () => {
    const ok = createFakeFileSystem()
    await initializeMemoryFileIfMissing(ok.root)
    await expect(ok.holdWriter(MEMORY_FILE_NAME, 'exclusive')).resolves.toBeTruthy()

    const failing = createFakeFileSystem().failWrites(MEMORY_FILE_NAME, { stage: 'write' })
    await expect(initializeMemoryFileIfMissing(failing.root)).rejects.toMatchObject({ name: 'InvalidStateError' })
    await expect(failing.holdWriter(MEMORY_FILE_NAME, 'exclusive')).resolves.toBeTruthy()
  })

  it('fails closed in a browser that ignores the mode option, instead of writing unlocked', async () => {
    const fs = createFakeFileSystem().ignoreWritableMode()
    const saveHandle = vi.fn(async () => {})

    const result = await connectChosenFolder(fs.root, { saveHandle })

    expect(result).toMatchObject({ ok: false, stage: 'create' })
    expect(result.error.name).toBe('ExclusiveWriteUnsupportedError')
    expect(saveHandle).not.toHaveBeenCalled()
    expect(fs.writeLog).toEqual([])
  })

  it('an existing memory never reaches the writer, so contention cannot affect it', async () => {
    const fs = createFakeFileSystem({ files: { [MEMORY_FILE_NAME]: OTHER_MEMORY } })
    const other = await fs.holdWriter(MEMORY_FILE_NAME, 'exclusive')
    const saveHandle = vi.fn(async () => {})

    expect(await connectChosenFolder(fs.root, { saveHandle })).toEqual({ ok: true, memory: 'existing' })
    expect(fs.read(MEMORY_FILE_NAME)).toBe(OTHER_MEMORY)
    await other.release()
  })

  it('explains contention and an unsupported lock, and says nothing was changed', () => {
    const named = (n) => Object.assign(new Error(n), { name: n })
    const busy = describeConnectError(named('NoModificationAllowedError'), 'create')
    const unsupported = describeConnectError(named('ExclusiveWriteUnsupportedError'), 'create')
    expect(busy).toMatch(/Another Kaizen tab or program was writing kaizen_memory\.json/)
    expect(unsupported).toMatch(/could not reserve kaizen_memory\.json/)
    for (const m of [busy, unsupported]) expect(m).toMatch(/was not connected\. Nothing already in it was changed/)
  })
})
