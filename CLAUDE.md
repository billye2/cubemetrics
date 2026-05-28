# XP Boost

A personal productivity hub — a modern React app with 50+ tiny apps for tracking time, tasks, habits, and life.
- **`/`** — Next.js App Router UI (Tailwind + Server Components, phone-first, dark mode)

Live at **https://cubemetrics.com**

## Documentation
- [Tech Stack](docs/tech-stack.md) — Next.js, Supabase, Tailwind, Vercel
- [Architecture](docs/architecture.md) — RSC + Server Actions, the app catalog, feedback→GitHub workflow
- [Database](docs/database.md) — Schema, RLS policies, table conventions
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
npm test          # Unit tests (Vitest)
npm run test:watch
```

## Project Structure
```
src/app/
  page.tsx                  — Home (RSC, auth-gated, searchable app grid)
  layout.tsx                — Root layout, dark theme defaults
  globals.css               — Tailwind + base styles
  app/<id>/                 — Custom app pages (todo, journal, feedback, …)
  app/[id]/page.tsx         — Factory dispatch for template apps (+ "coming soon" fallback)
  app/[id]/_factories/      — Tracker / Checklist / Logbook / Goal / Finance views
  api/auth/                 — Google OAuth login, logout, callback
src/components/modern/      — Shared UI primitives (Shell, HeaderFeedback, AppSearch, Card, SignOutButton)
src/lib/
  modern/                   — App catalog (catalog.ts) + admin gate (admin.ts)
  github/                   — GitHub issue creation for the feedback workflow
  supabase/                 — Supabase server client + service-role admin client
src/supabase/migrations/    — SQL migrations
tests/                      — Unit tests (Vitest)
```

## Key Conventions
- Server Components fetch data via `createServerSupabase()`; mutations via Server Actions in per-route `actions.ts`.
- All routes use `export const dynamic = "force-dynamic"` — auth-aware, no CDN caching.
- Tailwind utility classes inline. Dark mode is the only mode. Cyan accent (`cyan-500`).
- Phone-first layout. Safe-area insets respected. 44px+ tap targets.
- The app catalog lives in `src/lib/modern/catalog.ts` — the single source of truth for the grid. Add new apps there; template apps (`tracker`/`checklist`/`logbook`/`goal`/`finance`) need only a catalog entry, custom apps add a page + `actions.ts`.
- Press the **Feedback** button in any app's header to send feedback tagged with that app. Admins (`ADMIN_EMAIL`) review it under `/app/feedback` and approve → opens a GitHub issue mentioning `@claude`.
- Auth: Google OAuth only via Supabase, full-page nav, lands at `/api/auth/callback`.
- Never commit `.env*` files — secrets stay local.
- All tables enforce RLS — users only see their own rows (exceptions noted in [database.md](docs/database.md)).
