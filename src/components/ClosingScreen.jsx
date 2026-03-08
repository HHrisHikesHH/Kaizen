import './ClosingScreen.css'

export function ClosingScreen({ variant = 'default' }) {
  const isSaturdayBridge = variant === 'saturday'

  return (
    <div className="closing-screen">
      <p className="closing-screen__symbol">ॐ</p>
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
      ) : (
        <p className="closing-screen__text">The diya rests. It will burn again tomorrow.</p>
      )}
    </div>
  )
}
