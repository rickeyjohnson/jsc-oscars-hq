-- OAuth sign-in + member_name_status + claim_member_name tests. TAP lines are collected into
-- public.__tap and printed by the final select. Helper tables live only inside this transaction
-- (begin ... rollback); NOT temp tables.
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(16);

-- ---------------------------------------------------------------- setup (as postgres)
update members set user_id = null, claimed_at = null;
insert into public.__ids select k, gen_random_uuid() from unnest(array['g1','g2','em']) k;

-- ---------------------------------------------------------------- anon: status
select tests.authenticate_anon();
insert into public.__tap(line) select is((select count(*)::int from member_name_status()), 14, 'anon sees 14 names');
insert into public.__tap(line) select is((select array_agg(distinct k order by k) from member_name_status() s, jsonb_object_keys(to_jsonb(s)) k), array['name','taken'], 'status exposes only name and taken');
insert into public.__tap(line) select is((select count(*)::int from member_name_status() where taken), 0, 'no names taken initially');
insert into public.__tap(line) select throws_ok($$ select claim_member_name('Micah') $$, '42501', null, 'anon cannot call claim_member_name');
select tests.clear_authentication();

-- ---------------------------------------------------------------- google-like signups (as postgres)
insert into public.__tap(line) select lives_ok($$
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', public.__id('g1'), 'authenticated', 'authenticated', 'g1@test.local',
    '{"provider":"google"}', '{"full_name":"Gee One","is_committee":true}', now(), now()) $$, 'google signup without member_name works');
insert into public.__tap(line) select is((select is_committee from profiles where user_id = public.__id('g1')), false, 'google profile created, metadata cannot grant committee');
insert into public.__tap(line) select is((select count(*)::int from members where user_id = public.__id('g1')), 0, 'google signup claims no member');
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', public.__id('g2'), 'authenticated', 'authenticated', 'g2@test.local',
    '{"provider":"google"}', '{}', now(), now());

-- ---------------------------------------------------------------- g1 claims
select tests.authenticate_as(public.__id('g1'));
insert into public.__tap(line) select lives_ok($$ select claim_member_name('Micah') $$, 'google user claims Micah');
insert into public.__tap(line) select throws_ok($$ select claim_member_name('Nick') $$, 'P0001', 'already linked to a member', 'second claim by same user fails');
insert into public.__tap(line) select is((select taken from member_name_status() where name = 'Micah'), true, 'taken flips after claim');

-- ---------------------------------------------------------------- g2 failures
select tests.clear_authentication();
select tests.authenticate_as(public.__id('g2'));
insert into public.__tap(line) select throws_ok($$ select claim_member_name('Micah') $$, 'P0001', 'member name Micah is not available', 'taken name cannot be claimed');
insert into public.__tap(line) select throws_ok($$ select claim_member_name('Stranger') $$, 'P0001', 'member name Stranger is not available', 'unknown name cannot be claimed');
select tests.clear_authentication();

-- ---------------------------------------------------------------- email regression
insert into public.__tap(line) select throws_ok($$
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', public.__id('em'), 'authenticated', 'authenticated', 'em@test.local',
    '{"provider":"email"}', '{}', now(), now()) $$, 'P0001', 'member name is required', 'email signup without member_name fails');
insert into public.__tap(line) select lives_ok($$ select tests.create_user('Rico') $$, 'email signup with member_name works');
insert into public.__tap(line) select isnt((select user_id from members where name = 'Rico'), null, 'email signup claimed Rico');

insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
