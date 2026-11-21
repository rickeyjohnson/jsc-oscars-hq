-- reopen_ballot tests. TAP lines are collected into public.__tap and printed by the final
-- select. Helper tables live only inside this transaction (begin ... rollback); NOT temp tables.
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(19);

-- ---------------------------------------------------------------- setup (as postgres)
update members set user_id = null, claimed_at = null where name in ('Rickey','Micah');
insert into public.__ids values ('rickey', tests.create_user('Rickey')), ('micah', tests.create_user('Micah'));
select tests.make_committee(public.__id('rickey'));
insert into public.__ids select k, gen_random_uuid() from unnest(array[
  'S','SR','M','MO','MP','MD','MR','MT','T','MG','C1','C2','C3','C4','C5','C6','C7','nA','nB','nC','nD','nE','nF','nG']) k;

insert into seasons (id, name, results_released_at) values
  (public.__id('S'), 'Reopen season', null),
  (public.__id('SR'), 'Released season', now());
insert into ballots (id, season_id, name, status, opens_at, closes_at) values
  (public.__id('M'),  public.__id('S'),  'Closed main',        'closed', now() - interval '3 hours', now() - interval '2 hours'),
  (public.__id('MO'), public.__id('S'),  'Open, window over',  'open',   now() - interval '3 hours', now() - interval '1 hour'),
  (public.__id('MP'), public.__id('S'),  'Still running',      'open',   now() - interval '3 hours', now() + interval '1 hour'),
  (public.__id('MD'), public.__id('S'),  'Draft',              'draft',  now() + interval '1 day',   now() + interval '2 days'),
  (public.__id('MR'), public.__id('SR'), 'In released season', 'closed', now() - interval '3 hours', now() - interval '2 hours'),
  (public.__id('MT'), public.__id('S'),  'Main with a round',  'closed', now() - interval '3 hours', now() - interval '2 hours');
insert into ballots (id, season_id, parent_ballot_id, name, round, status, opens_at, closes_at) values
  (public.__id('T'), public.__id('S'), public.__id('MT'), 'Tiebreak', 'tiebreak', 'closed', now() - interval '90 minutes', now() - interval '1 hour');
insert into categories (id, ballot_id, name, nominee_mode) values
  (public.__id('C1'), public.__id('M'),  'Cat 1', 'everyone'),
  (public.__id('C2'), public.__id('MO'), 'Cat 2', 'everyone'),
  (public.__id('C3'), public.__id('MP'), 'Cat 3', 'everyone'),
  (public.__id('C4'), public.__id('MD'), 'Cat 4', 'everyone'),
  (public.__id('C5'), public.__id('MR'), 'Cat 5', 'everyone'),
  (public.__id('C6'), public.__id('MT'), 'Cat 6', 'everyone');
insert into nominees (id, category_id, display_name, type, member_ids) values
  (public.__id('nA'), public.__id('C1'), 'A', 'person', '{}'),
  (public.__id('nB'), public.__id('C2'), 'B', 'person', '{}'),
  (public.__id('nC'), public.__id('C3'), 'C', 'person', '{}'),
  (public.__id('nD'), public.__id('C4'), 'D', 'person', '{}'),
  (public.__id('nE'), public.__id('C5'), 'E', 'person', '{}'),
  (public.__id('nF'), public.__id('C6'), 'F', 'person', '{}');
-- a vote and a recorded result on the closed main ballot; a result on the main ballot that has a round
insert into votes (ballot_id, category_id, nominee_id, voter_id) values
  (public.__id('M'), public.__id('C1'), public.__id('nA'), public.__id('micah'));
insert into results (category_id, decided_ballot_id, winner_nominee_id, nominee_ids, top3_nominee_ids, decided_by) values
  (public.__id('C1'), public.__id('M'),  public.__id('nA'), array[public.__id('nA')], array[public.__id('nA')], 'votes'),
  (public.__id('C6'), public.__id('MT'), public.__id('nF'), array[public.__id('nF')], array[public.__id('nF')], 'votes');

-- ---------------------------------------------------------------- as Micah (member)
select tests.authenticate_as(public.__id('micah'));
insert into public.__tap(line) select is(public.can_cast_vote(public.__id('M'), public.__id('C1'), public.__id('nA')), false, 'closed ballot: voting is off');
insert into public.__tap(line) select throws_ok($$ select public.reopen_ballot(public.__id('M'), now() + interval '1 day') $$, '42501', 'Only committee members can reopen a ballot', 'a member cannot reopen');
insert into public.__tap(line) select ok(not has_function_privilege('anon', 'public.reopen_ballot(uuid,timestamptz)', 'execute'), 'anon cannot execute');
insert into public.__tap(line) select ok(has_function_privilege('authenticated', 'public.reopen_ballot(uuid,timestamptz)', 'execute'), 'authenticated can execute');

-- ---------------------------------------------------------------- as Rickey (committee): refusals
select tests.clear_authentication();
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select throws_ok($$ select public.reopen_ballot(public.__id('MR'), now() + interval '1 day') $$, 'P0001', 'Results are already released, so this ballot cannot be reopened', 'released season refused');
insert into public.__tap(line) select throws_ok($$ select public.reopen_ballot(public.__id('MT'), now() + interval '1 day') $$, 'P0001', 'This ballot has tiebreak or committee rounds, so it cannot be reopened', 'ballot with child rounds refused');
insert into public.__tap(line) select throws_ok($$ select public.reopen_ballot(public.__id('M'), now() - interval '1 minute') $$, 'P0001', 'The new close time must be in the future', 'past closes_at refused');
insert into public.__tap(line) select throws_ok($$ select public.reopen_ballot(public.__id('MP'), now() + interval '1 day') $$, 'P0001', 'Only a closed ballot can be reopened', 'a running ballot is refused');
insert into public.__tap(line) select throws_ok($$ select public.reopen_ballot(public.__id('MD'), now() + interval '3 days') $$, 'P0001', 'Only a closed ballot can be reopened', 'a draft is refused');
insert into public.__tap(line) select throws_ok($$ select public.reopen_ballot(gen_random_uuid(), now() + interval '1 day') $$, 'P0001', 'Ballot not found', 'unknown ballot refused');
insert into public.__tap(line) select is((select count(*)::int from results where decided_ballot_id = public.__id('M')), 1, 'refusals leave results alone');

-- ---------------------------------------------------------------- as Rickey: reopen
insert into public.__tap(line) select lives_ok($$ select public.reopen_ballot(public.__id('M'), now() + interval '2 days') $$, 'committee reopens a closed ballot');
select tests.clear_authentication();
insert into public.__tap(line) select is((select status::text from ballots where id = public.__id('M')), 'open', 'status is open again');
insert into public.__tap(line) select ok((select closes_at > now() + interval '1 day' from ballots where id = public.__id('M')), 'closes_at is the new time');
insert into public.__tap(line) select is((select count(*)::int from votes where ballot_id = public.__id('M')), 1, 'votes are kept');
insert into public.__tap(line) select is((select count(*)::int from results where decided_ballot_id = public.__id('M')), 0, 'its recorded results are cleared');
insert into public.__tap(line) select is((select count(*)::int from results where decided_ballot_id = public.__id('MT')), 1, 'other ballots results are untouched');
select tests.authenticate_as(public.__id('micah'));
insert into public.__tap(line) select is(public.can_cast_vote(public.__id('M'), public.__id('C1'), public.__id('nA')), true, 'voting works again via can_cast_vote');
select tests.clear_authentication();
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select lives_ok($$ select public.reopen_ballot(public.__id('MO'), now() + interval '1 day') $$, 'an open ballot whose window is over can be reopened');

select tests.clear_authentication();
insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
