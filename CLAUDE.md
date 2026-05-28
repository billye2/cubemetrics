# XPBBS

A classic 1993-era BBS experience in the browser, powered by modern tech.
Live at **https://cubemetrics.com**

## Documentation
- [Tech Stack](docs/tech-stack.md) — Next.js, Supabase, xterm.js, Vercel
- [Architecture](docs/architecture.md) — Single-endpoint model, BBS engine, door plugin system
- [Database](docs/database.md) — Schema, RLS policies, table conventions
- [Doors](docs/doors.md) — App plugin interface, categories, adding new doors
- [Commands](docs/commands.md) — Dev, build, deploy, Supabase CLI commands
- [Environment](docs/environment.md) — Required env vars, Supabase Auth config

## Quick Start
```bash
npm install
vercel env pull .env.local   # Pull Supabase credentials from Vercel
npm run dev                   # http://localhost:3000
```

## Deploy
```bash
vercel --prod --yes --scope billys-projects-7712fade
```

## Test
```bash
npm test          # Run all 64 tests (unit + E2E)
npm run test:watch # Watch mode
```

## Project Structure
```
src/app/                  — Next.js pages + API routes (bbs, auth)
src/components/           — Terminal.tsx (xterm.js client, click handler)
src/lib/ansi/             — ANSI rendering utilities (8 colors only, no blink)
src/lib/bbs/              — BBS engine, auth (Google OAuth), menus, profile, session
src/lib/doors/            — 50+ door (app) modules across 10 categories
src/lib/doors/shared/     — Reusable door factories (tracker, checklist, logbook, goal, finance)
src/lib/supabase/         — Supabase server client
src/supabase/migrations/  — SQL migration files
tests/                    — Unit tests (ansi, doors, bbs) + E2E API tests
```

## Key Conventions
- Single API endpoint: `POST /api/bbs`
- 80 columns always — font auto-scales to fit viewport width
- 8 ANSI colors only: black, red, green, yellow, blue, magenta, cyan, white
- Doors implement the `Door` interface in `src/lib/doors/base.ts`
- Auth: Google OAuth only — alias set from Google name, editable in profile
- Click/tap: DOM handler on `.xterm-screen` maps clicks to `[X]` menu items
- Force-dynamic rendering — no CDN caching, always serves latest build
- Never commit `.env*` files — secrets stay local
- Run security audit before every commit (`npm test` includes E2E checks)
