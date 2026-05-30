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

`src/lib/modern/catalog/` is the single source of truth for the app grid. It is **generated**: one
JSON file per app under `catalog/apps/<id>.json` is assembled by `scripts/build-catalog.mjs` into
`catalog/_generated.ts` (the `APPS` array); `catalog/index.ts` holds the types, `CATEGORIES`, and
the `getApp`/`getAppsByCategory` helpers and re-exports `APPS`. Consumers still import from
`@/lib/modern/catalog` unchanged. One-file-per-app means parallel build agents never collide on a
shared array — see [agent-orchestration.md](agent-orchestration.md). Each `AppEntry` has a `ui` type:

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
1. Add `src/lib/modern/catalog/apps/<id>.json` (id matching the filename, plus `order`, name,
   category, icon, description, `ui`), then run `npm run build:catalog` to regenerate `APPS`.
   **Never hand-edit `_generated.ts`.** (`order` controls grid position; it's stripped from the
   emitted `AppEntry`.)
2. For a template app, supply `config` in the JSON — no new code needed.
3. For a custom app, create `src/app/app/<id>/page.tsx` (Server Component) + `actions.ts` (Server Actions) and any colocated client components.
4. Add a SQL migration in `src/supabase/migrations/` if it needs its own table — use the
   timestamp filename convention (`YYYYMMDDTHHMM_<slug>.sql`, see [database.md](database.md)).

---

## Feedback → GitHub workflow

`src/app/app/feedback/` + `HeaderFeedback`:
1. Users submit feedback (tagged with the app via `app_id`) — stored in `user_feedback`.
2. An admin-only **Review** tab lists pending feedback.
3. Approving opens a GitHub issue (`src/lib/github/issues.ts`) containing an `@claude` mention and records the issue URL on the row. Rejecting marks it not planned.
4. `.github/workflows/claude.yml` runs `anthropics/claude-code-action@v1` on `issues`, `issue_comment`, `pull_request_review_comment`, and `pull_request_review` events whose body contains `@claude`. It uses the `ANTHROPIC_API_KEY` repo secret and runs Claude Code inside the Actions runner with permission to push branches and open PRs.

Requires the `ANTHROPIC_API_KEY` repository secret (not a deployment-environment secret) — see [environment.md](environment.md).

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
