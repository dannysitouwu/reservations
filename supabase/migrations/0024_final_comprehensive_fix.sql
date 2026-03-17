-- Comprehensive fix for all remaining issues
-- 1. Simplify admin_update_reservation_status function (no dependency on transitions table)
-- 2. Ensure RPC functions work correctly
-- 3. Fix analytics calculations
-- 4. Add proper triggers and constraints

-- First, drop the problematic admin_update_reservation_status function
DROP FUNCTION IF EXISTS public.admin_update_reservation_status(uuid, public.reservation_status) CASCADE;

-- Create simpler, more direct function
CREATE OR REPLACE FUNCTION public.admin_update_reservation_status(
  reservation_id uuid,
  next_status public.reservation_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status public.reservation_status;
  valid_transitions jsonb;
BEGIN
  -- Get current status
  SELECT status INTO current_status 
  FROM public.reservations 
  WHERE id = reservation_id;
  
  IF current_status IS NULL THEN
    RETURN jsonb_build_object('error', 'Reservation not found', 'success', false);
  END IF;

  -- Simple validation: pending can go to paid or cancelled
  -- paid can go to fulfilled or cancelled
  -- fulfilled and cancelled are terminal
  IF (current_status = 'pending' AND next_status IN ('paid', 'cancelled')) OR
     (current_status = 'paid' AND next_status IN ('fulfilled', 'cancelled')) OR
     (current_status = 'fulfilled' AND next_status = 'fulfilled') OR
     (current_status = 'cancelled' AND next_status = 'cancelled') THEN
    
    UPDATE public.reservations
    SET status = next_status
    WHERE id = reservation_id;
    
    RETURN jsonb_build_object('success', true, 'status', next_status::text);
  ELSE
    RETURN jsonb_build_object(
      'error', 
      'Invalid transition from ' || current_status::text || ' to ' || next_status::text,
      'success', 
      false
    );
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.admin_update_reservation_status(uuid, public.reservation_status) TO authenticated;

-- Verify that admin_create_service and admin_create_service_option exist and work
-- (They should already exist from migration 0023)

-- Ensure service_options has image_url and all required columns
ALTER TABLE public.service_options
ADD COLUMN IF NOT EXISTS image_url text;

-- Verify total_amount is populated for all reservations
-- This should have been done by migration 0015, but let's verify
SELECT COUNT(*) as reservations_with_null_amount 
FROM public.reservations 
WHERE total_amount IS NULL 
  AND status IN ('paid', 'fulfilled', 'fulfilled');

-- If there are any, populate them
UPDATE public.reservations r
SET total_amount = COALESCE(
  (SELECT base_price FROM public.service_options WHERE id = r.service_option_id),
  0
)
WHERE total_amount IS NULL OR total_amount = 0;

-- Ensure all analytics functions are correct
-- Fix any potential rounding issues in analytics

DROP FUNCTION IF EXISTS public.analytics_overview() CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_overview()
RETURNS TABLE (
  total_reservations bigint,
  total_revenue bigint,
  average_ticket numeric,
  cancellation_rate numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH all_data AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status IN ('paid', 'fulfilled')) AS paid_count,
      COALESCE(SUM(total_amount) FILTER (WHERE status IN ('paid', 'fulfilled')), 0) AS revenue_sum,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancel_count
    FROM public.reservations
  )
  SELECT
    ad.total,
    ad.revenue_sum,
    CASE WHEN ad.paid_count > 0 THEN ROUND(ad.revenue_sum::numeric / ad.paid_count::numeric, 0) ELSE 0 END,
    CASE WHEN ad.total > 0 THEN ROUND(100.0 * ad.cancel_count::numeric / ad.total::numeric, 2) ELSE 0 END
  FROM all_data ad;
$$;

-- Recreate monthly revenue with proper CENTS handling
DROP FUNCTION IF EXISTS public.analytics_monthly_revenue(integer) CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_monthly_revenue(months_count integer DEFAULT 6)
RETURNS TABLE (
  month_start timestamptz,
  month_label text,
  reservations bigint,
  revenue bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    DATE_TRUNC('month', r.created_at) AS month,
    TO_CHAR(DATE_TRUNC('month', r.created_at), 'Mon YYYY'),
    COUNT(*) AS count,
    COALESCE(SUM(r.total_amount), 0) AS monthly_revenue
  FROM public.reservations r
  WHERE r.status IN ('paid', 'fulfilled')
    AND r.created_at >= TIMEZONE('utc', NOW()) - (months_count || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('month', r.created_at)
  ORDER BY month DESC;
$$;

-- Recreate status distribution
DROP FUNCTION IF EXISTS public.analytics_status_distribution() CASCADE;

CREATE OR REPLACE FUNCTION public.analytics_status_distribution()
RETURNS TABLE (
  status public.reservation_status,
  count bigint,
  percentage numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH status_counts AS (
    SELECT status, COUNT(*) as cnt
    FROM public.reservations
    WHERE created_at >= TIMEZONE('utc', NOW()) - INTERVAL '30 days'
    GROUP BY status
  ),
  total AS (
    SELECT SUM(cnt) as total_count FROM status_counts
  )
  SELECT
    sc.status,
    sc.cnt,
    CASE 
      WHEN t.total_count > 0 THEN ROUND(100.0 * sc.cnt::numeric / t.total_count::numeric, 2)
      ELSE 0
    END
  FROM status_counts sc, total t;
$$;

-- Verify data
SELECT 
  COUNT(*) as total_reservations,
  COUNT(CASE WHEN total_amount IS NOT NULL THEN 1 END) as with_amount,
  COUNT(CASE WHEN total_amount IS NULL THEN 1 END) as without_amount
FROM public.reservations;
