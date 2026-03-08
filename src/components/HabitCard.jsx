import './HabitCard.css'

const HABIT_CONFIG = {
  eating: {
    name: 'Nourishment',
    symbol: '🌾',
    question: 'Did you eat with awareness today?',
    description: 'One honest note.',
    input: 'note',
  },
  movement: {
    name: 'Movement',
    symbol: '🕊',
    question: 'Did you move your body with intention?',
    description: 'Optional note.',
    input: 'note',
  },
  reading: {
    name: 'Reading',
    symbol: '📖',
    question: 'Did you sit with words that mattered?',
    description: 'Pages and a note.',
    input: 'reading',
  },
  meditation: {
    name: 'Meditation',
    symbol: '🪔',
    question: 'Did you sit in stillness, even briefly?',
    description: 'Minutes and a note.',
    input: 'meditation',
  },
  journaling: {
    name: 'Journaling',
    symbol: null,
    question: 'Did you write what is true?',
    description: 'Completed when you write in the journal below.',
    input: 'none',
  },
}

export function HabitCard({ habitKey, data, onChange }) {
  const config = HABIT_CONFIG[habitKey]
  const logged = data.logged

  const handleCircleClick = () => {
    onChange({ ...data, logged: !logged })
  }

  const handleNoteChange = (e) => {
    onChange({ ...data, note: e.target.value })
  }

  const handlePagesChange = (e) => {
    const n = parseInt(e.target.value, 10) || 0
    onChange({ ...data, pages: n })
  }

  const handleMinutesChange = (e) => {
    const n = parseInt(e.target.value, 10) || 0
    onChange({ ...data, minutes: n })
  }

  return (
    <div className={`habit-card ${logged ? 'habit-card--logged' : ''}`}>
      <div className="habit-card__row">
        <button
          type="button"
          className="habit-card__circle"
          onClick={handleCircleClick}
          aria-pressed={logged}
          aria-label={config.name}
        >
          {logged && <span className="habit-card__circle-fill" />}
        </button>
        <div className="habit-card__head">
          <h3 className="habit-card__name">
            {config.symbol && <span className="habit-card__symbol">{config.symbol}</span>}
            {config.name}
          </h3>
          <p className="habit-card__desc">{config.description}</p>
        </div>
      </div>
      <p className="habit-card__question">{config.question}</p>
      {(config.input === 'note' || config.input === 'reading' || config.input === 'meditation') && (
        <div className="habit-card__inputs">
          {config.input === 'reading' && (
            <input
              type="number"
              min="0"
              className="habit-card__number"
              placeholder="Pages"
              value={data.pages || ''}
              onChange={handlePagesChange}
            />
          )}
          {config.input === 'meditation' && (
            <input
              type="number"
              min="0"
              className="habit-card__number"
              placeholder="Min"
              value={data.minutes || ''}
              onChange={handleMinutesChange}
            />
          )}
          <input
            type="text"
            className="habit-card__note"
            placeholder="Note (optional)"
            value={data.note || ''}
            onChange={handleNoteChange}
          />
        </div>
      )}
      {config.input === 'none' && (
        <p className="habit-card__hint">Complete the journal section below to mark this.</p>
      )}
    </div>
  )
}
