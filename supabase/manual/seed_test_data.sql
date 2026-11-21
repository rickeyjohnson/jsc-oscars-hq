-- ============================================================================
-- JSC Oscars TEST DATA SEED  (manual browser testing)
-- Run in the Supabase dashboard SQL editor, as postgres. Undo with wipe_test_data.sql.
--
-- Shared TEST password for all 14 accounts (throwaway credential): jsc-test-2026
--   (set as v_pw inside the DO block below; change both if you want another)
-- Emails: test.<name>@jsc-test.local  (spaces -> dots, e.g. test.john.sampson@jsc-test.local)
--
-- WARNING: these accounts claim ALL 14 real member names. Run wipe_test_data.sql
-- before real members sign up.
--
-- Everything is inside one transaction: a failure leaves nothing behind.
-- ============================================================================
begin;

do $seed$
declare
  v_pw     constant text := 'jsc-test-2026';
  v_names  constant text[] := array['Anthony','Dakarai','Demichael','Micah','Rico','Nick','Rickey',
                                    'Kadin','Langston','Jonathan','John Sampson','Evan','TJ','Justin'];
  v_name   text;
  v_uid    uuid;
  v_email  text;
  v_season uuid;
  v_main   uuid;
  v_tie    uuid;
  v_cat    uuid;
  v_cats   uuid[];
  v_noms   uuid[];
  v_counts int[];
  v_nom    uuid;
  v_mid    uuid;
  v_ids    uuid[];
  v_vi     int;
  v_ci     int;
  v_i      int;
  v_j      int;
  v_cum    int;
  v_voters constant text[] := array['Rickey','Kadin','Micah','Nick','Anthony','Evan','Justin','Rico','Langston','Jonathan'];
  v_nvotes constant int[]  := array[6,6,4,2,6,3,1,6,5,0];
  v_n_users int; v_n_ballots int; v_n_cats int; v_n_noms int; v_n_votes int;
begin
  -- guard: refuse to run twice / over existing data
  if exists (select 1 from auth.users where email like '%@jsc-test.local')
     or exists (select 1 from public.ballots where name like '[TEST]%') then
    raise exception 'test data already present: run supabase/manual/wipe_test_data.sql first';
  end if;
  select id into v_season from public.seasons where name = 'JSC Oscars Fall 2026';
  if v_season is null then
    raise exception 'season "JSC Oscars Fall 2026" not found';
  end if;

  -- (a) 14 test users; handle_new_user claims the member name and creates the profile
  foreach v_name in array v_names loop
    v_uid := gen_random_uuid();
    v_email := 'test.' || replace(lower(v_name), ' ', '.') || '@jsc-test.local';
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token,
      is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_pw, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('member_name', v_name, 'username', replace(lower(v_name), ' ', '')),
      now(), now(),
      '', '', '', '', '', '', '', '',
      false, false
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider,
                                 last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid, v_uid::text,
            jsonb_build_object('sub', v_uid::text, 'email', v_email,
                               'email_verified', true, 'phone_verified', false),
            'email', now(), now(), now());
  end loop;

  -- (b) committee
  update public.profiles set is_committee = true
  where user_id in (select user_id from public.members where name in ('Rickey','Kadin'));

  -- (c) main ballot, open, every nominee mode
  insert into public.ballots (season_id, name, round, status, opens_at, closes_at)
  values (v_season, '[TEST] Main Ballot', 'main', 'open',
          now() - interval '1 hour', now() + interval '3 days')
  returning id into v_main;

  v_cats := '{}';

  -- 1 everyone
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode)
  values (v_main, '[TEST] Best Dressed', 'everyone mode', 1, 'everyone') returning id into v_cat;
  v_cats := v_cats || v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, m.name, 'person', array[m.id], null from public.members m;

  -- 2 subset
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode)
  values (v_main, '[TEST] Best Locs', 'subset mode (4 members)', 2, 'subset') returning id into v_cat;
  v_cats := v_cats || v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, m.name, 'person', array[m.id], null
  from public.members m where m.name in ('Micah','Rico','Evan','Justin');

  -- 3 preset, no member add
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode, allow_member_add)
  values (v_main, '[TEST] Best Snack', 'preset, members cannot add', 3, 'preset', false) returning id into v_cat;
  v_cats := v_cats || v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, s, 'outsider', '{}', null from unnest(array['Takis','Hot Cheetos','Gushers']) s;

  -- 4 preset, members can add
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode, allow_member_add)
  values (v_main, '[TEST] Best Car', 'preset, members can add options', 4, 'preset', true) returning id into v_cat;
  v_cats := v_cats || v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, s, 'outsider', '{}', null from unnest(array['Honda Civic','Toyota Camry','Ford Mustang']) s;

  -- 5 group
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode)
  values (v_main, '[TEST] Best Duo', 'group mode, members can add groups', 5, 'group') returning id into v_cat;
  v_cats := v_cats || v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, string_agg(m.name, ', ' order by m.name), 'group', array_agg(m.id order by m.name), null
  from (values (1,'Nick'),(1,'Rickey'),(2,'Micah'),(2,'Rico'),(3,'Anthony'),(3,'TJ')) g(gid, gname)
  join public.members m on m.name = g.gname
  group by g.gid;

  -- 6 everyone
  insert into public.categories (ballot_id, name, description, sort_order, nominee_mode)
  values (v_main, '[TEST] Funniest', 'everyone mode', 6, 'everyone') returning id into v_cat;
  v_cats := v_cats || v_cat;
  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  select v_cat, m.name, 'person', array[m.id], null from public.members m;

  -- main votes: voter i votes in the first n categories, never for themselves
  for v_vi in 1 .. cardinality(v_voters) loop
    select id, user_id into v_mid, v_uid from public.members where name = v_voters[v_vi];
    for v_ci in 1 .. v_nvotes[v_vi] loop
      select array_agg(n.id order by n.display_name) into v_noms
      from public.nominees n
      where n.category_id = v_cats[v_ci] and not (v_mid = any (n.member_ids));
      v_nom := v_noms[1 + ((v_vi + v_ci) % cardinality(v_noms))];
      insert into public.votes (ballot_id, category_id, nominee_id, voter_id)
      values (v_main, v_cats[v_ci], v_nom, v_uid);
    end loop;
  end loop;

  -- (d) closed ballot with engineered results
  insert into public.ballots (season_id, name, round, status, opens_at, closes_at)
  values (v_season, '[TEST] Tie Practice', 'main', 'closed',
          now() - interval '5 days', now() - interval '1 day')
  returning id into v_tie;

  -- per category: option names and vote counts (sum 14, or 0)
  for v_ci in 1 .. 4 loop
    insert into public.categories (ballot_id, name, description, sort_order, nominee_mode)
    values (v_tie,
            case v_ci when 1 then '[TEST] Clear Winner'
                      when 2 then '[TEST] Two-Way Tie'
                      when 3 then '[TEST] Three-Way Tie'
                      else '[TEST] No Votes' end,
            case v_ci when 1 then 'A1 8, A2 4, A3 2'
                      when 2 then 'B1 6, B2 6, B3 2 (tie for first)'
                      when 3 then 'C1 4, C2 4, C3 4, C4 2 (tie for first)'
                      else 'zero votes: pick manually' end,
            v_ci, 'preset') returning id into v_cat;
    v_noms := '{}';
    for v_j in 1 .. case v_ci when 1 then 3 when 2 then 3 when 3 then 4 else 3 end loop
      insert into public.nominees (category_id, display_name, type, member_ids, created_by)
      values (v_cat, case v_ci when 1 then 'Option A' when 2 then 'Option B'
                               when 3 then 'Option C' else 'Option D' end || v_j,
              'outsider', '{}', null)
      returning id into v_nom;
      v_noms := v_noms || v_nom;
    end loop;
    v_counts := case v_ci when 1 then array[8,4,2] when 2 then array[6,6,2]
                          when 3 then array[4,4,4,2] else array[0,0,0] end;
    -- voters (all 14, by name) assigned to options by cumulative counts
    v_i := 0;
    for v_uid in select m.user_id from public.members m order by m.name loop
      v_i := v_i + 1;
      v_cum := 0;
      for v_j in 1 .. cardinality(v_counts) loop
        v_cum := v_cum + v_counts[v_j];
        if v_i <= v_cum then
          insert into public.votes (ballot_id, category_id, nominee_id, voter_id)
          values (v_tie, v_cat, v_noms[v_j], v_uid);
          exit;
        end if;
      end loop;
    end loop;
  end loop;

  -- (e) summary
  select count(*) into v_n_users from auth.users where email like '%@jsc-test.local';
  select count(*) into v_n_ballots from public.ballots where name like '[TEST]%';
  select count(*) into v_n_cats from public.categories c join public.ballots b on b.id = c.ballot_id
    where b.name like '[TEST]%';
  select count(*) into v_n_noms from public.nominees n join public.categories c on c.id = n.category_id
    join public.ballots b on b.id = c.ballot_id where b.name like '[TEST]%';
  select count(*) into v_n_votes from public.votes v join public.ballots b on b.id = v.ballot_id
    where b.name like '[TEST]%';
  raise notice 'Created % users, % ballots, % categories, % nominees, % votes.',
    v_n_users, v_n_ballots, v_n_cats, v_n_noms, v_n_votes;
  raise notice 'Password for all test users: %', v_pw;
  foreach v_name in array v_names loop
    raise notice '  test.%@jsc-test.local  (%)', replace(lower(v_name), ' ', '.'), v_name;
  end loop;
  raise notice 'Committee: Rickey, Kadin. Run wipe_test_data.sql before real signups.';
end
$seed$;

commit;
