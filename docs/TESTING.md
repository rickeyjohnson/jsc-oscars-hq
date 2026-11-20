# Manual browser testing (JSC Oscars)

> **WARNING: These test accounts claim ALL 14 real member names. Run `supabase/manual/wipe_test_data.sql` before inviting real members (before Mon Nov 23 announcements) and re-check section 4 counts in DEPLOY.md.**

## Setup
1. Supabase dashboard -> SQL editor -> paste and run `supabase/manual/seed_test_data.sql` (as postgres). It is one transaction; it refuses to run if test data already exists. The NOTICE output lists the emails and counts.
2. Start the client: use the `jsc-client` launch config (`.claude/launch.json`) or `npm --prefix client run dev -- --port 5173 --strictPort`, then open http://localhost:5173.
3. Undo everything: run `supabase/manual/wipe_test_data.sql` (idempotent). It also removes test results/places and un-releases a practice release (only when the season has no real non-draft ballot). The final select should show `test_users` 0, `test_ballots` 0, `test_results` 0, `released_seasons` 0, `unclaimed_members` 14 if no real signups.

## Accounts
Password for all: `jsc-test-2026` (throwaway). Email pattern: `test.<name>@jsc-test.local` (spaces become dots).
- Committee: `test.rickey@jsc-test.local`, `test.kadin@jsc-test.local`
- Members: e.g. `test.micah@jsc-test.local`, `test.john.sampson@jsc-test.local`

Two users at once: use a private window or a second browser profile. Same-origin windows share localStorage, so a second normal tab signs you in as the same user.

## Seeded data
- `[TEST] Main Ballot` (open, closes in 3 days): Best Dressed (everyone), Best Locs (subset), Best Snack (preset, no add), Best Car (preset, add allowed), Best Duo (group), Funniest (everyone). About 10 members have voted: some with 0 votes, some partial, some complete.
- `[TEST] Tie Practice` (closed, no results recorded): Clear Winner, Two-Way Tie, Three-Way Tie, No Votes.

## Practice release warning
The `[TEST]` ballots live in the REAL season `JSC Oscars Fall 2026`. A practice release therefore marks the REAL season as released (`seasons.results_released_at`) until `wipe_test_data.sql` runs. Run the wipe BEFORE announcing to friends (before Mon Nov 23) and re-check the DEPLOY.md section 4 counts.

## Click-through checklist
Open two windows (private window or second browser profile): committee = `test.rickey@jsc-test.local`, member = `test.micah@jsc-test.local`.

### Voting (`[TEST] Main Ballot`)
- [ ] Vote page (list layout with the dash strip): each of the 5 nominee modes renders (everyone, subset, preset no-add, preset add, group).
- [ ] Add option on Best Car; add a group (2+ members) on Best Duo; Best Snack has no add control.
- [ ] Group pick works. Your own name is absent from the options you can pick.
- [ ] Change a vote, clear a vote; vote as a member with 0 votes (partial ballot is fine).
- [ ] Completion panel (committee) shows varied voted / not voted.
- [ ] Close now (committee): members can no longer vote.
- [ ] Export CSV; run it through oscars.py as in DEPLOY.md section 6, step 5.

### Tally and results (`[TEST] Tie Practice`, committee)
- [ ] Clear Winner: Record results; podium A1/A2/A3.
- [ ] Two-Way Tie: create the tiebreak round, vote as members, close it, Record results (tie is broken).
- [ ] Three-Way Tie: create the tiebreak round; if still tied, committee round (when applicable) and vote as Rickey and Kadin, or manual pick.
- [ ] No Votes (empty category): manual pick.
- [ ] `Fill in podium places` appears for categories recorded without places; clicking it fills them.
- [ ] `[TEST] Main Ballot`: Close now, Record results, resolve its ties by manual pick (release needs every main ballot closed and every category decided).

### Release (committee)
- [ ] Release page is full page. Blocked state lists the reasons (open ballot, undecided category, missing places).
- [ ] Short press and scroll on `Hold to release` do nothing.
- [ ] Hold 3 s and let go early: it cancels. Hold the full 3 s: release succeeds (envelope state).

### Member views (as `test.micah`)
- [ ] Before release, Results shows only the placeholder; Stats is hidden.
- [ ] After release, Results shows podiums with `tied` tags, ALSO PLACED below, `Winner decided by tiebreak` where relevant, and NO vote counts; same order after reload.
- [ ] Stats: podium leaderboard, plus a You card with the categories you won.

### Member names and profile (committee)
- [ ] Member names: Reset a test member. Also delete that member's Supabase Auth user in Dashboard -> Authentication -> Users (reset frees the name and removes votes, not the login). Resetting your own name is blocked. Re-run the seed after a wipe if needed.
- [ ] Profile page: edit and photo upload work.

### Undo (mandatory before real voting)
- [ ] Run `supabase/manual/wipe_test_data.sql`; confirm `released_seasons = 0` and `test_results = 0`, then DEPLOY.md section 4 counts.
