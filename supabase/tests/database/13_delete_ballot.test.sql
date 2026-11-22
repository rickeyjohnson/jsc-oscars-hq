-- Deleting a ballot (committee only): RLS ballots_delete_committee plus ON DELETE CASCADE.
-- TAP lines are collected into public.__tap and printed by the final select. Helper tables live
-- only inside this transaction (begin ... rollback); NOT temp tables.
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(15);

-- ---------------------------------------------------------------- setup (as postgres)
update members set user_id = null, claimed_at = null where name in ('Rickey','Micah');
insert into public.__ids values ('rickey', tests.create_user('Rickey')), ('micah', tests.create_user('Micah'));
select tests.make_committee(public.__id('rickey'));
insert into public.__ids select k, gen_random_uuid() from unnest(array['S','M','T','MX','T2','MK','C1','C2','C3','nA','nB','nC']) k;

insert into seasons (id, name) values (public.__id('S'), 'Delete season');
insert into ballots (id, season_id, name, status, opens_at, closes_at) values
  (public.__id('M'),  public.__id('S'), 'Main with a round', 'closed', now() - interval '3 hours', now() - interval '2 hours'),
  (public.__id('MX'), public.__id('S'), 'Main to keep',      'closed', now() - interval '3 hours', now() - interval '2 hours'),
  (public.__id('MK'), public.__id('S'), 'Untouched',         'open',   now() - interval '3 hours', now() + interval '2 hours');
insert into ballots (id, season_id, parent_ballot_id, name, round, status, opens_at, closes_at) values
  (public.__id('T'),  public.__id('S'), public.__id('M'),  'Tiebreak', 'tiebreak', 'closed', now() - interval '90 minutes', now() - interval '1 hour'),
  (public.__id('T2'), public.__id('S'), public.__id('MX'), 'Tiebreak', 'tiebreak', 'closed', now() - interval '90 minutes', now() - interval '1 hour');
insert into categories (id, ballot_id, name, nominee_mode) values
  (public.__id('C1'), public.__id('M'),  'Cat 1', 'everyone'),
  (public.__id('C2'), public.__id('MX'), 'Cat 2', 'everyone'),
  (public.__id('C3'), public.__id('MK'), 'Cat 3', 'everyone');
insert into nominees (id, category_id, display_name, type, member_ids) values
  (public.__id('nA'), public.__id('C1'), 'A', 'person', '{}'),
  (public.__id('nB'), public.__id('C2'), 'B', 'person', '{}'),
  (public.__id('nC'), public.__id('C3'), 'C', 'person', '{}');
insert into round_nominees (ballot_id, category_id, nominee_id) values
  (public.__id('T'), public.__id('C1'), public.__id('nA'));
insert into votes (ballot_id, category_id, nominee_id, voter_id) values
  (public.__id('M'),  public.__id('C1'), public.__id('nA'), public.__id('micah')),
  (public.__id('MK'), public.__id('C3'), public.__id('nC'), public.__id('micah'));
insert into results (category_id, decided_ballot_id, winner_nominee_id, nominee_ids, top3_nominee_ids, decided_by) values
  (public.__id('C1'), public.__id('M'),  public.__id('nA'), array[public.__id('nA')], array[public.__id('nA')], 'votes'),
  (public.__id('C2'), public.__id('T2'), public.__id('nB'), array[public.__id('nB')], array[public.__id('nB')], 'votes');

-- ---------------------------------------------------------------- as Micah (not committee): nothing is deleted
select tests.authenticate_as(public.__id('micah'));
insert into public.__tap(line) select lives_ok($$ delete from public.ballots where id = public.__id('M') $$, 'a member delete is silently refused by RLS');
select tests.clear_authentication();
insert into public.__tap(line) select is((select count(*)::int from ballots where id = public.__id('M')), 1, 'member: the ballot is still there');
insert into public.__tap(line) select is((select count(*)::int from votes where ballot_id = public.__id('M')), 1, 'member: its votes are still there');

-- ---------------------------------------------------------------- as Rickey (committee): main ballot with a round
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select lives_ok($$ delete from public.ballots where id = public.__id('M') $$, 'committee deletes a ballot');
select tests.clear_authentication();
insert into public.__tap(line) select is((select count(*)::int from ballots where id = public.__id('M')), 0, 'the ballot is gone');
insert into public.__tap(line) select is((select count(*)::int from ballots where id = public.__id('T')), 0, 'its round ballot is gone');
insert into public.__tap(line) select is((select count(*)::int from categories where ballot_id = public.__id('M')), 0, 'its categories are gone');
insert into public.__tap(line) select is((select count(*)::int from nominees where id = public.__id('nA')), 0, 'its nominees are gone');
insert into public.__tap(line) select is((select count(*)::int from votes where ballot_id = public.__id('M')), 0, 'every member vote on it is gone');
insert into public.__tap(line) select is((select count(*)::int from results where category_id = public.__id('C1')), 0, 'its recorded results are gone');
insert into public.__tap(line) select is((select count(*)::int from round_nominees where ballot_id = public.__id('T')), 0, 'its round nominees are gone');
insert into public.__tap(line) select is((select count(*)::int from votes where ballot_id = public.__id('MK')), 1, 'other ballots keep their votes');

-- ---------------------------------------------------------------- committee deletes only a round ballot
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select lives_ok($$ delete from public.ballots where id = public.__id('T2') $$, 'committee deletes a round ballot');
select tests.clear_authentication();
insert into public.__tap(line) select is((select count(*)::int from ballots where id = public.__id('MX')), 1, 'its main ballot stays');
insert into public.__tap(line) select is((select count(*)::int from results where decided_ballot_id = public.__id('T2')), 0, 'results decided by the round are gone');

insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
