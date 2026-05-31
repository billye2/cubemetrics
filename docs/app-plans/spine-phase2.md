# Spine — Phase 2: Universal Quick Capture (build-ready spec)

> ✅ **BUILT + SHIPPED (2026-05-31, PR #106, `master`).** `<QuickCapture>` in `Shell`,
> `capture`/`captureTo`/`undoCapture` actions, `classify`/`loggableApps`, allowlisted undo. 549 tests.

Companion to [../spine.md](../spine.md) (Layer 2) and [spine-phase1.md](spine-phase1.md). Phase 1
shipped the substrate — adapters with `quickLog()`/`match()` and the registry. **Phase 2 is the
surface**: one capture bar in the header, on every page, that turns free text into a row in the right
app. It kills the top-of-funnel tax — "which of 86 apps do I open to log this?"

**Depends on:** Phase 1 merged (registry + the 4 loggable proof adapters: todo, habits, water, journal).
**Definition of done:** from any page, typing `w 2` / `todo call mom` / `journal …` / `run` (a habit
name) logs to the correct app with a confirmation + **Undo**; ambiguous input shows a one-tap picker;
`npm test` + `npm run build` green.

---

## 0. Ground truth (verified 2026-05-31)

- **`Shell`** (`src/components/modern/Shell.tsx`) wraps the home grid (`src/app/page.tsx`) **and** every
  `/app/<id>` page. Its header already renders `<HeaderFeedback />` + a `right` slot. → Mounting
  `<QuickCapture />` in that header puts capture on **every logged-in page** with a one-line edit.
- **`HeaderFeedback`** (`src/components/modern/HeaderFeedback.tsx`) is the pattern to mirror: a
  `"use client"` header button → `createPortal` modal that's a **bottom-sheet on mobile**
  (`items-end … sm:items-center`), `useTransition` for the pending state, server action on submit.
  Reuse its classes/structure verbatim for visual + phone-first consistency.
- **Phase 1 primitives reused:** `getSpineCtx()`, `route()`, each loggable adapter's `quickLog()` +
  `match()`, and `bump_app_usage` (capture counts as usage).

---

## 1. Contract additions (small, additive)

Phase 1 isn't built yet, so fold these into its contract (`src/lib/spine/types.ts`) at build time:

```ts
export interface QuickLogResult {
  ok: boolean;
  appId: string;
  message: string;                       // human-confirmable: "Logged 2 glasses"
  href?: string;
  undo?: { table: string; id: number };  // NEW — the inserted row, so capture can offer Undo
}

// Allowlist of tables a capture may undo. undoCapture() rejects anything not here — a client
// round-trips the token, so we must NOT trust an arbitrary table name (see §7 Security).
export const CAPTURE_TABLES = ["todos", "habit_checkins", "daily_trackers", "journal_entries"] as const;
```

Each **loggable** Phase-1 adapter populates `undo` from its insert (e.g. todo:
`insert(...).select("id").single()` → `undo: { table: "todos", id }`). Read-only adapters
(budget/bills) are unaffected.

### Registry additions — `src/lib/spine/registry.ts`

```ts
import { getApp } from "@/lib/modern/catalog";
import { rankCandidates } from "./lib";   // pure, testable (§8)

/** Loggable apps (have quickLog), with display name+icon from the catalog — powers the picker. */
export function loggableApps(): { appId: string; name: string; icon: string }[] {
  return ADAPTERS.filter((a) => a.quickLog && a.match).map((a) => ({
    appId: a.appId,
    name: getApp(a.appId)?.name ?? a.appId,
    icon: getApp(a.appId)?.icon ?? "•",
  }));
}

/** Ranked capture candidates for an input — pure ranking over each adapter's match(). */
export function classify(input: string): { appId: string; score: number }[] {
  return rankCandidates(input, ADAPTERS.filter((a) => a.quickLog && a.match)
    .map((a) => ({ appId: a.appId, match: a.match! })));
}
```

`route()` (Phase 1) is refactored to call `classify()` then execute the top adapter's `quickLog` —
so ranking lives in one pure place.

---

## 2. Server actions — `src/lib/spine/capture.ts`

```ts
"use server";
import { revalidatePath } from "next/cache";
import { getSpineCtx } from "./ctx";
import { ADAPTERS } from "./_generated";
import { classify, loggableApps } from "./registry";
import { CAPTURE_TABLES, type QuickLogResult } from "./types";

export interface CaptureResponse {
  result: QuickLogResult | null;                 // null when nothing matched confidently
  candidates: { appId: string; name: string; icon: string }[];  // for the "send elsewhere" / disambiguation picker
}

const CONFIDENT = 0.5;   // below this, don't auto-route — ask the user

/** Auto-route free text to the best loggable app. */
export async function capture(input: string): Promise<CaptureResponse> {
  const text = input.trim();
  if (!text) return { result: null, candidates: loggableApps() };
  const ctx = await getSpineCtx();
  if (!ctx) return { result: null, candidates: [] };

  const ranked = classify(text);
  const top = ranked[0];
  if (!top || top.score < CONFIDENT) {
    return { result: null, candidates: loggableApps() };   // ambiguous → picker
  }
  return runQuickLog(ctx, top.appId, text);
}

/** Force-route to a user-picked app (bypasses match). */
export async function captureTo(appId: string, input: string): Promise<CaptureResponse> {
  const ctx = await getSpineCtx();
  if (!ctx) return { result: null, candidates: [] };
  return runQuickLog(ctx, appId, input.trim());
}

async function runQuickLog(ctx, appId, text): Promise<CaptureResponse> {
  const adapter = ADAPTERS.find((a) => a.appId === appId && a.quickLog);
  if (!adapter) return { result: null, candidates: loggableApps() };
  const result = await adapter.quickLog!(ctx, text);
  if (result.ok) {
    await ctx.supabase.rpc("bump_app_usage", { p_app: appId });   // capture = usage
    revalidatePath(`/app/${appId}`);                              // target app refreshes
    revalidatePath("/today");                                     // future anchor surface (Phase 3)
  }
  return { result, candidates: loggableApps() };
}

/** Reverse the last capture. Token comes from QuickLogResult.undo and round-trips via the client,
 *  so the table is validated against the allowlist and the delete is user-scoped. */
export async function undoCapture(token: { table: string; id: number }): Promise<{ ok: boolean }> {
  const ctx = await getSpineCtx();
  if (!ctx) return { ok: false };
  if (!CAPTURE_TABLES.includes(token.table as any)) return { ok: false };   // hard allowlist
  await ctx.supabase.from(token.table).delete().eq("id", token.id).eq("user_id", ctx.userId);
  revalidatePath("/today");
  return { ok: true };
}
```

---

## 3. UI — `src/components/modern/QuickCapture.tsx` (`"use client"`)

Mirror `HeaderFeedback`'s structure (button + `createPortal` bottom-sheet). **Always visible** (unlike
HeaderFeedback it does *not* hide off `/app/*` — capture is global).

**Header button:** a `＋`/`⌘K` affordance next to Feedback (same button classes). `title="Quick capture"`.

**Open triggers:**
- Click the button.
- Global keyboard: `mod+k` (cmd/ctrl-K) anywhere, and bare `/` when no input/textarea is focused.
  Attach a `keydown` listener in a `useEffect`; `preventDefault` on match.

**Sheet contents:**
1. A single text `input` (autofocus), placeholder cycling examples: `"water 2"`, `"todo call mom"`,
   `"journal …"`, `"run"  (a habit)`.
2. On **Enter** → `useTransition` → `capture(text)`:
   - `result.ok` → **success state**: `✓ {result.message}` + **[Undo]** + **[Send elsewhere]**;
     auto-close after ~1.5s (cancel timer if the user hovers/focuses the actions). `router.refresh()`.
   - `result == null` (ambiguous/empty) → **picker state**: render `candidates` as tappable chips
     (`{icon} {name}`); tapping a chip → `captureTo(appId, text)`.
   - `result.ok === false` (e.g. habit name not found) → **inline error**: show `result.message`,
     keep the text, offer the picker chips as a fallback.
3. **[Undo]** → `undoCapture(result.undo!)` → toast "Undone", `router.refresh()`. (Hidden if no
   `undo` token, e.g. a future read-only capture.)
4. **[Send elsewhere]** → reveal the picker chips; tap → `captureTo`.

Phone-first: bottom-sheet, 44px+ targets, `text-base` input (no iOS zoom), respects safe-area
(inherits from the portal overlay pattern). Close on backdrop tap / `Esc` (not while pending).

### Mount — `Shell.tsx` (one line)

```tsx
// in the header's right-hand cluster, before <HeaderFeedback />
<QuickCapture />
<HeaderFeedback />
{right}
```

`Shell` is a server component; `<QuickCapture>` is a client component — fine (RSC can render client
children). No other page edits: home + all `/app/*` get it via `Shell`.

---

## 4. UX flows (summary)

| Input | Outcome |
|-------|---------|
| `w 2` / `water 2` | → Water, "Logged 2 glasses", Undo |
| `todo call mom` / `t call mom` | → Todo, "Added todo", Undo |
| `journal had a good day` / `j …` | → Journal, "Saved entry", Undo |
| `run` (matches a habit name) | → Habits, "Checked in: Run", Undo |
| `meditate` (no habit by that name) | Habits returns `ok:false` → inline "No habit matches…" + picker |
| `bought milk` (no confident match) | Picker: tap Todo / Journal / Water / Habits |
| empty | no-op |

---

## 5. Security (the one thing to get right)

`undoCapture` receives `{table, id}` that **round-trips through the client**, so it's untrusted.
Two guards, both required: **(1)** `table ∈ CAPTURE_TABLES` (hard allowlist — rejects `profiles`,
`user_feedback`, etc.); **(2)** the delete is `.eq("user_id", ctx.userId)` and RLS double-enforces.
Never interpolate the table name anywhere but the `from()` call with an allowlisted value. No
secrets, no service-role — the user's own session client only.

---

## 6. Tests — `tests/unit/spine-capture.test.ts`

Ranking + guards are pure → unit-testable without a DB:
- `rankCandidates`: `"w 2"`→water top, `"todo x"`→todo top, `"run"`→habits/ todo-fallback ordering,
  `"xyz"`→ only the 0.2 todo fallback, empty→[].
- `CONFIDENT` gate: a sub-0.5 top score returns `result:null` (picker), not an auto-route.
- `undoCapture` allowlist: `{table:"profiles"}`→ `{ok:false}` and **no delete issued**;
  `{table:"todos"}`→ proceeds (assert the query builder was called with `todos`, `id`, `user_id`).
- `loggableApps()`: returns exactly the 4 loggable proof apps with catalog name+icon.

(Adapter `quickLog` round-trips were covered structurally in Phase 1; Phase 2 tests the routing
brain + the undo guard.)

---

## 7. File manifest

**New:**
```
src/lib/spine/capture.ts                 (server actions)
src/components/modern/QuickCapture.tsx    ("use client")
tests/unit/spine-capture.test.ts
```
**Edited:**
```
src/lib/spine/types.ts        (+ QuickLogResult.undo, CAPTURE_TABLES)
src/lib/spine/registry.ts     (+ classify, loggableApps; route() uses classify)
src/lib/spine/lib.ts          (+ rankCandidates pure helper)
src/lib/spine/adapters/{todo,habits,water,journal}.ts   (quickLog returns `undo`)
src/components/modern/Shell.tsx   (+ <QuickCapture/> — one line)
```

Mostly additive; the only shared-file edit is `Shell.tsx` (one line). If built as a parallel-build
lane, it owns `src/lib/spine/*` + the capture component; sequence the `Shell.tsx` line last.

---

## 8. Phase 2b — deferred enhancements (spec'd, not in v1)

- **AI natural-language parse (AI Gateway).** When the top structured score `< CONFIDENT`, fall back
  to a cheap Haiku pass (`generateObject` over the AI Gateway, `"anthropic/claude-haiku-4-5"`) that
  maps free text → `{ appId, normalizedInput }`, then run the normal `runQuickLog`. Strictly
  additive: the structured path always works without AI; the model only rescues the ambiguous tail.
  Cache nothing (inputs are unique); cap latency with a timeout → fall back to the picker on miss.
- **Live prefix preview.** A client-safe `CAPTURE_HINTS` (prefix→appId), emitted by the
  `build-spine-registry` generator from each adapter's declared `prefixes`, lets the bar show
  "→ Water" *as you type* a recognized prefix — no server round-trip. Deferred to avoid coupling the
  client to server-only adapters before it's worth it.

---

## 9. Risks & open decisions

- **`CONFIDENT` threshold (0.5)** — too high = always shows the picker (friction); too low =
  mis-routes. Tune against the real `match()` weights from Phase 1; the bare-text todo fallback is
  `0.2`, so 0.5 cleanly separates "prefixed/intentful" from "guess." Revisit once 2b/AI exists.
- **Undo window** — v1 offers Undo only in the open sheet (until it closes). A persistent toast/undo
  across navigation is a nice-to-have, not v1.
- **Multi-app captures** ("ate eggs $4" → both food log + expense) — explicitly out of scope; one
  capture → one app in v1.
- **Habit fuzzy-match collisions** (two habits starting "r") — `fuzzyFind` returns best; if tie/low
  confidence, surface `ok:false` + picker rather than guessing wrong.

## 10. Hand-off

Plan-only (spec-writer role). Build after Phase 1 lands. Net effect: from anywhere in XP Boost you can
log to any of the (initially 4, then all) loggable apps without navigating — the input spine that
feeds every downstream surface (Phase 3 dashboard, Phase 4 digest).
