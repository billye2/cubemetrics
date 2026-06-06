# XP Boost

A personal productivity hub — a modern React app with 50+ tiny apps for tracking time, tasks, habits, and life.
- **`/`** — Next.js App Router UI (Tailwind + Server Components, phone-first, dark mode)

Live at **https://cubemetrics.com**

## Documentation
- [Tech Stack](docs/tech-stack.md) — Next.js, Supabase, Tailwind, Vercel
- [Architecture](docs/architecture.md) — RSC + Server Actions, the app catalog, feedback→GitHub workflow
- [The Spine](docs/spine.md) — the cross-app layer that makes the suite cohere (contract → capture → Today → proactive → insight); phase specs in [docs/app-plans/spine-phase1..5.md](docs/app-plans/)
- [Database](docs/database.md) — Schema, RLS policies, table conventions
- [Commands](docs/commands.md) — Dev, build, deploy, Supabase CLI commands
- [Environment](docs/environment.md) — Required env vars, Supabase Auth config
- [Agent Orchestration](docs/agent-orchestration.md) — running parallel build agents without overwrites or duplicate work

## Quick Start
```bash
npm install
vercel env pull .env.local   # Pull Supabase credentials from Vercel
npm run dev                   # http://localhost:3000
```

## Deploy
Pushing to `master` auto-deploys production via the Vercel GitHub App.
Manual fallback:
```bash
vercel --prod --yes --scope billys-projects-7712fade
```

## Test
```bash
npm test          # Unit tests (Vitest)
npm run test:watch
```

## Project Structure
```
src/app/
  page.tsx                  — "/" → Landing (logged-out) / redirect to /today (logged-in)
  today/page.tsx            — The Today anchor ritual (logged-in home; the Spine's destination)
  apps/page.tsx             — The full searchable app grid (+ a "★ Favorites" section at the top)
  assistant/                — The +XP AI quick-capture assistant (chat/voice → logs to mini-apps)
  layout.tsx                — Root layout, dark theme defaults
  globals.css               — Tailwind + base styles
  app/<id>/                 — Custom app pages (todo, journal, feedback, notifications, …)
  app/[id]/page.tsx         — Factory dispatch for template apps (+ "coming soon" fallback)
  app/[id]/_factories/      — Tracker / Checklist / Logbook / Goal / Finance / Schedule views
  api/auth/                 — Google OAuth login, logout, callback
  api/cron/digest/          — Proactive digest cron (Spine Layer 4; CRON_SECRET-gated)
  api/notifications/        — One-click unsubscribe (HMAC-verified)
src/components/modern/      — Shared UI primitives (Shell, HeaderFeedback, QuickCapture, AppSearch, Card)
  today/                    — TodayHeader / TodayCard / TodayBody / TodayInsight
src/lib/
  modern/                   — App catalog (catalog/, generated from apps/*.json) + admin gate (admin.ts)
  spine/                    — The cross-app contract: adapters/<id>.ts, generated registry, getToday()/route(),
                              capture actions, usage beacon, pure today/view helpers
  notify/                   — Proactive engine: select/policy/digest/email/tokens (Layer 4)
  agent/                    — The +XP assistant runtime (run.ts): Haiku tool-loop → RLS-safe writes (Layer 7 v1)
  ai/                       — Today insight line (Layer 5; deterministic now, AI-ready)
  xp/                        — The XP layer (levels/streaks/quests/achievements)
  github/                   — GitHub issue creation for the feedback workflow
  supabase/                 — Supabase server client + service-role admin client
src/supabase/migrations/    — SQL migrations
tests/                      — Unit tests (Vitest)
```

## Key Conventions
- Server Components fetch data via `createServerSupabase()`; mutations via Server Actions in per-route `actions.ts`.
- All routes use `export const dynamic = "force-dynamic"` — auth-aware, no CDN caching.
- Tailwind utility classes inline. Cyan accent (`cyan-500`). Dark by default; a **light theme follows the OS** via `prefers-color-scheme` — implemented purely in `src/app/globals.css` by overriding the `--color-zinc-*`/`--color-cyan-*` CSS vars under `@media (prefers-color-scheme: light)` (Tailwind v4 compiles colors to those vars), so components keep using plain `zinc-*`/`cyan-*` classes with no per-file theme logic.
- Phone-first layout. Safe-area insets respected. 44px+ tap targets.
- The app catalog lives in `src/lib/modern/catalog/` — the single source of truth for the grid. It's **generated**: add an app by dropping `catalog/apps/<id>.json` and running `npm run build:catalog` (never hand-edit `_generated.ts`). Template apps (`tracker`/`checklist`/`logbook`/`goal`/`finance`/`schedule`) need only the JSON entry; custom apps also add a page + `actions.ts`. One-file-per-app keeps parallel build agents from colliding — see [Agent Orchestration](docs/agent-orchestration.md).
- **The Spine** ([docs/spine.md](docs/spine.md)) is the cross-app layer: a per-app contract (`today()`/`quickLog()`) feeds the global capture bar (`⌘K`), the `/today` ritual, and the proactive digest. **Governance rule (spine-first):** a new app SHOULD ship a `src/lib/spine/adapters/<id>.ts` (then `npm run build:spine`) — or justify opting out in its app-plan — so new breadth strengthens the spine instead of diluting it. The adapter registry is generated, one-file-per-app (collision-free), just like the catalog.
- Press the **Feedback** button in any app's header to send feedback tagged with that app. Admins review it under `/app/feedback` and approve → opens a GitHub issue mentioning `@claude`. Who is an admin lives in the `app_admins` allowlist table in Supabase (RLS-locked to the service role; `isAdmin()` is fail-closed) — no admin email is hardcoded in source.
- Auth: Google OAuth only via Supabase, full-page nav, lands at `/api/auth/callback`.
- Never commit `.env*` files — secrets stay local.
- All tables enforce RLS — users only see their own rows (exceptions noted in [database.md](docs/database.md)).
