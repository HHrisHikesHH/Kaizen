import { useState, useEffect } from 'react'
import { getTodayKey } from '../utils/dateHelpers'

const LAST_OPENED_KEY = 'kaizen_lastOpenedDate'

export function useDiyaEntry(shouldRun) {
  const [showDiya, setShowDiya] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!shouldRun) {
      setChecked(true)
      return
    }
    const last = localStorage.getItem(LAST_OPENED_KEY)
    const today = getTodayKey()
    if (last !== today) {
      setShowDiya(true)
    }
    setChecked(true)
  }, [shouldRun])

  const finishDiya = () => {
    localStorage.setItem(LAST_OPENED_KEY, getTodayKey())
    setShowDiya(false)
  }

  return { showDiya, finishDiya, checked }
}
