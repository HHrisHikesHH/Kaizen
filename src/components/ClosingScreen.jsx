import './ClosingScreen.css'

function DharmaWheel() {
  return (
    <div className="closing-screen__symbol" aria-hidden>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="50" cy="50" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
        <line x1="50" y1="6" x2="50" y2="94" stroke="currentColor" strokeWidth="2" />
        <line x1="6" y1="50" x2="94" y2="50" stroke="currentColor" strokeWidth="2" />
        <line x1="17" y1="17" x2="83" y2="83" stroke="currentColor" strokeWidth="2" />
        <line x1="83" y1="17" x2="17" y2="83" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="6" r="3" fill="currentColor" />
        <circle cx="50" cy="94" r="3" fill="currentColor" />
        <circle cx="6" cy="50" r="3" fill="currentColor" />
        <circle cx="94" cy="50" r="3" fill="currentColor" />
        <circle cx="17" cy="17" r="3" fill="currentColor" />
        <circle cx="83" cy="83" r="3" fill="currentColor" />
        <circle cx="83" cy="17" r="3" fill="currentColor" />
        <circle cx="17" cy="83" r="3" fill="currentColor" />
      </svg>
    </div>
  )
}

export function ClosingScreen({ variant = 'default' }) {
  const isSaturdayBridge = variant === 'saturday'
  const isSundayClose = variant === 'sunday'

  return (
    <div className={`closing-screen ${isSundayClose ? 'closing-screen--sunday' : ''}`}>
      <DharmaWheel />
      {isSaturdayBridge ? (
        <div className="closing-screen__bridge">
          <p>Six days observed.</p>
          <p>Tomorrow is your Sunday session —</p>
          <p>a moment to sit with the week that was,</p>
          <p>in conversation with a patient witness</p>
          <p>who has been reading your days.</p>
          <p>In the morning, return here.</p>
          <p>Your context will be ready and waiting.</p>
          <p>Copy it. Carry it with you.</p>
          <p>Let the conversation find what you couldn&apos;t see alone.</p>
          <p>Return in the evening to close the week</p>
          <p>and let the diya rest on a full seven days.</p>
        </div>
      ) : isSundayClose ? (
        <div className="closing-screen__sunday">
          <p>Seven days witnessed.</p>
          <p>One more layer understood.</p>
          <p>Rest now.</p>
          <p>The diya will light again tomorrow.</p>
        </div>
      ) : (
        <p className="closing-screen__text">The diya rests. It will burn again tomorrow.</p>
      )}
    </div>
  )
}
