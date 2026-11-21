# Pre-flight checklist (run before Nov 25)

Do these in order. Details live in `docs/DEPLOY.md` (section numbers below). Project ref: `fsuczxowirmsxtmzzsys`. Never paste secrets into chat or the repo.

## 1. Supabase is awake
- [ ] Dashboard -> project `fsuczxowirmsxtmzzsys` shows **Active** (not Paused). If paused: Restore project, wait until it is Active (DEPLOY 8).
- [ ] Open the live app once yourself and load Home (wakes the database).
- [ ] Repeat this check the day before voting and the morning of Nov 25.

## 2. Keep-alive secrets (DEPLOY 8)
- [ ] GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret:
  - `SUPABASE_URL` = `https://fsuczxowirmsxtmzzsys.supabase.co`
  - `SUPABASE_PUBLISHABLE_KEY` = the `sb_publishable_...` key (never the secret key)
- [ ] Actions -> `keepalive` -> Run workflow. It must finish green.

## 3. Apply every migration, in order (DEPLOY 4)
Dashboard -> SQL Editor -> paste each file from `supabase/migrations/`, one at a time, oldest first. Already applied: `20261119000000` ... `20261122000100`. Still to apply (check each with the query under it):
- [ ] `20261124000100_reopen_ballot.sql` (reopen a closed ballot)
  `select proname from pg_proc where proname = 'reopen_ballot';` -> 1 row
- [ ] `20261124000200_myoc.sql` (Make Your Own Category)
  `select to_regclass('public.myoc_ideas'), to_regclass('public.myoc_windows');` -> both non-null
- [ ] `20261124000700_myoc_no_limit.sql` (MYOC: no idea limit; apply after 000200; test `supabase/tests/database/07_myoc.test.sql`)
  `select pg_get_functiondef('public.myoc_ideas_guard()'::regprocedure) not like '%limit reached%';` -> `true`
- [ ] `20261124000400_reset_claim_frees_login.sql` (reset a name also frees the login)
  `select pg_get_functiondef('public.reset_member_claim(text,uuid)'::regprocedure) like '%auth.users%';` -> `true`
- [ ] `20261124000500_unique_round.sql` (no duplicate tiebreak/committee round). If it errors on duplicates, run the `select ... having count(*) > 1` in the file's header comment and delete the extra round.
  `select indexname from pg_indexes where indexname = 'ballots_one_round_per_kind';` -> 1 row
- [ ] `20261124000600_save_ballot_draft.sql` (all-or-nothing draft save)
  `select proname from pg_proc where proname = 'save_ballot_draft';` -> 1 row
- No migration is needed for the ceremony date: committee already has UPDATE on `seasons` (policy `seasons_update_committee`).

Then run the DB tests (DEPLOY 4: the `tests` schema from `000-setup-tests-hooks.test.sql` must exist; run it first if dropped). Paste each file; every TAP line must be `ok`:
- [ ] `01_members_roles` 1..12, `02_voting_rls` 1..71, `03_results_places` 1..8, `04_reset_claim_guards` 1..10
- [ ] `06_reopen` 1..19, `07_reset_claim_frees_login` 1..7, `09_save_ballot_draft` 1..9, `10_unique_round` 1..4

Only after the last test run (DEPLOY 4):
```sql
drop schema tests cascade;
drop extension if exists pgtap;
```

## 4. Google sign-in and redirect URLs (DEPLOY 2, 2b)
- [ ] Supabase -> Authentication -> URL Configuration: Site URL = `https://<app>.vercel.app`; Redirect URLs include `https://<app>.vercel.app/**` (covers `/app`, `/signup/confirmed`, `/login/reset`) and `http://localhost:5173/**`.
- [ ] Authentication -> Providers -> Email: "Confirm email" OFF (the launch decision).
- [ ] Authentication -> Providers -> Google: enabled, client ID and secret pasted. Google Cloud OAuth redirect URI = `https://fsuczxowirmsxtmzzsys.supabase.co/auth/v1/callback`.
- [ ] Storage -> bucket `profile-pics`: max size 5 MB, MIME `image/*`.

## 5. Vercel environment variables (DEPLOY 1)
Project -> Settings -> Environment Variables (Production and Preview), then **Redeploy** (values are baked in at build time):
- [ ] `VITE_SUPABASE_URL` = `https://fsuczxowirmsxtmzzsys.supabase.co`
- [ ] `VITE_SUPABASE_API_KEY` = the publishable key
- [ ] `VITE_SITE_URL` = `https://<app>.vercel.app`
- [ ] `VITE_GOOGLE_AUTH` = `true`
- [ ] `curl -s -o /dev/null -w "%{http_code}\n" https://<app>.vercel.app/app/ballots` -> `200`

## 6. Committee (DEPLOY 3)
- [ ] Rickey and Kadin each sign up in the deployed app (names Rickey and Kadin).
- [ ] SQL Editor: run the contents of `supabase/manual/set_committee.sql`.
- [ ] Verify (only Rickey and Kadin are true), then sign out and in again:
  ```sql
  select m.name, p.is_committee from members m join profiles p on p.user_id = m.user_id order by m.name;
  ```

## 7. Wipe test data (DEPLOY 4, 7)
- [ ] If the test seed was ever used: run `supabase/manual/wipe_test_data.sql`.
- [ ] Counts must be clean:
  ```sql
  select count(*) from ballots;     -- 0 (or only your real/dry-run ballot)
  select count(*) from votes;       -- 0 before the real ballot opens
  select count(*) from seasons where results_released_at is not null;  -- 0
  select count(*) from auth.users;  -- only real people, no test@/example/jsc-test.local
  ```

## 8. Confirm the ceremony time
- [ ] In the app: You -> Committee -> **Season and ceremony date**. The saved value must read **Fri, Dec 4, 2026, 3:00 PM EST**. If not, set it (the picker is in Eastern time) and Save.
- [ ] Or by SQL: `select name, ceremony_at at time zone 'America/New_York' from seasons order by ceremony_at desc nulls last limit 1;` -> `2026-12-04 15:00:00`.

## 9. Test vote with a test account
- [ ] Sign up a throwaway real-looking account on a phone, pick a free name, confirm "Yes, I'm ..." appears.
- [ ] Vote in a dry-run ballot (see 10), change a vote, reload: the choice sticks. Airplane mode mid-vote shows a retry, not a hang.
- [ ] Then, as committee, Member names -> Reset that name (frees the name and the login). Confirm the account is gone:
  `select count(*) from auth.users where email = '<test email>';` -> 0

## 10. Committee dry run (DEPLOY 6, on phones)
- [ ] New ballot (2 categories, closes in 30 min), Publish (a confirm appears), both vote.
- [ ] Manage ballots -> the ballot: Close now (sheet names who is left), results record by themselves, Reopen ballot works once (new close time), Close again.
- [ ] Make a tie, Start tiebreak, close it; Start committee round and enter the winner by hand.
- [ ] Reveal page: checklist green, hold 3 s. As a member sitting on the sealed Results screen, the reveal appears without reloading (within 30 s).
- [ ] Undo and clean up: `supabase/manual/wipe_test_data.sql`, then re-run the section 7 counts.
