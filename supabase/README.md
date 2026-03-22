# Supabase Infrastructure

This directory contains SQL migrations and operational notes for the shared Supabase project.

## Applying migrations

**Canonical path:** run the whole chain in order (CLI is easiest).

```bash
supabase link
supabase db push
```

For a **single SQL file** that mirrors all migrations (review before running anywhere):

```bash
bash supabase/scripts/concat-migrations.sh > supabase/SETUP_DATABASE.full.generated.sql
```

See `SETUP_DATABASE.sql` in this folder for the full bootstrap story. The old monolithic script is preserved as `SETUP_DATABASE.legacy.sql` (pre–migration-chain model).

**Storage migration 0038** must not use `ALTER TABLE storage.objects` on Supabase hosted (ownership error); policies-only is in `migrations/0038_storage_service_photos_policies.sql`.

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
- Admins (`admin`) and super admins (`super_admin`): shared elevated access for operations (reservations, analytics, etc.). Only **`super_admin`** may change other users’ roles (see migration `0037` / `admin_set_profile_role`).

Remember to keep the service role key out of browser bundles; use it only in secure runtime environments (Edge Functions, API routes, servers).
