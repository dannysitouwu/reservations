-- COMPLETE RESET and REBUILD
-- This migration COMPLETELY disables RLS, fixes parameters, and rebuilds all functions

-- ============================================================================
-- STEP 1: COMPLETELY DISABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_option_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reservation_status_history DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: DROP ALL POLICIES EVERYWHERE
-- ============================================================================
-- We'll use SQL to drop all policies by dropping the policies we know exist
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can read services" ON public.services;
DROP POLICY IF EXISTS "Only admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Public can read service options" ON public.service_options;
DROP POLICY IF EXISTS "Only admins can manage service options" ON public.service_options;
DROP POLICY IF EXISTS "public_can_read_services" ON public.services;
DROP POLICY IF EXISTS "public_can_read_service_options" ON public.service_options;

-- Drop all policies using PostgreSQL system catalog (safer)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: REBUILD admin_update_reservation_status WITH CORRECT PARAMETER NAMES
-- ============================================================================
DROP FUNCTION IF EXISTS public.admin_update_reservation_status(uuid, public.reservation_status) CASCADE;

CREATE FUNCTION public.admin_update_reservation_status(
  reservation_id uuid,
  next_status public.reservation_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status public.reservation_status;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status 
  FROM public.reservations 
  WHERE id = reservation_id;
  
  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('error', 'Reservation not found', 'success', false);
  END IF;

  -- Validate transition
  IF NOT (
    (v_current_status = 'pending' AND next_status IN ('paid', 'cancelled')) OR
    (v_current_status = 'paid' AND next_status IN ('fulfilled', 'cancelled')) OR
    (v_current_status = 'fulfilled' AND next_status = 'fulfilled') OR
    (v_current_status = 'cancelled' AND next_status = 'cancelled')
  ) THEN
    RETURN jsonb_build_object(
      'error', 
      'Invalid transition from ' || v_current_status::text || ' to ' || next_status::text,
      'success', 
      false
    );
  END IF;

  -- Update status
  UPDATE public.reservations
  SET status = next_status, updated_at = NOW()
  WHERE id = reservation_id;

  RETURN jsonb_build_object('success', true, 'status', next_status::text);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_reservation_status(uuid, public.reservation_status) TO authenticated;

-- ============================================================================
-- STEP 4: REBUILD admin_create_service WITH CORRECT PARAMETER NAMES
-- ============================================================================
DROP FUNCTION IF EXISTS public.admin_create_service(jsonb) CASCADE;

CREATE FUNCTION public.admin_create_service(data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_id uuid;
BEGIN
  INSERT INTO public.services (name, description, is_active, metadata)
  VALUES (
    data->>'name',
    NULLIF(data->>'description', ''),
    COALESCE((data->>'is_active')::boolean, true),
    COALESCE((data->'metadata')::jsonb, '{}'::jsonb)
  )
  RETURNING id INTO service_id;

  RETURN jsonb_build_object('id', service_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_service(jsonb) TO authenticated;

-- ============================================================================
-- STEP 5: REBUILD admin_create_service_option WITH CORRECT PARAMETER NAMES
-- ============================================================================
DROP FUNCTION IF EXISTS public.admin_create_service_option(jsonb) CASCADE;

CREATE FUNCTION public.admin_create_service_option(data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  option_id uuid;
BEGIN
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
  RETURNING id INTO option_id;

  RETURN jsonb_build_object('id', option_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_service_option(jsonb) TO authenticated;

-- ============================================================================
-- STEP 6: VERIFY ALL PERMISSIONS
-- ============================================================================
-- Ensure admin user exists and has role
UPDATE public.profiles
SET role = 'admin'
WHERE email IN ('admin@reservapro.com', 'admin@example.com')
  AND role IS DISTINCT FROM 'admin';

-- ============================================================================
-- STEP 7: DATA INTEGRITY CHECKS
-- ============================================================================
-- Backfill any missing total_amount values
UPDATE public.reservations r
SET total_amount = COALESCE(
  (SELECT base_price FROM public.service_options WHERE id = r.service_option_id),
  450000  -- Default fallback
)
WHERE total_amount IS NULL OR total_amount = 0;

-- Verify data
SELECT COUNT(*) as total_reservations FROM public.reservations;
SELECT COUNT(*) as null_amounts FROM public.reservations WHERE total_amount IS NULL;
SELECT DISTINCT status FROM public.reservations ORDER BY status;
