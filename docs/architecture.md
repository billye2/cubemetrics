# Architecture

XP Boost is a single modern web app — React Server Components + Server Actions on Next.js, backed by Supabase.

```
Browser (React)  ──Server Action / fetch──>  Next.js (RSC)  ──SQL──>  Supabase
     │                                            │
     │  Form submit / link click                  │  RSC page reads with
     │                                            │  createServerSupabase()
     │  HTML stream (new RSC payload)             │  Mutations are "use server"
     │<───────────────────────────────────────────│  actions in actions.ts
```

---

## Routing
- `src/app/page.tsx` — auth-gated home. Logged out → landing + Sign in with Google. Logged in → searchable app grid grouped by category.
- `src/app/app/<id>/page.tsx` — per-app page (one folder per custom app: todo, journal, feedback, …).
- `src/app/app/[id]/page.tsx` — factory dispatch for template-driven apps (tracker / checklist / logbook / goal / finance). Unknown ui types fall back to a "coming soon" card.
- `src/app/api/auth/{login,callback,logout}` — Google OAuth endpoints.

## Data access
- **Reads** — Server Components call `createServerSupabase()` and query directly. RLS enforces the per-user filter at the DB layer.
- **Writes** — Server Actions live in `actions.ts` files colocated with their pages. They re-validate the relevant path with `revalidatePath()` so the RSC re-renders fresh data.
- **No client-side Supabase** — all DB access is server-side; the browser never sees the anon key beyond the public env var.
- **Admin** — the feedback review queue uses a service-role client (`createAdminSupabase()`, bypasses RLS) gated by `isAdmin()` (`src/lib/modern/admin.ts`).

## UI primitives
`src/components/modern/`
- `Shell` — sticky header with back link / title / right slot. Renders the `<main>` container and the global `HeaderFeedback` button.
- `HeaderFeedback` — per-app feedback button + modal, shown on every `/app/<id>` page.
- `AppSearch` — client-side fuzzy search over the catalog.
- `Card`, `EmptyState`, `SignOutButton`.

Styling is Tailwind utility classes inline. The base palette is zinc + cyan, dark mode only. Phone-first; safe-area insets are respected on the root container and full-screen overlays.

---

## App catalog & templates

`src/lib/modern/catalog.ts` is the single source of truth for the app grid. Each `AppEntry` has a `ui` type:

| `ui`        | Rendered by                                  |
|-------------|----------------------------------------------|
| `modern`    | A dedicated page under `src/app/app/<id>/`   |
| `tracker`   | `_factories/TrackerView`                     |
| `checklist` | `_factories/ChecklistView`                   |
| `logbook`   | `_factories/LogbookView`                     |
| `goal`      | `_factories/GoalView`                        |
| `finance`   | `_factories/FinanceView`                     |

Template apps share a config (`FactoryConfig`) and a backing table (`daily_trackers`, `checklists`, `logs`, `goals`, `finance_items`).

### Adding a new app
1. Add an `AppEntry` to `src/lib/modern/catalog.ts` (id, name, category, icon, `ui`).
2. For a template app, supply `config` — no new code needed.
3. For a custom app, create `src/app/app/<id>/page.tsx` (Server Component) + `actions.ts` (Server Actions) and any colocated client components.
4. Add a SQL migration in `src/supabase/migrations/` if it needs its own table.

---

## Feedback → GitHub workflow

`src/app/app/feedback/` + `HeaderFeedback`:
1. Users submit feedback (tagged with the app via `app_id`) — stored in `user_feedback`.
2. An admin-only **Review** tab lists pending feedback.
3. Approving opens a GitHub issue (`src/lib/github/issues.ts`) containing an `@claude` mention so the Claude Code GitHub app can pick it up, and records the issue URL on the row. Rejecting marks it not planned.

See [environment.md](environment.md) for the required env vars.

---

## Authentication

Google OAuth via Supabase Auth, full-page navigation:
1. Landing page links to `/api/auth/login` → Supabase `signInWithOAuth` → Google.
2. Google redirects to `/api/auth/callback`, which exchanges the code and upserts the profile.
3. The callback returns to `/`; the RSC re-renders with the authed user.

`/api/auth/logout` is POSTed by `SignOutButton` and calls `supabase.auth.signOut()`.

---

## Timer pattern (Pomodoro, etc.)
No live ticking — timestamps only:
- **Start** — save `started_at` + `duration_minutes`
- **Check** — `remaining = (started_at + duration) - now()`
- **Complete** — mark `completed = true` when remaining ≤ 0

---

## Caching
`export const dynamic = "force-dynamic"` on every auth-aware page ensures deploys are immediately visible without a hard refresh and users never see another user's cached data.
