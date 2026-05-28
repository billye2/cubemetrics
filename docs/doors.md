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

## File Structure Per Door
```
src/lib/doors/<name>/
  index.ts      — Door interface implementation, sub-state routing
  screens.ts    — ANSI screen builders (each view is a function returning string)
  queries.ts    — Supabase queries (CRUD operations)
```

## Phase 1 Doors (Core)
| Door | Category | Description |
|------|----------|-------------|
| todo | Tasks & Planning | Add, complete, delete, list tasks |
| journal | Notes & Thinking | Dated entries, browse history |
| calendar | Organization | Month/week/day views, add events |
| pomodoro | Time & Focus | Start/stop sessions, key-press refresh |
| habits | Habits & Wellness | Define habits, daily check-in, streaks |
| expenses | Finance | Log, categorize, view summaries |
| notes | Notes & Thinking | Create, edit, search quick notes |
| reading | Learning & Reading | Track books, status, ratings |

## Future Doors (60+ total)
See `ideas/build these webapps into bbs.txt` for the full list across 10 categories:
Time & Focus, Tasks & Planning, Goals & Progress, Habits & Wellness,
Notes & Thinking, Finance, Learning & Reading, Organization,
Work & Collaboration, Lifestyle

## Sub-State Convention
Doors encode their internal navigation in `session.currentLocation`:
- `door:<id>` — door's main menu
- `door:<id>:<action>` — specific action (e.g., `door:todo:add`)
- `door:<id>:<action>:<param>` — parameterized (e.g., `door:todo:list:2` for page 2)

## Global Keys (handled by engine before reaching doors)
- `Q` or `X` — go back one level / exit door
- `?` — show help for current context
