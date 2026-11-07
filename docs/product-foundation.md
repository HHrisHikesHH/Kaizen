# Kaizen Product Foundation

**Status:** v0.2, 2026-11-08. The structure is approved, and decisions D1–D15 were made on 2026-11-08 (recorded in section 14). Nothing here is implemented yet. Each capability still gets its own design check-in before it is built.

**Basis:** the code on `main` at `86b3dea`. File and line references point to that commit and will drift as the code changes. The evidence behind each claim is in Appendix A.

**Purpose:** to make Kaizen more meaningful, coherent and trustworthy, not bigger. Each capability described here gets its own design check-in, tests and PR before implementation.

**Known gaps at the time of writing:**
- The post-fix Chrome test (a blank completed session shows `daysLogged: 1`) and the Chrome check of PR #2 are not yet recorded.
- The quarterly, half-yearly and yearly parsers drop the reflection that follows a multiline letter. Three expected-failure tests document this (`tests/utils/parsers.test.js:91,99,107`).
- The legacy summary view shows a file path, not the summary's contents (`src/components/LegacyWeekRecords.jsx:71-72`).

---
### 1. Core transformation promise
> **Kaizen helps you see your days clearly, understand what shapes them, and choose your next small step deliberately, without shame, and in a way you increasingly carry yourself.**

The cycle is Observe → Understand → Align → Act → Review. It describes how the existing pieces relate: the daily close is Observe, the weekly review is Understand and Align, the experiment is Act, and the next review is Review. It is not five pages.

### 2. Intended user and problem
- **User (assumption):** a reflective adult who wants to understand themselves and live deliberately. They value privacy, write sometimes but not always, and use desktop Chrome (a current constraint). **Decision D1:** Kaizen is a personal tool now and may become a product later. It is designed for the project owner, with no extra onboarding or support work for now, but design choices must not block offering it to others later. For example, avoid hard-coding personal content and keep the wording understandable to a stranger.
- **Problem:** people collect days without learning from them. Habit trackers turn growth into compliance and streaks. Journals hold insight but don't turn it into action. AI chat can be insightful but takes the interpretation away from the user and creates dependence.
- **Not for:** treating mental-health conditions, or crisis support. Kaizen should say this plainly and point to real support when needed (see section 9).

### 3. Philosophy and design principles
Each principle shows its research grounding in brackets. The frameworks inform the design; they are not claims of clinical effect.
1. **Closure over completion.** Closing the day is the practice. Writing, habits and moods are optional additions. [Mindfulness: noticing without striving; self-compassion]
2. **Absence is not evidence.** A missing record says nothing about motive. Kaizen never calls it a failure, and never lets the AI read it as avoidance. [Self-compassion; Stoic humility about what we can know]
3. **The user is the authority on their own life.** Interpretations are hypotheses that the user accepts, corrects or rejects. [SDT autonomy; ACT defusion: thoughts as hypotheses, not facts]
4. **Nothing about you that you can't read.** Every piece of text Kaizen or an AI stores about the user is visible to the user. [Trust; SDT autonomy]
5. **Sharing is chosen, previewed and partial.** [Local-first privacy]
6. **From values to small experiments.** Action comes from what matters to the user, not from targets. It takes the form of one small, concrete experiment. [ACT values; implementation intentions; COM-B]
7. **Separate what you control from what you don't.** Reviews of obstacles distinguish the two. [Stoic dichotomy of control; COM-B opportunity]
8. **Growth is character and understanding, not output.** No scores. Evidence of growth is the user's own words over time. [Aristotelian virtue as practised habit; eudaimonia is broader than productivity]
9. **Capability, not dependence.** Every reflective step works without AI. AI is an optional amplifier, and the app should make the user better at reflecting alone. [SDT competence]
10. **Calm by default.** No nudges, badges, streaks or engagement metrics. [Non-attachment; avoids extrinsic-reward effects that SDT warns can crowd out intrinsic motivation]

### 4. Non-goals
Kaizen will not be:
- a habit tracker with streaks
- a productivity dashboard
- a chatbot inside the app
- therapy or a diagnostic tool
- a social or sharing product
- a growth score
- a notification-driven engagement loop
- a cloud service holding the user's journal

### 5. User journey
| Rhythm | Moment | Cycle stage | AI? |
|---|---|---|---|
| Daily, about 0–15 min | Light the diya → close the day at whatever depth fits | Observe | No |
| Weekly, about 15–40 min | Your account → your evidence → what you notice (optionally with AI) → what matters → one experiment | Understand, Align, Act | Optional |
| During the week | The experiment appears quietly on Home; nothing nags | Act | No |
| Next weekly review | "What happened with the experiment? What did you learn?" | Review | Optional |
| Monthly, seasonal, yearly | Look back at your own words, experiments and lessons; name what changed | Review, Align | Optional |
| After a gap | Return without a backlog, a guilt screen or a count of missed days | — | No |

### 6. Daily ritual design (proposed)
**The simplest design is one page with progressive depth, not a mode picker.** Asking the user to classify their own day as "quick" or "deep" adds a judgement. The depth follows from what they choose to touch.
- **A. Quiet close:** the close button is reachable without scrolling past every field. Pressing it with nothing filled in is a full, valid closure. This already works (`HomePage.jsx:144`); the proposal makes it visible as a first-class choice.
- **B. Quick reflection:** mood, a closing word and at most one line. These already exist except the single line, which would reuse the journal field.
- **C. Deep reflection:** the existing journal and prompt, with an optional "another question" control to draw a second prompt.
- **A difficult day:** a per-entry "keep this day private" option, so the entry is never included in any AI package (see C2). A separate, gentler prompt pool was considered and not adopted (D3).
- **Intentional rest (adopted, D3):** a "let today pass" close that records the day as consciously rested, distinct from never opening the app. It is never counted against the user.

**The states are kept distinct (additive, backwards compatible):**
| State | Recorded as | Treatment |
|---|---|---|
| Day closed | `sessionComplete: true` (existing) | Presence; no judgement about content |
| Reflection written | derived from `journal.entry` (existing) | Never required; never the measure of a "good" day |
| Habit logged | `habits.x.logged` (existing) | "Not logged" is shown as **unknown**, not missed |
| Intentionally rested | new optional `closedAs: 'rest'` (D3) | Shown as rest |
| No record | no file (existing) | "No record", never "missed" |

**Related changes:**
- Stop auto-ticking the journaling habit at 20 words. Writing and the journaling practice are different things, and a word threshold quietly sets a minimum.
- Week dots and the weekly summary stop calling days "missed". The file field `missedDays` stays for compatibility; only the presentation and the AI wording change.
- **Reopening (D4):** a closed day can be reopened the same evening, until the local date changes. Past days stay as they were; there are no notes added to past days.
- **Depth on one page (D2):** progressive disclosure on a single page, with no mode picker.

### 7. Weekly reflection and action loop (proposed)
The eight-step sequence proposed during discovery is right. **Most of it should be led by the user and run locally, with AI as an optional middle step.**

| Step | Who leads | Why |
|---|---|---|
| 1. Your account of the week (free text) | User | Starts from lived experience, not data. The existing Sunday instruction already says this (`generateSundayPackage.js:170-172`) |
| 2. Evidence from your records | Kaizen, locally | Which days closed, the user's own closing words and moods, quotes they wrote, intention and experiment outcomes. No interpretation and no AI needed |
| 3. Possible patterns, marked as hypotheses | User, optionally AI | AI returns observations, each with evidence (dates or quotes) and a question |
| 4. Correct or reject | User | Each observation gets *fits / partly / doesn't fit*, plus an optional correction. Rejected ones are never fed back as truth |
| 5. Explore obstacles | User, with an optional question card | Capability (skill, energy), Opportunity (time, place, people), Motivation (does it still matter?), plus "what was in my control?" |
| 6. Choose one experiment | User | One, not a list. Tied to a value the user names |
| 7. Make it an if-then intention | User, with a template | "If [situation], then I will [small action]" |
| 8. Review next week | User, optionally AI | Tried / partly / not tried / changed my mind, and "what did I learn?" No grade |

- **The weekly review is available from Sunday through the following Saturday (D7).** Missing a Sunday should not lose the week, and today it also blocks the monthly, quarterly and yearly reviews (`cycleDetector.js:125`).
- **Steps where AI is optional:** 1 (as a conversation partner), 3 and 8.
- **Steps AI must never perform:** 4 (verdicts are the user's) and 6–7 (the choice is the user's; the AI may offer options when asked).

### 8. Long-term growth and reviews (proposed)
- **Build reviews from primary records, not AI-on-AI summaries.** Today the yearly package is built only from earlier AI output (`generateYearlyPackage.js:57-80`), so interpretation drifts and the user's own voice disappears. Proposed sources:
  - entries the user marks as meaningful
  - experiments and their lessons
  - observations the user confirmed
  - the user's own monthly or seasonal notes
- **Then and now.** Show the user's own words from the start of a period next to words from the end, and ask "what has changed in how you meet things like this?"
- **Prompts for real development** (all optional): values and how they shifted; skills learned; a difficult situation handled differently; relationships and contribution; how you speak to yourself; what you are more aware of; what you now choose deliberately.
- **Domains** (physical, intellectual, relationships, inner life, craft and work, contribution) are optional, user-named tags on experiments and lessons, never required and never scored. This is a hypothesis to validate.
- **Ungate the reviews.** A month can be reviewed on any user-led basis. AI-led reviews need whatever AI history exists, not a quota.
- **Letters to your future self:** a user-written letter opened on a date the user chooses. It is cheap and user-authored. Risk: it can feel like a test the future self failed, so the opening prompt must be gentle. Classified as a hypothesis (later).
- **No numbers stand in for growth.** Counts can appear as plain facts ("you wrote on 12 days"), never as scores, rates or streaks.

### 9. AI responsibilities and boundaries
**The AI may:**
- listen
- ask questions
- offer observations as hypotheses, each with evidence and a question
- help phrase an if-then intention when asked
- reflect the user's own language back

**The AI must not:**
- treat a missing record as avoidance, laziness or meaning of any kind
- infer hidden motives as fact
- name emotional states as diagnoses
- act as a spiritual, therapeutic or moral authority
- set goals for the user
- write notes the user cannot see
- encourage weekly dependence

**Concrete changes to the packages** (copy and format changes, backwards compatible):
- Replace the role "part Buddhist teacher, part contemplative therapist" (`generateSundayPackage.js:56-57`) with "a careful, curious reflection partner. Not a therapist or teacher."
- Replace the avoidance instruction (`generateSundayPackage.js:174-175,185-187`) with: "Missing records can mean not done, done but not logged, rest, or illness. Never assume. Ask only if the person wants to explore it."
- Rename and soften the long-term fields: "still resisted" becomes "still difficult", "shadow/stubborn pattern" becomes "a recurring difficulty, as the person describes it", and "real avoidance" is removed. Retire "most important piece of writing in the app".
- Add an observation format: `OBSERVATION / EVIDENCE / QUESTION`. Parsers accept old notes unchanged.
- Add one safety line: if the person describes risk of harm, step out of the reflective role and gently encourage contacting appropriate support (D13).

### 10. Privacy principles
1. Local-first is the architecture, not a setting. There is no server, account, API key or telemetry, and no network call carries user content.
2. AI sharing is manual, previewed and selective. The package is always shown before copying; this includes Growth, which currently copies without showing anything.
3. The user chooses what goes in a package: per category (journals per day, habit notes, moods, closing words, intentions, prior AI notes, name) and per entry (private days are excluded). **The default is minimal (D8):** journals are opted in day by day.
4. Raw records (`YYYY/MM`), the user's own reviews and AI-derived text (`AI_notes/`) stay in separate files, and each AI item is labelled with where it came from.
5. Everything Kaizen stores is readable by the user, inside the app and as plain JSON in their folder.
6. Local processing is the default: all counts, evidence and "then and now" views are computed on the device.
7. No API integration or cloud backend without a separate, explicit decision.

### 11. Existing features: preserve, improve, reconsider, retire
| Action | Feature | Reason |
|---|---|---|
| **Preserve** | Diya ritual and closing screens; empty close; rotating prompts; mood and closing word; folder storage, ZIP backup, no network; manual AI handoff; the "begin from the inside" instruction; "days passed" wording; Sunday "close without writing"; intentions as a "compass" | They embody the philosophy |
| **Improve** | Sunday package (role, avoidance wording, selective sharing); the hidden AI notes (make visible); Growth copy (add a preview); review gating; legacy summary display; the 3 parser defects | Trust, privacy and reliability |
| **Reconsider** | Fixed five habits (user-chosen practices, later); journaling auto-tick at 20 words; the hard lock after closing; Sunday-only availability; presence shading by word count and the word-count arc; "Longest continuity"; the unused consistency scores; the nav dot for incomplete intentions; the user's name in packages by default; Saturday copy ("a patient witness who has been reading your days"); deficit-only prompts such as "What did you avoid?" (balance them, don't delete) | Each quietly implies a standard, a streak or surveillance |
| **Retire** | Unrouted `JournalPage.jsx`; the "shadow / stubborn / still resisted / real avoidance" fields; "most important piece of writing in the app" | Dead code or contrary to the principles |

### 12. Prioritised roadmap
**Foundation (prerequisites, before new features)**
- Approve this foundation. (Decisions recorded on 2026-11-08.)
- Run the two pending Chrome checks.
- Fix the 3 parser defects so the expected-failure tests pass.
- Show legacy summary contents.
- Rewrite the AI-boundary wording in all packages, including the safety line (C3; D10, D13).
- Remove the unrouted `JournalPage.jsx` and its stylesheet (D14).

**Next development phase, in recommended order**
1. **C1** Visible AI notes.
2. **C2** Selective, previewed sharing and private days.
3. **C4** Daily depths, rest state and journaling decoupling.
4. **C5** A self-led weekly review with a flexible window.
5. **C6** One experiment as an if-then intention, reviewed the next week.

**Later opportunities**
- C7: long-term reviews from your own words, ungated.
- C8: user-chosen practices instead of fixed habits (needs a data migration).
- Optional domains.
- Letters to your future self.
- A values statement the user revisits.

**Research only (no implementation)**
- Behavioural interaction analytics.
- Numerical baseline assessments.
- IndexedDB as default storage.
- PWA or mobile.
- On-device language models.

**Deliberately excluded**
- streaks, badges, scores or presence percentages
- push notifications or nudges
- an in-app chatbot
- automatic AI or API calls
- sentiment or mood scoring
- diagnosis
- social features

#### Capability specs
**C1 — Visible AI notes**
- **Why and problem:** the AI stores 10 fields about the user that the user never sees (`generateSundayPackage.js:219`, `README.md:108`).
- **Philosophy:** principle 4.
- **UX:** a "What the AI noted" disclosure under each reflection in Growth and Sunday. Plain text, collapsed by default.
- **Letters (D9):** the letter the AI writes to its next session stays, and it is visible to the user like every other field.
- **Growth page metrics (D12):** C1 also removes the word-count arc, the word-count shading of the presence map, and "Longest continuity", since it already touches the Growth page.
- **Tech:** read the existing `AI_notes` JSON; no schema change.
- **Data and privacy:** read-only.
- **Acceptance criteria:**
  - Every stored field for a week, month, quarter, half or year is viewable in the app.
  - Old files display correctly.
- **Risks:** the user may find the AI's private phrasing unsettling. That is the point, but the wording should be calm.

**C2 — Selective, previewed sharing and private days**
- **Why and problem:** packages include everything, and Growth copies without a preview (`SundayPage.jsx:235-250`, `GrowthPage.jsx:630-645`).
- **Philosophy:** principles 5 and 1, and the difficult-day case.
- **UX:**
  - Category checkboxes and per-day journal toggles above the preview.
  - The preview updates as selections change.
  - Copying always copies exactly what is shown.
- **Defaults (D8, minimal):**
  - Ticked by default: moods, closing words and plain counts (days closed, habit days).
  - Not ticked by default: journal entries (opted in per day), habit notes and the user's name.
  - Intentions and prior AI notes: to be settled in the C2 design check-in.
- **Tech:** the package generators take an `include` options object, which defaults to the minimal set above.
- **Data:** an additive optional `private: true` on daily entries.
- **Acceptance criteria:**
  - Excluded items never appear in the copied text.
  - A private entry is excluded from every package type.
  - Growth shows a preview.
  - Tests cover each generator.
- **Risks:**
  - More controls on a calm page, so keep them collapsed under a "Choose what to share" toggle.
  - With the minimal default, an AI conversation has little to work with unless journals are opted in. The page must say plainly what is and isn't included, especially the first time, because today's package includes everything.

**C3 — AI boundaries and the observation format**
- **Why:** the current wording tells the AI to read missed habits as avoidance and casts it as therapist or teacher.
- **Philosophy:** principles 2, 3 and 9.
- **UX:** Sunday and Growth show observations as cards with *fits / partly / doesn't fit*.
- **Tech:** edit the generator text. The parsers accept an optional repeated `OBSERVATION/EVIDENCE/QUESTION` block, and the old format still parses.
- **Data:** additive `observations[]` with `verdict` and `correction`. Rejected observations are passed forward labelled as rejected, so the AI doesn't repeat them.
- **Acceptance criteria:**
  - No package text contains avoidance or diagnostic framing.
  - Old notes files parse unchanged.
  - Verdicts persist.
- **Risks:** AIs may ignore the format, so verdict capture must degrade gracefully.

**C4 — Daily depths and states**
- **Why:** one close fits every kind of day, a word threshold ticks a habit, and "missed" is ambiguous.
- **Philosophy:** principles 1, 2 and 10.
- **UX:** quiet close always reachable; a one-line quick field; "another question" for depth; an optional "let today pass".
- **Tech:** HomePage and ClosingSection layout. Remove the auto-tick (`HomePage.jsx:136-138`). Rename the week-dot classes.
- **Data:** additive `closedAs`. The summary keeps `daysLogged` and `missedDays` for compatibility.
- **Acceptance criteria:**
  - An empty close records `sessionComplete: true` and is counted (already tested in `tests/utils/sessionSave.test.js`).
  - Writing 20+ words no longer changes habit state.
  - A rest day is distinguishable from no record.
  - A closed day can be reopened until the local date changes, and only then (D4).
- **Risks:** changing the visual identity of Home, so changes must stay within the existing styles.

**C5 — Self-led weekly review**
- **Why:** reflection currently depends on an AI conversation and on the user being free that Sunday.
- **Philosophy:** principles 9 and 3.
- **UX:**
  - The Sunday page works without AI: your account, then your evidence, then what you notice.
  - "Reflect with AI" becomes an optional branch.
  - The page is available from Sunday through the following Saturday (D7).
- **Tech:** extend `week-WW-sunday.json` with additive fields. The evidence is computed locally from existing files.
- **Data:** local only.
- **Acceptance criteria:**
  - A full weekly review can be completed with no AI step.
  - A review started on a Wednesday attaches to the previous week.
  - Monthly readiness counts self-led reviews.
- **Risks:** a weaker sense of ritual if it is always available; mitigated by the Sunday framing staying the default.

**C6 — One experiment as an if-then intention**
- **Why:** insight doesn't reach action today; nothing connects Sunday to Plan.
- **Philosophy:** principles 6 and 7.
- **UX:**
  - At the end of the review: "What matters to you this week?", then "If … then I will …".
  - It shows quietly on Home and Plan.
  - The next review asks what happened, with no grade.
- **Tech:** an additive `experiment` object in the target week's plan file, written only through the existing `canWriteWeekFile` check.
- **Data:** local only.
- **Acceptance criteria:**
  - Choosing an experiment is optional.
  - "Changed my mind" is a valid outcome.
  - No completion rate is shown anywhere.
- **Risks:** it can drift toward to-do tracking, so it stays limited to one per week.

**C7 / C8:** these are later opportunities. Each needs its own spec, and C8 needs a migration plan for the fixed `habits` keys in every existing daily file.

### 13. Success criteria (real life, not engagement)
Kaizen will not have analytics. These criteria are judged through the user's own reviews and, if Kaizen is offered to others, a few interviews:
- After a month, the user can name something they understand about themselves that they didn't before, in their own words.
- Experiments are tried and their lessons recorded, including ones that "failed".
- The user returns after a gap without guilt and without any catch-up demand.
- The user can complete a meaningful weekly review without AI.
- The user is never surprised by what was shared or stored.
- Guardrails that can be tested:
  - zero network calls with user content
  - no streak or score shown anywhere
  - every AI observation shown with evidence and a question
  - all stored AI text visible to the user

### 14. Decisions (made 2026-11-08)
| # | Question | Decision |
|---|---|---|
| D1 | Who is Kaizen for? | A personal tool now, possibly a product later. Don't add onboarding or support work yet, but avoid choices that would block offering it to others |
| D2 | How are the daily depths presented? | One page with progressive depth; no mode picker |
| D3 | Is there a rest state? | Yes: an optional "let today pass" close (`closedAs: 'rest'`). No separate gentler prompt pool |
| D4 | Can a closed day be edited? | It can be reopened the same evening, until the local date changes. Past days stay unchanged |
| D5 | Journaling auto-tick at 20 words | Removed |
| D6 | User-chosen practices instead of the fixed five habits | A later phase, after the weekly loop. It needs a migration plan |
| D7 | Weekly review window | From Sunday through the following Saturday. Sunday stays the suggested day |
| D8 | Default contents of an AI package | **Minimal.** Moods, closing words and counts are ticked; journals are opted in per day; habit notes and name are off. Intentions and prior AI notes are to be settled in the C2 design check-in. *This differs from the original recommendation, which was everything except the name* |
| D9 | AI notes | All fields are visible to the user. The letter to the next session stays, and is visible too |
| D10 | AI role wording | "A careful, curious reflection partner. Not a therapist or teacher." |
| D11 | Long-term reviews | Ungated. Built from the user's own entries, experiments and confirmed observations; earlier AI notes are context only |
| D12 | Growth page metrics | Remove the word-count arc, the word-count shading and "Longest continuity" (done with C1) |
| D13 | Safety line in AI instructions | Added (done with C3) |
| D14 | Unrouted `JournalPage.jsx` | Retired (Foundation tidy-up) |
| D15 | Order of the next phase | C1 → C2 → C4 → C5 → C6, after the Foundation items |

### Assumptions and uncertainties
- There is no usage data. The user model and the difficult-day scenarios are reasoned, not observed.
- I have not seen any real user folder, so I don't know how many legacy or odd files exist in the wild.
- The research frameworks justify design choices. They do not predict outcomes for Kaizen.
- The two Chrome checks are still unverified.

---

## Appendix A — What Kaizen does today (evidence)

### Daily ritual
| Behaviour | Evidence |
|---|---|
| A diya intro plays once per day, tracked in localStorage | `App.jsx:70`, `hooks/useDiyaEntry.js:15-19` |
| Five fixed habits: eating, movement, reading, meditation, journaling | `utils/dailyEntry.js:37-43`, `components/HabitCards.jsx:4`, `components/HabitCard.jsx:3-39` |
| The journaling habit ticks itself at ≥20 words and never unticks if the text is deleted | `pages/HomePage.jsx:23,136-138` |
| One rotating prompt per day, from a pool of about 60 | `utils/dailyEntry.js:32`, `utils/prompts.js` |
| Mood (5 options or your own word) and one closing word | `components/ClosingSection.jsx:3-42` |
| A single "The day is complete. Rest now." button; an empty close is allowed | `ClosingSection.jsx:44-50`, `HomePage.jsx:144-163` |
| Closing sets `sessionComplete` and `divaExtinguished`, then the day is locked: "Return tomorrow." | `HomePage.jsx:154,180-192`, `components/LockedView.jsx:11-14` |
| Week dots mark past days without a closed session as "missed" (neutral stone colour) | `components/WeekDots.jsx:19`, `WeekDots.css:31-34` |

**The data cannot tell some states apart.**
- `sessionComplete` means only that the day was closed. Whether a reflection was written is inferred from `journal.wordCount`.
- `habits.x.logged: false` can mean "not done" or "done but not recorded".
- Choosing to rest and never opening the app look the same.

### Weekly planning and Sunday
| Behaviour | Evidence |
|---|---|
| Intentions are per-day text items with a done flag, introduced as "Not a to-do list. A compass." | `utils/weekPlanStore.js:15-25`, `pages/PlanPage.jsx:83,102` |
| A nav dot appears while today's intentions are incomplete | `components/AppShell.jsx:20,119-120` |
| The weekly summary counts Monday–Saturday and records `daysMissed`, `missedDays` and per-habit `missedOn`. It also computes three "consistency scores" that nothing displays | `utils/aggregateWeek.js:36-38,54,122-144` |
| The Sunday page opens only on Sunday: "one deep conversation per week — not more, not less" | `pages/SundayPage.jsx:35,176-191` |
| The package contains every full journal entry, habit notes, moods, closing words, intentions, the user's name and the AI's prior notes | `utils/generateSundayPackage.js:50,73-163` |
| The user sees a read-only preview, then copies everything; there is no selection | `SundayPage.jsx:235-250` |
| The AI is told it is "part Buddhist teacher, part contemplative therapist" | `generateSundayPackage.js:56-57` |
| The AI is told "the skipped things are often where the real week lives" | `generateSundayPackage.js:174-175` |
| The AI is told "Notice avoidance. If a habit was missed repeatedly … hold that." | `generateSundayPackage.js:185-187` |
| The AI is told to begin by asking how the week felt, and **not** to reference the data first (good) | `generateSundayPackage.js:170-172` |
| The AI returns 11 fields, but only `USER_FACING_REFLECTION` "is the ONLY field the user will see". The rest go to `AI_notes/` and feed the next package. The README calls them "a private set of notes it has kept" | `generateSundayPackage.js:205-224`, `parseSessionNotes.js:55-66`, `README.md:108` |
| `WATCH_FOR_NEXT_WEEK` and `INTENTION_VS_REALITY` reach the AI, never the user | `generateSundayPackage.js:81`, `generateMonthlyPackage.js:173` |
| After the reflection, the user can write in a Sunday journal or "close without writing" (good) | `SundayPage.jsx:313-335` |
| Last week's reflection appears on Home | `hooks/useLastWeekReflection.js`, `HomePage.jsx:255-265` |
| Nothing connects the Sunday reflection to next week's plan | (no code path) |

### Long-term reviews and Growth
| Behaviour | Evidence |
|---|---|
| A monthly review is available only after **≥4 Sunday AI sessions** in that month | `utils/cycleDetector.js:125` |
| A quarterly review needs 3 monthly AI notes; a half-year needs 2 quarters; a year needs 2 halves | `cycleDetector.js:143,161,176` |
| The monthly package samples 3 journal excerpts (≤400 characters each); the rest is prior AI notes | `utils/generateMonthlyPackage.js:151-174` |
| The quarterly and yearly packages are built **only from earlier AI output** | `generateQuarterlyPackage.js:61-71`, `generateYearlyPackage.js:57-80` |
| The return fields include "WHAT_IS_STILL_RESISTED", "SHADOW_PATTERN" and "THE_STUBBORN_PATTERN". A banner says "real change — or real avoidance" | `generateMonthlyPackage.js:199`, `generateQuarterlyPackage.js:83`, `generateYearlyPackage.js:91`, `GrowthPage.jsx:218` |
| The AI's yearly reflection is described as "The most important piece of writing in the app" | `generateYearlyPackage.js:100` |
| The Growth paste modal copies the package **without showing it** | `pages/GrowthPage.jsx:630-645` |
| Presence-map cells are shaded by word count (≥50 = "full") | `GrowthPage.jsx:405-411` |
| A word-count chart is captioned "Not quantity — presence" | `GrowthPage.jsx:485-486` |
| Quiet stats include "Longest continuity: N days", which is a streak | `GrowthPage.jsx:624`, `utils/growthData.js:188-197` |
| Days without a closed session are called "days passed", which is neutral (good) | `GrowthPage.jsx:263` |
| `JournalPage.jsx` exists but no route uses it | `App.jsx:88-95` |

### Storage and platform
- The app uses a user-chosen folder through the File System Access API. Only the folder handle is kept in IndexedDB (`utils/memoryStore.js`).
- It runs in desktop Chrome only (`App.jsx:30`, `BrowserWall`), with a mobile wall (`App.jsx:41`).
- Backup is a ZIP download (`utils/backupManager.js`).
- **The code makes no network calls** (no `fetch` or HTTP in `src/`).
- Moving to a new device means extracting the ZIP and choosing that folder (`pages/SettingsPage.jsx:134-145`).
- Raw records live in `YYYY/MM/`, plans and summaries in `YYYY/`, and AI output in `AI_notes/`, so the separation already exists.

---

## Appendix B — Classification of the earlier assessment's ideas
| Idea | Classification | Reasoning |
|---|---|---|
| Quick and deep reflection | Strong opportunity; the principle beneath it ("an empty session is valid") is essential | Fits real days; small change (C4) |
| Better weekly AI reflection | Strong opportunity | It is less about better AI than about boundaries, transparency and user verdicts (C1–C3) |
| Behavioural experiments | Strong opportunity | Closes the gap between insight and action; well grounded (C6) |
| Longitudinal growth evidence | Strong opportunity, as the user's own words over time | The numeric version would be harmful (C7) |
| Personal growth domains | Hypothesis requiring validation | May help some users and feel bureaucratic to others; optional tags only |
| Letters to your future self | Hypothesis requiring validation | Cheap and user-authored, but risks guilt; gentle framing needed |
| IndexedDB as default storage | Future architectural investigation | Might improve reliability, but makes the user's data less visible and is subject to browser eviction; "there is only the folder" (`SettingsPage.jsx:144`) is part of the promise |
| Optional folder-based storage | Future architectural investigation | Pairs with the IndexedDB question; needs a migration and backup design |
| PWA and mobile support | Future architectural investigation | Plausibly helps low-energy closes, but the File System Access API isn't available on mobile, so this depends on the storage decision |
| Numerical baseline assessments | Unnecessary or potentially harmful | Turns growth into scores, invites self-judgement and implies clinical validity |
