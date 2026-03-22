-- 0033: Database views and analytics functions
-- Provides views for frontend consumption and analytics data

-- ============================================================================
-- Reservations View (for admin dashboard)
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
  (r.metadata ->> 'contact_preference') AS contact_preference,
  p.email AS buyer_email,
  p.full_name AS buyer_name
FROM public.reservations r
JOIN public.service_options so ON r.service_option_id = so.id
JOIN public.services s ON so.service_id = s.id
JOIN public.profiles p ON r.buyer_id = p.id;

GRANT SELECT ON public.reservations_view TO authenticated;

-- ============================================================================
-- Reservation Detail View (for user mobile app - filters by auth user)
-- ============================================================================

DROP VIEW IF EXISTS public.reservations_detail_view CASCADE;

CREATE VIEW public.reservations_detail_view AS
SELECT
  r.id,
  r.public_reference,
  r.status,
  r.buyer_id,
  (r.metadata ->> 'contact_preference') AS contact_preference,
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

GRANT SELECT ON public.reservations_detail_view TO authenticated;

-- ============================================================================
-- Analytics Functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.analytics_overview() CASCADE;

CREATE FUNCTION public.analytics_overview()
RETURNS TABLE (
  total_reservations bigint,
  total_revenue bigint,
  average_ticket numeric,
  cancellation_rate numeric
)
LANGUAGE sql
STABLE
AS $$
  WITH stats AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status IN ('paid', 'fulfilled')) AS paid_count,
      COALESCE(SUM(total_amount) FILTER (WHERE status IN ('paid', 'fulfilled')), 0) AS revenue_sum,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancel_count
    FROM public.reservations
  )
  SELECT
    stats.total,
    stats.revenue_sum,
    CASE WHEN stats.paid_count > 0 THEN ROUND(stats.revenue_sum::numeric / stats.paid_count::numeric, 0) ELSE 0 END,
    CASE WHEN stats.total > 0 THEN ROUND(100.0 * stats.cancel_count::numeric / stats.total::numeric, 2) ELSE 0 END
  FROM stats;
$$;

DROP FUNCTION IF EXISTS public.analytics_monthly_revenue(integer) CASCADE;

CREATE FUNCTION public.analytics_monthly_revenue(months_count integer DEFAULT 6)
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

GRANT EXECUTE ON FUNCTION public.analytics_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_monthly_revenue(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_status_distribution() TO authenticated;
