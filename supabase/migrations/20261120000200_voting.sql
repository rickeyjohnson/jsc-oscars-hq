-- Voting schema: seasons, ballots (rounds), categories, nominees, votes, results.
-- RLS on every table; vote window, self-vote and round rules enforced in the database.

create type public.ballot_status as enum ('draft','open','closed','released');
create type public.ballot_round as enum ('main','tiebreak','committee');
create type public.nominee_type as enum ('person','group','outsider','noun');
create type public.nominee_mode as enum ('everyone','subset','preset','group');
create type public.decided_by as enum ('votes','tiebreak','committee_vote','manual');

-- ---------------------------------------------------------------- tables

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ceremony_at timestamptz,
  location text,
  results_released_at timestamptz
);

create table public.ballots (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  parent_ballot_id uuid references public.ballots (id) on delete cascade,
  name text not null,
  round public.ballot_round not null default 'main',
  status public.ballot_status not null default 'draft',
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at),
  -- round ballots (and only they) point at their main ballot
  check ((round = 'main') = (parent_ballot_id is null))
);
create index ballots_season_id_idx on public.ballots (season_id);
create index ballots_parent_ballot_id_idx on public.ballots (parent_ballot_id);

-- categories belong to the main ballot only
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references public.ballots (id) on delete cascade,
  name text not null,
  description text not null default '',
  sort_order int not null default 0,
  nominee_mode public.nominee_mode not null default 'everyone',
  allow_member_add boolean not null default false
);
create index categories_ballot_id_idx on public.categories (ballot_id);

create table public.nominees (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  display_name text not null,
  secondary_text text,
  type public.nominee_type not null default 'person',
  member_ids uuid[] not null default '{}',
  created_by uuid default auth.uid()
);
create unique index nominees_category_name_key on public.nominees (category_id, lower(display_name));

create table public.round_nominees (
  ballot_id uuid not null references public.ballots (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  nominee_id uuid not null references public.nominees (id) on delete cascade,
  primary key (ballot_id, nominee_id)
);
create index round_nominees_category_id_idx on public.round_nominees (category_id);
create index round_nominees_nominee_id_idx on public.round_nominees (nominee_id);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  ballot_id uuid not null references public.ballots (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  nominee_id uuid not null references public.nominees (id) on delete cascade,
  voter_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ballot_id, category_id, voter_id)
);
create index votes_category_id_idx on public.votes (category_id);
create index votes_nominee_id_idx on public.votes (nominee_id);
create index votes_voter_id_idx on public.votes (voter_id);

create table public.results (
  category_id uuid primary key references public.categories (id) on delete cascade,
  decided_ballot_id uuid not null references public.ballots (id) on delete cascade,
  winner_nominee_id uuid references public.nominees (id) on delete set null,
  nominee_ids uuid[] not null default '{}',
  top3_nominee_ids uuid[] not null default '{}',
  decided_by public.decided_by,
  updated_at timestamptz not null default now()
);
create index results_decided_ballot_id_idx on public.results (decided_ballot_id);
create index results_winner_nominee_id_idx on public.results (winner_nominee_id);

-- server-side timestamps: clients cannot backdate a vote (CSV uses updated_at)
create function public.votes_set_timestamps() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
revoke execute on function public.votes_set_timestamps() from public, anon, authenticated;
create trigger votes_set_timestamps
  before insert or update on public.votes
  for each row execute function public.votes_set_timestamps();

-- ---------------------------------------------------------------- functions

create function public.ballot_is_open(p_ballot uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select b.status = 'open' and b.opens_at <= now() and now() < b.closes_at
    from public.ballots b where b.id = p_ballot
  ), false);
$$;

create function public.ballot_visible(p_ballot uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_committee() or coalesce((
    select b.status <> 'draft' and b.round <> 'committee'
    from public.ballots b where b.id = p_ballot
  ), false);
$$;

create function public.can_cast_vote(p_ballot uuid, p_category uuid, p_nominee uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select public.ballot_is_open(b.id)
      and c.ballot_id = coalesce(b.parent_ballot_id, b.id)
      and (b.round = 'main' or exists (
        select 1 from public.round_nominees rn
        where rn.ballot_id = b.id and rn.category_id = c.id and rn.nominee_id = n.id))
      and (b.round <> 'committee' or public.is_committee())
      and not exists (
        select 1 from public.members m
        where m.user_id = (select auth.uid()) and m.id = any (n.member_ids))
    from public.ballots b, public.categories c, public.nominees n
    where b.id = p_ballot and c.id = p_category and n.id = p_nominee
      and n.category_id = c.id
  ), false);
$$;

create function public.add_nominee(p_category uuid, p_display_name text, p_member_ids uuid[])
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_cat public.categories%rowtype;
  v_name text;
  v_ids uuid[];
  v_type public.nominee_type;
  v_count int;
  v_id uuid;
begin
  select * into v_cat from public.categories c where c.id = p_category;
  if not found or not public.ballot_is_open(v_cat.ballot_id) then
    raise exception 'ballot is not open';
  end if;

  if v_cat.nominee_mode = 'group' then
    select count(*), string_agg(m.name, ', ' order by m.name), array_agg(m.id order by m.name)
      into v_count, v_name, v_ids
      from public.members m where m.id = any (p_member_ids);
    -- unknown or repeated ids make the counts differ
    if v_count < 2 or v_count <> coalesce(cardinality(p_member_ids), 0) then
      raise exception 'a group needs at least two different members';
    end if;
    v_type := 'group';
  elsif v_cat.nominee_mode = 'preset' and v_cat.allow_member_add then
    if coalesce(cardinality(p_member_ids), 0) <> 0 then
      raise exception 'preset options cannot link members';
    end if;
    v_name := btrim(coalesce(p_display_name, ''));
    if v_name = '' then
      raise exception 'name is required';
    end if;
    if char_length(v_name) > 100 then
      raise exception 'name is too long';
    end if;
    v_ids := '{}';
    v_type := 'noun';
  else
    raise exception 'category does not accept new nominees';
  end if;

  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  values (p_category, v_name, v_type, v_ids, (select auth.uid()))
  on conflict (category_id, lower(display_name)) do nothing
  returning id into v_id;

  if v_id is null then
    select n.id into v_id from public.nominees n
    where n.category_id = p_category and lower(n.display_name) = lower(v_name);
  end if;
  return v_id;
end $$;

revoke execute on function public.ballot_is_open(uuid) from public, anon;
revoke execute on function public.ballot_visible(uuid) from public, anon;
revoke execute on function public.can_cast_vote(uuid, uuid, uuid) from public, anon;
revoke execute on function public.add_nominee(uuid, text, uuid[]) from public, anon;
grant execute on function public.ballot_is_open(uuid) to authenticated;
grant execute on function public.ballot_visible(uuid) to authenticated;
grant execute on function public.can_cast_vote(uuid, uuid, uuid) to authenticated;
grant execute on function public.add_nominee(uuid, text, uuid[]) to authenticated;

-- ---------------------------------------------------------------- grants + RLS

alter table public.seasons enable row level security;
alter table public.ballots enable row level security;
alter table public.categories enable row level security;
alter table public.nominees enable row level security;
alter table public.round_nominees enable row level security;
alter table public.votes enable row level security;
alter table public.results enable row level security;

revoke all on public.seasons, public.ballots, public.categories, public.nominees,
  public.round_nominees, public.votes, public.results from anon, authenticated;
grant select, insert, update, delete on public.seasons, public.ballots, public.categories,
  public.nominees, public.round_nominees, public.votes, public.results to authenticated;

-- seasons
create policy "seasons_select_authenticated" on public.seasons
  for select to authenticated using (true);
create policy "seasons_insert_committee" on public.seasons
  for insert to authenticated with check ((select public.is_committee()));
create policy "seasons_update_committee" on public.seasons
  for update to authenticated
  using ((select public.is_committee())) with check ((select public.is_committee()));
create policy "seasons_delete_committee" on public.seasons
  for delete to authenticated using ((select public.is_committee()));

-- ballots
create policy "ballots_select_visible" on public.ballots
  for select to authenticated using (public.ballot_visible(id));
create policy "ballots_insert_committee" on public.ballots
  for insert to authenticated with check ((select public.is_committee()));
create policy "ballots_update_committee" on public.ballots
  for update to authenticated
  using ((select public.is_committee())) with check ((select public.is_committee()));
create policy "ballots_delete_committee" on public.ballots
  for delete to authenticated using ((select public.is_committee()));

-- categories
create policy "categories_select_visible" on public.categories
  for select to authenticated using (public.ballot_visible(ballot_id));
create policy "categories_insert_committee" on public.categories
  for insert to authenticated with check ((select public.is_committee()));
create policy "categories_update_committee" on public.categories
  for update to authenticated
  using ((select public.is_committee())) with check ((select public.is_committee()));
create policy "categories_delete_committee" on public.categories
  for delete to authenticated using ((select public.is_committee()));

-- nominees
create policy "nominees_select_visible" on public.nominees
  for select to authenticated using (exists (
    select 1 from public.categories c
    where c.id = nominees.category_id and public.ballot_visible(c.ballot_id)));
create policy "nominees_insert_committee" on public.nominees
  for insert to authenticated with check ((select public.is_committee()));
create policy "nominees_update_committee" on public.nominees
  for update to authenticated
  using ((select public.is_committee())) with check ((select public.is_committee()));
create policy "nominees_delete_committee" on public.nominees
  for delete to authenticated using ((select public.is_committee()));

-- round_nominees
create policy "round_nominees_select_visible" on public.round_nominees
  for select to authenticated using (public.ballot_visible(ballot_id));
create policy "round_nominees_insert_committee" on public.round_nominees
  for insert to authenticated with check ((select public.is_committee()));
create policy "round_nominees_update_committee" on public.round_nominees
  for update to authenticated
  using ((select public.is_committee())) with check ((select public.is_committee()));
create policy "round_nominees_delete_committee" on public.round_nominees
  for delete to authenticated using ((select public.is_committee()));

-- votes
create policy "votes_select_own_or_committee" on public.votes
  for select to authenticated
  using (voter_id = (select auth.uid()) or (select public.is_committee()));
create policy "votes_insert_own_open" on public.votes
  for insert to authenticated
  with check (voter_id = (select auth.uid()) and public.can_cast_vote(ballot_id, category_id, nominee_id));
create policy "votes_update_own_open" on public.votes
  for update to authenticated
  using (voter_id = (select auth.uid()) and public.ballot_is_open(ballot_id))
  with check (voter_id = (select auth.uid()) and public.can_cast_vote(ballot_id, category_id, nominee_id));
create policy "votes_delete_own_open" on public.votes
  for delete to authenticated
  using (voter_id = (select auth.uid()) and public.ballot_is_open(ballot_id));

-- results
create policy "results_select_committee_or_released" on public.results
  for select to authenticated using (
    (select public.is_committee()) or exists (
      select 1 from public.categories c
      join public.ballots b on b.id = c.ballot_id
      join public.seasons s on s.id = b.season_id
      where c.id = results.category_id and s.results_released_at is not null));
create policy "results_insert_committee" on public.results
  for insert to authenticated with check ((select public.is_committee()));
create policy "results_update_committee" on public.results
  for update to authenticated
  using ((select public.is_committee())) with check ((select public.is_committee()));
create policy "results_delete_committee" on public.results
  for delete to authenticated using ((select public.is_committee()));

-- ---------------------------------------------------------------- seed

insert into public.seasons (name, ceremony_at) values ('JSC Oscars Fall 2026', '2026-12-04 20:00:00+00');
