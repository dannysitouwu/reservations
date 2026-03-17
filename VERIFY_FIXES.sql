-- Diagnostic queries to verify all fixes are in place

-- 1. Verify admin_update_reservation_status exists and is correct
SELECT 
  proname,
  prosecdef,
  pg_catalog.pg_get_functiondef(oid) as function_def
FROM pg_proc
WHERE proname = 'admin_update_reservation_status'
LIMIT 1;

-- 2. Verify admin_create_service_option exists with image_url parameter
SELECT 
  proname,
  prosecdef
FROM pg_proc
WHERE proname IN ('admin_create_service', 'admin_create_service_option');

-- 3. Check RLS status on service tables (should all be false = disabled)
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('services', 'service_options', 'service_option_availability');

-- 4. Verify any remaining policies (should be none)
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('services', 'service_options', 'service_option_availability');

-- 5. Check reservation statuses are valid (should only be pending/paid/fulfilled/cancelled)
SELECT DISTINCT status, COUNT(*) as count
FROM public.reservations
GROUP BY status
ORDER BY status;

-- 6. Verify total_amount is populated for all reservations
SELECT 
  COUNT(*) as total_reservations,
  COUNT(CASE WHEN total_amount IS NULL THEN 1 END) as null_amounts,
  COUNT(CASE WHEN total_amount > 0 THEN 1 END) as with_amounts
FROM public.reservations;

-- 7. Test analytics_overview function
SELECT * FROM public.analytics_overview();

-- 8. Test analytics_monthly_revenue function  
SELECT * FROM public.analytics_monthly_revenue(6);

-- 9. Test analytics_status_distribution function
SELECT * FROM public.analytics_status_distribution();

-- 10. Verify service table has data
SELECT COUNT(*) as services_count FROM public.services;
SELECT COUNT(*) as options_count FROM public.service_options;
