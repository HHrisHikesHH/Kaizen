import { useState, useEffect, useRef, useCallback } from 'react'
import { useMemory } from '../context/MemoryContext'
import {
  getPracticeDateRange,
  getPresenceMapData,
  getJournalArcData,
  getClosingWordsRiver,
  getQuietStats,
  enrichQuietStats,
} from '../utils/growthData'
import { getAllSessionNotes, getAllMonthlyNotes, getAllQuarterlyNotes, getAllHalfYearNotes, getAllYearlyNotes, saveMonthlyNotes, saveQuarterlyNotes, saveHalfYearNotes, saveYearlyNotes } from '../utils/aiNotesManager'
import { detectAvailableCycles } from '../utils/cycleDetector'
import { generateMonthlyPackage } from '../utils/generateMonthlyPackage'
import { generateQuarterlyPackage } from '../utils/generateQuarterlyPackage'
import { generateHalfYearPackage } from '../utils/generateHalfYearPackage'
import { generateYearlyPackage } from '../utils/generateYearlyPackage'
import { parseMonthlyNotes } from '../utils/parseMonthlyNotes'
import { parseQuarterlyNotes } from '../utils/parseQuarterlyNotes'
import { parseHalfYearNotes } from '../utils/parseHalfYearNotes'
import { parseYearlyNotes } from '../utils/parseYearlyNotes'
import { getWeekDateRange, formatWeekRange } from '../utils/dateHelpers'
import { toDateString } from '../utils/dateHelpers'
import './GrowthPage.css'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatTooltipDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' })
  const rest = d.toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })
  return `${day}, ${rest}`
}

export function GrowthPage() {
  const { folderHandle } = useMemory()
  const [presenceData, setPresenceData] = useState([])
  const [stats, setStats] = useState(null)
  const [weeklyNotes, setWeeklyNotes] = useState([])
  const [monthlyNotes, setMonthlyNotes] = useState([])
  const [quarterlyNotes, setQuarterlyNotes] = useState([])
  const [halfYearNotes, setHalfYearNotes] = useState([])
  const [yearlyNotes, setYearlyNotes] = useState([])
  const [cycles, setCycles] = useState({ monthlyCycles: [], quarterlyCycles: [], halfYearlyCycles: [], yearlyCycles: [] })
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(null)
  const [arcTooltip, setArcTooltip] = useState(null)
  const [pasteModal, setPasteModal] = useState(null)
  const mapScrollRef = useRef(null)

  const todayStr = toDateString(new Date())
  const arcData = getJournalArcData(presenceData)
  const closingWords = getClosingWordsRiver(presenceData)

  useEffect(() => {
    if (!folderHandle) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const [presence, cyclesDetected, weekly, monthly, quarterly, halfYear, yearly] = await Promise.all([
        getPresenceMapData(folderHandle),
        detectAvailableCycles(folderHandle),
        getAllSessionNotes(folderHandle),
        getAllMonthlyNotes(folderHandle),
        getAllQuarterlyNotes(folderHandle),
        getAllHalfYearNotes(folderHandle),
        getAllYearlyNotes(folderHandle),
      ])
      if (cancelled) return
      setPresenceData(presence)
      setCycles(cyclesDetected)
      setWeeklyNotes(weekly.filter((w) => w.notes?.userFacingReflection).reverse())
      setMonthlyNotes(monthly)
      setQuarterlyNotes(quarterly)
      setHalfYearNotes(halfYear)
      setYearlyNotes(yearly)

      let quiet = await getQuietStats(folderHandle, presence)
      quiet = await enrichQuietStats(folderHandle, quiet, presence)
      if (!cancelled) setStats(quiet)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [folderHandle])

  useRef(() => {
    if (mapScrollRef.current && presenceData.length > 0) {
      mapScrollRef.current.scrollTop = mapScrollRef.current.scrollHeight
    }
  })

  useEffect(() => {
    if (!mapScrollRef.current || presenceData.length === 0) return
    mapScrollRef.current.scrollTop = mapScrollRef.current.scrollHeight
  }, [presenceData.length])

  const totalDays = presenceData.length
  const showEarlyMessage = totalDays < 7

  const handleGenerateCycle = useCallback(async (type, payload) => {
    if (!folderHandle) return
    let text = null
    if (type === 'monthly') text = await generateMonthlyPackage(payload.year, payload.month, folderHandle)
    if (type === 'quarterly') text = await generateQuarterlyPackage(payload.quarter, payload.year, folderHandle)
    if (type === 'halfYear') text = await generateHalfYearPackage(payload.period, payload.year, folderHandle)
    if (type === 'yearly') text = await generateYearlyPackage(payload.year, folderHandle)
    if (!text) return
    setPasteModal({ type, payload, packageText: text })
  }, [folderHandle])

  const handlePasteSubmit = useCallback(async (rawText) => {
    if (!pasteModal || !folderHandle) return
    const raw = (rawText ?? pasteModal.pastedText) || ''
    let parsed = null
    let saveFn = null
    let saveArgs = null
    if (pasteModal.type === 'monthly') {
      parsed = parseMonthlyNotes(raw)
      saveFn = saveMonthlyNotes
      saveArgs = [parsed, parsed.month, parsed.year]
    }
    if (pasteModal.type === 'quarterly') {
      parsed = parseQuarterlyNotes(raw)
      saveFn = saveQuarterlyNotes
      saveArgs = [parsed, parsed.quarter, parsed.year]
    }
    if (pasteModal.type === 'halfYear') {
      parsed = parseHalfYearNotes(raw)
      saveFn = saveHalfYearNotes
      saveArgs = [parsed, parsed.period, parsed.year]
    }
    if (pasteModal.type === 'yearly') {
      parsed = parseYearlyNotes(raw)
      saveFn = saveYearlyNotes
      saveArgs = [parsed, parsed.year]
    }
    if (parsed?.error) {
      setPasteModal((m) => ({ ...m, error: parsed.error }))
      return
    }
    if (saveFn && saveArgs) {
      await saveFn(...saveArgs, folderHandle)
      setPasteModal(null)
      const [cyclesDetected, monthly, quarterly, halfYear, yearly] = await Promise.all([
        detectAvailableCycles(folderHandle),
        getAllMonthlyNotes(folderHandle),
        getAllQuarterlyNotes(folderHandle),
        getAllHalfYearNotes(folderHandle),
        getAllYearlyNotes(folderHandle),
      ])
      setCycles(cyclesDetected)
      setMonthlyNotes(monthly)
      setQuarterlyNotes(quarterly)
      setHalfYearNotes(halfYear)
      setYearlyNotes(yearly)
    }
  }, [pasteModal, folderHandle])

  if (loading) {
    return (
      <div className="growth">
        <div className="growth__glow" aria-hidden />
        <div className="growth__inner">
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-ash)', textAlign: 'center' }}>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="growth">
      <div className="growth__glow" aria-hidden />
      <div className="growth__inner">
        <header className="growth__header">
          <h1 className="growth__title">Your becoming.</h1>
          <p className="growth__subtitle">
            Everything you have observed about yourself, gathered here.
            Not to be judged. To be witnessed.
          </p>
        </header>

        {showEarlyMessage ? (
          <p className="growth__early-message">
            This page grows with you.
            <br /><br />
            Return here after your first week.
            <br />
            What is planted in darkness
            <br />
            does not show itself immediately.
          </p>
        ) : (
          <>
            {/* Yearly reflection card — very top */}
            {yearlyNotes.length > 0 && yearlyNotes.map(({ year, notes }) => (
              <section key={year} className="yearly-section">
                <h2 className="yearly-section__label">{year}</h2>
                <div className="yearly-card">
                  <p className="yearly-card__text">{notes.userFacingYearlyReflection || ''}</p>
                </div>
              </section>
            ))}

            {/* Ready banners — yearly > half-year > quarterly > monthly */}
            {cycles.yearlyCycles?.filter((c) => c.ready).map((c) => (
              <div key={`y-${c.year}`} className="ready-banner">
                <div className="ready-banner__label">YEARLY REFLECTION READY</div>
                <h2 className="ready-banner__title">{c.year} is ready for reflection.</h2>
                <p className="ready-banner__desc">A full year of practice. The most comprehensive conversation this app offers.</p>
                <button type="button" className="ready-banner__action" onClick={() => handleGenerateCycle('yearly', { year: c.year })}>
                  Generate {c.year} context →
                </button>
              </div>
            ))}
            {cycles.halfYearlyCycles?.filter((c) => c.ready).map((c) => (
              <div key={`h-${c.period}-${c.year}`} className="ready-banner">
                <div className="ready-banner__label">HALF-YEAR REFLECTION READY</div>
                <h2 className="ready-banner__title">{c.period} {c.year} is ready for reflection.</h2>
                <p className="ready-banner__desc">Six months. Enough time for real change — or real avoidance — to show.</p>
                <button type="button" className="ready-banner__action" onClick={() => handleGenerateCycle('halfYear', { period: c.period, year: c.year })}>
                  Generate {c.period} {c.year} context →
                </button>
              </div>
            ))}
            {cycles.quarterlyCycles?.filter((c) => c.ready).map((c) => (
              <div key={`q-${c.quarter}-${c.year}`} className="ready-banner">
                <div className="ready-banner__label">QUARTERLY REFLECTION READY</div>
                <h2 className="ready-banner__title">Q{c.quarter} {c.year} is ready for reflection.</h2>
                <p className="ready-banner__desc">Three months. A season of practice.</p>
                <button type="button" className="ready-banner__action" onClick={() => handleGenerateCycle('quarterly', { quarter: c.quarter, year: c.year })}>
                  Generate Q{c.quarter} {c.year} context →
                </button>
              </div>
            ))}
            {cycles.monthlyCycles?.filter((c) => c.ready).map((c) => (
              <div key={`m-${c.month}-${c.year}`} className="ready-banner">
                <div className="ready-banner__label">MONTHLY REFLECTION READY</div>
                <h2 className="ready-banner__title">{MONTH_NAMES[c.month]} {c.year} is complete.</h2>
                <p className="ready-banner__desc">Four weeks observed. Four conversations held. A month of honest presence.</p>
                <button type="button" className="ready-banner__action" onClick={() => handleGenerateCycle('monthly', { month: c.month, year: c.year })}>
                  Generate {MONTH_NAMES[c.month]} context →
                </button>
              </div>
            ))}

            {/* Presence map */}
            <PresenceMap
              data={presenceData}
              todayStr={todayStr}
              onTooltip={setTooltip}
            />
            {tooltip && (
              <div
                className="presence-tooltip"
                style={{ left: tooltip.x, top: tooltip.y, whiteSpace: 'pre-line' }}
              >
                {tooltip.content}
              </div>
            )}

            {/* Summary under map */}
            {stats && (
              <p className="presence-map__summary">
                {stats.daysPresent} days present · {stats.daysPassed} days passed
              </p>
            )}

            {/* Awareness arc */}
            <AwarenessArcSection arcData={arcData} onTooltip={setArcTooltip} />
            {arcTooltip && (
              <div
                className="awareness-arc__tooltip"
                style={{ left: arcTooltip.x, top: arcTooltip.y }}
              >
                {arcTooltip.content}
              </div>
            )}

            {/* Closing words river */}
            <ClosingWordsRiver words={closingWords} />

            {/* Weekly reflections archive */}
            <section className="reflections-archive-section">
              <h2 className="reflections-archive__heading">Reflections from your Sunday sessions</h2>
              {weeklyNotes.length === 0 ? (
                <p className="reflections-archive__empty">
                  The first reflection will arrive after your first Sunday session.
                  <br />It will be worth the wait.
                </p>
              ) : (
                weeklyNotes.map(({ year, weekNumber, notes }) => {
                  const { start, end } = getWeekDateRange(year, weekNumber)
                  const endSat = new Date(end)
                  const range = formatWeekRange(start, endSat)
                  return (
                    <article key={`${year}-${weekNumber}`} className="reflection-card reflection-card--archive">
                      <p className="reflection-card__label">WEEK {weekNumber} · {range}</p>
                      <div className="reflection-card__text">{notes.userFacingReflection}</div>
                    </article>
                  )
                })
              )}
            </section>

            {/* Monthly reflections */}
            {monthlyNotes.length > 0 && (
              <section className="reflections-archive-section">
                <h2 className="growth__section-heading">Monthly reflections</h2>
                {monthlyNotes.slice().reverse().map(({ month, year, notes }) => (
                  <article key={`m-${month}-${year}`} className="reflection-card reflection-card--monthly">
                    <p className="reflection-card__label">{MONTH_NAMES[month]} {year}</p>
                    <div className="reflection-card__text">{notes.userFacingMonthlyReflection || ''}</div>
                  </article>
                ))}
              </section>
            )}

            {/* Seasonal (quarterly) reflections */}
            {quarterlyNotes.length > 0 && (
              <section className="reflections-archive-section">
                <h2 className="growth__section-heading">Seasonal reflections</h2>
                {quarterlyNotes.slice().reverse().map(({ quarter, year, notes }) => (
                  <article key={`q-${quarter}-${year}`} className="reflection-card reflection-card--quarterly">
                    <p className="reflection-card__label">Q{quarter} {year}</p>
                    <div className="reflection-card__text">{notes.userFacingQuarterlyReflection || ''}</div>
                  </article>
                ))}
              </section>
            )}

            {/* Half-year reflections */}
            {halfYearNotes.length > 0 && (
              <section className="reflections-archive-section">
                <h2 className="growth__section-heading">Half-year reflections</h2>
                {halfYearNotes.slice().reverse().map(({ period, year, notes }) => (
                  <article key={`h-${period}-${year}`} className="reflection-card reflection-card--halfyear">
                    <p className="reflection-card__label">{period} {year}</p>
                    <div className="reflection-card__text">{notes.userFacingHalfYearReflection || ''}</div>
                  </article>
                ))}
              </section>
            )}

            {/* Quiet statistics */}
            {stats && stats.firstDate && (
              <QuietStats stats={stats} />
            )}
          </>
        )}
      </div>

      {/* Paste-back modal */}
      {pasteModal && (
        <PasteModal
          type={pasteModal.type}
          payload={pasteModal.payload}
          packageText={pasteModal.packageText}
          error={pasteModal.error}
          onPasteChange={(text) => setPasteModal((m) => ({ ...m, pastedText: text }))}
          onSubmit={handlePasteSubmit}
          onClose={() => setPasteModal(null)}
        />
      )}
    </div>
  )
}

function PresenceMap({ data, todayStr, onTooltip }) {
  const cellSize = 12
  const gap = 3
  const daysPerWeek = 7
  const isoMonday = 1

  const byMonth = {}
  data.forEach((d) => {
    const date = new Date(d.dateStr + 'T12:00:00')
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    if (!byMonth[monthKey]) byMonth[monthKey] = []
    byMonth[monthKey].push(d)
  })

  const monthKeys = Object.keys(byMonth).sort()
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current && data.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [data.length])

  const handleCellMouseEnter = (e, day) => {
    const rect = e.currentTarget.getBoundingClientRect()
    let content = formatTooltipDate(day.dateStr) + '\n'
    if (day.sessionComplete) {
      content += (day.closingWord ? day.closingWord : '—') + '\n'
      content += `${day.habitsCount} habits · ${day.wordCount} words`
    } else {
      content += '—'
    }
    onTooltip({ x: rect.left, y: rect.bottom + 8, content })
  }

  const handleCellMouseLeave = () => onTooltip(null)

  const getCellClass = (day) => {
    if (!day || !day.dateStr) return 'presence-map__cell--passed'
    if (day.dateStr === todayStr) return 'presence-map__cell--today'
    if (!day.sessionComplete) return 'presence-map__cell--passed'
    if (!day.wordCount) return 'presence-map__cell--quiet'
    if (day.wordCount >= 50) return 'presence-map__cell--present-full'
    return 'presence-map__cell--present-brief'
  }

  return (
    <section className="presence-map-section">
      <div className="presence-map__scroll" ref={scrollRef}>
        <div className="presence-map__grid-wrap">
          {monthKeys.map((monthKey) => {
            const [y, m] = monthKey.split('-').map(Number)
            const monthName = new Date(y, m, 1).toLocaleDateString('en-GB', { month: 'short' })
            const days = byMonth[monthKey]
            const weeks = []
            let week = []
            days.forEach((day) => {
              const d = new Date(day.dateStr + 'T12:00:00')
              const dow = d.getDay()
              const isoDow = dow === 0 ? 7 : dow
              while (week.length > 0 && week.length < 7) {
                const last = new Date(week[week.length - 1].dateStr + 'T12:00:00')
                const lastDow = last.getDay() === 0 ? 7 : last.getDay()
                if (lastDow === 7) break
                week.push({ dateStr: '', placeholder: true })
              }
              if (week.length === 7) {
                weeks.push(week)
                week = []
              }
              for (let i = week.length; i < isoDow - 1; i++) week.push({ dateStr: '', placeholder: true })
              week.push(day)
            })
            if (week.length > 0) {
              while (week.length < 7) week.push({ dateStr: '', placeholder: true })
              weeks.push(week)
            }
            return (
              <div key={monthKey} className="presence-map__month-row">
                <span className="presence-map__month-label">{monthName}</span>
                {weeks.map((wk, wi) => (
                  <div key={wi} className="presence-map__week" style={{ marginRight: gap }}>
                    {wk.map((cell, ci) =>
                      cell.placeholder ? (
                        <span key={ci} className="presence-map__cell presence-map__cell--passed" style={{ width: cellSize, height: cellSize, opacity: 0.3 }} />
                      ) : (
                        <span
                          key={ci}
                          className={`presence-map__cell ${getCellClass(cell)}`}
                          style={{ width: cellSize, height: cellSize }}
                          onMouseEnter={(ev) => handleCellMouseEnter(ev, cell)}
                          onMouseLeave={handleCellMouseLeave}
                          title={cell.dateStr}
                        />
                      )
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function AwarenessArcSection({ arcData, onTooltip }) {
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null)
  const width = 640
  const height = 160
  const padding = { top: 8, right: 16, bottom: 28, left: 16 }

  if (arcData.length < 7) {
    return (
      <section className="awareness-arc-section">
        <h2 className="awareness-arc__heading">The arc of your words</h2>
        <p className="awareness-arc__sub">Journal depth over time. Not quantity — presence.</p>
        <p className="awareness-arc__placeholder">
          The arc will reveal itself in time.
          <br />Write honestly each night.
        </p>
      </section>
    )
  }

  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const maxWords = Math.max(...arcData.map((d) => d.wordCount), 1)
  const points = arcData.map((d, i) => ({
    ...d,
    x: padding.left + (i / Math.max(arcData.length - 1, 1)) * innerWidth,
    y: padding.top + innerHeight - (d.wordCount / maxWords) * innerHeight,
  }))

  let pathD = ''
  let areaD = ''
  if (points.length >= 2) {
    areaD = `M ${points[0].x} ${padding.top + innerHeight} L ${points[0].x} ${points[0].y} `
    pathD = `M ${points[0].x} ${points[0].y} `
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1]
      const p1 = points[i]
      const cx = (p0.x + p1.x) / 2
      pathD += `C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y} `
      areaD += `C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y} `
    }
    areaD += `L ${points[points.length - 1].x} ${padding.top + innerHeight} Z`
  }

  const handleMouseMove = (e) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    let closest = null
    let minD = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(p.x - x)
      if (d < minD) { minD = d; closest = { ...p, i } }
    })
    if (closest) {
      const d = new Date(closest.dateStr + 'T12:00:00')
      const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
      setHover({ x: closest.x, y: closest.y, content: `${dayLabel} · ${closest.wordCount} words` })
      onTooltip({ x: e.clientX + 12, y: e.clientY + 12, content: `${dayLabel} · ${closest.wordCount} words` })
    } else {
      setHover(null)
      onTooltip(null)
    }
  }

  const handleMouseLeave = () => {
    setHover(null)
    onTooltip(null)
  }

  return (
    <section className="awareness-arc-section">
      <h2 className="awareness-arc__heading">The arc of your words</h2>
      <p className="awareness-arc__sub">Journal depth over time. Not quantity — presence.</p>
      <div
        className="awareness-arc__chart"
        ref={svgRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="arcFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-flame)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-flame)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#arcFill)" />
          <path d={pathD} fill="none" stroke="var(--color-ember)" strokeWidth="1.5" />
          {hover && (
            <g>
              <line x1={hover.x} y1={padding.top} x2={hover.x} y2={height - padding.bottom} stroke="var(--color-stone)" strokeWidth="1" />
              <circle cx={hover.x} cy={hover.y} r="2" fill="var(--color-glow)" />
            </g>
          )}
        </svg>
      </div>
    </section>
  )
}

function ClosingWordsRiver({ words }) {
  const freq = {}
  words.forEach((w) => { freq[w] = (freq[w] || 0) + 1 })
  return (
    <section className="closing-words-section">
      <h2 className="closing-words__heading">Words you have closed with</h2>
      {words.length < 7 ? (
        <p className="closing-words__placeholder">
          Your closing words will gather here.
          <br />Each one a small honest signal.
        </p>
      ) : (
        <p className="closing-words__river">
          {words.map((word, i) => {
            const count = freq[word] || 1
            let cls = 'closing-words__word'
            if (count >= 5) cls += ' closing-words__word--gold'
            else if (count >= 3) cls += ' closing-words__word--glow'
            return (
              <span key={`${i}-${word}`}>
                <span className={cls}>{word}</span>
                {i < words.length - 1 && <span className="closing-words__sep">·</span>}
              </span>
            )
          })}
        </p>
      )}
    </section>
  )
}

function QuietStats({ stats }) {
  const firstDate = stats.firstDate ? new Date(stats.firstDate + 'T12:00:00') : null
  const firstLabel = firstDate ? firstDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const weeks = Math.floor(stats.totalDays / 7)
  const months = Math.floor(stats.totalDays / 30)
  return (
    <div className="quiet-stats">
      <p className="quiet-stats__intro">Since {firstLabel}:</p>
      <ul className="quiet-stats__list">
        <li>Days present: {stats.daysPresent}</li>
        <li>Days of practice: {stats.totalDays} days{weeks ? ` · ${weeks} weeks` : ''}{months ? ` · ${months} months` : ''}</li>
        <li>Journal entries written: {stats.journalEntries}</li>
        <li>Total words written: {stats.totalWords}</li>
        <li>Pages read: {stats.pagesRead}</li>
        <li>Minutes in stillness: {stats.minutesStillness}</li>
        <li>Sunday sessions completed: {stats.sundaySessions}</li>
        <li>Monthly reflections: {stats.monthlyReflections}</li>
        <li>Longest continuity: {stats.longestContinuity} days</li>
      </ul>
    </div>
  )
}

function PasteModal({ type, payload, packageText, error, onPasteChange, onSubmit, onClose }) {
  const [pasted, setPasted] = useState('')
  const copyToClipboard = () => {
    navigator.clipboard?.writeText(packageText)
  }
  const label = type === 'monthly' ? `${MONTH_NAMES[payload.month]} ${payload.year}` : type === 'quarterly' ? `Q${payload.quarter} ${payload.year}` : type === 'halfYear' ? `${payload.period} ${payload.year}` : String(payload.year)
  return (
    <div className="paste-modal" onClick={onClose}>
      <div className="paste-modal__box" onClick={(e) => e.stopPropagation()}>
        <h2 className="paste-modal__title">Paste back: {label}</h2>
        <p style={{ padding: '0 24px 12px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-ash)' }}>
          Copy the context below to your AI, have the conversation, then paste the closing notes block here.
        </p>
        <div style={{ padding: '0 24px' }}>
          <button type="button" className="paste-modal__btn" onClick={copyToClipboard}>Copy context to clipboard</button>
        </div>
        <textarea
          className="paste-modal__textarea"
          placeholder="Paste the [KAIZEN … NOTES] block here"
          value={pasted}
          onChange={(e) => { setPasted(e.target.value); onPasteChange(e.target.value); }}
        />
        {error && <p className="paste-modal__error">{error}</p>}
        <div className="paste-modal__actions">
          <button type="button" className="paste-modal__btn" onClick={onClose}>close</button>
          <button type="button" className="paste-modal__btn paste-modal__btn--primary" onClick={() => onSubmit(pasted)}>Store in memory</button>
        </div>
      </div>
    </div>
  )
}
