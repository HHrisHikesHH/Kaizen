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
2. **Week files** used the calendar year with the ISO week number. This
   only differs from the ISO year in the few days around New Year, when the
   calendar year and the ISO year differ. The app's history (since September
   2024) has two such windows:
   - Dec 30–31 2024 (ISO 2025-W01) was saved as `2024/week-1*.json`.
   - Dec 29–31 2025 (ISO 2026-W01) was saved as `2025/week-1*.json`.

   No historical Sunday session falls in such a window, so Sunday state and
   weekly AI note files are unaffected.

What we do about it:

- **Nothing is moved, renamed, rewritten or deleted.** Every existing file stays
  readable at the path it was saved to: daily entries by their file's date (in
  Habits, Growth and weekly aggregation), and week files by navigating Plan to
  the week their name encodes.
- **No fallback lookups.** The app does not try a neighbouring day's or year's
  file when one is missing. A fallback would show one entry on two different
  days, and an edit could then write a day's data into the wrong file.
  Each file maps to exactly one day or week.
- The stored entry contains no timestamp, so a misfiled day can't be
  identified safely. Re-keying old data is deliberately not attempted.

### Known one-time effect when upgrading

West of UTC, if the last session before upgrading was saved under the next
day's key, then on that next day the app opens that file and shows the day as
already complete. This is the same file the old code would have shown that
morning. No data is lost; that day's new ritual can't be recorded until
midnight. Resolving it needs a storage-level change (e.g. writing to a new path
or recording a timestamp), which is left to the storage phase.
