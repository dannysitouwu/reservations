-- Enable Row Level Security (RLS) on all tables
-- This migration adds security policies to prevent unauthorized access

-- ============================================================================
-- 0. HELPER FUNCTIONS - Check user role without recursion
-- ============================================================================

-- Update existing functions to use SECURITY DEFINER to prevent RLS recursion
DROP FUNCTION IF EXISTS public.current_profile_role() CASCADE;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Drop old is_worker and is_admin if they exist
DROP FUNCTION IF EXISTS public.is_worker() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Create new is_admin with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Recreate is_worker for consistency
CREATE OR REPLACE FUNCTION public.is_worker()
RETURNS boolean AS $$
  SELECT coalesce(public.current_profile_role() in ('worker', 'admin'), false);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Recreate is_admin() variant without parameter for backward compatibility
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT coalesce(public.current_profile_role() = 'admin', false);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 1. PROFILES TABLE - Users can read themselves, admins read all
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. RESERVATIONS TABLE - Buyers see own, workers see assigned, admins see all
-- ============================================================================
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can read own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Assigned workers can read reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can read all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Buyers can insert own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can update reservations" ON public.reservations;

CREATE POLICY "Buyers can read own reservations"
  ON public.reservations
  FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Assigned workers can read reservations"
  ON public.reservations
  FOR SELECT
  USING (
    assigned_worker_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can read all reservations"
  ON public.reservations
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Buyers can insert own reservations"
  ON public.reservations
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins can update reservations"
  ON public.reservations
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- ============================================================================
-- 3. RESERVATION_FEEDBACK TABLE - Users read/write own feedback
-- ============================================================================
ALTER TABLE public.reservation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own feedback" ON public.reservation_feedback;
DROP POLICY IF EXISTS "Admins can read all feedback" ON public.reservation_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.reservation_feedback;
DROP POLICY IF EXISTS "Users can update own feedback" ON public.reservation_feedback;

CREATE POLICY "Users can read own feedback"
  ON public.reservation_feedback
  FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Admins can read all feedback"
  ON public.reservation_feedback
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own feedback"
  ON public.reservation_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update own feedback"
  ON public.reservation_feedback
  FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- ============================================================================
-- 4. SERVICE TABLES - Public read (anyone can see services), only admin can modify
-- ============================================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read services" ON public.services;
DROP POLICY IF EXISTS "Admins can modify services" ON public.services;

CREATE POLICY "Anyone can read services"
  ON public.services
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify services"
  ON public.services
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================================
-- 5. SERVICE OPTIONS - Public read, admin modify
-- ============================================================================
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read service options" ON public.service_options;
DROP POLICY IF EXISTS "Admins can modify service options" ON public.service_options;

CREATE POLICY "Anyone can read service options"
  ON public.service_options
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify service options"
  ON public.service_options
  FOR ALL
  WITH CHECK (public.is_admin(auth.uid()))
  USING (public.is_admin(auth.uid()));

-- ============================================================================
-- 6. SERVICE OPTION AVAILABILITY - Public read, admin modify
-- ============================================================================
ALTER TABLE public.service_option_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read availability" ON public.service_option_availability;
DROP POLICY IF EXISTS "Admins can modify availability" ON public.service_option_availability;

CREATE POLICY "Anyone can read availability"
  ON public.service_option_availability
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify availability"
  ON public.service_option_availability
  FOR ALL
  WITH CHECK (public.is_admin(auth.uid()))
  USING (public.is_admin(auth.uid()));

-- ============================================================================
-- 7. RESERVATION STATUS TRANSITIONS - Admin only
-- ============================================================================
ALTER TABLE public.reservation_status_transitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read transitions" ON public.reservation_status_transitions;

CREATE POLICY "Admins can read transitions"
  ON public.reservation_status_transitions
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- ============================================================================
-- 8. VIEWS - No RLS needed (inherit permissions from base tables)
-- But restrict SELECT to authenticated users for most views
-- ============================================================================

-- reservations_view, reservations_detail_view, service_options_view, 
-- feedback_summary_view use SECURITY DEFINER so they follow own permissions
