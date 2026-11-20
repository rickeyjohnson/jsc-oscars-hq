-- Baseline schema, hand-written (no pull: remote project was brand new and empty).
-- Mirrors what client/src expects. Created here:
--   * public.profiles (user_id pk -> auth.users, username, display_name, email,
--     image_url, created_at, is_committee boolean not null default false), RLS on
--   * policies on profiles: select (authenticated), update own row (no insert/delete)
--   * public.is_committee_member() helper (security definer)
--   * public."oscarsEvents" (id, starts_at, ends_at, semester, name), RLS on:
--     select authenticated, write committee only
--   * function public.handle_new_user() + trigger on_auth_user_created on auth.users
--     (inserts profile; Task 2 replaces it). is_committee is NOT taken from signup metadata.
--   * storage bucket "profile-pics" (public) + policies: public read,
--     authenticated insert into bucket
-- Findings: only trigger on auth.users is on_auth_user_created.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text,
  display_name text,
  email text,
  image_url text,
  created_at timestamptz not null default now(),
  is_committee boolean not null default false
);
alter table public.profiles enable row level security;

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- users must not self-promote: block changes to is_committee/user_id from API roles
revoke update on public.profiles from authenticated, anon;
grant update (username, display_name, image_url) on public.profiles to authenticated;

create function public.is_committee_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_committee from public.profiles p where p.user_id = (select auth.uid())), false);
$$;
revoke execute on function public.is_committee_member() from public, anon;
grant execute on function public.is_committee_member() to authenticated;

create table public."oscarsEvents" (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz,
  ends_at timestamptz,
  semester text,
  name text
);
alter table public."oscarsEvents" enable row level security;
create policy "oscarsEvents_select_authenticated" on public."oscarsEvents"
  for select to authenticated using (true);
create policy "oscarsEvents_insert_committee" on public."oscarsEvents"
  for insert to authenticated with check ((select public.is_committee_member()));
create policy "oscarsEvents_update_committee" on public."oscarsEvents"
  for update to authenticated
  using ((select public.is_committee_member()))
  with check ((select public.is_committee_member()));
create policy "oscarsEvents_delete_committee" on public."oscarsEvents"
  for delete to authenticated using ((select public.is_committee_member()));

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, username, display_name, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'username'),
    new.email
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('profile-pics', 'profile-pics', true)
on conflict (id) do nothing;

create policy "profile_pics_public_read" on storage.objects
  for select to public using (bucket_id = 'profile-pics');
create policy "profile_pics_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'profile-pics');
