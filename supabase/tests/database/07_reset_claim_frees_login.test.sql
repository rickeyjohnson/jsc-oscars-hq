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

insert into public.__tap(line) select plan(7);

update members set user_id = null, claimed_at = null where name in ('Rickey','Micah','Dee');
insert into public.__ids values ('rickey', tests.create_user('Rickey')), ('micah', tests.create_user('Micah')), ('dee', tests.create_user('Dee'));
select tests.make_committee(public.__id('rickey'));

-- a member cannot reset
select tests.authenticate_as(public.__id('dee'));
insert into public.__tap(line) select throws_ok($$ select public.reset_member_claim('Micah') $$, 'P0001', 'committee only', 'a member cannot reset');

-- committee resets Micah
select tests.clear_authentication();
select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select throws_ok($$ select public.reset_member_claim('Rickey') $$, 'P0001', 'cannot reset yourself', 'cannot reset yourself');
insert into public.__tap(line) select throws_ok($$ select public.reset_member_claim('Micah', public.__id('dee')) $$, 'P0001', 'member claim changed', 'a stale expected user is refused');
insert into public.__tap(line) select lives_ok($$ select public.reset_member_claim('Micah', public.__id('micah')) $$, 'committee resets Micah');

select tests.clear_authentication();
insert into public.__tap(line) select is((select user_id from members where name = 'Micah'), null::uuid, 'the name is free again');
insert into public.__tap(line) select is((select count(*)::int from auth.users where id = public.__id('micah')), 0, 'the login is deleted too (no dashboard step)');
insert into public.__tap(line) select is((select count(*)::int from auth.users where id = public.__id('dee')), 1, 'other logins are untouched');

insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
