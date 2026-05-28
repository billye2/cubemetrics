# PurrfectBBS

A classic 1993-era BBS experience in the browser, powered by modern tech.

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
cp .env.example .env.local   # Fill in Supabase credentials
npm run dev                   # http://localhost:3000
```

## Project Structure
```
src/app/                  — Next.js pages + API route
src/components/           — Terminal.tsx (xterm.js client)
src/lib/ansi/             — ANSI rendering utilities
src/lib/bbs/              — BBS engine, auth, menus, session
src/lib/doors/            — Door (app) modules
src/lib/supabase/         — Supabase server client
src/supabase/migrations/  — SQL migration files
```

## Key Conventions
- Single API endpoint: `POST /api/bbs`
- All rendering targets 80x25 fixed terminal grid
- Doors implement the `Door` interface in `src/lib/doors/base.ts`
- Never commit `.env*` files — secrets stay local
