/**
 * In-memory fake of the parts of the File System Access API that Kaizen uses:
 *
 *   FileSystemDirectoryHandle: kind, name, getDirectoryHandle, getFileHandle,
 *     entries / keys / values / [Symbol.asyncIterator],
 *     queryPermission, requestPermission
 *   FileSystemFileHandle: kind, name, getFile, createWritable,
 *     queryPermission, requestPermission
 *   FileSystemWritableFileStream: write, close, abort
 *
 * Behaviour mirrors Chrome closely enough for tests:
 *   - Missing entries reject with a DOMException named "NotFoundError".
 *   - Using a file as a directory (or vice versa) rejects with "TypeMismatchError".
 *   - When permission is not "granted", every operation rejects with "NotAllowedError".
 *   - createWritable() writes to a private buffer; the file only changes when
 *     close() resolves (Chrome writes to a swap file and swaps on close).
 *
 * Test controls (on FakeFileSystem):
 *   seed(path, content)          create a file (objects are JSON-encoded, strings stored verbatim,
 *                                so corrupt JSON can be seeded as a plain string)
 *   read(path) / readJSON(path)  inspect stored content
 *   exists(path) / list()        inspect the tree
 *   setPermission(state)         'granted' | 'prompt' | 'denied'
 *   setRequestPermissionBehavior('grant' | 'deny' | 'throw')
 *   failWrites(match, { stage, error })  inject failures at 'create' | 'write' | 'close'
 *   clearWriteFailures()
 *   writeLog                     every successful commit, in order: { path, content }
 */

function domError(name, message) {
  if (typeof DOMException === 'function') return new DOMException(message, name)
  const err = new Error(message)
  err.name = name
  return err
}

function splitPath(path) {
  return String(path)
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
}

function encode(content) {
  if (typeof content === 'string') return content
  return JSON.stringify(content, null, 2)
}

async function toText(data) {
  if (data == null) return ''
  if (typeof data === 'string') return data
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(data))
  if (ArrayBuffer.isView(data)) return new TextDecoder().decode(data)
  if (typeof data.text === 'function') return data.text()
  if (typeof data === 'object' && data.type === 'write') return toText(data.data)
  return String(data)
}

export class FakeFileSystem {
  constructor({ files = {}, permission = 'granted', rootName = 'kaizen-test' } = {}) {
    this.permission = permission
    this.requestPermissionBehavior = 'grant'
    this.writeFailures = []
    this.writeLog = []
    this.rootNode = { kind: 'directory', children: new Map() }
    this.root = new FakeDirectoryHandle(this, this.rootNode, rootName, [])
    for (const [path, content] of Object.entries(files)) this.seed(path, content)
  }

  // ── test controls ────────────────────────────────────────────────

  seed(path, content, { lastModified = Date.now() } = {}) {
    const parts = splitPath(path)
    const fileName = parts.pop()
    let node = this.rootNode
    for (const part of parts) {
      let child = node.children.get(part)
      if (!child) {
        child = { kind: 'directory', children: new Map() }
        node.children.set(part, child)
      }
      if (child.kind !== 'directory') throw new Error(`seed: ${part} is a file`)
      node = child
    }
    node.children.set(fileName, { kind: 'file', content: encode(content), lastModified })
    return this
  }

  getNode(path) {
    let node = this.rootNode
    for (const part of splitPath(path)) {
      if (node.kind !== 'directory') return null
      node = node.children.get(part)
      if (!node) return null
    }
    return node
  }

  exists(path) {
    return this.getNode(path) != null
  }

  read(path) {
    const node = this.getNode(path)
    return node && node.kind === 'file' ? node.content : undefined
  }

  readJSON(path) {
    const text = this.read(path)
    return text === undefined ? undefined : JSON.parse(text)
  }

  list() {
    const out = []
    const walk = (node, prefix) => {
      for (const [name, child] of node.children) {
        const p = prefix ? `${prefix}/${name}` : name
        if (child.kind === 'file') out.push(p)
        else walk(child, p)
      }
    }
    walk(this.rootNode, '')
    return out.sort()
  }

  setPermission(state) {
    this.permission = state
    return this
  }

  setRequestPermissionBehavior(behavior) {
    this.requestPermissionBehavior = behavior
    return this
  }

  failWrites(match, { stage = 'write', error } = {}) {
    this.writeFailures.push({ match, stage, error })
    return this
  }

  clearWriteFailures() {
    this.writeFailures = []
    return this
  }

  // ── internals used by the handles ────────────────────────────────

  assertPermission() {
    if (this.permission !== 'granted') {
      throw domError('NotAllowedError', 'The request is not allowed by the user agent or the platform in the current context.')
    }
  }

  maybeFailWrite(path, stage) {
    for (const f of this.writeFailures) {
      if (f.stage !== stage) continue
      const hit = typeof f.match === 'function' ? f.match(path) : f.match instanceof RegExp ? f.match.test(path) : f.match === path
      if (hit) throw f.error ?? domError('InvalidStateError', `Simulated ${stage} failure for ${path}`)
    }
  }

  async queryPermission() {
    return this.permission
  }

  async requestPermission() {
    if (this.permission === 'granted') return 'granted'
    if (this.requestPermissionBehavior === 'throw') {
      throw domError('SecurityError', 'User activation is required to request permissions.')
    }
    if (this.requestPermissionBehavior === 'deny') {
      this.permission = 'denied'
      return 'denied'
    }
    this.permission = 'granted'
    return 'granted'
  }
}

class FakeHandleBase {
  constructor(fs, node, name, pathParts) {
    this._fs = fs
    this._node = node
    this.name = name
    this._pathParts = pathParts
  }

  get _path() {
    return this._pathParts.join('/')
  }

  queryPermission(descriptor) {
    return this._fs.queryPermission(descriptor)
  }

  requestPermission(descriptor) {
    return this._fs.requestPermission(descriptor)
  }

  async isSameEntry(other) {
    return other?._node === this._node
  }
}

export class FakeDirectoryHandle extends FakeHandleBase {
  get kind() {
    return 'directory'
  }

  async getDirectoryHandle(name, { create = false } = {}) {
    this._fs.assertPermission()
    let child = this._node.children.get(name)
    if (!child) {
      if (!create) throw domError('NotFoundError', `A requested file or directory could not be found: ${name}`)
      child = { kind: 'directory', children: new Map() }
      this._node.children.set(name, child)
    }
    if (child.kind !== 'directory') throw domError('TypeMismatchError', `${name} is not a directory`)
    return new FakeDirectoryHandle(this._fs, child, name, [...this._pathParts, name])
  }

  async getFileHandle(name, { create = false } = {}) {
    this._fs.assertPermission()
    let child = this._node.children.get(name)
    if (!child) {
      if (!create) throw domError('NotFoundError', `A requested file or directory could not be found: ${name}`)
      child = { kind: 'file', content: '', lastModified: Date.now() }
      this._node.children.set(name, child)
    }
    if (child.kind !== 'file') throw domError('TypeMismatchError', `${name} is not a file`)
    return new FakeFileHandle(this._fs, child, name, [...this._pathParts, name])
  }

  async *entries() {
    this._fs.assertPermission()
    // Snapshot so mutation during iteration doesn't break the loop.
    for (const [name, child] of [...this._node.children]) {
      const parts = [...this._pathParts, name]
      yield [
        name,
        child.kind === 'directory'
          ? new FakeDirectoryHandle(this._fs, child, name, parts)
          : new FakeFileHandle(this._fs, child, name, parts),
      ]
    }
  }

  async *keys() {
    for await (const [name] of this.entries()) yield name
  }

  async *values() {
    for await (const [, handle] of this.entries()) yield handle
  }

  [Symbol.asyncIterator]() {
    return this.entries()
  }
}

export class FakeFileHandle extends FakeHandleBase {
  get kind() {
    return 'file'
  }

  async getFile() {
    this._fs.assertPermission()
    const { content, lastModified } = this._node
    return new File([content], this.name, { type: 'application/json', lastModified })
  }

  async createWritable({ keepExistingData = false } = {}) {
    this._fs.assertPermission()
    const fs = this._fs
    const node = this._node
    const path = this._path
    fs.maybeFailWrite(path, 'create')
    let buffer = keepExistingData ? node.content : ''
    let closed = false
    return {
      async write(data) {
        if (closed) throw domError('TypeError', 'Stream is closed')
        fs.maybeFailWrite(path, 'write')
        buffer += await toText(data)
      },
      async close() {
        if (closed) throw domError('TypeError', 'Stream is closed')
        fs.maybeFailWrite(path, 'close')
        closed = true
        node.content = buffer
        node.lastModified = Date.now()
        fs.writeLog.push({ path, content: buffer })
      },
      async abort() {
        closed = true
      },
    }
  }
}

export function createFakeFileSystem(options) {
  return new FakeFileSystem(options)
}
