-- ============================================================================
-- 0038: Políticas RLS en storage.objects para el bucket service-photos
-- ============================================================================
-- Requisito: el bucket `service-photos` debe existir (Dashboard → Storage).
-- Bucket público = lectura sin auth; estas políticas permiten que solo
-- administradores suban, actualicen o borren archivos.
--
-- No uses ALTER TABLE storage.objects en Supabase hosted: la tabla es del
-- servicio Storage y `supabase db push` falla con "must be owner of table
-- objects". RLS ya está activo; solo añadimos políticas aquí.
-- ============================================================================

DROP POLICY IF EXISTS "service_photos_public_select" ON storage.objects;
CREATE POLICY "service_photos_public_select"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'service-photos');

DROP POLICY IF EXISTS "service_photos_admin_insert" ON storage.objects;
CREATE POLICY "service_photos_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'service-photos'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "service_photos_admin_update" ON storage.objects;
CREATE POLICY "service_photos_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'service-photos'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "service_photos_admin_delete" ON storage.objects;
CREATE POLICY "service_photos_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'service-photos'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('admin', 'super_admin')
    )
  );
