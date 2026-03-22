-- =====================================================================
-- 0037: Align schema, RLS, RPCs, views, and analytics with both apps
-- Replaces inconsistent states from 0032–0036 (disabled RLS, wrong RPC args).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ---------------------------------------------------------------------
-- Roles: add super_admin
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('buyer', 'worker', 'admin', 'super_admin'));

-- ---------------------------------------------------------------------
-- Services: ubicación / categoría for search (denormalized labels)
-- ---------------------------------------------------------------------
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS location_label text;
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS category_label text;

-- ---------------------------------------------------------------------
-- Audit + notification queue (email worker / Edge Function can drain outbox)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id bigserial PRIMARY KEY,
  channel text NOT NULL DEFAULT 'email',
  template text NOT NULL,
  recipient_email text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
  ON public.notification_outbox (status)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------
-- Auth profile sync (names from signup metadata)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  composed_name text;
BEGIN
  composed_name := NULLIF(
    trim(
      both
      FROM concat_ws(
        ' ',
        NULLIF(trim(both FROM COALESCE(new.raw_user_meta_data->>'first_name', '')), ''),
        NULLIF(trim(both FROM COALESCE(new.raw_user_meta_data->>'last_name', '')), '')
      )
    ),
    ''
  );
  IF composed_name IS NULL THEN
    composed_name := NULLIF(trim(both FROM COALESCE(new.raw_user_meta_data->>'full_name', '')), '');
  END IF;

  INSERT INTO public.profiles (id, email, full_name, metadata)
  VALUES (
    new.id,
    new.email,
    composed_name,
    COALESCE(new.raw_user_meta_data, '{}'::jsonb)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so RLS on profiles does not break checks)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profile_role(uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.profile_role(auth.uid()) = 'super_admin', false);
$$;

CREATE OR REPLACE FUNCTION public.is_privileged_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.profile_role(auth.uid()) IN ('admin', 'super_admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.profile_role(auth.uid()) IN ('worker', 'admin', 'super_admin'),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_privileged_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_worker()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_staff();
$$;

CREATE OR REPLACE FUNCTION public.is_buyer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.profile_role(auth.uid()) = 'buyer', false);
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.profile_role(auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Public aggregate for marketing (anon-safe)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_feedback_summary()
RETURNS TABLE (total_reviews bigint, average_rating numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*)::bigint,
    COALESCE(round(avg(rating)::numeric, 2), 0)::numeric
  FROM public.reservation_feedback;
$$;

GRANT EXECUTE ON FUNCTION public.public_feedback_summary() TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Search + list experiences (pagination, sort)
-- sort: relevance | price_asc | price_desc | rating
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_experience_options(
  search_query text DEFAULT NULL,
  location_filter text DEFAULT NULL,
  category_filter text DEFAULT NULL,
  sort_mode text DEFAULT 'relevance',
  page_limit integer DEFAULT 12,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  duration_minutes integer,
  base_price integer,
  currency_code char(3),
  image_url text,
  service_name text,
  location_label text,
  category_label text,
  avg_rating numeric,
  review_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH opt AS (
    SELECT
      so.id AS oid,
      so.name AS oname,
      so.description AS odesc,
      so.duration_minutes AS dm,
      so.base_price AS bp,
      so.currency_code AS cc,
      so.image_url AS iu,
      s.name AS sname,
      s.location_label AS loc,
      s.category_label AS cat,
      COALESCE(
        (SELECT round(avg(rf.rating)::numeric, 2)
         FROM public.reservation_feedback rf
         JOIN public.reservations r ON r.id = rf.reservation_id
         WHERE r.service_option_id = so.id),
        0
      ) AS ar,
      COALESCE(
        (SELECT count(*)::bigint
         FROM public.reservation_feedback rf2
         JOIN public.reservations r2 ON r2.id = rf2.reservation_id
         WHERE r2.service_option_id = so.id),
        0
      ) AS rc
    FROM public.service_options so
    JOIN public.services s ON s.id = so.service_id
    WHERE so.is_active AND s.is_active
      AND (
        location_filter IS NULL
        OR location_filter = ''
        OR s.location_label ILIKE '%' || location_filter || '%'
      )
      AND (
        category_filter IS NULL
        OR category_filter = ''
        OR s.category_label ILIKE '%' || category_filter || '%'
        OR s.name ILIKE '%' || category_filter || '%'
      )
      AND (
        search_query IS NULL
        OR search_query = ''
        OR so.name ILIKE '%' || search_query || '%'
        OR COALESCE(so.description, '') ILIKE '%' || search_query || '%'
        OR s.name ILIKE '%' || search_query || '%'
      )
  )
  SELECT
    oid,
    oname,
    odesc,
    dm,
    bp,
    cc,
    iu,
    sname,
    loc,
    cat,
    ar,
    rc
  FROM opt o
  ORDER BY
    CASE WHEN sort_mode = 'price_asc' THEN o.bp END ASC NULLS LAST,
    CASE WHEN sort_mode = 'price_desc' THEN o.bp END DESC NULLS LAST,
    CASE WHEN sort_mode = 'rating' THEN o.ar END DESC NULLS LAST,
    CASE WHEN sort_mode = 'rating' THEN o.rc END DESC NULLS LAST,
    CASE
      WHEN sort_mode IS NULL
        OR sort_mode = ''
        OR sort_mode = 'relevance'
        THEN o.rc
    END DESC NULLS LAST,
    CASE
      WHEN sort_mode IS NULL
        OR sort_mode = ''
        OR sort_mode = 'relevance'
        THEN o.ar
    END DESC NULLS LAST,
    o.oname ASC
  LIMIT GREATEST(page_limit, 1)
  OFFSET GREATEST(page_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION public.search_experience_options(
  text, text, text, text, integer, integer
) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Experience detail: gallery + reviews (by service_option id)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_experience_detail(option_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'option',
    jsonb_build_object(
      'id', so.id,
      'name', so.name,
      'description', so.description,
      'duration_minutes', so.duration_minutes,
      'base_price', so.base_price,
      'currency_code', so.currency_code,
      'image_url', so.image_url,
      'gallery', COALESCE(so.metadata->'gallery', '[]'::jsonb)
    ),
    'service',
    jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'description', s.description,
      'location_label', s.location_label,
      'category_label', s.category_label
    ),
    'availability',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'weekday', a.weekday,
            'start_time', a.start_time::text,
            'end_time', a.end_time::text,
            'capacity', a.capacity
          )
          ORDER BY a.weekday, a.start_time
        )
        FROM public.service_option_availability a
        WHERE a.service_option_id = so.id
      ),
      '[]'::jsonb
    ),
    'reviews',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'rating', rf.rating,
            'comment', rf.comment,
            'created_at', rf.created_at
          )
          ORDER BY rf.created_at DESC
        )
        FROM public.reservation_feedback rf
        JOIN public.reservations r ON r.id = rf.reservation_id
        WHERE r.service_option_id = so.id
      ),
      '[]'::jsonb
    ),
    'rating_summary',
    jsonb_build_object(
      'average',
      COALESCE(
        (
          SELECT round(avg(rf2.rating)::numeric, 2)
          FROM public.reservation_feedback rf2
          JOIN public.reservations r2 ON r2.id = rf2.reservation_id
          WHERE r2.service_option_id = so.id
        ),
        0
      ),
      'count',
      COALESCE(
        (
          SELECT count(*)::int
          FROM public.reservation_feedback rf3
          JOIN public.reservations r3 ON r3.id = rf3.reservation_id
          WHERE r3.service_option_id = so.id
        ),
        0
      )
    )
  )
  INTO result
  FROM public.service_options so
  JOIN public.services s ON s.id = so.service_id
  WHERE so.id = option_id AND so.is_active AND s.is_active;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_experience_detail(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS public.service_options_view CASCADE;
CREATE VIEW public.service_options_view
WITH (security_invoker = true)
AS
SELECT
  so.id,
  so.name,
  so.description,
  so.duration_minutes,
  so.base_price,
  so.currency_code,
  so.image_url,
  s.name AS service_name,
  s.location_label AS location_label,
  s.category_label AS category_label
FROM public.service_options so
JOIN public.services s ON s.id = so.service_id
WHERE so.is_active AND s.is_active;

GRANT SELECT ON public.service_options_view TO anon, authenticated;

DROP VIEW IF EXISTS public.reservations_detail_view CASCADE;
CREATE VIEW public.reservations_detail_view
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.public_reference,
  r.status,
  r.buyer_id,
  (r.metadata->>'contact_preference') AS contact_preference,
  r.scheduled_for,
  r.created_at,
  r.notes,
  r.total_amount,
  r.currency_code,
  COALESCE(so.name, 'Servicio desconocido') AS service_name,
  so.duration_minutes,
  so.base_price,
  so.image_url,
  COALESCE(s.name, 'Categoría desconocida') AS service_category,
  (r.metadata->>'party_size')::integer AS party_size
FROM public.reservations r
LEFT JOIN public.service_options so ON so.id = r.service_option_id
LEFT JOIN public.services s ON s.id = so.service_id;

GRANT SELECT ON public.reservations_detail_view TO authenticated;

DROP VIEW IF EXISTS public.reservations_view CASCADE;
CREATE VIEW public.reservations_view
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.public_reference,
  r.status,
  r.buyer_id,
  r.service_option_id,
  r.scheduled_for,
  r.total_amount,
  r.created_at,
  r.updated_at,
  so.name AS service_name,
  s.name AS service_category,
  so.base_price,
  so.duration_minutes,
  so.image_url,
  (r.metadata->>'contact_preference') AS contact_preference,
  p.email AS buyer_email,
  p.full_name AS buyer_name
FROM public.reservations r
JOIN public.service_options so ON r.service_option_id = so.id
JOIN public.services s ON so.service_id = s.id
JOIN public.profiles p ON r.buyer_id = p.id;

GRANT SELECT ON public.reservations_view TO authenticated;

-- ---------------------------------------------------------------------
-- RLS: drop all public policies then recreate
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      r.policyname,
      r.tablename
    );
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_option_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff());

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_privileged_admin())
  WITH CHECK (public.is_privileged_admin());

CREATE OR REPLACE FUNCTION public.enforce_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.role IS DISTINCT FROM old.role THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Only super administrators can change roles' USING errcode = '42501';
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_role_guard ON public.profiles;
CREATE TRIGGER trg_profiles_role_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profile_role_change();

-- catalog: public read active; staff sees inactive too
CREATE POLICY services_anon_read ON public.services
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY services_select ON public.services
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_staff());

CREATE POLICY services_write ON public.services
  FOR ALL TO authenticated
  USING (public.is_privileged_admin())
  WITH CHECK (public.is_privileged_admin());

CREATE POLICY service_options_anon_read ON public.service_options
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY service_options_select ON public.service_options
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_staff());

CREATE POLICY service_options_write ON public.service_options
  FOR ALL TO authenticated
  USING (public.is_privileged_admin())
  WITH CHECK (public.is_privileged_admin());

CREATE POLICY service_option_availability_anon_read ON public.service_option_availability
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.service_options so
      WHERE so.id = service_option_id AND so.is_active
    )
  );

CREATE POLICY service_option_availability_select ON public.service_option_availability
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_options so
      WHERE so.id = service_option_id AND (so.is_active OR public.is_staff())
    )
  );

CREATE POLICY service_option_availability_write ON public.service_option_availability
  FOR ALL TO authenticated
  USING (public.is_privileged_admin())
  WITH CHECK (public.is_privileged_admin());

-- reservations
CREATE POLICY reservations_select ON public.reservations
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR public.is_staff());

CREATE POLICY reservations_update ON public.reservations
  FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR public.is_staff())
  WITH CHECK (buyer_id = auth.uid() OR public.is_staff());

CREATE POLICY reservations_delete ON public.reservations
  FOR DELETE TO authenticated
  USING (public.is_privileged_admin());

-- reservation_status_history
CREATE POLICY rsh_select ON public.reservation_status_history
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- feedback
CREATE POLICY rf_select_own ON public.reservation_feedback
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR public.is_staff());

CREATE POLICY rf_insert_own ON public.reservation_feedback
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY rf_update_own ON public.reservation_feedback
  FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

-- payments
CREATE POLICY rp_select ON public.reservation_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id
        AND (r.buyer_id = auth.uid() OR public.is_staff())
    )
  );

CREATE POLICY rp_write ON public.reservation_payments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_privileged_admin());

CREATE POLICY rp_update ON public.reservation_payments
  FOR UPDATE TO authenticated
  USING (public.is_privileged_admin())
  WITH CHECK (public.is_privileged_admin());

-- audit + outbox: privileged only
CREATE POLICY audit_select ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_privileged_admin());

CREATE POLICY outbox_select ON public.notification_outbox
  FOR SELECT TO authenticated
  USING (public.is_privileged_admin());

-- ---------------------------------------------------------------------
-- client_create_reservation: contact metadata, pricing, availability
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.client_create_reservation(reservation_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer uuid := auth.uid();
  option_id uuid;
  scheduled_for timestamptz;
  notes text;
  new_reservation_id uuid;
  service_active boolean;
  contact_name text;
  contact_phone text;
  contact_preference text;
  party_size_text text;
  party_size integer := 1;
  metadata jsonb;
  base_price integer;
  total_cents integer;
  dow integer;
  local_t time;
  slot_found boolean;
  used_spots bigint;
  cap integer;
BEGIN
  IF buyer IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
  END IF;

  option_id := (reservation_input->>'service_option_id')::uuid;
  scheduled_for := NULLIF(replace(reservation_input->>'scheduled_for', 'Z', '+00:00'), '')::timestamptz;
  notes := nullif(reservation_input->>'notes', '');
  contact_name := nullif(reservation_input->>'contact_full_name', '');
  contact_phone := nullif(reservation_input->>'contact_phone', '');
  contact_preference := nullif(reservation_input->>'contact_preference', '');
  party_size_text := nullif(reservation_input->>'party_size', '');

  IF option_id IS NULL THEN
    RAISE EXCEPTION 'service_option_id is required' USING errcode = '22023';
  END IF;

  IF contact_name IS NULL OR length(trim(contact_name)) = 0 THEN
    RAISE EXCEPTION 'contact_full_name is required' USING errcode = '22023';
  END IF;

  IF contact_phone IS NULL OR length(trim(contact_phone)) = 0 THEN
    RAISE EXCEPTION 'contact_phone is required' USING errcode = '22023';
  END IF;

  IF party_size_text IS NOT NULL THEN
    party_size := party_size_text::integer;
    IF party_size <= 0 THEN
      RAISE EXCEPTION 'party_size must be greater than zero' USING errcode = '22023';
    END IF;
  END IF;

  SELECT
    COALESCE(so.is_active AND s.is_active, false),
    so.base_price
  INTO service_active, base_price
  FROM public.service_options so
  JOIN public.services s ON s.id = so.service_id
  WHERE so.id = option_id;

  IF NOT COALESCE(service_active, false) THEN
    RAISE EXCEPTION 'Selected service option is not available' USING errcode = '22023';
  END IF;

  total_cents := base_price * party_size;

  IF scheduled_for IS NOT NULL THEN
    dow := EXTRACT(
      DOW
      FROM timezone('America/Costa_Rica', scheduled_for)
    )::integer;
    local_t := (timezone('America/Costa_Rica', scheduled_for))::time;

    SELECT EXISTS (
      SELECT 1
      FROM public.service_option_availability a
      WHERE a.service_option_id = option_id
        AND a.weekday = dow
        AND local_t >= a.start_time
        AND local_t <= a.end_time
    )
    INTO slot_found;

    IF NOT COALESCE(slot_found, false) THEN
      RAISE EXCEPTION 'Selected date/time is outside published availability for this experience'
        USING errcode = '22023';
    END IF;

    SELECT a.capacity
    INTO cap
    FROM public.service_option_availability a
    WHERE a.service_option_id = option_id
      AND a.weekday = dow
      AND local_t >= a.start_time
      AND local_t <= a.end_time
    ORDER BY a.start_time
    LIMIT 1;

    SELECT COALESCE(sum((r.metadata->>'party_size')::integer), 0)
    INTO used_spots
    FROM public.reservations r
    WHERE r.service_option_id = option_id
      AND r.scheduled_for IS NOT NULL
      AND date_trunc('day', timezone('America/Costa_Rica', r.scheduled_for))
        = date_trunc('day', timezone('America/Costa_Rica', scheduled_for))
      AND r.status IN ('pending', 'paid', 'fulfilled');

    IF COALESCE(used_spots, 0) + party_size > COALESCE(cap, 0) THEN
      RAISE EXCEPTION 'Not enough capacity for the selected date' USING errcode = '22023';
    END IF;
  END IF;

  UPDATE public.profiles
  SET
    full_name = COALESCE(contact_name, full_name),
    phone = COALESCE(contact_phone, phone)
  WHERE id = buyer;

  metadata := jsonb_strip_nulls(
    jsonb_build_object(
      'contact_full_name', contact_name,
      'contact_phone', contact_phone,
      'party_size', party_size,
      'contact_preference', contact_preference
    )
  );

  INSERT INTO public.reservations (
    buyer_id,
    service_option_id,
    scheduled_for,
    notes,
    metadata,
    total_amount,
    currency_code
  )
  SELECT
    buyer,
    option_id,
    scheduled_for,
    notes,
    metadata,
    total_cents,
    so.currency_code
  FROM public.service_options so
  WHERE so.id = option_id
  RETURNING id INTO new_reservation_id;

  INSERT INTO public.notification_outbox (template, recipient_email, payload)
  SELECT
    'reservation_created',
    p.email,
    jsonb_build_object(
      'reservation_id', new_reservation_id,
      'public_reference', r.public_reference,
      'total_cents', total_cents
    )
  FROM public.reservations r
  JOIN public.profiles p ON p.id = r.buyer_id
  WHERE r.id = new_reservation_id;

  RETURN jsonb_build_object('reservation_id', new_reservation_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_create_reservation(jsonb) TO authenticated;

-- ---------------------------------------------------------------------
-- client_cancel_reservation (48h rule)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.client_cancel_reservation(reservation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.reservations%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.reservations WHERE id = reservation_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;
  IF r.buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed' USING errcode = '42501';
  END IF;
  IF r.status NOT IN ('pending', 'paid') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation cannot be cancelled in its current state');
  END IF;
  IF r.scheduled_for IS NOT NULL
     AND r.scheduled_for <= (timezone('utc', now()) + interval '48 hours') THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'error',
      'Cancellation is only allowed more than 48 hours before the experience'
    );
  END IF;

  UPDATE public.reservations
  SET status = 'cancelled', updated_at = timezone('utc', now())
  WHERE id = reservation_id;

  INSERT INTO public.reservation_status_history (reservation_id, status, reason)
  VALUES (reservation_id, 'cancelled', 'Cancelled by buyer');

  INSERT INTO public.notification_outbox (template, recipient_email, payload)
  SELECT
    'reservation_cancelled',
    p.email,
    jsonb_build_object('reservation_id', reservation_id, 'public_reference', r.public_reference)
  FROM public.profiles p
  WHERE p.id = r.buyer_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_cancel_reservation(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- public_find_reservation_by_reference (anon)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.public_find_reservation_by_reference(text) CASCADE;
CREATE OR REPLACE FUNCTION public.public_find_reservation_by_reference(reference_code text)
RETURNS TABLE (
  id uuid,
  public_reference text,
  status public.reservation_status,
  scheduled_for timestamptz,
  service_name text,
  assigned_worker_name text,
  buyer_name text,
  contact_preference text,
  party_size integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.public_reference,
    r.status,
    r.scheduled_for,
    so.name AS service_name,
    worker.full_name AS assigned_worker_name,
    buyer.full_name AS buyer_name,
    r.metadata->>'contact_preference' AS contact_preference,
    (r.metadata->>'party_size')::integer AS party_size
  FROM public.reservations r
  JOIN public.service_options so ON so.id = r.service_option_id
  LEFT JOIN public.profiles worker ON worker.id = r.assigned_worker_id
  JOIN public.profiles buyer ON buyer.id = r.buyer_id
  WHERE r.public_reference = upper(trim(reference_code));
$$;

GRANT EXECUTE ON FUNCTION public.public_find_reservation_by_reference(text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Admin RPCs (parameter names match admin-app NewServicePage)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_create_service(jsonb) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_create_service(service_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_id uuid;
BEGIN
  IF NOT public.is_privileged_admin() THEN
    RAISE EXCEPTION 'Only administrators can create services' USING errcode = '42501';
  END IF;

  INSERT INTO public.services (name, description, is_active, metadata, location_label, category_label)
  VALUES (
    service_data->>'name',
    NULLIF(service_data->>'description', ''),
    COALESCE((service_data->>'is_active')::boolean, true),
    COALESCE((service_data->'metadata')::jsonb, '{}'::jsonb),
    NULLIF(service_data->>'location_label', ''),
    NULLIF(service_data->>'category_label', '')
  )
  RETURNING id INTO service_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_table, target_id, details)
  VALUES (
    auth.uid(),
    'create_service',
    'services',
    service_id::text,
    jsonb_build_object('name', service_data->>'name')
  );

  RETURN jsonb_build_object('id', service_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_service(jsonb) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_create_service_option(jsonb) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_create_service_option(option_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  option_id uuid;
BEGIN
  IF NOT public.is_privileged_admin() THEN
    RAISE EXCEPTION 'Only administrators can create service options' USING errcode = '42501';
  END IF;

  INSERT INTO public.service_options (
    service_id,
    name,
    description,
    duration_minutes,
    base_price,
    currency_code,
    image_url,
    is_active,
    metadata
  )
  VALUES (
    (option_data->>'service_id')::uuid,
    option_data->>'name',
    NULLIF(option_data->>'description', ''),
    (option_data->>'duration_minutes')::integer,
    (option_data->>'base_price')::integer,
    COALESCE(NULLIF(option_data->>'currency_code', ''), 'USD'),
    NULLIF(option_data->>'image_url', ''),
    COALESCE((option_data->>'is_active')::boolean, true),
    COALESCE((option_data->'metadata')::jsonb, '{}'::jsonb)
  )
  RETURNING id INTO option_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_table, target_id, details)
  VALUES (
    auth.uid(),
    'create_service_option',
    'service_options',
    option_id::text,
    jsonb_build_object('name', option_data->>'name')
  );

  RETURN jsonb_build_object('id', option_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_service_option(jsonb) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_update_reservation_status(uuid, public.reservation_status) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_update_reservation_status(
  reservation_id uuid,
  next_status public.reservation_status
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.reservation_status;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not allowed' USING errcode = '42501';
  END IF;

  SELECT status INTO v_current FROM public.reservations WHERE id = reservation_id;
  IF v_current IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  IF NOT (
    (v_current = 'pending' AND next_status IN ('paid', 'cancelled'))
    OR (v_current = 'paid' AND next_status IN ('fulfilled', 'cancelled'))
    OR (v_current = 'fulfilled' AND next_status = 'fulfilled')
    OR (v_current = 'cancelled' AND next_status = 'cancelled')
  ) THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'error',
      format('Invalid transition: %s → %s', v_current, next_status)
    );
  END IF;

  UPDATE public.reservations
  SET status = next_status, updated_at = timezone('utc', now())
  WHERE id = reservation_id;

  INSERT INTO public.reservation_status_history (reservation_id, status, reason)
  VALUES (reservation_id, next_status, 'Admin status update');

  INSERT INTO public.admin_audit_log (actor_id, action, target_table, target_id, details)
  VALUES (
    auth.uid(),
    'update_reservation_status',
    'reservations',
    reservation_id::text,
    jsonb_build_object('from', v_current, 'to', next_status)
  );

  INSERT INTO public.notification_outbox (template, recipient_email, payload)
  SELECT
    CASE
      WHEN next_status = 'cancelled' THEN 'reservation_cancelled_by_admin'
      WHEN next_status = 'paid' THEN 'payment_confirmed'
      ELSE 'reservation_status_changed'
    END,
    p.email,
    jsonb_build_object(
      'reservation_id', reservation_id,
      'public_reference', r.public_reference,
      'status', next_status::text
    )
  FROM public.reservations r
  JOIN public.profiles p ON p.id = r.buyer_id
  WHERE r.id = reservation_id;

  RETURN jsonb_build_object('success', true, 'status', next_status::text);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_reservation_status(uuid, public.reservation_status)
  TO authenticated;

-- Record payment (SINPE, cash, etc.) and mark reservation paid
CREATE OR REPLACE FUNCTION public.admin_record_payment(
  p_reservation_id uuid,
  amount_cents integer,
  payment_method text,
  external_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.reservations%ROWTYPE;
  tx_id text;
BEGIN
  IF NOT public.is_privileged_admin() THEN
    RAISE EXCEPTION 'Not allowed' USING errcode = '42501';
  END IF;

  SELECT * INTO r FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  tx_id := COALESCE(
    NULLIF(trim(external_reference), ''),
    'loc-' || encode(gen_random_bytes(8), 'hex')
  );

  INSERT INTO public.reservation_payments (
    reservation_id,
    amount_cents,
    currency_code,
    payment_status,
    payment_method,
    transaction_id,
    notes
  )
  VALUES (
    p_reservation_id,
    amount_cents,
    r.currency_code,
    'completed',
    payment_method,
    tx_id,
    NULL
  );

  IF r.status = 'pending' THEN
    UPDATE public.reservations
    SET status = 'paid', updated_at = timezone('utc', now())
    WHERE id = p_reservation_id;
    INSERT INTO public.reservation_status_history (reservation_id, status, reason)
    VALUES (p_reservation_id, 'paid', 'Payment recorded');
  END IF;

  INSERT INTO public.notification_outbox (template, recipient_email, payload)
  SELECT
    'payment_receipt',
    p.email,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'public_reference', r.public_reference,
      'amount_cents', amount_cents,
      'method', payment_method,
      'transaction_id', tx_id
    )
  FROM public.profiles p
  WHERE p.id = r.buyer_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_table, target_id, details)
  VALUES (
    auth.uid(),
    'record_payment',
    'reservation_payments',
    tx_id,
    jsonb_build_object('reservation_id', p_reservation_id, 'method', payment_method)
  );

  RETURN jsonb_build_object('success', true, 'transaction_id', tx_id);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'error', 'Duplicate transaction reference');
WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_record_payment(uuid, integer, text, text) TO authenticated;

-- admin_set_profile_role: only super_admin
DROP FUNCTION IF EXISTS public.admin_set_profile_role(text, text) CASCADE;
CREATE OR REPLACE FUNCTION public.admin_set_profile_role(target_email text, target_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tgt uuid;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super administrators can change roles' USING errcode = '42501';
  END IF;

  IF target_role NOT IN ('buyer', 'worker', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role value' USING errcode = '22023';
  END IF;

  SELECT id INTO tgt FROM public.profiles WHERE lower(email) = lower(trim(target_email));
  IF tgt IS NULL THEN
    RAISE EXCEPTION 'Profile not found for email %', target_email USING errcode = 'P0002';
  END IF;

  UPDATE public.profiles SET role = target_role WHERE id = tgt;

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

-- ---------------------------------------------------------------------
-- Analytics (restore service_performance; fix grants)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reservations_kpi()
RETURNS TABLE (
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
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not allowed' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE status = 'pending')::bigint,
    count(*) FILTER (WHERE status IN ('paid', 'fulfilled'))::bigint,
    COALESCE(
      sum(total_amount) FILTER (
        WHERE status IN ('paid', 'fulfilled')
          AND date_trunc('month', created_at) = date_trunc('month', timezone('utc', now()))
      ),
      0
    )::bigint,
    (
      SELECT avg(extract(epoch FROM (h.created_at - r2.created_at)) / 60)
      FROM public.reservation_status_history h
      JOIN public.reservations r2 ON r2.id = h.reservation_id
      WHERE h.status = 'paid'
    )::numeric;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reservations_kpi() TO authenticated;

CREATE OR REPLACE FUNCTION public.analytics_overview()
RETURNS TABLE (
  total_reservations bigint,
  total_revenue bigint,
  average_ticket numeric,
  cancellation_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      count(*)::bigint AS total_reservations,
      count(*) FILTER (WHERE status IN ('paid', 'fulfilled'))::bigint AS paid_count,
      COALESCE(
        sum(total_amount) FILTER (WHERE status IN ('paid', 'fulfilled')),
        0
      )::bigint AS total_revenue,
      count(*) FILTER (WHERE status = 'cancelled')::bigint AS cancel_count
    FROM public.reservations
  )
  SELECT
    total_reservations,
    total_revenue,
    CASE
      WHEN paid_count > 0 THEN round(total_revenue::numeric / paid_count::numeric, 0)
      ELSE 0::numeric
    END,
    CASE
      WHEN total_reservations > 0 THEN round(100.0 * cancel_count::numeric / total_reservations::numeric, 2)
      ELSE 0::numeric
    END
  FROM stats;
$$;

CREATE OR REPLACE FUNCTION public.analytics_monthly_revenue(months_count integer DEFAULT 6)
RETURNS TABLE (
  month_start timestamptz,
  month_label text,
  reservations bigint,
  revenue bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_trunc('month', r.created_at) AS ms,
    to_char(date_trunc('month', r.created_at), 'Mon YYYY'),
    count(*)::bigint,
    COALESCE(sum(r.total_amount), 0)::bigint
  FROM public.reservations r
  WHERE r.status IN ('paid', 'fulfilled')
    AND r.created_at >= timezone('utc', now()) - (greatest(months_count, 1) || ' months')::interval
  GROUP BY date_trunc('month', r.created_at)
  ORDER BY ms DESC;
$$;

CREATE OR REPLACE FUNCTION public.analytics_status_distribution()
RETURNS TABLE (
  status public.reservation_status,
  reservations bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.status,
    count(*)::bigint
  FROM public.reservations r
  GROUP BY r.status
  ORDER BY r.status;
$$;

CREATE OR REPLACE FUNCTION public.analytics_service_performance(limit_count integer DEFAULT 5)
RETURNS TABLE (
  service_name text,
  reservations bigint,
  revenue bigint,
  average_ticket numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.name,
    count(r.id)::bigint,
    COALESCE(sum(r.total_amount), 0)::bigint,
    CASE
      WHEN count(r.id) > 0 THEN round(sum(r.total_amount)::numeric / count(r.id)::numeric, 0)
      ELSE 0::numeric
    END
  FROM public.reservations r
  JOIN public.service_options so ON so.id = r.service_option_id
  JOIN public.services s ON s.id = so.service_id
  WHERE r.status IN ('paid', 'fulfilled')
    AND r.created_at >= timezone('utc', now()) - interval '90 days'
  GROUP BY s.id, s.name
  ORDER BY count(r.id) DESC
  LIMIT greatest(limit_count, 1);
$$;

GRANT EXECUTE ON FUNCTION public.analytics_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_monthly_revenue(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_status_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_service_performance(integer) TO authenticated;

-- Seed labels for existing services (idempotent)
UPDATE public.services s
SET
  location_label = COALESCE(s.location_label, 'Costa Rica'),
  category_label = COALESCE(s.category_label, s.name)
WHERE s.location_label IS NULL OR s.category_label IS NULL;
