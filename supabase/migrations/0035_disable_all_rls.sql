-- ============================================================================
-- Migration 0035: DISABLE ALL RLS COMPLETELY
-- ============================================================================
-- Remove all RLS policies from ALL tables that might have them
-- This is a complete nuclear reset for RLS issues

-- 1. DROP all RLS policies from every table
DROP POLICY IF EXISTS "Allow authenticated users to read their own data" ON reservation_feedback;
DROP POLICY IF EXISTS "users_can_read_own" ON reservation_feedback;
DROP POLICY IF EXISTS "users_can_insert_own" ON reservation_feedback;
DROP POLICY IF EXISTS "users_can_update_own" ON reservation_feedback;
DROP POLICY IF EXISTS "users_can_delete_own" ON reservation_feedback;

DROP POLICY IF EXISTS "Allow authenticated to read services" ON services;
DROP POLICY IF EXISTS "Allow admin to insert services" ON services;
DROP POLICY IF EXISTS "services_read" ON services;
DROP POLICY IF EXISTS "services_create" ON services;

DROP POLICY IF EXISTS "Allow authenticated to read service options" ON service_options;
DROP POLICY IF EXISTS "Allow admin to insert service options" ON service_options;
DROP POLICY IF EXISTS "options_read" ON service_options;
DROP POLICY IF EXISTS "options_create" ON service_options;

DROP POLICY IF EXISTS "Allow authenticated to read reservations" ON reservations;
DROP POLICY IF EXISTS "Allow users to read own reservations" ON reservations;
DROP POLICY IF EXISTS "Allow authenticated to insert reservations" ON reservations;
DROP POLICY IF EXISTS "reservations_read" ON reservations;
DROP POLICY IF EXISTS "reservations_create" ON reservations;

DROP POLICY IF EXISTS "Allow authenticated on status history" ON reservation_status_history;
DROP POLICY IF EXISTS "status_history_read" ON reservation_status_history;

-- 2. DISABLE RLS completely on all tables
ALTER TABLE IF EXISTS reservation_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS service_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservation_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reservation_status_history_view DISABLE ROW LEVEL SECURITY;

-- 3. Verify tables don't have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
