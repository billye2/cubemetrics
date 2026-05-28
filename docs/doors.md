# Doors (Apps)

## Plugin Interface

Every door implements:
```typescript
interface Door {
  id: string;          // e.g., "todo"
  name: string;        // e.g., "To-Do List"
  category: string;    // e.g., "Tasks & Planning"
  description: string; // One-line for menu display
  version: string;
  handle(input, inputType, user, session, supabase): Promise<BBSResponse>;
}
```

## Door Types

### Custom doors (full implementation)
```
src/lib/doors/<name>/
  index.ts      — Door interface, sub-state routing
  screens.ts    — ANSI screen builders
  queries.ts    — Supabase queries
```
Used by: todo, journal, calendar, pomodoro, habits, expenses, notes, reading

### Shared factory doors (config-only)
```
src/lib/doors/<name>/
  index.ts      — Calls a factory from shared/ with config
```
Factories in `src/lib/doors/shared/`:
- **tracker.ts** — daily value tracking (mood, water, sleep, energy, weight, screen time, etc.)
- **checklist.ts** — simple lists (grocery, wishlist, packing, bucket list, bookmarks, etc.)
- **logbook.ts** — dated text entries (gratitude, meeting notes, standup, workout, etc.)
- **goaltracker.ts** — goals with progress (goals, OKRs, milestones, courses, etc.)
- **financeitem.ts** — financial items (budget, bills, subscriptions, debt, invoices)

## All 50+ Doors by Category

| Category | Doors |
|----------|-------|
| Time & Focus | Pomodoro, Focus, Time Tracker, Countdown, Meditation, Stopwatch |
| Tasks & Planning | To-Do, Daily Planner, Weekly Review, Routines, Backlog |
| Goals & Progress | Goals, OKRs, Streaks, Milestones, Vision Board, Bucket List |
| Habits & Wellness | Habits, Mood, Water, Sleep, Energy, Weight, Workout, Meals, Screen Time, Gratitude |
| Notes & Thinking | Journal, Notes, Meeting Notes, Standup, Brainstorm, Flashcards, Writing Tracker, Decisions |
| Finance | Expenses, Budget, Bills, Subscriptions, Savings, Debt Payoff |
| Learning | Reading List, Courses, Vocabulary, Learning Log, Skill Tree |
| Organization | Bookmarks, Contacts, Grocery, Inventory, Calendar, File Index, Wishlist |
| Work | Retro, 1-on-1 Prep, Feedback Log, Projects, Clients, Invoices |
| Lifestyle | Recipes, Travel, Packing, Cleaning, Plants, Pets, Home Maintenance, Warranty |

## Sub-State Convention
- `door:<id>` — door's main menu
- `door:<id>:<action>` — specific action (e.g., `door:todo:add`)
- `door:<id>:<action>:<param>` — parameterized (e.g., `door:todo:list:2`)

## Global Keys
- `Q` or `X` — go back one level / exit door
