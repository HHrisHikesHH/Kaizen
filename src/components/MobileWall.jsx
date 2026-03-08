import { FlameIcon } from './FlameIcon'
import './MobileWall.css'

export function MobileWall() {
  return (
    <div className="mobile-wall">
      <div className="mobile-wall__flame">
        <FlameIcon size={48} />
      </div>
      <h1 className="mobile-wall__title">Kaizen</h1>
      <p className="mobile-wall__body">
        This practice is meant for stillness.
        A small screen and a hurried moment are not the right conditions.
        <br /><br />
        Return on your computer, at night, when you have time to sit with yourself.
        <br /><br />
        Your data stays on your device — for your eyes only.
        This too is part of keeping the practice sacred.
      </p>
    </div>
  )
}
