# Admin App

Administrative Vite + React dashboard for workers to monitor and fulfil reservations using Supabase as the backend.

## Project scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Environment variables

Copy `.env.example` to `.env.local` and `.env`.

- `VITE_SUPABASE_URL` – Supabase project URL shared with client app
- `VITE_SUPABASE_ANON_KEY` – anonymous key for client-side SDK
- `SUPABASE_SERVICE_ROLE_KEY` – **server-side only**, do not expose in browser bundles

## Folder structure

```
src/
  components/      # Table, chart, and widget primitives
  features/        # Reservation, user, and analytics modules
  layouts/         # Admin shell with sidebar + topbar
  lib/             # Supabase client
  pages/           # Route-level pages
  providers/       # Auth / session context
  routes/          # React Router configuration
  styles/          # Global styles and tokens
  types/           # Domain models
  utils/           # Helper utilities
```

## Next steps

- Wire in real charts and tables with design system components
- Add filters, pagination, and inline updates for reservations
- Implement optimistic updates with React Query or TanStack Query
- Harden access control with Supabase Auth + server-side verification
```
