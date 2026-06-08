# E2E tests (Playwright)

Opt-in end-to-end smoke tests that drive the **live site** as a logged-in user.
Not part of `npm test` or CI — run them on demand.

## ⚠️ Never commit secrets

`e2e/.auth/` is git-ignored and **must stay that way**. It holds:

- `state.json` — a **live Supabase session** (an auth token; committing it = account takeover)
- `e2e.env` — the generated test-user email + password

Don't `git add -f` anything under `e2e/.auth/`. The real test-account email lives in
env, never in source, so the public repo names no real account.

## Prerequisite: email/password auth

Real users sign in with Google only. The harness logs the test user in via
email+password, so the Supabase project must have the **Email provider enabled**
(Dashboard → Authentication → Sign In / Providers → Email). Keep **"Allow new users
to sign up" OFF** — only the admin-provisioned test user can then log in; the public
auth policy is unchanged.

Until that's enabled, `auth.setup.ts` fails fast with a clear message.

## Run

```bash
vercel env pull .env.local   # provides Supabase URL + keys (one-time)
npm run test:e2e             # provisions the test user, then runs against https://cubemetrics.com
```

- `npm run e2e:provision` — idempotently create/reset the throwaway test user (service-role; password generated to `e2e/.auth/e2e.env`, never printed).
- `npm run test:e2e:headed` — same, with a visible browser.
- Point elsewhere with `E2E_BASE_URL=http://localhost:3000 npx playwright test`.

## Files

- `auth.setup.ts` — headless sign-in via `@supabase/ssr` → saves `storageState`.
- `focus.spec.ts` — Focus flow: intention → run → reflect → journal entry → self-cleanup.
- `env.ts` / `env.mjs` — env loaders (Playwright/TS vs. plain-node provision script).
- `../scripts/e2e/provision-user.mjs` — test-user provisioning.
