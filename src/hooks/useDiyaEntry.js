import { useState, useEffect } from 'react'

const LAST_OPENED_KEY = 'kaizen_lastOpenedDate'

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export function useDiyaEntry(shouldRun) {
  const [showDiya, setShowDiya] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!shouldRun) {
      setChecked(true)
      return
    }
    const last = localStorage.getItem(LAST_OPENED_KEY)
    const today = todayString()
    if (last !== today) {
      setShowDiya(true)
    }
    setChecked(true)
  }, [shouldRun])

  const finishDiya = () => {
    localStorage.setItem(LAST_OPENED_KEY, todayString())
    setShowDiya(false)
  }

  return { showDiya, finishDiya, checked }
}
