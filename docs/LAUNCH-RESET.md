# Launch reset

`supabase/manual/launch_reset.sql` puts the app in a clean "first login" state. It is irreversible once committed.

## When to run it
1. Kadin test (committee dry run, `docs/PREFLIGHT.md` sections 9 and 10).
2. Everyone test (all members try sign-up and voting on a practice ballot).
3. Run this reset **right before the announcements**. Never after real members have signed up for real: it deletes every account.

## What it deletes
- Every `auth.users` row, and by cascade `auth.identities`, `auth.sessions`, `auth.refresh_tokens`, `auth.one_time_tokens`, MFA rows.
- `public.profiles`, `votes`, `results`, `round_nominees`, `nominees`, `categories`, `ballots` (including tiebreak and committee rounds), `myoc_ideas`, `myoc_windows`.
- All `public.seasons` and all legacy `public."oscarsEvents"` rows (the old Oscar event).

## What it keeps
- The 14 `public.members` rows (names), reset to unclaimed (`user_id` null, `claimed_at` null).
- All of `public.past_stats` (asserted unchanged inside the script).
- Schema, functions, triggers, RLS policies, migrations, storage buckets.

It then creates one season, `JSC Oscars Fall 2026`, ceremony 2026-12-04 15:00 America/New_York (20:00 UTC), location null, results not released, so Home shows a countdown.

## Safeguards
- The whole reset is one `DO` block, so it is a single atomic transaction.
- Guard: aborts unless `public.members` holds exactly the 14 expected names (wrong project check).
- Dry run by default: `v_commit` is `false`, so the block does everything, asserts, then raises an error that rolls it back and reports counts. Change that one line to `true` to commit.
- Post-conditions are asserted (0 users, 0 ballots, 1 season, 14 unclaimed members, past_stats count unchanged) and any failure rolls back.

## Steps
1. **Backup first.** Dashboard -> Database -> Backups (restore points; on the free plan there are none, so export yourself):
   `pg_dump "<connection string from Dashboard -> Connect>" --schema=public --schema=auth --data-only -f jsc-backup.sql`
   (or `supabase db dump --data-only` for the same). Keep the file.
2. SQL editor: run PART 1 (counts) alone, read it. Note the `past_stats` number.
3. Run PART 2 as is (dry run). It must fail with "DRY RUN OK, ROLLED BACK". Any other error means stop and read it.
4. Change `v_commit` to `true`, run PART 2 again, then run PART 3 and compare with the expected values in its comments.
5. Empty the `profile-pics` bucket in the dashboard (Storage -> profile-pics -> select all -> Delete). SQL cannot do this: Supabase blocks direct deletes on `storage.objects`.
6. Follow the post-run checklist at the bottom of the SQL file (Rickey and Kadin sign up, run `supabase/manual/set_committee.sql`, keepalive, check the countdown).

## What you cannot undo
- Deleted accounts, passwords, votes, ballots, results, ideas, and avatar files are gone. Only your backup can bring the rows back (restoring `auth.users` rows does not restore passwords reliably across projects; treat everyone as needing to sign up again).
- Members will need to sign up again. Old emails can be reused, since the users are deleted.
- Avatar files deleted from the bucket are not recoverable without a storage backup.
