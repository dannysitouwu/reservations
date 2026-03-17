-- Fix total_amount not being calculated in reservation creation
-- This migration:
-- 1. Updates client_create_reservation to calculate total_amount from service_option.base_price
-- 2. Backfills existing reservations with NULL total_amount

-- Backfill existing reservations with NULL total_amount using service_option price
UPDATE public.reservations r
SET total_amount = so.base_price
FROM public.service_options so
WHERE r.service_option_id = so.id
  AND r.total_amount IS NULL;

-- Update the function to calculate and pass total_amount
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
  price_amount integer;
BEGIN
  IF buyer IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '42501';
  END IF;

  option_id := (reservation_input ->> 'service_option_id')::uuid;
  scheduled_for := (reservation_input ->> 'scheduled_for')::timestamptz;
  notes := nullif(reservation_input ->> 'notes', '');

  IF option_id IS NULL THEN
    RAISE EXCEPTION 'service_option_id is required' USING errcode = '22023';
  END IF;

  -- Get service_option details and validate
  SELECT coalesce(so.is_active AND s.is_active, false), so.base_price
  INTO service_active, price_amount
  FROM public.service_options so
  JOIN public.services s ON s.id = so.service_id
  WHERE so.id = option_id;

  IF NOT coalesce(service_active, false) THEN
    RAISE EXCEPTION 'Selected service option is not available' USING errcode = '22023';
  END IF;

  -- Insert reservation WITH total_amount from service_option.base_price
  INSERT INTO public.reservations (buyer_id, service_option_id, scheduled_for, notes, total_amount)
  VALUES (buyer, option_id, scheduled_for, notes, price_amount)
  RETURNING id INTO new_reservation_id;

  RETURN jsonb_build_object('reservation_id', new_reservation_id);
END;
$$;
