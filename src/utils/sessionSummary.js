import { getISOWeek, parseLocalDateKey } from './dateHelpers'
import { generateWeekSummary, saveWeekSummary } from './aggregateWeek'

/**
 * Regenerate and save the weekly summary for the week containing `dateKey`.
 * Call only after that day's entry is on disk: the summary is built from the
 * stored files, not from in-memory state.
 */
export async function refreshWeekSummaryFor(dateKey, folderHandle) {
  const { isoYear, isoWeek } = getISOWeek(parseLocalDateKey(dateKey))
  const summary = await generateWeekSummary(isoYear, isoWeek, folderHandle)
  if (summary) await saveWeekSummary(summary, folderHandle)
  return summary
}
