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

## Manual QA checklist for Nov 25-26 (real ballot)

Run on BOTH a phone (iPhone Safari, installed to the Home Screen, plus Android Chrome if available) and a desktop browser at 1280 and 1440 wide. Tick each item per device where it matters. Use real accounts (not the test seed). Do this after `docs/PRE-PUBLISH.md` is complete.

### Sign up, claim, log in
- [ ] Create account with email + password; the name list shows only unclaimed names; claiming works and lands on `/app` (phone + desktop).
- [ ] A claimed name no longer appears for the next person. "No names left" shows the committee hint.
- [ ] Log out, Log in again; wrong password shows a plain error.
- [ ] Google login (only if `VITE_GOOGLE_LOGIN=true`): new Google user lands on `/claim`; returning user lands on `/app`; Back from Google leaves the button usable.
- [ ] Reset password: expected to NOT email friends without custom SMTP; committee reset (DEPLOY.md section 7) works.
- [ ] Profile photo setup sheet: skip, and upload (image under 5 MB).

### Vote (as a member)
- [ ] Ballots tab lists the open ballot with the right closing time in LOCAL time.
- [ ] Tap a nominee: vote saves instantly, dash strip fills, reload keeps it.
- [ ] Group category: pick a group, add a group (2+ names), your own name is not selectable.
- [ ] Write-in on a category that allows it; none where it does not.
- [ ] Change a vote; clear a vote.
- [ ] Review step lists picks and flags skipped categories; "Finish voting" goes to Submit.
- [ ] Submit ballot: short press does nothing, hold completes, "Not yet, back to voting" returns; votes remain editable until close.
- [ ] Offline/slow: turn on airplane mode mid-vote: an error toast appears and no vote is silently lost; back online, vote again works.
- [ ] Installed app mid-vote is not reloaded by an update (deploy a trivial change while a vote page is open; it must stay).

### Committee
- [ ] Create a ballot (builder: categories, presets, group type, bulk import), publish, set the closing time deliberately.
- [ ] Completion panel shows who has voted; "who hasn't voted" widget on Home is committee-only.
- [ ] Close the ballot now (members can no longer vote), and let one close by time.
- [ ] Export CSV; run it through oscars.py (DEPLOY.md section 6, step 5).
- [ ] Record results per category; podium places fill (`Fill in podium places` if shown).
- [ ] Tiebreak: create the round, members vote, close it, record results. Committee round if still tied, or manual pick.
- [ ] No-votes category: manual pick.
- [ ] Release page is full page; blocked state lists reasons; hold 3 s releases; letting go early cancels.
- [ ] Member names page: reset a member (and delete their Auth user) frees the name.

### Results (as a member, after release)
- [ ] Before release: only the sealed placeholder; no vote counts anywhere (Results, Leaderboard, You, Home widgets).
- [ ] After release: envelope cards open ("Open all"), podiums with `tied` tags, no counts, same order after reload; Leaderboard segment and the You card are right.
- [ ] Home widgets switch from the envelope teaser to latest winners and leaderboard peek.

### Cross-cutting
- [ ] Phone: safe areas, tab bar hides under the keyboard, no horizontal scroll, text readable at 200%.
- [ ] Desktop: sidebar nav, centered columns, sheets as dialogs, Tab order, Esc closes sheets.
- [ ] Settings -> Reduce motion works; OS Reduce Motion also removes the tab transition.
- [ ] Document title changes per screen.
- [ ] Add to Home Screen: dark launch, standalone, opens `/app`.

## Design review (dev only)
`npm --prefix client run dev` then `/dev/design` (never shipped: `grep -rl "Design gallery" client/dist` must print nothing). Use `?section=` to jump to a section and the reduce-motion toggle to check cross-fades. Check at 375x812, 1280x800 and 1440x900. Check fonts in DevTools -> Network -> Font: Century Gothic 300/400/700 load, no faux bold.
