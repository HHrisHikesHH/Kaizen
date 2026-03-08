import { formatDateDisplay, getDayOfYear } from '../utils/dailyEntry'
import { DAILY_QUOTES } from '../utils/quotes'
import { FlameIcon } from './FlameIcon'
import { DiyaVideo } from './DiyaVideo'
import './DateQuoteDiya.css'

export function DateQuoteDiya({
  dateStr,
  sessionComplete,
  extinguishing = false,
  diyaSlotRef = null,
  showDiyaInSlot = false,
}) {
  const dayOfYear = getDayOfYear(dateStr)
  const quote = DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]
  const useSlot = diyaSlotRef != null

  return (
    <header className="date-quote-diya">
      <div className="date-quote-diya__hero">
        <h1 className="date-quote-diya__title">Kaizen</h1>
        {useSlot ? (
          <div ref={diyaSlotRef} className="date-quote-diya__diya-slot" aria-hidden>
            {showDiyaInSlot && (
              <DiyaVideo
                width={160}
                height={160}
                showGlow
                extinguishing={extinguishing}
                className="date-quote-diya__diya"
              />
            )}
          </div>
        ) : (
          <DiyaVideo
            width={160}
            height={160}
            showGlow
            extinguishing={extinguishing}
            className="date-quote-diya__diya"
          />
        )}
      </div>
      <p className="date-quote-diya__date">{formatDateDisplay(dateStr)}</p>
      <p className="date-quote-diya__quote">{quote}</p>
      <div
        className={`date-quote-diya__flame ${sessionComplete ? 'date-quote-diya__flame--complete' : ''}`}
        aria-hidden
      >
        <FlameIcon size={20} />
      </div>
    </header>
  )
}
