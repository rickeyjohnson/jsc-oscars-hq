-- reset_member_claim also deletes the login. TAP lines are collected into public.__tap and printed by the final
-- select. Helper tables live only inside this transaction (begin ... rollback); NOT temp tables.
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(10);

-- real member names only; unclaim them first (real accounts may hold them), all undone by the rollback
update members set user_id = null, claimed_at = null where name in ('Rickey','Micah','Nick');
insert into public.__ids values ('rickey', tests.create_user('Rickey')), ('micah', tests.create_user('Micah')), ('nick', tests.create_user('Nick'));
select tests.make_committee(public.__id('rickey'));
insert into public.__ids select k, gen_random_uuid() from unnest(array['S','M','E','nB']) k;
insert into seasons (id, name) values (public.__id('S'), 'Reset login test season');
insert into ballots (id, season_id, name, status, opens_at, closes_at) values
  (public.__id('M'), public.__id('S'), 'Main', 'closed', now() - interval '2 hours', now() - interval '1 hour');
insert into categories (id, ballot_id, name, nominee_mode) values (public.__id('E'), public.__id('M'), 'Everyone', 'everyone');
insert into nominees (id, category_id, display_name, type, member_ids) values (public.__id('nB'), public.__id('E'), 'B', 'person', '{}');
insert into votes (ballot_id, category_id, nominee_id, voter_id) values
  (public.__id('M'), public.__id('E'), public.__id('nB'), public.__id('micah')),
  (public.__id('M'), public.__id('E'), public.__id('nB'), public.__id('nick'));

-- a member cannot reset
select tests.authenticate_as(public.__id('nick'));
insert into public.__tap(line) select throws_ok($$ select public.reset_member_claim('Micah') $$, 'P0001', 'committee only', 'a member cannot reset');

-- committee
select tests.clear_authentication();
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select throws_ok($$ select public.reset_member_claim('Rickey') $$, 'P0001', 'cannot reset yourself', 'cannot reset yourself');
insert into public.__tap(line) select throws_ok($$ select public.reset_member_claim('Micah', public.__id('nick')) $$, 'P0001', 'member claim changed', 'a stale expected user is refused');
select tests.clear_authentication();
insert into public.__tap(line) select is((select count(*)::int from auth.users where id = public.__id('micah')), 1, 'the refused reset deleted no login');
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select lives_ok($$ select public.reset_member_claim('Micah', public.__id('micah')) $$, 'committee resets Micah');

select tests.clear_authentication();
insert into public.__tap(line) select is((select user_id from members where name = 'Micah'), null::uuid, 'the name is free again');
insert into public.__tap(line) select is((select count(*)::int from auth.users where id = public.__id('micah')), 0, 'the login is deleted too (no dashboard step)');
insert into public.__tap(line) select is((select count(*)::int from public.profiles where user_id = public.__id('micah')), 0, 'the profile is deleted with the login');
insert into public.__tap(line) select is((select count(*)::int from votes where voter_id = public.__id('micah')), 0, 'the votes are deleted');
insert into public.__tap(line) select is((select count(*)::int from auth.users where id = public.__id('nick')) + (select count(*)::int from votes where voter_id = public.__id('nick')), 2, 'other logins and votes are untouched');

insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
