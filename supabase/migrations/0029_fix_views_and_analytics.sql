-- Fix 1: Update reservations_view to include buyer name and email
-- Fix 2: Ensure analytics_status_distribution returns proper data
-- Fix 3: Verify state persistence

-- ============================================================================
-- STEP 1: DROP and RECREATE reservations_view WITH BUYER INFO
-- ============================================================================
DROP VIEW IF EXISTS public.reservations_view CASCADE;

CREATE VIEW public.reservations_view AS
SELECT
  r.id,
  r.public_reference,
  r.status,
  r.buyer_id,
  r.service_option_id,
  r.scheduled_for,
  r.total_amount,
  r.created_at,
  r.updated_at,
  so.name AS service_name,
  s.name AS service_category,
  so.base_price,
  so.duration_minutes,
  so.image_url,
  (r.metadata ->> 'contact_preference') as contact_preference,
  -- BUYER INFO
  p.email as buyer_email,
  p.full_name as buyer_name
FROM public.reservations r
JOIN public.service_options so ON r.service_option_id = so.id
JOIN public.services s ON so.service_id = s.id
JOIN public.profiles p ON r.buyer_id = p.id;

GRANT SELECT ON public.reservations_view TO authenticated;

-- ============================================================================
-- STEP 2: Verify analytics_status_distribution is working
-- ============================================================================
DROP FUNCTION IF EXISTS public.analytics_status_distribution() CASCADE;

CREATE FUNCTION public.analytics_status_distribution()
RETURNS TABLE (
  status public.reservation_status,
  reservations bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    r.status,
    COUNT(*) as count
  FROM public.reservations r
  GROUP BY r.status
  ORDER BY r.status;
$$;

GRANT EXECUTE ON FUNCTION public.analytics_status_distribution() TO authenticated;

-- ============================================================================
-- STEP 3: Test analytics functions
-- ============================================================================
SELECT COUNT(*) as total_reservations FROM public.reservations;
SELECT status, COUNT(*) as count FROM public.reservations GROUP BY status;
SELECT * FROM public.analytics_status_distribution();
SELECT * FROM public.analytics_overview();
SELECT * FROM public.analytics_monthly_revenue(6);

-- ============================================================================
-- STEP 4: Verify state persistence (check for any triggers that revert)
-- ============================================================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'reservations'
ORDER BY trigger_name;

-- ============================================================================
-- STEP 5: Log deployment
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 0029: Views and Analytics Fixed';
  RAISE NOTICE '  - reservations_view now includes buyer_name and buyer_email';
  RAISE NOTICE '  - analytics_status_distribution simplified';
  RAISE NOTICE '  - Total reservations verified';
END $$;
