# Apps & Doors

Cubemetrics exposes ~50 small apps. Each app exists as a **classic door** (BBS terminal). Some are also surfaced through the **modern UI** with custom React pages. The two implementations share Supabase tables and queries.

## Classic doors

### Plugin interface
```ts
interface Door {
  id: string;          // e.g., "todo"
  name: string;        // e.g., "To-Do List"
  category: string;    // e.g., "tasks"
  description: string; // One-line for the menu
  version: string;
  handle(input, inputType, userId, session, supabase): Promise<BBSResponse>;
}
```

### Door types
**Custom doors** — full per-door implementation:
```
src/lib/doors/<name>/
  index.ts      — Door interface, sub-state routing
  screens.ts    — ANSI screen builders
  queries.ts    — Supabase queries
```
Used by: todo, journal, calendar, pomodoro, habits, expenses, notes, reading, feedback.

**Shared factory doors** — config-only:
```
src/lib/doors/<name>/
  index.ts      — Calls a factory from shared/ with config
```
Factories in `src/lib/doors/shared/`:
- `tracker.ts` — daily value tracking (mood, water, sleep, energy, weight, screen time, …)
- `checklist.ts` — simple lists (grocery, wishlist, packing, bucket list, bookmarks, …)
- `logbook.ts` — dated text entries (gratitude, meeting notes, standup, workout, …)
- `goaltracker.ts` — goals with progress (goals, OKRs, milestones, courses, …)
- `financeitem.ts` — financial items (budget, bills, subscriptions, debt, invoices)

### Sub-state convention
- `door:<id>` — door's main menu
- `door:<id>:<action>` — specific action (e.g., `door:todo:add`)
- `door:<id>:<action>:<param>` — parameterized (e.g., `door:todo:list:2`)

### Global keys (any door)
- `Q` / `X` — go back one level / exit door
- `!` — quick feedback for the current door (preserves return location)

## Modern UI

The modern UI catalog lives in `src/lib/modern/catalog.ts`. Each entry:
```ts
{ id, name, category, icon, description, modern: boolean }
```
`modern: true` → there is a dedicated React page at `src/app/app/<id>/page.tsx`.
`modern: false` → the entry appears in the grid but tapping it opens the "coming soon — open in classic" fallback (`src/app/app/[id]/page.tsx`).

### Migrated apps (modern: true)
| App | Route | Notes |
|-----|-------|-------|
| Todo | `/app/todo` | Add with priority, toggle complete, delete, collapsible completed section |
| Journal | `/app/journal` + `/app/journal/new` | List with expandable entries, mood picker on create |
| Feedback | `/app/feedback` | Tabbed: Submit / Mine / Board |

### All apps by category (classic + modern)
| Category | Apps |
|----------|------|
| Time & Focus | Pomodoro, Focus, Time Tracker, Countdown, Meditation, Stopwatch |
| Tasks & Planning | **Todo** (modern), Daily Planner, Weekly Review, Routines, Backlog |
| Goals & Progress | Goals, OKRs, Streaks, Milestones, Vision Board, Bucket List |
| Habits & Wellness | Habits, Mood, Water, Sleep, Energy, Weight, Workout, Meals, Screen Time, Gratitude |
| Notes & Thinking | **Journal** (modern), Notes, Meeting Notes, Standup, Brainstorm, Flashcards, Writing Tracker, Decisions |
| Finance | Expenses, Budget, Bills, Subscriptions, Savings, Debt Payoff |
| Learning | Reading List, Courses, Vocabulary, Learning Log, Skill Tree |
| Organization | Bookmarks, Contacts, Grocery, Inventory, Calendar, File Index, Wishlist |
| Work | Retro, 1-on-1 Prep, Feedback Log, Projects, Clients, Invoices, **Feedback** (modern) |
| Lifestyle | Recipes, Travel, Packing, Cleaning, Plants, Pets, Home Maintenance, Warranty |

## Adding work

### New classic door
1. Create `src/lib/doors/<name>/` with `index.ts`, `screens.ts`, `queries.ts` (or call a shared factory).
2. Register in `src/lib/doors/registry.ts`.
3. Add a SQL migration in `src/supabase/migrations/`.
4. Add an entry to `src/lib/modern/catalog.ts` so it shows in the modern app grid (initially as `modern: false`).

### Migrating an existing door to modern UI
1. Read the door's `queries.ts` to understand the data shape.
2. Create `src/app/app/<id>/page.tsx` (Server Component) — fetch with `createServerSupabase()` directly, RLS enforces user filter.
3. Create `src/app/app/<id>/actions.ts` — Server Actions for mutations, call `revalidatePath('/app/<id>')`.
4. Add client components in the same folder for interactivity.
5. Flip `modern: true` in `src/lib/modern/catalog.ts`.
6. The classic door implementation stays in place — `/classic` still uses it.

### Patterns to copy
- **CRUD list with priority filter** → `src/app/app/todo/`
- **List + separate "new" route** → `src/app/app/journal/` + `journal/new/`
- **Tabbed view (form + lists)** → `src/app/app/feedback/`
