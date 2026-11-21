-- MYOC tests (run after 20261124000200 AND 20261124000700: there is no idea limit). TAP lines are collected into public.__tap and printed by the final select. Helper tables live only
-- inside this transaction (begin ... rollback); NOT temp tables.
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(40);

-- ---------------------------------------------------------------- setup (as postgres)
update members set user_id = null, claimed_at = null where name in ('Rickey','Micah','Nick','Justin');
insert into public.__ids values ('rickey', tests.create_user('Rickey')), ('micah', tests.create_user('Micah')),
  ('nick', tests.create_user('Nick')), ('justin', tests.create_user('Justin'));
select tests.make_committee(public.__id('rickey'));
update members set user_id = null, claimed_at = null where name = 'Justin'; -- signed up but never linked to a member
insert into public.__ids select k, gen_random_uuid() from unnest(array['S','W','WC','I_nick','I_micah_closed']) k;

insert into seasons (id, name) values (public.__id('S'), 'MYOC season');
insert into myoc_windows (id, season_id, opens_at, closes_at) values
  (public.__id('W'),  public.__id('S'), now() - interval '1 hour', now() + interval '1 day'),
  (public.__id('WC'), public.__id('S'), now() - interval '2 days', now() - interval '1 day');
insert into myoc_ideas (id, window_id, author_id, name) values
  (public.__id('I_nick'), public.__id('W'), public.__id('nick'), 'Nick idea'),
  (public.__id('I_micah_closed'), public.__id('WC'), public.__id('micah'), 'Micah old idea');

-- ---------------------------------------------------------------- as Micah (member)
select tests.authenticate_as(public.__id('micah'));
insert into public.__tap(line) select lives_ok($$ insert into myoc_ideas (window_id, name, description, hint) values (public.__id('W'), 'Micah idea 1', 'desc', 'person') $$, 'member submits in an open window');
insert into public.__tap(line) select is((select count(*)::int from myoc_ideas where window_id = public.__id('W')), 1, 'member reads only their own ideas (not Nick''s)');
insert into public.__tap(line) select is((select count(*)::int from myoc_ideas where id = public.__id('I_nick')), 0, 'another member''s idea is invisible by id');
insert into public.__tap(line) select throws_ok($$ insert into myoc_ideas (window_id, author_id, name) values (public.__id('W'), public.__id('nick'), 'Forged') $$, '42501', null, 'cannot submit as someone else');
insert into public.__tap(line) select throws_ok($$ insert into myoc_ideas (window_id, name, status) values (public.__id('W'), 'Self accepted', 'accepted') $$, '42501', null, 'status is not an insertable column');
insert into public.__tap(line) select lives_ok($$ insert into myoc_ideas (window_id, name) values (public.__id('W'), 'Micah idea 2') $$, 'second idea');
insert into public.__tap(line) select lives_ok($$ insert into myoc_ideas (window_id, name) values (public.__id('W'), 'Micah idea 3') $$, 'third idea');
insert into public.__tap(line) select lives_ok($$ insert into myoc_ideas (window_id, name) values (public.__id('W'), 'Micah idea 4') $$, 'fourth idea');
insert into public.__tap(line) select lives_ok($$ insert into myoc_ideas (window_id, name) values (public.__id('W'), 'Micah idea 5') $$, 'fifth idea');
insert into public.__tap(line) select lives_ok($$ insert into myoc_ideas (window_id, name) values (public.__id('W'), 'Micah idea 6') $$, 'a member can add a 6th idea while open');
insert into public.__tap(line) select lives_ok($$ insert into myoc_ideas (window_id, name) select public.__id('W'), 'Bulk ' || g from generate_series(7, 20) g $$, 'and up to a 20th idea');
insert into public.__tap(line) select lives_ok($$ update myoc_ideas set status = 'withdrawn' where name = 'Micah idea 5' $$, 'member withdraws an idea');
insert into public.__tap(line) select throws_ok($$ update myoc_ideas set status = 'accepted' where name = 'Micah idea 1' $$, '42501', 'status is read-only', 'member cannot self-accept');
insert into public.__tap(line) select throws_ok($$ update myoc_ideas set status = 'rejected' where name = 'Micah idea 1' $$, '42501', 'status is read-only', 'member cannot self-reject');
insert into public.__tap(line) select throws_ok($$ update myoc_ideas set merged_into = public.__id('I_nick') where name = 'Micah idea 1' $$, '42501', 'committee-only field', 'member cannot merge');
insert into public.__tap(line) select throws_ok($$ update myoc_ideas set assigned_category = 'Best of' where name = 'Micah idea 1' $$, '42501', 'committee-only field', 'member cannot assign a category');
insert into public.__tap(line) select lives_ok($$ update myoc_ideas set name = 'Hijacked' where id = public.__id('I_nick') $$, 'editing another member''s idea matches no rows (no error, no change)');
insert into public.__tap(line) select lives_ok($$ update myoc_ideas set name = 'Micah idea 1b', hint = 'thing' where name = 'Micah idea 1' $$, 'member edits their own idea');
insert into public.__tap(line) select throws_ok($$ update myoc_ideas set window_id = public.__id('WC') where name = 'Micah idea 1b' $$, '42501', null, 'cannot move an idea to another window (column not grantable)');
insert into public.__tap(line) select throws_ok($$ update myoc_ideas set status = 'submitted' where name = 'Micah idea 5' $$, 'P0001', 'this idea can no longer be changed', 'a withdrawn idea stays withdrawn');
insert into public.__tap(line) select throws_ok($$ insert into myoc_ideas (window_id, name) values (public.__id('WC'), 'Too late') $$, 'P0001', 'suggestions are not open', 'cannot submit when the window is closed');
insert into public.__tap(line) select throws_ok($$ update myoc_ideas set name = 'Edited late' where id = public.__id('I_micah_closed') $$, 'P0001', 'suggestions are closed', 'cannot edit once the window is closed');
insert into public.__tap(line) select throws_ok($$ delete from myoc_ideas where name = 'Micah idea 1b' $$, '42501', null, 'members cannot delete');
insert into public.__tap(line) select throws_ok($$ insert into myoc_windows (season_id, opens_at, closes_at) values (public.__id('S'), now(), now() + interval '1 day') $$, '42501', null, 'members cannot create windows');
insert into public.__tap(line) select is((select count(*)::int from myoc_windows where id in (public.__id('W'), public.__id('WC'))), 2, 'members can read windows');

-- ---------------------------------------------------------------- unlinked user
select tests.clear_authentication();
select tests.authenticate_as(public.__id('justin'));
insert into public.__tap(line) select throws_ok($$ insert into myoc_ideas (window_id, name) values (public.__id('W'), 'Outsider') $$, '42501', 'only claimed members can suggest', 'a signed-in user with no member name cannot suggest');

-- ---------------------------------------------------------------- as Rickey (committee)
select tests.clear_authentication();
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select is((select count(*)::int from myoc_ideas where window_id in (public.__id('W'), public.__id('WC'))), 22, 'committee reads every idea');
insert into public.__tap(line) select is((select name from myoc_ideas where id = public.__id('I_nick')), 'Nick idea', 'the other member''s idea was not changed');
insert into public.__tap(line) select lives_ok($$ update myoc_ideas set status = 'accepted', assigned_category = 'Superlatives' where name = 'Micah idea 1b' $$, 'committee accepts and assigns a category');
insert into public.__tap(line) select lives_ok($$ update myoc_ideas set status = 'rejected', name = 'Micah idea 2 (reworded)' where name = 'Micah idea 2' $$, 'committee rejects and edits wording');
insert into public.__tap(line) select lives_ok($$ update myoc_ideas set status = 'merged', merged_into = (select id from myoc_ideas where name = 'Micah idea 1b') where id = public.__id('I_nick') $$, 'committee merges a duplicate');
insert into public.__tap(line) select throws_ok($$ update myoc_ideas set status = 'merged', merged_into = public.__id('I_micah_closed') where name = 'Micah idea 3' $$, 'P0001', 'merge target must be in the same window', 'merge target must share the window');
insert into public.__tap(line) select lives_ok($$ update myoc_ideas set status = 'accepted' where id = public.__id('I_micah_closed') $$, 'committee can review after the window closed');
insert into public.__tap(line) select lives_ok($$ insert into myoc_windows (season_id, opens_at, closes_at) values (public.__id('S'), now() + interval '1 day', now() + interval '3 days') $$, 'committee creates a window');
insert into public.__tap(line) select lives_ok($$ update myoc_windows set closes_at = now() where id = public.__id('W') $$, 'committee closes a window now');
insert into public.__tap(line) select throws_ok($$ delete from myoc_ideas where name = 'Micah idea 3' $$, '42501', null, 'not even the committee can delete ideas');

-- ---------------------------------------------------------------- anon
select tests.clear_authentication();
select tests.authenticate_anon();
insert into public.__tap(line) select throws_ok($$ select * from myoc_ideas $$, '42501', null, 'anon cannot read ideas');
insert into public.__tap(line) select throws_ok($$ select * from myoc_windows $$, '42501', null, 'anon cannot read windows');
insert into public.__tap(line) select throws_ok($$ insert into myoc_ideas (window_id, name) values (public.__id('W'), 'Anon') $$, '42501', null, 'anon cannot insert');
select tests.clear_authentication();
insert into public.__tap(line) select ok(not has_function_privilege('anon', 'public.myoc_window_is_open(uuid)', 'execute'), 'anon cannot execute the window helper');

insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
