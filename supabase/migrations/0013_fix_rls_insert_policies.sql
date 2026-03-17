-- Fix RLS policies to include WITH CHECK clause for INSERT/UPDATE operations
-- Previously, policies only had USING clause, causing RLS violations on INSERT

-- Services table: Add WITH CHECK for Admins policy
DROP POLICY IF EXISTS "Admins can modify services" ON public.services;
CREATE POLICY "Admins can modify services"
  ON public.services
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Service options table: Add WITH CHECK for Admins policy
DROP POLICY IF EXISTS "Admins can modify service options" ON public.service_options;
CREATE POLICY "Admins can modify service options"
  ON public.service_options
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Service option availability table: Add WITH CHECK for Admins policy
DROP POLICY IF EXISTS "Admins can modify availability" ON public.service_option_availability;
CREATE POLICY "Admins can modify availability"
  ON public.service_option_availability
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Also fix reservations UPDATE policy to include WITH CHECK
DROP POLICY IF EXISTS "Admins can update reservations" ON public.reservations;
CREATE POLICY "Admins can update reservations"
  ON public.reservations
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
