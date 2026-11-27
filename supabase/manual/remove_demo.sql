-- Removes the demo ballot and the "[Demo]" season, then makes sure ONE real season exists
-- with NO ceremony date (members see "Date coming soon" until the committee sets it).
-- Paste into the Supabase SQL editor and run once. Idempotent. Touches no members, past_stats or accounts.
begin;

-- 1. demo ballots (and anything in the demo season); categories/nominees/votes/results cascade
delete from public.ballots
where name like '[DEMO]%'
   or parent_ballot_id in (select id from public.ballots where name like '[DEMO]%')
   or season_id in (select id from public.seasons where name ilike '[demo]%');

-- 2. the demo season
delete from public.seasons where name ilike '[demo]%';

-- 3. one real season, date and place left empty, only if none is left
insert into public.seasons (name, ceremony_at, location, results_released_at)
select 'JSC Oscars Fall 2026', null, null, null
where not exists (select 1 from public.seasons);

-- should show: 0 demo ballots, 1 season named JSC Oscars Fall 2026 with empty date
select
  (select count(*) from public.ballots where name like '[DEMO]%') as demo_ballots,
  (select count(*) from public.seasons) as seasons,
  (select string_agg(name || ' / ' || coalesce(ceremony_at::text, 'no date'), ', ') from public.seasons) as season_info;

commit;
