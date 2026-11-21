-- Members allowlist, signup claim, committee lock.

create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  user_id uuid unique references auth.users (id) on delete set null,
  claimed_at timestamptz
);
alter table public.members enable row level security;
revoke all on public.members from anon, authenticated;
grant select on public.members to authenticated;
create policy "members_select_authenticated" on public.members
  for select to authenticated using (true);

insert into public.members (name) values
  ('Anthony'),('Dakarai'),('Demichael'),('Micah'),('Rico'),('Nick'),('Rickey'),
  ('Kadin'),('Langston'),('Jonathan'),('John Sampson'),('Evan'),('TJ'),('Justin');

alter table public.profiles add column if not exists is_committee boolean not null default false;
alter table public.profiles alter column is_committee type boolean
  using (is_committee::text in ('true','t'));

create function public.is_committee() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_committee from public.profiles p where p.user_id = (select auth.uid())), false);
$$;
revoke execute on function public.is_committee() from public, anon;
grant execute on function public.is_committee() to authenticated;

-- replace uses of the Task 1 helper, then drop it
drop policy "oscarsEvents_insert_committee" on public."oscarsEvents";
drop policy "oscarsEvents_update_committee" on public."oscarsEvents";
drop policy "oscarsEvents_delete_committee" on public."oscarsEvents";
create policy "oscarsEvents_insert_committee" on public."oscarsEvents"
  for insert to authenticated with check ((select public.is_committee()));
create policy "oscarsEvents_update_committee" on public."oscarsEvents"
  for update to authenticated
  using ((select public.is_committee()))
  with check ((select public.is_committee()));
create policy "oscarsEvents_delete_committee" on public."oscarsEvents"
  for delete to authenticated using ((select public.is_committee()));
drop function public.is_committee_member();

-- profiles policies: drop old, recreate
drop policy "profiles_select_authenticated" on public.profiles;
drop policy "profiles_update_own" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- column grant lets the guard trigger (not a bare 42501) report the denial
grant update (is_committee) on public.profiles to authenticated;

create function public.profiles_guard_committee() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.role() in ('authenticated','anon') then
    if tg_op = 'INSERT' and new.is_committee then
      raise exception 'is_committee is read-only';
    elsif tg_op = 'UPDATE' and new.is_committee is distinct from old.is_committee then
      raise exception 'is_committee is read-only';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard_committee
  before insert or update on public.profiles
  for each row execute function public.profiles_guard_committee();

create function public.available_member_names() returns setof text
language sql stable security definer set search_path = '' as $$
  select name from public.members where user_id is null order by name;
$$;
revoke execute on function public.available_member_names() from public;
grant execute on function public.available_member_names() to anon, authenticated;

create function public.reset_member_claim(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_committee() then
    raise exception 'committee only';
  end if;
  update public.members set user_id = null, claimed_at = null where name = p_name;
end $$;
revoke execute on function public.reset_member_claim(text) from public, anon;
grant execute on function public.reset_member_claim(text) to authenticated;

-- replace Task 1 trigger + function
drop trigger on_auth_user_created on auth.users;
drop function public.handle_new_user();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_name text := new.raw_user_meta_data ->> 'member_name';
begin
  update public.members set user_id = new.id, claimed_at = now()
  where name = v_name and user_id is null;
  if not found then
    raise exception 'member name % is not available', v_name;
  end if;
  insert into public.profiles (user_id, username, display_name, email, is_committee)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'username'),
    new.email,
    false
  )
  on conflict (user_id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
