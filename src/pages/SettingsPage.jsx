import { useState, useEffect } from 'react'
import { useMemory } from '../context/MemoryContext'
import { createMemoryBackup, estimateMemorySize } from '../utils/backupManager'
import { saveFolderHandle, ensureMemoryFileInFolder, readMemoryFile, updateMemoryFile } from '../utils/memoryStore'
import './SettingsPage.css'

async function folderHasMemoryFile(handle) {
  try {
    await handle.getFileHandle('kaizen_memory.json', { create: false })
    return true
  } catch {
    return false
  }
}

export function SettingsPage() {
  const { folderHandle, setFolderHandle } = useMemory()
  const [memorySize, setMemorySize] = useState('—')
  const [backupStatus, setBackupStatus] = useState(null)
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [reconnectMessage, setReconnectMessage] = useState(null)
  const [showNewFolderWarning, setShowNewFolderWarning] = useState(false)
  const [pendingHandle, setPendingHandle] = useState(null)

  useEffect(() => {
    if (!folderHandle) return
    estimateMemorySize(folderHandle).then(setMemorySize)
  }, [folderHandle])

  useEffect(() => {
    if (!folderHandle) return
    readMemoryFile(folderHandle).then((data) => {
      setName(data?.practitionerName ?? data?.name ?? '')
    })
  }, [folderHandle])

  const handleDownloadBackup = async () => {
    if (!folderHandle) return
    setBackupStatus('preparing')
    try {
      await createMemoryBackup(folderHandle)
      setBackupStatus('safe')
      setTimeout(() => setBackupStatus(null), 2800)
    } catch {
      setBackupStatus(null)
    }
  }

  const handleConnectDifferent = async () => {
    if (typeof window.showDirectoryPicker !== 'function') return
    setReconnectMessage(null)
    try {
      const handle = await window.showDirectoryPicker()
      const hasMemory = await folderHasMemoryFile(handle)
      if (hasMemory) {
        await saveFolderHandle(handle)
        setFolderHandle(handle)
        setReconnectMessage('Memory reconnected. Welcome back.')
      } else {
        setPendingHandle(handle)
        setShowNewFolderWarning(true)
      }
    } catch {
      // User cancelled
    }
  }

  const handleConfirmNewFolder = async () => {
    if (!pendingHandle) return
    await ensureMemoryFileInFolder(pendingHandle)
    await saveFolderHandle(pendingHandle)
    setFolderHandle(pendingHandle)
    setPendingHandle(null)
    setShowNewFolderWarning(false)
    setReconnectMessage('Memory reconnected. Welcome back.')
  }

  const handleCancelNewFolder = () => {
    setPendingHandle(null)
    setShowNewFolderWarning(false)
  }

  const handleNameBlur = async () => {
    if (!folderHandle || !nameTouched) return
    setNameTouched(false)
    await updateMemoryFile(folderHandle, {
      practitionerName: name.trim() || undefined,
      name: name.trim() || undefined,
    })
  }

  const folderName = folderHandle?.name ?? '—'

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1 className="settings-page__title">Memory & Practice</h1>
        <p className="settings-page__subtitle">
          Everything Kaizen knows about you lives in the folder you chose.
          Guard it. It is yours alone.
        </p>
      </header>

      <section className="settings-page__section">
        <h2 className="settings-page__section-head">Your memory</h2>
        <p className="settings-page__folder">Connected to: {folderName}</p>
        <p className="settings-page__size">Your memory contains approximately {memorySize}</p>
        {reconnectMessage && (
          <p className="settings-page__message">{reconnectMessage}</p>
        )}
        <div className="settings-page__actions">
          <button
            type="button"
            className="settings-page__link settings-page__link--flame"
            onClick={handleDownloadBackup}
            disabled={backupStatus === 'preparing'}
          >
            {backupStatus === 'preparing' && 'Preparing your memory…'}
            {backupStatus === 'safe' && 'Your memory is safe. →'}
            {!backupStatus && 'Download memory as ZIP →'}
          </button>
          <button
            type="button"
            className="settings-page__link settings-page__link--ash"
            onClick={handleConnectDifferent}
          >
            Connect a different folder →
          </button>
        </div>
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-head">Continuing on a new device</h2>
        <div className="settings-page__prose">
          <p>If you are opening Kaizen on a new device:</p>
          <ol>
            <li>Transfer your kaizen-memory ZIP file to this device</li>
            <li>Extract the ZIP — you will have a folder</li>
            <li>Open Kaizen in Chrome</li>
            <li>When asked to choose a folder, select that extracted folder</li>
            <li>Your entire practice will be exactly as you left it</li>
          </ol>
          <p>Your data has never left your devices. There is no account. There is no server. There is only the folder.</p>
        </div>
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-head">About Kaizen</h2>
        <div className="settings-page__prose settings-page__prose--about">
          <p>Kaizen is a daily ritual of honest self-observation — named after the Japanese philosophy of continuous improvement, rooted in the contemplative traditions of those who sat with themselves long enough to understand what they found.</p>
          <p>It asks for one honest hour each night. Nothing more. Nothing less.</p>
          <p>The data it gathers is not its purpose. The practice is its purpose. The data is simply what practice leaves behind — like the ash that remains after a fire has burned well.</p>
        </div>
        <p className="settings-page__version">Kaizen · v1.0</p>
      </section>

      <section className="settings-page__section">
        <h2 className="settings-page__section-head settings-page__section-head--small">Your name (optional)</h2>
        <p className="settings-page__name-hint">If set, your Sunday context will open with it. It is never used elsewhere.</p>
        <input
          type="text"
          className="settings-page__input"
          placeholder="leave empty for anonymity"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameTouched(true) }}
          onBlur={handleNameBlur}
        />
      </section>

      {showNewFolderWarning && (
        <div className="settings-page__overlay" role="dialog" aria-modal="true">
          <div className="settings-page__modal">
            <p className="settings-page__modal-text">
              This folder does not appear to contain an existing Kaizen memory.
              Connecting will begin a new practice here.
              Your previous memory is not affected.
              Continue?
            </p>
            <div className="settings-page__modal-actions">
              <button type="button" className="settings-page__link settings-page__link--ash" onClick={handleCancelNewFolder}>
                close
              </button>
              <button type="button" className="settings-page__link settings-page__link--flame" onClick={handleConfirmNewFolder}>
                yes, continue →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
