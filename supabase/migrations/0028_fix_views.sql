-- Fix views to ensure correct joins and data integrity

-- Drop existing views that might have problems
DROP VIEW IF EXISTS public.reservations_detail_view CASCADE;
DROP VIEW IF EXISTS public.reservations_view CASCADE;

-- Create clean reservations_view for admin dashboard
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
  (r.metadata ->> 'contact_preference') as contact_preference
FROM public.reservations r
JOIN public.service_options so ON r.service_option_id = so.id
JOIN public.services s ON so.service_id = s.id;

-- Create detailed reservations_detail_view for user app
CREATE VIEW public.reservations_detail_view AS
SELECT
  r.id,
  r.public_reference,
  r.status,
  r.buyer_id,
  (r.metadata ->> 'contact_preference') as contact_preference,
  r.scheduled_for,
  r.created_at,
  r.notes,
  COALESCE(so.name, 'Servicio desconocido') AS service_name,
  so.duration_minutes,
  so.base_price,
  so.image_url,
  COALESCE(s.name, 'Categoría desconocida') AS service_category
FROM public.reservations r
LEFT JOIN public.service_options so ON r.service_option_id = so.id
LEFT JOIN public.services s ON so.service_id = s.id
WHERE r.buyer_id = auth.uid();

-- Grant permissions
GRANT SELECT ON public.reservations_view TO authenticated;
GRANT SELECT ON public.reservations_detail_view TO authenticated;

-- Verify views work
SELECT COUNT(*) as total_reservations FROM public.reservations;
SELECT COUNT(*) as view_count FROM public.reservations_view;
