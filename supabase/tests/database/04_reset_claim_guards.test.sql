-- reset_member_claim guard tests. TAP lines are collected into public.__tap and printed by the
-- final select. Helper tables live only inside this transaction (begin ... rollback); NOT temp tables.
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(10);

-- ---------------------------------------------------------------- setup (as postgres)
update members set user_id = null, claimed_at = null where name in ('Rickey','Micah','Nick');
insert into public.__ids values ('rickey', tests.create_user('Rickey')), ('u1', tests.create_user('Micah')), ('u2', tests.create_user('Nick'));
select tests.make_committee(public.__id('rickey'));
insert into public.__ids select k, gen_random_uuid() from unnest(array['S','M','E','E2','nB','nC']) k;

insert into seasons (id, name) values (public.__id('S'), 'Reset guard test season');
insert into ballots (id, season_id, name, status, opens_at, closes_at) values
  (public.__id('M'), public.__id('S'), 'Main', 'closed', now() - interval '2 hours', now() - interval '1 hour');
insert into categories (id, ballot_id, name, nominee_mode) values
  (public.__id('E'), public.__id('M'), 'Everyone', 'everyone'),
  (public.__id('E2'), public.__id('M'), 'Everyone 2', 'everyone');
insert into nominees (id, category_id, display_name, type, member_ids) values
  (public.__id('nB'), public.__id('E'), 'B', 'person', '{}'),
  (public.__id('nC'), public.__id('E2'), 'C', 'person', '{}');
insert into votes (ballot_id, category_id, nominee_id, voter_id) values
  (public.__id('M'), public.__id('E'), public.__id('nB'), public.__id('u1')),
  (public.__id('M'), public.__id('E2'), public.__id('nC'), public.__id('u1')),
  (public.__id('M'), public.__id('E'), public.__id('nB'), public.__id('u2')),
  (public.__id('M'), public.__id('E2'), public.__id('nC'), public.__id('u2'));

-- ---------------------------------------------------------------- non-committee (u1 = Micah)
select tests.authenticate_as(public.__id('u1'));
insert into public.__tap(line) select throws_ok($$ select reset_member_claim('Nick') $$, 'P0001', 'committee only', 'non-committee cannot reset (1-arg)');
insert into public.__tap(line) select throws_ok($$ select reset_member_claim('Nick', public.__id('u2')) $$, 'P0001', 'committee only', 'non-committee cannot reset (2-arg)');

-- ---------------------------------------------------------------- committee (Rickey)
select tests.clear_authentication();
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select throws_ok($$ select reset_member_claim('Rickey') $$, 'P0001', 'cannot reset yourself', 'committee cannot reset own name (1-arg)');
insert into public.__tap(line) select throws_ok($$ select reset_member_claim('Rickey', public.__id('rickey')) $$, 'P0001', 'cannot reset yourself', 'committee cannot reset own name (2-arg)');

insert into public.__tap(line) select lives_ok($$ select reset_member_claim('Micah', public.__id('u1')) $$, 'reset with matching expected user works');
insert into public.__tap(line) select is((select count(*)::int from votes where voter_id = public.__id('u1')), 0, 'reset deletes that user''s votes');
insert into public.__tap(line) select is((select count(*)::int from votes where voter_id = public.__id('u2')), 2, 'reset keeps other users'' votes');

-- ---------------------------------------------------------------- stale expected user
-- u2 now claims Micah's name (as postgres), then Rickey acts on a stale view that still shows u1
select tests.clear_authentication();
update members set user_id = null, claimed_at = null where name = 'Nick';
update members set user_id = public.__id('u2'), claimed_at = now() where name = 'Micah';
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select throws_ok($$ select reset_member_claim('Micah', public.__id('u1')) $$, 'P0001', 'member claim changed', 'stale expected user raises');
insert into public.__tap(line) select is((select count(*)::int from votes where voter_id = public.__id('u2')), 2, 'stale reset deleted nothing');
select tests.clear_authentication();
insert into public.__tap(line) select is((select user_id from members where name = 'Micah'), public.__id('u2'), 'stale reset left the claim in place');

insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
