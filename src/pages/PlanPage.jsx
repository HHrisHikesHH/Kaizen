import { useState, useCallback } from 'react'
import { useMemory } from '../context/MemoryContext'
import { useWeekPlan } from '../hooks/useWeekPlan'
import { useWeekDayCompletions } from '../hooks/useWeekDayCompletions'
import {
  getWeekNumber,
  getDatesForWeek,
  getWeekDateRange,
  formatDateShort,
  toDateString,
  isToday,
} from '../utils/dateHelpers'
import { SUGGESTED_INTENTIONS } from '../utils/suggestedIntentions'
import './PlanPage.css'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function PlanPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentWeek = getWeekNumber(now)

  const [viewYear, setViewYear] = useState(currentYear)
  const [viewWeek, setViewWeek] = useState(currentWeek)
  const [addingDay, setAddingDay] = useState(null)
  const [addingText, setAddingText] = useState('')
  const [suggestionPicker, setSuggestionPicker] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const { folderHandle } = useMemory()
  const { plan, loading, addIntention, toggleIntention, deleteIntention, dateRange } = useWeekPlan(
    viewYear,
    viewWeek
  )
  const completions = useWeekDayCompletions(viewYear, viewWeek)

  const isViewingPastWeek =
    viewYear < currentYear || (viewYear === currentYear && viewWeek < currentWeek)

  const dates = getDatesForWeek(viewYear, viewWeek)
  const weekDatesWithSunday = [...dates]
  const sundayDate = new Date(dates[5])
  sundayDate.setDate(sundayDate.getDate() + 1)
  weekDatesWithSunday.push(sundayDate)

  const handleAddIntention = useCallback(
    (dayName) => {
      const text = addingText.trim()
      if (text) addIntention(dayName, text)
      setAddingDay(null)
      setAddingText('')
    },
    [addIntention, addingText]
  )

  const handleSuggestionPick = useCallback(
    (dayName) => {
      if (suggestionPicker) addIntention(dayName, suggestionPicker)
      setSuggestionPicker(null)
    },
    [addIntention, suggestionPicker]
  )

  const completedCount =
    plan && Object.values(plan.intentions || {}).flat().filter((i) => i.complete).length
  const totalCount = plan && Object.values(plan.intentions || {}).flat().length

  if (loading && !plan) {
    return (
      <div className="plan-page plan-page--loading">
        <span className="plan-page__loader">…</span>
      </div>
    )
  }

  return (
    <div className="plan-page">
      <div className="plan-page__glow" aria-hidden />
      <div className="plan-page__content">
        <header className="plan-page__header">
          <div className="plan-page__header-top">
            <h1 className="plan-page__title">This Week&apos;s Intentions</h1>
            <nav className="plan-page__nav">
              <button
                type="button"
                className="plan-page__nav-btn"
                onClick={() => {
                  if (viewWeek <= 1) {
                    setViewYear((y) => y - 1)
                    setViewWeek(52)
                  } else {
                    setViewWeek((w) => w - 1)
                  }
                }}
              >
                ← previous week
              </button>
              <span className="plan-page__nav-sep"> </span>
              <button
                type="button"
                className="plan-page__nav-btn"
                onClick={() => {
                  if (viewWeek >= 52) {
                    setViewYear((y) => y + 1)
                    setViewWeek(1)
                  } else {
                    setViewWeek((w) => w + 1)
                  }
                }}
              >
                next week →
              </button>
            </nav>
          </div>
          <p className="plan-page__subtitle">Not a to-do list. A compass.</p>
          <p className="plan-page__week-label">
            Week {viewWeek} · {plan?.dateRange ?? dateRange}
          </p>
          {isViewingPastWeek && totalCount != null && (
            <p className="plan-page__past-label">
              Week {viewWeek} — {totalCount === 0 ? 'no intentions' : `${completedCount ?? 0} of ${totalCount} intentions met`}
            </p>
          )}
        </header>

        <div className="plan-page__grid">
          {DAY_NAMES.map((dayName, colIndex) => {
            const date = weekDatesWithSunday[colIndex]
            const dateStr = toDateString(date)
            const dayIsToday = isToday(date)
            const sessionComplete = completions[dateStr]
            const intentions = (plan?.intentions?.[dayName] ?? []).filter(Boolean)

            return (
              <div key={dayName} className="plan-page__day">
                <div className="plan-page__day-header">
                  <span className="plan-page__day-name">{dayName.toUpperCase()}</span>
                  <span
                    className={`plan-page__day-num ${
                      dayIsToday
                        ? 'plan-page__day-num--today'
                        : dateStr < toDateString(now)
                          ? 'plan-page__day-num--past'
                          : 'plan-page__day-num--future'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {colIndex < 6 && dayIsToday && sessionComplete && (
                    <span className="plan-page__day-dot" aria-hidden />
                  )}
                </div>

                <div className="plan-page__day-list">
                  {intentions.map((item) => (
                    <div
                      key={item.id}
                      className={`plan-page__intention ${item.complete ? 'plan-page__intention--done' : ''} ${deletingId === item.id ? 'plan-page__intention--deleting' : ''}`}
                    >
                      <button
                        type="button"
                        className="plan-page__intention-text"
                        onClick={() =>
                          !isViewingPastWeek && toggleIntention(dayName, item.id)
                        }
                        disabled={isViewingPastWeek}
                      >
                        {item.text}
                      </button>
                      {!isViewingPastWeek && (
                        <button
                          type="button"
                          className="plan-page__intention-delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingId(item.id)
                            setTimeout(() => {
                              deleteIntention(dayName, item.id)
                              setDeletingId(null)
                            }, 200)
                          }}
                          aria-label="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}

                  {addingDay === dayName ? (
                    <div className="plan-page__add-inline">
                      <input
                        type="text"
                        className="plan-page__add-input"
                        value={addingText}
                        onChange={(e) => setAddingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddIntention(dayName)
                          if (e.key === 'Escape') {
                            setAddingDay(null)
                            setAddingText('')
                          }
                        }}
                        onBlur={() => {
                          if (addingText.trim()) handleAddIntention(dayName)
                          else {
                            setAddingDay(null)
                            setAddingText('')
                          }
                        }}
                        autoFocus
                        placeholder="Intention…"
                      />
                    </div>
                  ) : (
                    !isViewingPastWeek && (
                      <button
                        type="button"
                        className="plan-page__add-btn"
                        onClick={() => setAddingDay(dayName)}
                      >
                        +
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <section className="plan-page__suggestions">
          <p className="plan-page__suggestions-label">intentions worth considering</p>
          <div className="plan-page__suggestions-flow">
            {SUGGESTED_INTENTIONS.map((phrase, i) => (
              <span key={i}>
                <button
                  type="button"
                  className="plan-page__suggestion-phrase"
                  onClick={() => setSuggestionPicker(phrase)}
                >
                  {phrase}
                </button>
                {i < SUGGESTED_INTENTIONS.length - 1 && (
                  <span className="plan-page__suggestion-sep"> · </span>
                )}
              </span>
            ))}
          </div>
          {suggestionPicker && (
            <>
              <div
                className="plan-page__picker-backdrop"
                onClick={() => setSuggestionPicker(null)}
                aria-hidden
              />
              <div className="plan-page__day-picker">
                <p className="plan-page__picker-label">Add to which day?</p>
                {DAY_NAMES.map((dayName) => (
                  <button
                    key={dayName}
                    type="button"
                    className="plan-page__picker-day"
                    onClick={() => handleSuggestionPick(dayName)}
                  >
                    {dayName}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
