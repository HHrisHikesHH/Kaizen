import './TodayIntentions.css'

export function TodayIntentions({ intentions, onToggle }) {
  return (
    <section className="today-intentions">
      <p className="today-intentions__label">this week&apos;s intentions</p>
      <ul className="today-intentions__list">
        {intentions.map((item) => (
          <li key={item.id} className="today-intentions__item">
            <button
              type="button"
              className={`today-intentions__line ${item.complete ? 'today-intentions__line--done' : ''}`}
              onClick={() => onToggle(item.id)}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
