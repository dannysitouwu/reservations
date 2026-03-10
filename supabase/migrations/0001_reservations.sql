-- Enable required extensions
create extension if not exists "pgcrypto" with schema public;
create extension if not exists "uuid-ossp" with schema public;

-- Domain types and helpers ---------------------------------------------------
create type public.reservation_status as enum (
  'pending',
  'awaiting_confirmation',
  'confirmed',
  'in_progress',
  'fulfilled',
  'cancelled',
  'rejected'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.generate_public_reference()
returns text
language plpgsql
security definer
set search_path = public
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

-- Core tables ----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  role text not null default 'buyer' check (role in ('buyer', 'worker', 'admin')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_profiles_set_updated
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.current_profile_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_worker()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_profile_role() in ('worker', 'admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_profile_role() = 'admin', false);
$$;

create or replace function public.is_buyer()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_profile_role() = 'buyer', false);
$$;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_services_set_updated
before update on public.services
for each row
execute function public.set_updated_at();

create table public.service_options (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  base_price integer not null check (base_price >= 0),
  currency_code char(3) not null default 'USD',
  metadata jsonb default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_service_options_set_updated
before update on public.service_options
for each row
execute function public.set_updated_at();

create table public.service_option_availability (
  id bigserial primary key,
  service_option_id uuid not null references public.service_options(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  capacity smallint not null default 1 check (capacity > 0),
  unique (service_option_id, weekday, start_time, end_time)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique default public.generate_public_reference(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  service_option_id uuid not null references public.service_options(id) on delete restrict,
  status public.reservation_status not null default 'pending',
  scheduled_for timestamptz,
  assigned_worker_id uuid references public.profiles(id) on delete set null,
  total_amount integer,
  currency_code char(3) not null default 'USD',
  notes text,
  internal_notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_reservations_set_updated
before update on public.reservations
for each row
execute function public.set_updated_at();

create table public.reservation_status_transitions (
  from_status public.reservation_status not null,
  to_status public.reservation_status not null,
  constraint reservation_status_transitions_pk primary key (from_status, to_status)
);

insert into public.reservation_status_transitions (from_status, to_status) values
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

create or replace function public.enforce_reservation_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status <> old.status then
    if not exists (
      select 1
      from public.reservation_status_transitions
      where from_status = old.status
        and to_status = new.status
    ) then
      raise exception 'Invalid reservation status transition from % to %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_reservations_enforce_status
before update on public.reservations
for each row
execute function public.enforce_reservation_status_transition();

create table public.reservation_status_history (
  id bigserial primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  status public.reservation_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.log_reservation_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.reservation_status_history(reservation_id, status, changed_by)
    values (new.id, new.status, new.assigned_worker_id);
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    insert into public.reservation_status_history(reservation_id, status, changed_by)
    values (new.id, new.status, coalesce(auth.uid(), new.assigned_worker_id));
  end if;
  return new;
end;
$$;

create trigger trg_reservations_log_status
after insert or update on public.reservations
for each row
execute function public.log_reservation_status_change();

create table public.reservation_notes (
  id bigserial primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  visibility text not null default 'internal' check (visibility in ('internal', 'buyer')),
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- Views ----------------------------------------------------------------------
create or replace view public.service_options_view as
select
  so.id,
  so.name,
  so.description,
  so.duration_minutes,
  so.base_price,
  so.currency_code,
  s.name as service_name
from public.service_options so
join public.services s on s.id = so.service_id
where so.is_active = true
  and s.is_active = true;

create or replace view public.reservations_view as
select
  r.id,
  r.public_reference,
  r.status,
  r.scheduled_for,
  r.created_at,
  r.updated_at,
  r.buyer_id,
  buyer.email as buyer_email,
  buyer.full_name as buyer_name,
  r.assigned_worker_id,
  worker.full_name as assigned_worker_name
from public.reservations r
join public.profiles buyer on buyer.id = r.buyer_id
left join public.profiles worker on worker.id = r.assigned_worker_id;

create or replace view public.reservations_detail_view as
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
  buyer.full_name as buyer_name,
  buyer.email as buyer_email,
  buyer.phone as buyer_phone,
  worker.full_name as assigned_worker_name,
  so.name as service_name,
  so.duration_minutes
from public.reservations r
join public.profiles buyer on buyer.id = r.buyer_id
left join public.profiles worker on worker.id = r.assigned_worker_id
join public.service_options so on so.id = r.service_option_id;

-- Stored procedures and RPC helpers -----------------------------------------
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
begin
  if buyer is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  option_id := (reservation_input ->> 'service_option_id')::uuid;
  scheduled_for := (reservation_input ->> 'scheduled_for')::timestamptz;
  notes := nullif(reservation_input ->> 'notes', '');

  if option_id is null then
    raise exception 'service_option_id is required' using errcode = '22023';
  end if;

  select coalesce(so.is_active and s.is_active, false)
  into service_active
  from public.service_options so
  join public.services s on s.id = so.service_id
  where so.id = option_id;

  if not coalesce(service_active, false) then
    raise exception 'Selected service option is not available' using errcode = '22023';
  end if;

  insert into public.reservations (buyer_id, service_option_id, scheduled_for, notes)
  values (buyer, option_id, scheduled_for, notes)
  returning id into new_reservation_id;

  return jsonb_build_object('reservation_id', new_reservation_id);
end;
$$;

create or replace function public.public_find_reservation_by_reference(reference_code text)
returns table (
  id uuid,
  public_reference text,
  status public.reservation_status,
  scheduled_for timestamptz,
  service_name text,
  assigned_worker_name text,
  buyer_name text
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
    buyer.full_name as buyer_name
  from public.reservations r
  join public.service_options so on so.id = r.service_option_id
  left join public.profiles worker on worker.id = r.assigned_worker_id
  join public.profiles buyer on buyer.id = r.buyer_id
  where r.public_reference = upper(reference_code);
$$;

create or replace function public.admin_update_reservation_status(reservation_id uuid, next_status public.reservation_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_worker() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  update public.reservations
  set status = next_status
  where id = reservation_id;
end;
$$;

create or replace function public.admin_reservations_kpi()
returns table (
  pending_reservations bigint,
  confirmed_reservations bigint,
  revenue_this_month bigint,
  average_response_minutes numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_worker() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  return query
  select
    count(*) filter (where status in ('pending', 'awaiting_confirmation')) as pending_reservations,
    count(*) filter (where status in ('confirmed', 'in_progress', 'fulfilled')) as confirmed_reservations,
    coalesce(sum(total_amount) filter (where date_trunc('month', created_at) = date_trunc('month', timezone('utc', now()))), 0) as revenue_this_month,
    (
      select avg(extract(epoch from (h.created_at - r.created_at)) / 60)
      from public.reservation_status_history h
      join public.reservations r on r.id = h.reservation_id
      where h.status in ('awaiting_confirmation', 'confirmed')
    ) as average_response_minutes;
end;
$$;

create or replace function public.admin_set_profile_role(target_email text, target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  if target_role not in ('buyer', 'worker', 'admin') then
    raise exception 'Invalid role value' using errcode = '22023';
  end if;

  update public.profiles
  set role = target_role
  where email = target_email;

  if not found then
    raise exception 'Profile not found for email %', target_email using errcode = 'P0002';
  end if;
end;
$$;

-- Row Level Security ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.service_options enable row level security;
alter table public.service_option_availability enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_status_history enable row level security;
alter table public.reservation_notes enable row level security;

create policy "Profiles: self access" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles: workers view" on public.profiles
  for select to authenticated using (public.is_worker());

create policy "Profiles: self update" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Profiles: admin manage" on public.profiles
  for all using (public.is_admin())
  with check (public.is_admin());

create policy "Services: public read" on public.services
  for select using (true);

create policy "Service options: public read" on public.service_options
  for select using (true);

create policy "Availability: public read" on public.service_option_availability
  for select using (true);

create policy "Reservations: buyers read own" on public.reservations
  for select using (auth.uid() = buyer_id);

create policy "Reservations: buyers insert own" on public.reservations
  for insert with check (auth.uid() = buyer_id);

create policy "Reservations: buyers cancel own" on public.reservations
  for update using (auth.uid() = buyer_id and status in ('pending', 'awaiting_confirmation'))
  with check (
    auth.uid() = buyer_id and status in ('pending', 'awaiting_confirmation', 'cancelled')
  );

create policy "Reservations: workers manage" on public.reservations
  for all using (public.is_worker())
  with check (public.is_worker());

create policy "Reservation history: buyers and workers" on public.reservation_status_history
  for select using (
    public.is_worker() or exists (
      select 1
      from public.reservations r
      where r.id = reservation_id and r.buyer_id = auth.uid()
    )
  );

create policy "Reservation notes: workers manage" on public.reservation_notes
  for all using (public.is_worker())
  with check (public.is_worker());

create policy "Reservation notes: buyers read visible" on public.reservation_notes
  for select using (
    exists (
      select 1
      from public.reservations r
      where r.id = reservation_id
        and r.buyer_id = auth.uid()
    ) and visibility = 'buyer'
  );

-- Seed roles -----------------------------------------------------------------
insert into public.services (id, name, description)
values
  (gen_random_uuid(), 'Default Service', 'Placeholder service until real data is added')
  on conflict do nothing;

