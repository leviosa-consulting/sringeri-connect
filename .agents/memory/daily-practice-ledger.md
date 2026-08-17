---
name: Daily practice & Dharma Points
description: Why Dharma Points is an append-only ledger, and the rules that keep daily grading honest.
---

Dharma Points are stored as an append-only ledger keyed on devotee + source type + source date
with a unique index, never as a mutable counter on the devotee. The daily response tables are
likewise unique on devotee + date, and the response row and the ledger row are written in the
same transaction.

**Why:** points are awarded from a drawer devotees open on flaky mobile connections and often
retap. A counter plus an "already awarded?" read makes double-awards a race; the unique index
makes them structurally impossible, and a second submission simply returns null so the route can
answer 409.

**How to apply:** any new points-earning surface must add its own source type and follow the same
shape — insert response with onConflictDoNothing inside a transaction, insert the ledger row only
when points > 0, and let the conflict (not an application check) decide whether an award happens.

Two rules that fall out of it, and must be preserved:
- Grading is server-side, and correct answers/explanations are withheld from the payload until the
  devotee has submitted.
- Scheduled question and activity content is frozen once any devotee has responded (admin edits are
  refused with 409). Editing in place would move the answer key underneath answers already graded,
  and the response row cannot tell which revision it was graded against.

The daily practice is deliberately separate from the older quiz streak/badge system; they share no
tables and should not be merged without a decision to do so.

**Daily Practice streak definition:** a day only counts if the devotee completed ALL THREE surfaces
that day (Guruvani reflection + Question of the Day + Activity of the Day) — reuse the existing
`computeStreak(sortedDatesDesc)` helper in `server/routes.ts` for this too rather than duplicating
streak math; it already dedupes/sorts and requires the most recent date to be today or yesterday to
count as live. Feed it dates from an inner-join across the three response tables on
devotee+contentDate (one date per row only when all three exist that day), not from any single
table's own dates.
