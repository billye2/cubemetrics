# Tech Stack

## Runtime & Framework
- **Next.js 16** (App Router, Turbopack) — RSC + Server Actions, API routes
- **TypeScript** — strict mode
- **Tailwind CSS v4** — styling. Imported once via `@import "tailwindcss"` in `src/app/globals.css`; utility classes are inline in components.

## Deployment
- **Vercel** — hosting, Fluid Compute. The Vercel GitHub App on `billye2/xpbbs` auto-deploys `master` to production and creates preview deployments for every branch.
- **Node.js 22+** — runtime

## Database & Auth
- **Supabase** (via Vercel Marketplace) — PostgreSQL + Auth + RLS
- **Google OAuth** via Supabase Auth. Profile rows are created on first login with the handle defaulting to the Google display name.

## App framework (`/`)
- **React Server Components** for all data reads. `createServerSupabase()` provides a per-request server client.
- **Server Actions** for all mutations. One `actions.ts` file per route; `revalidatePath()` triggers fresh RSC renders.
- **No client-side Supabase access** — the browser only ever talks to Next.js, which talks to Supabase.

## Integrations
- **GitHub REST API** (via `fetch`, no SDK) — opens issues from approved feedback (`src/lib/github/issues.ts`).
- **Service-role Supabase client** — admin-only feedback review queue (`src/lib/supabase/admin.ts`).

## Utilities
- **@supabase/ssr** — Supabase server-side client for Next.js
- **@supabase/supabase-js** — base Supabase JS client (also used for the service-role admin client)

## Testing
- **Vitest** — unit tests under `tests/`.

## Architecture principles
- The catalog (`src/lib/modern/catalog.ts`) is the single source of truth for the app grid.
- RLS does the authorization, not application code.
- Phone-first; desktop is responsive but secondary. Dark mode only.
