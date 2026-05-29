# Countdown — description header (feedback #5)

**Source:** user feedback on the `countdown` app, status `new` —
> "show me a description similar to time tracker"

**Status:** Spec ready for build. **Priority:** P1 (tiny, additive, zero risk).

**Sibling spec:** [`focus-description-header.md`](focus-description-header.md) — same change, different
app. This is the second of the same request; if both are built together, keep the two `Intro`
components consistent in style.

## What's being asked

Time Tracker opens with an in-body **description header** — a small rounded card that says what the
app is for (`src/app/app/timetracker/TimeTrackerView.tsx:75–84`). Countdown has no equivalent: its
`CountdownsView` opens directly with the "Add a countdown" form, so a first-time user gets no
one-line framing of what the app does. Add the same styled intro card to Countdown.

This is the *in-body* intro card, **not** the `Shell` title bar (`title="Countdown"` already exists
in `page.tsx` and is not what the feedback is about).

## The reference (what to mirror)

`src/app/app/timetracker/TimeTrackerView.tsx`, `Intro` (lines 75–84):

```tsx
function Intro() {
  return (
    <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-400">
      <span className="font-semibold text-zinc-300">Log where your time went</span>{" "}
      — bucket each chunk of your day by category. Use{" "}
      <span className="font-semibold text-cyan-400">Focus</span> when you want a
      timer to keep you on one thing.
    </div>
  );
}
```

Preserve so it looks like a sibling of the other apps' headers:
- Same wrapper classes verbatim: `mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-400`.
- Bolded lead phrase in `text-zinc-300` (`font-semibold`), then an em-dash, then the explanation.

Unlike the Focus↔Time Tracker pair, Countdown has no natural sibling app to cross-reference, so the
`text-cyan-400` cross-link is **optional** here — the card can simply describe Countdown. (If a
cross-link reads naturally, fine; don't force one.)

## The change

**File:** `src/app/app/countdown/CountdownsView.tsx` (one file; no schema, no server action, no
catalog change).

1. **Add an `Intro` component** at module level, alongside the other components (e.g. near
   `Section` / `AddForm`), mirroring Time Tracker's. Suggested copy:

   ```tsx
   function Intro() {
     return (
       <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-400">
         <span className="font-semibold text-zinc-300">Count down to what's coming</span>{" "}
         — track the months, weeks, days, and minutes until birthdays, appointments,
         trips, or deadlines. Mark one as yearly and it rolls over automatically.
       </div>
     );
   }
   ```

   Copy is a suggestion — one or two short sentences, lead-phrase + em-dash + explanation. The
   structure and wrapper classes are the contract; wording can be tightened.

2. **Render it first** inside `CountdownsView`'s returned tree, immediately above `<AddForm … />`
   (`CountdownsView.tsx:56–58`). The current return opens:

   ```tsx
   return (
     <div>
       <AddForm recentCategories={recentCategories} />
   ```

   becomes:

   ```tsx
   return (
     <div>
       <Intro />
       <AddForm recentCategories={recentCategories} />
   ```

   Countdown has no hydration/skeleton guard (the `now` clock ticks via `useEffect`), so the card
   simply renders at the top — no special placement needed beyond being the first child.

## Acceptance criteria

- [ ] Countdown shows a description card at the top of the page body, styled identically to Time
      Tracker's (same wrapper classes, bold lead phrase).
- [ ] The card explains what Countdown is for in one/two sentences.
- [ ] No layout regression: the card sits above the "Add a countdown" form with `mb-4` spacing.
- [ ] No DB, server-action, or catalog changes — `CountdownsView.tsx` is the only file touched.

## Out of scope

The earlier Countdown enhancement (feedback #3 / PR #9 — counting down to specific recurring events)
is separate and already wired. This spec is **only** the description header.
