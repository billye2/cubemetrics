# Tech Stack

## Runtime & Framework
- **Next.js** (App Router) — React framework, server-side rendering, API routes
- **TypeScript** — strict mode
- **Tailwind CSS** — minimal use, only for the terminal container page

## Deployment
- **Vercel** — hosting, Fluid Compute functions
- **Node.js 24 LTS** — runtime

## Database & Auth
- **Supabase** (via Vercel Marketplace) — PostgreSQL database + Auth + Row Level Security
- Auth uses synthetic emails (`handle@bbs.local`) so users only see BBS-style handle/password

## Terminal
- **@xterm/xterm** — browser-based terminal emulator
- **@xterm/addon-fit** — auto-resize terminal to container
- **@xterm/addon-webgl** — GPU-accelerated rendering (with canvas fallback)

## Utilities
- **figlet** — ASCII art text banner generation
- **@supabase/ssr** — Supabase server-side client for Next.js
- **@supabase/supabase-js** — Supabase JavaScript client

## Architecture Principles
- Single API endpoint: `POST /api/bbs`
- Pure HTTP request/response — no WebSockets
- Server is the authority — client is a dumb terminal
- 80x25 fixed terminal grid
- ANSI escape codes for all rendering
