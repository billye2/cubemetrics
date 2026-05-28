# Environment

## Required Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service role key (bypasses RLS) |

## Setup
1. Provision Supabase via Vercel Marketplace (auto-sets env vars on Vercel)
2. Pull to local: `vercel env pull .env.local`
3. Or manually create `.env.local` with the three variables above

## Supabase Auth Config
- Disable email confirmation (BBS users don't have real emails)
- Synthetic email format: `{handle}@bbs.local`
- Password minimum length: 4 characters (BBS era vibes)

## Vercel Config
- Framework: Next.js (auto-detected)
- Node.js: 24 LTS
- Build command: `npm run build`
- Output directory: `.next`
