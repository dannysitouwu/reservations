-- ============================================================================
-- 0043: Asegurar corrección de metadata en client_create_reservation
-- ============================================================================
-- Si la base solo aplicó 0041 antigua (variable metadata ambigua con so.metadata),
-- este CREATE OR REPLACE corrige el RPC. Idempotente si 0042 ya lo aplicó.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.client_create_reservation(reservation_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer uuid := auth.uid();
  option_id uuid;
  v_scheduled_for timestamptz;
  notes text;
  new_reservation_id uuid;
  service_active boolean;
  contact_name text;
  contact_phone text;
  contact_preference text;
  party_size_text text;
  party_size integer := 1;
  v_reservation_metadata jsonb;
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
  v_scheduled_for := NULLIF(replace(reservation_input->>'scheduled_for', 'Z', '+00:00'), '')::timestamptz;
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

  IF v_scheduled_for IS NOT NULL THEN
    dow := EXTRACT(
      DOW
      FROM timezone('America/Costa_Rica', v_scheduled_for)
    )::integer;
    local_t := (timezone('America/Costa_Rica', v_scheduled_for))::time;

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
        = date_trunc('day', timezone('America/Costa_Rica', v_scheduled_for))
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

  v_reservation_metadata := jsonb_strip_nulls(
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
    v_scheduled_for,
    notes,
    v_reservation_metadata,
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
