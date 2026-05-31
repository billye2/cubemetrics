# Spine — Phase 5: AI nudges over `today()` (build-ready spec)

Companion to [../spine.md](../spine.md) (Layer 5) and Phases [1](spine-phase1.md)–[4](spine-phase4.md).
The **delight layer**: one short, specific, AI-written line over the aggregated day — shown in the
`/today` header (Phase 3) and at the top of the digest email (Phase 4). It's what makes a glance or a
notification feel alive instead of mechanical.

**Depends on:** Phase 3 (`/today`, `getToday`, `ensureXp`). Phase 4 optional (digest placement).
**DoD:** `/today` shows a contextual one-liner that reflects the real day ("Day 6 — 3 tasks need
attention"); it loads **without blocking** the page; if the model is disabled/down it falls back to a
deterministic templated line (or nothing when there's truly nothing to say); calls are **cached** to
≈1 per material change per day; `npm test` + `npm run build` green.

> **The three rules this layer obeys:** **(1) Additive** — never blocks a surface; a model failure
> degrades to a templated line, never an error. **(2) Earned** — when the day has nothing notable,
> the line is **empty** (same trust rule as Phase 4 — no manufactured "you're doing great!"). **(3)
> Cheap** — cached by a hash of the day's state so the model runs ~once per real change.

---

## 0. Ground truth (verified 2026-05-31)

- **No `ai`/`zod` dep, no existing AI usage.** Phase 5 adds `ai` (AI SDK v6) + `zod`. Next 16 / React 19.
- **AI Gateway** is the platform default: call the AI SDK with a plain **`"anthropic/claude-haiku-4-5"`**
  model string — **not** `@ai-sdk/anthropic`. Auth via `AI_GATEWAY_API_KEY` (or Vercel OIDC in prod).
  Haiku because the task is tiny and must be cheap/fast. Gateway is zero-data-retention.
- **Reuse:** `getToday(ctx, appIds)` + `ensureXp` (already computed by Phase 3/4); `getApp(appId)` for
  names; the finalized `SpineToday.severity`/`progress`; `pickMode` from Phase 3.
- **Render sites:** Phase 3 `TodayHeader` (under the greeting) and Phase 4 `buildDigest` (top of email).

---

## 1. Architecture

```
day state (today[] + xp + mode)
   → buildNudgeInput()         compact, model-safe summary (pure)
   → if !notable → ""           (earned: nothing to say)
   → hashInput()                stable hash of the input (pure)
   → ai_nudges cache lookup (user, day)
        hit & same hash → return cached line            (no model call)
        else → aiEnabled() ? generateLine() : fallbackLine()   (timeout → fallbackLine)
             → upsert cache → return line
```
- **`/today`**: rendered progressively — the page ships immediately; a small client component fetches
  the line after mount (never blocks RSC render).
- **Digest (Phase 4)**: generated **inline** in the cron (latency-insensitive) with a timeout +
  fallback, placed at the top of the email.

---

## 2. Data model — one tiny cache table

`src/supabase/migrations/<stamp>_ai_nudges.sql`:

```sql
-- One cached insight per user per local day. input_hash guards staleness: when the day's
-- state changes materially, the hash changes and the line is regenerated.
create table if not exists public.ai_nudges (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  input_hash text not null,
  line       text not null,            -- may be '' (earned-empty); cached too, to avoid re-asking
  model      text,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.ai_nudges enable row level security;
drop policy if exists "own ai_nudges" on public.ai_nudges;
create policy "own ai_nudges" on public.ai_nudges for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Cron writes via service role (RLS bypass); /today read+write via the user's session client.
```

---

## 3. Pure core — `src/lib/ai/nudge-input.ts` (the test surface)

```ts
export type Mode = "morning" | "day" | "evening";

export interface NudgeInput {
  mode: Mode;
  streak: number;
  streakAtRisk: boolean;          // streak>=3 && todayPoints===0 (reuse Phase 4 predicate)
  todayPoints: number;
  quests: { done: number; total: number };
  attention: number;              // # cards severity overdue|due
  doneToday: number;              // # cards severity done
  apps: { name: string; severity: string; count: number; summary: string;
          progress?: { current: number; target: number; unit?: string } }[];
  notable: boolean;               // streak>0 || attention>0 || doneToday>0 || quests.done>0
}

export function buildNudgeInput(today: SpineToday[], xp: XpSummary | null, mode: Mode): NudgeInput;
export function hashInput(input: NudgeInput): string;     // stable JSON → short djb2/base64 hash
export function fallbackLine(input: NudgeInput): string;  // deterministic templated line (below)
```

**`fallbackLine` (deterministic, on-brand, used when AI off/unavailable):**
- `streakAtRisk` → `🔥 Keep your ${streak}-day streak alive — log one thing.`
- else `attention > 0` → `${attention} thing${s} need attention today.`
- else evening & `doneToday > 0` → `Nice — ${doneToday} done today.`
- else `streak > 0` → `Day ${streak} of your streak.`
- else → `""` (nothing notable → empty, per the earned rule).

`buildNudgeInput.notable === false` short-circuits to `""` **before** any model/cache work.

---

## 4. The generator — `src/lib/ai/nudge.ts` (server-only)

```ts
import "server-only";
import { generateObject } from "ai";
import { z } from "zod";

const MODEL = "anthropic/claude-haiku-4-5";   // via AI Gateway
const TIMEOUT_MS = 2500;

export async function getNudge(ctx: SpineCtx, today: SpineToday[], xp: XpSummary | null,
                               mode: Mode): Promise<string> {
  const input = buildNudgeInput(today, xp, mode);
  if (!input.notable) return "";                       // earned: nothing to say

  const hash = hashInput(input);
  const { data: cached } = await ctx.supabase
    .from("ai_nudges").select("line, input_hash").eq("user_id", ctx.userId).eq("day", todayKey(ctx.tz, ctx.now))
    .maybeSingle();
  if (cached && cached.input_hash === hash) return cached.line;   // cache hit → no model call

  let line: string;
  if (!aiEnabled(ctx.userId)) {
    line = fallbackLine(input);
  } else {
    try {
      const { object } = await generateObject({
        model: MODEL,
        schema: z.object({ line: z.string().max(120) }),
        system: NUDGE_SYSTEM,                            // §below
        prompt: JSON.stringify(input),
        maxOutputTokens: 60,
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      });
      line = object.line.trim();
    } catch {
      line = fallbackLine(input);                        // additive: never throw to the surface
    }
  }
  await ctx.supabase.from("ai_nudges").upsert(
    { user_id: ctx.userId, day: todayKey(ctx.tz, ctx.now), input_hash: hash, line, model: MODEL },
    { onConflict: "user_id,day" },
  );
  return line;
}
```

**`NUDGE_SYSTEM` prompt (constraints, not vibes):**
> "You write ONE short line (≤120 chars) for a personal productivity dashboard, given a JSON summary
> of the user's day. Be specific and reference real numbers (streak, counts, progress). Warm and
> encouraging, never scolding. At most one emoji. No greeting, no sign-off, no quotes. **If nothing in
> the data is genuinely worth remarking on, return an empty string.**"

`aiEnabled(userId)` = `process.env.AI_NUDGES_ENABLED` truthy **and** `AI_GATEWAY_API_KEY` present
**and** the user hasn't opted out (`notification_prefs.ai_insights_enabled`, treated `true` if no row /
table absent). A global kill switch + a per-user opt-out.

---

## 5. Render

### `/today` — progressive, non-blocking
- `src/components/modern/today/TodayInsight.tsx` (`"use client"`): on mount calls a server action,
  shows a 1-line skeleton, then fades in the line; renders **nothing** if the line is `""`.
- `src/lib/ai/actions.ts` (`"use server"`) `fetchTodayNudge()`: rebuilds ctx server-side (trusted —
  does **not** accept client-supplied day data), recomputes `getToday` + `ensureXp` (cheap; the model
  call is what's cached), and returns `getNudge(ctx, today, xp, mode)`.
- Mounted in `TodayHeader` under the greeting. The minor double fan-out (page + action both call
  `getToday`) is acceptable; optimize later by passing a server-signed input token if it matters.

### Digest (Phase 4) — inline
In `buildDigest`/the cron, after computing `today`+`xp`: `const line = await getNudge(ctx, today, xp,
mode)`; if non-empty, render it as the email's lead sentence. Additive edit to Phase 4's `digest.ts` —
the digest works unchanged if Phase 5 isn't built.

---

## 6. Privacy & controls
- The compact day summary (no raw row contents beyond app names + numbers + your own `summary`
  strings) is sent to the **AI Gateway** (zero-data-retention) → model. Document this in the settings
  copy.
- **Per-user opt-out:** `ai_insights_enabled boolean default true` on `notification_prefs` (Phase 4)
  with a toggle on `/app/notifications`; absent table/row ⇒ treated enabled. (Soft dep on Phase 4 —
  Phase 5 functions without it via the default.)
- **Global kill switch:** `AI_NUDGES_ENABLED` env; off ⇒ everyone gets `fallbackLine` (still useful).
- **`buildNudgeInput` deliberately omits free-text bodies** (journal/notes content) — only structural
  signal leaves the system.

## 7. Security
- `nudge.ts` and `fetchTodayNudge` are server-only; `AI_GATEWAY_API_KEY` is server env, never client.
- `fetchTodayNudge` recomputes the day server-side from the session — it **never** trusts client input
  for the prompt (prevents using your gateway to summarize arbitrary attacker text).
- Output is length-capped by schema (`≤120`). `/today` renders it through React (auto-escaped); the
  **Phase-4 digest email is hand-built HTML, so the line MUST be HTML-escaped there** (see Phase 4 §10)
  — model output is untrusted text and must never be interpolated raw into the email markup.

## 8. Env additions (document in `.env.example` at build time)
```
AI_GATEWAY_API_KEY=     # Vercel AI Gateway (or rely on Vercel OIDC in prod)
AI_NUDGES_ENABLED=true  # global kill switch for the AI insight line
```

## 9. Tests — `tests/unit/spine-nudge.test.ts`
Pure logic only (the model call is mocked/integration):
- `buildNudgeInput`: `notable` false when streak 0 + nothing actionable + nothing done; counts
  attention vs done correctly; `streakAtRisk` mirrors Phase 4.
- `hashInput`: stable across re-serialization; **changes** when any material field changes (e.g.
  attention 2→3); same input → same hash.
- `fallbackLine`: each branch (streak-risk, attention, evening-done, streak, empty).
- `getNudge` cache path (mock supabase + mock `generateObject`): same hash → returns cached line and
  **does not call the model**; changed hash → calls generator; generator throws → returns
  `fallbackLine` and still upserts.
- `aiEnabled`: false when env off OR key missing OR user opted out.

## 10. File manifest
**New:**
```
src/supabase/migrations/<stamp>_ai_nudges.sql
src/lib/ai/{nudge-input,nudge,actions}.ts
src/components/modern/today/TodayInsight.tsx
tests/unit/spine-nudge.test.ts
```
**Edited:**
```
package.json                                   (+ ai, zod)
src/components/modern/today/TodayHeader (Phase 3)   (+ <TodayInsight/>)
src/lib/notify/digest.ts (Phase 4)              (+ lead line from getNudge — additive)
src/lib/modern/.../notification_prefs            (+ ai_insights_enabled column — in Phase 4 migration or a tiny alter)
.env.example                                    (§8 vars)
docs/database.md                                (ai_nudges delta, at integration)
```

## 11. Risks & open decisions
- **Is it worth a model dep at all?** The `fallbackLine` already gives a decent templated insight with
  zero AI. Phase 5's marginal value is *variety/specificity*. Reasonable to **ship `fallbackLine` first**
  (no `ai`/`zod` dep) and add the model later behind `AI_NUDGES_ENABLED` — the architecture supports
  exactly that. *Recommend: build the pure core + fallback now; wire the model when you want the polish.*
- **Cost ceiling** — cache makes it ~1 Haiku call/user/material-change/day. Add a hard daily per-user
  cap if you want a guaranteed bound.
- **Tone drift / off output** — the schema caps length; consider a tiny denylist (no medical/financial
  advice) if the data ever invites it. Low risk for encouragement copy.
- **Double fan-out on `/today`** — acceptable now; revisit with a signed-input token if profiling flags it.

## 12. Hand-off
Plan-only (spec-writer role). With this, the spine is **fully specced end-to-end**:
substrate → capture → anchor → proactive → delight. Phase 5 is the most optional of the five (its
`fallbackLine` path needs no AI at all), so it's the natural last build — or the first one you cut if
scope tightens.
