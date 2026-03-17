-- Simplify reservation state model
-- New state flow: pending → paid → fulfilled, with cancelled as separate branch
-- This removes: awaiting_confirmation, confirmed, in_progress, rejected

-- DROP dependent objects first (in proper order)
DROP VIEW IF EXISTS reservations_view CASCADE;
DROP VIEW IF EXISTS reservations_detail_view CASCADE;
DROP VIEW IF EXISTS reservations_with_payments CASCADE;
DROP POLICY IF EXISTS "Reservations: buyers cancel own" ON public.reservations CASCADE;
DROP FUNCTION IF EXISTS public.admin_reservations_kpi() CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_reservation_status(uuid, public.reservation_status) CASCADE;
DROP FUNCTION IF EXISTS public.is_valid_transition(public.reservation_status, public.reservation_status) CASCADE;
DROP FUNCTION IF EXISTS public.analytics_status_distribution() CASCADE;
DROP FUNCTION IF EXISTS public.public_find_reservation_by_reference(text) CASCADE;
DROP TABLE IF EXISTS public.reservation_state_transitions CASCADE;
DROP TABLE IF EXISTS public.valid_transitions CASCADE;

-- Create new ENUM type with simplified states
CREATE TYPE public.reservation_status_new AS ENUM (
  'pending',      -- Initial state, awaiting payment
  'paid',         -- Payment received, ready to fulfill
  'fulfilled',    -- Service completed
  'cancelled'     -- Reservation cancelled
);

-- Add new column with new type to store the migrated status
ALTER TABLE public.reservations
ADD COLUMN status_new public.reservation_status_new;

-- Migrate existing statuses to simplified model
-- pending -> pending
-- awaiting_confirmation -> paid (was waiting for payment confirmation)
-- confirmed -> paid (was payment confirmed)
-- in_progress -> paid (already doing the work but not collected yet)
-- fulfilled -> fulfilled
-- cancelled -> cancelled
-- rejected -> cancelled (similar to cancellation)
UPDATE public.reservations
SET status_new = CASE
  WHEN status::text = 'pending' THEN 'pending'::public.reservation_status_new
  WHEN status::text = 'awaiting_confirmation' THEN 'paid'::public.reservation_status_new
  WHEN status::text = 'confirmed' THEN 'paid'::public.reservation_status_new
  WHEN status::text = 'in_progress' THEN 'paid'::public.reservation_status_new
  WHEN status::text = 'fulfilled' THEN 'fulfilled'::public.reservation_status_new
  WHEN status::text = 'cancelled' THEN 'cancelled'::public.reservation_status_new
  WHEN status::text = 'rejected' THEN 'cancelled'::public.reservation_status_new
  ELSE 'pending'::public.reservation_status_new
END;

-- Drop old status column
ALTER TABLE public.reservations DROP COLUMN status;

-- Rename new status column
ALTER TABLE public.reservations RENAME COLUMN status_new TO status;

-- Alter column to NOT NULL with default
ALTER TABLE public.reservations ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN status SET DEFAULT 'pending'::public.reservation_status_new;

-- Drop old ENUM type
DROP TYPE public.reservation_status CASCADE;

-- Rename new ENUM type to standard name
ALTER TYPE public.reservation_status_new RENAME TO reservation_status;

-- Update existing history table to use correct ENUM reference
DROP TABLE IF EXISTS public.reservation_status_history CASCADE;
CREATE TABLE public.reservation_status_history (
  id bigserial primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  status public.reservation_status not null,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Create simple state transitions table
-- Only allow specific transitions: pending→paid, pending→cancelled, paid→fulfilled, paid→cancelled
CREATE TABLE public.reservation_state_transitions (
  id bigserial primary key,
  from_status public.reservation_status NOT NULL,
  to_status public.reservation_status NOT NULL,
  description text,
  unique (from_status, to_status)
);

-- Seed valid transitions
INSERT INTO public.reservation_state_transitions (from_status, to_status, description)
VALUES
  ('pending', 'paid', 'Payment confirmed'),
  ('pending', 'cancelled', 'Customer cancelled'),
  ('paid', 'fulfilled', 'Service completed'),
  ('paid', 'cancelled', 'Admin cancelled paid reservation')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- Recreate analytics functions to use new state model
-- Only count paid reservations in revenue calculations
CREATE OR REPLACE FUNCTION public.admin_reservations_kpi()
RETURNS table (
  pending_reservations bigint,
  confirmed_reservations bigint,
  revenue_this_month bigint,
  average_response_minutes numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_reservations,
    COUNT(*) FILTER (WHERE status IN ('paid', 'fulfilled')) AS confirmed_reservations,
    COALESCE(SUM(total_amount) FILTER (WHERE status IN ('paid', 'fulfilled') AND date_trunc('month', created_at) = date_trunc('month', timezone('utc', now()))), 0) AS revenue_this_month,
    (
      SELECT AVG(EXTRACT(EPOCH FROM (h.created_at - r.created_at)) / 60)
      FROM public.reservation_status_history h
      JOIN public.reservations r ON r.id = h.reservation_id
      WHERE h.status IN ('paid', 'fulfilled')
    ) AS average_response_minutes;
END;
$$;

-- Helper function to check if a state transition is valid
CREATE OR REPLACE FUNCTION public.is_valid_transition(from_status public.reservation_status, to_status public.reservation_status)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.reservation_state_transitions
    WHERE from_status = $1 AND to_status = $2
  );
$$;

-- Update admin function to validate transitions
CREATE OR REPLACE FUNCTION public.admin_update_reservation_status(reservation_id uuid, next_status public.reservation_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status public.reservation_status;
BEGIN
  -- Get current status
  SELECT status INTO current_status FROM public.reservations WHERE id = reservation_id;
  
  IF current_status IS NULL THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;
  
  -- Validate transition
  IF NOT public.is_valid_transition(current_status, next_status) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', current_status, next_status;
  END IF;
  
  -- Update status
  UPDATE public.reservations
  SET status = next_status
  WHERE id = reservation_id;
END;
$$;

-- Recreate the public_find_reservation_by_reference function
CREATE OR REPLACE FUNCTION public.public_find_reservation_by_reference(reference_code text)
RETURNS table (
  id uuid,
  public_reference text,
  status public.reservation_status,
  scheduled_for timestamptz,
  service_name text,
  service_option_name text,
  base_price integer,
  total_amount integer,
  currency_code char(3),
  buyer_email text,
  buyer_phone text,
  notes text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id,
    r.public_reference,
    r.status,
    r.scheduled_for,
    s.name,
    so.name,
    so.base_price,
    r.total_amount,
    r.currency_code,
    p.email,
    p.phone,
    r.notes
  FROM public.reservations r
  JOIN public.profiles p ON p.id = r.buyer_id
  JOIN public.service_options so ON so.id = r.service_option_id
  JOIN public.services s ON s.id = so.service_id
  WHERE r.public_reference = reference_code;
$$;

-- Recreate analytics status distribution
CREATE OR REPLACE FUNCTION public.analytics_status_distribution()
RETURNS table (
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
    WHERE created_at >= timezone('utc', now()) - INTERVAL '30 days'
    GROUP BY status
  )
  SELECT
    sc.status,
    sc.cnt,
    ROUND(100.0 * sc.cnt / SUM(sc.cnt) OVER (), 2)
  FROM status_counts sc;
$$;
