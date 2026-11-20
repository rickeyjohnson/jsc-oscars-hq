-- ============================================================================
-- Removes EVERYTHING seed_test_data.sql created (plus a practice release), and
-- nothing else. Idempotent. Run in the Supabase dashboard SQL editor, as postgres.
--
-- WARNING: this deletes users with email like '%@jsc-test.local' and ballots named
-- '[TEST]%' (and their tiebreak/committee child rounds). It also clears
-- seasons.results_released_at (a practice release must not stay live) but FAILS CLOSED: if
-- a real ballot with status 'released' remains, it raises and the whole wipe rolls back.
-- Ballots not named '[TEST]%' are never deleted; each is listed in a WARNING so you can
-- delete stray practice ballots by hand.
-- Real (non-test) users are never deleted; a warning is raised if any exist.
-- Run it BEFORE announcing to friends (before Mon Nov 23).
-- ============================================================================
begin;

-- results (and results.places) belong to categories/ballots and cascade away with the test
-- ballots; delete them explicitly first anyway so nothing depends on the cascade.
delete from public.results
where category_id in (
        select c.id from public.categories c join public.ballots b on b.id = c.ballot_id
        where b.name like '[TEST]%')
   or decided_ballot_id in (
        select id from public.ballots
        where name like '[TEST]%'
           or parent_ballot_id in (select id from public.ballots where name like '[TEST]%'));

-- ballots (cascades categories, nominees, round_nominees, votes, results, child round ballots,
-- including test ballots a practice release flipped to 'released')
delete from public.ballots
where name like '[TEST]%'
   or parent_ballot_id in (select id from public.ballots where name like '[TEST]%');

-- Warn (never delete) about ballots that are not [TEST] ballots: stray practice ballots
-- or real ones. Delete practice ballots by hand: select id, name, status from public.ballots;
do $s$
declare b record; n int := 0;
begin
  for b in select bl.id, bl.name, bl.status, s.name as season from public.ballots bl
           join public.seasons s on s.id = bl.season_id
           where bl.name not like '[TEST]%' order by bl.created_at loop
    n := n + 1;
    raise warning 'NOT a [TEST] ballot, NOT deleted: % (status %, season %, id %). If it is a stray practice ballot, delete it by hand.',
      b.name, b.status, b.season, b.id;
  end loop;
  if n > 0 then
    raise warning '*** % non-[TEST] ballot(s) remain. Delete stray practice ballots by hand before launch. ***', n;
  end if;
end
$s$;

-- un-release a practice release, FAIL CLOSED:
--  (a) a real ballot with status 'released' in a released season -> raise, the whole wipe rolls back;
--  (b) otherwise (only real draft/open/closed ballots, none released) the practice release must not
--      stay live, so clear results_released_at and list any real non-draft ballots in a NOTICE.
do $r$
declare s record; v_list text;
begin
  for s in select id, name from public.seasons where results_released_at is not null loop
    if exists (select 1 from public.ballots b where b.season_id = s.id and b.status = 'released') then
      raise exception 'Refusing: real released ballots exist in season % ; resolve manually (nothing was changed)', s.name;
    end if;
    select string_agg(b.name || ' (' || b.status || ')', ', ') into v_list
    from public.ballots b where b.season_id = s.id and b.status <> 'draft';
    update public.seasons set results_released_at = null where id = s.id;
    if v_list is not null then
      raise notice 'Season % un-released. Real non-draft ballots still present: %', s.name, v_list;
    end if;
  end loop;
end
$r$;

-- test users (cascades profiles and any leftover votes; members.user_id is set null)
delete from auth.users where email like '%@jsc-test.local';

-- free member names whose user no longer exists
update public.members set user_id = null, claimed_at = null
where user_id is null and claimed_at is not null;

do $w$
declare v_real int;
begin
  select count(*) into v_real from auth.users where email not like '%@jsc-test.local';
  if v_real > 0 then
    raise warning '% non-test user(s) exist in auth.users; they were NOT deleted. Their member claims are intact.', v_real;
  end if;
end
$w$;

commit;

-- verification
select
  (select count(*) from auth.users where email like '%@jsc-test.local')  as test_users,       -- 0
  (select count(*) from public.ballots where name like '[TEST]%')        as test_ballots,     -- 0
  (select count(*) from public.results r
     join public.categories c on c.id = r.category_id
     join public.ballots b on b.id = c.ballot_id
    where b.name like '[TEST]%')                                         as test_results,     -- 0
  (select count(*) from public.seasons where results_released_at is not null) as released_seasons, -- 0 before the ceremony
  (select count(*) from public.members where user_id is null)            as unclaimed_members, -- 14 if no real signups
  (select count(*) from auth.users where email not like '%@jsc-test.local') as non_test_users;
