# Manual browser testing (JSC Oscars)

> **WARNING: These test accounts claim ALL 14 real member names. Run `supabase/manual/wipe_test_data.sql` before inviting real members (before Mon Nov 23 announcements) and re-check section 4 counts in DEPLOY.md.**

## Setup
1. Supabase dashboard -> SQL editor -> paste and run `supabase/manual/seed_test_data.sql` (as postgres). It is one transaction; it refuses to run if test data already exists. The NOTICE output lists the emails and counts.
2. Start the client: use the `jsc-client` launch config (`.claude/launch.json`) or `npm --prefix client run dev -- --port 5173 --strictPort`, then open http://localhost:5173.
3. Undo everything: run `supabase/manual/wipe_test_data.sql` (idempotent; the final select should show 0 test users, 0 test ballots, 14 unclaimed members if no real signups).

## Accounts
Password for all: `jsc-test-2026` (throwaway). Email pattern: `test.<name>@jsc-test.local` (spaces become dots).
- Committee: `test.rickey@jsc-test.local`, `test.kadin@jsc-test.local`
- Members: e.g. `test.micah@jsc-test.local`, `test.john.sampson@jsc-test.local`

Two users at once: use a private window or a second browser profile. Same-origin windows share localStorage, so a second normal tab signs you in as the same user.

## Seeded data
- `[TEST] Main Ballot` (open, closes in 3 days): Best Dressed (everyone), Best Locs (subset), Best Snack (preset, no add), Best Car (preset, add allowed), Best Duo (group), Funniest (everyone). About 10 members have voted: some with 0 votes, some partial, some complete.
- `[TEST] Tie Practice` (closed, no results recorded): Clear Winner, Two-Way Tie, Three-Way Tie, No Votes.

## Checklist
- [ ] Vote page: each of the 5 modes renders; you never see yourself as a nominee-vote option you can pick (self-vote blocked).
- [ ] Best Car: add a new option; Best Duo: add a group (2+ members); Best Snack: no add control.
- [ ] Change a vote, clear a vote, vote on a partially completed ballot as a member with 0 votes.
- [ ] Committee completion panel shows who has/has not voted (varied completeness).
- [ ] Close now on the main ballot; members can no longer vote.
- [ ] CSV export of the main ballot.
- [ ] Tally on the Tie Practice ballot: Clear Winner has one winner; Two-Way Tie and Three-Way Tie show ties; No Votes shows nothing to tally.
- [ ] Record results: accept the clear winner; start a tiebreak round for the 2-way tie and the 3-way tie, vote in it as members, then the committee round if still tied; pick the No Votes category manually.
