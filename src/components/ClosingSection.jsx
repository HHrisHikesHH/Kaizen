import './ClosingSection.css'

const MOOD_OPTIONS = ['at peace', 'unsettled', 'grateful', 'heavy', 'unclear']

export function ClosingSection({
  mood,
  closingWord,
  onMoodChange,
  onClosingWordChange,
  onComplete,
}) {
  return (
    <section className="closing-section">
      <p className="closing-section__mood-label">How do you feel as you close today?</p>
      <div className="closing-section__mood-options">
        {MOOD_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`closing-section__mood-btn ${mood === opt ? 'closing-section__mood-btn--active' : ''}`}
            onClick={() => onMoodChange(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      <input
        type="text"
        className="closing-section__mood-custom"
        placeholder="Or your own word"
        value={mood && !MOOD_OPTIONS.includes(mood) ? mood : ''}
        onChange={(e) => onMoodChange(e.target.value.trim() || null)}
      />

      <p className="closing-section__word-label">One word for today:</p>
      <input
        type="text"
        className="closing-section__closing-word"
        placeholder="A single word"
        value={closingWord}
        onChange={(e) => onClosingWordChange(e.target.value)}
      />

      <button
        type="button"
        className="closing-section__rest"
        onClick={onComplete}
      >
        The day is complete. Rest now. →
      </button>
    </section>
  )
}
