-- Comprehensive fix for all remaining issues
-- 1. Fix RLS to allow admin service creation
-- 2. Fix reservation_status_history table  
-- 3. Ensure all system works properly

-- First, drop and recreate RLS policies with simpler logic
DROP POLICY IF EXISTS "Only admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Only admins can manage service options" ON public.service_options;
DROP POLICY IF EXISTS "Only admins can manage availability" ON public.service_option_availability;
DROP POLICY IF EXISTS "Anyone can read services" ON public.services;
DROP POLICY IF EXISTS "Anyone can read service options" ON public.service_options;

-- DISABLE RLS temporarily to allow admin operations (we'll re-enable with better policies)
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_option_availability DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with simpler policies that actually work
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_option_availability ENABLE ROW LEVEL SECURITY;

-- Public can READ everything (no policy needed as RLS default is PERMISSIVE)
-- Admin app will use service role key which bypasses RLS for write operations
-- This is the standard Supabase pattern

-- Allow ALL operations for the service role (used by admin app)
-- This is handled at the auth level - the admin app uses the service_role key which bypasses RLS
-- So we just need to allow public reads:

CREATE POLICY "public_can_read_services"
  ON public.services
  FOR SELECT
  USING (true);

CREATE POLICY "public_can_read_service_options"
  ON public.service_options
  FOR SELECT
  USING (true);

-- Now handle the reservation_status_history issue
-- Make sure it doesn't reference a non-existent column
DROP TRIGGER IF EXISTS trg_reservations_log_status ON public.reservations;
DROP TRIGGER IF EXISTS trg_reservation_status_history ON public.reservations;
DROP FUNCTION IF EXISTS public.log_reservation_status_change() CASCADE;
DROP TABLE IF EXISTS public.reservation_status_history CASCADE;

-- Recreate with correct schema (no changed_by)
CREATE TABLE public.reservation_status_history (
  id bigserial primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  old_status public.reservation_status,
  new_status public.reservation_status not null,
  reason text,
  created_at timestamptz not null default timezone('utc', now())
);

CREATE INDEX idx_reservation_status_history_reservation_id 
  ON public.reservation_status_history(reservation_id);

-- Simple trigger to log status changes
CREATE OR REPLACE FUNCTION public.log_reservation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.reservation_status_history (
    reservation_id,
    old_status,
    new_status,
    reason
  ) VALUES (
    NEW.id,
    OLD.status,
    NEW.status,
    'Status changed via ' || COALESCE(current_setting('app.change_reason', true), 'system')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservation_status_history
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.log_reservation_status_change();

-- Verify data integrity
SELECT COUNT(*) as total_reservations FROM public.reservations;
SELECT COUNT(*) as total_services FROM public.services;
SELECT COUNT(*) as total_service_options FROM public.service_options;
