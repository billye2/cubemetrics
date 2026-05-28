# Cubemetrics

A personal productivity hub with two coexisting UIs:
- **`/`** — modern React UI (Tailwind + Server Components, phone-first)
- **`/classic`** — the original 1993-era BBS terminal (xterm.js + ANSI)

Live at **https://cubemetrics.com**

## Documentation
- [Tech Stack](docs/tech-stack.md) — Next.js, Supabase, xterm.js, Tailwind, Vercel
- [Architecture](docs/architecture.md) — Modern UI (RSC + Server Actions) and classic BBS engine
- [Database](docs/database.md) — Schema, RLS policies, table conventions
- [Doors](docs/doors.md) — Classic door plugin interface and the modern-UI migration status
- [Commands](docs/commands.md) — Dev, build, deploy, Supabase CLI commands
- [Environment](docs/environment.md) — Required env vars, Supabase Auth config

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
npm test          # All unit + E2E tests
npm run test:watch
```

## Project Structure
```
src/app/
  page.tsx                  — Modern home (RSC, auth-gated, app grid)
  layout.tsx                — Root layout, dark theme defaults
  globals.css               — Tailwind + base styles
  classic/                  — Mount point for the BBS terminal UI
  app/<id>/                 — Modern door pages (todo, journal, feedback, …)
  app/[id]/page.tsx         — Fallback "open in classic" page for unmigrated doors
  api/bbs/                  — Classic BBS endpoint (POST)
  api/auth/                 — Google OAuth login, logout, callback
src/components/
  Terminal.tsx              — xterm.js client (used by /classic)
  modern/                   — Shared modern UI primitives (Shell, Card, EmptyState, SignOutButton)
src/lib/
  ansi/                     — ANSI rendering, AsyncLocalStorage render context (cols)
  bbs/                      — Classic engine, auth, menus, profile, session
  doors/                    — 50+ classic-door modules (registry + per-door folders)
  doors/shared/             — Reusable door factories (tracker, checklist, logbook, …)
  doors/feedback/           — Per-door quick-feedback (! shortcut) lives here
  modern/                   — Catalog of apps for the modern UI grid
  supabase/                 — Supabase server client
src/supabase/migrations/    — SQL migrations
tests/                      — Unit tests (ansi, doors, bbs) + E2E API tests
```

## Key Conventions

### Modern UI
- Server Components fetch data via `createServerSupabase()`; mutations via Server Actions in per-route `actions.ts`
- All routes use `export const dynamic = "force-dynamic"` — auth-aware, no CDN caching
- Tailwind utility classes inline. Dark mode is the only mode. Cyan accent (`cyan-500`).
- Phone-first layout. Safe-area insets respected. 44px+ tap targets.
- Apps catalog lives in `src/lib/modern/catalog.ts`. Add new apps there with `modern: true` once converted.

### Classic BBS
- Single API endpoint: `POST /api/bbs`
- Width is dynamic via `currentCols()` (AsyncLocalStorage) — defaults to 80, drops to 40 on narrow viewports
- 8 ANSI colors only: black, red, green, yellow, blue, magenta, cyan, white
- Doors implement the `Door` interface in `src/lib/doors/base.ts`
- `[X] Label` menu items are clickable/tappable — the entire label row is the target
- Press `!` from inside any door to leave feedback tagged with that door
- Click handler on `.xterm-screen` maps clicks to menu keys

### Both
- Auth: Google OAuth only via Supabase. The classic UI uses a popup; modern UI uses full-page nav. Both land at `/api/auth/callback`.
- Never commit `.env*` files — secrets stay local
- All tables enforce RLS — users only see their own rows (exceptions noted in [database.md](docs/database.md))
