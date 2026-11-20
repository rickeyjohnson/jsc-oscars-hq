# Deploy and launch checklist (JSC Oscars)

Supabase project: `fsuczxowirmsxtmzzsys` (migrations already applied). Never paste secrets into chat, the repo, or `client/.env.example`.

## 1. Vercel

1. vercel.com -> Add New -> Project -> import the GitHub repo.
2. Root Directory = `client`. Framework Preset = Vite. Build command `npm run build`. Output directory `dist`.
   - `npm run build` is `tsc -b && vite build`, so type errors fail the deploy. `client/tsconfig.app.json` excludes your unfinished `src/components/IndividualDetailsModal.tsx` so it cannot break the build.
   - `client/vercel.json` adds an SPA fallback rewrite so deep links like `/app/ballots` work. Vercel serves real files (`/assets/*`, `/favicon`) before applying rewrites, so static assets are not affected.
3. Environment variables (Production + Preview):
   - `VITE_SUPABASE_URL` = `https://fsuczxowirmsxtmzzsys.supabase.co`
   - `VITE_SUPABASE_API_KEY` = the **publishable** key (`sb_publishable_...`). Not the secret key.
   - `VITE_SITE_URL` = leave blank for the first deploy.
4. Deploy. Note the URL, e.g. `https://<app>.vercel.app`.
5. Set `VITE_SITE_URL=https://<app>.vercel.app` in Vercel -> Settings -> Environment Variables, then Deployments -> Redeploy (Vite bakes env vars in at build time).
6. Check: `curl -s -o /dev/null -w "%{http_code}\n" https://<app>.vercel.app/app/ballots` returns `200`.

## 2. Supabase auth settings

Dashboard -> Authentication -> URL Configuration:
1. Site URL = `https://<app>.vercel.app`.
2. Redirect URLs: add `https://<app>.vercel.app/**`; keep `http://localhost:5173/**` for dev.

Dashboard -> Authentication -> Providers -> Email: turn OFF "Confirm email". Decision: Confirm email = OFF for launch.
- Signup logs the user in immediately (no email, no rate limit problem) and the app goes straight to `/app`, where the profile photo setup appears.
- Anyone could sign up with a typo or someone else's address; the member-name dropdown still limits who can claim a name.
- Password reset still sends an email (links to `/login/reset`) and Supabase's built-in sender is heavily rate limited (a few emails per hour). The committee should be ready to reset a claim (delete the user / unlink the member in the dashboard) or help someone who forgets their password.
- Optional later upgrade: custom SMTP (Resend, Postmark, etc.; Authentication -> SMTP Settings), which also allows turning confirmation back on. The client handles both modes.

## 3. Create the committee

1. Rickey and Kadin each sign up in the deployed app, choosing "Rickey" and "Kadin" from the name dropdown .
2. Supabase -> SQL Editor, run the contents of `supabase/manual/set_committee.sql`. It sets `is_committee = true` for exactly the accounts linked to members named Rickey and Kadin, and false for everyone else.
3. Verify:
   ```sql
   select m.name, p.is_committee from members m join profiles p on p.user_id = m.user_id order by m.name;
   ```
   Only Rickey and Kadin should be `true`. Sign out and in again so the app picks it up.

## 4. Database cleanup (MUST happen before voting opens)

After the last DB test run:
```sql
drop schema tests cascade;
drop extension if exists pgtap;
```
Then confirm no test data:
```sql
select count(*) from ballots;     -- 0 (or only your real/dry-run ballot)
select count(*) from auth.users;  -- only real people (Rickey, Kadin, plus real signups); no test@/example addresses
select count(*) from votes;       -- 0 before the real ballot opens
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
6. Tie test: make a 2-2 tie style result (or edit votes via a second test ballot). On the committee tally view create a tiebreak round, vote in it, close it, record the winner. Also try the manual pick.
7. Cleanup: Supabase -> Table Editor -> `ballots` -> delete the test ballot (cascades). Verify:
   ```sql
   select count(*) from votes;  -- 0
   select count(*) from ballots; -- 0
   ```
   Keep the two real accounts.

## 7. Real launch

- [ ] Mon Nov 23: announce in the group chat with the site URL and "sign up with your own name".
- [ ] Confirm all 14 have accounts (`select m.name, p.user_id is not null ...` or the committee completion panel).
- [ ] Nov 25-26: publish the real ballot, closing time set deliberately (entered in local time, stored UTC; double check on the ballot page).
- [ ] Re-run section 4 counts (no leftover test votes) just before publishing.
- [ ] Tell everyone how to reset a password (`/login`, "forgot password").
- [ ] When closed: tally, resolve ties, Export CSV, run oscars.py.

## 8. Limitations and troubleshooting

- Supabase free projects pause after about a week of inactivity. Check the project is Active in the dashboard the day before voting week, and open the app yourself first. Restore from the dashboard if paused.
- Email rate limits (section 2) are the likeliest signup problem. Symptom: "email rate limit exceeded". Fix: SMTP or confirmation off.
- Blank page / "Invalid API key": env vars wrong or not redeployed. Check Vercel env vars and redeploy.
- Confirmation/reset link goes to localhost or errors: Site URL / Redirect URLs (section 2) or `VITE_SITE_URL` are wrong.
- 404 on refresh of a deep link: `client/vercel.json` missing from the deployed Root Directory.
- Fallback if the app is down: collect votes another way and hand-write a CSV in the format oscars.py expects (the exported CSV is the reference).
- Vercel logs: Project -> Deployments -> build logs. Supabase: Logs & Analytics.
