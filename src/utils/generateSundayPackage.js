/**
 * Generate the Sunday session context package from week summary and prior AI notes.
 */

import { getWeekSummary } from './aggregateWeek'
import { getLastSessionNotes } from './aiNotesManager'
import { getWeekDateRange, formatWeekRange } from './dateHelpers'

async function readMemoryFile(folderHandle) {
  if (!folderHandle?.getFileHandle) return null
  try {
    const fileHandle = await folderHandle.getFileHandle('kaizen_memory.json', { create: false })
    const f = await fileHandle.getFile()
    const text = await f.text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

const FIRST_SESSION_FALLBACK = `This is your first session together.
No prior notes exist.
Arrive with complete openness.
What you observe today becomes the foundation
of everything that follows.`

const NO_PRIOR_NOTES = `Note: last week's session notes were not found.
Proceed with the week data only.`

export async function generateSundayPackage(year, weekNumber, folderHandle) {
  const summary = await getWeekSummary(year, weekNumber, folderHandle)
  if (!summary) {
    return null
  }

  const priorNotes = await getLastSessionNotes(year, weekNumber, folderHandle)
  const memory = await readMemoryFile(folderHandle)
  const weeksPracticed = memory?.weeksPracticed ?? 1
  const practitionerName = memory?.practitionerName ?? memory?.name ?? null

  const { start, end } = getWeekDateRange(year, weekNumber)
  const dateRangeStr = formatWeekRange(start, end)
  const isFirstWeek = weekNumber === 1 && (priorNotes == null)

  const lines = []

  lines.push('════════════════════════════════════════════════')
  lines.push('KAIZEN — SUNDAY SESSION CONTEXT')
  lines.push(`Week ${summary.weekNumber} · ${summary.dateRange}`)
  if (practitionerName) lines.push(`Practitioner: ${practitionerName}`)
  lines.push(`Weeks practiced: ${weeksPracticed}`)
  lines.push('════════════════════════════════════════════════')
  lines.push('')
  lines.push('WHO YOU ARE IN THIS CONVERSATION')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('You are a patient, wise companion — part Buddhist teacher,')
  lines.push('part contemplative therapist, part honest mirror.')
  lines.push('')
  lines.push('You observe without judging. You ask before concluding.')
  lines.push('You hold what is shared with complete care and no agenda.')
  lines.push('')
  lines.push('Your role is not to fix, motivate, or advise.')
  lines.push('Your role is to help this person see themselves')
  lines.push('more clearly than they can alone.')
  lines.push('')
  lines.push(`You have been walking with this person for ${weeksPracticed} week(s).`)
  if (isFirstWeek) {
    lines.push('This is your first meeting.')
    lines.push('Begin gently. Observe everything. Conclude nothing.')
  }
  lines.push('')
  lines.push('════════════════════════════════════════════════')
  lines.push('YOUR NOTES FROM LAST SESSION')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (priorNotes && Object.keys(priorNotes).length > 0 && !priorNotes.error) {
    if (priorNotes.emotionalWeather) lines.push(`Emotional weather last week: ${priorNotes.emotionalWeather}`)
    if (priorNotes.whatTheyAreSittingWith) lines.push(`What they were sitting with: ${priorNotes.whatTheyAreSittingWith}`)
    if (priorNotes.languageShifts) lines.push(`Language shifts noticed: ${priorNotes.languageShifts}`)
    if (priorNotes.patternNoticed) lines.push(`Pattern noticed: ${priorNotes.patternNoticed}`)
    if (priorNotes.watchForNextWeek) lines.push(`What you were watching for this week: ${priorNotes.watchForNextWeek}`)
    if (priorNotes.oneQuestionIAmHolding) lines.push(`The question you were holding: ${priorNotes.oneQuestionIAmHolding}`)
    if (priorNotes.letterToNextSession) {
      lines.push('')
      lines.push('A letter from your last session:')
      lines.push(priorNotes.letterToNextSession)
    }
  } else if (weekNumber > 1 && !priorNotes) {
    lines.push(NO_PRIOR_NOTES)
  } else {
    lines.push(FIRST_SESSION_FALLBACK)
  }

  lines.push('')
  lines.push('════════════════════════════════════════════════')
  lines.push('THIS WEEK — WHAT HAPPENED')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('')
  lines.push(`Days present: ${summary.daysLogged} of 6`)
  if (summary.daysMissed > 0 && summary.missedDays?.length) {
    lines.push(`Days not logged: ${summary.missedDays.join(', ')}`)
  }
  lines.push('')
  lines.push('Habit presence this week:')
  const h = summary.habitSummary || {}
  const habitLabels = {
    eating: 'Nourishment',
    movement: 'Movement',
    reading: 'Reading',
    meditation: 'Meditation',
    journaling: 'Journaling',
  }
  ;['eating', 'movement', 'reading', 'meditation', 'journaling'].forEach((key) => {
    const s = h[key] || {}
    const days = s.daysLogged ?? 0
    let ln = `- ${habitLabels[key]}: ${days}/6 days`
    if (key === 'reading' && s.totalPages != null) ln += ` · ${s.totalPages} pages total`
    if (key === 'meditation' && s.totalMinutes != null) ln += ` · ${s.totalMinutes} minutes total`
    lines.push(ln)
    const notes = s.notes?.filter((n) => n?.trim()) || []
    if (notes.length) lines.push(`  Notes: "${notes.join('; ')}"`)
  })

  lines.push('')
  const moodStr = (summary.moodSequence || []).map((m) => (m ? m : '—')).join(' → ')
  lines.push('Mood through the week (Monday → Saturday):')
  lines.push(moodStr)
  const closingStr = (summary.closingWords || []).map((w) => (w ? w : '—')).join(' · ')
  lines.push('Closing words through the week:')
  lines.push(closingStr)

  const wi = summary.weeklyIntentions || {}
  lines.push('')
  lines.push(`Weekly intentions: ${wi.completed ?? 0} of ${wi.total ?? 0} met`)
  if (wi.intentions) {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dayNames.forEach((day) => {
      const list = wi.intentions[day] || []
      list.forEach((item) => {
        lines.push(`  ${day}: ${item.text} ${item.complete ? '[done]' : ''}`)
      })
    })
  }

  lines.push('')
  lines.push('════════════════════════════════════════════════')
  lines.push('JOURNAL ENTRIES THIS WEEK')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const journals = summary.journalEntries || []
  if (journals.length === 0) {
    lines.push('No journal entries were written this week.')
  } else {
    journals.forEach((j, idx) => {
      if (idx > 0) lines.push('────────')
      const dateShort = j.date ? new Date(j.date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : ''
      lines.push(`${j.dayOfWeek} — ${dateShort}`)
      lines.push(`Prompt given: "${j.prompt}"`)
      lines.push('')
      lines.push((j.entry || '').trim())
      lines.push('')
      lines.push(`(${j.wordCount ?? 0} words)`)
    })
  }

  lines.push('')
  lines.push('════════════════════════════════════════════════')
  lines.push('HOW TO CONDUCT THIS SESSION')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('')
  lines.push('1. Begin by asking how the week felt from the inside.')
  lines.push('   Do NOT reference the data first.')
  lines.push('   Let them speak without framing.')
  lines.push('')
  lines.push('2. Listen for what they emphasize and what they skip.')
  lines.push('   The skipped things are often where the real week lives.')
  lines.push('')
  lines.push('3. Bring in the data gently — only when it adds to')
  lines.push("   what they've already shared, or when there is a")
  lines.push('   meaningful gap between what they said and what happened.')
  lines.push('')
  lines.push('4. Notice language. Is it softer or harder than last week?')
  lines.push('   Do they speak about themselves with more compassion')
  lines.push('   or more judgment than before?')
  lines.push('')
  lines.push('5. Notice avoidance. If a habit was missed repeatedly')
  lines.push("   and they haven't mentioned it — hold that.")
  lines.push('   Bring it with care, not confrontation.')
  lines.push('')
  lines.push('6. Do not give generic advice. Everything you offer')
  lines.push('   must be specific to what this person has shown you.')
  lines.push('')
  lines.push('7. When the conversation feels complete, ask:')
  lines.push('   "Is there anything that wants to be said')
  lines.push('   that hasn\'t been said yet?"')
  lines.push('')
  lines.push('8. Then provide the closing notes in the exact format below.')
  lines.push('')
  lines.push('════════════════════════════════════════════════')
  lines.push('REQUIRED CLOSING FORMAT')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('At the end of our conversation, provide your notes')
  lines.push('in EXACTLY this format. Do not add extra fields.')
  lines.push('Do not skip fields. Copy the format precisely.')
  lines.push('')
  lines.push('[KAIZEN SESSION NOTES — COPY THIS BACK TO YOUR APP]')
  lines.push('WEEK: [week number]')
  lines.push("DATE: [today's date]")
  lines.push('EMOTIONAL_WEATHER: [one sentence]')
  lines.push('WHAT_THEY_ARE_SITTING_WITH: [one to two sentences]')
  lines.push('LANGUAGE_SHIFTS: [what changed in how they speak about themselves]')
  lines.push('INTENTION_VS_REALITY: [where they meant to go vs where they went]')
  lines.push('MOMENT_OF_AWARENESS: [the single most alive moment of the conversation]')
  lines.push('PATTERN_NOTICED: [something recurring — could be new or confirmed]')
  lines.push('WATCH_FOR_NEXT_WEEK: [one specific thing to hold]')
  lines.push('ONE_QUESTION_I_AM_HOLDING: [the question you didn\'t ask but are carrying]')
  lines.push('LETTER_TO_NEXT_SESSION: [3-5 sentences, written to your future self —')
  lines.push('what you want to remember about this person right now,')
  lines.push('what felt important but unfinished, what to approach differently]')
  lines.push('USER_FACING_REFLECTION: [This is the ONLY field the user will see.')
  lines.push('Write in second person. Warm, specific, 3-4 sentences.')
  lines.push('Not a summary of the data. A reflection of who you witnessed')
  lines.push('this week. Write it as if you are leaving a note on their desk')
  lines.push('that they will find Sunday evening.]')
  lines.push('[END KAIZEN NOTES]')
  lines.push('════════════════════════════════════════════════')

  return lines.join('\n')
}
