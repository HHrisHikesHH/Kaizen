import { describe, it, expect } from 'vitest'
import { createFakeFileSystem } from './fakeFileSystem.js'

async function readText(dir, ...parts) {
  let d = dir
  for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p)
  const fh = await d.getFileHandle(parts.at(-1))
  return (await fh.getFile()).text()
}

describe('fake File System Access API', () => {
  it('reports missing files and directories as NotFoundError', async () => {
    const fs = createFakeFileSystem()
    await expect(fs.root.getDirectoryHandle('2026')).rejects.toMatchObject({ name: 'NotFoundError' })
    await expect(fs.root.getFileHandle('nope.json')).rejects.toMatchObject({ name: 'NotFoundError' })
  })

  it('reads existing seeded files, including nested directories', async () => {
    const fs = createFakeFileSystem({ files: { '2026/11/2026-11-06.json': { date: '2026-11-06' } } })
    const text = await readText(fs.root, '2026', '11', '2026-11-06.json')
    expect(JSON.parse(text)).toEqual({ date: '2026-11-06' })
    expect(fs.list()).toEqual(['2026/11/2026-11-06.json'])
  })

  it('stores corrupt JSON verbatim so readers see a parse failure', async () => {
    const fs = createFakeFileSystem({ files: { 'kaizen_memory.json': '{"name": "unterminated' } })
    const text = await readText(fs.root, 'kaizen_memory.json')
    expect(() => JSON.parse(text)).toThrow()
  })

  it('creates nested directories and commits writes only on close', async () => {
    const fs = createFakeFileSystem()
    const y = await fs.root.getDirectoryHandle('2026', { create: true })
    const m = await y.getDirectoryHandle('11', { create: true })
    const fh = await m.getFileHandle('a.json', { create: true })
    const w = await fh.createWritable()
    await w.write('{"a":1}')
    expect(fs.read('2026/11/a.json')).toBe('')
    await w.close()
    expect(fs.readJSON('2026/11/a.json')).toEqual({ a: 1 })
    expect(fs.writeLog.map((e) => e.path)).toEqual(['2026/11/a.json'])
  })

  it('rejects type mismatches', async () => {
    const fs = createFakeFileSystem({ files: { 'AI_notes': 'not a dir' } })
    await expect(fs.root.getDirectoryHandle('AI_notes')).rejects.toMatchObject({ name: 'TypeMismatchError' })
  })

  it('lists entries via entries(), keys() and async iteration', async () => {
    const fs = createFakeFileSystem({ files: { 'a.json': {}, 'dir/b.json': {} } })
    const names = []
    for await (const [name, h] of fs.root.entries()) names.push(`${name}:${h.kind}`)
    expect(names.sort()).toEqual(['a.json:file', 'dir:directory'])
    const keys = []
    for await (const k of fs.root.keys()) keys.push(k)
    expect(keys.sort()).toEqual(['a.json', 'dir'])
  })

  describe('permission', () => {
    it('denies every operation when permission is not granted', async () => {
      const fs = createFakeFileSystem({ files: { 'a.json': {} } }).setPermission('prompt')
      expect(await fs.root.queryPermission({ mode: 'readwrite' })).toBe('prompt')
      await expect(fs.root.getFileHandle('a.json')).rejects.toMatchObject({ name: 'NotAllowedError' })
      await expect(fs.root.entries().next()).rejects.toMatchObject({ name: 'NotAllowedError' })
    })

    it('can simulate a request that needs user activation', async () => {
      const fs = createFakeFileSystem().setPermission('prompt').setRequestPermissionBehavior('throw')
      await expect(fs.root.requestPermission({ mode: 'readwrite' })).rejects.toMatchObject({ name: 'SecurityError' })
      expect(fs.permission).toBe('prompt')
    })

    it('can simulate the user denying or granting a request', async () => {
      const denied = createFakeFileSystem().setPermission('prompt').setRequestPermissionBehavior('deny')
      expect(await denied.root.requestPermission({ mode: 'readwrite' })).toBe('denied')
      const granted = createFakeFileSystem().setPermission('prompt')
      expect(await granted.root.requestPermission({ mode: 'readwrite' })).toBe('granted')
      await expect(granted.root.getFileHandle('x', { create: true })).resolves.toBeTruthy()
    })
  })

  describe('failed writes', () => {
    for (const stage of ['create', 'write', 'close']) {
      it(`fails at ${stage} and leaves the previous content intact`, async () => {
        const fs = createFakeFileSystem({ files: { 'd/a.json': { v: 1 } } })
        fs.failWrites(/a\.json$/, { stage })
        const d = await fs.root.getDirectoryHandle('d')
        const fh = await d.getFileHandle('a.json')
        const attempt = async () => {
          const w = await fh.createWritable()
          await w.write('{"v":2}')
          await w.close()
        }
        await expect(attempt()).rejects.toThrow(/Simulated/)
        expect(fs.readJSON('d/a.json')).toEqual({ v: 1 })
        expect(fs.writeLog).toEqual([])
      })
    }

    it('only fails matching paths and can be cleared', async () => {
      const fs = createFakeFileSystem()
      fs.failWrites('x.json')
      const ok = await fs.root.getFileHandle('y.json', { create: true })
      const w = await ok.createWritable()
      await w.write('1')
      await w.close()
      expect(fs.read('y.json')).toBe('1')
      fs.clearWriteFailures()
      const x = await fs.root.getFileHandle('x.json', { create: true })
      const wx = await x.createWritable()
      await wx.write('2')
      await wx.close()
      expect(fs.read('x.json')).toBe('2')
    })
  })
})
