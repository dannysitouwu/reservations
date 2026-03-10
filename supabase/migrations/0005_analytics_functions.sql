-- Analytics helper functions accessible without authentication

create or replace function public.analytics_overview()
returns table (
  total_reservations bigint,
  total_revenue bigint,
  average_ticket numeric,
  cancellation_rate numeric
)
language sql
security definer
set search_path = public
as $$
  with stats as (
    select
      count(*)::bigint as total_reservations,
      count(*) filter (where status in ('cancelled', 'rejected'))::bigint as cancelled_reservations,
      coalesce(sum(total_amount) filter (where status in ('confirmed', 'in_progress', 'fulfilled')), 0)::bigint as total_revenue,
      coalesce(avg(total_amount) filter (where status in ('confirmed', 'in_progress', 'fulfilled')), 0)::numeric as average_ticket
    from public.reservations
  )
  select
    total_reservations,
    total_revenue,
    average_ticket,
    case
      when total_reservations = 0 then 0
      else cancelled_reservations::numeric / total_reservations::numeric
    end as cancellation_rate
  from stats;
$$;

create or replace function public.analytics_monthly_revenue(months_count integer default 6)
returns table (
  month_start date,
  month_label text,
  reservations bigint,
  revenue bigint
)
language sql
security definer
set search_path = public
as $$
  with month_series as (
    select date_trunc('month', timezone('utc', now())) - (interval '1 month' * g) as month_start
    from generate_series(0, greatest(months_count, 1) - 1) as g
  )
  select
    ms.month_start::date,
    to_char(ms.month_start, 'YYYY-MM') as month_label,
    coalesce(count(r.*) filter (where r.status not in ('cancelled', 'rejected')), 0)::bigint as reservations,
    coalesce(sum(r.total_amount) filter (where r.status in ('confirmed', 'in_progress', 'fulfilled')), 0)::bigint as revenue
  from month_series ms
  left join public.reservations r on date_trunc('month', r.created_at) = ms.month_start
  group by ms.month_start
  order by ms.month_start;
$$;

create or replace function public.analytics_status_distribution()
returns table (
  status public.reservation_status,
  reservations bigint
)
language sql
security definer
set search_path = public
as $$
  select
    status,
    count(*)::bigint as reservations
  from public.reservations
  group by status
  order by status;
$$;

create or replace function public.analytics_service_performance(limit_count integer default 5)
returns table (
  service_name text,
  reservations bigint,
  revenue bigint,
  average_ticket numeric
)
language sql
security definer
set search_path = public
as $$
  select
    s.name as service_name,
    coalesce(count(r.*) filter (where r.status in ('confirmed', 'in_progress', 'fulfilled')), 0)::bigint as reservations,
    coalesce(sum(r.total_amount) filter (where r.status in ('confirmed', 'in_progress', 'fulfilled')), 0)::bigint as revenue,
    coalesce(avg(r.total_amount) filter (where r.status in ('confirmed', 'in_progress', 'fulfilled')), 0)::numeric as average_ticket
  from public.services s
  join public.service_options so on so.service_id = s.id
  left join public.reservations r on r.service_option_id = so.id
  group by s.id, s.name
  order by revenue desc
  limit greatest(limit_count, 1);
$$;

