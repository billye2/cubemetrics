# Commands

## Development
```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
```

## Supabase
```bash
npx supabase init                    # Initialize Supabase config (one-time)
npx supabase db push                 # Apply migrations to remote DB
npx supabase gen types typescript    # Generate TypeScript types from DB schema
```

## Vercel
```bash
vercel env pull .env.local                              # Pull env vars to local
vercel dev                                               # Run with Vercel dev server
vercel --prod --yes --scope billys-projects-7712fade     # Production deploy
vercel env ls --scope billys-projects-7712fade           # List env vars
vercel logs <url> --scope billys-projects-7712fade       # View deploy logs
```

## Environment Variables
Set on Vercel (not committed to repo):
```
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anonymous/public key
NEXT_PUBLIC_SITE_URL=               # Production URL (https://cubemetrics.com)
```

## Security
Run before every commit:
```bash
# Check for leaked secrets in staged files
git diff --cached | grep -iE "sk_|eyJ|password|secret|api_key|private_key"
```
