-- Keep auth.users and public.profiles in sync
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, metadata)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email,
      updated_at = timezone('utc', now())
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_email_update();

-- Backfill existing profiles (safe to rerun)
insert into public.profiles (id, email, full_name, metadata)
select u.id,
       u.email,
       u.raw_user_meta_data->>'full_name',
       coalesce(u.raw_user_meta_data, '{}'::jsonb)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
