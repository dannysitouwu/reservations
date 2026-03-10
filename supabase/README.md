# Supabase Infrastructure

This directory contains SQL migrations and operational notes for the shared Supabase project.

## Applying migrations

Use the Supabase CLI or dashboard SQL editor.

```bash
supabase db push --db-url "postgresql://<user>:<password>@db.jnrcpvcsskjyujfodhrm.supabase.co:5432/postgres"
```

or copy the contents of `migrations/0001_reservations.sql` into the SQL editor and execute.

## Migration overview

- Defines a `reservation_status` enum and helper functions (`is_worker`, `is_admin`, etc.)
- Adds `profiles`, `services`, `service_options`, `service_option_availability`, `reservations`, `reservation_status_history`, `reservation_notes`
- Provides materialized views for client/admin UIs (`service_options_view`, `reservations_view`, `reservations_detail_view`)
- Implements RPC endpoints consumed by the apps (`client_create_reservation`, `public_find_reservation_by_reference`, `admin_update_reservation_status`, `admin_reservations_kpi`, `admin_set_profile_role`)
- Enforces business transitions via triggers and `reservation_status_transitions`
- Enables RLS policies partitioned by buyer vs worker/admin roles

## Role strategy

- Buyers: default role. Can create reservations, read their own data, and cancel while pending.
- Workers: elevated read/write over all reservation data and notes.
- Admins: can promote users to worker/admin, manage all data.

Remember to keep the service role key out of browser bundles; use it only in secure runtime environments (Edge Functions, API routes, servers).
