-- Diagnostic queries to check data integrity

-- 1. Check all reservations and their associated services
SELECT 
  r.id,
  r.public_reference,
  r.status,
  r.service_option_id,
  so.id as option_id,
  so.name as option_name,
  so.service_id,
  s.id as service_id,
  s.name as service_name
FROM public.reservations r
LEFT JOIN public.service_options so ON so.id = r.service_option_id
LEFT JOIN public.services s ON s.id = so.service_id
ORDER BY r.created_at DESC
LIMIT 20;

-- 2. Check service_options
SELECT 
  id,
  service_id,
  name,
  base_price,
  currency_code
FROM public.service_options
LIMIT 20;

-- 3. Check services
SELECT 
  id,
  name,
  description,
  is_active
FROM public.services
LIMIT 20;

-- 4. Test the view
SELECT 
  id,
  public_reference,
  service_name,
  service_option_name,
  status,
  total_amount
FROM public.reservations_detail_view
LIMIT 20;

-- 5. Check for any duplicate or problematic service names
SELECT COUNT(DISTINCT id), name FROM public.services GROUP BY name;
