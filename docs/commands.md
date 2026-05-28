# Commands

## Development
```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build (Turbopack)
npm run start        # Start production server locally
npm run lint         # ESLint check
npm test             # Run unit + E2E tests
npm run test:watch
```

The dev server serves both surfaces:
- `http://localhost:3000/` — modern UI
- `http://localhost:3000/classic` — BBS terminal

## Supabase
```bash
npx supabase init                    # Initialize Supabase config (one-time)
npx supabase db push                 # Apply migrations to remote DB
npx supabase gen types typescript    # Generate TypeScript types from DB schema
```

## Vercel

### Automatic
Pushing to `master` triggers a production deploy via the Vercel GitHub App.
Pushing to any other branch triggers a preview deploy with a unique URL.

### Manual (requires local Vercel CLI auth)
```bash
vercel env pull .env.local                                # Pull env vars to local
vercel dev                                                 # Run with Vercel dev server
vercel --prod --yes --scope billys-projects-7712fade       # Production deploy
vercel env ls --scope billys-projects-7712fade             # List env vars
vercel logs <url> --scope billys-projects-7712fade         # View deploy logs
```

If `vercel` errors with `You do not have access to the specified account`, the Vercel CLI is not authed for this machine — either run `vercel login` or use the dashboard.

## Environment Variables
Set on Vercel (not committed to repo):
```
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anonymous/public key
NEXT_PUBLIC_SITE_URL=               # Production URL (https://cubemetrics.com)
SUPABASE_SERVICE_ROLE_KEY=          # Optional, for migrations/admin tasks (not used at runtime)
```

## Security
Run before every commit:
```bash
git diff --cached | grep -iE "sk_|eyJ|password|secret|api_key|private_key"
```
