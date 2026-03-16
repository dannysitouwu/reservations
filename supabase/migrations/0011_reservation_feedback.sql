-- Collect post-service feedback to support quality metrics and consistency in UI copy.

create table if not exists public.reservation_feedback (
  id bigserial primary key,
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_reservation_feedback_set_updated on public.reservation_feedback;

create trigger trg_reservation_feedback_set_updated
before update on public.reservation_feedback
for each row
execute function public.set_updated_at();

alter table public.reservation_feedback enable row level security;

drop policy if exists "Feedback: buyers read own" on public.reservation_feedback;
create policy "Feedback: buyers read own" on public.reservation_feedback
  for select using (auth.uid() = buyer_id);

drop policy if exists "Feedback: buyers upsert own" on public.reservation_feedback;
create policy "Feedback: buyers upsert own" on public.reservation_feedback
  for insert with check (auth.uid() = buyer_id);

drop policy if exists "Feedback: buyers update own" on public.reservation_feedback;
create policy "Feedback: buyers update own" on public.reservation_feedback
  for update using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

create or replace view public.feedback_summary_view as
select
  count(*)::bigint as total_reviews,
  coalesce(round(avg(rating)::numeric, 2), 0)::numeric as average_rating
from public.reservation_feedback;
