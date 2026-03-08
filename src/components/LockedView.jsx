import { formatDateDisplay } from '../utils/dailyEntry'
import './LockedView.css'

export function LockedView({ dateStr, closingWord }) {
  return (
    <div className="locked-view">
      <p className="locked-view__date">{formatDateDisplay(dateStr)}</p>
      {closingWord && (
        <p className="locked-view__word">"{closingWord}"</p>
      )}
      <p className="locked-view__status">Session complete.</p>
      <p className="locked-view__hint">
        Tonight&apos;s practice is complete. Return tomorrow.
      </p>
    </div>
  )
}
