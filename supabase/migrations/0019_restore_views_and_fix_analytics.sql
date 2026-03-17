-- Recreate views that were dropped in 0018
-- Also fix analytics functions to handle new enum

-- Recreate reservations_view
CREATE OR REPLACE VIEW public.reservations_view AS
SELECT
  r.id,
  r.public_reference,
  r.status,
  r.scheduled_for,
  r.created_at,
  r.updated_at,
  r.buyer_id,
  buyer.email AS buyer_email,
  buyer.full_name AS buyer_name,
  r.assigned_worker_id,
  worker.full_name AS assigned_worker_name,
  r.total_amount,
  r.currency_code
FROM public.reservations r
JOIN public.profiles buyer ON buyer.id = r.buyer_id
LEFT JOIN public.profiles worker ON worker.id = r.assigned_worker_id;

-- Recreate reservations_detail_view
CREATE OR REPLACE VIEW public.reservations_detail_view AS
SELECT
  r.id,
  r.public_reference,
  r.status,
  r.scheduled_for,
  r.created_at,
  r.updated_at,
  r.notes,
  r.internal_notes,
  r.total_amount,
  r.currency_code,
  r.buyer_id,
  buyer.email AS buyer_email,
  buyer.full_name AS buyer_name,
  buyer.phone AS buyer_phone,
  r.service_option_id,
  so.name AS service_option_name,
  so.duration_minutes,
  so.base_price,
  s.name AS service_name,
  r.assigned_worker_id,
  worker.full_name AS assigned_worker_name
FROM public.reservations r
JOIN public.profiles buyer ON buyer.id = r.buyer_id
LEFT JOIN public.profiles worker ON worker.id = r.assigned_worker_id
LEFT JOIN public.service_options so ON so.id = r.service_option_id
LEFT JOIN public.services s ON s.id = so.service_id;

-- Recreate reservations_with_payments view (if it existed)
CREATE OR REPLACE VIEW public.reservations_with_payments AS
SELECT
  r.id,
  r.public_reference,
  r.status,
  r.total_amount,
  r.currency_code,
  r.created_at,
  buyer.full_name AS buyer_name,
  buyer.email AS buyer_email,
  so.name AS service_option_name,
  s.name AS service_name
FROM public.reservations r
JOIN public.profiles buyer ON buyer.id = r.buyer_id
LEFT JOIN public.service_options so ON so.id = r.service_option_id
LEFT JOIN public.services s ON s.id = so.service_id
WHERE r.status IN ('paid', 'fulfilled');

-- Fix analytics functions to only reference new ENUM values

-- Drop old functions
DROP FUNCTION IF EXISTS public.analytics_overview() CASCADE;
DROP FUNCTION IF EXISTS public.analytics_monthly_revenue(integer) CASCADE;
DROP FUNCTION IF EXISTS public.analytics_status_distribution() CASCADE;
DROP FUNCTION IF EXISTS public.analytics_service_performance(integer) CASCADE;

-- Recreate analytics_overview - only count paid/fulfilled for revenue
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
  WITH stats AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status IN ('paid', 'fulfilled')) AS paid_count,
      COALESCE(SUM(total_amount) FILTER (WHERE status IN ('paid', 'fulfilled')), 0) AS revenue,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancellations
    FROM public.reservations
  )
  SELECT
    stats.total,
    stats.revenue,
    CASE
      WHEN stats.paid_count > 0 THEN ROUND(stats.revenue / stats.paid_count::numeric)
      ELSE 0
    END,
    CASE
      WHEN stats.total > 0 THEN ROUND(100.0 * stats.cancellations / stats.total::numeric, 2)
      ELSE 0
    END
  FROM stats;
$$;

-- Recreate analytics_monthly_revenue
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
  WITH monthly AS (
    SELECT
      DATE_TRUNC('month', r.created_at) AS month,
      COUNT(*) AS count,
      COALESCE(SUM(r.total_amount), 0) AS monthly_revenue
    FROM public.reservations r
    WHERE r.status IN ('paid', 'fulfilled')
      AND r.created_at >= TIMEZONE('utc', NOW()) - (months_count || ' months')::INTERVAL
    GROUP BY DATE_TRUNC('month', r.created_at)
  )
  SELECT
    m.month,
    TO_CHAR(m.month, 'Mon YYYY'),
    m.count,
    m.monthly_revenue
  FROM monthly m
  ORDER BY m.month DESC;
$$;

-- Recreate analytics_status_distribution
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
  )
  SELECT
    sc.status,
    sc.cnt,
    ROUND(100.0 * sc.cnt / NULLIF(SUM(sc.cnt) OVER (), 0), 2)
  FROM status_counts sc;
$$;

-- Recreate analytics_service_performance
CREATE OR REPLACE FUNCTION public.analytics_service_performance(limit_count integer DEFAULT 5)
RETURNS TABLE (
  service_name text,
  reservations bigint,
  revenue bigint,
  average_ticket numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.name,
    COUNT(r.id),
    COALESCE(SUM(r.total_amount), 0),
    CASE
      WHEN COUNT(r.id) > 0 THEN ROUND(SUM(r.total_amount)::numeric / COUNT(r.id), 0)
      ELSE 0
    END
  FROM public.reservations r
  JOIN public.service_options so ON so.id = r.service_option_id
  JOIN public.services s ON s.id = so.service_id
  WHERE r.status IN ('paid', 'fulfilled')
    AND r.created_at >= TIMEZONE('utc', NOW()) - INTERVAL '90 days'
  GROUP BY s.id, s.name
  ORDER BY COUNT(r.id) DESC
  LIMIT limit_count;
$$;

-- Verify all existing data has valid status values (should be: pending, paid, fulfilled, cancelled)
-- Check if any "rejected" values remain
SELECT COUNT(*) as rejected_count FROM public.reservations WHERE status::text = 'rejected';

-- If rejected_count > 0, this query will help identify them:
-- SELECT id, public_reference, status FROM public.reservations WHERE status::text = 'rejected';
