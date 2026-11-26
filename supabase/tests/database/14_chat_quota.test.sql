-- Ask JSC daily quota: per-member cap, overall cap, and no anonymous access.
-- TAP lines are collected into public.__tap and printed by the final select (same pattern as 13_delete_ballot).
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(7);

update members set user_id = null, claimed_at = null where name in ('Rickey','Micah');
insert into public.__ids values ('rickey', tests.create_user('Rickey')), ('micah', tests.create_user('Micah'));

select tests.authenticate_as(public.__id('micah'));
insert into public.__tap(line) select is((public.chat_take_quota(2, 100)->>'ok')::boolean, true, 'first question is allowed');
insert into public.__tap(line) select is((public.chat_take_quota(2, 100)->>'left')::int, 0, 'second question uses the last one');
insert into public.__tap(line) select is(public.chat_take_quota(2, 100)->>'reason', 'user', 'third is refused: member cap');
select tests.clear_authentication();

select tests.authenticate_as(public.__id('rickey'));
insert into public.__tap(line) select is((public.chat_take_quota(2, 100)->>'ok')::boolean, true, 'another member still has their own allowance');
insert into public.__tap(line) select is(public.chat_take_quota(5, 3)->>'reason', 'global', 'refused when the overall cap is reached');
select tests.clear_authentication();

insert into public.__tap(line) select is((select count(*)::int from public.chat_usage), 2, 'one usage row per member per day');

select tests.clear_authentication();
set local role anon;
insert into public.__tap(line) select throws_ok($$ select public.chat_take_quota(2, 100) $$, '42501', null, 'anon cannot call the quota function');
reset role;

insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
