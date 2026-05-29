# Focus — description header (feedback #4)

**Source:** user feedback on the `focus` app, status `new` —
> "provide a description header like the time tracker app"

**Status:** Spec ready for build. **Priority:** P1 (tiny, additive, zero risk).

## What's being asked

Time Tracker opens with a short **description header** — an in-body intro card that tells the
user what the app is for (and points them to the sibling app). Focus has no equivalent: it jumps
straight into the stats strip and timer, so a first-time user gets no one-line "what is this / how
is it different from Time Tracker" framing. Add that header to Focus, mirroring Time Tracker's.

Note this is the *in-body* intro card, **not** the `Shell` title bar. The `Shell` header
(`title="Focus"`) already exists and is not what the feedback is about — see the reference below.

## The reference (what to mirror)

`src/app/app/timetracker/TimeTrackerView.tsx`:

- The view renders `<Intro />` as the first child of its root `<div>` (line 66).
- `Intro` (lines 75–84) is a self-contained presentational component:

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

Key details to preserve so the two apps look like siblings:
- Same wrapper classes verbatim: `mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-400`.
- A bolded lead phrase in `text-zinc-300` (`font-semibold`), then an em-dash, then the explanation.
- A `text-cyan-400 font-semibold` cross-reference to the *other* app (Time Tracker's Intro points
  at Focus; Focus's Intro should point back at Time Tracker — this reciprocity is the point of the
  feedback and how the two apps explain their distinction).

## The change

**File:** `src/app/app/focus/FocusView.tsx` (one file; no schema, no server action, no catalog change).

1. **Add an `Intro` component** alongside the other module-level components (e.g. just below the
   `FocusView` export, mirroring where Time Tracker defines its `Intro`). Suggested copy:

   ```tsx
   function Intro() {
     return (
       <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-400">
         <span className="font-semibold text-zinc-300">Focus on one thing at a time</span>{" "}
         — set an intent, run the timer, and park distractions instead of chasing them. Use{" "}
         <span className="font-semibold text-cyan-400">Time Tracker</span> when you just want
         to log where your time already went.
       </div>
     );
   }
   ```

   Copy is a suggestion — keep it one or two short sentences, lead-phrase + em-dash + explanation,
   and keep the reciprocal "Use Time Tracker when…" clause so it mirrors Time Tracker's "Use Focus
   when…". Builder may tighten wording; the structure and classes are the contract.

2. **Render it first** inside `FocusView`'s returned tree, immediately above `<Stats … />`
   (`FocusView.tsx:62–85`). The current return opens:

   ```tsx
   return (
     <div>
       <Stats entries={entries} />
   ```

   becomes:

   ```tsx
   return (
     <div>
       <Intro />
       <Stats entries={entries} />
   ```

   Place it inside the post-hydration return (after the `if (!hydrated)` skeleton guard on
   `FocusView.tsx:58–60`), so the header appears with the real content, not over the loading
   skeleton — matching Time Tracker, which has no skeleton and renders Intro at the top.

## Acceptance criteria

- [ ] Focus shows a description card at the top of the page body, styled identically to Time
      Tracker's (same wrapper classes, bold lead phrase, cyan cross-link).
- [ ] The card explains what Focus is for in one/two sentences and cross-references **Time Tracker**
      (reciprocal to Time Tracker's existing reference to Focus).
- [ ] No layout regression: the card sits above the stats strip, respects the `mb-4` spacing, and
      does not appear over the `!hydrated` loading skeleton.
- [ ] No DB, server-action, or catalog changes — `FocusView.tsx` is the only file touched.

## Out of scope

The broader Focus build-out (feedback #1 / issue #6 — pause/resume, completion cues, daily goal,
project tags) is tracked separately in [`focus.md`](focus.md). This spec is **only** the
description header so it can ship on its own.
