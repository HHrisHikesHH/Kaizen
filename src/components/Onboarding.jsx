import { useState } from 'react'
import { saveFolderHandle, ensureMemoryFileInFolder } from '../utils/memoryStore'
import './Onboarding.css'

export function Onboarding({ onComplete, setFolderHandle }) {
  const [step, setStep] = useState(1)
  const [picking, setPicking] = useState(false)
  const [chosenHandle, setChosenHandle] = useState(null)

  async function handleChooseFolder() {
    if (typeof showDirectoryPicker !== 'undefined') {
      setPicking(true)
      try {
        const handle = await showDirectoryPicker()
        await saveFolderHandle(handle)
        await ensureMemoryFileInFolder(handle)
        setChosenHandle(handle)
        setStep(3)
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err)
      } finally {
        setPicking(false)
      }
    }
  }

  function handleFinish() {
    if (chosenHandle) setFolderHandle(chosenHandle)
    onComplete()
  }

  return (
    <div className="onboarding">
      <div className="onboarding__inner">
        {step === 1 && (
          <>
            <h1 className="onboarding__heading">Welcome to Kaizen</h1>
            <p className="onboarding__subtext">
              A daily ritual of honest observation.
              Small steps. Every night. For as long as it takes.
            </p>
            <button
              type="button"
              className="onboarding__continue"
              onClick={() => setStep(2)}
            >
              continue →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="onboarding__heading">Where shall we keep your memory?</h1>
            <p className="onboarding__body">
              Kaizen stores everything locally on your device.
              No cloud. No servers. No one else.
              <br /><br />
              Choose a folder where your journal, reflections, and growth
              will live. Guard it. Back it up. It will become something precious.
            </p>
            <button
              type="button"
              className="onboarding__choose"
              onClick={handleChooseFolder}
              disabled={picking || typeof showDirectoryPicker === 'undefined'}
            >
              {picking ? 'Choosing…' : 'Choose Folder'}
            </button>
            {typeof showDirectoryPicker === 'undefined' && (
              <p className="onboarding__hint">Use Chrome to choose a folder.</p>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="onboarding__heading">One night at a time.</h1>
            <p className="onboarding__body">
              Open this app once each evening.
              Light the diya. Log your day honestly.
              Write what is true.
              Close it. Sleep.
              <br /><br />
              That is all. The rest takes care of itself.
            </p>
            <button
              type="button"
              className="onboarding__continue"
              onClick={handleFinish}
            >
              continue →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
