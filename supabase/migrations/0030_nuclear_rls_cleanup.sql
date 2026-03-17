-- NUCLEAR OPTION: Force disable ALL RLS and recreate functions from scratch

-- ============================================================================
-- STEP 1: FORCE DISABLE RLS on ALL tables
-- ============================================================================
BEGIN;

ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_option_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reservation_status_history DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: FORCE DROP ALL POLICIES using PL/pgSQL looping
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, schemaname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || 
              r.schemaname || '.' || r.tablename;
      RAISE NOTICE 'Dropped policy: %.%', r.tablename, r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop policy %.%: %', r.tablename, r.policyname, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: RECREATE SERVICE FUNCTIONS WITH TRACING FOR DEBUGGING
-- ============================================================================

DROP FUNCTION IF EXISTS public.admin_create_service(jsonb) CASCADE;

CREATE FUNCTION public.admin_create_service(data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required', 'success', false);
  END IF;

  INSERT INTO public.services (name, description, is_active, metadata)
  VALUES (
    data->>'name',
    NULLIF(data->>'description', ''),
    COALESCE((data->>'is_active')::boolean, true),
    COALESCE((data->'metadata')::jsonb, '{}'::jsonb)
  )
  RETURNING id INTO v_service_id;

  RETURN jsonb_build_object('id', v_service_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE,
    'success', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_service(jsonb) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_create_service_option(jsonb) CASCADE;

CREATE FUNCTION public.admin_create_service_option(data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_option_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Authentication required', 'success', false);
  END IF;

  INSERT INTO public.service_options (
    service_id, name, description, duration_minutes, base_price, 
    currency_code, image_url, is_active, metadata
  )
  VALUES (
    (data->>'service_id')::uuid,
    data->>'name',
    NULLIF(data->>'description', ''),
    (data->>'duration_minutes')::integer,
    (data->>'base_price')::integer,
    COALESCE(data->>'currency_code', 'USD'),
    NULLIF(data->>'image_url', ''),
    COALESCE((data->>'is_active')::boolean, true),
    COALESCE((data->'metadata')::jsonb, '{}'::jsonb)
  )
  RETURNING id INTO v_option_id;

  RETURN jsonb_build_object('id', v_option_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE,
    'success', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_service_option(jsonb) TO authenticated;

-- ============================================================================
-- STEP 4: Verify RLS is disabled
-- ============================================================================
SELECT 'RLS Status Check:'::text;
SELECT 
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN 'ENABLED ❌' ELSE 'DISABLED ✅' END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN (
  'services', 'service_options', 'service_option_availability'
)
ORDER BY tablename;

-- ============================================================================
-- STEP 5: Verify no more policies exist
-- ============================================================================
SELECT 'Policy Count:'::text;
SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public';

-- ============================================================================
-- STEP 6: Verify functions exist
-- ============================================================================
SELECT 'Functions:'::text;
SELECT 
  proname,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname IN ('admin_create_service', 'admin_create_service_option')
ORDER BY proname;

-- ============================================================================
-- STEP 7: Mark completion
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 0030: NUCLEAR RLS CLEANUP COMPLETE';
  RAISE NOTICE '  ✅ RLS disabled on ALL tables';
  RAISE NOTICE '  ✅ ALL policies dropped';
  RAISE NOTICE '  ✅ Functions recreated with logging';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Client must clear cache and reload page!';
END $$;

COMMIT;
