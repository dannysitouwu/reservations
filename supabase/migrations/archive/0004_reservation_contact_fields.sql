-- Extend reservation contact data captured from the client application
create or replace function public.client_create_reservation(reservation_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
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
begin
  if buyer is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  option_id := (reservation_input ->> 'service_option_id')::uuid;
  scheduled_for := (reservation_input ->> 'scheduled_for')::timestamptz;
  notes := nullif(reservation_input ->> 'notes', '');
  contact_name := nullif(reservation_input ->> 'contact_full_name', '');
  contact_phone := nullif(reservation_input ->> 'contact_phone', '');
  contact_preference := nullif(reservation_input ->> 'contact_preference', '');
  party_size_text := nullif(reservation_input ->> 'party_size', '');

  if option_id is null then
    raise exception 'service_option_id is required' using errcode = '22023';
  end if;

  if contact_name is null then
    raise exception 'contact_full_name is required' using errcode = '22023';
  end if;

  if contact_phone is null then
    raise exception 'contact_phone is required' using errcode = '22023';
  end if;

  if party_size_text is not null then
    party_size := party_size_text::integer;
    if party_size <= 0 then
      raise exception 'party_size must be greater than zero' using errcode = '22023';
    end if;
  end if;

  select coalesce(so.is_active and s.is_active, false)
  into service_active
  from public.service_options so
  join public.services s on s.id = so.service_id
  where so.id = option_id;

  if not coalesce(service_active, false) then
    raise exception 'Selected service option is not available' using errcode = '22023';
  end if;

  if contact_name is not null or contact_phone is not null then
    update public.profiles
    set full_name = coalesce(contact_name, full_name),
        phone = coalesce(contact_phone, phone)
    where id = buyer;
  end if;

  metadata := jsonb_strip_nulls(
    jsonb_build_object(
      'contact_full_name', contact_name,
      'contact_phone', contact_phone,
      'party_size', party_size,
      'contact_preference', contact_preference
    )
  );

  insert into public.reservations (buyer_id, service_option_id, scheduled_for, notes, metadata)
  values (buyer, option_id, scheduled_for, notes, metadata)
  returning id into new_reservation_id;

  return jsonb_build_object('reservation_id', new_reservation_id);
end;
$$;

drop view if exists public.reservations_detail_view;

create view public.reservations_detail_view as
select
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
  buyer.full_name as buyer_name,
  buyer.email as buyer_email,
  buyer.phone as buyer_phone,
  worker.full_name as assigned_worker_name,
  so.name as service_name,
  so.duration_minutes,
  (r.metadata ->> 'contact_preference') as contact_preference,
  (r.metadata ->> 'party_size')::integer as party_size
from public.reservations r
join public.profiles buyer on buyer.id = r.buyer_id
left join public.profiles worker on worker.id = r.assigned_worker_id
join public.service_options so on so.id = r.service_option_id;

create or replace function public.public_find_reservation_by_reference(reference_code text)
returns table (
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
language sql
stable
as $$
  select
    r.id,
    r.public_reference,
    r.status,
    r.scheduled_for,
    so.name as service_name,
    worker.full_name as assigned_worker_name,
    buyer.full_name as buyer_name,
    r.metadata ->> 'contact_preference' as contact_preference,
    (r.metadata ->> 'party_size')::integer as party_size
  from public.reservations r
  join public.service_options so on so.id = r.service_option_id
  left join public.profiles worker on worker.id = r.assigned_worker_id
  join public.profiles buyer on buyer.id = r.buyer_id
  where r.public_reference = upper(reference_code);
$$;

