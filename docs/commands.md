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
npm i -g vercel      # Install Vercel CLI
vercel env pull      # Pull environment variables to .env.local
vercel dev           # Run with Vercel dev server
vercel deploy        # Preview deployment
vercel --prod        # Production deployment
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=           # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Supabase anonymous/public key
SUPABASE_SERVICE_ROLE_KEY=          # Supabase service role key (server-only)
```
