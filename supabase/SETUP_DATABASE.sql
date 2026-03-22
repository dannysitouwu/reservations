-- ============================================================================
-- BOOTSTRAP DE BASE DE DATOS — alineado con supabase/migrations (0001 → 0038)
-- ============================================================================
--
-- La fuente de verdad del esquema es la **cadena ordenada de migraciones**
-- en `supabase/migrations/*.sql`, no este archivo suelto.
--
-- FORMA RECOMENDADA (local o proyecto enlazado):
--   supabase link
--   supabase db push
--
-- FORMA LOCAL DESDE CERO (borra datos locales):
--   supabase db reset
--
-- VOLCADO EN UN SOLO .sql (pegar en otro entorno / revisión):
--   bash supabase/scripts/concat-migrations.sh > supabase/SETUP_DATABASE.full.generated.sql
--   (el archivo generado está en .gitignore; revísalo antes de ejecutarlo)
--
-- HISTÓRICO: el script monolito anterior (modelo desactualizado) quedó en:
--   supabase/SETUP_DATABASE.legacy.sql
--
-- STORAGE: crea el bucket `service-photos` en el Dashboard; las políticas
-- de `storage.objects` están en la migración 0038 (sin ALTER TABLE en hosted).
--
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'No ejecutes solo este archivo: usa `supabase db push` o concat-migrations.sh (ver cabecera).';
END $$;
