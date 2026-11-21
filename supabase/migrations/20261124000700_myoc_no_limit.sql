-- DB CHANGE (not applied): MYOC has no per-member idea limit (user decision). Paste into the Supabase SQL editor.
-- Replaces the guard from 20261124000200_myoc.sql with the same rules minus the 5-idea limit and its advisory lock.
-- Still enforced: own ideas only, window must be open, claimed members only, plain submissions,
-- no self accept/reject/merge, committee-only fields, immutable window/author.

-- One guard for every write by a client role (postgres/service role seeding is not affected).
create or replace function public.myoc_ideas_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_committee boolean;
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  if coalesce(auth.role(), '') not in ('authenticated','anon') then
    return new;
  end if;
  v_committee := public.is_committee();

  if tg_op = 'INSERT' then
    -- everyone (committee too) suggests as a member
    if v_uid is null or new.author_id is distinct from v_uid then
      raise exception 'you can only suggest as yourself' using errcode = '42501';
    end if;
    if not exists (select 1 from public.members m where m.user_id = v_uid) then
      raise exception 'only claimed members can suggest' using errcode = '42501';
    end if;
    if not public.myoc_window_is_open(new.window_id) then
      raise exception 'suggestions are not open';
    end if;
    if new.status <> 'submitted' or new.merged_into is not null or new.assigned_category is not null then
      raise exception 'new ideas must be plain submissions';
    end if;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  -- UPDATE
  if new.window_id is distinct from old.window_id or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'ideas cannot be moved or re-owned';
  end if;
  if v_committee then
    if new.merged_into is not null and not exists (
      select 1 from public.myoc_ideas t where t.id = new.merged_into and t.window_id = old.window_id
    ) then
      raise exception 'merge target must be in the same window';
    end if;
    return new;
  end if;
  -- member rules
  if old.author_id is distinct from v_uid then
    raise exception 'not your idea' using errcode = '42501';
  end if;
  if not public.myoc_window_is_open(old.window_id) then
    raise exception 'suggestions are closed';
  end if;
  if old.status <> 'submitted' then
    raise exception 'this idea can no longer be changed';
  end if;
  if new.status not in ('submitted','withdrawn') then
    raise exception 'status is read-only' using errcode = '42501';
  end if;
  if new.merged_into is distinct from old.merged_into or new.assigned_category is distinct from old.assigned_category then
    raise exception 'committee-only field' using errcode = '42501';
  end if;
  return new;
end $$;
