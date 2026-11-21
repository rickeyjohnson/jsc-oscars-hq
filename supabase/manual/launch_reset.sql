-- ============================================================================
-- JSC OSCARS LAUNCH RESET  --  *** IRREVERSIBLE ***
-- Paste into the Supabase dashboard SQL editor (runs as postgres). Not applied by anything else.
--
-- BEFORE YOU DO ANYTHING: take a backup / export first (see docs/LAUNCH-RESET.md).
-- THEN: run PART 1 (dry-run counts) on its own and read it.
-- THEN: run PART 2 as is (DRY RUN: it does everything, reports, and rolls back).
-- ONLY THEN: change the ONE marked line in PART 2 (v_commit) to true and run it again.
--
-- Result: a clean "first login" state.
--   DELETES: every auth user (+ identities, sessions, refresh tokens, one-time tokens via cascade),
--            profiles, votes, results, round_nominees, nominees, categories, ballots (incl. tiebreak/
--            committee rounds), MYOC windows + ideas, ALL seasons, ALL legacy "oscarsEvents" rows.
--   KEEPS:   the 14 public.members rows (names) but UNCLAIMED (user_id null, claimed_at null);
--            ALL public.past_stats rows; schema, functions, triggers, RLS, migrations, storage buckets.
--   CREATES: one season row "JSC Oscars Fall 2026" (ceremony 2026-12-04 15:00 America/New_York
--            = 20:00 UTC, location null, results_released_at null) so Home shows a countdown.
--
-- NOT done by SQL: avatar files in storage (bucket profile-pics). Supabase blocks direct
-- DELETE on storage.objects ("Direct deletion from storage tables is not allowed"). Empty the bucket
-- in the dashboard afterwards: Storage -> profile-pics -> select all (checkbox at top) -> Delete.
-- ============================================================================


-- ============================================================================
-- PART 1: DRY-RUN COUNTS (read-only). Highlight this statement and run it alone.
-- ============================================================================
select 1 as ord, 'auth.users            (DELETE)' as what, count(*) as rows from auth.users
union all select 2,  'auth.identities       (DELETE, cascade)', count(*) from auth.identities
union all select 3,  'auth.sessions         (DELETE, cascade)', count(*) from auth.sessions
union all select 4,  'auth.refresh_tokens   (DELETE, cascade)', count(*) from auth.refresh_tokens
union all select 5,  'auth.one_time_tokens  (DELETE, cascade)', count(*) from auth.one_time_tokens
union all select 6,  'public.profiles       (DELETE, cascade)', count(*) from public.profiles
union all select 7,  'public.votes          (DELETE)', count(*) from public.votes
union all select 8,  'public.results        (DELETE)', count(*) from public.results
union all select 9,  'public.round_nominees (DELETE)', count(*) from public.round_nominees
union all select 10, 'public.nominees       (DELETE)', count(*) from public.nominees
union all select 11, 'public.categories     (DELETE)', count(*) from public.categories
union all select 12, 'public.ballots        (DELETE)', count(*) from public.ballots
union all select 13, 'public.myoc_ideas     (DELETE)', count(*) from public.myoc_ideas
union all select 14, 'public.myoc_windows   (DELETE)', count(*) from public.myoc_windows
union all select 15, 'public.seasons        (DELETE, then 1 new)', count(*) from public.seasons
union all select 16, 'public."oscarsEvents" (DELETE, legacy)', count(*) from public."oscarsEvents"
union all select 17, 'storage profile-pics  (NOT SQL: empty in dashboard)', count(*) from storage.objects where bucket_id = 'profile-pics'
union all select 18, 'public.members total  (KEEP, expect 14)', count(*) from public.members
union all select 19, 'public.members claimed (KEEP rows, UNCLAIM)', count(*) from public.members where user_id is not null or claimed_at is not null
union all select 20, 'public.past_stats     (KEEP, must not change)', count(*) from public.past_stats
order by ord;


-- ============================================================================
-- PART 2: THE RESET. One DO block = one atomic transaction (any error undoes everything).
-- ============================================================================
do $reset$
declare
  -- >>>>>>>>>> THE ONE LINE TO CHANGE: false = DRY RUN (rolls back), true = COMMIT FOR REAL <<<<<<<<<<
  v_commit constant boolean := false;
  -- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  v_expected constant text[] := array['Anthony','Dakarai','Demichael','Micah','Rico','Nick','Rickey',
                                      'Kadin','Langston','Jonathan','John Sampson','Evan','TJ','Justin'];
  v_members_n  int;
  v_names_ok   boolean;
  v_stats_before int;
  v_stats_after  int;
  v_users_n int; v_ballots_n int; v_seasons_n int; v_events_n int;
  v_claimed_after int; v_users_after int; v_ballots_after int; v_seasons_after int;
begin
  -- GUARD: refuse to run against the wrong project / an unexpected members table
  select count(*) into v_members_n from public.members;
  select (select array_agg(name order by name) from public.members)
       = (select array_agg(n order by n) from unnest(v_expected) n)
    into v_names_ok;
  if v_members_n <> 14 or v_names_ok is not true then
    raise exception 'GUARD: expected exactly the 14 allowlisted members, found % rows (names match: %). Wrong project? Nothing was changed.',
      v_members_n, v_names_ok;
  end if;

  select count(*) into v_stats_before from public.past_stats;
  select count(*) into v_users_n   from auth.users;
  select count(*) into v_ballots_n from public.ballots;
  select count(*) into v_seasons_n from public.seasons;
  select count(*) into v_events_n  from public."oscarsEvents";

  -- 1. voting content. Deleting ballots cascades categories, nominees, round_nominees, votes, results,
  --    and child tiebreak/committee ballots. Explicit deletes first so nothing depends on the cascade.
  delete from public.votes where true;
  delete from public.results where true;
  delete from public.round_nominees where true;
  delete from public.nominees where true;
  delete from public.categories where true;
  delete from public.ballots where true;

  -- 2. MYOC (ideas reference windows; window ids reference seasons)
  delete from public.myoc_ideas where true;
  delete from public.myoc_windows where true;

  -- 3. seasons and the legacy events table (the old "Oscar event" rows)
  delete from public.seasons where true;
  delete from public."oscarsEvents" where true;

  -- 4. accounts. Cascades: profiles, any votes/myoc_ideas left, auth.identities, auth.sessions,
  --    auth.refresh_tokens, auth.one_time_tokens, auth.mfa_*. members.user_id is set null by its FK.
  delete from auth.users where true;

  -- 5. members stay, but unclaimed so each person can sign up and claim their name
  update public.members set user_id = null, claimed_at = null where true;

  -- 6. the ONE real season (verified columns: name, ceremony_at, location, results_released_at)
  insert into public.seasons (name, ceremony_at, location, results_released_at)
  values ('JSC Oscars Fall 2026', timestamptz '2026-12-04 15:00:00 America/New_York', null, null);

  -- 7. assertions: any failure rolls the whole thing back
  select count(*) into v_stats_after from public.past_stats;
  select count(*) into v_claimed_after from public.members where user_id is not null or claimed_at is not null;
  select count(*) into v_users_after from auth.users;
  select count(*) into v_ballots_after from public.ballots;
  select count(*) into v_seasons_after from public.seasons;
  if v_stats_after <> v_stats_before then
    raise exception 'ASSERT: past_stats changed (% -> %). Rolled back.', v_stats_before, v_stats_after;
  end if;
  if (select count(*) from public.members) <> 14 or v_claimed_after <> 0 or v_users_after <> 0
     or v_ballots_after <> 0 or v_seasons_after <> 1
     or exists (select 1 from public.profiles) or exists (select 1 from public.votes)
     or exists (select 1 from public.myoc_windows) or exists (select 1 from public."oscarsEvents") then
    raise exception 'ASSERT: post-reset state is not clean. Rolled back.';
  end if;

  if not v_commit then
    -- raising rolls back everything above; the message is the dry-run report
    raise exception 'DRY RUN OK, ROLLED BACK, nothing changed. Would have deleted: % auth users, % ballots, % seasons, % legacy events; kept 14 members (unclaimed) and % past_stats; created 1 season. To do it for real set v_commit to true and run again.',
      v_users_n, v_ballots_n, v_seasons_n, v_events_n, v_stats_after;
  end if;

  raise notice 'COMMITTED: reset complete. Now empty the profile-pics bucket in the dashboard, then see the checklist below.';
end
$reset$;


-- ============================================================================
-- PART 3: VERIFICATION (read-only). Run after PART 2 with v_commit = true.
-- (After a dry run it just shows the untouched current state.)
-- ============================================================================
select
  (select count(*) from public.members)                                          as members_total,      -- 14
  (select count(*) from public.members where user_id is not null or claimed_at is not null) as members_claimed, -- 0
  (select count(*) from auth.users)                                              as auth_users,         -- 0
  (select count(*) from public.profiles)                                         as profiles,           -- 0
  (select count(*) from public.ballots)                                          as ballots,            -- 0
  (select count(*) from public.votes)                                            as votes,              -- 0
  (select count(*) from public.myoc_windows)                                     as myoc_windows,       -- 0
  (select count(*) from public."oscarsEvents")                                   as legacy_events,      -- 0
  (select count(*) from public.past_stats)                                       as past_stats,         -- SAME as the PART 1 number
  (select count(*) from public.seasons)                                          as seasons,            -- 1
  (select ceremony_at at time zone 'America/New_York' from public.seasons limit 1) as ceremony_eastern, -- 2026-12-04 15:00:00
  (select count(*) from storage.objects where bucket_id = 'profile-pics')        as avatar_files;       -- 0 once you empty the bucket

-- ============================================================================
-- POST-RUN CHECKLIST (do in this order)
--  1. Dashboard -> Storage -> profile-pics -> select all -> Delete (SQL cannot). avatar_files above must read 0.
--  2. Dashboard -> Authentication -> Users must be empty.
--  3. Rickey and Kadin sign up in the deployed app FIRST (names "Rickey" and "Kadin").
--  4. Run supabase/manual/set_committee.sql in this editor, as postgres. It sets is_committee = true for the
--     accounts linked to members Rickey and Kadin and false for everyone else. Then verify:
--       select m.name, p.is_committee from members m join profiles p on p.user_id = m.user_id order by m.name;
--     Sign out and back in so the app sees committee.
--  5. Enable keepalive: GitHub secrets SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY, then Actions -> keepalive -> Run workflow (green).
--  6. In the app: You -> Committee -> Season and ceremony date should read Fri, Dec 4, 2026, 3:00 PM EST; Home shows the countdown.
--  7. Announce to everyone; each person signs up and claims their name. Create the real ballot as committee.
-- ============================================================================
