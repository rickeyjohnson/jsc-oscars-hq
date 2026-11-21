-- past_stats RLS and constraints. TAP lines are collected into public.__tap and printed by the final select.
-- Helper tables live only inside this transaction (begin ... rollback); NOT temp tables.
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(11);

update members set user_id = null, claimed_at = null where name in ('Rickey','Kadin'); -- real accounts may hold these names; undone by the rollback
insert into public.__ids values ('rickey', tests.create_user('Rickey')), ('kadin', tests.create_user('Kadin'));
select tests.make_committee(public.__id('rickey'));
insert into public.__ids select lower(name) || '_m', id from members where name in ('Rickey','Kadin');

-- seeded as postgres (bypasses RLS)
insert into public.past_stats (season_label, season_order, member_id, noms, wins) values
  ('TEST A', 90, public.__id('rickey_m'), 10, 4),
  ('TEST A', 90, public.__id('kadin_m'), 6, 0);

-- ---------------------------------------------------------------- a plain member
select tests.authenticate_as(public.__id('kadin'));
insert into public.__tap(line) select is((select count(*)::int from public.past_stats where season_label = 'TEST A'), 2, 'a member reads every row');
insert into public.__tap(line) select throws_ok($$ insert into public.past_stats (season_label, season_order, member_id, noms, wins)
  values ('TEST B', 91, public.__id('kadin_m'), 1, 0) $$, '42501', null, 'a member cannot insert');
with u as (update public.past_stats set wins = 1 where season_label = 'TEST A' returning 1) insert into public.__tap(line) select is((select count(*)::int from u), 0, 'a member cannot update (no row is visible to update)');
with d as (delete from public.past_stats where season_label = 'TEST A' returning 1) insert into public.__tap(line) select is((select count(*)::int from d), 0, 'a member cannot delete');

-- ---------------------------------------------------------------- committee
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select lives_ok($$ insert into public.past_stats (season_label, season_order, member_id, noms, wins)
  values ('TEST B', 91, public.__id('rickey_m'), 5, 5) $$, 'committee can insert');
insert into public.__tap(line) select lives_ok($$ update public.past_stats set wins = 3 where season_label = 'TEST A' and member_id = public.__id('rickey_m') $$, 'committee can update');
insert into public.__tap(line) select is((select wins from public.past_stats where season_label = 'TEST A' and member_id = public.__id('rickey_m')), 3, 'the update stuck');
insert into public.__tap(line) select throws_ok($$ insert into public.past_stats (season_label, season_order, member_id, noms, wins)
  values ('TEST A', 90, public.__id('rickey_m'), 1, 0) $$, '23505', null, 'one row per member per semester');
insert into public.__tap(line) select throws_ok($$ update public.past_stats set wins = 11 where season_label = 'TEST A' and member_id = public.__id('rickey_m') $$, '23514', null, 'wins cannot exceed noms');
insert into public.__tap(line) select lives_ok($$ delete from public.past_stats where season_label = 'TEST B' $$, 'committee can delete');

-- ---------------------------------------------------------------- anon
select tests.authenticate_anon();
insert into public.__tap(line) select throws_ok($$ select * from public.past_stats $$, '42501', null, 'anon has no access');

select tests.clear_authentication();
insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
