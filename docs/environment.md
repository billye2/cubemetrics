# Environment

## Required Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key (safe for browser) |
| `NEXT_PUBLIC_SITE_URL` | Client + Server | Production URL for OAuth redirects |

## Setup
1. Pull env vars from Vercel: `vercel env pull .env.local`
2. Or manually create `.env.local` with the variables above

## Supabase Auth Config
- **Provider:** Google OAuth only (no email/password)
- **Email confirmation:** Disabled
- **Site URL:** https://cubemetrics.com
- **Redirect URLs:** https://cubemetrics.com/api/auth/callback

## Vercel Config
- **Project:** bbs (scope: billys-projects-7712fade)
- **Domain:** cubemetrics.com (DNS on NameSilo)
- **Framework:** Next.js (auto-detected)
- **Build command:** `npm run build`
- **Deploy:** `vercel --prod --yes --scope billys-projects-7712fade`
