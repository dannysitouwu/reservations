-- Grant execution permissions to the anonymous role (used by the Admin App)
-- This allows the public API key to call these functions without a user session.

-- 1. Grant USAGE on public schema (usually default, but good to be explicit)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant SELECT on ALL TABLES in public schema to anon
-- This covers profiles, reservations, services, etc.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Grant INSERT/UPDATE/DELETE on specific tables if needed
-- Note: RLS Policies still apply! This just allows the "attempt".
-- For admin app managing reservations:
GRANT INSERT, UPDATE, DELETE ON TABLE public.reservations TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.reservation_status_history TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.reservation_notes TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.services TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.service_options TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.service_option_availability TO anon, authenticated, service_role;

-- 4. Grant EXECUTE on ALL FUNCTIONS in public schema
-- This covers all your analytics_* and admin_* functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Ensure future tables/functions also get these permissions (Optional but recommended for dev)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
