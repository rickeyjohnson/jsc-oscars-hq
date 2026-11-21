-- DB CHANGE: MYOC ("make your own category"): member idea windows + committee review.
-- Paste this into the Supabase SQL editor; it is not applied automatically. Additive: no v1 table or policy changes.
--
-- Rules:
--   * windows are season-scoped, opens_at/closes_at set by the committee; a window is open while opens_at <= now() < closes_at
--   * a linked member may insert / edit / withdraw ONLY their own ideas, ONLY while the window is open,
--     at most 5 non-withdrawn ideas per member per window (withdrawing frees a slot)
--   * members read only their own ideas; the committee (public.is_committee()) reads and updates everything
--   * members can never set accepted / rejected / merged, merged_into or assigned_category, and cannot move or re-own an idea
--   * no delete for anyone (withdraw instead); nothing for anon

create table public.myoc_windows (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);
create index myoc_windows_season_idx on public.myoc_windows (season_id);

create table public.myoc_ideas (
  id uuid primary key default gen_random_uuid(),
  window_id uuid not null references public.myoc_windows (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  hint text check (hint in ('person','group','thing','other')),
  status text not null default 'submitted' check (status in ('submitted','withdrawn','accepted','rejected','merged')),
  merged_into uuid references public.myoc_ideas (id),
  assigned_category text check (char_length(assigned_category) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'merged') = (merged_into is not null)),
  check (merged_into is null or merged_into <> id)
);
create index myoc_ideas_window_idx on public.myoc_ideas (window_id);
create index myoc_ideas_author_idx on public.myoc_ideas (author_id);
create index myoc_ideas_merged_idx on public.myoc_ideas (merged_into);

-- ---------------------------------------------------------------- helpers
create function public.myoc_window_is_open(p_window uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select w.opens_at <= now() and now() < w.closes_at
    from public.myoc_windows w where w.id = p_window
  ), false);
$$;
revoke execute on function public.myoc_window_is_open(uuid) from public, anon;
grant execute on function public.myoc_window_is_open(uuid) to authenticated;

-- One guard for every write by a client role (postgres/service role seeding is not affected).
create function public.myoc_ideas_guard() returns trigger
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
    perform pg_advisory_xact_lock(hashtextextended(new.window_id::text || ':' || v_uid::text, 0));
    if (select count(*) from public.myoc_ideas i
        where i.window_id = new.window_id and i.author_id = v_uid and i.status <> 'withdrawn') >= 5 then
      raise exception 'suggestion limit reached';
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
revoke execute on function public.myoc_ideas_guard() from public, anon, authenticated;
create trigger myoc_ideas_guard
  before insert or update on public.myoc_ideas
  for each row execute function public.myoc_ideas_guard();

-- ---------------------------------------------------------------- grants + RLS
alter table public.myoc_windows enable row level security;
alter table public.myoc_ideas enable row level security;
revoke all on public.myoc_windows, public.myoc_ideas from anon, authenticated;

grant select on public.myoc_windows to authenticated;
grant insert (season_id, opens_at, closes_at) on public.myoc_windows to authenticated;
grant update (opens_at, closes_at) on public.myoc_windows to authenticated;
create policy "myoc_windows_select_authenticated" on public.myoc_windows
  for select to authenticated using (true);
create policy "myoc_windows_insert_committee" on public.myoc_windows
  for insert to authenticated with check ((select public.is_committee()));
create policy "myoc_windows_update_committee" on public.myoc_windows
  for update to authenticated
  using ((select public.is_committee())) with check ((select public.is_committee()));

-- columns a client may write; the guard trigger decides who may change what
grant select on public.myoc_ideas to authenticated;
grant insert (window_id, name, description, hint) on public.myoc_ideas to authenticated;
grant update (name, description, hint, status, merged_into, assigned_category) on public.myoc_ideas to authenticated;
create policy "myoc_ideas_select_own_or_committee" on public.myoc_ideas
  for select to authenticated
  using (author_id = (select auth.uid()) or (select public.is_committee()));
create policy "myoc_ideas_insert_own" on public.myoc_ideas
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy "myoc_ideas_update_own_or_committee" on public.myoc_ideas
  for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_committee()))
  with check (author_id = (select auth.uid()) or (select public.is_committee()));
