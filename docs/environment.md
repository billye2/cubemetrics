# Environment

## Required Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key (safe for browser) |
| `NEXT_PUBLIC_SITE_URL` | Client + Server | Production URL for OAuth redirects |

## Optional Variables (feedback → GitHub workflow)

| Variable | Where | Description |
|----------|-------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service-role key. Used only by the admin feedback-review queue to read/update feedback across users (bypasses RLS). |
| `GITHUB_TOKEN` | Server | Token with `issues:write` (push) access. Used when an admin approves feedback to open an issue. |
| `GITHUB_REPO` | Server | `owner/repo` approved feedback opens issues in (defaults to `billye2/xpbbs`). |
| `ADMIN_EMAIL` | Server | The account allowed to review/approve feedback (defaults to the project owner). |

When feedback is approved, an issue is opened in `GITHUB_REPO` containing an
`@claude` mention so the Claude Code GitHub app picks it up.

## Optional Variables (Spine proactive engine — Phase 4/5)

The digest emails and AI insight line stay **dormant** until these are set; the code ships
safe-without-secrets (no key ⇒ nothing sent / deterministic insight line).

| Variable | Where | Description |
|----------|-------|-------------|
| `CRON_SECRET` | Server | Bearer secret the `/api/cron/digest` route checks (constant-time). Also set in the cron trigger. |
| `RESEND_API_KEY` | Server | Resend API key for sending digests. Requires verifying `cubemetrics.com` + SPF/DKIM DNS on NameSilo. |
| `NOTIFY_FROM` | Server | Digest sender, e.g. `XP Boost <hello@cubemetrics.com>`. |
| `NOTIFY_SIGNING_SECRET` | Server | HMAC secret for one-click unsubscribe tokens. |
| `AI_NUDGES_ENABLED` / `AI_GATEWAY_API_KEY` | Server | Enable + auth the AI-written insight line (needs `npm i ai zod`; Phase 5 ships deterministic without them). |

**To activate scheduling:** add a cron hitting `/api/cron/digest` every ~30 min (**Vercel Pro**
`*/30 * * * *`, or **Supabase pg_cron**) — no `vercel.json` cron is committed (an unsupported frequency
would break the deploy). Keep the `src/lib/notify/select.ts` window ≥ the cron interval.

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
