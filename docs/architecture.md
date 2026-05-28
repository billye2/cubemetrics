# Architecture

Cubemetrics ships two coexisting front-ends backed by the same Supabase data:

| Surface       | URL          | Stack                                                                 |
|---------------|--------------|-----------------------------------------------------------------------|
| Modern UI     | `/`          | React Server Components + Server Actions + Tailwind                   |
| Classic BBS   | `/classic`   | xterm.js + ANSI screens rendered by a single `/api/bbs` engine        |

Auth, the database, and the door business logic are shared. The two surfaces only differ in how they render and accept input.

---

## Modern UI (`/`)

```
Browser (React)  ──Server Action / fetch──>  Next.js (RSC)  ──SQL──>  Supabase
     │                                            │
     │  Form submit / link click                  │  RSC page reads with
     │                                            │  createServerSupabase()
     │  HTML stream (new RSC payload)             │  Mutations are "use server"
     │<───────────────────────────────────────────│  actions in actions.ts
```

### Routing
- `src/app/page.tsx` — auth-gated home. Logged out → landing + Sign in with Google. Logged in → app grid with recent + categories.
- `src/app/app/<id>/page.tsx` — per-door modern UI (one folder per migrated app).
- `src/app/app/[id]/page.tsx` — fallback for unmigrated doors. Shows a "coming soon" card with an "Open in Classic" deep link.
- `src/app/classic/page.tsx` — mounts the xterm.js terminal.
- `src/app/api/auth/{login,callback,logout}` — OAuth endpoints (shared by both surfaces).

### Data access
- **Reads** — Server Components call `createServerSupabase()` and query directly. RLS enforces the user filter at the DB layer.
- **Writes** — Server Actions live in `actions.ts` files colocated with their pages. They re-validate the relevant path with `revalidatePath()` so the RSC re-renders fresh data.
- **No client-side Supabase** — all DB access is server-side; the browser never sees the anon key beyond the public env var.

### UI primitives
`src/components/modern/`
- `Shell` — sticky header with back link / title / right slot. Renders the `<main>` container.
- `Card`, `EmptyState` — neutral building blocks.
- `SignOutButton` — client component that POSTs `/api/auth/logout`.

Styling is Tailwind utility classes inline. The base palette is zinc + cyan. Safe-area insets are respected on the root container and on full-screen overlays.

---

## Classic BBS (`/classic`)

```
xterm.js  ──HTTP POST──>  /api/bbs  ──SQL──>  Supabase
     │                       │
     │  { input, inputType,  │  engine.ts → router:
     │    cols }             │    - auth handler
     │                       │    - menu handler
     │  { screen, inputMode, │    - door registry → specific door
     │    prompt? }          │
     │<──────────────────────│
```

### Communication protocol
`POST /api/bbs`

```ts
// Request
{ input: string, inputType: "key" | "line" | "refresh", cols?: 40 | 80 }

// Response
{ screen: string, inputMode: "key" | "line", prompt?: string, echo?: boolean }
```

### Input modes
- **key** — every keypress sent immediately (menu nav, single-char commands)
- **line** — client buffers until Enter, then sends the full string (data entry)
- **refresh** — no user input; request the current screen (initial load, post-auth redraw)

### Render width
The terminal can render at 80 cols (desktop) or 40 cols (narrow phones). The client passes `cols` in every request; the engine wraps the handler in an `AsyncLocalStorage` context (`src/lib/ansi/context.ts`) and ANSI helpers (`box`, `menu`, `center`, `statusBar`) read `currentCols()` for layout.

### BBS engine (state machine)
`src/lib/bbs/engine.ts`
1. Auth check (Supabase session cookie)
2. Read `bbs_sessions.current_location` from DB
3. Route by location prefix:
   - `auth:*` → auth handler
   - `main_menu`, `category:*` → menu handler
   - `door:*` → door registry → specific door's `handle()`
4. Global `!` shortcut inside any door jumps to `door:feedback:body` tagged with that door's ID and stores `return_to` in `door_state`. On submit the user is sent back to the originating door.
5. Door returns `{ screen, inputMode }`; engine appends the status bar and persists session state.

### Session state
`bbs_sessions` table, one row per user:
- `current_location` — e.g. `"door:todo:add"`
- `door_state` — JSONB for ephemeral per-door state (pagination, form buffers, `return_to`)
- `last_activity` — for "Who's Online"
- `recent_doors` — last 5 visited (used by the modern UI's "Recent" tiles too)

### Click / tap handling
DOM handler on `.xterm-screen`:
1. Map click coordinates to terminal row/col using cell dimensions.
2. Read the buffer line at that row.
3. Scan for `[X] Label` patterns. Exact span match wins; if a row has exactly one `[X]`, tapping anywhere on the row activates it (mobile-friendly).
4. Send the matched key as input.

No xterm.js link provider (unreliable on touch). No overlay buttons.

### Phone UX layer (Terminal.tsx)
Modern overlays around the unchanged terminal:
- Soft action bar (digit + Q/!/N/P/slash buttons) below the terminal when in key mode on mobile — no soft keyboard pop-up needed.
- Full-screen native `<textarea>` overlay for long line input (journal, notes, feedback body). Activated via a heuristic on the prompt text.
- Swipe-right inside the terminal sends `Q`.
- xterm is blurred on mobile after each response so the soft keyboard stays down.
- Viewport `viewport-fit=cover` + `env(safe-area-inset-*)` so the action bar and status bar clear the iOS home indicator.

---

## Authentication (shared)

Google OAuth via Supabase Auth.

**Classic flow** — popup window:
1. User taps `[L] Login with Google` → client opens `/api/auth/login` in a popup
2. Server `signInWithOAuth` → redirect to Google
3. Google redirects to `/api/auth/callback` → exchanges code, upserts profile, sends `postMessage("auth_complete", *)` to the opener
4. Terminal receives the message and refreshes

**Modern flow** — full-page nav:
1. Landing page link to `/api/auth/login` (no popup)
2. Same OAuth flow as above
3. Callback's fallback branch runs (`window.location.href = "/"`) since there's no opener
4. RSC re-renders with the authed user

`/api/auth/logout` is POSTed by `SignOutButton` and just calls `supabase.auth.signOut()`.

---

## Timer pattern (Pomodoro, etc.)
No live ticking. Timestamps only:
- **Start** — save `started_at` + `duration_minutes`
- **Check** — `remaining = (started_at + duration) - now()`
- **Complete** — mark `completed = true` when remaining ≤ 0
- User presses any key (or taps refresh on the action bar) to refresh the display

---

## Door plugin system (classic)

```ts
interface Door {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  handle(input, inputType, userId, session, supabase): Promise<BBSResponse>;
}
```

Doors manage their own sub-state via `session.current_location` (e.g. `door:todo`, `door:todo:add`, `door:todo:list:2`).

### Adding a new classic door
1. Create `src/lib/doors/<name>/` with `index.ts` (Door interface), `screens.ts` (ANSI views), `queries.ts` (DB).
2. Register in `src/lib/doors/registry.ts`.
3. Add a SQL migration in `src/supabase/migrations/`.
4. (Optional) Add an entry to `src/lib/modern/catalog.ts` with an icon so it appears in the modern UI's app grid (as a `modern: false` tile until migrated).

### Migrating a door to the modern UI
1. Create `src/app/app/<id>/page.tsx` (Server Component, fetch data).
2. Create `src/app/app/<id>/actions.ts` (Server Actions for mutations).
3. Create client components colocated in the same folder if interactivity is needed.
4. Flip `modern: true` in the catalog entry.
5. The existing classic implementation can stay — `/classic` still uses it.

---

## Caching

`export const dynamic = "force-dynamic"` on every auth-aware page + `Cache-Control: no-store` on the BBS API. Ensures deploys are immediately visible without a hard refresh and users never see another user's cached data.
