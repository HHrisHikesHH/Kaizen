/**
 * Read-only view of week records saved by older versions under a neighbouring
 * year's folder (see src/utils/weekFileCompat.js). Shown beside the week's own
 * plan; nothing here is editable, merged or written back.
 */

function weekLabel({ isoYear, isoWeek }) {
  return `week ${isoWeek} of ${isoYear}`
}

export function LegacyWeekRecords({ compat, dayNames }) {
  if (!compat) return null
  const { legacy = [], legacySummaries = [], sharedWith = [], canonicalUnreadable } = compat
  if (!legacy.length && !legacySummaries.length && !sharedWith.length && !canonicalUnreadable) return null

  return (
    <section className="plan-page__legacy" aria-label="Records from an earlier version">
      {canonicalUnreadable && (
        <p className="plan-page__legacy-note">
          This week&apos;s plan file could not be read, so it is shown empty and changes are not saved.
          The file has not been changed.
        </p>
      )}

      {sharedWith.length > 0 && (
        <p className="plan-page__legacy-note">
          An earlier version also used this week&apos;s file for {sharedWith.map(weekLabel).join(' and ')}.
          Editing is off so neither week&apos;s record is overwritten.
        </p>
      )}

      {(legacy.length > 0 || legacySummaries.length > 0) && (
        <p className="plan-page__legacy-note">
          An earlier version saved part of this week in another year&apos;s folder. It is shown here as it
          was saved, read-only, and has not been moved or changed.
        </p>
      )}

      {legacy.map((rec) => {
        const intentions = rec.data?.intentions ?? {}
        const days = dayNames.filter((d) => (intentions[d] ?? []).filter(Boolean).length > 0)
        return (
          <div key={rec.path} className="plan-page__legacy-record">
            <p className="plan-page__legacy-path">{rec.path}</p>
            {rec.state === 'unreadable' && (
              <p className="plan-page__legacy-note">This file could not be read.</p>
            )}
            {rec.state === 'ok' && days.length === 0 && (
              <p className="plan-page__legacy-note">No intentions in this file.</p>
            )}
            {days.map((day) => (
              <div key={day} className="plan-page__legacy-day">
                <span className="plan-page__legacy-day-name">{day}</span>
                <ul className="plan-page__legacy-list">
                  {intentions[day].filter(Boolean).map((item, i) => (
                    <li
                      key={item.id ?? i}
                      className={item.complete ? 'plan-page__legacy-item plan-page__legacy-item--done' : 'plan-page__legacy-item'}
                    >
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      })}

      {legacySummaries.length > 0 && (
        <p className="plan-page__legacy-note">
          Weekly summary also kept at {legacySummaries.map((r) => r.path).join(', ')}.
        </p>
      )}
    </section>
  )
}
