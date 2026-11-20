-- Voting RLS / RPC tests. Every TAP line is collected into the table public.__tap and
-- printed by the final select. The helper tables live only inside this transaction
-- (begin ... rollback) so nothing persists; they are NOT temp tables because the
-- authenticated role cannot see the session temp schema.
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(71);

-- ---------------------------------------------------------------- setup (as postgres)
insert into public.__ids values ('rickey', tests.create_user('Rickey')), ('kadin', tests.create_user('Kadin')),
  ('micah', tests.create_user('Micah')), ('nick', tests.create_user('Nick'));
select tests.make_committee(public.__id('rickey'));
select tests.make_committee(public.__id('kadin'));
-- member ids: rickey_m, kadin_m, micah_m, nick_m
insert into public.__ids select lower(name) || '_m', id from members where name in ('Rickey','Kadin','Micah','Nick');
-- pre-generated ids for everything else
insert into public.__ids select k, gen_random_uuid() from unnest(array[
  'S','M','E','G','P','n_micah','n_nick','n_rickey',
  'M2','E2','n2_nick','C','CE','n_c','X','XE','n_x','D','DE','n_d',
  'R','T']) k;

insert into seasons (id, name) values (public.__id('S'), 'Test season');
insert into ballots (id, season_id, name, status, opens_at, closes_at) values
  -- M: main, open
  (public.__id('M'), public.__id('S'), 'Main', 'open', now() - interval '1 hour', now() + interval '1 day'),
  -- M2: second open main ballot (cross-ballot checks)
  (public.__id('M2'), public.__id('S'), 'Main 2', 'open', now() - interval '1 hour', now() + interval '1 day'),
  -- C: closed by status while the window is still open
  (public.__id('C'), public.__id('S'), 'Closed', 'closed', now() - interval '1 hour', now() + interval '1 day'),
  -- X: open by status but the window has passed
  (public.__id('X'), public.__id('S'), 'Expired', 'open', now() - interval '2 hours', now() - interval '1 minute'),
  -- D: draft, window open
  (public.__id('D'), public.__id('S'), 'Draft', 'draft', now() - interval '1 hour', now() + interval '1 day');
insert into ballots (id, season_id, parent_ballot_id, name, round, status, opens_at, closes_at) values
  (public.__id('R'), public.__id('S'), public.__id('M'), 'Main - Committee', 'committee', 'open', now() - interval '1 hour', now() + interval '1 day'),
  (public.__id('T'), public.__id('S'), public.__id('M'), 'Main - Tiebreak', 'tiebreak', 'open', now() - interval '1 hour', now() + interval '1 day');

insert into categories (id, ballot_id, name, nominee_mode, allow_member_add) values
  (public.__id('E'), public.__id('M'), 'Everyone', 'everyone', false),
  (public.__id('G'), public.__id('M'), 'Group', 'group', false),
  (public.__id('P'), public.__id('M'), 'Preset', 'preset', true),
  (public.__id('E2'), public.__id('M2'), 'Everyone 2', 'everyone', false),
  (public.__id('CE'), public.__id('C'), 'Cat C', 'group', false),
  (public.__id('XE'), public.__id('X'), 'Cat X', 'everyone', false),
  (public.__id('DE'), public.__id('D'), 'Cat D', 'everyone', false);

insert into nominees (id, category_id, display_name, type, member_ids) values
  (public.__id('n_micah'), public.__id('E'), 'Micah', 'person', array[public.__id('micah_m')]),
  (public.__id('n_nick'), public.__id('E'), 'Nick', 'person', array[public.__id('nick_m')]),
  (public.__id('n_rickey'), public.__id('E'), 'Rickey', 'person', array[public.__id('rickey_m')]),
  (public.__id('n2_nick'), public.__id('E2'), 'Nick', 'person', array[public.__id('nick_m')]),
  (public.__id('n_c'), public.__id('CE'), 'Nick', 'person', array[public.__id('nick_m')]),
  (public.__id('n_x'), public.__id('XE'), 'Nick', 'person', array[public.__id('nick_m')]),
  (public.__id('n_d'), public.__id('DE'), 'Nick', 'person', array[public.__id('nick_m')]);

insert into round_nominees (ballot_id, category_id, nominee_id) values
  (public.__id('R'), public.__id('E'), public.__id('n_nick')),
  (public.__id('T'), public.__id('E'), public.__id('n_nick')),
  (public.__id('T'), public.__id('E'), public.__id('n_micah'));

insert into results (category_id, decided_ballot_id, winner_nominee_id, nominee_ids, decided_by)
  values (public.__id('E'), public.__id('M'), public.__id('n_nick'), array[public.__id('n_nick')], 'votes');

-- ---------------------------------------------------------------- as Micah
select tests.authenticate_as(public.__id('micah'));

insert into public.__tap(line) select lives_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('M'),public.__id('E'),public.__id('n_nick')) $$, 'vote in open window');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('M'),public.__id('E'),public.__id('n_micah')) $$, '42501', null, 'self-vote rejected');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('M'),public.__id('E'),public.__id('n_rickey')) $$, '23505', null, 'one vote per category');
insert into public.__tap(line) select throws_ok($$ update votes set nominee_id = public.__id('n_micah') where voter_id = auth.uid() $$, '42501', null, 'cannot update to self');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('C'),public.__id('CE'),public.__id('n_c')) $$, '42501', null, 'closed status blocks even before closes_at');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('X'),public.__id('XE'),public.__id('n_x')) $$, '42501', null, 'past closes_at blocks');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('D'),public.__id('DE'),public.__id('n_d')) $$, '42501', null, 'draft blocks');
-- extra: integrity of (ballot, category, nominee)
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('M'),public.__id('E2'),public.__id('n2_nick')) $$, '42501', null, 'category of another ballot rejected');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('M2'),public.__id('E2'),public.__id('n_nick')) $$, '42501', null, 'nominee not in category rejected');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id,voter_id) values (public.__id('M2'),public.__id('E2'),public.__id('n2_nick'),public.__id('nick')) $$, '42501', null, 'cannot vote as someone else');
-- extra: update path cannot move a vote into a closed/expired ballot or to another voter
insert into public.__tap(line) select throws_ok($$ update votes set ballot_id = public.__id('C'), category_id = public.__id('CE'), nominee_id = public.__id('n_c') where voter_id = auth.uid() $$, '42501', null, 'update cannot move vote into closed ballot');
insert into public.__tap(line) select throws_ok($$ update votes set ballot_id = public.__id('X'), category_id = public.__id('XE'), nominee_id = public.__id('n_x') where voter_id = auth.uid() $$, '42501', null, 'update cannot move vote into expired ballot');
insert into public.__tap(line) select throws_ok($$ update votes set voter_id = public.__id('nick') where voter_id = auth.uid() $$, '42501', null, 'update cannot hand vote to someone else');
-- extra: clients cannot backdate votes
update votes set created_at = '2000-01-01', updated_at = '2000-01-01' where voter_id = auth.uid();
insert into public.__tap(line) select ok((select bool_and(created_at > now() - interval '1 minute' and updated_at > now() - interval '1 minute') from votes), 'vote timestamps are server-set');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('R'),public.__id('E'),public.__id('n_nick')) $$, '42501', null, 'members cannot vote in committee round');

-- Nick votes once
select tests.clear_authentication();
select tests.authenticate_as(public.__id('nick'));
insert into public.__tap(line) select lives_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('M'),public.__id('E'),public.__id('n_micah')) $$, 'Nick votes');

-- back to Micah
select tests.clear_authentication();
select tests.authenticate_as(public.__id('micah'));
insert into public.__tap(line) select is((select count(*)::int from votes), 1, 'member sees only own votes');
insert into public.__tap(line) select is((select count(*)::int from ballots where id in (public.__id('D'), public.__id('R'))), 0, 'draft and committee round hidden');
insert into public.__tap(line) select is((select count(*)::int from categories where ballot_id = public.__id('D')), 0, 'draft categories hidden');
insert into public.__tap(line) select is((select count(*)::int from nominees where category_id = public.__id('DE')), 0, 'draft nominees hidden');
insert into public.__tap(line) select is((select count(*)::int from round_nominees where ballot_id = public.__id('R')), 0, 'committee round nominees hidden');
insert into public.__tap(line) select is((select count(*)::int from ballots where id in (public.__id('M'), public.__id('T'), public.__id('C'))), 3, 'open, tiebreak and closed ballots visible');
insert into public.__tap(line) select is((select count(*)::int from results), 0, 'results hidden before release');
update seasons set results_released_at = now();  -- RLS filters it to 0 rows
insert into public.__tap(line) select is((select results_released_at from seasons where id = public.__id('S')), null, 'member cannot release');
insert into public.__tap(line) select throws_ok($$ insert into ballots(season_id,name,opens_at,closes_at) values (public.__id('S'),'x',now(),now()+interval '1d') $$, '42501', null, 'member cannot create ballots');
update ballots set status = 'open', closes_at = now() + interval '9 days' where id in (public.__id('C'), public.__id('X'));  -- 0 rows
insert into public.__tap(line) select is((select count(*)::int from ballots where id in (public.__id('C'), public.__id('X')) and closes_at > now() + interval '2 days'), 0, 'member cannot reopen ballots');
insert into public.__tap(line) select throws_ok($$ insert into nominees(category_id, display_name) values (public.__id('E'), 'Eve') $$, '42501', null, 'member cannot insert nominees directly');
insert into public.__tap(line) select throws_ok($$ insert into round_nominees(ballot_id, category_id, nominee_id) values (public.__id('T'), public.__id('E'), public.__id('n_rickey')) $$, '42501', null, 'member cannot add round nominees');
insert into public.__tap(line) select throws_ok($$ insert into results(category_id, decided_ballot_id) values (public.__id('E2'), public.__id('M2')) $$, '42501', null, 'member cannot write results');
insert into public.__tap(line) select throws_ok($$ insert into seasons(name) values ('x') $$, '42501', null, 'member cannot create seasons');
-- add_nominee: groups
insert into public.__tap(line) select is(add_nominee(public.__id('G'), '', array[public.__id('nick_m'), public.__id('rickey_m')]), add_nominee(public.__id('G'), '', array[public.__id('rickey_m'), public.__id('nick_m')]), 'group dedupe ignores order');
insert into public.__tap(line) select is(add_nominee(public.__id('G'), '', array[public.__id('rickey_m'), public.__id('nick_m')]), add_nominee(public.__id('G'), '', array[public.__id('nick_m'), public.__id('rickey_m')]), 'group dedupe ignores order (reverse)');
insert into public.__tap(line) select is((select display_name from nominees where category_id = public.__id('G')), 'Nick, Rickey', 'group name sorted');
insert into public.__tap(line) select is((select member_ids from nominees where category_id = public.__id('G')), array[public.__id('nick_m'), public.__id('rickey_m')], 'group member_ids sorted by name');
insert into public.__tap(line) select is((select type::text from nominees where category_id = public.__id('G')), 'group', 'group nominee type');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('M'), public.__id('G'), add_nominee(public.__id('G'), '', array[public.__id('micah_m'), public.__id('nick_m')])) $$, '42501', null, 'cannot vote for own group');
insert into public.__tap(line) select lives_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('M'), public.__id('G'), (select id from nominees where category_id = public.__id('G') and display_name = 'Nick, Rickey')) $$, 'can vote for a group without self');
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('G'), '', array[public.__id('nick_m')]) $$, 'P0001', null, 'group needs two members');
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('G'), '', array[public.__id('nick_m'), public.__id('nick_m')]) $$, 'P0001', null, 'group rejects repeated member');
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('G'), '', array[public.__id('nick_m'), gen_random_uuid()]) $$, 'P0001', null, 'group rejects unknown member');
-- add_nominee: modes and window
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('E'), 'Carrie', '{}') $$, 'P0001', 'category does not accept new nominees', 'everyone category rejects member additions');
insert into public.__tap(line) select lives_ok($$ select add_nominee(public.__id('P'), 'Carrie', '{}') $$, 'member adds preset option');
insert into public.__tap(line) select is(add_nominee(public.__id('P'), '  carrie ', '{}'), (select id from nominees where category_id = public.__id('P') and display_name = 'Carrie'), 'preset dedupe trims and ignores case');
insert into public.__tap(line) select is((select type::text from nominees where category_id = public.__id('P')), 'noun', 'preset nominee type');
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('P'), '   ', '{}') $$, 'P0001', null, 'preset rejects blank name');
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('P'), 'Nick', array[public.__id('nick_m')]) $$, 'P0001', null, 'preset rejects member ids');
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('CE'), '', array[public.__id('nick_m'), public.__id('rickey_m')]) $$, 'P0001', 'ballot is not open', 'add_nominee blocked on closed ballot');
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('DE'), 'Carrie', '{}') $$, 'P0001', 'ballot is not open', 'add_nominee blocked on draft ballot');
-- tiebreak round
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('T'),public.__id('E'),public.__id('n_rickey')) $$, '42501', null, 'tiebreak: nominee not in round rejected');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('T'),public.__id('E'),public.__id('n_micah')) $$, '42501', null, 'tiebreak: self-vote rejected');
insert into public.__tap(line) select lives_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('T'),public.__id('E'),public.__id('n_nick')) $$, 'tiebreak: vote for round nominee');
insert into public.__tap(line) select lives_ok($$ delete from votes where ballot_id = public.__id('T') $$, 'delete own vote while open');
insert into public.__tap(line) select is((select count(*)::int from votes where ballot_id = public.__id('T')), 0, 'own vote deleted while open');

-- ---------------------------------------------------------------- as Rickey (committee)
select tests.clear_authentication();
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select lives_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('R'),public.__id('E'),public.__id('n_nick')) $$, 'committee votes in committee round');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('R'),public.__id('E'),public.__id('n_micah')) $$, '42501', null, 'only round nominees');
insert into public.__tap(line) select is((select count(*)::int from votes where ballot_id = public.__id('M') and category_id = public.__id('E')), 2, 'committee sees all votes');
insert into public.__tap(line) select is((select count(*)::int from ballots where id in (public.__id('D'), public.__id('R'))), 2, 'committee sees draft and committee round');

-- committee self-vote rule still applies in the committee round
insert into round_nominees (ballot_id, category_id, nominee_id) values (public.__id('R'), public.__id('E'), public.__id('n_rickey'));
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('R'),public.__id('E'),public.__id('n_rickey')) $$, '42501', null, 'committee self-vote rejected in committee round');

-- ---------------------------------------------------------------- fix round 1
-- group name collision: committee hand-makes an unlinked "Kadin, Micah" group
insert into nominees (category_id, display_name, type, member_ids) values (public.__id('G'), 'Kadin, Micah', 'group', '{}');
select tests.clear_authentication();
select tests.authenticate_as(public.__id('micah'));
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('G'), '', array[public.__id('micah_m'), public.__id('kadin_m')]) $$, 'P0001', 'a different nominee with this name already exists', 'add_nominee refuses name collision with differently linked row');
-- reset unlinks Nick: his earlier votes are deleted, others stay
select tests.clear_authentication();
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select lives_ok($$ select reset_member_claim('Nick') $$, 'committee resets Nick');
insert into public.__tap(line) select is((select count(*)::int from votes where voter_id = public.__id('nick')), 0, 'reset deletes the unlinked account''s votes');
insert into public.__tap(line) select is((select count(*)::int from votes where voter_id = public.__id('micah')), 2, 'reset keeps other members'' votes');
-- the unlinked account still has a session
select tests.clear_authentication();
select tests.authenticate_as(public.__id('nick'));
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('M'),public.__id('E'),public.__id('n_nick')) $$, '42501', null, 'unlinked account cannot vote (not even for itself)');
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('P'), 'Zed', '{}') $$, 'P0001', 'account is not linked to a member', 'unlinked account cannot add_nominee');

-- ---------------------------------------------------------------- release, then Micah
select tests.clear_authentication();
update seasons set results_released_at = now() where id = public.__id('S');
select tests.authenticate_as(public.__id('micah'));
insert into public.__tap(line) select is((select count(*)::int from results), 1, 'results visible after release');

-- ---------------------------------------------------------------- close M, then Micah
select tests.clear_authentication();
update ballots set closes_at = now() - interval '1 second', opens_at = now() - interval '2 hours' where id = public.__id('M');
select tests.authenticate_as(public.__id('micah'));
delete from votes where ballot_id = public.__id('M');
insert into public.__tap(line) select is((select count(*)::int from votes where ballot_id = public.__id('M') and category_id = public.__id('E')), 1, 'delete after close affects nothing');
update votes set nominee_id = public.__id('n_rickey') where ballot_id = public.__id('M');
insert into public.__tap(line) select is((select nominee_id from votes where ballot_id = public.__id('M') and category_id = public.__id('E')), public.__id('n_nick'), 'update after close affects nothing');
insert into public.__tap(line) select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (public.__id('M'), public.__id('P'), (select id from nominees where category_id = public.__id('P') limit 1)) $$, '42501', null, 'insert after close rejected');
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('P'), 'Late', '{}') $$, 'P0001', 'ballot is not open', 'add_nominee after close rejected');

-- ---------------------------------------------------------------- anon
select tests.clear_authentication();
select tests.authenticate_anon();
insert into public.__tap(line) select throws_ok($$ select count(*) from ballots $$, '42501', null, 'anon cannot read ballots');
insert into public.__tap(line) select throws_ok($$ select add_nominee(public.__id('P'), 'Anon', '{}') $$, '42501', null, 'anon cannot call add_nominee');

select tests.clear_authentication();
insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
