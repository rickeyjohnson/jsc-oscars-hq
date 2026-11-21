# Pre-publish checklist (before anything beyond the friends group)

Friends-only hosting at the Vercel URL is the current plan. Do this list before the site is public, indexed, or linked widely. For the Nov 25-26 ballot itself, items 2 to 6 are still required.

## 1. Font licensing (decision for the owner, not engineering)
Confirm before public hosting:
- **Century Gothic** is a Monotype commercial typeface (see `client/public/fonts/CenturyGothic/COPYRIGHT.txt`). Serving it to browsers as a web font needs a webfont (self-host or hosted) license from Monotype or a reseller; a desktop license usually does not cover it. Confirm: whose license covers the files in the repo (`centurygothic.ttf`, `centurygothic_bold.ttf`, the Paneuropean woff2 files), whether web embedding is allowed, page-view limits, and whether the PWA icons (raster images of the wordmark) are fine.
- **Bellaboo**: license unknown, and the file has not been supplied. Do not add it until the license allows web embedding. When confirmed, put it at `client/public/fonts/Bellaboo/Bellaboo.woff2`, uncomment the `@font-face` slot in `client/src/index.css`, and check the gallery Type section.
- **Fallback stack we ship** (works with no custom font): `"CG", "Century Gothic", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (`--font-sans`); display `"Bellaboo", "CG", "Century Gothic", system-ui, sans-serif`. If licensing blocks, remove the `@font-face` blocks and the two `<link rel="preload">` lines in `client/index.html`; the system stack renders. Optional OFL lookalikes: Questrial or Jost for Century Gothic (only `index.css` `@font-face` + preloads change); Bellaboo TBD. Re-run `node client/scripts/render-icons.mjs` after changing the font, or the icons keep the old face.

## 2. Rotate secrets
- The DB password and secret key were pasted in a chat. Supabase -> Project Settings -> Database -> Reset database password; Project Settings -> API Keys -> rotate the secret key.
- Confirm `client/.env` has only the publishable key (`git status` clean of `.env`). Rotate the Google OAuth secret too if it was ever shared.

## 3. Test data
- Run `supabase/manual/wipe_test_data.sql` (idempotent). Final select: `test_users` 0, `test_ballots` 0, `test_results` 0, `released_seasons` 0.
- Remove leftover test/practice ballots: `select id, name, status from public.ballots;` and delete any `[TEST]` or practice ballot.
- Counts from DEPLOY.md section 4 (`votes`, `ballots`, released seasons all 0 before the real ballot opens).

## 4. Drop the tests schema
After the last DB test run:
```sql
drop schema tests cascade;
drop extension if exists pgtap;
```

## 5. Set the committee
Run `supabase/manual/set_committee.sql` after Rickey and Kadin have signed up; verify only those two are `is_committee = true` (query in DEPLOY.md section 3). Sign out and in again.

## 6. Final checks
- [ ] Supabase Site URL and Redirect URLs point at the production domain; `VITE_SITE_URL` set and redeployed.
- [ ] `grep -rl "Design gallery" client/dist` prints nothing.
- [ ] `og:image` made absolute for the production domain (AUDIT.md item 15).
- [ ] Known limitations in DEPLOY.md section 8 reviewed (`profiles.email` exposure matters more once the audience is not friends).
- [ ] Supabase project is Active (free projects pause after about a week idle).
