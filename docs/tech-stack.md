# Tech Stack

## Runtime & Framework
- **Next.js 16** (App Router, Turbopack) — RSC + Server Actions, API routes
- **TypeScript** — strict mode
- **Tailwind CSS v4** — primary styling system for the modern UI (`/`). Imported once via `@import "tailwindcss"` in `src/app/globals.css`; utility classes are inline in components.

## Deployment
- **Vercel** — hosting, Fluid Compute. The Vercel GitHub App on `billye2/xpbbs` auto-deploys `master` to production and creates preview deployments for every branch.
- **Node.js 22+** — runtime

## Database & Auth
- **Supabase** (via Vercel Marketplace) — PostgreSQL + Auth + RLS
- **Google OAuth** via Supabase Auth. Profile rows are created on first login with the handle defaulting to the Google display name (editable in the classic profile flow).

## Modern UI (`/`)
- **React Server Components** for all data reads. `createServerSupabase()` provides a per-request server client.
- **Server Actions** for all mutations. One `actions.ts` file per route; `revalidatePath()` triggers fresh RSC renders.
- **No client-side Supabase access** — the browser only ever talks to Next.js, which talks to Supabase.

## Classic terminal (`/classic`)
- **@xterm/xterm** — browser terminal emulator
- **@xterm/addon-fit** — terminal resize
- **figlet**, custom ANSI helpers in `src/lib/ansi/` — banners, boxes, menus, status bar
- All input goes through one endpoint: `POST /api/bbs`

## Utilities
- **@supabase/ssr** — Supabase server-side client for Next.js
- **@supabase/supabase-js** — base Supabase JS client
- **node:async_hooks** — `AsyncLocalStorage` for the ANSI render context (`cols`)

## Architecture principles
- One source of truth for door logic and queries — the classic engine and the modern UI hit the same Supabase tables.
- RLS does the authorization, not application code.
- The classic terminal is preserved as a first-class surface, not a deprecated fallback.
- Modern UI is phone-first; desktop is responsive but secondary.
