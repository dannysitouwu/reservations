-- Set admin role for admin@reservapro.com user
-- This user should be able to create and modify services
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@reservapro.com';

-- Also ensure any other admin accounts have the correct role
-- (You can add more admin emails here as needed)
INSERT INTO public.profiles (id, email, full_name, role, metadata)
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name'::text, 'admin', u.raw_user_meta_data
FROM auth.users u
WHERE u.email = 'admin@reservapro.com'
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO UPDATE
SET role = 'admin'
WHERE profiles.email = 'admin@reservapro.com';
