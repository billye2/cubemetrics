# Commands

## Development
```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build (Turbopack); prebuild regenerates the catalog
npm run build:catalog # Regenerate src/lib/modern/catalog/_generated.ts from apps/*.json
npm run build:spine   # Regenerate src/lib/spine/_generated.ts from spine/adapters/*.ts (Spine registry)
npm run start        # Start production server locally
npm run lint         # ESLint check
npm test             # Run unit tests (Vitest); pretest regenerates the catalog
npm run test:watch
```

The dev server serves the app at `http://localhost:3000/`.

## Parallel builds (agent orchestration)
```bash
node scripts/seed-backlog-issues.mjs                 # dry run: list backlog apps to queue
node scripts/seed-backlog-issues.mjs --create a b c  # seed app-build issues for apps a,b,c
# then, via the Workflow tool (opt-in): Workflow { name: "parallel-build" }
```
Full guide: [agent-orchestration.md](agent-orchestration.md#running-a-parallel-build).

## Supabase
```bash
npx supabase init                    # Initialize Supabase config (one-time)
npx supabase db push                 # Apply migrations to remote DB
npx supabase gen types typescript    # Generate TypeScript types from DB schema
```

New migrations use a **UTC timestamp** filename — `YYYYMMDDTHHMM_<slug>.sql` (e.g.
`20260529T1430_recipes.sql`), not the legacy `NNN_` sequence — so parallel build agents never
collide on a number. They sort after the existing `001`–`030` files, keeping apply order
deterministic. See [database.md](database.md) and [agent-orchestration.md](agent-orchestration.md).

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
