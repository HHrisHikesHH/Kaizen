import { formatDateDisplay, getDayOfYear } from '../utils/dailyEntry'
import { DAILY_QUOTES } from '../utils/quotes'
import { FlameIcon } from './FlameIcon'
import './DateQuoteDiya.css'

export function DateQuoteDiya({ dateStr, sessionComplete }) {
  const dayOfYear = getDayOfYear(dateStr)
  const quote = DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]

  return (
    <header className="date-quote-diya">
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
