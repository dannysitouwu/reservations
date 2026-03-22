-- DEBUG: Verify RPC functions and test them

-- Step 1: Check if functions exist and are callable
SELECT 
  p.proname as function_name,
  p.prosecdef as is_security_definer,
  r.rolname as owner
FROM pg_proc p
JOIN pg_roles r ON p.proowner = r.oid
WHERE p.proname IN ('admin_create_service', 'admin_create_service_option', 'admin_update_reservation_status')
ORDER BY p.proname;

-- Step 2: Test admin_create_service_option with SIMPLE test data
-- This will help us see if the function works at all
DO $$
DECLARE
  v_service_id uuid;
  v_result jsonb;
BEGIN
  -- First create a test service
  INSERT INTO public.services (name, is_active)
  VALUES ('TEST SERVICE', true)
  RETURNING id INTO v_service_id;
  
  RAISE NOTICE 'Test service created with ID: %', v_service_id;
  
  -- Now test the function
  SELECT admin_create_service_option(jsonb_build_object(
    'service_id', v_service_id::text,
    'name', 'Test Option',
    'duration_minutes', 60,
    'base_price', 9999,
    'currency_code', 'USD',
    'image_url', 'https://example.com/test.jpg',
    'is_active', true
  )) INTO v_result;
  
  RAISE NOTICE 'Function result: %', v_result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR: %', SQLERRM;
END $$;

-- Step 3: Verify storage bucket configuration (if accessible)
-- List all buckets
SELECT name, public FROM storage.buckets WHERE name LIKE '%service%' OR name LIKE '%photo%';

-- Step 4: Check if any RLS policies still exist that shouldn't
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('services', 'service_options')
ORDER BY tablename, policyname;

-- Step 5: Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('services', 'service_options', 'service_option_availability')
ORDER BY tablename;

-- Step 6: Test with auth context (simulating what admin app is doing)
-- This will show if there's an auth context issue
DO $$
BEGIN
  RAISE NOTICE 'Current user (functional test): %', current_user;
  RAISE NOTICE 'Session user: %', session_user;
  RAISE NOTICE 'auth.uid() value: %', auth.uid();
  RAISE NOTICE 'Test complete';
END $$;
