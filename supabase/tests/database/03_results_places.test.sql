-- results.places tests. TAP lines are collected into public.__tap and printed by the final
-- select. Helper tables live only inside this transaction (begin ... rollback); NOT temp tables.
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(8);

-- ---------------------------------------------------------------- setup (as postgres)
-- live names may be claimed by real/seed users; rolled back with the transaction
update members set user_id = null, claimed_at = null where name in ('Rickey','Micah');
insert into public.__ids values ('rickey', tests.create_user('Rickey')), ('micah', tests.create_user('Micah'));
select tests.make_committee(public.__id('rickey'));
insert into public.__ids select 'micah_m', id from members where name = 'Micah';
insert into public.__ids select k, gen_random_uuid() from unnest(array['S','M','E','E2','nA','nB','nC']) k;

insert into seasons (id, name) values (public.__id('S'), 'Places test season');
insert into ballots (id, season_id, name, status, opens_at, closes_at) values
  (public.__id('M'), public.__id('S'), 'Main', 'closed', now() - interval '2 hours', now() - interval '1 hour');
insert into categories (id, ballot_id, name, nominee_mode) values
  (public.__id('E'), public.__id('M'), 'Everyone', 'everyone'),
  (public.__id('E2'), public.__id('M'), 'Everyone 2', 'everyone');
insert into nominees (id, category_id, display_name, type, member_ids) values
  (public.__id('nA'), public.__id('E'), 'A', 'person', array[public.__id('micah_m')]),
  (public.__id('nB'), public.__id('E'), 'B', 'person', '{}'),
  (public.__id('nC'), public.__id('E2'), 'C', 'person', '{}');

-- ---------------------------------------------------------------- column exists
insert into public.__tap(line) select has_column('public', 'results', 'places', 'results.places exists');

-- ---------------------------------------------------------------- as Rickey (committee)
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select lives_ok($$
  insert into results (category_id, decided_ballot_id, winner_nominee_id, nominee_ids, top3_nominee_ids, decided_by, places)
  values (public.__id('E'), public.__id('M'), public.__id('nA'),
    array[public.__id('nA'), public.__id('nB')], array[public.__id('nA'), public.__id('nB')], 'votes',
    jsonb_build_array(
      jsonb_build_object('nominee_id', public.__id('nA'), 'slot', 1, 'place', 1, 'tied', false),
      jsonb_build_object('nominee_id', public.__id('nB'), 'slot', 2, 'place', 2, 'tied', false)))
$$, 'committee writes places');
insert into public.__tap(line) select throws_ok($$ update results set places = '{"x":1}' where category_id = public.__id('E') $$, '23514', null, 'places must be an array');
insert into public.__tap(line) select throws_ok($$ update results set places = '[{"nominee_id":"x","slot":1,"place":1,"tied":false,"votes":5}]' where category_id = public.__id('E') $$, '23514', null, 'places never carry vote counts');
insert into public.__tap(line) select lives_ok($$
  insert into results (category_id, decided_ballot_id, winner_nominee_id, nominee_ids, top3_nominee_ids, decided_by)
  values (public.__id('E2'), public.__id('M'), public.__id('nC'), array[public.__id('nC')], array[public.__id('nC')], 'votes')
$$, 'places optional (rows recorded before the migration)');

-- ---------------------------------------------------------------- as Micah, before release
select tests.clear_authentication();
select tests.authenticate_as(public.__id('micah'));
insert into public.__tap(line) select is((select count(*)::int from results where category_id in (public.__id('E'), public.__id('E2'))), 0, 'member reads no places before release');
update results set places = '[]'::jsonb where category_id = public.__id('E');  -- RLS: 0 rows

-- ---------------------------------------------------------------- as postgres
select tests.clear_authentication();
insert into public.__tap(line) select is((select jsonb_array_length(places) from results where category_id = public.__id('E')), 2, 'member cannot change places');

update seasons set results_released_at = now() where id = public.__id('S');
select tests.authenticate_as(public.__id('micah'));
insert into public.__tap(line) select is((select places->0->>'nominee_id' from results where category_id = public.__id('E')), public.__id('nA')::text, 'member reads places after release');

select tests.clear_authentication();
insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
