-- ============================================================================
-- JSC OSCARS DEMO STARTER BALLOT  (for recording the demo video)
-- Paste into the Supabase dashboard SQL editor (runs as postgres). NOT applied by anything else.
--
-- Creates ONE open ballot "[DEMO] Starter Ballot" in the current season (the season with the latest
-- ceremony_at) with 6 fun categories and 4-5 nominees each. Nominees are the 14 real member names
-- where it fits (member_ids filled in) plus a few outsiders. No fake accounts, no votes.
--
-- v_commit false = DRY RUN: it inserts, reports counts, then raises so everything rolls back.
-- Set v_commit to true (the ONE marked line) and run again to keep it.
-- Refuses to run if a "[DEMO]" ballot already exists.
--
-- Removing it: run demo_ballot_cleanup.sql. Once the "Delete ballot" action is live in the app,
-- committee members can also delete it themselves: Manage ballots -> the ballot -> Delete ballot.
-- ============================================================================
do $demo$
declare
  -- >>>>>>>>>> THE ONE LINE TO CHANGE: false = DRY RUN (rolls back), true = COMMIT FOR REAL <<<<<<<<<<
  v_commit constant boolean := false;
  -- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

  v_season uuid;
  v_ballot uuid;
  v_cat    uuid;
  v_members_n int;
  v_n_cats int;
  v_n_noms int;
begin
  select count(*) into v_members_n from public.members;
  if v_members_n <> 14 then
    raise exception 'expected 14 members, found %', v_members_n;
  end if;
  if exists (select 1 from public.ballots where name like '[DEMO]%') then
    raise exception 'a [DEMO] ballot already exists: run supabase/manual/demo_ballot_cleanup.sql first';
  end if;
  select id into v_season from public.seasons order by ceremony_at desc nulls last, id limit 1;
  if v_season is null then
    raise exception 'no season found';
  end if;

  insert into public.ballots (season_id, name, round, status, opens_at, closes_at)
  values (v_season, '[DEMO] Starter Ballot', 'main', 'open', now() - interval '1 hour', now() + interval '7 days')
  returning id into v_ballot;

  -- 1 Best Dressed: members, subset
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode)
  values (v_ballot, 'Best Dressed', 'Who wins the group chat drip check?', 1, 'subset') returning id into v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, m.name, 'person', array[m.id], null from public.members m where m.name in ('Dakarai','Micah','Langston','TJ','Justin');

  -- 2 Funniest Sidechat: members, subset
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode)
  values (v_ballot, 'Funniest Sidechat', 'The one who always has the group laughing', 2, 'subset') returning id into v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, m.name, 'person', array[m.id], null from public.members m where m.name in ('Rico','Nick','Evan','John Sampson','Kadin');

  -- 3 Best Snack: preset outsiders, members can add
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode, allow_member_add)
  values (v_ballot, 'Best Snack', 'Add your own pick', 3, 'preset', true) returning id into v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, s, 'outsider', '{}', null from unnest(array['Takis','Hot Cheetos','Gushers','Flamin'' Hot Fries']) s;

  -- 4 Best Duo: groups
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode)
  values (v_ballot, 'Best Duo', 'Dynamic duos of the group', 4, 'group') returning id into v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, string_agg(m.name, ' & ' order by m.name), 'group', array_agg(m.id order by m.name), null
  from (values (1,'Nick'),(1,'Rickey'),(2,'Micah'),(2,'Rico'),(3,'Anthony'),(3,'TJ'),(4,'Kadin'),(4,'Evan')) g(gid, gname)
  join public.members m on m.name = g.gname
  group by g.gid;

  -- 5 Most Likely To Be Late: everyone
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode)
  values (v_ballot, 'Most Likely To Be Late', 'Everyone is on the list', 5, 'everyone') returning id into v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, m.name, 'person', array[m.id], null from public.members m;

  -- 6 Best Game Night Game: preset outsiders
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode, allow_member_add)
  values (v_ballot, 'Best Game Night Game', 'What are we playing?', 6, 'preset', false) returning id into v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, s, 'noun', '{}', null from unnest(array['Mario Kart','Uno','Jackbox','Smash Bros','Monopoly']) s;

  select count(*) into v_n_cats from public.categories where ballot_id = v_ballot;
  select count(*) into v_n_noms from public.nominees n join public.categories c on c.id = n.category_id where c.ballot_id = v_ballot;

  if not v_commit then
    raise exception 'DRY RUN OK, ROLLED BACK, nothing changed. Would have created 1 open ballot, % categories, % nominees. Set v_commit to true and run again to keep it.', v_n_cats, v_n_noms;
  end if;
  raise notice 'COMMITTED: [DEMO] Starter Ballot created with % categories and % nominees.', v_n_cats, v_n_noms;
end
$demo$;
