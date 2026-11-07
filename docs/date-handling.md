# Date and week handling

All calendar logic lives in [`src/utils/dateHelpers.js`](../src/utils/dateHelpers.js).

## Rules

- **Calendar dates** (which day a journal entry belongs to) are local date keys
  `YYYY-MM-DD`, built from local `Date` components. Never use
  `toISOString().slice(0, 10)` for a calendar date: it gives the UTC date,
  which is a different day for part of every day outside UTC.
- **Instants** (`createdAt`, `addedAt`, `generatedAt`, …) stay as
  `new Date().toISOString()`.
- **Weeks** are ISO 8601 weeks, identified by `{ isoYear, isoWeek }` from
  `getISOWeek()`. Never pair a week number with `getFullYear()`: Jan 3 2027
  is 2026-W53, and Dec 29 2025 is 2026-W01. Some years (2026, 2032, …) have 53 weeks.
- Move between weeks with `shiftISOWeek()`. Don't add or subtract week numbers by hand.

## Storage paths (unchanged)

| Data | Path | Date part |
|---|---|---|
| Daily entry | `YYYY/MM/YYYY-MM-DD.json` | local date key |
| Week plan | `YYYY/week-N.json` | ISO year + ISO week |
| Week summary | `YYYY/week-N-summary.json` | ISO year + ISO week |
| Sunday state | `YYYY/week-N-sunday.json` | ISO year + ISO week |
| Weekly AI notes | `AI_notes/week-N-YYYY-notes.json` | ISO week + ISO year |

No file names, folders or JSON fields changed in this release.

## Historical data compatibility

Before this fix:

1. **Daily entries** used the UTC date as their key. Some entries therefore sit
   under a neighbouring day's file name:
   - East of UTC (e.g. India, New Zealand), sessions after local midnight but
     before UTC midnight (00:00–05:29 in India) were saved under the previous day.
   - West of UTC (e.g. the Americas), evening sessions after UTC midnight
     (after 4–5 pm in Los Angeles) were saved under the next day.
2. **Week plans and summaries** were named with the *calendar* year of the day
   they were saved, paired with the ISO week number (`now.getFullYear()` +
   `getWeekNumber(now)` in Home, Plan, AppShell, Sunday and the daily
   closing flow). In the days around New Year, when the calendar year and
   the ISO year differ, a week's files landed in the neighbouring year's folder:

   | ISO week | Days affected | Legacy files | Also the canonical file of |
   |---|---|---|---|
   | 2025-W01 (Dec 30 2024 – Jan 5 2025) | Dec 30–31 2024 | `2024/week-1.json`, `2024/week-1-summary.json` | 2024-W01 (before the app's history) |
   | 2026-W01 (Dec 29 2025 – Jan 4 2026) | Dec 29–31 2025 | `2025/week-1.json`, `2025/week-1-summary.json` | **2025-W01** |
   | 2026-W53 (Dec 28 2026 – Jan 3 2027) | Jan 1–3 2027 | `2027/week-53.json`, `2027/week-53-summary.json` | none (2027 has 52 weeks) |

   The last row only exists if an old version is still running on Jan 1–3 2027.
   The rest of each affected week (Jan 1–5 2025, Jan 1–4 2026) was saved
   canonically (`2025/week-1.json`, `2026/week-1.json`), so a week can be
   **split** across two files.

   `2025/week-1.json` is **shared**. On Dec 29–31 2025 the old app opened the
   existing 2025-W01 plan from January 2025 and saved any edits into it. That
   file can therefore hold intentions of both weeks. The same goes for
   `2025/week-1-summary.json`, which a daily session or plan edit on Dec 29–31
   2025 regenerated from the Dec 30 2024 – Jan 4 2025 days. That rewrite may
   already have replaced a reflection saved on Sunday Jan 5 2025; this
   version cannot recover it.

   Legacy summaries were always computed for the week their *path* names
   (`2024/week-1-summary.json` counts Jan 1–6 2024 days), with intentions from
   the misplaced plan. So a legacy summary's day data never describes the
   week it is legacy for.

   No historical Sunday session falls on a mismatched day, so Sunday state
   and weekly AI note files are unaffected. (Jan 3 2027 would be the first,
   which is why the deadline in the PR matters.)

What we do about it:

- **Nothing is moved, renamed, rewritten or deleted.** Every existing file stays
  at the path it was saved to.
- **Daily entries: no fallback lookups.** The app does not try a neighbouring
  day's file when one is missing. A fallback would show one entry on two
  different days, and an edit could then write a day's data into the wrong file.
  The stored entry contains no timestamp, so a misfiled day can't be
  identified safely. Re-keying old data is deliberately not attempted.
- **Week files: read-only legacy lookup** via
  [`src/utils/weekFileCompat.js`](../src/utils/weekFileCompat.js):
  - `getLegacyWeekLocations(isoYear, isoWeek)` lists the other `(year, week)`
    paths an old version could have used for that week: the calendar year of
    any of its days, up to `LEGACY_KEYING_LAST_DAY` (2027-01-03). Files written
    by this version after that date are never mistaken for legacy records.
  - `resolveWeekRecords(handle, 'plan' | 'summary', isoYear, isoWeek)` reads,
    and never writes. It returns the canonical record and every legacy record
    side by side, each with its path, plus a status:
    - `canonical`: only the canonical file exists.
    - `legacy-only`: only a legacy file exists.
    - `conflict`: both exist.
    - `missing`: neither exists.

    An unreadable file is reported as `unreadable`, not treated as missing.

### Conflict-resolution rules

1. **New records go to the canonical ISO-year path.** Legacy paths are never
   written.
2. **The canonical record is the one shown and edited.** Legacy records are
   shown read-only beside it on the Plan page ("saved by an earlier version",
   with their file path). They are never merged into the canonical record.
   They are never substituted for a missing one either: `readWeekPlan` and
   `getWeekSummary` return only canonical data.
3. **A file that may hold another week's record is never overwritten.** The
   file can be a canonical path that is also another week's legacy location
   (`2024/week-1*.json`, `2025/week-1*.json`; see
   `getWeeksSharingLocation`), or it can exist but fail to read. In both cases
   `writeWeekPlan` and `saveWeekSummary` refuse to write and return `false`, and
   the Plan page turns editing off for that week. These weeks are in the past,
   so the Plan page could not edit them anyway.
4. **Editing a week in `conflict` writes only its canonical file.** For
   example, 2026-W01 writes `2026/week-1.json`; the legacy file stays
   byte-for-byte unchanged.
5. **Combining split records needs an explicit action.** Any merge or
   migration of a legacy record must be a separate, explicit, user-confirmed
   step, which is not implemented in this phase.

### Known one-time effect when upgrading

West of UTC, if the last session before upgrading was saved under the next
day's key, then on that next day the app opens that file and shows the day as
already complete. This is the same file the old code would have shown that
morning. No data is lost; that day's new ritual can't be recorded until
midnight. Resolving it needs a storage-level change (e.g. writing to a new path
or recording a timestamp), which is left to the storage phase.
