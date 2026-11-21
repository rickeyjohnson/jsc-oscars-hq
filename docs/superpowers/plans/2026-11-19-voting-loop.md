# Voting Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Committee publishes a ballot, the 14 members vote inside a DB-enforced window, the app tallies (ranking, ties, tiebreak, committee round, manual pick), exports an `oscars.py`-compatible CSV and gates results until release. Ballot live by Nov 25-26 2026; ceremony Dec 4.

**Architecture:** Supabase is the whole backend: SQL migrations in `supabase/migrations/` define tables, RLS and three small `security definer` functions (vote check, nominee creation, signup claim); pgTAP tests in `supabase/tests/database/` pin every security rule. All counting logic (ranking, rounds, stats, CSV) is pure TypeScript in `client/src/lib/`, unit-tested with vitest, and runs in the committee's browser, which RLS already lets read every vote. React pages call thin `client/src/api/*` wrappers around supabase-js.

**Why the tally is TypeScript, not a Postgres function:** only the committee ever computes a tally (members never see counts), the committee can already read all votes under RLS, the same vote rows feed the CSV, and vitest pins the ranking rules faster and more readably than SQL tests. The database still enforces everything that is a security rule. (The spec listed "Postgres function or view"; the choice was left to the builder.)

**Tech Stack:** Vite 7, React 19, TypeScript 5.9, Tailwind v4, react-router 7, supabase-js 2, Supabase CLI + Docker (local stack, migrations, `supabase test db` with pgTAP), vitest 3, Python + pandas from `~/repos/jsc-oscars/venv` (CSV compatibility check only), Vercel.

**Spec:** `docs/superpowers/specs/2026-11-19-voting-loop-design.md`

## Global Constraints

- Backend is Supabase (Postgres, Auth, Storage, RLS). There is no custom server. The unused `server/` Express stub is ignored.
- The existing client is Vite, React 19, TypeScript, Tailwind v4 and react-router; build on it.
- The current dark zinc and cream (`#fffadd`) style, Poppins and WindSong fonts, and rounded cards stay. Reorganizing folders and screens is after Dec 4.
- ~13 users on phones, with some on laptops.
- `profiles.is_committee` becomes the only source of admin rights. Clients cannot write it.
- RLS on every table.
- Votes can only be inserted or changed while the ballot is open (`opens_at <= now() < closes_at`), enforced in the database, not the client.
- Self-vote rule enforced in the database: a vote is rejected if the voter's user id is among the nominee's linked user ids.
- Routes: all `/app/*` routes sit behind auth, and committee screens (including `/app/profile/ballots/create`) behind a role check. Both are UX only. RLS is the actual protection.
- Data model (SQL migrations committed to the repo).
- Times are stored in UTC and shown in local time.
- The CSV export must always work. Output must be readable by the existing `oscars.py` and `oscars_stats.py` unchanged.
- Winners and nominee lists are hidden from members until the committee releases them for the whole season. Vote counts stay committee-only.
- Out of scope: everything in the spec's Non-goals and Later sections.

## Review Focus

1. **Committee escalation through signup metadata or a profile update.** The old signup sends `is_committee` in user metadata and the dashboard trigger may copy it. Test (Task 2): signup with metadata `{"is_committee": true}` yields `profiles.is_committee = false`; an authenticated `update profiles set is_committee = true` raises `is_committee is read-only`.
2. **Window bypass through UPDATE or early close.** Tests that only insert miss the update path and a ballot closed by status while `closes_at` is still in the future. Test (Task 3): `update votes set nominee_id = <self>` fails with 42501; insert into a `status = 'closed'` ballot with future `closes_at` fails with 42501; delete after close affects 0 rows.
3. **Group nominee dedupe and self-in-group.** `[Nick, Rickey]` and `[Rickey, Nick]` must be one nominee or votes split; a voter inside a group cannot vote for it. Test (Task 3): `add_nominee` returns the same id for both orders; Micah voting for a group containing Micah fails with 42501.
4. **Early leak to members.** Others' votes, results rows before release and committee-round ballots. Test (Task 3): Micah sees only his own vote, 0 results before release and 1 after, 0 committee-round ballots, 0 draft ballots.
5. **CSV quoting.** Group display names contain commas (`John Sampson, Rickey`), category names can too; an unquoted comma shifts columns and silently corrupts `oscars.py` output. Test (Task 12): header `Timestamp,Name,Best Locs,"Hook, Line & Sinker"`, a doubled-quote cell, round-trip through `parseCsv`, and the real `oscars.py` functions report `  1. John Sampson, Rickey: 2 votes`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `supabase/config.toml` | CLI project config (created by `supabase init`) |
| `supabase/migrations/20261119000000_remote_schema.sql` | Baseline pulled from the hosted project, with a findings comment header |
| `supabase/migrations/20261120000100_members_and_roles.sql` | `members` allowlist, signup claim trigger, `is_committee()` and its write lock, profiles RLS |
| `supabase/migrations/20261120000200_voting.sql` | seasons, ballots, categories, nominees, round_nominees, votes, results, RLS, `can_cast_vote`, `add_nominee`, season seed |
| `supabase/tests/database/000-setup-tests-hooks.test.sql` | pgTAP + `tests.*` helpers (create user, impersonate) |
| `supabase/tests/database/01_members_roles.test.sql` | Signup allowlist, claim-once, committee lock |
| `supabase/tests/database/02_voting_rls.test.sql` | Window, self-vote, uniqueness, visibility, release gate, rounds |
| `supabase/manual/link_existing_accounts.sql`, `supabase/manual/set_committee.sql` | One-off SQL run in the dashboard after `db push` |
| `client/src/database.types.ts` | Generated by `supabase gen types` |
| `client/src/types.ts` | Domain types shared by every task |
| `client/src/lib/siteUrl.ts` | Auth redirect URLs from `VITE_SITE_URL` |
| `client/src/lib/categoryImport.ts` | Bulk import parser |
| `client/src/lib/csv.ts` | RFC 4180 `toCsvRow` / `parseCsv` |
| `client/src/lib/ballotForm.ts` | Nominee rows per mode, publish validation |
| `client/src/lib/voting.ts` | Selectable nominees, progress, ballot card status, completion |
| `client/src/lib/time.ts` | Countdown, "closes in", local-input to UTC |
| `client/src/lib/tally.ts` | Competition ranking per category |
| `client/src/lib/rounds.ts` | Result rows per round, next step, manual pick |
| `client/src/lib/stats.ts` | Wins/nominations from results with the group cap |
| `client/src/lib/exportCsv.ts` | Ballot CSV in the Google Forms shape |
| `client/scripts/oscars_compat.py` | Runs the real functions from `oscars.py`/`oscars_stats.py` on a CSV |
| `client/src/api/members.ts`, `ballots.ts`, `votes.ts`, `results.ts` | supabase-js wrappers |
| `client/src/components/RequireCommittee.tsx` | Committee route guard |
| `client/src/pages/ballot-builder/*` | Split of `CreateBallotTemplate.tsx` |
| `client/src/pages/VotePage.tsx`, `client/src/components/vote/*` | Member voting |
| `client/src/pages/committee/*`, `client/src/components/committee/*` | Manage, completion, tally, rounds, export |
| `client/src/pages/ResultsPage.tsx` | Released results |
| `client/vercel.json`, `client/.env.example` | Deploy |
| Modified: `App.tsx`, `supabaseClient.ts`, `context/UserContenxt.tsx`, `pages/{SignupPage,LoginPage,HomePage,BallotsPage,ProfilePage,StatsPage}.tsx`, `components/{BallotCard,PendingBallots,Countdown,UserManagementModal}.tsx`, `package.json`, `vite.config.ts`, `tsconfig.app.json` | Wiring |
| Deleted: `client/src/pages/CreateBallotTemplate.tsx` | Replaced by `ballot-builder/` |

**Before Task 1:** the working tree has uncommitted user changes (renamed images, `App.tsx`, `ProfilePage.tsx`, `types.ts`, untracked `CreateBallotTemplate.tsx`). Ask the user to commit or stash them; every task stages only its own files.

Tasks 1-3 run in order. Tasks 4, 13 and 12's pure part depend only on Task 4's vitest setup and can run in parallel with Tasks 5-9.

---

### Task 1: Supabase CLI, baseline schema, test harness — MUST

**Files:** Create `supabase/config.toml`, `supabase/migrations/20261119000000_remote_schema.sql`, `supabase/tests/database/000-setup-tests-hooks.test.sql`, `supabase/manual/link_existing_accounts.sql`.

**Interfaces — Produces:** SQL helpers `tests.create_user(p_member_name text, p_meta jsonb default '{}') returns uuid` (inserts `auth.users` with `raw_user_meta_data = {"member_name": p_member_name, "username": p_member_name} || p_meta`, email `lower(replace(name,' ','.'))||'@test.local'`), `tests.authenticate_as(p_user uuid)` (sets `role` = `authenticated` and `request.jwt.claims` = `{"sub": p_user, "role": "authenticated"}` with `set_config(..., true)`; security invoker), `tests.authenticate_anon()`, `tests.clear_authentication()` (role back to `postgres`, claims `''`), and, added in Task 2, `tests.make_committee(p_user uuid)` (`update public.profiles set is_committee = true where user_id = p_user`; call after `clear_authentication`). A findings header in the baseline listing: profiles columns and `is_committee` type, every trigger/function on `auth.users`, every policy on `profiles` and `"oscarsEvents"`.

- [ ] Prereqs (user does these; never print secrets): Docker Desktop running; `brew install supabase/tap/supabase`; project ref = subdomain of `VITE_SUPABASE_URL` in `client/.env`; DB password from the user.
- [ ] Run `supabase test db` in repo root. Expected FAIL: `Cannot find project ref` / no `supabase` dir.
- [ ] `supabase init` (answer no to IDE settings), `supabase link --project-ref <ref>`, `supabase db pull` then `supabase db pull --schema auth,storage`. Rename the pulled public-schema file to `20261119000000_remote_schema.sql`, merge the auth/storage file into it, then `supabase migration repair --status reverted <original ts>` and `--status applied 20261119000000` for each original timestamp.
- [ ] In the dashboard SQL editor run `select id, raw_user_meta_data from auth.users;` and write `supabase/manual/link_existing_accounts.sql` as one line per existing account: `update public.members set user_id = '<id>', claimed_at = now() where name = '<Member Name>';` using the 14 spec names (`Jonathan`, `John Sampson`, ...). No emails in the file.
- [ ] Prepend the findings header comment to the baseline. In `config.toml` set `[auth] site_url = "http://localhost:5173"` and `additional_redirect_urls = ["http://localhost:5173/**"]`.
- [ ] Write `000-setup-tests-hooks.test.sql`: `create extension if not exists pgtap with schema extensions;`, `create schema if not exists tests;`, the first four helpers (`make_committee` is added in Task 2), `grant usage on schema tests to anon, authenticated; grant execute on all functions in schema tests to anon, authenticated;`, then `select plan(1); select has_function('tests','create_user', array['text','jsonb']); select * from finish();` (no begin/rollback: it must persist).
- [ ] `supabase start && supabase db reset && supabase test db`. Expected PASS: `000-setup-tests-hooks.test.sql .. ok`, `All tests successful.`
- [ ] Commit: `git add supabase/config.toml supabase/migrations supabase/tests supabase/manual supabase/.gitignore && git commit -m "Add Supabase CLI baseline and pgTAP harness"`

### Task 2: Members allowlist, signup claim, committee lock — MUST

**Files:** Create `supabase/migrations/20261120000100_members_and_roles.sql`, `supabase/manual/set_committee.sql`. Test `supabase/tests/database/01_members_roles.test.sql`. Add `tests.make_committee` to `000-setup-tests-hooks.test.sql`.

**Interfaces — Consumes:** Task 1 helpers and findings header (existing trigger/policy names to drop). **Produces:**
- `public.members(id uuid pk default gen_random_uuid(), name text unique not null, user_id uuid unique references auth.users on delete set null, claimed_at timestamptz)` seeded with exactly: Anthony, Dakarai, Demichael, Micah, Rico, Nick, Rickey, Kadin, Langston, Jonathan, John Sampson, Evan, TJ, Justin.
- `profiles.is_committee boolean not null default false` (convert with `using (is_committee::text in ('true','t'))`).
- `public.is_committee() returns boolean` (stable, security definer, `set search_path = ''`).
- `public.available_member_names() returns setof text` (unclaimed, ordered by name; execute granted to `anon, authenticated`).
- `public.reset_member_claim(p_name text) returns void` (raises `committee only` unless `is_committee()`; sets `user_id = null, claimed_at = null`).
- `public.handle_new_user()` + trigger `on_auth_user_created after insert on auth.users`: claims `members` row where `name = raw_user_meta_data->>'member_name' and user_id is null` (raise `member name % is not available` when 0 rows), inserts the profile with `is_committee = false` ignoring any metadata `is_committee`, `on conflict (user_id) do nothing`. Drop the old trigger/function named in the findings header.
- Trigger `profiles_guard_committee` (before insert or update): when `auth.role() in ('authenticated','anon')` and `is_committee` is set true on insert or changed on update, raise `is_committee is read-only`.
- RLS: `members` select for `authenticated`, no write policies. `profiles`: drop old policies; `profiles_select_authenticated` (select, true), `profiles_update_own` (`user_id = auth.uid()`). No insert policy.

- [ ] Write the failing test (begin; plan(12); ...; rollback):
```sql
-- signup claims the name and never grants committee
select lives_ok($$ select tests.create_user('Rico', '{"is_committee": true}') $$, 'Rico signs up');
select is((select is_committee from profiles p join members m on m.user_id = p.user_id where m.name = 'Rico'), false, 'metadata cannot grant committee');
select throws_ok($$ select tests.create_user('Rico') $$, null, 'second claim of Rico fails');      -- message contains 'member name Rico is not available' (GoTrue surfaces it generically)
select throws_ok($$ select tests.create_user('Stranger') $$, null, 'name not on list fails');
select is((select count(*)::int from members), 14, '14 members');
select tests.authenticate_anon();
select is((select count(*)::int from available_member_names()), 13, 'Rico no longer available');
-- as Rico
select tests.authenticate_as((select user_id from members where name = 'Rico'));
select throws_ok($$ update profiles set is_committee = true where user_id = auth.uid() $$, 'P0001', 'is_committee is read-only', 'member cannot self-promote');
select lives_ok($$ update profiles set username = 'rico2' where user_id = auth.uid() $$, 'member edits own username');
select throws_ok($$ select reset_member_claim('Rico') $$, 'P0001', 'committee only', 'member cannot reset claims');
select throws_ok($$ insert into members(name) values ('Eve') $$, '42501', null, 'members table is read-only');
-- committee path: clear_authentication(); make_committee(create_user('Rickey')); authenticate_as(Rickey)
select lives_ok($$ select reset_member_claim('Rico') $$, 'committee resets a claim');
select is((select user_id from members where name = 'Rico'), null, 'Rico claimable again');
```
- [ ] Run `supabase test db`. Expected FAIL: `relation "members" does not exist`.
- [ ] Write the migration per Produces. Write `set_committee.sql`: `update public.profiles set is_committee = (user_id in (select user_id from public.members where name in ('Rickey','Kadin')));` (run as postgres; the guard trigger only blocks client roles).
- [ ] `supabase db reset && supabase test db`. Expected PASS for files 000 and 01.
- [ ] Commit: `git add supabase/migrations/20261120000100_members_and_roles.sql supabase/manual/set_committee.sql supabase/tests/database/01_members_roles.test.sql && git commit -m "Add member allowlist, signup claim and committee lock"`

### Task 3: Voting schema, RLS and RPCs — MUST

**Files:** Create `supabase/migrations/20261120000200_voting.sql`, `client/src/database.types.ts`. Test `supabase/tests/database/02_voting_rls.test.sql`.

**Interfaces — Consumes:** `members`, `is_committee()` (Task 2). **Produces** (enums and tables, `public` schema, RLS enabled on all):
- Enums `ballot_status ('draft','open','closed','released')`, `ballot_round ('main','tiebreak','committee')`, `nominee_type ('person','group','outsider','noun')`, `nominee_mode ('everyone','subset','preset','group')`, `decided_by ('votes','tiebreak','committee_vote','manual')`.
- `seasons(id, name text, ceremony_at timestamptz, location text, results_released_at timestamptz)`; seed one row `('JSC Oscars Fall 2026', '2026-12-04 20:00:00+00')`.
- `ballots(id, season_id → seasons, parent_ballot_id → ballots null, name, round ballot_round default 'main', status ballot_status default 'draft', opens_at, closes_at, created_at, check (closes_at > opens_at))`. Round ballots always point `parent_ballot_id` at the **main** ballot.
- `categories(id, ballot_id → ballots on delete cascade, name, description text default '', sort_order int, nominee_mode default 'everyone', allow_member_add bool default false)`; categories belong to the main ballot only.
- `nominees(id, category_id → categories cascade, display_name, secondary_text, type nominee_type, member_ids uuid[] default '{}', created_by uuid)`, unique index `(category_id, lower(display_name))`.
- `round_nominees(ballot_id → ballots cascade, category_id, nominee_id → nominees, primary key (ballot_id, nominee_id))`.
- `votes(id, ballot_id, category_id, nominee_id, voter_id uuid default auth.uid(), created_at, updated_at default now(), unique (ballot_id, category_id, voter_id))`, trigger setting `updated_at = now()` on update.
- `results(category_id pk → categories cascade, decided_ballot_id → ballots, winner_nominee_id → nominees null, nominee_ids uuid[], top3_nominee_ids uuid[], decided_by decided_by null, updated_at)`.
- Functions (security definer, `search_path = ''`): `ballot_is_open(p_ballot uuid) boolean` = `status = 'open' and opens_at <= now() and now() < closes_at`; `ballot_visible(p_ballot uuid) boolean` = `is_committee() or (status <> 'draft' and round <> 'committee')`; `can_cast_vote(p_ballot, p_category, p_nominee) boolean` = ballot open, category's `ballot_id = coalesce(parent_ballot_id, id)`, nominee in category, round ≠ main ⇒ row in `round_nominees`, round = committee ⇒ `is_committee()`, and no `members m` with `m.user_id = auth.uid() and m.id = any(nominee.member_ids)`; `add_nominee(p_category uuid, p_display_name text, p_member_ids uuid[]) returns uuid`: raise `ballot is not open` unless the category's ballot is open; mode `group` ⇒ require ≥2 known members, `display_name = string_agg(name, ', ' order by name)`, `member_ids` ordered the same way, type `group`; mode `preset` with `allow_member_add` ⇒ require empty `p_member_ids` and non-blank trimmed name, type `noun`; else raise `category does not accept new nominees`; on unique conflict return the existing id.
- Policies: `seasons` select authenticated, write committee. `ballots`, `categories`, `nominees`, `round_nominees`: select `ballot_visible(<ballot>)`, write `is_committee()`. `votes`: select `voter_id = auth.uid() or is_committee()`; insert with check `voter_id = auth.uid() and can_cast_vote(...)`; update using `voter_id = auth.uid() and ballot_is_open(ballot_id)` with check the insert check; delete using `voter_id = auth.uid() and ballot_is_open(ballot_id)`. `results`: select `is_committee() or <season of the category's ballot has results_released_at is not null>`, write committee. Grant execute on `add_nominee` to authenticated.

- [ ] Write the failing test. Setup as postgres: users Rickey, Kadin (both `make_committee`), Micah, Nick; season S; main ballot M open (`now()-1h` to `now()+1d`) with category E (everyone; nominees Micah, Nick, Rickey as `person` with their `members.id`), G (group), P (preset, `allow_member_add`); ballot C closed by status (`closes_at = now()+1d`); ballot X open by status but `closes_at = now()-1m` (opens `now()-2h`); draft ballot D; committee-round ballot R (parent M, open) with `round_nominees` (R, E, Nick). One result row for E. Assertions as Micah unless noted:
```sql
select lives_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (:M,:E,:nick) $$, 'vote in open window');
select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (:M,:E,:micah) $$, '42501', null, 'self-vote rejected');
select throws_ok($$ insert into votes(ballot_id,category_id,nominee_id) values (:M,:E,:rickey) $$, '23505', null, 'one vote per category');
select throws_ok($$ update votes set nominee_id = :micah where voter_id = auth.uid() $$, '42501', null, 'cannot update to self');
select throws_ok(<insert into C>, '42501', null, 'closed status blocks even before closes_at');
select throws_ok(<insert into X>, '42501', null, 'past closes_at blocks');
select throws_ok(<insert into D>, '42501', null, 'draft blocks');
-- Nick votes once as Nick; back to Micah:
select is((select count(*)::int from votes), 1, 'member sees only own votes');
select is((select count(*)::int from ballots where id in (:D, :R)), 0, 'draft and committee round hidden');
select is((select count(*)::int from results), 0, 'results hidden before release');
update seasons set results_released_at = now();  -- RLS filters it to 0 rows
select is((select results_released_at from seasons where id = :S), null, 'member cannot release');
select throws_ok($$ insert into ballots(season_id,name,opens_at,closes_at) values (:S,'x',now(),now()+interval '1d') $$, '42501', null, 'member cannot create ballots');
select is(add_nominee(:G, '', array[:nick_m, :rickey_m]), add_nominee(:G, '', array[:rickey_m, :nick_m]), 'group dedupe ignores order');
select is((select display_name from nominees where category_id = :G), 'Nick, Rickey', 'group name sorted');
select throws_ok(<vote for add_nominee(:G,'',array[:micah_m,:nick_m])>, '42501', null, 'cannot vote for own group');
select throws_ok($$ select add_nominee(:E, 'Carrie', '{}') $$, 'P0001', 'category does not accept new nominees');
select lives_ok($$ select add_nominee(:P, 'Carrie', '{}') $$, 'member adds preset option');
select throws_ok(<insert into R for Nick>, '42501', null, 'members cannot vote in committee round');
-- as Rickey:
select lives_ok(<insert into R, E, Nick>, 'committee votes in committee round');
select throws_ok(<insert into R, E, Micah (not in round_nominees)>, '42501', null, 'only round nominees');
select is((select count(*)::int from votes where ballot_id = :M), 2, 'committee sees all votes');
-- as postgres: update seasons set results_released_at = now(); as Micah:
select is((select count(*)::int from results), 1, 'results visible after release');
-- as postgres: update ballots set closes_at = now() - interval '1s', opens_at = now() - interval '2h' where id = :M; as Micah:
delete from votes where ballot_id = :M;
select is((select count(*)::int from votes where ballot_id = :M), 1, 'delete after close affects nothing');
```
(Use `\set`-free form: capture ids into a temp table `ids(k text, v uuid)` created before switching role and granted select to authenticated.)
- [ ] Run `supabase test db`. Expected FAIL: `relation "ballots" does not exist`.
- [ ] Write the migration per Produces.
- [ ] `supabase db reset && supabase test db`. Expected PASS: all three files ok.
- [ ] `supabase gen types typescript --local > client/src/database.types.ts`.
- [ ] Commit: `git add supabase/migrations/20261120000200_voting.sql supabase/tests/database client/src/database.types.ts && git commit -m "Add voting schema, RLS and nominee/vote functions"`

### Task 4: Vitest, signup allowlist, env redirects — MUST

**Files:** Modify `client/package.json`, `client/vite.config.ts`, `client/tsconfig.app.json`, `client/src/pages/SignupPage.tsx`, `client/src/pages/LoginPage.tsx`. Create `client/src/lib/siteUrl.ts`, `client/src/api/members.ts`. Test `client/src/lib/siteUrl.test.ts`.

**Interfaces — Consumes:** `available_member_names()` (Task 2). **Produces:** `authRedirectUrl(path: string, base?: string): string` (base defaults to `import.meta.env.VITE_SITE_URL ?? window.location.origin`); `fetchAvailableMemberNames(): Promise<string[]>`; npm script `test`.

- [ ] `cd client && npm i -D vitest@^3.2.4`; add script `"test": "TZ=UTC vitest run"`; in `vite.config.ts` add `/// <reference types="vitest/config" />` and `test: { environment: "node", include: ["src/**/*.test.ts"] }`; in `tsconfig.app.json` add `"exclude": ["src/**/*.test.ts"]`.
- [ ] Failing test:
```ts
expect(authRedirectUrl("/signup/confirmed", "https://jsc-oscars.vercel.app")).toBe("https://jsc-oscars.vercel.app/signup/confirmed")
expect(authRedirectUrl("/login/reset", "https://jsc-oscars.vercel.app/")).toBe("https://jsc-oscars.vercel.app/login/reset")
```
- [ ] `npm test`. Expected FAIL: `Failed to resolve import "./siteUrl"`.
- [ ] Implement `authRedirectUrl` as `new URL(path, base).toString()`. SignupPage: delete the `is_committee` variable and metadata; load options from `fetchAvailableMemberNames()` (option value = label = exact name); send `options.data = { username, member_name: name }` and `emailRedirectTo: authRedirectUrl("/signup/confirmed")`; on error show `That name is already claimed or not on the list.` under the form in `text-red-400 text-sm`. LoginPage: `redirectTo: authRedirectUrl("/login/reset")`.
- [ ] `npm test && npm run build`. Expected PASS, build exits 0.
- [ ] Commit: `git add client/package.json client/package-lock.json client/vite.config.ts client/tsconfig.app.json client/src/lib/siteUrl.ts client/src/lib/siteUrl.test.ts client/src/api/members.ts client/src/pages/SignupPage.tsx client/src/pages/LoginPage.tsx && git commit -m "Restrict signup to member list and use env redirect URL"`

### Task 5: Domain types, user context, route guards — MUST

**Files:** Modify `client/src/types.ts`, `client/src/supabaseClient.ts`, `client/src/context/UserContenxt.tsx`, `client/src/App.tsx`. Create `client/src/components/RequireCommittee.tsx`. Test `client/src/components/RequireCommittee.test.ts`.

**Interfaces — Produces** (in `types.ts`; replaces the current builder types):
```ts
export type NomineeMode = "everyone" | "subset" | "preset" | "group"
export type NomineeType = "person" | "group" | "outsider" | "noun"
export type BallotStatus = "draft" | "open" | "closed" | "released"
export type BallotRound = "main" | "tiebreak" | "committee"
export type DecidedBy = "votes" | "tiebreak" | "committee_vote" | "manual"
export type Member = { id: string; name: string; user_id: string | null }
export type Season = { id: string; name: string; ceremony_at: string; location: string | null; results_released_at: string | null }
export type Ballot = { id: string; season_id: string; parent_ballot_id: string | null; name: string; round: BallotRound; status: BallotStatus; opens_at: string; closes_at: string }
export type Nominee = { id: string; display_name: string; secondary_text?: string; type: NomineeType; member_ids: string[] }
export type Category = { id: string; name: string; description: string; order: number; nominee_mode: NomineeMode; allow_member_add: boolean; nominees: Nominee[] }
export type BallotFormData = { season_id: string; name: string; opens_at: string; closes_at: string; categories: Category[] }
export type BallotDetail = Ballot & { categories: Category[] }
export type VoteRow = { category_id: string; nominee_id: string; voter_id: string; updated_at: string }
export type ResultRow = { category_id: string; decided_ballot_id: string; winner_nominee_id: string | null; nominee_ids: string[]; top3_nominee_ids: string[]; decided_by: DecidedBy | null }
```
`createClient<Database>` in `supabaseClient.ts`. `UserProfile.is_committee: boolean`; context adds `member: Member | null` (row of `members` with `user_id = user.id`) and `loading` becomes false also when there is no user. `committeeGate(loading: boolean, profile: { is_committee: boolean } | null): "loading" | "allow" | "deny"`, default export `RequireCommittee({ children })` (renders `FullScreenLoader`, children, or `<Navigate to="/app" replace />`).

- [ ] Failing test: `committeeGate(true, null)` → `"loading"`; `committeeGate(false, null)` → `"deny"`; `committeeGate(false, { is_committee: false })` → `"deny"`; `committeeGate(false, { is_committee: true })` → `"allow"`.
- [ ] `npm test`. Expected FAIL: module not found.
- [ ] Implement. In `App.tsx` wrap `/app/profile/ballots/create` in `WithAuth` and `RequireCommittee`; add a `committeeRoute(el)` helper used by every later committee route. Fix compile errors in `CreateBallotTemplate.tsx` only as far as needed for `npm run build` (Task 6 replaces it).
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Commit: `git add client/src/types.ts client/src/supabaseClient.ts client/src/context/UserContenxt.tsx client/src/App.tsx client/src/components/RequireCommittee.tsx client/src/components/RequireCommittee.test.ts && git commit -m "Add domain types, member context and committee route guard"`

### Task 6: Split the ballot builder and add bulk import — MUST

**Files:** Delete `client/src/pages/CreateBallotTemplate.tsx`. Create `client/src/pages/ballot-builder/{BallotBuilderPage,BallotBasicInfo,CategoryList,CategoryModal,BulkImportPanel}.tsx`, `client/src/lib/categoryImport.ts`, `client/src/lib/csv.ts`. Modify `client/src/App.tsx`. Test `client/src/lib/categoryImport.test.ts`, `client/src/lib/csv.test.ts`.

**Interfaces — Produces:** `parseCsv(text: string): string[][]`, `toCsvRow(cells: string[]): string` (quote a cell iff it contains `,` `"` `\n` or `\r`; double inner quotes); `parseCategoryImport(text: string): { categories: { name: string; description: string }[]; duplicates: string[] }`. Split mapping: `BallotBasicInfo` (existing component, event select becomes season select from `seasons`), `CategoryList` (`DraggableCategoryRow` + drag logic), `CategoryModal` (existing modal; nominee UI moves in Task 7), `BulkImportPanel` (textarea + `.txt/.csv` file input + Import button), `BallotBuilderPage` (state, default export, routed at `/app/profile/ballots/create`). Remove `MOCK_EVENTS`, `MOCK_PRESETS`, `New Category N` placeholder.

- [ ] Failing tests:
```ts
expect(toCsvRow(["a", "b, c", 'say "hi"'])).toBe('a,"b, c","say ""hi"""')
expect(parseCsv('x,"b, c"\n1,"q ""z"""\n')).toEqual([["x", "b, c"], ["1", 'q "z"']])
expect(parseCategoryImport("Best Locs | Who has the best locs\nMegaphone Award | Loudest").categories)
  .toEqual([{ name: "Best Locs", description: "Who has the best locs" }, { name: "Megaphone Award", description: "Loudest" }])
expect(parseCategoryImport('name,description\n"Hook, Line & Sinker",Falls for everything').categories)
  .toEqual([{ name: "Hook, Line & Sinker", description: "Falls for everything" }])
expect(parseCategoryImport("  \nMr. Niche Award  \n\n").categories).toEqual([{ name: "Mr. Niche Award", description: "" }])
expect(parseCategoryImport("A | b | c").categories).toEqual([{ name: "A", description: "b | c" }])
expect(parseCategoryImport("Best Locs|x\nbest locs|y")).toEqual({ categories: [{ name: "Best Locs", description: "x" }], duplicates: ["best locs"] })
```
CSV mode is chosen when the first non-blank line, lowercased and trimmed, starts with `name,description`.
- [ ] `npm test`. Expected FAIL: modules not found.
- [ ] Implement libs; split the page; imported categories become `Category` with `nominee_mode: "everyone"`, `allow_member_add: false`, `nominees: []`, appended in order; names already in the form (case-insensitive) go to `duplicates`; show duplicates as an amber note under the panel.
- [ ] `npm test && npm run build`. Expected PASS. Manually: paste 3 lines, see 3 rows, drag reorders.
- [ ] Commit: `git add client/src/pages/ballot-builder client/src/lib/categoryImport.ts client/src/lib/categoryImport.test.ts client/src/lib/csv.ts client/src/lib/csv.test.ts client/src/App.tsx && git commit -m "Split ballot builder and add bulk category import"`

### Task 7: Nominee modes, save draft, publish — MUST

**Files:** Create `client/src/pages/ballot-builder/NomineeModePicker.tsx`, `client/src/lib/ballotForm.ts`, `client/src/api/ballots.ts`. Modify `CategoryModal.tsx`, `BallotBuilderPage.tsx`, `client/src/api/members.ts`. Test `client/src/lib/ballotForm.test.ts`.

**Interfaces — Consumes:** types (Task 5), tables (Task 3). **Produces:**
- `buildNomineeRows(category: Category, members: Member[]): { display_name: string; secondary_text: string | null; type: NomineeType; member_ids: string[] }[]` — `everyone`: every member sorted by name as `person` with `[member.id]`; `subset` and `preset`: `category.nominees` mapped; `group`: `[]`.
- `validateBallotForPublish(form: BallotFormData): string[]` with exactly these messages: `Ballot name is required`, `Select a season`, `Closing time must be after opening time`, `Add at least one category`, `Category "<name>" needs at least one nominee` (subset, or preset without `allow_member_add`, with 0 nominees), `Duplicate category name "<name>"`.
- `fetchMembers(): Promise<Member[]>`; `fetchSeasons(): Promise<Season[]>`; `saveBallotDraft(form: BallotFormData, members: Member[], ballotId?: string): Promise<string>` (insert or update the ballot with `status: "draft"`, delete its categories, insert categories with `sort_order = index` then nominees from `buildNomineeRows`); `setBallotStatus(ballotId: string, status: BallotStatus): Promise<void>`.
- `NomineeModePicker` props `{ category: Category; members: Member[]; onChange: (c: Category) => void }`: four mode buttons; `subset` = member checkboxes (each a `person` nominee); `preset` = reuse the existing `CustomNomineeBuilder`/`SelectedNomineeList` (type `outsider` when it has no linked members, else `person`) plus an "Let members add options" toggle; `group` = note "Voters pick 2+ members".

- [ ] Failing tests (members fixture of the 14 names with ids `m-<name>`):
```ts
expect(buildNomineeRows(cat({ nominee_mode: "everyone" }), members)).toHaveLength(14)
expect(buildNomineeRows(cat({ nominee_mode: "everyone" }), members)[0]).toEqual({ display_name: "Anthony", secondary_text: null, type: "person", member_ids: ["m-Anthony"] })
expect(buildNomineeRows(cat({ nominee_mode: "group" }), members)).toEqual([])
expect(buildNomineeRows(cat({ nominee_mode: "subset", nominees: [nick, evan] }), members).map(n => n.display_name)).toEqual(["Nick", "Evan"])
expect(validateBallotForPublish(validForm)).toEqual([])
expect(validateBallotForPublish({ ...validForm, name: "" })).toContain("Ballot name is required")
expect(validateBallotForPublish({ ...validForm, closes_at: validForm.opens_at })).toContain("Closing time must be after opening time")
expect(validateBallotForPublish({ ...validForm, categories: [cat({ name: "Best Locs", nominee_mode: "subset" })] })).toContain('Category "Best Locs" needs at least one nominee')
expect(validateBallotForPublish({ ...validForm, categories: [cat({ name: "Car", nominee_mode: "preset", allow_member_add: true })] })).toEqual([])
expect(validateBallotForPublish({ ...validForm, categories: [cat({ name: "A" }), cat({ name: "a" })] })).toContain('Duplicate category name "a"')
```
- [ ] `npm test`. Expected FAIL.
- [ ] Implement. Builder: datetime-local values convert with `toUtcIso` (add `toUtcIso(local: string): string` = `new Date(local).toISOString()` to `client/src/lib/time.ts` with test `toUtcIso("2026-11-25T18:00")` → `"2026-11-25T18:00:00.000Z"` under TZ=UTC); "Save draft" calls `saveBallotDraft`; "Publish Ballot" shows validation errors as a list, else saves then `setBallotStatus(id, "open")` and navigates to `/app/profile/ballots/<id>`.
- [ ] `npm test && npm run build`. Expected PASS. Manually against local stack: publish a 3-category ballot; rows appear in `categories`/`nominees`.
- [ ] Commit: `git add client/src/pages/ballot-builder client/src/lib/ballotForm.ts client/src/lib/ballotForm.test.ts client/src/lib/time.ts client/src/lib/time.test.ts client/src/api/ballots.ts client/src/api/members.ts && git commit -m "Add nominee modes, draft save and publish"`

### Task 8: Vote page — MUST

**Files:** Create `client/src/pages/VotePage.tsx`, `client/src/components/vote/{CategoryVoteCard,GroupPicker}.tsx`, `client/src/lib/voting.ts`, `client/src/api/votes.ts`. Modify `client/src/api/ballots.ts`, `client/src/App.tsx` (route `/app/ballots/:ballotId`, auth only). Test `client/src/lib/voting.test.ts`.

**Interfaces — Consumes:** `Member`, `Nominee`, `BallotDetail`, `add_nominee`. **Produces:**
- `selectableNominees(nominees: Nominee[], myMemberId: string | null): Nominee[]`; `groupCandidates(members: Member[], myMemberId: string | null): Member[]`; `votedCount(myVotes: Record<string, string>, categoryIds: string[]): number`.
- `fetchBallotDetail(ballotId: string): Promise<BallotDetail>` (round ballots: categories of the parent, filtered to those in `round_nominees`, nominees filtered to the round's ids; ordered by `sort_order`, nominees by `display_name`).
- `fetchMyVotes(ballotId: string): Promise<Record<string, string>>` (category_id → nominee_id); `castVote(ballotId, categoryId, nomineeId): Promise<void>` (upsert, `onConflict: "ballot_id,category_id,voter_id"`); `clearVote(ballotId, categoryId): Promise<void>`; `addNominee(categoryId: string, displayName: string, memberIds: string[]): Promise<string>`.

- [ ] Failing tests: `selectableNominees([micah, nick, groupMicahNick, groupNickRickey], "m-Micah").map(n => n.display_name)` → `["Nick", "Nick, Rickey"]`; `selectableNominees([micah], null)` → `[micah]`; `groupCandidates(members, "m-Micah")` has length 13 and excludes Micah; `votedCount({ c1: "n1", c3: "n2" }, ["c1", "c2"])` → `1`.
- [ ] `npm test`. Expected FAIL.
- [ ] Implement. One card per category (existing card styles): radio list of `selectableNominees`; tap = `castVote` (optimistic, revert and show `Couldn't save. Voting may be closed.` on error); "Clear" = `clearVote`; preset with `allow_member_add` shows an "Add option" input → `addNominee` then `castVote`; group mode shows `GroupPicker` (checkboxes of `groupCandidates`, button disabled under 2) → `addNominee(categoryId, "", ids)` then `castVote`, plus existing group nominees as radio options. Header: ballot name, `votedCount/total voted`, closing time in local time. Outside the window the page is read-only.
- [ ] `npm test && npm run build`. Expected PASS. Manually: vote, refresh, choice persists; own name not listed.
- [ ] Commit: `git add client/src/pages/VotePage.tsx client/src/components/vote client/src/lib/voting.ts client/src/lib/voting.test.ts client/src/api/votes.ts client/src/api/ballots.ts client/src/App.tsx && git commit -m "Add member vote page"`

### Task 9: Home countdown, open ballots, ballots list — MUST

**Files:** Modify `client/src/pages/HomePage.tsx`, `client/src/components/{Countdown,PendingBallots,BallotCard}.tsx`, `client/src/pages/BallotsPage.tsx`, `client/src/lib/time.ts`, `client/src/lib/voting.ts`, `client/src/api/ballots.ts`. Test `client/src/lib/time.test.ts`, `client/src/lib/voting.test.ts`.

**Interfaces — Produces:** `countdownParts(target: Date, now: Date): { days: number; hours: number; minutes: number; seconds: number } | null`; `closesInLabel(closesAt: Date, now: Date): string` (largest whole unit, floored: days, else hours, else minutes; `Closed` when past); `urgency(closesAt: Date, now: Date): "urgent" | "soon" | "normal"` (<24 h, <72 h); `type BallotCardStatus = "upcoming" | "open" | "voted" | "closed"`; `ballotCardStatus(b: Ballot, categoryCount: number, myVoteCount: number, now: Date): BallotCardStatus`; `type BallotSummary = Ballot & { category_count: number; my_vote_count: number }`; `fetchCurrentSeason(): Promise<Season | null>` (latest `ceremony_at`); `fetchBallotSummaries(): Promise<BallotSummary[]>` (non-draft visible ballots; round ballots count distinct categories in `round_nominees`). `BallotCard` props become `{ ballot: BallotSummary; now: Date }` and its button links to `/app/ballots/<id>`.

- [ ] Failing tests (`now = new Date("2026-11-23T00:00:00Z")`):
```ts
expect(countdownParts(new Date("2026-12-04T20:00:00Z"), now)).toEqual({ days: 11, hours: 20, minutes: 0, seconds: 0 })
expect(countdownParts(new Date("2026-11-22T00:00:00Z"), now)).toBeNull()
expect(closesInLabel(new Date("2026-11-26T00:00:00Z"), now)).toBe("Closes in 3 days")
expect(closesInLabel(new Date("2026-11-24T00:00:00Z"), now)).toBe("Closes in 1 day")
expect(closesInLabel(new Date("2026-11-23T05:00:00Z"), now)).toBe("Closes in 5 hours")
expect(closesInLabel(new Date("2026-11-23T00:12:00Z"), now)).toBe("Closes in 12 minutes")
expect(closesInLabel(new Date("2026-11-22T00:00:00Z"), now)).toBe("Closed")
expect(urgency(new Date("2026-11-23T05:00:00Z"), now)).toBe("urgent")
expect(urgency(new Date("2026-11-25T00:00:00Z"), now)).toBe("soon")
expect(ballotCardStatus(openBallot, 3, 3, now)).toBe("voted")
expect(ballotCardStatus(openBallot, 3, 1, now)).toBe("open")
expect(ballotCardStatus({ ...openBallot, status: "closed" }, 3, 1, now)).toBe("closed")
expect(ballotCardStatus({ ...openBallot, closes_at: "2026-11-22T00:00:00Z" }, 3, 1, now)).toBe("closed")
expect(ballotCardStatus({ ...openBallot, opens_at: "2026-11-24T00:00:00Z" }, 3, 0, now)).toBe("upcoming")
```
(`openBallot`: status `open`, opens `2026-11-22T00:00:00Z`, closes `2026-11-26T00:00:00Z`.)
- [ ] `npm test`. Expected FAIL.
- [ ] Implement. `Countdown` takes `{ season: Season | null }`, title `season.name`, footer local date/time of `ceremony_at`, "It's Oscar Night!" when `countdownParts` is null. `PendingBallots` takes `{ ballots: BallotSummary[] }`, lists `open` ones with unvoted categories, red badge for `urgent`, links to the vote page; else the existing "No Pending Ballots" state. HomePage: remove the three `Locked` sections and their imports. BallotsPage: real filter tabs (All, Open, Voted, Closed; `upcoming` shows under All), "No ballots" only when the filtered list is empty.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Commit: `git add client/src/pages/HomePage.tsx client/src/pages/BallotsPage.tsx client/src/components/Countdown.tsx client/src/components/PendingBallots.tsx client/src/components/BallotCard.tsx client/src/lib/time.ts client/src/lib/time.test.ts client/src/lib/voting.ts client/src/lib/voting.test.ts client/src/api/ballots.ts && git commit -m "Show real countdown and ballots on home and ballots pages"`

### Task 10: Deploy to Vercel and dry run — MUST (target: done by Nov 24)

**Files:** Create `client/vercel.json`, `client/.env.example`.

- [ ] Failing check: after a Vercel preview deploy without rewrites, `curl -s -o /dev/null -w "%{http_code}" https://<app>.vercel.app/app/ballots` returns `404`.
- [ ] `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`. `.env.example`: `VITE_SUPABASE_URL=`, `VITE_SUPABASE_API_KEY=`, `VITE_SITE_URL=`. User steps: Vercel project root `client`, framework Vite, env vars set (`VITE_SITE_URL=https://<app>.vercel.app`); Supabase dashboard Auth → URL Configuration: Site URL and redirect `https://<app>.vercel.app/**`; `supabase db push`; run `supabase/manual/link_existing_accounts.sql` then `set_committee.sql` in the SQL editor.
- [ ] Check passes: the curl returns `200`; `npm test && npm run build` pass.
- [ ] Dry run with Rickey and Kadin on phones: publish a 2-category test ballot closing in 30 min, both vote, confirm own name is absent, change a vote, close early, confirm voting now fails, export the CSV; then delete the test ballot in the dashboard.
- [ ] Commit: `git add client/vercel.json client/.env.example && git commit -m "Add Vercel config"`

### Task 11: Committee ballot management and completion — MUST

**Files:** Create `client/src/pages/committee/{ManageBallotsPage,BallotAdminPage}.tsx`, `client/src/components/committee/CompletionPanel.tsx`. Modify `client/src/lib/voting.ts`, `client/src/api/votes.ts`, `client/src/App.tsx`, `client/src/pages/ProfilePage.tsx`. Test `client/src/lib/voting.test.ts`.

**Interfaces — Produces:** `completionByMember(members: Member[], votes: { voter_id: string; category_id: string }[], categoryCount: number): { name: string; voted: number; total: number; claimed: boolean }[]` (sorted by `voted` asc, then name); `fetchAllVotes(ballotId: string): Promise<VoteRow[]>`. Routes (committee-guarded): `/app/profile/ballots` → `ManageBallotsPage` (all ballots incl. drafts, status badge, links), `/app/profile/ballots/:ballotId` → `BallotAdminPage` (status, Publish for drafts, "Close now" for open with confirm → `setBallotStatus(id, "closed")`, `CompletionPanel`; Tasks 12 and 14 add panels here). ProfilePage: wire "Manage Ballots" and "View Results" to `/app/profile/ballots`.

- [ ] Failing tests: for members Micah (claimed, 2 votes), Nick (claimed, 0), Rico (unclaimed), `completionByMember(..., 3)` → `[{ name: "Nick", voted: 0, total: 3, claimed: true }, { name: "Rico", voted: 0, total: 3, claimed: false }, { name: "Micah", voted: 2, total: 3, claimed: true }]`; votes by a voter not in `members` are ignored.
- [ ] `npm test`. Expected FAIL.
- [ ] Implement (votes map to members by `members.user_id = voter_id`).
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Commit: `git add client/src/pages/committee client/src/components/committee client/src/lib/voting.ts client/src/lib/voting.test.ts client/src/api/votes.ts client/src/App.tsx client/src/pages/ProfilePage.tsx && git commit -m "Add committee ballot management and voter completion"`

### Task 12: CSV export compatible with oscars.py — MUST

**Files:** Create `client/src/lib/exportCsv.ts`, `client/scripts/oscars_compat.py`, `client/src/components/committee/ExportCsvButton.tsx`. Modify `BallotAdminPage.tsx`. Test `client/src/lib/exportCsv.test.ts`.

**Interfaces — Consumes:** `toCsvRow`, `parseCsv` (Task 6), `fetchAllVotes`, `fetchMembers`, `fetchBallotDetail`. **Produces:** `formatTimestamp(d: Date): string` (local `M/D/YYYY H:mm:ss`, e.g. `11/27/2026 14:05:09`); `buildBallotCsv(input: { categories: { id: string; name: string }[]; voters: { user_id: string; name: string }[]; votes: VoteRow[]; nomineeNames: Record<string, string> }): string` — header `Timestamp,Name,<category names in order>`; one row per voter with ≥1 vote, ordered by last edit ascending; Timestamp = that voter's max `updated_at`; Name = member name; skipped cell blank; rows joined with `\n`, trailing `\n`. Button downloads `<ballot name>.csv` (one file per ballot, so each tiebreak round exports its own).
`oscars_compat.py <csv> <oscars_dir>`: parse `oscars.py` and `oscars_stats.py` with `ast`, exec only the `import` nodes and the `print_top3_from_nominations` / `calculate_stats` `FunctionDef` nodes, call both on `<csv>`.

- [ ] Failing tests. Fixture: categories `Best Locs`, `Hook, Line & Sinker`; Micah (`2026-11-27T14:05:09Z`) → Nick, `John Sampson, Rickey`; Rico (`2026-11-27T15:00:00Z`) → Nick, skipped; Evan (`2026-11-28T09:00:00Z`) → Langston, `John Sampson, Rickey`; Justin no votes.
```ts
const csv = buildBallotCsv(fixture)
expect(csv.split("\n")[0]).toBe('Timestamp,Name,Best Locs,"Hook, Line & Sinker"')
expect(csv.split("\n")[1]).toBe('11/27/2026 14:05:09,Micah,Nick,"John Sampson, Rickey"')
expect(csv.split("\n")[2]).toBe("11/27/2026 15:00:00,Rico,Nick,")
expect(csv).not.toContain("Justin")
expect(parseCsv(csv)).toHaveLength(4)
expect(buildBallotCsv(withNominee('The "Goat"'))).toContain('"The ""Goat"""')
const py = process.env.OSCARS_PYTHON ?? `${homedir()}/repos/jsc-oscars/venv/bin/python`
it.skipIf(!existsSync(py))("oscars.py reads the export unchanged", () => {
  // write csv to os.tmpdir(), spawnSync(py, ["scripts/oscars_compat.py", file, process.env.OSCARS_DIR ?? `${homedir()}/repos/jsc-oscars`])
  expect(out).toContain("Best Locs:\n  1. Nick: 2 votes\n  2. Langston: 1 votes")
  expect(out).toContain("Hook, Line & Sinker:\n  1. John Sampson, Rickey: 2 votes")
  expect(out).toMatch(/^Nick\s+1\s+1\s+100\.0%$/m)
  expect(out).toMatch(/^Langston\s+0\s+1\s+0\.0%$/m)
})
```
- [ ] `npm test`. Expected FAIL: module not found.
- [ ] Implement lib, script, button.
- [ ] `npm test`. Expected PASS, compat test not skipped on Rickey's Mac.
- [ ] Commit: `git add client/src/lib/exportCsv.ts client/src/lib/exportCsv.test.ts client/scripts/oscars_compat.py client/src/components/committee/ExportCsvButton.tsx client/src/pages/committee/BallotAdminPage.tsx && git commit -m "Add oscars.py-compatible CSV export"`

### Task 13: Tally, rounds and stats library — MUST (pure TS; can run any time after Task 4)

**Files:** Create `client/src/lib/{tally,rounds,stats}.ts`. Test `client/src/lib/{tally,rounds,stats}.test.ts`.

**Interfaces — Consumes:** `ResultRow`, `BallotRound`, `Nominee` (Task 5). **Produces:**
```ts
export type RankedNominee = { nominee_id: string; votes: number; rank: number }
export type CategoryTally = { category_id: string; ranked: RankedNominee[]; top3_ids: string[]; nominee_ids: string[]; leader_ids: string[]; first_tied: boolean }
export function tallyCategory(categoryId: string, votes: { category_id: string; nominee_id: string }[], eligibleIds?: string[]): CategoryTally
export type NextStep = "done" | "tiebreak" | "committee" | "manual"
export function resultForRound(round: BallotRound, ballotId: string, t: CategoryTally, prev: ResultRow | null): ResultRow
export function nextStep(round: BallotRound, t: CategoryTally, tiedNominees: Nominee[], committeeMemberIds: string[]): NextStep
export function manualResult(prev: ResultRow, winnerId: string, ballotId: string): ResultRow
export type Tally = { wins: number; noms: number }
export function nomineeStats(results: ResultRow[], nominees: Record<string, Nominee>): { members: Record<string, Tally>; others: Record<string, Tally> }
```
Rules: rank = 1 + count of nominees with strictly more votes; only nominees with ≥1 vote are ranked unless listed in `eligibleIds` (then they rank with 0); `ranked` sorted by votes desc, then `nominee_id` asc; `top3_ids` = rank ≤ 3; `leader_ids` = rank 1; `first_tied` = `leader_ids.length > 1`; `nominee_ids` = `first_tied ? leader_ids : top3_ids`. `nominee_ids` and `top3_ids` follow `ranked` order.

- [ ] Failing tests (`v(counts)` expands `{A:5,...}` into vote rows for category `c`):
```ts
// tally.test.ts
expect(tallyCategory("c", v({ A: 5, B: 3, C: 3, D: 2, E: 1 })).ranked.map(r => [r.nominee_id, r.rank])).toEqual([["A",1],["B",2],["C",2],["D",4],["E",5]])
expect(tallyCategory("c", v({ A: 5, B: 3, C: 3, D: 2, E: 1 })).nominee_ids).toEqual(["A","B","C"])
expect(tallyCategory("c", v({ A: 5, B: 4, C: 3, D: 3, E: 1 })).nominee_ids).toEqual(["A","B","C","D"])
expect(tallyCategory("c", v({ A: 6, B: 2, C: 2, D: 2, E: 1 })).nominee_ids).toEqual(["A","B","C","D"])
expect(tallyCategory("c", v({ A: 4, B: 4, C: 2 }))).toMatchObject({ first_tied: true, leader_ids: ["A","B"], nominee_ids: ["A","B"], top3_ids: ["A","B","C"] })
expect(tallyCategory("c", v({ A: 3, B: 3, C: 3, D: 3 })).nominee_ids).toEqual(["A","B","C","D"])
expect(tallyCategory("c", [])).toMatchObject({ ranked: [], nominee_ids: [], leader_ids: [], first_tied: false })
expect(tallyCategory("c", v({ B: 1 }), ["A","B"]).ranked).toEqual([{ nominee_id: "B", votes: 1, rank: 1 }, { nominee_id: "A", votes: 0, rank: 2 }])
expect(tallyCategory("c", [], ["A","B"])).toMatchObject({ first_tied: true, leader_ids: ["A","B"] })
expect(tallyCategory("c", [...v({ A: 2 }), { category_id: "other", nominee_id: "B" }]).ranked).toHaveLength(1)
// rounds.test.ts
expect(resultForRound("main", "M", tallyCategory("c", v({ A: 5, B: 3, C: 3, D: 2 })), null)).toEqual({ category_id: "c", decided_ballot_id: "M", winner_nominee_id: "A", nominee_ids: ["A","B","C"], top3_nominee_ids: ["A","B","C"], decided_by: "votes" })
expect(resultForRound("main", "M", tallyCategory("c", v({ A: 4, B: 4, C: 2 })), null)).toMatchObject({ winner_nominee_id: null, nominee_ids: ["A","B"], top3_nominee_ids: ["A","B","C"], decided_by: null })
const prev = { category_id: "c", decided_ballot_id: "M", winner_nominee_id: null, nominee_ids: ["A","B"], top3_nominee_ids: ["A","B","C"], decided_by: null }
expect(resultForRound("tiebreak", "T", tallyCategory("c", v({ B: 3, A: 1 }), ["A","B"]), prev)).toEqual({ ...prev, decided_ballot_id: "T", winner_nominee_id: "B", decided_by: "tiebreak" })
expect(resultForRound("committee", "K", tallyCategory("c", v({ A: 2 }), ["A","B"]), prev)).toMatchObject({ winner_nominee_id: "A", decided_by: "committee_vote" })
expect(resultForRound("committee", "K", tallyCategory("c", v({ A: 1, B: 1 }), ["A","B"]), prev)).toMatchObject({ winner_nominee_id: null, decided_by: null })
expect(nextStep("main", tallyCategory("c", v({ A: 2, B: 1 })), [], [rickey, kadin])).toBe("done")
expect(nextStep("main", tallyCategory("c", v({ A: 2, B: 2 })), [nA, nB], [rickey, kadin])).toBe("tiebreak")
expect(nextStep("main", tallyCategory("c", []), [], [rickey, kadin])).toBe("manual")
expect(nextStep("tiebreak", tied, [person(rickey), person(nick)], [rickey, kadin])).toBe("committee")
expect(nextStep("tiebreak", tied, [person(rickey), person(kadin)], [rickey, kadin])).toBe("manual")
expect(nextStep("tiebreak", tied, [group([rickey, kadin]), person(nick)], [rickey, kadin])).toBe("manual")
expect(nextStep("committee", tied, [person(nick), person(evan)], [rickey, kadin])).toBe("manual")
expect(nextStep("committee", tallyCategory("c", v({ A: 2 }), ["A","B"]), [], [rickey, kadin])).toBe("done")
expect(manualResult(prev, "B", "T")).toEqual({ ...prev, decided_ballot_id: "T", winner_nominee_id: "B", decided_by: "manual" })
expect(manualResult({ ...prev, nominee_ids: [], top3_nominee_ids: [] }, "Z", "M").nominee_ids).toEqual(["Z"])
// stats.test.ts — g1 = group [a,b], g2 = group [a,c], carrie = outsider, p = person [a]
expect(nomineeStats([{ ...r("x"), nominee_ids: ["g1","g2"], winner_nominee_id: "g1" }], noms).members).toEqual({ a: { wins: 1, noms: 1 }, b: { wins: 1, noms: 1 }, c: { wins: 0, noms: 1 } })
expect(nomineeStats([{ ...r("x"), nominee_ids: ["carrie"], winner_nominee_id: "carrie" }], noms).others).toEqual({ Carrie: { wins: 1, noms: 1 } })
expect(nomineeStats([{ ...r("x"), nominee_ids: ["p"], winner_nominee_id: null }, { ...r("y"), nominee_ids: ["p"], winner_nominee_id: "p" }], noms).members.a).toEqual({ wins: 1, noms: 2 })
```
(`tied` = `tallyCategory("c", v({ A: 1, B: 1 }), ["A","B"])`; `person(id)`/`group(ids)` build nominees with those `member_ids`.)
`nextStep` rule: single leader ⇒ `done`; main with no ranked nominees ⇒ `manual`; main tied ⇒ `tiebreak`; tiebreak tied ⇒ `manual` if every committee member id appears in some tied nominee's `member_ids`, else `committee`; committee tied ⇒ `manual`. Stats key members by member id and others by `display_name`; a member counts at most one nomination and one win per category.
- [ ] `npm test`. Expected FAIL: modules not found.
- [ ] Implement the three files.
- [ ] `npm test`. Expected PASS.
- [ ] Commit: `git add client/src/lib/tally.ts client/src/lib/tally.test.ts client/src/lib/rounds.ts client/src/lib/rounds.test.ts client/src/lib/stats.ts client/src/lib/stats.test.ts && git commit -m "Add tally, round resolution and stats library"`

### Task 14: Committee tally view, rounds and manual pick — MUST (target: done by Dec 1)

**Files:** Create `client/src/components/committee/TallyPanel.tsx`, `client/src/api/results.ts`. Modify `client/src/api/ballots.ts`, `BallotAdminPage.tsx`.

**Interfaces — Consumes:** Task 13 functions, `fetchAllVotes`, `fetchBallotDetail`, `fetchMembers`. **Produces:** `fetchResults(categoryIds: string[]): Promise<ResultRow[]>`; `upsertResults(rows: ResultRow[]): Promise<void>` (onConflict `category_id`); `createRoundBallot(main: Ballot, round: "tiebreak" | "committee", entries: { category_id: string; nominee_ids: string[] }[], closesAt: string): Promise<string>` (status `open`, `opens_at = now`, `parent_ballot_id = main.id`, name `<main name> – Tiebreak` or `– Committee`, inserts `round_nominees`); `releaseSeasonResults(seasonId: string): Promise<void>` (used in Task 15).

- [ ] Test: the decision logic is fully covered by Task 13; add one integration-style test to `rounds.test.ts` for the panel's batch helper `roundEntries(tallies: CategoryTally[], step: NextStep, prevByCategory: Record<string, ResultRow>): { category_id: string; nominee_ids: string[] }[]` (exported from `rounds.ts`): for step `tiebreak` it returns `{ category_id, nominee_ids: t.leader_ids }` for tallies whose main `nextStep` is `tiebreak`; for step `committee` it returns `prev.nominee_ids` filtered to the tiebreak leaders. Assertion: two tallies (`{A:4,B:4,C:1}`, `{A:3,B:1}`) → `[{ category_id: "c1", nominee_ids: ["A","B"] }]`.
- [ ] `npm test`. Expected FAIL: `roundEntries` not exported.
- [ ] Implement `roundEntries`, the API, and `TallyPanel` (visible when the ballot's window has ended or status is `closed`): per category the ranked list with vote counts and a badge (`Winner`, `Tiebreak needed`, `Committee vote needed`, `Manual pick needed`); "Record results" → `upsertResults` of `resultForRound` for all categories; "Create tiebreak round" / "Create committee round" with a datetime-local defaulting to now + 24 h → `createRoundBallot(main, …, roundEntries(...), toUtcIso(value))`; for `manual` rows a select of `prev.nominee_ids` (or all category nominees when empty) + "Record winner" → `upsertResults([manualResult(prev, id, ballot.id)])`. Committee member ids = `members` whose `user_id` has `is_committee` (read `profiles`).
- [ ] `npm test && npm run build`. Expected PASS. Manually on local stack: seed a 2-2 tie, record, create tiebreak, vote, close, record, winner shown.
- [ ] Commit: `git add client/src/components/committee/TallyPanel.tsx client/src/api/results.ts client/src/api/ballots.ts client/src/lib/rounds.ts client/src/lib/rounds.test.ts client/src/pages/committee/BallotAdminPage.tsx && git commit -m "Add committee tally view, tiebreak and committee rounds, manual pick"`

---
**SAFE CUT LINE.** Everything above is needed for voting week and the Dec 2-3 tally. If time runs out earlier, the fallback order is: keep Tasks 1-12 (CSV export into `oscars.py` covers tallying and ties are run as before); then Task 14 last. Below this line can ship after Dec 4.

---

### Task 15: Release gate and member results page — SHOULD

**Files:** Create `client/src/pages/ResultsPage.tsx`. Modify `ManageBallotsPage.tsx`, `client/src/api/ballots.ts`, `client/src/App.tsx` (`/app/results`, auth only), `client/src/components/BallotCard.tsx` ("View Results" links to `/app/results`).

**Interfaces — Consumes:** `releaseSeasonResults`, `fetchResults`, `fetchCurrentSeason`, RLS release gate (Task 3). **Produces:** `releaseSeasonResults` sets `seasons.results_released_at = now()` and `status = 'released'` on that season's `closed` ballots.

- [ ] Tests: the gate (`results hidden before release`, `results visible after release`, `member cannot release`) is pinned in Task 3; this task adds UI only. Run `supabase test db` first; expected PASS.
- [ ] Implement: ManageBallotsPage "Release results" (confirm: `Members will see winners and nominees. This cannot be undone in the app.`). ResultsPage: before release shows `Results will be revealed at the ceremony.`; after, per main-ballot category in order: winner (bold, cream) and nominees, no counts.
- [ ] `npm run build`. Expected PASS. Manually: member account sees the placeholder, release, member sees winners.
- [ ] Commit: `git add client/src/pages/ResultsPage.tsx client/src/pages/committee/ManageBallotsPage.tsx client/src/api/ballots.ts client/src/App.tsx client/src/components/BallotCard.tsx && git commit -m "Add results release and member results page"`

### Task 16: Committee resets a name claim — SHOULD

**Files:** Modify `client/src/components/UserManagementModal.tsx`, `client/src/api/members.ts`.

**Interfaces — Consumes:** `reset_member_claim` (Task 2, already tested). **Produces:** `resetMemberClaim(name: string): Promise<void>`.

- [ ] Tests: both paths of `reset_member_claim` are pinned in Task 2; this task adds UI only.
- [ ] Implement: list the 14 members with claimed state; "Reset" on claimed rows with confirm.
- [ ] `npm run build`. Expected PASS.
- [ ] Commit: `git add client/src/components/UserManagementModal.tsx client/src/api/members.ts && git commit -m "Let committee reset member name claims"`

### Task 17: Stats page from recorded results — LATER-IF-TIME

**Files:** Modify `client/src/pages/StatsPage.tsx`.

**Interfaces — Consumes:** `nomineeStats` (Task 13), `fetchResults`.

- [ ] Logic is pinned in `stats.test.ts`. Replace hardcoded numbers with `nomineeStats` output after release (members: name, wins, noms, win %); hidden before release.
- [ ] `npm run build`. Expected PASS.
- [ ] Commit: `git add client/src/pages/StatsPage.tsx && git commit -m "Show season stats from recorded results"`
