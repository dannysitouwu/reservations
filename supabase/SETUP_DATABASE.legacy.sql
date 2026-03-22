-- ============================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS - RESERVATIONS APP
-- ============================================================================
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard)
-- Este script:
--   1. Elimina tablas/objetos existentes (limpia todo)
--   2. Crea el esquema completo
--   3. Inserta datos de ejemplo (seed)
--   4. Configura permisos y RLS
-- ============================================================================

-- ============================================================================
-- PASO 1: LIMPIAR TODO LO EXISTENTE
-- ============================================================================

-- Eliminar vistas
DROP VIEW IF EXISTS public.reservations_detail_view CASCADE;
DROP VIEW IF EXISTS public.reservations_view CASCADE;
DROP VIEW IF EXISTS public.service_options_view CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.client_create_reservation(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.public_find_reservation_by_reference(text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_reservation_status(uuid, public.reservation_status) CASCADE;
DROP FUNCTION IF EXISTS public.admin_reservations_kpi() CASCADE;
DROP FUNCTION IF EXISTS public.admin_set_profile_role(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.analytics_overview() CASCADE;
DROP FUNCTION IF EXISTS public.analytics_monthly_revenue(integer) CASCADE;
DROP FUNCTION IF EXISTS public.analytics_status_distribution() CASCADE;
DROP FUNCTION IF EXISTS public.analytics_service_performance(integer) CASCADE;
DROP FUNCTION IF EXISTS public.enforce_reservation_status_transition() CASCADE;
DROP FUNCTION IF EXISTS public.log_reservation_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.generate_public_reference() CASCADE;
DROP FUNCTION IF EXISTS public.current_profile_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_worker() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_buyer() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_email_update() CASCADE;

-- Eliminar tablas existentes (incluye las viejas de la foto: reservation_resources)
DROP TABLE IF EXISTS public.reservation_notes CASCADE;
DROP TABLE IF EXISTS public.reservation_status_history CASCADE;
DROP TABLE IF EXISTS public.reservation_status_transitions CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.service_option_availability CASCADE;
DROP TABLE IF EXISTS public.service_options CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.reservation_resources CASCADE;

-- Eliminar tipo enum
DROP TYPE IF EXISTS public.reservation_status CASCADE;

-- ============================================================================
-- PASO 2: EXTENSIONES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- ============================================================================
-- PASO 3: TIPOS Y FUNCIONES AUXILIARES
-- ============================================================================

CREATE TYPE public.reservation_status AS ENUM (
  'pending',
  'awaiting_confirmation',
  'confirmed',
  'in_progress',
  'fulfilled',
  'cancelled',
  'rejected'
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = timezone('utc', now());
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_public_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := upper(encode(gen_random_bytes(4), 'hex'));
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.reservations WHERE public_reference = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- ============================================================================
-- PASO 4: TABLAS PRINCIPALES
-- ============================================================================

-- Perfiles de usuario (sincronizado con auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'worker', 'admin')),
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_profiles_set_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Funciones de rol
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_worker()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(public.current_profile_role() IN ('worker', 'admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(public.current_profile_role() = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION public.is_buyer()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(public.current_profile_role() = 'buyer', false);
$$;

-- Servicios (categorías de experiencia)
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_services_set_updated
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Opciones dentro de cada servicio
CREATE TABLE public.service_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  base_price integer NOT NULL CHECK (base_price >= 0),
  currency_code char(3) NOT NULL DEFAULT 'USD',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_service_options_set_updated
BEFORE UPDATE ON public.service_options
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Disponibilidad semanal para cada opción
CREATE TABLE public.service_option_availability (
  id bigserial PRIMARY KEY,
  service_option_id uuid NOT NULL REFERENCES public.service_options(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity smallint NOT NULL DEFAULT 1 CHECK (capacity > 0),
  UNIQUE (service_option_id, weekday, start_time, end_time)
);

-- Reservaciones
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference text NOT NULL UNIQUE DEFAULT public.generate_public_reference(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  service_option_id uuid NOT NULL REFERENCES public.service_options(id) ON DELETE RESTRICT,
  status public.reservation_status NOT NULL DEFAULT 'pending',
  scheduled_for timestamptz,
  assigned_worker_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_amount integer,
  currency_code char(3) NOT NULL DEFAULT 'USD',
  notes text,
  internal_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER trg_reservations_set_updated
BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Transiciones válidas de estado
CREATE TABLE public.reservation_status_transitions (
  from_status public.reservation_status NOT NULL,
  to_status public.reservation_status NOT NULL,
  CONSTRAINT reservation_status_transitions_pk PRIMARY KEY (from_status, to_status)
);

INSERT INTO public.reservation_status_transitions (from_status, to_status) VALUES
  ('pending', 'awaiting_confirmation'),
  ('pending', 'cancelled'),
  ('awaiting_confirmation', 'confirmed'),
  ('awaiting_confirmation', 'cancelled'),
  ('confirmed', 'in_progress'),
  ('confirmed', 'cancelled'),
  ('in_progress', 'fulfilled'),
  ('in_progress', 'cancelled'),
  ('pending', 'rejected'),
  ('awaiting_confirmation', 'rejected');

-- Trigger para validar transiciones
CREATE OR REPLACE FUNCTION public.enforce_reservation_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF new.status <> old.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.reservation_status_transitions
      WHERE from_status = old.status AND to_status = new.status
    ) THEN
      RAISE EXCEPTION 'Invalid reservation status transition from % to %', old.status, new.status;
    END IF;
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER trg_reservations_enforce_status
BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.enforce_reservation_status_transition();

-- Historial de cambios de estado
CREATE TABLE public.reservation_status_history (
  id bigserial PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  status public.reservation_status NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE OR REPLACE FUNCTION public.log_reservation_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    INSERT INTO public.reservation_status_history(reservation_id, status, changed_by)
    VALUES (new.id, new.status, new.assigned_worker_id);
  ELSIF tg_op = 'UPDATE' AND new.status <> old.status THEN
    INSERT INTO public.reservation_status_history(reservation_id, status, changed_by)
    VALUES (new.id, new.status, coalesce(auth.uid(), new.assigned_worker_id));
  END IF;
  RETURN new;
END;
$$;

CREATE TRIGGER trg_reservations_log_status
AFTER INSERT OR UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.log_reservation_status_change();

-- Notas de reservación
CREATE TABLE public.reservation_notes (
  id bigserial PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'buyer')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- PASO 5: VISTAS
-- ============================================================================

CREATE OR REPLACE VIEW public.service_options_view AS
SELECT
  so.id,
  so.name,
  so.description,
  so.duration_minutes,
  so.base_price,
  so.currency_code,
  s.name AS service_name
FROM public.service_options so
JOIN public.services s ON s.id = so.service_id
WHERE so.is_active = true AND s.is_active = true;

CREATE OR REPLACE VIEW public.reservations_view AS
SELECT
  r.id,
  r.public_reference,
  r.status,
  r.scheduled_for,
  r.created_at,
  r.updated_at,
  r.buyer_id,
  buyer.email AS buyer_email,
  buyer.full_name AS buyer_name,
  r.assigned_worker_id,
  worker.full_name AS assigned_worker_name
FROM public.reservations r
JOIN public.profiles buyer ON buyer.id = r.buyer_id
LEFT JOIN public.profiles worker ON worker.id = r.assigned_worker_id;

CREATE OR REPLACE VIEW public.reservations_detail_view AS
SELECT
  r.id,
  r.public_reference,
  r.status,
  r.scheduled_for,
  r.created_at,
  r.updated_at,
  r.notes,
  r.internal_notes,
  r.total_amount,
  r.currency_code,
  r.buyer_id,
  buyer.full_name AS buyer_name,
  buyer.email AS buyer_email,
  buyer.phone AS buyer_phone,
  worker.full_name AS assigned_worker_name,
  so.name AS service_name,
  so.duration_minutes,
  (r.metadata ->> 'contact_preference') AS contact_preference,
  (r.metadata ->> 'party_size')::integer AS party_size
FROM public.reservations r
JOIN public.profiles buyer ON buyer.id = r.buyer_id
LEFT JOIN public.profiles worker ON worker.id = r.assigned_worker_id
JOIN public.service_options so ON so.id = r.service_option_id;

-- ============================================================================
-- PASO 6: FUNCIONES RPC (usadas por la app)
-- ============================================================================

-- Crear reservación desde la app de guest
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
  party_size integer;
  metadata jsonb;
BEGIN
  IF buyer IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
  END IF;

  option_id := (reservation_input ->> 'service_option_id')::uuid;
  scheduled_for := (reservation_input ->> 'scheduled_for')::timestamptz;
  notes := nullif(reservation_input ->> 'notes', '');
  contact_name := nullif(reservation_input ->> 'contact_full_name', '');
  contact_phone := nullif(reservation_input ->> 'contact_phone', '');
  contact_preference := nullif(reservation_input ->> 'contact_preference', '');
  party_size_text := nullif(reservation_input ->> 'party_size', '');

  IF option_id IS NULL THEN
    RAISE EXCEPTION 'service_option_id is required' USING errcode = '22023';
  END IF;

  IF contact_name IS NULL THEN
    RAISE EXCEPTION 'contact_full_name is required' USING errcode = '22023';
  END IF;

  IF contact_phone IS NULL THEN
    RAISE EXCEPTION 'contact_phone is required' USING errcode = '22023';
  END IF;

  IF party_size_text IS NOT NULL THEN
    party_size := party_size_text::integer;
    IF party_size <= 0 THEN
      RAISE EXCEPTION 'party_size must be greater than zero' USING errcode = '22023';
    END IF;
  END IF;

  SELECT coalesce(so.is_active AND s.is_active, false)
  INTO service_active
  FROM public.service_options so
  JOIN public.services s ON s.id = so.service_id
  WHERE so.id = option_id;

  IF NOT coalesce(service_active, false) THEN
    RAISE EXCEPTION 'Selected service option is not available' USING errcode = '22023';
  END IF;

  -- Actualizar perfil con datos de contacto
  IF contact_name IS NOT NULL OR contact_phone IS NOT NULL THEN
    UPDATE public.profiles
    SET full_name = coalesce(contact_name, full_name),
        phone = coalesce(contact_phone, phone)
    WHERE id = buyer;
  END IF;

  metadata := jsonb_strip_nulls(
    jsonb_build_object(
      'contact_full_name', contact_name,
      'contact_phone', contact_phone,
      'party_size', party_size,
      'contact_preference', contact_preference
    )
  );

  INSERT INTO public.reservations (buyer_id, service_option_id, scheduled_for, notes, metadata)
  VALUES (buyer, option_id, scheduled_for, notes, metadata)
  RETURNING id INTO new_reservation_id;

  RETURN jsonb_build_object('reservation_id', new_reservation_id);
END;
$$;

-- Buscar reservación por código público (sin autenticación)
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
LANGUAGE sql STABLE
AS $$
  SELECT
    r.id,
    r.public_reference,
    r.status,
    r.scheduled_for,
    so.name AS service_name,
    worker.full_name AS assigned_worker_name,
    buyer.full_name AS buyer_name,
    r.metadata ->> 'contact_preference' AS contact_preference,
    (r.metadata ->> 'party_size')::integer AS party_size
  FROM public.reservations r
  JOIN public.service_options so ON so.id = r.service_option_id
  LEFT JOIN public.profiles worker ON worker.id = r.assigned_worker_id
  JOIN public.profiles buyer ON buyer.id = r.buyer_id
  WHERE r.public_reference = upper(reference_code);
$$;

-- Admin: actualizar estado de reservación
CREATE OR REPLACE FUNCTION public.admin_update_reservation_status(reservation_id uuid, next_status public.reservation_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.reservations
  SET status = next_status
  WHERE id = reservation_id;
END;
$$;

-- Admin: KPIs del dashboard
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
  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE status IN ('pending', 'awaiting_confirmation')) AS pending_reservations,
    count(*) FILTER (WHERE status IN ('confirmed', 'in_progress', 'fulfilled')) AS confirmed_reservations,
    coalesce(sum(total_amount) FILTER (WHERE date_trunc('month', created_at) = date_trunc('month', timezone('utc', now()))), 0) AS revenue_this_month,
    (
      SELECT avg(extract(epoch FROM (h.created_at - r2.created_at)) / 60)
      FROM public.reservation_status_history h
      JOIN public.reservations r2 ON r2.id = h.reservation_id
      WHERE h.status IN ('awaiting_confirmation', 'confirmed')
    ) AS average_response_minutes;
END;
$$;

-- Admin: cambiar rol de usuario
CREATE OR REPLACE FUNCTION public.admin_set_profile_role(target_email text, target_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_role NOT IN ('buyer', 'worker', 'admin') THEN
    RAISE EXCEPTION 'Invalid role value' USING errcode = '22023';
  END IF;

  UPDATE public.profiles
  SET role = target_role
  WHERE email = target_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for email %', target_email USING errcode = 'P0002';
  END IF;
END;
$$;

-- ============================================================================
-- PASO 7: ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.analytics_overview()
RETURNS TABLE (
  total_reservations bigint,
  total_revenue bigint,
  average_ticket numeric,
  cancellation_rate numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      count(*)::bigint AS total_reservations,
      count(*) FILTER (WHERE status IN ('cancelled', 'rejected'))::bigint AS cancelled_reservations,
      coalesce(sum(total_amount) FILTER (WHERE status IN ('confirmed', 'in_progress', 'fulfilled')), 0)::bigint AS total_revenue,
      coalesce(avg(total_amount) FILTER (WHERE status IN ('confirmed', 'in_progress', 'fulfilled')), 0)::numeric AS average_ticket
    FROM public.reservations
  )
  SELECT
    total_reservations,
    total_revenue,
    average_ticket,
    CASE
      WHEN total_reservations = 0 THEN 0
      ELSE cancelled_reservations::numeric / total_reservations::numeric
    END AS cancellation_rate
  FROM stats;
$$;

CREATE OR REPLACE FUNCTION public.analytics_monthly_revenue(months_count integer DEFAULT 6)
RETURNS TABLE (
  month_start date,
  month_label text,
  reservations bigint,
  revenue bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH month_series AS (
    SELECT date_trunc('month', timezone('utc', now())) - (interval '1 month' * g) AS month_start
    FROM generate_series(0, greatest(months_count, 1) - 1) AS g
  )
  SELECT
    ms.month_start::date,
    to_char(ms.month_start, 'YYYY-MM') AS month_label,
    coalesce(count(r.*) FILTER (WHERE r.status NOT IN ('cancelled', 'rejected')), 0)::bigint AS reservations,
    coalesce(sum(r.total_amount) FILTER (WHERE r.status IN ('confirmed', 'in_progress', 'fulfilled')), 0)::bigint AS revenue
  FROM month_series ms
  LEFT JOIN public.reservations r ON date_trunc('month', r.created_at) = ms.month_start
  GROUP BY ms.month_start
  ORDER BY ms.month_start;
$$;

CREATE OR REPLACE FUNCTION public.analytics_status_distribution()
RETURNS TABLE (
  status public.reservation_status,
  reservations bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, count(*)::bigint AS reservations
  FROM public.reservations
  GROUP BY status
  ORDER BY status;
$$;

CREATE OR REPLACE FUNCTION public.analytics_service_performance(limit_count integer DEFAULT 5)
RETURNS TABLE (
  service_name text,
  reservations bigint,
  revenue bigint,
  average_ticket numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.name AS service_name,
    coalesce(count(r.*) FILTER (WHERE r.status IN ('confirmed', 'in_progress', 'fulfilled')), 0)::bigint AS reservations,
    coalesce(sum(r.total_amount) FILTER (WHERE r.status IN ('confirmed', 'in_progress', 'fulfilled')), 0)::bigint AS revenue,
    coalesce(avg(r.total_amount) FILTER (WHERE r.status IN ('confirmed', 'in_progress', 'fulfilled')), 0)::numeric AS average_ticket
  FROM public.services s
  JOIN public.service_options so ON so.service_id = s.id
  LEFT JOIN public.reservations r ON r.service_option_id = so.id
  GROUP BY s.id, s.name
  ORDER BY revenue DESC
  LIMIT greatest(limit_count, 1);
$$;

-- ============================================================================
-- PASO 8: SINCRONIZACIÓN AUTH -> PROFILES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, metadata)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = new.email,
      updated_at = timezone('utc', now())
  WHERE id = new.id;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_email_update();

-- Backfill: crear profiles para usuarios existentes
INSERT INTO public.profiles (id, email, full_name, metadata)
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name', coalesce(u.raw_user_meta_data, '{}'::jsonb)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ============================================================================
-- PASO 9: ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_option_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_notes ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles: self access" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles: workers view" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_worker());

CREATE POLICY "Profiles: self update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: admin manage" ON public.profiles
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin app read access (para que funcione sin auth desde el admin)
CREATE POLICY "Profiles: admin app read" ON public.profiles
  FOR SELECT USING (true);

-- Services (lectura pública)
CREATE POLICY "Services: public read" ON public.services
  FOR SELECT USING (true);

-- Service options (lectura pública)
CREATE POLICY "Service options: public read" ON public.service_options
  FOR SELECT USING (true);

-- Availability (lectura pública)
CREATE POLICY "Availability: public read" ON public.service_option_availability
  FOR SELECT USING (true);

-- Reservations
CREATE POLICY "Reservations: buyers read own" ON public.reservations
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Reservations: buyers insert own" ON public.reservations
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Reservations: buyers cancel own" ON public.reservations
  FOR UPDATE USING (auth.uid() = buyer_id AND status IN ('pending', 'awaiting_confirmation'))
  WITH CHECK (auth.uid() = buyer_id AND status IN ('pending', 'awaiting_confirmation', 'cancelled'));

CREATE POLICY "Reservations: workers manage" ON public.reservations
  FOR ALL USING (public.is_worker())
  WITH CHECK (public.is_worker());

CREATE POLICY "Reservations: admin app read" ON public.reservations
  FOR SELECT USING (true);

-- History
CREATE POLICY "Reservation history: buyers and workers" ON public.reservation_status_history
  FOR SELECT USING (
    public.is_worker() OR EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id AND r.buyer_id = auth.uid()
    )
  );

-- Notes
CREATE POLICY "Reservation notes: workers manage" ON public.reservation_notes
  FOR ALL USING (public.is_worker())
  WITH CHECK (public.is_worker());

CREATE POLICY "Reservation notes: buyers read visible" ON public.reservation_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reservation_id AND r.buyer_id = auth.uid()
    ) AND visibility = 'buyer'
  );

-- ============================================================================
-- PASO 10: PERMISOS PARA ROLES DE SUPABASE
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.reservations TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.reservation_status_history TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.reservation_notes TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.services TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.service_options TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.service_option_availability TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- ============================================================================
-- PASO 11: DATOS DE EJEMPLO (SEED)
-- ============================================================================

-- Servicios
INSERT INTO public.services (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Venue Rentals', 'Espacios y amenidades para eventos exclusivos'),
  ('00000000-0000-0000-0000-000000000102', 'Catering Packages', 'Paquetes de alimentos y bebidas premium'),
  ('00000000-0000-0000-0000-000000000103', 'Wellness Sessions', 'Experiencias de spa y bienestar')
ON CONFLICT (id) DO NOTHING;

-- Opciones de servicio (los precios están en centavos: 450000 = $4,500.00)
INSERT INTO public.service_options (id, service_id, name, description, duration_minutes, base_price, currency_code) VALUES
  ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-000000000101',
   'Banquet Hall (Full Day)', 'Acceso completo por un día, hasta 200 invitados', 720, 450000, 'USD'),
  ('00000000-0000-0000-0000-000000001202', '00000000-0000-0000-0000-000000000101',
   'Conference Room (Half Day)', 'Ideal para talleres o reuniones corporativas', 240, 120000, 'USD'),
  ('00000000-0000-0000-0000-000000001203', '00000000-0000-0000-0000-000000000102',
   'Premium Catering', 'Canapés, entradas, postres y barra libre', 180, 280000, 'USD'),
  ('00000000-0000-0000-0000-000000001204', '00000000-0000-0000-0000-000000000103',
   'Signature Massage', 'Masaje de 60 minutos con aromaterapia', 60, 9000, 'USD'),
  ('00000000-0000-0000-0000-000000001205', '00000000-0000-0000-0000-000000000103',
   'Couples Spa Package', 'Tratamiento de spa para parejas: masaje, facial y jacuzzi', 120, 18000, 'USD'),
  ('00000000-0000-0000-0000-000000001206', '00000000-0000-0000-0000-000000000101',
   'Garden Terrace (Evening)', 'Terraza al aire libre para cenas y celebraciones nocturnas', 360, 320000, 'USD')
ON CONFLICT (id) DO NOTHING;

-- Disponibilidad (horarios semanales)
INSERT INTO public.service_option_availability (service_option_id, weekday, start_time, end_time, capacity) VALUES
  -- Banquet Hall: sábado y domingo
  ('00000000-0000-0000-0000-000000001201', 5, '08:00', '23:00', 2),
  ('00000000-0000-0000-0000-000000001201', 6, '08:00', '23:00', 2),
  -- Conference Room: lunes y miércoles
  ('00000000-0000-0000-0000-000000001202', 1, '08:00', '18:00', 4),
  ('00000000-0000-0000-0000-000000001202', 3, '08:00', '18:00', 4),
  -- Premium Catering: jueves
  ('00000000-0000-0000-0000-000000001203', 4, '10:00', '22:00', 3),
  -- Signature Massage: martes, jueves, sábado
  ('00000000-0000-0000-0000-000000001204', 2, '09:00', '17:00', 6),
  ('00000000-0000-0000-0000-000000001204', 4, '09:00', '17:00', 6),
  ('00000000-0000-0000-0000-000000001204', 6, '09:00', '14:00', 6),
  -- Couples Spa: viernes y sábado
  ('00000000-0000-0000-0000-000000001205', 5, '10:00', '20:00', 4),
  ('00000000-0000-0000-0000-000000001205', 6, '10:00', '18:00', 4),
  -- Garden Terrace: viernes y sábado
  ('00000000-0000-0000-0000-000000001206', 5, '17:00', '23:00', 3),
  ('00000000-0000-0000-0000-000000001206', 6, '17:00', '23:00', 3)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ¡LISTO! La base de datos está configurada.
-- ============================================================================
-- Próximos pasos:
--   1. Crear un usuario en Authentication > Users (o desde la app)
--   2. Ese usuario automáticamente tendrá un profile en public.profiles
--   3. Ir a la app de Expo, registrarse, y crear una reservación
--   4. Los datos aparecerán en Table Editor de Supabase
-- ============================================================================
