-- ============================================================================
-- 0040: Role column as ENUM + fix admin RPC overloads & DB inconsistencies
-- ============================================================================
-- Objetivos:
-- 1) Convertir public.profiles.role (text) a un tipo ENUM para que Supabase UI
--    muestre selector y para robustez del dato.
-- 2) Eliminar la ambigüedad de admin_update_reservation_status(uuid, next_status)
--    (existían overloads con next_status public.reservation_status vs text).
-- 3) Alinear admin_update_reservation_status con el esquema real de
--    public.reservation_status_history (old_status/new_status/reason).
-- 4) Corregir admin_deactivate_service/admin_delete_service (parámetro vs columna).
-- ============================================================================

-- 0) Tipo ENUM para roles de profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.user_role AS ENUM ('buyer', 'worker', 'admin', 'super_admin');
  END IF;
END $$;

-- Las políticas en storage.objects que comparan profiles.role bloquean ALTER TYPE role.
-- Quitarlas antes de migrar el tipo y recrearlas al final usando role::text.
DROP POLICY IF EXISTS "service_photos_public_select" ON storage.objects;
DROP POLICY IF EXISTS "service_photos_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "service_photos_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "service_photos_admin_delete" ON storage.objects;

-- 1) Migrar profiles.role a ENUM
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE public.user_role
  USING role::text::public.user_role;

-- Asegurar default
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'buyer'::public.user_role;

-- Mantener helper que devuelve texto (para políticas/joins existentes)
CREATE OR REPLACE FUNCTION public.profile_role(uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = uid;
$$;

-- Reforzar admin_set_profile_role con cast a ENUM
DROP FUNCTION IF EXISTS public.admin_set_profile_role(text, text) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_set_profile_role(
  target_email text,
  target_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tgt uuid;
  v_role public.user_role;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super administrators can change roles' USING errcode = '42501';
  END IF;

  IF target_role NOT IN ('buyer', 'worker', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role value' USING errcode = '22023';
  END IF;

  v_role := target_role::public.user_role;

  SELECT id
  INTO tgt
  FROM public.profiles
  WHERE lower(email) = lower(trim(target_email));

  IF tgt IS NULL THEN
    RAISE EXCEPTION 'Profile not found for email %', target_email USING errcode = 'P0002';
  END IF;

  UPDATE public.profiles
  SET role = v_role
  WHERE id = tgt;

  INSERT INTO public.admin_audit_log (actor_id, action, target_table, target_id, details)
  VALUES (
    auth.uid(),
    'set_profile_role',
    'profiles',
    tgt::text,
    jsonb_build_object('email', target_email, 'role', target_role)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_profile_role(text, text) TO authenticated;

-- 2) Eliminar overloads ambiguos de admin_update_reservation_status
DROP FUNCTION IF EXISTS public.admin_update_reservation_status(uuid, public.reservation_status) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_reservation_status(uuid, text) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_update_reservation_status(
  reservation_id uuid,
  next_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.reservation_status;
  v_next public.reservation_status;
  has_old_status_cols boolean;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not allowed' USING errcode = '42501';
  END IF;

  SELECT status
  INTO v_current
  FROM public.reservations
  WHERE id = reservation_id;

  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  BEGIN
    v_next := next_status::public.reservation_status;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid next_status');
  END;

  -- Valid transitions (modelo 4-estados que usa el admin UI)
  IF NOT (
    (v_current = 'pending' AND v_next IN ('paid', 'cancelled'))
    OR (v_current = 'paid' AND v_next IN ('fulfilled', 'cancelled'))
    OR (v_current = 'fulfilled' AND v_next = 'fulfilled')
    OR (v_current = 'cancelled' AND v_next = 'cancelled')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Invalid transition: %s → %s', v_current, v_next)
    );
  END IF;

  UPDATE public.reservations
  SET status = v_next, updated_at = timezone('utc', now())
  WHERE id = reservation_id;

  -- Historial: el esquema reciente usa old_status/new_status (migration 0021)
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reservation_status_history'
      AND column_name = 'old_status'
  )
  INTO has_old_status_cols;

  IF has_old_status_cols THEN
    INSERT INTO public.reservation_status_history (reservation_id, old_status, new_status, reason)
    VALUES (reservation_id, v_current, v_next, 'Admin status update');
  ELSE
    -- Fallback por compatibilidad si el histórico aún tiene columnas viejas
    INSERT INTO public.reservation_status_history (reservation_id, status, reason)
    VALUES (reservation_id, v_next, 'Admin status update');
  END IF;

  INSERT INTO public.admin_audit_log (actor_id, action, target_table, target_id, details)
  VALUES (
    auth.uid(),
    'update_reservation_status',
    'reservations',
    reservation_id::text,
    jsonb_build_object('from', v_current, 'to', v_next)
  );

  -- Encolar notificación (si aplica en tu app)
  INSERT INTO public.notification_outbox (template, recipient_email, payload)
  SELECT
    CASE
      WHEN v_next = 'cancelled' THEN 'reservation_cancelled_by_admin'
      WHEN v_next = 'paid' THEN 'payment_confirmed'
      ELSE 'reservation_status_changed'
    END,
    p.email,
    jsonb_build_object(
      'reservation_id', reservation_id,
      'public_reference', r.public_reference,
      'status', v_next::text
    )
  FROM public.reservations r
  JOIN public.profiles p ON p.id = r.buyer_id
  WHERE r.id = reservation_id;

  RETURN jsonb_build_object('success', true, 'status', v_next::text);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_reservation_status(uuid, text) TO authenticated;

-- 3) Corregir deactivate/delete de servicios (bug parámetro vs columna)
DROP FUNCTION IF EXISTS public.admin_deactivate_service(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_deactivate_service(
  p_service_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT public.is_privileged_admin() THEN
    RAISE EXCEPTION 'Not allowed' USING errcode = '42501';
  END IF;

  UPDATE public.services
  SET is_active = false, updated_at = timezone('utc', now())
  WHERE id = p_service_id;

  UPDATE public.service_options so
  SET is_active = false, updated_at = timezone('utc', now())
  WHERE so.service_id = p_service_id;

  RETURN jsonb_build_object('success', true, 'message', 'Service deactivated');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_deactivate_service(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_delete_service(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_delete_service(
  p_service_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF NOT public.is_privileged_admin() THEN
    RAISE EXCEPTION 'Not allowed' USING errcode = '42501';
  END IF;

  -- ON DELETE CASCADE en service_option_availability depende de borrar service_options
  DELETE FROM public.service_options so WHERE so.service_id = p_service_id;
  DELETE FROM public.services WHERE id = p_service_id;

  RETURN jsonb_build_object('success', true, 'message', 'Service deleted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_service(uuid) TO authenticated;

-- Restaurar políticas de service-photos (comparación por texto para no acoplar al tipo enum)
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

-- ============================================================================