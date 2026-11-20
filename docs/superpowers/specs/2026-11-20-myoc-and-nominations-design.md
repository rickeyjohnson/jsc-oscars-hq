# JSC Oscars HQ: MYOC (Category Suggestions) and Nominations Design

Date: 2026-11-20. Status: draft for approval. Builds on the approved voting-loop spec (`2026-11-19-voting-loop-design.md`). Next step after approval: implementation plan.

## Intent and why

JSC Oscars is a semesterly awards night for 14 friends, run by the committee (Rickey and Kadin). The real season runs like this:

1. The committee drafts ~20-30 categories.
2. Photo submissions are collected per person.
3. **MYOC ("make your own category")**: the group chat sends in category ideas over 3-5 days.
4. The committee reads them and picks 30-40 categories from its own list plus the submitted ones.
5. The committee builds the ballot; voting runs 5-7 days.
6. Results come from the vote: top 3 ranks are the nominations, rank 1 wins, ties go to a tiebreaker (already built in v1).

Today steps 2 and 3 run on Google Forms and chat. The committee then copies ideas by hand into its own list. This spec moves **step 3 into the app**: a suggestion window members submit to, a committee review board, and a one-tap hand-off of chosen ideas into the existing ballot builder. The goal is to retire the MYOC Google Form.

The user also asked for "Nominations" alongside MYOC. In the current process, nominations come from the vote itself (top 3), so what extra "member nominations" would mean is **not settled**. This spec does not design it. It lists the options and makes it the top open question.

## Goals

1. The committee opens a suggestion window for a season, with a name and `opens_at`/`closes_at`, the same way it opens a ballot.
2. While the window is open, members submit category ideas (name, description, optional nominee hint), up to a per-member limit.
3. The committee reviews every idea on one board: accept, reject, merge duplicates, edit text and filter by status. It can also add its own drafted categories to the same board.
4. Accepted ideas go into the ballot builder as draft categories through the existing bulk-import path, with no retyping.
5. Window, limit and ownership rules are enforced in the database with RLS, as in v1.
6. Home shows an MYOC card with a countdown while a window is open.

## Non-goals

- Member nominations of any kind (see the top open question). Nominations stay derived from the vote.
- Photo submissions, the slideshow, to-dos and announcements. Each gets its own later spec.
- Upvoting or ranking ideas (proposed as off; see open questions).
- Notifications and reminders ("MYOC closes tonight"). The group chat stays the reminder channel.
- Editing the ballot from the review board. The builder stays the only place categories become real.

## Anti-goals (a failure even if it technically works)

- A member can see who submitted an idea (unless the committee later chooses to credit it).
- A member can submit outside the window, go over the limit, or change an idea's status.
- An accepted idea reaches a published ballot without the committee seeing it in the builder first.
- The v1 voting loop breaks or changes behaviour. MYOC tables are additive, and no v1 table or policy changes.
- The committee has to retype ideas into the builder.

## Constraints

- Supabase only (Postgres, Auth, RLS). No custom server. SQL migrations are committed under `supabase/migrations/`.
- Same stack: Vite, React 19, TypeScript, Tailwind v4, react-router. Reuse `lib/categoryImport.ts` and `BulkImportPanel`'s mapping.
- Same look: dark zinc, cream `#fffadd`, Poppins, rounded `amber-100/5` cards. The fake `components/MakeYourOwnCategories.tsx` mock ("Created by Jordan") gets replaced, not restyled.
- **UI decisions need static mocks reviewed by the user in the built-in browser before any screen is built.**
- Phones first. ~14 users, so volume is tiny (at most ~70 ideas per window).
- This must not destabilize v1 before the Dec 4 ceremony. Assumed target: the next season (spring 2027).
- Specs are written in Opus. Implementation is done in Sonnet, one small task at a time.

## Approaches considered

- **A. Dedicated `submission_windows` + `category_ideas` tables, a review board, and hand-off into the builder via the bulk-import mapping (recommended).** Clean RLS (members write only their own ideas), with no change to v1 tables. The window table can later serve photos or nominations through a `kind` column.
- **B. Reuse `ballots`/`categories`: an MYOC "ballot" whose categories members may insert.** Less new schema, but it breaks v1's simple rule that only the committee writes categories, muddles `ballot_visible` and the tally, and risks the anti-goal of breaking v1.
- **C. Minimal free-text inbox.** One table of `(author, text)`, and the committee copy-pastes into bulk import. Fastest, but it has no merge, status or hint, and it repeats today's manual copying.

Recommended: **A**.

## Design

### Roles and visibility

- **Committee** (`public.is_committee()`): manages windows, reads every idea with its author, changes status, merges, edits final text, adds its own ideas at any time with no limit, and sends accepted ideas to the builder.
- **Members** (linked in `public.members`): while a window is open, insert, edit and delete their own **pending** ideas. They always read their own ideas and their status (pending, accepted, rejected, merged).
- **Other people's ideas:** members see them **anonymously** (name, description and hint, no author) through an RPC. This helps avoid duplicates, as the chat does today. Whether members see others' ideas at all is open question 3.
- **Submitter names are committee-only.** Reasons: ideas are judged on merit, rejection isn't awkward, and nobody games ideas for credit. The committee still needs names to spot self-promotion and ask follow-ups. Crediting on the ballot ("idea by Micah") is a later, opt-in choice (open question 4).

### Data model (one new migration)

- Enums: `window_kind ('category_ideas')` (room for `photos` and `nominations` later), `window_status ('draft','open','closed')`, `idea_status ('pending','accepted','rejected','merged')`, `idea_hint ('people','group','object')`, `idea_source ('member','committee')`.
- `submission_windows`: `id`, `season_id → seasons`, `kind` (default `category_ideas`), `name`, `opens_at`, `closes_at` with `check (closes_at > opens_at)`, `status` (default `draft`), `per_member_limit int not null default 5 check (between 1 and 20)`, and `created_at`.
- `category_ideas`: `id`, `window_id → submission_windows on delete cascade`, `author_id uuid not null default auth.uid() → auth.users`, `source` (default `member`), `name text` with `check (char_length(btrim(name)) between 1 and 80)`, `description text not null default ''` with `check (char_length <= 300)`, `hint idea_hint null`, `status` (default `pending`), `merged_into_id → category_ideas null`, `final_name text null`, `final_description text null` (committee edits; the author's original text is kept), `committee_note text null` (never shown to members), `sent_to_builder_at timestamptz null`, `created_at`, `updated_at`. Indexes on `window_id`, `author_id` and `merged_into_id`. Check: `(status = 'merged') = (merged_into_id is not null)`.
- Helper `submission_window_is_open(p_window uuid)`: a security definer function with the same shape as `ballot_is_open`. It returns true when the status is `open` and `opens_at <= now() < closes_at`.

### RLS (same conventions as v1: revoke all, grant to authenticated, `(select …)` wrappers)

- `submission_windows`: select for authenticated where `status <> 'draft'` or the user is committee. Insert, update and delete for committee only.
- `category_ideas` select: `author_id = auth.uid()` or committee. Members never select the base table for other people's rows.
- Insert: committee (any window, `source = 'committee'`), **or** `author_id = auth.uid()`, `source = 'member'`, the caller is a linked member, `submission_window_is_open(window_id)`, `status = 'pending'`, and the merge and committee-only fields are null.
- Update and delete (member): own row, window open, and `status = 'pending'`. Update and delete (committee): any row.
- Guard trigger `category_ideas_guard` (modeled on `profiles_guard_committee`): for non-committee callers, it rejects changes to `status`, `merged_into_id`, `final_*`, `committee_note`, `sent_to_builder_at`, `author_id`, `source` and `window_id`. It also sets `updated_at := now()` server-side.
- Limit trigger (before insert, member rows): it takes `pg_advisory_xact_lock` on (window, author) so two quick taps can't both pass. It raises `'suggestion limit reached'` if the author's rows in that window are already `>= per_member_limit`. Deleting a pending idea frees a slot. Rejected ideas still count, so a member can't submit, get rejected, and repeat forever.
- Merge rules (trigger or RPC `merge_ideas(p_target, p_sources uuid[])`, committee only): sources and target are in the same window, the target is not itself merged, and no chains form.
- RPC `list_window_ideas(p_window)`: security definer, for authenticated users, only while the window is visible. It returns `id, name, description, hint, is_mine` for non-merged ideas with no author, using `coalesce(final_name, name)`. It does **not** expose status to members until the window closes, so "rejected" isn't broadcast.

### Committee flow

1. **Manage windows** (`/app/profile/suggestions`): a list of windows with status chips (reuse `StatusChip`), plus "New MYOC window" with the season, name, opens/closes and limit (default 5). Actions: open, close early, reopen while before `closes_at`.
2. **Review board** (`/app/profile/suggestions/:windowId`): filter chips for All, Pending, Accepted, Rejected and Merged, and a counter ("Accepted 34 · target 30-40"). Each idea card shows the name, description, hint, author and time, with actions **Accept**, **Reject**, **Merge into…** (pick another idea; that idea's card shows "+2 merged" and lists the merged texts) and **Edit** (sets `final_name`/`final_description`, with the original shown below in muted text). "+ Add our own" adds committee ideas (single or pasted with the same `name | description` format as bulk import), so the committee's ~20-30 drafts and members' ideas sit in one shortlist.
3. **Send to builder:** a sticky button "Build ballot from N accepted" opens `/app/profile/ballots/create` with the accepted ideas passed as `ImportedCategory[]` (router state). The builder runs them through the same mapping `BulkImportPanel.handleImport` uses (extracted to `lib/categoryImport.ts` as `toDraftCategories(imported, existingNames)`), so name dedupe and the skipped-duplicates notice work unchanged. Hint to mode: `people → everyone`, `group → group`, `object → preset` with `allow_member_add = true`, and none → `everyone`. Sent ideas get `sent_to_builder_at`, and the board shows "Sent" so they aren't sent twice.

### Member flow

- **Suggest page** (`/app/suggest`): shows the current open window for the current season. If none is open, it shows "MYOC isn't open" plus the next `opens_at` if one is scheduled.
- **My suggestions:** a section on the same page with the member's ideas, a status pill for each, and edit/delete while the window is open and the idea is pending. After the window closes, accepted, rejected and merged statuses show to the author only.
- **Ideas so far** (if open question 3 is yes): an anonymous list below, collapsed by default.

### Text sketches (phone width; to be turned into mocks for review)

```
Suggest                         [zinc-900, cream text]
┌ MYOC · Spring 2027 ─────────────┐
│ Closes in 2d 04h   3 of 5 used  │
│ Category name  [______________] │
│ What's it for? [______________] │
│ Who'd be nominated?             │
│ (People) (A group) (A thing)    │
│ [      Submit idea       ]      │
└─────────────────────────────────┘
My suggestions
┌ Most Likely to Miss the Flight  [Pending] ✎ 🗑 ┐
┌ Best Group Chat Lurker          [Pending] ✎ 🗑 ┐
▸ Ideas so far (23)  — anonymous, read-only

Review · MYOC Spring 2027      Accepted 34 · target 30-40
(All 61) (Pending 12) (Accepted 34) (Rejected 9) (Merged 6)
┌ Biggest Glow-Up  · people · by Evan · Tue 9:14p ┐
│ "Most improved since last semester"   +2 merged │
│ [Accept] [Reject] [Merge…] [Edit]               │
└─────────────────────────────────────────────────┘
[ + Add our own ]          [ Build ballot from 34 → ]
```

### Home

- Replace the mock `MakeYourOwnCategories` with an **MYOC card** under `Countdown` and above `PendingBallots`. It shows only while a `category_ideas` window is open or scheduled to open within 3 days. Content: the window name, the countdown to `closes_at` (reuse `Countdown`/`lib/time.ts` formatting), "3 of 5 used", and a "Suggest" button that goes to `/app/suggest`. It is hidden once the window closes. Errors show an inline "Couldn't load MYOC · Retry", as for ballots.
- On Profile, the committee section gets a "Suggestions" button next to the ballot buttons. Routes use the existing `WithAuth` and `committeeRoute(...)` wrappers (UX only; RLS is the protection).

### Security notes

- **Self-promotion** ("Best Rickey" by Rickey): this can't be judged by the database. The committee sees authors and decides. Ideas carry no nominees, only a hint, so a suggestion can't pre-load a nominee list. The self-vote rule still applies at vote time.
- **Window enforcement** is in RLS plus `submission_window_is_open`. Closing early takes effect immediately, so a stale open page gets a clear error ("MYOC is closed").
- **Volume:** the per-member limit (locked count), length checks, and linked-member-only inserts. An account unlinked by `reset_member_claim` can no longer submit. Whether its ideas stay is my call below.
- **No HTML rendering** of idea text. It is plain text only, so React escaping is enough.

## Member nominations: interpretations (not designed here)

- **(a) None.** Nominations stay derived from the vote (top 3). MYOC is the only pre-ballot submission flow. Nothing extra to build. *Recommended for now*: it matches how the group actually runs the season.
- **(b) Pre-ballot nomination window** for committee-chosen categories that need a nominee pool, such as objects, non-members and outsiders ("Best Restaurant", "Best Song"). Members suggest nominees, and the committee curates the `preset` list. It would reuse `submission_windows` with `kind = 'nominations'` and a `nominee_ideas` table. It is a clean follow-up spec if wanted.
- **(c) Write-ins during voting.** This is already built in v1 as "add an option" (`allow_member_add` + `add_nominee`). It needs only better labelling, if anything.

## My calls (not yet confirmed)

- Default limit of 5 per member per window, changeable per window (1-20). Rejected ideas count toward it.
- Ideas are anonymous to members, and authors are visible to the committee.
- No upvotes in the first build.
- Committee edits go into `final_*`, and the author keeps seeing their original text plus the status.
- Members see their own statuses only after the window closes (pending until then), so the committee can review in its own time without live reactions.
- The committee's own drafts live on the same board as `source = 'committee'` ideas.
- `sent_to_builder_at` marks hand-off. There is no foreign key to `categories`, because builder edits can rename or drop them.
- Ideas from an unlinked account stay (the committee may already have accepted them). They differ from votes, which `reset_member_claim` deletes.
- One open MYOC window per season at a time (partial unique index on `season_id` where `status = 'open'` and `kind = 'category_ideas'`).

## Open questions for the user (ranked)

1. **What should "Nominations" mean?** (a) nothing beyond the vote, (b) a pre-ballot nominee-suggestion window for object/outsider categories, or (c) the existing write-in. *Default: (a), with (b) as a later spec.* Changes the build: (b) adds a `kind`, a table, a member screen and a builder hand-off into preset lists.
2. **Is the next season the target, or should this land before Dec 4?** *Default: next season.* MYOC for this semester has already happened on Forms. Changes the build: an earlier date would cut the review board down to accept/reject only.
3. **Can members see others' ideas (anonymously), and upvote them?** *Default: see, but no upvotes.* Seeing cuts duplicates. Upvotes add a table and a popularity signal the committee may not want. Changes the build: the `list_window_ideas` RPC and an `idea_votes` table plus sorting.
4. **Credit on the ballot?** Should an accepted member idea show "idea by X" on the category? *Default: no, to keep anonymity.* Changes the build: adds `categories.credited_member_id` (a v1 table change) and a builder toggle.
5. **Limit of 5 per person?** *Default: 5.* It is only a default value, with no structural change.
6. **Should the hint include "outsider/non-member"** as separate from "object"? *Default: no* (object covers it and maps to `preset`). Changes the build: an enum value and the mode mapping.

## Left to the builder

- Exact names (e.g. `submission_windows` vs `myoc_windows`), and whether merge is a trigger or an RPC.
- How accepted ideas reach the builder (router state vs a query param plus fetch), as long as it goes through `toDraftCategories`.
- File layout for `pages/suggest/*` and `pages/committee/suggestions/*`, plus the API module `api/ideas.ts`.
- Bulk "+ Add our own" parsing (reuse `parseCategoryImport`).
- Empty, loading and error states that follow existing page patterns.

## Test strategy

- **SQL (pgTAP-style)**, in `supabase/tests/database/`, run in the dashboard inside `begin … rollback`. Use `set local role authenticated` and `request.jwt.claims` to impersonate a member, a second member and the committee:
  - Member insert inside the window works, before `opens_at`, after `closes_at` and after close early it fails, and an unlinked account fails.
  - The 6th insert fails at limit 5, deleting frees a slot, and a rejected idea still counts.
  - A member can't select another member's row, can't update `status`/`final_*`/`author_id` (guard trigger), and can't edit a non-pending idea.
  - `list_window_ideas` returns no author column, and a merged idea is hidden.
  - The committee can insert outside the window over the limit, merge (no cross-window merge, no chains) and change status.
  - Draft windows are invisible to members. v1 votes and ballot tests still pass unchanged.
- **Vitest** for pure logic in `lib/ideas.ts` and `lib/categoryImport.ts`: `toDraftCategories` (dedupe vs existing names, order, hint to mode mapping), `windowState(now, window)` (upcoming, open, closed, and Home card visibility), remaining-slots text, and the review-board filter/count helpers.
- **Manual dry run** with the two committee accounts plus one test member: open a window, submit, merge, accept, send to the builder, save the draft ballot.

## Build order (each task small, Sonnet-sized)

1. **Migration + SQL tests:** enums, both tables, the open-window helper, RLS, guard and limit triggers, merge, `list_window_ideas`, and the one-open-window index.
2. **Types, `api/ideas.ts`, `lib/ideas.ts`, and extract `toDraftCategories`** from `BulkImportPanel` with vitest. BulkImportPanel behaviour must stay unchanged.
3. **Static mocks** of the Suggest page, Home card, manage-windows page and review board, reviewed by the user in the built-in browser. Stop for sign-off.
4. **Committee manage-windows page,** plus the Profile button and routes.
5. **Member Suggest page and My suggestions,** plus the Home MYOC card (deleting the old mock component).
6. **Review board:** filters, accept/reject/edit/merge, and add your own.
7. **Builder hand-off** ("Build ballot from N accepted") and the end-to-end dry run.
