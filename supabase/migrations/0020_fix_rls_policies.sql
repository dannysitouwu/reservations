-- Diagnose and fix RLS issues for service creation

-- First, let's verify the image_url column exists and add if needed
ALTER TABLE public.service_options
ADD COLUMN IF NOT EXISTS image_url text;

-- List all RLS policies on services table
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies WHERE tablename = 'services';

-- Verify admin user role
-- SELECT id, email, role FROM public.profiles WHERE email = 'admin@reservapro.com';

-- Drop all existing policies and recreate with explicit permissions
DROP POLICY IF EXISTS "Admins can modify services" ON public.services;
DROP POLICY IF EXISTS "Admins can modify service options" ON public.service_options;
DROP POLICY IF EXISTS "Admins can modify availability" ON public.service_option_availability;
DROP POLICY IF EXISTS "Anyone can read services" ON public.services;
DROP POLICY IF EXISTS "Anyone can read service options" ON public.service_options;

-- Enable RLS (should already be enabled)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_option_availability ENABLE ROW LEVEL SECURITY;

-- Allow anyone to READ services (public data)
CREATE POLICY "Anyone can read services"
  ON public.services
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read service options"
  ON public.service_options
  FOR SELECT
  USING (true);

-- Allow admins (and ONLY admins) to CREATE, UPDATE, DELETE services
CREATE POLICY "Only admins can manage services"
  ON public.services
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

-- Allow admins to manage service_options
CREATE POLICY "Only admins can manage service options"
  ON public.service_options
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

-- Allow admins to manage availability
CREATE POLICY "Only admins can manage availability"
  ON public.service_option_availability
  FOR ALL
  USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

-- Test: Get current admin status
-- SELECT public.is_admin(auth.uid()) as admin_check;
