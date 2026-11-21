# Deploy and launch checklist (JSC Oscars)

Supabase project: `fsuczxowirmsxtmzzsys` (see section 4 for which migrations are applied). Never paste secrets into chat, the repo, or `client/.env.example`.

## 1. Vercel

1. vercel.com -> Add New -> Project -> import the GitHub repo.
2. Root Directory = `client`. Framework Preset = Vite. Build command `npm run build`. Output directory `dist`.
   - `npm run build` is `tsc -b && vite build`, so type errors fail the deploy. `client/tsconfig.app.json` excludes your unfinished `src/components/IndividualDetailsModal.tsx` so it cannot break the build.
   - `client/vercel.json` adds an SPA fallback rewrite so deep links like `/app/ballots` work (the rewrite skips `/assets`, `/fonts`, `/icons`, `/sidechatters`, `sw.js`, the manifest). It also sets cache headers: `/assets/*` (hashed) is `immutable` for a year, `/fonts/*` 30 days, `/icons/*` 7 days, and `index.html`, `/`, `sw.js` and the manifest are `no-cache` so a deploy is picked up right away.
3. Environment variables (Production + Preview):
   - `VITE_SUPABASE_URL` = `https://fsuczxowirmsxtmzzsys.supabase.co`
   - `VITE_SUPABASE_API_KEY` = the **publishable** key (`sb_publishable_...`). Not the secret key.
   - `VITE_SITE_URL` = leave blank for the first deploy.
   - `VITE_GOOGLE_LOGIN` = leave EMPTY until the Google provider is configured (section 2b); then `true`. It only shows or hides "Continue with Google".
   - All `VITE_*` values are baked in at build time: change one, then Redeploy.
4. Deploy. Note the URL, e.g. `https://<app>.vercel.app`.
5. Set `VITE_SITE_URL=https://<app>.vercel.app` in Vercel -> Settings -> Environment Variables, then Deployments -> Redeploy (Vite bakes env vars in at build time).
6. Check: `curl -s -o /dev/null -w "%{http_code}\n" https://<app>.vercel.app/app/ballots` returns `200`.

## 2. Supabase auth settings

Dashboard -> Authentication -> URL Configuration:
1. Site URL = `https://<app>.vercel.app`.
2. Redirect URLs: add `https://<app>.vercel.app/**`; keep `http://localhost:5173/**` for dev.

Dashboard -> Authentication -> Providers -> Email: turn OFF "Confirm email". Decision: Confirm email = OFF for launch.
- Signup logs the user in immediately (no email needed) and the app goes straight to `/app`, where the profile photo setup appears. The member-name dropdown still limits who can claim a name.
- Supabase's built-in mailer only sends to project team members and is rate limited. So **password reset emails will NOT reach friends** unless you set up custom SMTP. Default plan: use the committee recovery procedure in section 7.
- Optional upgrade: custom SMTP (e.g. Resend free tier; Authentication -> SMTP Settings). Then reset emails work, and confirmation could be turned back on. The client handles both modes.

## 2b. Google sign-in (optional)

1. Google Cloud Console -> APIs and Services -> Credentials -> Create OAuth client ID (Web application). Authorized redirect URI = `https://fsuczxowirmsxtmzzsys.supabase.co/auth/v1/callback`. Copy the client ID and secret.
2. Supabase -> Authentication -> Providers -> Google: enable, paste the client ID and secret, save.
3. Supabase -> Authentication -> URL Configuration: Redirect URLs must include `https://<app>.vercel.app/**` (the app sends users back to `/app`) and `http://localhost:5173/**` for dev. A missing entry sends people to the Site URL root instead.
4. Vercel: set `VITE_GOOGLE_LOGIN=true`, Redeploy. Check: Log in shows "Continue with Google"; a first-time Google user lands on `/claim` to pick their name.
5. If Google users are not being created, check the provider's "Allow new users" and that "Confirm email" does not block OAuth emails.
Never paste the Google client secret into chat or the repo.

## 2c. PWA (installable app)

- Files: `client/public/manifest.webmanifest`, `client/public/icons/*`, `client/public/sw.js`. Icons are generated from the wordmark: `cd client && node scripts/render-icons.mjs` (needs the devDependency `@resvg/resvg-js`), then commit the PNGs.
- Service worker: hand-rolled and minimal. It caches only same-origin GET static files (the app shell, `/assets`, `/fonts`, `/icons`) and is registered **only in production builds**. It never handles Supabase, API, auth or any POST, so votes are always live requests. Each build stamps a new version into `dist/sw.js`; old caches are deleted on activate.
- Updates: a new version installs in the background and takes over only when the user is NOT on a vote screen (`/app/ballots/:id...`), then the page reloads once. Someone mid-vote keeps the old version until they leave the vote page or reopen the app.
- Verify after deploy: DevTools -> Application -> Manifest (no warnings, 3 icons), Service Workers (activated), `curl -sI https://<app>.vercel.app/sw.js | grep -i cache-control` shows `no-cache`.
- Install: iPhone Safari -> Share -> Add to Home Screen (title "Oscars"); Android Chrome -> Install app. Launch should be dark with no white flash, standalone, opening at `/app`.
- Kill switch if it misbehaves: deploy a `sw.js` that unregisters (`self.registration.unregister()` then `caches.keys().then(k => k.forEach(caches.delete.bind(caches)))`) or tell people to remove and re-add the app.

Dashboard -> Storage -> `profile-pics` bucket: set max file size to 5 MB and allowed MIME types to `image/*`.

## 3. Create the committee

1. Rickey and Kadin each sign up in the deployed app, choosing "Rickey" and "Kadin" from the name dropdown .
2. Supabase -> SQL Editor, run the contents of `supabase/manual/set_committee.sql`. It sets `is_committee = true` for exactly the accounts linked to members named Rickey and Kadin, and false for everyone else.
3. Verify:
   ```sql
   select m.name, p.is_committee from members m join profiles p on p.user_id = m.user_id order by m.name;
   ```
   Only Rickey and Kadin should be `true`. Sign out and in again so the app picks it up.

> Before any public (beyond-friends) hosting also complete `docs/PRE-PUBLISH.md` (font licensing, secrets, test data).

## 4. Database migrations, tests and cleanup (MUST happen before voting opens)

**Pre-launch checklist (do all of these before announcing):**
- [ ] `drop schema tests cascade;`
- [ ] `drop extension if exists pgtap;`
- [ ] Rotate the DB password and the secret key (section 5).
- [ ] Delete stray ballots: `select id, name, status from public.ballots;` and remove any practice ballot.

Note: `profiles.email` is readable by every signed-in member through the API today (column grant). Acceptable for 14 friends; listed under "Known limitations / fix before the ceremony" in section 8.

Apply every file in `supabase/migrations/` in this order (dashboard SQL editor or MCP `apply_migration`):
1. `20261119000000_remote_schema.sql` - applied.
2. `20261120000100_members_and_roles.sql` - applied.
3. `20261120000200_voting.sql` - applied.
4. `20261120000300_voting_fixes.sql` - applied.
5. `20261121000100_results_places.sql` - applied via MCP.
6. `20261121000200_reset_claim_guards.sql` - applied live (test 04 passed 1..10).

DB tests (`supabase/tests/database/`, run in the dashboard SQL editor; the `tests` schema from `000-setup-tests-hooks.test.sql` must exist; run 000 first if it was dropped). Each file prints TAP lines:
- `02_voting_rls.test.sql` -> `1..71`
- `03_results_places.test.sql` -> `1..8` (passed once)
- `04_reset_claim_guards.test.sql` -> `1..10` (passed once; needs migration 6, which is applied)
- (`01_members_roles.test.sql` -> `1..12`)
All lines should be `ok`.

Only AFTER the last test run:
```sql
drop schema tests cascade;
drop extension if exists pgtap;
```
Then confirm no test data (run `supabase/manual/wipe_test_data.sql` first if you used the seed):
```sql
select count(*) from ballots;     -- 0 (or only your real/dry-run ballot)
select count(*) from auth.users;  -- only real people (Rickey, Kadin, plus real signups); no test@/example addresses
select count(*) from votes;       -- 0 before the real ballot opens
select count(*) from seasons where results_released_at is not null;  -- 0 before the ceremony
```

## 5. Secrets hygiene

1. The Supabase DB password and secret key were pasted in a chat. Rotate both: Project Settings -> Database -> Reset database password; Project Settings -> API Keys -> rotate/regenerate the secret key.
2. Confirm `client/.env` contains only `VITE_SUPABASE_URL`, `VITE_SUPABASE_API_KEY` (publishable), `VITE_SITE_URL`. `.env` is gitignored; check with `git status`.

## 6. Dry run (Rickey + Kadin, on phones)

1. Both sign up on the deployed URL (names Rickey, Kadin). Run section 3 to make you both committee.
2. Committee page -> new ballot. Two categories, closing in 30 minutes. Use bulk import for options in one category. Make one category type `preset` and one `group`. Publish.
   - Times are entered in your local time and stored as UTC.
3. Both vote. Check:
   - Your own name is absent from the options in your own ballot.
   - Add an option (write-in) works.
   - Group pick works.
   - Change a vote, and the new choice sticks after reload.
4. Committee page: check the completion panel shows both voted. Close the ballot early. Try to vote again: it must fail.
5. Export CSV. Copy it into the oscars repo's csv folder and point the script at it:
   ```
   cp ~/Downloads/<export>.csv ~/repos/jsc-oscars/<csv folder>/
   cd ~/repos/jsc-oscars && ./venv/bin/python oscars.py
   ```
   (Edit the script's input filename if it is hard-coded.) Confirm it runs and the winners look right.
6. Release, results and stats (use a throwaway season state; undo in step 8): Record results for each category, resolve ties, use `Fill in podium places` if shown, then Profile -> Release results (checklist green, `Hold to release` for 3 s). As a member check the Results page (podiums, no vote counts) and the Stats page. Releasing marks the real season released: undo by running `supabase/manual/wipe_test_data.sql` (preferred) or, by hand, `update seasons set results_released_at = null where name = 'JSC Oscars Fall 2026'; update ballots set status = 'closed' where status = 'released' and season_id = (select id from public.seasons order by ceremony_at desc nulls last limit 1);`.
7. Tie test: make a 2-2 tie style result (or edit votes via a second test ballot). On the committee tally view create a tiebreak round, vote in it, close it, record the winner. Also try the manual pick.
8. Cleanup: Supabase -> Table Editor -> `ballots` -> delete the test ballot (cascades). Delete any non-[TEST] practice ballot you created by hand (look at `select id, name, status from public.ballots;`). Verify:
   ```sql
   select count(*) from votes;  -- 0
   select count(*) from ballots; -- 0
   select count(*) from seasons where results_released_at is not null; -- 0
   ```
   Keep the two real accounts.

## 7. Real launch

- [ ] Mon Nov 23: announce in the group chat with the site URL and "sign up with your own name".
- [ ] Confirm all 14 have accounts (`select m.name, p.user_id is not null ...` or the committee completion panel).
- [ ] Nov 25-26: publish the real ballot, closing time set deliberately (entered in local time, stored UTC; double check on the ballot page).
- [ ] Re-run section 4 counts (no leftover test votes) just before publishing.
- [ ] Run supabase/manual/wipe_test_data.sql if you ever ran the test seed (see docs/TESTING.md)
- [ ] Committee recovery (forgot password, wrong name, or a pranked claim): in the app, Member names -> Reset that member (frees the name, removes their votes; you cannot reset yourself). Then delete their login in Supabase Dashboard -> Authentication -> Users, and ask them to sign up again.
- [ ] Ceremony flow: close the ballot -> Record results -> tiebreak / committee round / manual pick for ties -> if any category was recorded before the places migration, main ballot -> `Fill in podium places` -> Profile -> Release results (checklist, `Hold to release` 3 s) -> members open Results. Also Export CSV and run oscars.py.
- Release went wrong: `Not ready` errors list the reason; fix it and retry. A half-done release (ballots `released` but season not) is safe; retrying finishes it. Undoing a real release is SQL only (`update seasons set results_released_at = null where name = 'JSC Oscars Fall 2026';`) and members may already have seen winners.

## 8. Limitations and troubleshooting

- **Keep-alive:** `.github/workflows/keepalive.yml` pings Supabase twice a day (auth health + one read-only RPC) and fails loudly on any non-2xx. You MUST add two GitHub repo secrets (Settings -> Secrets and variables -> Actions -> New repository secret): `SUPABASE_URL` (`https://fsuczxowirmsxtmzzsys.supabase.co`) and `SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_...` key; never the secret key). Then Actions -> keepalive -> Run workflow once to confirm it is green. GitHub disables scheduled workflows after 60 days without repo activity, and a paused project must still be restored by hand from the dashboard. A failed run emails the repo owner.
- Supabase free projects pause after about a week of inactivity. Check the project is Active in the dashboard the day before voting week, and open the app yourself first. Restore from the dashboard if paused.
- With confirmation OFF, signup needs no email. Reset emails only work with custom SMTP (section 2); otherwise use the recovery procedure in section 7.
- Known limitations / fix before the ceremony (acceptable for 14 friends):
  - `profiles.email` is readable by every signed-in member through the API (column grant). Plan: `revoke select (email) on public.profiles from authenticated;` and change `client/src/context/UserContenxt.tsx` `select('*')` to explicit columns.
  - `nominees.created_by` (who added a write-in) is readable by signed-in members before release.
  - Round lineage is not constrained in the DB (tiebreak/committee parent and round combinations).
  - `ballot_is_open` uses `now()` (transaction time); `clock_timestamp()` would be stricter.
  - Release is client-side in several writes; a `release_season` RPC would make it atomic.
  - `results.decided_ballot_id` is `on delete cascade`; should be `restrict` so deleting a round cannot erase results.
  - Missing partial unique index on `(parent_ballot_id, round)` to stop duplicate rounds.
- Blank page / "Invalid API key": env vars wrong or not redeployed. Check Vercel env vars and redeploy.
- Confirmation/reset link goes to localhost or errors: Site URL / Redirect URLs (section 2) or `VITE_SITE_URL` are wrong.
- Stale UI after a deploy on an installed app: the old service worker is waiting. Close and reopen the app (or leave the vote page). DevTools -> Application -> Service Workers -> Unregister clears it.
- 404 on refresh of a deep link: `client/vercel.json` missing from the deployed Root Directory.
- Fallback if the app is down: collect votes another way and hand-write a CSV in the format oscars.py expects (the exported CSV is the reference).
- Vercel logs: Project -> Deployments -> build logs. Supabase: Logs & Analytics.
