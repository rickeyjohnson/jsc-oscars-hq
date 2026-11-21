-- One round of each kind per main ballot. TAP lines are collected into public.__tap and printed by the final select.
-- Helper tables live only inside this transaction (begin ... rollback); NOT temp tables.
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(4);

insert into public.__ids select k, gen_random_uuid() from unnest(array['S','M','M2']) k;
insert into seasons (id, name) values (public.__id('S'), 'Round season');
insert into ballots (id, season_id, name, status, opens_at, closes_at) values
  (public.__id('M'),  public.__id('S'), 'Main',  'closed', now() - interval '3 hours', now() - interval '2 hours'),
  (public.__id('M2'), public.__id('S'), 'Main 2', 'closed', now() - interval '3 hours', now() - interval '2 hours');

insert into public.__tap(line) select lives_ok($$ insert into ballots (season_id, parent_ballot_id, name, round, status, opens_at, closes_at)
  values (public.__id('S'), public.__id('M'), 'Tiebreak', 'tiebreak', 'open', now(), now() + interval '1 day') $$, 'first tiebreak is fine');
insert into public.__tap(line) select throws_ok($$ insert into ballots (season_id, parent_ballot_id, name, round, status, opens_at, closes_at)
  values (public.__id('S'), public.__id('M'), 'Tiebreak again', 'tiebreak', 'open', now(), now() + interval '1 day') $$, '23505', null, 'a second tiebreak for the same main ballot is refused');
insert into public.__tap(line) select lives_ok($$ insert into ballots (season_id, parent_ballot_id, name, round, status, opens_at, closes_at)
  values (public.__id('S'), public.__id('M'), 'Committee', 'committee', 'open', now(), now() + interval '1 day') $$, 'a committee round of the same main ballot is a different kind');
insert into public.__tap(line) select lives_ok($$ insert into ballots (season_id, parent_ballot_id, name, round, status, opens_at, closes_at)
  values (public.__id('S'), public.__id('M2'), 'Tiebreak', 'tiebreak', 'open', now(), now() + interval '1 day') $$, 'another main ballot can have its own tiebreak');

insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
