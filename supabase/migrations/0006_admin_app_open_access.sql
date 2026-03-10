-- Relax policies and helper functions so the admin app can operate without Supabase Auth.

-- Allow read access to profiles for the admin dashboard.
create policy if not exists "Profiles: admin app read"
  on public.profiles
  for select
  using (true);

-- Allow read access to reservations for dashboard tables and detail views.
create policy if not exists "Reservations: admin app read"
  on public.reservations
  for select
  using (true);

-- Update administrative helpers to skip worker role validation (the UI already enforces access).
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

create or replace function public.admin_update_reservation_status(reservation_id uuid, next_status public.reservation_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reservations
  set status = next_status
  where id = reservation_id;
end;
$$;

