-- ============================================================================
-- Migration 0036: FORCE DISABLE ALL RLS - NUCLEAR VERSION
-- ============================================================================
-- This is a direct SQL approach that FORCES RLS to be disabled on every table

-- Force disable RLS on all public tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I DISABLE ROW LEVEL SECURITY', t);
    RAISE NOTICE 'Disabled RLS on: %', t;
  END LOOP;
END $$;

-- Double-check: verify RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN 'RLS ENABLED' ELSE 'RLS DISABLED' END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify no policies exist
SELECT * FROM pg_policies WHERE schemaname = 'public';
