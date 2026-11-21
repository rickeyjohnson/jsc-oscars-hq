-- save_ballot_draft tests (all-or-nothing draft save). TAP lines are collected into public.__tap and printed by the
-- final select. Helper tables live only inside this transaction (begin ... rollback); NOT temp tables.
begin;

create table public.__tap (n serial primary key, line text);
create table public.__ids (k text primary key, v uuid);
grant select, insert on public.__tap to authenticated, anon;
grant usage on sequence public.__tap_n_seq to authenticated, anon;
grant select on public.__ids to authenticated, anon;
create function public.__id(p_k text) returns uuid language sql stable security definer set search_path = '' as
  $$ select v from public.__ids where k = p_k $$;

insert into public.__tap(line) select plan(9);

update members set user_id = null, claimed_at = null where name in ('Rickey','Micah');
insert into public.__ids values ('rickey', tests.create_user('Rickey')), ('micah', tests.create_user('Micah')), ('S', gen_random_uuid()), ('OPEN', gen_random_uuid());
select tests.make_committee(public.__id('rickey'));
insert into seasons (id, name) values (public.__id('S'), 'Draft season');
insert into ballots (id, season_id, name, status, opens_at, closes_at) values
  (public.__id('OPEN'), public.__id('S'), 'Already open', 'open', now() - interval '1 hour', now() + interval '1 day');

select tests.authenticate_as(public.__id('micah'));
insert into public.__tap(line) select throws_ok($$ select public.save_ballot_draft(null, '{}'::jsonb, '[]'::jsonb) $$, '42501', 'Only committee members can save a ballot', 'a member cannot save');

select tests.clear_authentication();
select tests.authenticate_as(public.__id('rickey'));
insert into public.__ids select 'D', public.save_ballot_draft(null,
  jsonb_build_object('season_id', public.__id('S'), 'name', 'Fall draft', 'opens_at', now() + interval '1 day', 'closes_at', now() + interval '3 days'),
  '[{"name":"Best Hair","sort_order":0,"nominee_mode":"preset","nominees":[{"display_name":"A","type":"person","member_ids":[]},{"display_name":"B","type":"person","member_ids":[]}]},
    {"name":"Best Duo","sort_order":1,"nominee_mode":"group","nominees":[]}]'::jsonb);
insert into public.__tap(line) select is((select status::text from ballots where id = public.__id('D')), 'draft', 'creates a draft');
insert into public.__tap(line) select is((select count(*)::int from categories where ballot_id = public.__id('D')), 2, 'with its categories');
insert into public.__tap(line) select is((select count(*)::int from nominees n join categories c on c.id = n.category_id where c.ballot_id = public.__id('D')), 2, 'and nominees');

-- rewriting replaces the categories
select public.save_ballot_draft(public.__id('D'),
  jsonb_build_object('season_id', public.__id('S'), 'name', 'Fall draft v2', 'opens_at', now() + interval '1 day', 'closes_at', now() + interval '3 days'),
  '[{"name":"Only one","sort_order":0,"nominee_mode":"everyone","nominees":[]}]'::jsonb);
insert into public.__tap(line) select is((select name from ballots where id = public.__id('D')), 'Fall draft v2', 'rewrite updates the ballot');
insert into public.__tap(line) select is((select count(*)::int from categories where ballot_id = public.__id('D')), 1, 'and replaces its categories');

-- all or nothing: a bad nominee type fails the whole save and leaves the old draft intact
insert into public.__tap(line) select throws_ok($$ select public.save_ballot_draft(public.__id('D'),
  jsonb_build_object('season_id', public.__id('S'), 'name', 'Broken', 'opens_at', now() + interval '1 day', 'closes_at', now() + interval '3 days'),
  '[{"name":"X","sort_order":0,"nominee_mode":"preset","nominees":[{"display_name":"A","type":"not_a_type","member_ids":[]}]}]'::jsonb) $$, '22P02', null, 'a bad row fails the whole save');
insert into public.__tap(line) select is((select name from ballots where id = public.__id('D')), 'Fall draft v2', 'the old draft is untouched');

insert into public.__tap(line) select throws_ok($$ select public.save_ballot_draft(public.__id('OPEN'), '{}'::jsonb, '[]'::jsonb) $$, 'P0001', 'Only draft ballots can be rewritten', 'only drafts can be rewritten');

select tests.clear_authentication();
insert into public.__tap(line) select * from finish();
select string_agg(line, E'\n' order by n) as tap from public.__tap;
rollback;
