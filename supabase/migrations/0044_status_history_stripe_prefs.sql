-- ============================================================================
-- 0044: Status history alignment, pgcrypto for admin_record_payment, payment prefs
-- ============================================================================
-- - Drop legacy trigger that duplicated history rows vs RPC inserts.
-- - insert_reservation_status_history: supports old_status/new_status OR status column.
-- - client_cancel_reservation, admin_record_payment: use helper + extensions.gen_random_bytes.
-- - admin_update_reservation_status: use helper (same logic as 0040).
-- - client_create_reservation: store preferred_payment_method in metadata.
-- - admin_set_preferred_payment_method: staff can correct buyer choice while pending.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DROP TRIGGER IF EXISTS trg_reservation_status_history ON public.reservations;
DROP FUNCTION IF EXISTS public.log_reservation_status_change() CASCADE;

CREATE OR REPLACE FUNCTION public.insert_reservation_status_history(
  p_reservation_id uuid,
  p_old public.reservation_status,
  p_new public.reservation_status,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_old_cols boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reservation_status_history'
      AND column_name = 'old_status'
  )
  INTO has_old_cols;

  IF has_old_cols THEN
    INSERT INTO public.reservation_status_history (reservation_id, old_status, new_status, reason)
    VALUES (p_reservation_id, p_old, p_new, p_reason);
  ELSE
    INSERT INTO public.reservation_status_history (reservation_id, status, reason)
    VALUES (p_reservation_id, p_new, p_reason);
  END IF;
END;
$$;

-- --------------------------------------------------------------------------
-- client_cancel_reservation
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.client_cancel_reservation(reservation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.reservations%ROWTYPE;
  v_old public.reservation_status;
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

  v_old := r.status;

  UPDATE public.reservations
  SET status = 'cancelled', updated_at = timezone('utc', now())
  WHERE id = reservation_id;

  PERFORM public.insert_reservation_status_history(
    reservation_id,
    v_old,
    'cancelled'::public.reservation_status,
    'Cancelled by buyer'
  );

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

-- --------------------------------------------------------------------------
-- admin_record_payment
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_record_payment(
  p_reservation_id uuid,
  amount_cents integer,
  payment_method text,
  external_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r public.reservations%ROWTYPE;
  tx_id text;
  v_old public.reservation_status;
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
    'loc-' || encode(extensions.gen_random_bytes(8), 'hex')
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
    v_old := r.status;
    UPDATE public.reservations
    SET status = 'paid', updated_at = timezone('utc', now())
    WHERE id = p_reservation_id;
    PERFORM public.insert_reservation_status_history(
      p_reservation_id,
      v_old,
      'paid'::public.reservation_status,
      'Payment recorded'
    );
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

-- --------------------------------------------------------------------------
-- admin_update_reservation_status (align history insert with 0040 + helper)
-- --------------------------------------------------------------------------
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

  PERFORM public.insert_reservation_status_history(
    reservation_id,
    v_current,
    v_next,
    'Admin status update'
  );

  INSERT INTO public.admin_audit_log (actor_id, action, target_table, target_id, details)
  VALUES (
    auth.uid(),
    'update_reservation_status',
    'reservations',
    reservation_id::text,
    jsonb_build_object('from', v_current, 'to', v_next)
  );

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

-- --------------------------------------------------------------------------
-- admin_set_preferred_payment_method
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_preferred_payment_method(
  p_reservation_id uuid,
  p_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not allowed' USING errcode = '42501';
  END IF;

  IF lower(trim(p_method)) NOT IN ('sinpe', 'card', 'cash') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payment method');
  END IF;

  UPDATE public.reservations
  SET
    metadata = COALESCE(metadata, '{}'::jsonb)
      || jsonb_build_object('preferred_payment_method', lower(trim(p_method))),
    updated_at = timezone('utc', now())
  WHERE id = p_reservation_id
    AND status = 'pending';

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found or not pending');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_preferred_payment_method(uuid, text) TO authenticated;

-- --------------------------------------------------------------------------
-- client_create_reservation: preferred_payment_method
-- --------------------------------------------------------------------------
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
  payment_pref text;
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
  payment_pref := lower(nullif(trim(reservation_input->>'preferred_payment_method'), ''));

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

  IF payment_pref IS NOT NULL AND payment_pref NOT IN ('sinpe', 'card', 'cash') THEN
    RAISE EXCEPTION 'preferred_payment_method must be sinpe, card, or cash' USING errcode = '22023';
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
      'contact_preference', contact_preference,
      'preferred_payment_method', payment_pref
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

GRANT EXECUTE ON FUNCTION public.client_create_reservation(jsonb) TO authenticated;

-- --------------------------------------------------------------------------
-- complete_reservation_payment_from_gateway (Edge Function / service_role)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_reservation_payment_from_gateway(
  p_reservation_id uuid,
  p_payment_intent_id text,
  p_amount_cents integer,
  p_currency text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.reservations%ROWTYPE;
  v_old public.reservation_status;
  cur text := upper(trim(COALESCE(p_currency, 'USD')));
BEGIN
  IF COALESCE((auth.jwt() ->> 'role'), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not allowed' USING errcode = '42501';
  END IF;

  IF p_payment_intent_id IS NULL OR length(trim(p_payment_intent_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'payment_intent_id required');
  END IF;

  SELECT * INTO r FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation not found');
  END IF;

  IF r.status = 'paid' THEN
    RETURN jsonb_build_object('success', true, 'already_paid', true);
  END IF;

  IF r.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reservation is not pending');
  END IF;

  IF r.total_amount IS DISTINCT FROM p_amount_cents THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount mismatch');
  END IF;

  IF upper(trim(COALESCE(r.currency_code::text, 'USD'))) <> cur THEN
    RETURN jsonb_build_object('success', false, 'error', 'Currency mismatch');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.reservation_payments rp
    WHERE rp.transaction_id = p_payment_intent_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END IF;

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
    p_amount_cents,
    r.currency_code,
    'completed',
    'card',
    p_payment_intent_id,
    'Stripe PaymentIntent'
  );

  v_old := r.status;
  UPDATE public.reservations
  SET status = 'paid', updated_at = timezone('utc', now())
  WHERE id = p_reservation_id;

  PERFORM public.insert_reservation_status_history(
    p_reservation_id,
    v_old,
    'paid'::public.reservation_status,
    'Stripe card payment confirmed'
  );

  INSERT INTO public.notification_outbox (template, recipient_email, payload)
  SELECT
    'payment_receipt',
    p.email,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'public_reference', r.public_reference,
      'amount_cents', p_amount_cents,
      'method', 'card',
      'transaction_id', p_payment_intent_id
    )
  FROM public.profiles p
  WHERE p.id = r.buyer_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', true, 'duplicate', true);
WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_reservation_payment_from_gateway(uuid, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_reservation_payment_from_gateway(uuid, text, integer, text) TO service_role;
