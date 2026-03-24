-- ============================================================================
-- Migration 0039: FIX CRITICAL SCHEMA + ADD SERVICE DEACTIVATE
-- ============================================================================

-- 1. Ensure reservation_status_history has status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservation_status_history' AND column_name = 'status'
  ) THEN
    ALTER TABLE reservation_status_history
    ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- 2. Add check constraint on status if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'reservation_status_history' AND constraint_name ILIKE '%status%'
  ) THEN
    ALTER TABLE reservation_status_history
    ADD CONSTRAINT valid_status_history CHECK (
      status IN ('pending', 'paid', 'fulfilled', 'cancelled')
    );
  END IF;
END $$;

-- 3. Regenerate admin_update_reservation_status RPC
DROP FUNCTION IF EXISTS public.admin_update_reservation_status(uuid, text) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_update_reservation_status(
  reservation_id uuid,
  next_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT status INTO v_current_status 
  FROM reservations 
  WHERE id = reservation_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  -- Valid transitions
  IF v_current_status = next_status THEN
    RETURN jsonb_build_object('success', false, 'error', 'Status already ' || next_status);
  END IF;

  IF v_current_status = 'pending' AND next_status NOT IN ('paid', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'From pending only to paid or cancelled');
  END IF;

  IF v_current_status = 'paid' AND next_status NOT IN ('fulfilled', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'From paid only to fulfilled or cancelled');
  END IF;

  IF v_current_status IN ('fulfilled', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Terminal state, cannot change');
  END IF;

  -- Update status
  UPDATE reservations
  SET status = next_status, updated_at = NOW()
  WHERE id = reservation_id;

  -- Record history
  INSERT INTO reservation_status_history (
    reservation_id,
    status,
    timestamp_at,
    notes
  ) VALUES (
    reservation_id,
    next_status,
    NOW(),
    'Status changed by admin'
  );

  RETURN jsonb_build_object('success', true, 'message', 'Status updated to ' || next_status);
END $$;

GRANT EXECUTE ON FUNCTION public.admin_update_reservation_status(uuid, text) TO authenticated;

-- 4. Add service deactivate function
DROP FUNCTION IF EXISTS public.admin_deactivate_service(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_deactivate_service(
  service_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE services
  SET is_active = false, updated_at = NOW()
  WHERE id = service_id;

  UPDATE service_options
  SET is_active = false, updated_at = NOW()
  WHERE service_id = service_id;

  RETURN jsonb_build_object('success', true, 'message', 'Service deactivated');
END $$;

GRANT EXECUTE ON FUNCTION public.admin_deactivate_service(uuid) TO authenticated;

-- 5. Add delete service function
DROP FUNCTION IF EXISTS public.admin_delete_service(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_delete_service(
  service_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  DELETE FROM service_options WHERE service_id = service_id;
  DELETE FROM services WHERE id = service_id;

  RETURN jsonb_build_object('success', true, 'message', 'Service deleted');
END $$;

GRANT EXECUTE ON FUNCTION public.admin_delete_service(uuid) TO authenticated;
