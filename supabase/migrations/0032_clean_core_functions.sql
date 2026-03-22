-- 0032: Core functions - RLS disabled, authentication via RPC
-- Disables RLS on service tables and provides SECURITY DEFINER functions for admin operations

-- Disable RLS on all tables
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_option_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reservation_status_history DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname, schemaname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
  END LOOP;
END $$;

-- ============================================================================
-- Service Creation Functions
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
BEGIN
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
  RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_service(jsonb) TO authenticated;

-- ============================================================================
-- Service Option Creation Function
-- ============================================================================

DROP FUNCTION IF EXISTS public.admin_create_service_option(jsonb) CASCADE;

CREATE FUNCTION public.admin_create_service_option(data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_option_id uuid;
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
  RETURNING id INTO v_option_id;

  RETURN jsonb_build_object('id', v_option_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_service_option(jsonb) TO authenticated;

-- ============================================================================
-- Reservation Status Update Function
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
  SELECT status INTO v_current_status 
  FROM public.reservations 
  WHERE id = reservation_id;
  
  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('error', 'Reservation not found', 'success', false);
  END IF;

  -- Validate state transition
  IF NOT (
    (v_current_status = 'pending' AND next_status IN ('paid', 'cancelled')) OR
    (v_current_status = 'paid' AND next_status IN ('fulfilled', 'cancelled')) OR
    (v_current_status = 'fulfilled' AND next_status = 'fulfilled') OR
    (v_current_status = 'cancelled' AND next_status = 'cancelled')
  ) THEN
    RETURN jsonb_build_object(
      'error', format('Invalid transition: %s → %s', v_current_status, next_status),
      'success', false
    );
  END IF;

  UPDATE public.reservations
  SET status = next_status, updated_at = NOW()
  WHERE id = reservation_id;

  RETURN jsonb_build_object('success', true, 'status', next_status::text);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_reservation_status(uuid, public.reservation_status) TO authenticated;
