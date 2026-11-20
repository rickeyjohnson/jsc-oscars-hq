# JSC Oscars HQ: Voting Loop (v1) Design

Date: 2026-11-19. Status: draft for approval. Next step after approval: implementation plan.

## Intent and why

JSC Oscars is a semesterly awards night for a friend group (~13 members). Two people, Rickey and Kadin (the "committee"), plan it, pick categories, run the vote and keep stats. Today that takes Google Forms, a hand-run Python script (`oscars.py`, `oscars_stats.py`, which read a CSV) and manual slideshow building. Committee time goes into manual form creation and hand tallying.

v1 replaces the middle of that pipeline: **publish a ballot, members vote, the app tallies, handles ties and exports results.** The app should eventually be the premier place for everything around the event (nominations, stats, to-dos, photos, who's coming), but this spec covers only the voting loop.

**Hard deadline:** Ceremony Fri 2026-12-04 at ~3 pm (time not guaranteed). Announcements go out Mon 2026-11-23. Voting runs over Thanksgiving weekend (Nov 26-29), 5-7 days, so the ballot must be live by about Nov 25-26. Tally and tiebreaker happen ~Dec 2-3.

## Goals

1. Committee builds and publishes a ballot (30-40 categories, nominees per category) in the app.
2. Every signed-in member votes once per category, within the open window. Members cannot vote for themselves.
3. The app computes rankings, nominees, ties, the single tiebreaker round and the winner automatically, following the rules below.
4. Committee sees a results view and can export a CSV in the same shape the existing scripts read (safety net).
5. Remove the admin-by-name security hole and protect all data with RLS.
6. Home screen shows a real countdown and the open ballot, with fake and "Coming Soon" content removed.

## Non-goals (v1)

- Live voting at the ceremony.
- Photo submissions, MYOC (make-your-own-category) collection and member nominations. These stay on Google Forms this semester.
- Slideshow generation, to-do lists, reminders and notifications, "who's coming", leaderboards across seasons, and importing past CSVs. These are for later specs.
- Redesigning the look. The current dark zinc and cream (`#fffadd`) style, Poppins and WindSong fonts, and rounded cards stay. Reorganizing folders and screens is after Dec 4.

## Anti-goals (a failure even if it technically works)

- Anyone but Rickey and Kadin can see results early or get committee powers.
- A vote can be cast outside the window, twice for one category, or for oneself.
- Winners visible to members before the committee releases them (the reveal happens at the ceremony).
- The app being the only way to get results. The CSV export must always work.

## Rules (from the existing scripts and the committee)

- One vote per voter per category. Skipping a category is allowed.
- Per category, rank nominees by vote count. Ties share a rank, and the next rank skips (competition ranking: rank = 1 + number of nominees with strictly more votes).
- **Nominees = everyone ranked 1-3**, ties included. Nouns and outsiders count the same as people.
- If first place is tied, run **one** tiebreaker poll. Only the nominees tied for first are on it, and they become the category's only nominees.
- If the tiebreaker still has no single winner, the **committee votes** between the tied nominees.
- If the committee ties, the committee picks manually (records the winner by hand).
- A category has exactly one recorded winner. Wins and nominations are counted per nominee from recorded results, not from raw counts.

## Constraints

- Backend is Supabase (Postgres, Auth, Storage, RLS). There is no custom server. The unused `server/` Express stub is ignored.
- The existing client is Vite, React 19, TypeScript, Tailwind v4 and react-router; build on it.
- Existing tables `profiles` and `oscarsEvents` exist only in the Supabase dashboard (no SQL in the repo). Their real schema is unverified.
- ~13 users on phones, with some on laptops.
- Specs are written in Opus. Implementation is done in Sonnet, one small task at a time.

## Approaches considered

- **A. Voting loop only, on the current schema.** Fastest, but likely needs a schema rewrite after Dec 4.
- **B. Restructure the whole app first.** Cleanest, but cannot finish before Dec 4.
- **C. Voting loop now with the full-pipeline data model (chosen).** Same scope as A, but the database is shaped for later phases (seasons, nominee types, rounds). UI restructure follows after Dec 4. CSV export is the fallback.

Chosen: **C**, by the committee.

## Design

### Roles and security

- `profiles.is_committee` becomes the only source of admin rights. Clients cannot write it. It is set by SQL for Rickey and Kadin by user id. The name-based check in `SignupPage.tsx` and the `is_committee` signup metadata are removed.
- RLS on every table. Members read ballots, categories and nominees that are published. Members read and write only their own votes. Committee reads everything and writes everything it owns. Votes can only be inserted or changed while the ballot is open (`opens_at <= now() < closes_at`), enforced in the database, not the client.
- Self-vote rule enforced in the database: a vote is rejected if the voter's user id is among the nominee's linked user ids.
- Routes: all `/app/*` routes sit behind auth, and committee screens (including `/app/profile/ballots/create`) behind a role check. Both are UX only. RLS is the actual protection.

### Data model (SQL migrations committed to the repo)

- `seasons` (reuse or replace `oscarsEvents`): name, ceremony date and location.
- `ballots`: season, name, opens_at, closes_at, status (`draft | open | closed | released`), `round` (`main | tiebreak | committee`).
- `categories`: ballot, name, description, order.
- `nominees`: category, display_name, secondary_text, type (`person | group | outsider | noun`), linked `user_ids` (empty for outsiders and nouns).
- `votes`: ballot, category, nominee, voter (unique per ballot, category and voter).
- `results`: category, winner nominee, nominee list, decided_by (`votes | tiebreak | committee_vote | manual`).
- Tally logic as a Postgres function or view that returns per-category ranks, nominees, and tie state for a ballot.

### Screens

- **Committee:** build ballot (existing `CreateBallotTemplate`, wired to save and publish, split into smaller files), manage ballots (open or close), view voter completion ("who hasn't voted"), view results and tie state, create the tiebreaker or committee round with one click, release results, export CSV.
- **Member:** Home (real countdown and open ballot card), Ballots list, vote page (one card per category, save as you go, editable until close), Results (only after release).
- Existing bottom tabs and profile flow stay.

### CSV export

Columns: `Timestamp`, `Name`, then one column per category in ballot order. Each cell is the chosen nominee's display name (blank if skipped). Output must be readable by the existing `oscars.py` and `oscars_stats.py` unchanged.

## Decided by the committee

- Approach C. Supabase backend. Live voting is dropped. Look and feel stays as-is.
- Photos and MYOC stay on Google Forms this semester.
- Voting is open to every member including the committee. Ties and the tiebreaker follow the rules above.
- **Members and signup:** 14 members, identified by name from a preset list (Rico is the newest). Signup is restricted to that list so strangers cannot join.
- **Hosting:** Vercel on a `vercel.app` URL, possibly a purchased custom domain later.
- **Ballot input:** bulk import (a text area or file) for categories with names and descriptions. By default every member is a nominee.
- **Nominee modes per category:**
  - Everyone (default).
  - A subset of members only (for example, "Best Locs" lists only members with locs).
  - A fixed preset list for objects and non-members, with an option for members to add more.
  - Group categories, where the voter multi-picks members.
- **Committee visibility:** the committee sees every voter's choices and the results.
- **Confirmed calls:** the committee round, rounds as linked ballots, nominations rule, release, CSV and closing calls below were all confirmed.

## Confirmed calls

- Winners and nominee lists are hidden from members until the committee releases them for the whole season, so the reveal can happen at the ceremony. Members then see winners and nominees; vote counts stay committee-only.
- Members can change their votes until the ballot closes. The committee can close a ballot early. Times are stored in UTC and shown in local time.
- Members see only their own votes. The committee sees every voter's choices (as the CSV does today).
- Each round (main, tiebreak, committee) is its own `ballots` row linked to its parent by `parent_ballot_id`. A tiebreaker contains only the tied categories and reuses the same nominee rows. The final winner is the latest round that decided the category.
- When first place is tied, only the tied nominees count as that category's nominations. The original top-3 list is still stored for reference.
- Committee round: only the two committee members vote, and the self-vote rule applies. A 1-1 tie, or both committee members being tied nominees, goes straight to a manual pick.
- Winner and nomination stats are computed from `results`, not stored separately.
- CSV: the Timestamp is each voter's last edit, there is one row per voter who voted at all, and each tiebreaker round exports its own file.

## Identity and signup

- A preset list of the 14 member names. At signup a person picks their name from the list. A name can be claimed once, and the committee can reset a claim.
- Self-vote blocking uses the claimed name's account, linked to each person nominee.
- Group nominees (a set of members) block the vote if the voter is in the group.

## Bulk import

- The committee pastes or uploads a list, one category per line (`name | description`, or CSV with a name and description column). The builder decides the exact format.
- Imported categories default to "everyone". The committee then sets a nominee mode per category (subset, preset list, group).

## Later (not v1)

- **Offline and sleeping database.** Supabase pauses a free database after inactivity. Later, cache key data per user in the browser (localStorage or similar) so nominations, stats and history stay available offline. This is a future problem, not part of v1, but the v1 data fetching should keep it possible.

## Group categories

- A vote in a group category is a vote for one group. Groups compete against each other, and they are typically the same size. Ranking, top 3, ties and tiebreakers work exactly as for individual nominees, with each group as one nominee.
- For stats, each member of a nominated group gets one nomination, and a member who appears in several nominated groups in the same category still gets only one nomination for that category.
- My call: members of the winning group each get one win, with the same one-per-category cap.

## Member list (preset, 14)

Anthony, Dakarai, Demichael, Micah, Rico, Nick, Rickey, Kadin, Langston, Jonathan, John Sampson, Evan, TJ, Justin.

Rickey and Kadin are the committee.

## Left to the builder

- Exact table and column names, and whether to reuse or replace `oscarsEvents` once its real schema is dumped.
- Whether the tally is a view, an RPC function or a materialized view.
- File structure for splitting `CreateBallotTemplate.tsx`, and component and test layout.
- Handling mixed-case or duplicate nominee names on import, and any seed or test data.
- Migration tooling (Supabase CLI vs dashboard SQL), as long as the SQL ends up in the repo.

## Open dependencies

- Access to the Supabase project (to dump the current schema and apply migrations).
- Production site URL (Vercel), to replace the hardcoded `http://localhost:5173` in the signup email redirect.
- A dry run with Rickey and Kadin (two test accounts) before voting opens.
