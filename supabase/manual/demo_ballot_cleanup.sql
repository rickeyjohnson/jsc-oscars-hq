-- ============================================================================
-- Removes everything demo_ballot.sql created: ballots named '[DEMO]%' and their
-- categories, nominees, votes, results, round_nominees and child rounds (ON DELETE CASCADE).
-- Nothing else is touched. Idempotent. Paste into the Supabase dashboard SQL editor (as postgres).
-- (Committee members can also use Delete ballot in the app once that exists.)
-- ============================================================================
begin;

delete from public.ballots
where name like '[DEMO]%'
   or parent_ballot_id in (select id from public.ballots where name like '[DEMO]%');

-- should be 0 for all
select
  (select count(*) from public.ballots where name like '[DEMO]%') as demo_ballots,
  (select count(*) from public.categories c where not exists (select 1 from public.ballots b where b.id = c.ballot_id)) as orphan_categories;

commit;
