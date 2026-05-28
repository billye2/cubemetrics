# Architecture

## Overview

```
Browser (xterm.js)  ──HTTP POST──>  Next.js API  ──SQL──>  Supabase
     │                                  │
     │  { input, inputType }            │  engine.ts routes to:
     │                                  │    - auth handler
     │  { screen, inputMode }           │    - menu handler
     │<─────────────────────────────────│    - door handler
```

## Communication Protocol

All interaction flows through `POST /api/bbs`.

### Request
```typescript
{ input: string, inputType: "key" | "line" | "refresh" }
```

### Response
```typescript
{ screen: string, inputMode: "key" | "line", prompt?: string, echo?: boolean }
```

### Input Modes
- **key**: every keypress sent immediately (menu navigation, single-character commands)
- **line**: client buffers locally until Enter, then sends full line (data entry)
- **refresh**: no user input, request current screen (initial load, timer refresh)

## BBS Engine (State Machine)

`src/lib/bbs/engine.ts` — central router

1. Check auth (Supabase session cookie)
2. Read `bbs_sessions.current_location` from DB
3. Route to handler based on location:
   - `auth:*` → auth handler (login/register)
   - `main_menu` → menu handler
   - `door:*` → door registry → specific door handler
4. Handler returns ANSI screen + next input mode
5. Update session state in DB

## Session State

Stored in `bbs_sessions` table per user:
- `current_location` — where in the BBS (e.g., `"door:todo:add"`)
- `door_state` — JSONB for ephemeral per-door data (pagination, form buffers)
- `last_activity` — for "Who's Online" and session expiry

## Door (App) Plugin System

Each door implements:
```typescript
interface Door {
  id: string;
  name: string;
  category: string;
  handle(input, inputType, user, session, supabase): Promise<BBSResponse>;
}
```

Doors manage their own sub-state via `session.currentLocation` (e.g., `door:todo`, `door:todo:add`, `door:todo:list:2`).

### Adding a New Door
1. Create folder: `src/lib/doors/<name>/`
2. Implement `index.ts` (Door interface), `screens.ts` (ANSI views), `queries.ts` (DB)
3. Register in `src/lib/doors/registry.ts`
4. Add SQL migration in `src/supabase/migrations/`

## Timer Pattern (Pomodoro, etc.)

No live ticking. Timestamps only:
- **Start**: save `started_at` + `duration_minutes` to DB
- **Check**: calculate `remaining = (started_at + duration) - now()`
- **Complete**: mark `completed = true` when remaining <= 0
- User presses any key (or taps refresh button on mobile) to refresh the display

## Authentication

Google OAuth via popup window:
1. User taps `[L] Login with Google` → client opens popup to `/api/auth/login`
2. Server redirects to Google OAuth via Supabase Auth
3. Google redirects back to `/api/auth/callback` with auth code
4. Callback exchanges code for session, creates/updates profile, sends `postMessage` to parent
5. Terminal receives `auth_complete` message, refreshes screen → main menu

## Mobile Support

On mobile (detected via user agent + viewport width < 768):
- **Terminal:** 80x20 grid, 10px font
- **Button bar:** dynamically extracts `[X]` patterns from ANSI screen output, renders as large tappable buttons at bottom
- **Input bar:** native text input with SEND button for line-mode entry
- **Viewport:** no-zoom, `100dvh` for proper mobile height
