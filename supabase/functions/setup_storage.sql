-- Storage bucket setup (run manually in Supabase dashboard)
-- This is documentation for bucket creation

/*
INSERT INTO storage.buckets (id, name, public, created_at, updated_at, owner, owner_id, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'service-photos',
  'service-photos',
  true,
  now(),
  now(),
  'authenticated',
  NULL,
  false,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
*/

-- Note: This must be created in Supabase dashboard or via CLI
-- CLI: supabase storage create service-photos --public
