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

## Project Structure
```
src/app/                  — Next.js pages + API routes (bbs, auth)
src/components/           — Terminal.tsx (xterm.js client + mobile button bar)
src/lib/ansi/             — ANSI rendering utilities (8 colors only, no blink)
src/lib/bbs/              — BBS engine, auth (Google OAuth), menus, session
src/lib/doors/            — Door (app) modules (8 built, 52+ planned)
src/lib/supabase/         — Supabase server client
src/supabase/migrations/  — SQL migration files (001-011)
```

## Key Conventions
- Single API endpoint: `POST /api/bbs`
- All rendering targets 80x25 fixed terminal grid (80x20 on mobile)
- 8 ANSI colors only: black, red, green, yellow, blue, magenta, cyan, white
- Doors implement the `Door` interface in `src/lib/doors/base.ts`
- Auth: Google OAuth only — no handle/password
- Mobile: dynamic button bar extracted from screen, native input bar for text
- Never commit `.env*` files — secrets stay local
- Run security audit before every commit
