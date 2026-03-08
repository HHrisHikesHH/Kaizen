import { useState, useEffect, useCallback } from 'react'
import { useMemory } from '../context/MemoryContext'
import { useSundaySession } from '../hooks/useSundaySession'
import { useDailyEntry } from '../hooks/useDailyEntry'
import { getWeekNumber, getDayOfWeek } from '../utils/dateHelpers'
import { generateSundayPackage } from '../utils/generateSundayPackage'
import { parseSessionNotes } from '../utils/parseSessionNotes'
import { saveSessionNotes } from '../utils/aiNotesManager'
import { getWeekSummary, saveWeekSummary } from '../utils/aggregateWeek'
import { FlameIconOutline } from '../components/FlameIconOutline'
import { DiyaVideo } from '../components/DiyaVideo'
import { ReflectionCard } from '../components/ReflectionCard'
import { ClosingScreen } from '../components/ClosingScreen'
import { SUNDAY_PROMPTS } from '../utils/sundayPrompts'
import './SundayPage.css'

function countWords(text) {
  return (text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function getDaysUntilSunday() {
  const d = new Date()
  const day = d.getDay()
  return day === 0 ? 0 : 7 - day
}

export function SundayPage() {
  const today = new Date()
  const isSunday = today.getDay() === 0
  const year = today.getFullYear()
  const weekNumber = getWeekNumber(today)
  const daysUntil = getDaysUntilSunday()

  const { folderHandle } = useMemory()
  const { state, loading, updateState } = useSundaySession(year, weekNumber)
  const { entry, updateEntry } = useDailyEntry()

  const [packageText, setPackageText] = useState('')
  const [packageError, setPackageError] = useState(null)
  const [copyConfirm, setCopyConfirm] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [receiveError, setReceiveError] = useState(null)
  const [receiveWarning, setReceiveWarning] = useState(null)
  const [showReflection, setShowReflection] = useState(false)
  const [showSundayClose, setShowSundayClose] = useState(false)

  useEffect(() => {
    if (state?.eveningComplete) setShowReflection(true)
  }, [state?.eveningComplete])
  const [phase, setPhase] = useState('idle')
  const [sundayJournalEntry, setSundayJournalEntry] = useState('')
  const [sundayPrompt] = useState(
    () => SUNDAY_PROMPTS[weekNumber % SUNDAY_PROMPTS.length]
  )

  const sundayJournalWordCount = countWords(
    state?.eveningComplete ? entry?.journal?.entry ?? '' : sundayJournalEntry
  )
  const hasSundayJournal = (entry?.journal?.wordCount ?? 0) > 0 || sundayJournalWordCount > 0

  useEffect(() => {
    if (!isSunday || !folderHandle || !state) return
    if (state.morningComplete) return
    generateSundayPackage(year, weekNumber, folderHandle)
      .then((text) => {
        if (text) setPackageText(text)
        else setPackageError('Your week\'s data could not be gathered. Make sure your memory folder is connected and that you have completed at least one session this week.')
      })
      .catch(() => setPackageError('Your week\'s data could not be gathered. Make sure your memory folder is connected and that you have completed at least one session this week.'))
  }, [isSunday, folderHandle, year, weekNumber, state?.morningComplete])

  const handleCopy = useCallback(() => {
    if (!packageText) return
    navigator.clipboard.writeText(packageText).then(() => {
      updateState({
        packageCopiedAt: new Date().toISOString(),
        morningComplete: true,
      })
      setCopyConfirm(true)
      setTimeout(() => setCopyConfirm(false), 400)
    })
  }, [packageText, updateState])

  const handleReceive = useCallback(() => {
    const parsed = parseSessionNotes(pasteText)
    if (parsed.error) {
      setReceiveError(parsed.error)
      return
    }
    setReceiveError(null)
    setReceiveWarning(parsed.warning || null)

    const notesPayload = {
      ...parsed,
      weekNumber: parsed.weekNumber || weekNumber,
      sessionDate: parsed.sessionDate || today.toISOString().slice(0, 10),
    }

    saveSessionNotes(notesPayload, year, weekNumber, folderHandle).then(() => {
      getWeekSummary(year, weekNumber, folderHandle).then((summary) => {
        if (summary) {
          summary.userFacingReflection = parsed.userFacingReflection || ''
          saveWeekSummary(summary, folderHandle)
        }
      })
      updateState({
        eveningComplete: true,
        pasteReceivedAt: new Date().toISOString(),
        sessionNotes: notesPayload,
        userFacingReflection: parsed.userFacingReflection || '',
      })
      setShowReflection(true)
    })
  }, [pasteText, year, weekNumber, folderHandle, updateState, today])

  const handleSundayJournalSave = useCallback(() => {
    const text = sundayJournalEntry.trim()
    const wc = countWords(text)
    updateEntry({
      journal: {
        ...entry?.journal,
        prompt: sundayPrompt,
        entry: text,
        wordCount: wc,
      },
    })
  }, [sundayJournalEntry, sundayPrompt, updateEntry, entry?.journal])

  const handleSundayFinalClose = useCallback(() => {
    if (sundayJournalEntry.trim()) handleSundayJournalSave()
    setPhase('closing')
    setTimeout(() => setPhase('done'), 3000)
  }, [sundayJournalEntry, handleSundayJournalSave])

  if (!isSunday) {
    return (
      <div className="sunday-page sunday-page--closed">
        <FlameIconOutline size={48} className="sunday-page__closed-icon" />
        <h1 className="sunday-page__closed-title">The Sunday session is not yet open.</h1>
        <p className="sunday-page__closed-body">
          This practice asks for one deep conversation per week —
          not more, not less.
          <br /><br />
          Return on Sunday morning with an open mind.
          Your week will be waiting for you.
        </p>
        <p className="sunday-page__closed-days">{daysUntil} days until Sunday</p>
      </div>
    )
  }

  if (loading && !state) {
    return (
      <div className="sunday-page sunday-page--loading">
        <span className="sunday-page__loader">…</span>
      </div>
    )
  }

  const morningComplete = state?.morningComplete ?? false
  const eveningComplete = state?.eveningComplete ?? false
  const showMorning = !eveningComplete
  const showEvening = morningComplete && !eveningComplete
  const showPasteSection = showEvening && !showReflection

  return (
    <div className="sunday-page">
      {phase === 'closing' && <ClosingScreen variant="sunday" />}

      <div className="sunday-page__glow" aria-hidden />
      <div className="sunday-page__content">
        {showMorning && (
          <section className="sunday-page__morning">
            <div className="sunday-page__diya-wrap">
              <DiyaVideo width={140} height={140} showGlow />
            </div>
            <h1 className="sunday-page__title">Your week is ready.</h1>
            <p className="sunday-page__intro">
              What follows is a carefully prepared context —
              your week distilled into something a patient witness can hold.
              <br /><br />
              Copy it. Open Claude.ai or your preferred AI.
              Begin by telling it how the week felt from the inside.
              Let the conversation find what you couldn&apos;t see alone.
              <br /><br />
              Return this evening.
            </p>

            {packageError ? (
              <p className="sunday-page__error">{packageError}</p>
            ) : (
              <>
                <textarea
                  className="sunday-page__package"
                  readOnly
                  value={packageText}
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="sunday-page__copy-btn"
                  onClick={handleCopy}
                  style={{ color: copyConfirm ? 'var(--color-gold)' : undefined }}
                >
                  {copyConfirm
                    ? 'Copied. Go now. Come back this evening. →'
                    : 'Copy this context →'}
                </button>
                {morningComplete && (
                  <div className="sunday-page__return-hint">
                    <p>When you return this evening, scroll down to receive your reflections.</p>
                    <span className="sunday-page__arrow" aria-hidden>↓</span>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {showPasteSection && (
          <section className="sunday-page__evening">
            <h2 className="sunday-page__evening-title">Welcome back.</h2>
            <p className="sunday-page__evening-intro">
              Paste what your companion returned below.
              <br /><br />
              Ask Claude to end your conversation with the closing format —
              the block that begins [KAIZEN SESSION NOTES].
              That is what belongs here.
            </p>
            <textarea
              className="sunday-page__paste"
              placeholder="Paste the [KAIZEN SESSION NOTES] block here..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            {receiveError && <p className="sunday-page__error">{receiveError}</p>}
            {receiveWarning && <p className="sunday-page__warning">{receiveWarning}</p>}
            <button
              type="button"
              className="sunday-page__receive-btn"
              onClick={handleReceive}
            >
              Receive these reflections →
            </button>
          </section>
        )}

        {showReflection && state?.userFacingReflection && (
          <section className="sunday-page__reflection">
            <ReflectionCard
              userFacingReflection={state.userFacingReflection}
              weekNumber={state.weekNumber}
              year={state.year}
              dateRange={state.dateRange}
            />
            <p className="sunday-page__week-whole">
              Seven days. One conversation.
              <br />
              The week is whole.
            </p>

            {(showSundayClose || hasSundayJournal) ? (
              <button
                type="button"
                className="sunday-page__close-btn"
                onClick={handleSundayFinalClose}
              >
                Close the week →
              </button>
            ) : (
              <div className="sunday-page__sunday-journal">
                <p className="sunday-page__sunday-prompt">{sundayPrompt}</p>
                <textarea
                  className="sunday-page__sunday-textarea"
                  placeholder="Begin when you are ready..."
                  value={sundayJournalEntry}
                  onChange={(e) => setSundayJournalEntry(e.target.value)}
                />
                <div className="sunday-page__sunday-actions">
                  <button
                    type="button"
                    className="sunday-page__close-btn"
                    onClick={handleSundayFinalClose}
                  >
                    Close the week →
                  </button>
                  <button
                    type="button"
                    className="sunday-page__skip-btn"
                    onClick={() => setShowSundayClose(true)}
                  >
                    close without writing →
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
