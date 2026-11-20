-- ============================================================================
-- Removes EVERYTHING seed_test_data.sql created, and nothing else. Idempotent.
-- Run in the Supabase dashboard SQL editor, as postgres.
-- Real (non-test) users are never deleted; a warning is raised if any exist.
-- ============================================================================
begin;

-- ballots (cascades categories, nominees, round_nominees, votes, results, child round ballots)
delete from public.ballots
where name like '[TEST]%'
   or parent_ballot_id in (select id from public.ballots where name like '[TEST]%');

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
  (select count(*) from public.members where user_id is null)            as unclaimed_members, -- 14 if no real signups
  (select count(*) from auth.users where email not like '%@jsc-test.local') as non_test_users;
