-- Fix: gen_random_bytes lives in 'extensions' schema on Supabase,
-- but generate_public_reference() was looking for it in 'public'.
-- Re-create the helper so it qualifies the call correctly.

create extension if not exists "pgcrypto" with schema extensions;

create or replace function public.generate_public_reference()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(encode(gen_random_bytes(4), 'hex'));
    exit when not exists(select 1 from public.reservations where public_reference = candidate);
  end loop;
  return candidate;
end;
$$;
