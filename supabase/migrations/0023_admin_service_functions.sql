-- Create secure RPC functions for admin service operations
-- These run as SECURITY DEFINER so they bypass RLS

DROP FUNCTION IF EXISTS public.admin_create_service(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_service_option(jsonb) CASCADE;

-- Function to create a service with proper authorization
CREATE OR REPLACE FUNCTION public.admin_create_service(service_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  service_id uuid;
  user_role text;
BEGIN
  -- Verify user is admin
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create services';
  END IF;

  -- Insert service
  INSERT INTO public.services (
    name,
    description,
    is_active,
    metadata
  ) VALUES (
    service_data->>'name',
    NULLIF(service_data->>'description', ''),
    COALESCE((service_data->>'is_active')::boolean, true),
    COALESCE((service_data->'metadata')::jsonb, '{}'::jsonb)
  ) RETURNING id INTO service_id;

  RETURN jsonb_build_object('id', service_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

-- Function to create a service option with photo
CREATE OR REPLACE FUNCTION public.admin_create_service_option(option_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  option_id uuid;
  user_role text;
BEGIN
  -- Verify user is admin
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create service options';
  END IF;

  -- Insert service option
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
  ) VALUES (
    (option_data->>'service_id')::uuid,
    option_data->>'name',
    NULLIF(option_data->>'description', ''),
    (option_data->>'duration_minutes')::integer,
    (option_data->>'base_price')::integer,
    COALESCE(option_data->>'currency_code', 'USD'),
    NULLIF(option_data->>'image_url', ''),
    COALESCE((option_data->>'is_active')::boolean, true),
    COALESCE((option_data->'metadata')::jsonb, '{}'::jsonb)
  ) RETURNING id INTO option_id;

  RETURN jsonb_build_object('id', option_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'success', false);
END;
$$;

-- Grant execute permission to authenticated users (who will be admins)
GRANT EXECUTE ON FUNCTION public.admin_create_service(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_service_option(jsonb) TO authenticated;
