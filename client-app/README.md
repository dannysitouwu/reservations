# Client App

Vite + React front-end for buyers to discover reservation options, submit new requests, and view status updates powered by Supabase.

## Project scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Environment variables

Copy `.env.example` to `.env.local` and `.env`.

- `VITE_SUPABASE_URL` – Supabase project URL
- `VITE_SUPABASE_ANON_KEY` – anonymous key for client-side SDK
- `SUPABASE_SERVICE_ROLE_KEY` – **optional**, keep for server-side usage only

## Folder structure

```
src/
  components/      # Reusable UI pieces
  layouts/         # Layout shells and navigation
  lib/             # Supabase client and shared utilities
  pages/           # Route-level screens
  providers/       # React context providers
  routes/          # React Router configuration
  styles/          # Global and module CSS
  types/           # Domain models
  utils/           # Lightweight helpers
```

## Next steps

- Replace placeholder markup with production UI components
- Implement real forms, validations, and data fetching
- Add React Query or similar for data caching if desired
- Introduce design system / component library
```
