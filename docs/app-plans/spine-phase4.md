# Spine — Phase 4: The Proactive Engine (build-ready spec)

Companion to [../spine.md](../spine.md) (Layer 4) and Phases [1](spine-phase1.md)–[3](spine-phase3.md).
This is **the phase that makes the product get used more** — the only one that reaches *out*. It
reuses the same `getToday()` / `ensureXp` data Phase 3 renders, but delivers it as an email digest +
streak-save nudge so the user comes back without having to remember to.

**Depends on:** Phases 1 + 3 (`getToday`, `ensureXp`, `/today`). Phase 2 helps but isn't required.
**DoD:** an opted-in user with something actionable receives a morning "your day" and/or evening
"close out" email at their local time, deep-linking `/today`; users with nothing actionable get
**nothing**; one-click unsubscribe works; the cron is idempotent (never double-sends); `npm test` +
`npm run build` green.

> **THE TRUST RULE (non-negotiable, from spine.md):** notifications must be **earned**. Hard-skip
> when there's nothing actionable — no "we miss you!" mail, ever. Email is **opt-in**. One bad,
> manufactured nudge trains a permanent mute and kills the channel forever. Every design choice below
> defends this.

---

## 0. Ground truth (verified 2026-05-31)

- **`createAdminSupabase()`** (`src/lib/supabase/admin.ts`) — service-role client, **bypasses RLS**.
  The cron has no user session, so it uses this to read each opted-in user's data. Legitimate here:
  the path is authorized by `CRON_SECRET` (§11), analogous to the existing admin-gated paths.
- **API routes** use App-Router `route.ts` under `src/app/api/` (see `api/auth/*`). → `api/cron/digest`,
  `api/notifications/unsubscribe`.
- **No email dep, no `vercel.json`/`vercel.ts`, no cron** today — Phase 4 adds all three.
- **Reuse:** `ensureXp(supabase, userId, now, tzOverride)` (idempotent — safe to call from cron; also
  refreshes their rollup); `getToday(ctx, appIds)`; `profiles.timezone`; `todayKey`/`localHour` from
  `src/lib/xp/tz.ts`; `app_usage` for app selection (same `chooseApps` as Phase 3).

---

## 1. Architecture — one tick, select the due, send the earned

```
Vercel Cron (every 30 min)
  → GET /api/cron/digest   (Authorization: Bearer CRON_SECRET)
      admin = createAdminSupabase()
      for each row in notification_prefs WHERE email_enabled:           // opt-in only
        tz, localTime ← profiles.timezone, now
        kinds ← isDue(prefs, localTime, alreadySentToday(user))         // pure: morning|evening|∅
        for kind in kinds:
          claim ← insert notification_log(user, kind, local_day) ON CONFLICT DO NOTHING
          if not claim: continue                                        // someone/last-tick already did it
          ctx ← buildSpineCtx(admin, user.id, tz, now)
          [today, xp] ← Promise.all(getToday(ctx, chooseApps(...)), ensureXp(admin, user.id, now, tz))
          if not shouldSend(kind, today, xp): delete the claim; continue // TRUST RULE: nothing earned → skip
          { subject, html, text } ← buildDigest(kind, today, xp, unsubUrl)
          sendEmail(...)                                                 // Resend
```

Every-30-min tick + per-user local-time selection is the standard way to hit users across timezones
(a single daily cron can't fire at everyone's local 8am). Idempotency comes from
`notification_log` (claim-before-send), not from the schedule.

---

## 2. Data model — one migration

`src/supabase/migrations/<stamp>_notifications.sql`:

```sql
-- Opt-in prefs. No row = no email (consent-first). RLS owner-only; cron reads via service role.
create table if not exists public.notification_prefs (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  email_enabled      boolean not null default false,
  morning_enabled    boolean not null default true,
  evening_enabled    boolean not null default true,
  morning_time       time    not null default '08:00',
  evening_time       time    not null default '20:00',
  streak_save_enabled boolean not null default true,
  created_at         timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists "own notification_prefs" on public.notification_prefs;
create policy "own notification_prefs" on public.notification_prefs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Send ledger: idempotency (claim-before-send) + audit. One send per (user, kind, local day).
create table if not exists public.notification_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,                    -- 'morning' | 'evening' | 'streak_save'
  local_day  date not null,                    -- user's local calendar day (todayKey)
  sent_at    timestamptz not null default now()
);
create unique index if not exists notification_log_once
  on public.notification_log (user_id, kind, local_day);
alter table public.notification_log enable row level security;
-- No user policy needed (service-role only writes/reads it); RLS on with no policy = users see nothing.
```

Fold the delta into `docs/database.md` at integration.

---

## 3. Scheduling — `vercel.ts` (modern config)

```ts
// vercel.ts
import type { VercelConfig } from "@vercel/config/v1";
export const config: VercelConfig = {
  crons: [{ path: "/api/cron/digest", schedule: "*/30 * * * *" }],  // every 30 min
};
```

**Plan caveat (decision):** sub-daily Vercel Cron requires **Pro**; Hobby allows daily only. If on
Hobby, either upgrade or run the tick via **Supabase `pg_cron` + `pg_net`** hitting the same route.
The route logic is host-agnostic — only the trigger differs.

---

## 4. The cron endpoint — `src/app/api/cron/digest/route.ts`

```ts
export const dynamic = "force-dynamic";
export const maxDuration = 300;   // Fluid Compute default ceiling; batch within it

export async function GET(req: Request) {
  // 1) AUTH — only the scheduler may run this.
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const now = new Date();
  const admin = createAdminSupabase();

  // 2) Opted-in users only.
  const { data: prefs } = await admin.from("notification_prefs").select("*").eq("email_enabled", true);
  let sent = 0, skipped = 0;

  for (const p of prefs ?? []) {
    const { data: prof } = await admin.from("profiles").select("timezone").eq("id", p.user_id).single();
    const tz = prof?.timezone ?? "UTC";
    const localDay = todayKey(tz, now);
    const already = await sentKindsToday(admin, p.user_id, localDay);    // Set<kind>
    const kinds = isDue(p, localHour(now, tz), localMinute(now, tz), already);  // pure (§6)

    for (const kind of kinds) {
      // 3) CLAIM the slot atomically — prevents double-send across overlapping ticks.
      const { data: claim } = await admin.from("notification_log")
        .insert({ user_id: p.user_id, kind, local_day: localDay })
        .select("id").maybeSingle();             // null ⇒ unique conflict ⇒ already handled
      if (!claim) continue;

      const ctx = buildSpineCtx(admin, p.user_id, tz, now);
      const [today, xp] = await Promise.all([
        getToday(ctx, chooseApps(await usageRows(admin, p.user_id), REGISTERED_APP_IDS, 8)).catch(() => []),
        ensureXp(admin, p.user_id, now, tz).catch(() => null),
      ]);

      // 4) TRUST GATE — release the claim and skip when nothing is earned.
      if (!shouldSend(kind, today, xp)) {
        await admin.from("notification_log").delete().eq("id", claim.id);
        skipped++; continue;
      }
      const unsub = unsubscribeUrl(p.user_id, kind);
      const mail = buildDigest(kind, today, xp, unsub, tz);
      await sendEmail({ to: await emailFor(admin, p.user_id), ...mail });
      sent++;
    }
  }
  return Response.json({ ok: true, sent, skipped });
}
```

`emailFor` reads the user's email from `auth.users` via the admin client
(`admin.auth.admin.getUserById`).

### Session-less ctx — `src/lib/spine/ctx.ts` (extends Phase 1)

```ts
export function buildSpineCtx(supabase: Supabase, userId: string, tz: string, now: Date): SpineCtx {
  return { supabase, userId, tz, now };
}
// getSpineCtx() (Phase 1) now wraps buildSpineCtx after resolving user+tz from the session.
```
Safe because every adapter filters `.eq("user_id", userId)` (Phase 1 rule) — RLS bypass never leaks
across users.

---

## 5. Notify policy — `src/lib/notify/policy.ts` (the trust gate)

`SpineToday` is state; **policy lives here**, never in an adapter.

```ts
export const STREAK_MIN = 3;

/** Earned-only. Returns false ⇒ send nothing. */
export function shouldSend(kind: Kind, today: SpineToday[], xp: XpSummary | null): boolean {
  const actionable = today.filter((t) => t.severity === "overdue" || t.severity === "due");
  if (kind === "streak_save") return streakAtRisk(xp);
  if (actionable.length > 0) return true;
  if (kind === "evening" && streakAtRisk(xp)) return true;   // evening doubles as streak-save in v1
  return false;                                              // morning with nothing actionable ⇒ skip
}

export function streakAtRisk(xp: XpSummary | null): boolean {
  return !!xp && xp.streak >= STREAK_MIN && xp.todayPoints === 0;
}
```

v1 **kinds = `morning` + `evening`** only. `streak_save` as its own late ping is **4b** — in v1 the
evening digest carries the streak-save line when `streakAtRisk`. Due-item nudges aren't a separate
channel: they're the "needs attention" (overdue/due) cards already in the digest.

---

## 6. Scheduling logic — `src/lib/notify/select.ts` (pure, tested)

```ts
export type Kind = "morning" | "evening" | "streak_save";
const WINDOW_MIN = 30;   // must be ≥ cron interval so no one is missed

/** Which digests are due *now* for this user and not yet sent today. */
export function isDue(prefs, localHour: number, localMinute: number, sentToday: Set<Kind>): Kind[] {
  const nowMin = localHour * 60 + localMinute;
  const due: Kind[] = [];
  if (prefs.morning_enabled && !sentToday.has("morning") && within(nowMin, prefs.morning_time, WINDOW_MIN)) due.push("morning");
  if (prefs.evening_enabled && !sentToday.has("evening") && within(nowMin, prefs.evening_time, WINDOW_MIN)) due.push("evening");
  return due;
}
// within(nowMin, "HH:MM", w) = nowMin ∈ [t, t+w)
```

---

## 7. Digest content — `src/lib/notify/digest.ts`

`buildDigest(kind, today, xp, unsubUrl, tz)` → `{ subject, html, text }`. Pure given its inputs.

- **Morning** subject: `"Your day · {N} need attention"` (or `"…· streak {n}🔥"`). Body: **needs
  attention** items (overdue first) → **upcoming** → quests → streak pill → big **Open Today →**
  button (`{SITE_URL}/today`).
- **Evening** subject: `"Close out your day"` / `"🔥 Keep your {n}-day streak"` if at risk. Body:
  **done today** (the payoff) → what's still **open** → if `streakAtRisk`: a prominent "log one thing
  to keep your {n}-day streak" → **Open Today →**.
- HTML: simple inline-styled dark template (zinc/cyan brand), plus a **plaintext** alternative
  (deliverability). Every email has a footer **unsubscribe** link (`unsubUrl`) + "manage" link to
  `/app/notifications`.
- Names/icons from `getApp(appId)`; cap items shown per card at `ITEM_CAP`; respect `count > shown`
  → "+N more".

---

## 8. Email channel — `src/lib/notify/email.ts` (Resend)

```ts
import { Resend } from "resend";
export async function sendEmail({ to, subject, html, text }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({ from: process.env.NOTIFY_FROM!, to, subject, html, text });
}
```
- Dep: `resend`. `NOTIFY_FROM` e.g. `XP Boost <hello@cubemetrics.com>`.
- **Prerequisite (ops):** verify `cubemetrics.com` in Resend → add **SPF + DKIM** DNS on **NameSilo**
  (see [reference: NameSilo DNS]). Without this, mail lands in spam. This is a real setup task, not code.

---

## 9. Unsubscribe + prefs UI

### One-click unsubscribe — `src/app/api/notifications/unsubscribe/route.ts` (public)
```ts
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const payload = verifyToken(token);                    // HMAC; null if tampered/expired
  if (!payload) return new Response("Invalid link", { status: 400 });
  const admin = createAdminSupabase();
  await admin.from("notification_prefs").update({ email_enabled: false }).eq("user_id", payload.userId);
  return new Response("You're unsubscribed.", { status: 200 });
}
```
Tokens — `src/lib/notify/tokens.ts`: `sign({userId, kind})` / `verify(token)` = HMAC-SHA256 over the
payload with `NOTIFY_SIGNING_SECRET`. **Never** a guessable `?user=<uuid>`.

### Settings — a light custom app `notifications`
`catalog/apps/notifications.json` (ui `modern`) + `src/app/app/notifications/{page.tsx,actions.ts}`:
toggles (email on/off, morning/evening on/off + `time` inputs, streak-save on/off) writing
`notification_prefs` via a server action. This is the **opt-in** surface — emails don't start until the
user flips email on here. (Owner enables their own first to dogfood.)

---

## 10. Security (§ that must be right)
- **Cron auth:** `Authorization: Bearer ${CRON_SECRET}`, compared with a **constant-time** check
  (`crypto.timingSafeEqual` over equal-length buffers, after a length guard) — not `!==`, which is a
  timing oracle on the secret. 401 otherwise.
- **🔒 Service-role + the user_id invariant (the load-bearing control).** The admin client bypasses
  RLS, so this whole path's tenant isolation rests on **every** `getToday`/`ensureXp`/adapter query
  filtering by the target `user_id` (enforced in Phase 1 §4 + its test). A single missing filter here
  leaks across users into a digest. Treat the Phase-1 user_id test as a prerequisite gate for Phase 4.
  Admin client only in the cron + unsubscribe routes; **never** in a client component.
- **HTML-escape everything user/model-derived in the email.** The digest HTML is hand-built (not
  React), so escape all interpolated values — app `summary` strings, item labels, **and the Phase-5 AI
  line** — before insertion. Prevents content/HTML injection from a user's own data (and cross-user if
  the app grows). Plaintext part needs no escaping but must not be HTML-rendered.
- **Unsubscribe tokens:** HMAC-SHA256, verified with a **constant-time** compare; not guessable;
  expiry optional. A leaked link only flips `email_enabled=false`.
- **No secrets client-side.** `RESEND_API_KEY`, `CRON_SECRET`, `NOTIFY_SIGNING_SECRET`, service role —
  all server-only env.
- **Opt-in + earned-only** is itself a safety property (deliverability, CAN-SPAM, trust).

## 11. Env additions (document in `.env.example` at build time)
```
SUPABASE_SERVICE_ROLE_KEY=   # already referenced; cron requires it set in prod
CRON_SECRET=                 # Vercel Cron bearer; also set in Vercel project settings
RESEND_API_KEY=
NOTIFY_FROM=XP Boost <hello@cubemetrics.com>
NOTIFY_SIGNING_SECRET=       # HMAC for unsubscribe tokens
NEXT_PUBLIC_SITE_URL=        # already present — deep-link base for /today
```

## 12. Pure helpers + tests — `tests/unit/spine-notify.test.ts`
- `isDue`: fires inside the window, not before/after; respects `*_enabled`; suppresses an already-sent
  kind; window ≥ interval (no gaps).
- `within`: wrap/boundary cases.
- `shouldSend`: morning w/ nothing actionable → **false**; with overdue card → true; evening w/
  `streakAtRisk` & nothing actionable → true; streak below `STREAK_MIN` → false.
- `streakAtRisk`: streak≥3 & todayPoints 0 → true; todayPoints>0 → false.
- `sign/verify` token: round-trips; tampered/garbage → null.
- `buildDigest`: morning includes overdue items & the Today link; evening includes done + streak line
  when at risk; subject reflects state. (Assert structure/sections, not exact copy.)

## 13. File manifest
**New:**
```
src/supabase/migrations/<stamp>_notifications.sql
vercel.ts
src/app/api/cron/digest/route.ts
src/app/api/notifications/unsubscribe/route.ts
src/lib/notify/{policy,select,digest,email,tokens}.ts
src/app/app/notifications/{page.tsx,actions.ts}
src/lib/modern/catalog/apps/notifications.json   (+ npm run build:catalog)
tests/unit/spine-notify.test.ts
```
**Edited:**
```
src/lib/spine/ctx.ts        (+ buildSpineCtx; getSpineCtx wraps it)
package.json                (+ resend dep)
docs/database.md            (notification_* delta, at integration)
.env.example                (the §11 vars)
```

## 14. Phase 4b — deferred (spec'd, not v1)
- **Web push (PWA).** Manifest + service worker + VAPID keys + `push_subscriptions` table; reuse the
  same `shouldSend`/`buildDigest` brain, different transport. Lets nudges arrive without email.
- **Dedicated streak-save ping** at a late local time (e.g. 2h before midnight) as its own `kind`,
  rather than riding the evening digest.
- **AI-written nudge line** = **Phase 5** (AI Gateway over `getToday()`), layered onto these digests.

## 15. Risks & open decisions
- **Cron host / plan** (the big one): Vercel Pro (sub-daily cron) vs Supabase `pg_cron`+`pg_net`.
  Pick before building; the route is identical either way.
- **Send-time defaults & windows** (08:00 / 20:00, 30-min window = tick interval). Tune; never let
  window < interval (gaps) or ≫ interval (double-window risk — dedupe covers it but keep tidy).
- **Email provider** — Resend recommended (DX + Vercel fit); SES/Postmark viable. DNS on NameSilo is
  the gating ops task regardless.
- **Opt-in default** — recommended `false` (consent + deliverability). For a truly single-user hub you
  *could* default the owner on, but keep the table opt-in to stay safe if the app gains users.
- **Per-tick cost** scales O(opted-in users). Fine now; add keyset batching if that set grows large.

## 16. Hand-off
Plan-only (spec-writer role). This completes the spine's core arc: **substrate → capture → anchor →
proactive**. After this, the product can pull the user back daily on its own — the north star from
`spine.md`. Phase 5 (AI nudges) and the 4b transports are additive polish on a working engine.
