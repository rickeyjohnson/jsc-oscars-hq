# Finish the Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Close the season: podium places stored with every recorded result, a committee "no going back" release page, a member Results page with per-category podiums, a real Stats page (podium leaderboard + "You"), a committee Member names screen with claim reset, the pre-ceremony polish list, and updated deploy/testing docs. Ceremony Dec 4 2026. This plan REPLACES Tasks 15, 16 and 17 of `docs/superpowers/plans/2026-11-19-voting-loop.md` (never built).

**Architecture:** One additive migration adds `results.places jsonb` (ordered podium/"also placed" list with places and tie flags, never vote counts), covered by the existing release-gated RLS on `results`. Places are computed in pure TypeScript (`client/src/lib/places.ts`) from the main-ballot tally plus the deciding round, and written whenever results are recorded (Record results, manual pick, one-off backfill). Release, results, stats and member-names screens are thin React pages over pure, vitest-pinned helpers (`release.ts`, `hold.ts`, `resultsView.ts`, `leaderboard.ts`, `memberNames.ts`) and `client/src/api/*` wrappers.

**Tech Stack:** Vite 7, React 19, TypeScript 5.9, Tailwind v4, react-router 7, supabase-js 2, vitest 3 (`environment: node`, only `src/**/*.test.ts`, so UI is not unit-tested), Supabase hosted project `fsuczxowirmsxtmzzsys` (no Docker, no Supabase CLI).

**Spec:** `docs/superpowers/specs/2026-11-19-voting-loop-design.md`; binding UI decisions in `.superpowers/sdd/2026-11-19-voting-loop/progress.md` (last lines) and mocks `.superpowers/brainstorm/97870-1795178196/content/podium-release-stats.html` (current, screens 1-3) and `finish-the-event.html` (screen 3 "Member names" only).

## Global Constraints

- Keep the app look: dark zinc `#18181b` page / `#27272a` cards / `#3f3f46` rows, cream `#fffadd` text, Poppins, rounded cards (`rounded-2xl`), pill buttons. No gradients anywhere in new screens.
- Podium blocks are flat matte colors, no gradients: 1st gold `#FFC23D` text `#3b2a00` (tallest, center), 2nd silver-blue `#9DB4D0` text `#17263a` (left), 3rd bronze-orange `#E8803A` text `#2b1204` (right). Block heights 92 / 66 / 48 px (mock).
- **Migrations:** the team has no Docker or CLI. The SQL file is committed in `supabase/migrations/`; the CONTROLLER applies it with the Supabase MCP `apply_migration` (file contents verbatim) or the user pastes it into the dashboard SQL editor. Implementers never touch the live DB.
- **DB tests:** `supabase/tests/database/*.test.sql` are run by the USER in the dashboard SQL editor. Pattern of `02_voting_rls.test.sql`: `begin; ... rollback;`, TAP lines collected in `public.__tap`, ids in `public.__ids` via `public.__id(k)`, never temp tables, final `select string_agg(line, E'\n' order by n) as tap from public.__tap;`. Needs the `tests` schema from `000-setup-tests-hooks.test.sql`; if DEPLOY §4 already dropped it, run the 000 file first and drop it again afterwards.
- Members never receive vote counts: no `votes` field in `places`, no tally on member screens. Results and places are readable by members only after `seasons.results_released_at` is set (RLS, already in place).
- Build gate for every task: `cd client && npm test && npm run build` exits 0.
- UI tasks (5, 6, 7, 8 and the UI parts of 9) need NO further user mock: the decisions above are binding. Each UI task ends with the CONTROLLER verifying in the browser pane (launch config `jsc-client`, seeded `[TEST]` accounts from `docs/TESTING.md`), on a 375px viewport.
- Stage only the task's own files in each commit.

## Review Focus

1. **Results leak before release.** Members must get 0 `results` rows (and so 0 `places`) until release; the Results and Stats pages must not render placeholders built from other data. Test (Task 1): `member reads no places before release` = 0 rows; `member reads places after release`. UI (Tasks 6, 7): both pages branch on `season.results_released_at` before fetching results.
2. **Vote counts never in the member payload.** DB check constraint rejects any `places` element with a `votes` key (Task 1 `places never carry vote counts`); `computePlaces` output has exactly the keys `nominee_id, slot, place, tied` (Task 2); `buildResultCards` JSON contains no `votes` (Task 6); `fetchResults` selects named columns only.
3. **Members writing or reading places via RLS.** Task 1: member `update results set places` changes nothing; committee write lives.
4. **Podium order stability.** Places are computed once at record time and stored; ties use `seededOrder` (FNV-1a, pinned values) so re-recording yields the same order; ties reorder only inside their tied group. Task 2 pins exact outputs.
5. **Group nominees in the podium.** Group display names ("Nick, Rickey") come from `nominees.display_name`; Stats credits each member once per category (`stats.ts`, unchanged). Tasks 6, 7 tests.
6. **Re-record overwriting later decisions.** `recordPlan` keeps skipping categories decided by a later round or by hand; skipped rows get no new places; backfill only fills `places is null` and never touches the winner (`updatePlaces` is an UPDATE of one column). Tasks 3 tests.
7. **Release with an open tiebreak or missing winner.** `runRelease` re-checks before writing, writes ballots FIRST and `seasons.results_released_at` LAST, and throws (no writes) when any check fails. Task 4 tests.
8. **Hold-to-release accidental triggers.** Touch scroll (move > 10 px), a second finger, early lift, blur or tab hide all cancel; done fires once. Task 4 `holdReducer` tests; Task 5 `touch-action: none`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `supabase/migrations/20261121000100_results_places.sql` | Adds `results.places jsonb` + shape/no-counts check |
| `supabase/tests/database/03_results_places.test.sql` | Places write/read gate and constraint tests |
| `client/src/database.types.ts` | `results.places: Json \| null` |
| `client/src/types.ts` | `Place`; `ResultRow.places?` |
| `client/src/lib/places.ts` | `seededOrder`, `computePlaces`, `attachPlaces`, `backfillPlaces`, `displayPlaces` |
| `client/src/lib/tallyView.ts` | `recordPlan` attaches places; `badgeFor` (Task 9) |
| `client/src/lib/release.ts` | `releaseChecks`, `runRelease` |
| `client/src/lib/hold.ts` | Press-and-hold state machine |
| `client/src/lib/resultsView.ts` | `ordinal`, `buildResultCards` |
| `client/src/lib/leaderboard.ts` | `leaderboard`, `myCategories` |
| `client/src/lib/memberNames.ts` | `memberSummary`, `resetWarning` |
| `client/src/api/results.ts` | `fetchResults` (+places), `upsertResults`, `updatePlaces`, `fetchReleaseStatus`, `releaseSeasonResults`, `fetchSeasonResults` |
| `client/src/api/members.ts` | `fetchMemberAvatars`, `resetMemberClaim`, `countVotesBy` |
| `client/src/components/Podium.tsx` | Shared 2-1-3 podium (results + stats) |
| `client/src/components/committee/TallyPanel.tsx` | Writes places; backfill button; polish |
| `client/src/pages/committee/ReleasePage.tsx` | `/app/profile/release` |
| `client/src/pages/ResultsPage.tsx` | `/app/results` |
| `client/src/pages/StatsPage.tsx` | Rewritten |
| `client/src/pages/committee/MemberNamesPage.tsx` | `/app/profile/members` |
| Modified | `App.tsx`, `ProfilePage.tsx`, `HomePage.tsx`, `BallotsPage.tsx`, `VotePage.tsx`, `BallotCard.tsx`, `NavigationTabs.tsx`, `ProfileSetup.tsx`, `BallotAdminPage.tsx`, `api/ballots.ts`, `docs/DEPLOY.md`, `docs/TESTING.md`, `supabase/manual/wipe_test_data.sql` |
| Deleted | `client/src/components/UserManagementModal.tsx` (fake data) |

Order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. Tasks 2, 4 and 8's pure parts have no DB dependency and may run before Task 1 is applied.

---

### Task 1: `results.places` migration and DB test

**Files:** Create `supabase/migrations/20261121000100_results_places.sql`, `supabase/tests/database/03_results_places.test.sql`. Modify `client/src/database.types.ts`.

**Interfaces — Consumes:** `results`, its RLS (`results_select_committee_or_released`, committee-only writes), `tests.*` helpers. **Produces:**
- `alter table public.results add column places jsonb;` (nullable; null = recorded before this migration).
- `alter table public.results add constraint results_places_shape check (places is null or (jsonb_typeof(places) = 'array' and not jsonb_path_exists(places, '$[*].votes')));`
- `comment on column public.results.places is 'Ordered [{nominee_id, slot 1..3|null, place, tied}]. Never vote counts.';`
- Header comment: "Additive. Apply with Supabase MCP apply_migration or paste in the dashboard SQL editor. Existing RLS on results covers the column."
- `database.types.ts`: add `places: Json | null` to `results.Row`, `places?: Json | null` to `Insert`/`Update` (hand edit; controller may regenerate with MCP `generate_typescript_types` after applying).

- [ ] Write the failing test (`begin; ... plan(8) ... rollback;`, 02 pattern). Setup as postgres: first `update members set user_id = null, claimed_at = null where name in ('Rickey','Micah');` (live DB names are claimed by real/seed users; rolled back), then `create_user` Rickey (make_committee) and Micah; own season `S` (unreleased); closed main ballot `M`; categories `E`, `E2`; nominees `nA`, `nB` in `E`, `nC` in `E2`. Places literal `P` = `jsonb_build_array(jsonb_build_object('nominee_id', public.__id('nA'), 'slot', 1, 'place', 1, 'tied', false), jsonb_build_object('nominee_id', public.__id('nB'), 'slot', 2, 'place', 2, 'tied', false))`.
```sql
select has_column('public', 'results', 'places', 'results.places exists');
-- as Rickey
select lives_ok($$ insert into results (category_id, decided_ballot_id, winner_nominee_id, nominee_ids, top3_nominee_ids, decided_by, places) values (E, M, nA, array[nA,nB], array[nA,nB], 'votes', P) $$, 'committee writes places');
select throws_ok($$ update results set places = '{"x":1}' where category_id = E $$, '23514', null, 'places must be an array');
select throws_ok($$ update results set places = '[{"nominee_id":"x","slot":1,"place":1,"tied":false,"votes":5}]' where category_id = E $$, '23514', null, 'places never carry vote counts');
select lives_ok($$ insert into results (category_id, decided_ballot_id, winner_nominee_id, nominee_ids, top3_nominee_ids, decided_by) values (E2, M, nC, array[nC], array[nC], 'votes') $$, 'places optional (rows recorded before the migration)');
-- as Micah, before release
select is((select count(*)::int from results where category_id in (E, E2)), 0, 'member reads no places before release');
update results set places = '[]'::jsonb where category_id = E;  -- RLS: 0 rows
-- as postgres
select is((select jsonb_array_length(places) from results where category_id = E), 2, 'member cannot change places');
-- as postgres: update seasons set results_released_at = now() where id = S; as Micah
select is((select places->0->>'nominee_id' from results where category_id = E), public.__id('nA')::text, 'member reads places after release');
```
(`E`, `M`, `nA`… stand for `public.__id('E')` etc.)
- [ ] Ask the user to run the test in the dashboard SQL editor. Expected FAIL: `not ok 1 - results.places exists` (and the insert with `places` errors: `column "places" of relation "results" does not exist`).
- [ ] Write the migration per Produces and the types edit. CONTROLLER applies the migration (MCP `apply_migration`, name `results_places`) after the user says yes.
- [ ] User re-runs the test. Expected PASS: `1..8`, all `ok`.
- [ ] `cd client && npm test && npm run build`. Expected PASS.
- [ ] Commit: `git add supabase/migrations/20261121000100_results_places.sql supabase/tests/database/03_results_places.test.sql client/src/database.types.ts && git commit -m "Add results.places for podium places"`

### Task 2: Places library (pure)

**Files:** Create `client/src/lib/places.ts`. Modify `client/src/types.ts`. Test `client/src/lib/places.test.ts`.

**Interfaces — Consumes:** `CategoryTally`, `tallyCategory` (`lib/tally.ts`), `ResultRow`. **Produces:**
```ts
// types.ts
export type Place = { nominee_id: string; slot: 1 | 2 | 3 | null; place: number; tied: boolean }
export type ResultRow = { ...existing fields; places?: Place[] | null }   // optional: existing tests keep passing
// places.ts
export function seededOrder(ids: string[], seed: string): string[]
export type PlaceDecision = { winnerId: string | null; roundTally?: CategoryTally | null }
export function computePlaces(mainTally: CategoryTally, decision: PlaceDecision, categoryId: string): Place[]
export function attachPlaces(row: ResultRow, mainTally: CategoryTally, roundTally: CategoryTally | null): ResultRow
export function backfillPlaces(results: ResultRow[], mainTallies: Record<string, CategoryTally>, roundTallies: Record<string, CategoryTally>): { category_id: string; places: Place[] }[]
export function displayPlaces(row: ResultRow): Place[]
```
Rules:
- `seededOrder`: sort ascending by FNV-1a 32-bit of `` `${seed}:${id}` `` (start `0x811c9dc5`; per UTF-16 unit `h ^= code; h = Math.imul(h, 0x01000193) >>> 0`), then by id. Input order never matters. Do not change after release (it is pinned below).
- `computePlaces`: split `mainTally.ranked` into groups of equal votes (desc), each group in `seededOrder(group, categoryId)`. No winner: sequence = those groups. With `winnerId`: group `[winner]` first (even if it has no votes); then "contenders" = `mainTally.leader_ids` minus the winner, grouped by `roundTally` votes desc (contenders absent from `roundTally` form a last group; with no `roundTally` all contenders are one group), each group seeded; then every other ranked nominee in its main group. Flatten: `slot` = index < 3 ? index + 1 : null; `place` = 1 + number of entries in earlier groups; `tied` = its group has ≥ 2 entries. Output objects have exactly these four keys.
- `attachPlaces` = `{ ...row, places: computePlaces(mainTally, { winnerId: row.winner_nominee_id, roundTally }, row.category_id) }`.
- `backfillPlaces`: for each row with `places == null` and a `mainTallies[category_id]`, `computePlaces(main, { winnerId: row.winner_nominee_id, roundTally: roundTallies[category_id] ?? null }, category_id)`; rows with places are skipped.
- `displayPlaces`: `row.places` when it is neither null nor undefined, else unique `[winner, ...nominee_ids, ...top3_nominee_ids]` (nulls dropped) mapped to `slot` by index (≤3), `place = index + 1`, `tied: false`.

- [ ] Failing tests (`v(counts)` as in `tally.test.ts`; `p(id, slot, place, tied)` builds a `Place`):
```ts
expect(seededOrder(["A","B","C","D"], "c1")).toEqual(["C","B","D","A"])
expect(seededOrder(["A","B","C","D"], "c2")).toEqual(["D","B","C","A"])
expect(seededOrder(["D","C","B","A"], "c1")).toEqual(["C","B","D","A"])
expect(seededOrder([], "c1")).toEqual([])
expect(computePlaces(tallyCategory("c1", v({ A: 5, B: 3, C: 3, D: 2, E: 1 })), { winnerId: "A" }, "c1"))
  .toEqual([p("A",1,1,false), p("C",2,2,true), p("B",3,2,true), p("D",null,4,false), p("E",null,5,false)])
expect(computePlaces(tallyCategory("c2", v({ A: 5, B: 3, C: 3, D: 2, E: 1 })), { winnerId: "A" }, "c2").map(x => x.nominee_id)).toEqual(["A","B","C","D","E"])
// tiebreak decided
expect(computePlaces(tallyCategory("c2", v({ A: 4, B: 4, C: 2 })), { winnerId: "B", roundTally: tallyCategory("c2", v({ B: 3, A: 1 }), ["A","B"]) }, "c2"))
  .toEqual([p("B",1,1,false), p("A",2,2,false), p("C",3,3,false)])
// committee round after a three-way tie (A lost the tiebreak, so it is absent from the committee round)
expect(computePlaces(tallyCategory("c1", v({ A: 4, B: 4, C: 4, D: 2 })), { winnerId: "C", roundTally: tallyCategory("c1", v({ C: 2 }), ["B","C"]) }, "c1"))
  .toEqual([p("C",1,1,false), p("B",2,2,false), p("A",3,3,false), p("D",null,4,false)])
// manual pick with no round: other leaders stay tied, seeded
expect(computePlaces(tallyCategory("c1", v({ A: 4, B: 4, C: 4, D: 2 })), { winnerId: "B" }, "c1"))
  .toEqual([p("B",1,1,false), p("C",2,2,true), p("A",3,2,true), p("D",null,4,false)])
// unresolved
expect(computePlaces(tallyCategory("c1", v({ A: 4, B: 4, C: 2 })), { winnerId: null }, "c1"))
  .toEqual([p("B",1,1,true), p("A",2,1,true), p("C",3,3,false)])
expect(computePlaces(tallyCategory("c1", []), { winnerId: "Z" }, "c1")).toEqual([p("Z",1,1,false)])
for (const x of computePlaces(tallyCategory("c1", v({ A: 2, B: 1 })), { winnerId: "A" }, "c1")) expect(Object.keys(x).sort()).toEqual(["nominee_id","place","slot","tied"])
const row = { category_id: "c2", decided_ballot_id: "T", winner_nominee_id: "B", nominee_ids: ["A","B"], top3_nominee_ids: ["A","B","C"], decided_by: "tiebreak" as const }
expect(attachPlaces(row, tallyCategory("c2", v({ A: 4, B: 4, C: 2 })), tallyCategory("c2", v({ B: 3, A: 1 }), ["A","B"]))).toEqual({ ...row, places: [p("B",1,1,false), p("A",2,2,false), p("C",3,3,false)] })
expect(backfillPlaces([{ ...row, places: null }, { ...row, category_id: "c3", places: [p("X",1,1,false)] }, { ...row, category_id: "c9", places: null }],
  { c2: tallyCategory("c2", v({ A: 4, B: 4, C: 2 })), c3: tallyCategory("c3", v({ X: 1 })) },
  { c2: tallyCategory("c2", v({ B: 3, A: 1 }), ["A","B"]) }).map(r => [r.category_id, r.places.map(x => x.nominee_id)]))
  .toEqual([["c2", ["B","A","C"]]])
expect(displayPlaces({ ...row, places: null })).toEqual([p("B",1,1,false), p("A",2,2,false), p("C",3,3,false)])
expect(displayPlaces({ ...row, places: [p("X",1,1,false)] })).toEqual([p("X",1,1,false)])
```
- [ ] `npm test`. Expected FAIL: `Failed to resolve import "./places"`.
- [ ] Implement per Interfaces.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Commit: `git add client/src/lib/places.ts client/src/lib/places.test.ts client/src/types.ts && git commit -m "Add podium places library"`

### Task 3: Write places whenever results are recorded, plus backfill

**Files:** Modify `client/src/lib/tallyView.ts`, `client/src/api/results.ts`, `client/src/components/committee/TallyPanel.tsx`. Test `client/src/lib/tallyView.test.ts`.

**Interfaces — Consumes:** Task 1 column, Task 2 `attachPlaces`, `backfillPlaces`, `tallyCategory`, `fetchAllVotes`, `fetchRoundBallots`, `fetchBallotDetail`. **Produces:**
- `recordPlan(round, ballotId, views, results, laterBallotIds, mainTallies?: Record<string, CategoryTally>): RecordPlan` — every row in `plan.rows` is `attachPlaces(row, mainTallies?.[id] ?? v.tally, round === "main" ? null : v.tally)`; skipping/overwrite rules unchanged; skipped categories get no row.
- `fetchResults` selects `places` too. `upsertResults(rows)` omits the `places` key when it is `undefined` (never nulls stored places). `updatePlaces(rows: { category_id: string; places: Place[] }[]): Promise<void>` — one `update({ places }).eq("category_id", id)` per row, throws on the first error; never writes other columns.
- TallyPanel: `load` also fetches main-ballot votes when the ballot is a round (`fetchAllVotes(mainId)`) and builds `mainTallies` = `tallyCategory(c.id, mainVotes)` per main category; "Record results" passes `mainTallies`; manual pick writes `attachPlaces(manualResult(...), mainTallies[c], ballot.round === "main" ? null : v.tally)`. On the MAIN ballot only, when any recorded result has `places == null`, show a secondary button `Fill in podium places (N)`: loads each round ballot's votes and detail, `roundTallies[c] = tallyCategory(c, roundVotes, roundNomineeIdsOf(c))` for the ballot that is each row's `decided_ballot_id`, then `updatePlaces(backfillPlaces(...))`, notice `Filled podium places for N categories.`

- [ ] Failing tests (fixture of `tallyView.test.ts`):
```ts
const plan = recordPlan("main", "M", views, {}, new Set())
expect(plan.rows.find(r => r.category_id === "c1")!.places!.map(x => [x.nominee_id, x.place, x.tied])).toEqual([["A",1,false],["C",2,true],["B",2,true],["D",4,false],["E",5,false]])
// tiebreak round: places come from the main tally, contenders by round votes
const tbViews = buildCategoryViews({ round: "tiebreak", categories: [cat("c2", 1, [nom("A"), nom("B")])], mainCategories: main, votes: votes("c2", { B: 3, A: 1 }), results: { c2: res("c2", { nominee_ids: ["A","B"], top3_nominee_ids: ["A","B","C"] }) }, committeeMemberIds: [] })
const tb = recordPlan("tiebreak", "T", tbViews, { c2: res("c2", { nominee_ids: ["A","B"], top3_nominee_ids: ["A","B","C"] }) }, new Set(), { c2: tallyCategory("c2", mainVotes) })
expect(tb.rows[0].places!.map(x => x.nominee_id)).toEqual(["B","A","C"])
// a category decided by a later round keeps its row (and places) untouched
expect(recordPlan("main", "M", views, { c1: res("c1", { decided_ballot_id: "T", winner_nominee_id: "B" }) }, new Set(["T"])).rows.map(r => r.category_id)).not.toContain("c1")
```
- [ ] `npm test`. Expected FAIL: `places` undefined on recorded rows.
- [ ] Implement per Interfaces.
- [ ] `npm test && npm run build`. Expected PASS. Controller, in the browser with the seed: Tie Practice → Record results; in the Table Editor `results.places` for Clear Winner is `[A1, A2, A3]` with places 1, 2, 3.
- [ ] Commit: `git add client/src/lib/tallyView.ts client/src/lib/tallyView.test.ts client/src/api/results.ts client/src/components/committee/TallyPanel.tsx && git commit -m "Record podium places with every result and add backfill"`

### Task 4: Release checks, safe release order, hold state machine (pure + API)

**Files:** Create `client/src/lib/release.ts`, `client/src/lib/hold.ts`. Modify `client/src/api/results.ts`. Test `client/src/lib/release.test.ts`, `client/src/lib/hold.test.ts`.

**Interfaces — Consumes:** `Ballot`, `Season`, `ResultRow`, `fetchBallotDetail`. **Produces:**
```ts
// release.ts
export type ReleaseCheck = { id: "ballots_closed" | "no_round_open" | "winners"; label: string; ok: boolean }
export type ReleaseStatus = { season: Season; ballots: Ballot[]; mainCategoryIds: string[]; results: Record<string, ResultRow> }
export function releaseChecks(s: Omit<ReleaseStatus, "season">, now: Date): { checks: ReleaseCheck[]; ready: boolean }
export type ReleaseIO = { load(seasonId: string): Promise<ReleaseStatus>; releaseBallots(seasonId: string, nowIso: string): Promise<void>; markSeasonReleased(seasonId: string, nowIso: string): Promise<boolean> }
export async function runRelease(io: ReleaseIO, seasonId: string, now: Date): Promise<void>
// hold.ts
export const HOLD_MS = 3000
export const MOVE_TOLERANCE_PX = 10
export type HoldState = { phase: "idle" | "holding" | "done"; startedAt: number | null; pointerId: number | null; x: number; y: number }
export type HoldEvent =
  | { type: "down"; t: number; pointerId: number; x: number; y: number }
  | { type: "move"; pointerId: number; x: number; y: number }
  | { type: "up"; pointerId: number }
  | { type: "cancel" }
  | { type: "tick"; t: number }
export const HOLD_IDLE: HoldState
export function holdReducer(s: HoldState, e: HoldEvent): HoldState
export function holdProgress(s: HoldState, now: number): number   // 0..1
// api/results.ts
export const fetchReleaseStatus = (seasonId: string): Promise<ReleaseStatus>
export const releaseSeasonResults = (seasonId: string): Promise<void>  // runRelease(realIO, seasonId, new Date())
```
Rules: drafts are ignored everywhere. A ballot has ended when status is `closed`/`released`, or `open` with `closes_at <= now`. `ballots_closed` = main ballots, label `` `${ended} of ${total} ballots closed` ``, ok iff total > 0 and all ended. `no_round_open` = tiebreak/committee ballots not ended, ok label `No tiebreak or committee round open`, else `` `${n} tiebreak/committee round(s) still open` ``. `winners` = `mainCategoryIds` with a non-null recorded winner, label `` `${w} of ${n} categories have a winner` ``, ok iff n > 0 and w = n. `runRelease`: load; throw `Results are already released` if `season.results_released_at`; throw `` `Not ready to release: ${failing labels joined by "; "}` `` if not ready (no writes); then `releaseBallots` (closed → released, open-and-ended → released) FIRST; then `markSeasonReleased` LAST (real IO: `update seasons set results_released_at where id = ? and results_released_at is null` with `.select("id")`, returns `rows.length === 1`); false ⇒ throw `Release did not save. Check you are signed in as committee.` `fetchReleaseStatus`: season row, all season ballots (committee sees drafts), main non-draft ballots' category ids via `fetchBallotDetail`, `fetchResults`. `holdReducer`: `down` from idle → holding (stores t, pointer, x, y); `down` with another pointer while holding → idle (multi-touch); `move` of the held pointer farther than `MOVE_TOLERANCE_PX` (Euclidean) → idle; `up` of the held pointer before done → idle; `cancel` → idle; `tick` with `t - startedAt >= HOLD_MS` → done; `done` ignores everything.

- [ ] Failing tests (`now = new Date("2026-12-04T19:00:00Z")`; `b(id, round, status, closes)`; `res(id, winner)`):
```ts
const M = b("M", "main", "closed", "2026-12-03T00:00:00Z"), D = b("D", "main", "draft", "2026-12-09T00:00:00Z")
const T = b("T", "tiebreak", "open", "2026-12-05T00:00:00Z")
expect(releaseChecks({ ballots: [M, D, T], mainCategoryIds: ["c1","c2"], results: { c1: res("c1","A"), c2: res("c2", null) } }, now)).toEqual({ ready: false, checks: [
  { id: "ballots_closed", ok: true, label: "1 of 1 ballots closed" },
  { id: "no_round_open", ok: false, label: "1 tiebreak/committee round(s) still open" },
  { id: "winners", ok: false, label: "1 of 2 categories have a winner" } ] })
const T2 = { ...T, closes_at: "2026-12-04T18:00:00Z" }
expect(releaseChecks({ ballots: [M, T2], mainCategoryIds: ["c1","c2"], results: { c1: res("c1","A"), c2: res("c2","B") } }, now).ready).toBe(true)
expect(releaseChecks({ ballots: [], mainCategoryIds: [], results: {} }, now).checks.map(c => c.ok)).toEqual([false, true, false])
// runRelease with a fake IO recording calls
await runRelease(fakeIO(readyStatus, calls), "S", now); expect(calls).toEqual(["load", "releaseBallots", "markSeasonReleased"])
await expect(runRelease(fakeIO(notReady, calls2), "S", now)).rejects.toThrow("Not ready to release: 1 tiebreak/committee round(s) still open; 1 of 2 categories have a winner"); expect(calls2).toEqual(["load"])
await expect(runRelease(fakeIO({ ...readyStatus, season: { ...season, results_released_at: "2026-12-04T20:00:00Z" } }, calls3), "S", now)).rejects.toThrow("Results are already released"); expect(calls3).toEqual(["load"])
await expect(runRelease(fakeIO(readyStatus, calls4, { marked: false }), "S", now)).rejects.toThrow("Release did not save. Check you are signed in as committee.")
await expect(runRelease(fakeIO(readyStatus, calls5, { ballotsFail: true }), "S", now)).rejects.toThrow(); expect(calls5).not.toContain("markSeasonReleased")
// hold.ts
const down = (s, t = 0, id = 1, x = 0, y = 0) => holdReducer(s, { type: "down", t, pointerId: id, x, y })
expect(holdReducer(down(HOLD_IDLE), { type: "tick", t: 2999 }).phase).toBe("holding")
expect(holdReducer(down(HOLD_IDLE), { type: "tick", t: 3000 }).phase).toBe("done")
expect(holdProgress(down(HOLD_IDLE), 1500)).toBeCloseTo(0.5)
expect(holdReducer(down(HOLD_IDLE), { type: "up", pointerId: 1 })).toEqual(HOLD_IDLE)
expect(down(down(HOLD_IDLE), 100, 2).phase).toBe("idle")
expect(holdReducer(down(HOLD_IDLE), { type: "move", pointerId: 1, x: 0, y: 11 }).phase).toBe("idle")
expect(holdReducer(down(HOLD_IDLE), { type: "move", pointerId: 1, x: 6, y: 6 }).phase).toBe("holding")
const done = holdReducer(down(HOLD_IDLE), { type: "tick", t: 3000 }); expect(holdReducer(done, { type: "cancel" }).phase).toBe("done")
expect(holdProgress(HOLD_IDLE, 5000)).toBe(0)
```
- [ ] `npm test`. Expected FAIL: modules not found.
- [ ] Implement per Interfaces; replace the old `releaseSeasonResults` body (which set the season first).
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Commit: `git add client/src/lib/release.ts client/src/lib/release.test.ts client/src/lib/hold.ts client/src/lib/hold.test.ts client/src/api/results.ts && git commit -m "Add release checks, safe release order and hold state machine"`

### Task 5: Committee release page (UI)

**Files:** Create `client/src/pages/committee/ReleasePage.tsx`. Modify `client/src/App.tsx`, `client/src/pages/ProfilePage.tsx`.

**Interfaces — Consumes:** `fetchCurrentSeason`, `fetchReleaseStatus`, `releaseChecks`, `releaseSeasonResults`, `holdReducer`, `holdProgress`, `HOLD_IDLE`, `HOLD_MS`. **Produces:** route `/app/profile/release` = `committeeRoute(<ReleasePage />)`; ProfilePage committee button `Release results` (icon `Trophy`) → that route. No mock needed (binding: mock screen 2); controller verifies in browser.

- [ ] Tests: logic pinned in Task 4; this task is UI only. Run `npm test`. Expected PASS (baseline).
- [ ] Implement. Full page, `bg-zinc-900`, NO `NavigationTabs`, centered column max-w-md, no gradients. Content top to bottom: `THE ENVELOPE` (dim, letter-spaced), `Reveal the winners?` (24px), copy `Every member will see every winner and every podium.` + bold `There is no going back.`; checklist rows (`#27272a`, rounded) for the three `releaseChecks` items (green `✓` / amber `✕` + label) plus a static row `✓ Members never see vote counts`; checks recomputed on load and every 30 s with `new Date()`. Hold button (h-12, rounded-full, cream border, fill = `holdProgress` width in `#fffadd33`, label `Hold to release`, under it `Press and hold for 3 seconds`): pointer events (`onPointerDown/Move/Up/Cancel/Leave`, `setPointerCapture`), `requestAnimationFrame` ticks while holding, `style={{ touchAction: "none" }}`, `select-none`, `onContextMenu` preventDefault; keyboard: Space/Enter `keydown` (ignore `e.repeat`) = down with `pointerId: -1`, `keyup` = up; `window` `blur` and `visibilitychange` (hidden) dispatch `cancel`. Disabled (`aria-disabled`, no events, opacity 50) until `ready`, with the failing labels listed under it in amber. When phase becomes `done`, call `releaseSeasonResults` once (ref guard); show `Releasing…`; on error show the message in red, reset to idle. `← Not yet, take me back` link to `/app/profile`. Success state (also shown on load when the season is already released): `THE ENVELOPE IS OPEN`, `The winners are live for every member.`, cream button `See the results` → `/app/results`, link `Back to profile`. Loading and load-error (with Retry) states.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller browser check (seed, as `test.rickey`): blocked with Tie Practice open rounds/missing winners; reasons listed; short press does nothing; scrolling on the button cancels; after closing `[TEST] Main Ballot` and deciding every category (steps 1-4 of the TESTING section written in Task 10; the controller follows them from this plan if Task 10 is not done yet), hold 3 s releases and shows the envelope state. Then un-release with the SQL in DEPLOY (Task 10).
- [ ] Commit: `git add client/src/pages/committee/ReleasePage.tsx client/src/App.tsx client/src/pages/ProfilePage.tsx && git commit -m "Add full-page hold-to-release for results"`

### Task 6: Member results page with podiums

**Files:** Create `client/src/lib/resultsView.ts`, `client/src/components/Podium.tsx`, `client/src/pages/ResultsPage.tsx`. Modify `client/src/api/results.ts`, `client/src/api/members.ts`, `client/src/App.tsx`, `client/src/components/BallotCard.tsx`, `client/src/pages/HomePage.tsx`, `client/src/pages/ProfilePage.tsx`. Test `client/src/lib/resultsView.test.ts`.

**Interfaces — Consumes:** `displayPlaces` (Task 2), `fetchResults` (+places), `fetchBallotDetail`, `fetchCurrentSeason`. **Produces:**
```ts
export function ordinal(n: number): string
export type PodiumEntry = { nominee_id: string; name: string; slot: 1 | 2 | 3; tieLabel: string | null; memberIds: string[] }
export type ResultCard = { category_id: string; number: number; name: string; podium: PodiumEntry[]; also: { nominee_id: string; name: string; placeLabel: string }[]; note: string | null; pending: boolean }
export function buildResultCards(categories: Category[], results: Record<string, ResultRow>): ResultCard[]
// api
export type SeasonResults = { categories: Category[]; results: Record<string, ResultRow> }
export const fetchSeasonResults = (seasonId: string): Promise<SeasonResults>   // main, non-draft ballots of the season ordered by opens_at; their categories in sort_order
export const fetchMemberAvatars = (): Promise<Record<string, string | null>>   // member id -> profiles.image_url
// components/Podium.tsx
type PodiumItem = { key: string; slot: 1 | 2 | 3; name: string; sub?: string | null; avatarUrl?: string | null }
export default function Podium(props: { items: PodiumItem[] })
```
Rules: `podium` = places with slot 1-3, in display order slot 2, 1, 3 (missing slots omitted); `tieLabel` = `tied ${ordinal(place)}` when tied; `also` = places with slot null, `placeLabel` = tied ? `tied ${ordinal(place)}` : `ordinal(place)`; `note` by `decided_by`: `tiebreak` → `Winner decided by tiebreak`, `committee_vote` → `Winner decided by committee vote`, `manual` → `Winner picked by the committee`, else null; `pending` = no row or no winner (podium/also empty); `number` = index + 1; names from the category's nominees (`Unknown nominee` if missing); group names are their `display_name`.

- [ ] Failing tests (category `c1` nominees A..E named Ann, Bo, Cy, Di, Ed; `c2` any category; `duo` with group nominees `g1` "Nick, Rickey" and `g2` "Kadin, Rico"; `row(cat, winner, decided_by)` = result with `nominee_ids: [winner]`, `top3_nominee_ids: [winner]`, no `places`; `p` as in Task 2):
```ts
expect(["1st","2nd","3rd","4th","11th","12th","13th","21st","22nd","23rd","101st"]).toEqual([1,2,3,4,11,12,13,21,22,23,101].map(ordinal))
const [card] = buildResultCards([c1], { c1: { ...row("c1", "A", "votes"), places: [p("A",1,1,false), p("C",2,2,true), p("B",3,2,true), p("D",null,4,false), p("E",null,5,false)] } })
expect(card.podium.map(e => [e.name, e.slot, e.tieLabel])).toEqual([["Cy",2,"tied 2nd"],["Ann",1,null],["Bo",3,"tied 2nd"]])
expect(card.also).toEqual([{ nominee_id: "D", name: "Di", placeLabel: "4th" }, { nominee_id: "E", name: "Ed", placeLabel: "5th" }])
expect(card.note).toBeNull()
expect(buildResultCards([c1], { c1: { ...row("c1", "B", "tiebreak"), places: null, nominee_ids: ["A","B"], top3_nominee_ids: ["A","B","C"] } })[0].podium.map(e => [e.name, e.slot, e.tieLabel])).toEqual([["Ann",2,null],["Bo",1,null],["Cy",3,null]])
expect(buildResultCards([c1], { c1: row("c1", "B", "tiebreak") })[0].note).toBe("Winner decided by tiebreak")
expect(buildResultCards([c1], { c1: row("c1", "B", "committee_vote") })[0].note).toBe("Winner decided by committee vote")
expect(buildResultCards([c1], { c1: row("c1", "B", "manual") })[0].note).toBe("Winner picked by the committee")
expect(buildResultCards([c1, c2], {})).toMatchObject([{ number: 1, pending: true, podium: [] }, { number: 2, pending: true }])
expect(buildResultCards([duo], { duo: { ...row("duo", "g1", "votes"), places: [p("g1",1,1,false), p("g2",2,2,false)] } })[0].podium.map(e => e.name)).toEqual(["Kadin, Rico", "Nick, Rickey"])
expect(JSON.stringify(buildResultCards([c1], { c1: row("c1", "A", "votes") }))).not.toContain("votes\"")
```
- [ ] `npm test`. Expected FAIL: module not found.
- [ ] Implement. `/app/results` (auth only, `UserDataProvider` + `WithAuth`, `NavigationTabs activeTab="results"`). Load season; if `results_released_at` is null: members see only centered `Results will be revealed at the ceremony.` (no results fetch); committee sees the same line plus a `Preview (only the committee can see this)` banner above the cards. After release: header `THE WINNERS` (dim, letter-spaced) + season name; one `#27272a` card per `ResultCard`: `${number} · ${NAME}` dim uppercase, `Podium` (blocks per Global Constraints, 1st center tallest, name bold for slot 1, `tieLabel` small under the name, avatar circle when the nominee has exactly one member id and an avatar), `ALSO PLACED` rows (`#3f3f46`, chip with `placeLabel`), `note` centered dim; `pending` cards show `No winner recorded`. No vote counts anywhere. Entry points: `BallotCard` action for `status === "released"` = `View Results` → `/app/results`; HomePage shows a cream card `The winners are in` → `/app/results` when the season is released; ProfilePage `View Results` → `/app/results`.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller browser check: as `test.micah` before release: only the placeholder, and the network tab shows no `results` request; after a test release: podium cards in ballot order, tied tags, group names, `Winner decided by tiebreak` on Two-Way Tie; reload keeps the same order.
- [ ] Commit: `git add client/src/lib/resultsView.ts client/src/lib/resultsView.test.ts client/src/components/Podium.tsx client/src/pages/ResultsPage.tsx client/src/api/results.ts client/src/api/members.ts client/src/App.tsx client/src/components/BallotCard.tsx client/src/pages/HomePage.tsx client/src/pages/ProfilePage.tsx && git commit -m "Add member results page with podiums"`

### Task 7: Stats page (podium leaderboard and You card)

**Files:** Create `client/src/lib/leaderboard.ts`. Modify `client/src/pages/StatsPage.tsx`. Test `client/src/lib/leaderboard.test.ts`.

**Interfaces — Consumes:** `nomineeStats`, `Tally` (`stats.ts`), `fetchSeasonResults`, `fetchMemberAvatars`, `fetchMembers`, `fetchCurrentSeason`, `Podium`, `useUserData().member`. **Produces:**
```ts
export type LeaderRow = { member_id: string; name: string; wins: number; noms: number; rate: number; rank: number; tied: boolean }
export function leaderboard(stats: Record<string, Tally>, members: Member[]): LeaderRow[]
export type MyCategory = { category_id: string; label: string }
export function myCategories(categories: Category[], results: Record<string, ResultRow>, memberId: string, members: Member[]): { won: MyCategory[]; nominatedOnly: MyCategory[] }
```
Rules: every member appears (missing stats = 0/0); `rate` = noms ? `Math.round(100 * wins / noms)` : 0; sort wins desc, rate desc, name asc; `rank` = 1 + members with strictly more wins; `tied` = another row shares the rank. `myCategories` in category order: a category is `won` when the winner nominee's `member_ids` contains `memberId`, `nominatedOnly` when any nominee in `nominee_ids` (or the winner) contains it and it is not won; `label` = category name, plus `` ` (with ${other member names, sorted, joined ", "})` `` for multi-member nominees. Same one-per-category rule as `nomineeStats`.

- [ ] Failing tests (members Anthony, Evan, Micah, Nick, Rico with ids `m-<name>`):
```ts
const rows = leaderboard({ "m-Micah": { wins: 2, noms: 3 }, "m-Nick": { wins: 2, noms: 2 }, "m-Rico": { wins: 1, noms: 4 }, "m-Evan": { wins: 0, noms: 1 } }, members)
expect(rows.map(r => [r.name, r.rank, r.tied, r.rate])).toEqual([["Nick",1,true,100],["Micah",1,true,67],["Rico",3,false,25],["Anthony",4,true,0],["Evan",4,true,0]])
// Anthony (0/0, rate 0) and Evan (0/1, rate 0): equal wins and rate, so name order
const mine = myCategories([locs, duo, car], { locs: r("locs", "n-rico", ["n-rico","n-nick"]), duo: r("duo", "g-nick-rico", ["g-nick-rico","g-evan-tj"]), car: r("car", "n-nick", ["n-nick","n-rico"]) }, "m-Rico", members)
expect(mine.won.map(c => c.label)).toEqual(["Best Locs", "Best Duo (with Nick)"])
expect(mine.nominatedOnly.map(c => c.label)).toEqual(["Best Car"])
expect(myCategories([locs], {}, "m-Rico", members)).toEqual({ won: [], nominatedOnly: [] })
```
- [ ] `npm test`. Expected FAIL: module not found.
- [ ] Implement. Replace the whole StatsPage body (remove the fake year filter and hard-coded numbers). Before release: `Stats appear after the reveal.` (no results fetch). After: card `Season leaders` with season-name chip, `Podium` of the first three rows (`sub` = `N wins`, `tied` shown as small `tied` tag), then rows for the rest: rank, avatar, name, `wins · noms · rate%` (header line `Wins · Nominations · Win %`), first 5 visible then `+ N more ▾`. "You" card for `member` (hidden if the user has no member): title `You (${name})`, three tiles wins / noms / win rate, `CATEGORIES YOU WON` rows with a gold `Winner` chip (empty: `No wins this season.`), and a collapsed `Nominated, didn't win (N) ▾` list. Stats only from `nomineeStats(Object.values(results), nomineesById).members`.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller browser check after a test release: leaderboard podium + list; "You" for `test.micah` matches the Results page.
- [ ] Commit: `git add client/src/lib/leaderboard.ts client/src/lib/leaderboard.test.ts client/src/pages/StatsPage.tsx && git commit -m "Show season stats with podium leaderboard"`

### Task 8: Committee member names screen

**Files:** Create `client/src/lib/memberNames.ts`, `client/src/pages/committee/MemberNamesPage.tsx`. Modify `client/src/api/members.ts`, `client/src/App.tsx`, `client/src/pages/ProfilePage.tsx`. Delete `client/src/components/UserManagementModal.tsx`. Test `client/src/lib/memberNames.test.ts`.

**Interfaces — Consumes:** `reset_member_claim(p_name)` (raises `committee only` for members; unlinks and deletes that account's votes — pinned in `01_members_roles` and `02_voting_rls`), `fetchMembers`, `useUserData().member`. **Produces:** `memberSummary(members: Member[]): string`; `resetWarning(name: string, voteCount: number): string`; `resetMemberClaim(name: string): Promise<void>` (rpc); `countVotesBy(userId: string): Promise<number>` (`select("id", { count: "exact", head: true }).eq("voter_id", userId)`); route `/app/profile/members` = `committeeRoute(<MemberNamesPage />)`.

- [ ] Failing tests:
```ts
expect(memberSummary([m("Anthony", "u1"), m("Demichael", null), m("Micah", "u2")])).toBe("3 names · 2 signed up")
expect(resetWarning("Micah", 31)).toBe("This deletes Micah's 31 votes and frees the name so they can sign up again. Their login also has to be deleted in Supabase (Auth → Users).")
expect(resetWarning("Micah", 1)).toContain("Micah's 1 vote and")
expect(resetWarning("Micah", 0)).toContain("Micah's 0 votes")
```
- [ ] `npm test`. Expected FAIL: module not found.
- [ ] Implement (mock: `finish-the-event.html` screen 3). Page with back link to `/app/profile`, title `Member names`, `memberSummary` line, one `#3f3f46` row per member (all 14, by name): name (dim when available), chip `signed up` / `available`, `Reset` on claimed rows except your own (own row shows `You`). Reset opens an inline card (red border `#7f1d1d`): `Reset ${name}?`, `resetWarning(name, await countVotesBy(user_id))` (count loads when opened), red `Reset claim` and `Cancel`. On confirm: `resetMemberClaim`, reload, notice `${name} can sign up again. Delete their login in Supabase → Authentication → Users.`; errors shown in red. ProfilePage: `User Management` button → `/app/profile/members`; remove the modal import, state and render.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller browser check: as `test.rickey`, Reset on a seed member shows the vote count; confirm; the row turns `available`; re-seed afterwards if needed.
- [ ] Commit: `git add client/src/lib/memberNames.ts client/src/lib/memberNames.test.ts client/src/pages/committee/MemberNamesPage.tsx client/src/api/members.ts client/src/App.tsx client/src/pages/ProfilePage.tsx client/src/components/UserManagementModal.tsx && git commit -m "Add committee member names screen with claim reset"`

### Task 9: Pre-ceremony polish (deferred minors)

**Files:** Modify `client/src/pages/VotePage.tsx`, `client/src/components/NavigationTabs.tsx`, `client/src/api/ballots.ts`, `client/src/pages/committee/BallotAdminPage.tsx`, `client/src/components/committee/TallyPanel.tsx`, `client/src/lib/tallyView.ts`, `client/src/pages/HomePage.tsx`, `client/src/components/ProfileSetup.tsx`, `client/src/pages/BallotsPage.tsx`. Test `client/src/lib/voting.test.ts`, `client/src/lib/tallyView.test.ts`.

**Interfaces — Produces:** `NavigationTabs` gains optional `children` rendered inside its fixed container above the tabs; `type BadgeKey = Badge | "in_tiebreak" | "in_committee"`; `badgeFor(v: CategoryView, roundByCategory: Record<string, "tiebreak" | "committee">): BadgeKey` (main-ballot `tiebreak`/`committee` badge with a round containing that category → `in_<round>`; anything else unchanged).

- [ ] Failing tests:
```ts
expect(nextUnvotedIndex(["a","b","c"], {}, -1)).toBe(0)
expect(nextUnvotedIndex(["a","b","c"], { a: "x" }, -1)).toBe(1)
expect(badgeFor({ ...view, badge: "tiebreak" }, { c2: "tiebreak" })).toBe("in_tiebreak")
expect(badgeFor({ ...view, badge: "tiebreak" }, { c2: "committee" })).toBe("in_committee")
expect(badgeFor({ ...view, badge: "tiebreak" }, {})).toBe("tiebreak")
expect(badgeFor({ ...view, badge: "winner" }, { c2: "tiebreak" })).toBe("winner")
```
(`view` = the `c2` view of the `tallyView.test.ts` fixture.)
- [ ] `npm test`. Expected FAIL: `badgeFor` not exported.
- [ ] Implement:
  - VotePage: bottom bar moves into `<NavigationTabs activeTab="ballots">{bar}</NavigationTabs>` (delete `bottom-[76px]`); `jump` uses `block: "start"` and cards get `scroll-mt-14`; `jumpNextUnvoted` passes `ids.indexOf(activeId ?? "")` (no `Math.max(0, …)`) so index 0 is reachable; dash buttons `min-w-[10px] py-3` (≥ 24 px tall hit area).
  - `saveBallotDraft` update: `.eq("id", id).eq("status", "draft").select("id")`; 0 rows → throw `Only draft ballots can be rewritten`.
  - BallotAdminPage `changeStatus`: return early when `status === "open" && blockers.length > 0`.
  - TallyPanel: amber note `No committee members found. Every tie left after a tiebreak will need a manual pick. Check profiles.is_committee.` when `committeeMemberIds` is empty; badge via `badgeFor` with labels `In tiebreak` / `In committee round` (build `roundByCategory` from each round ballot's `fetchBallotDetail` categories, later round wins).
  - `createRoundBallot`: capture the rollback delete error; message `` `Couldn't save the round's nominees (${rnError.message}). ${delError ? `The half-made round ballot ${id} is still there; delete it in Manage Ballots.` : "The round was removed; try again."}` ``.
  - HomePage `handleProfileSetupComplete` sets `true`. ProfileSetup `handleImageSubmission`: `try { … } catch { setUploadError("Couldn't save your photo. Try again, or skip for now.") } finally { setLoading(false) }`, including the `!url` path.
  - BallotsPage: error state shows a `Retry` button that refetches (reload key).
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller browser check (375px): vote page bottom bar sits flush above the tabs, Jump to next reaches the first category, tapped dash scrolls the card to the top below the strip.
- [ ] Commit: `git add client/src/pages/VotePage.tsx client/src/components/NavigationTabs.tsx client/src/api/ballots.ts client/src/pages/committee/BallotAdminPage.tsx client/src/components/committee/TallyPanel.tsx client/src/lib/tallyView.ts client/src/lib/tallyView.test.ts client/src/lib/voting.test.ts client/src/pages/HomePage.tsx client/src/components/ProfileSetup.tsx client/src/pages/BallotsPage.tsx && git commit -m "Pre-ceremony polish: vote page, guards, tally badges, retry"`

### Task 10: Docs and test-data scripts

**Files:** Modify `docs/DEPLOY.md`, `docs/TESTING.md`, `supabase/manual/wipe_test_data.sql`.

**Interfaces — Consumes:** everything above. Facts to rely on: `results.category_id → categories` and `results.decided_ballot_id → ballots` are `on delete cascade`, `categories.ballot_id → ballots` cascades, so deleting `[TEST]` ballots removes their `results` rows and `places`. The test ballots live in the REAL season `JSC Oscars Fall 2026`, so a practice release sets the real season's `results_released_at`.

- [ ] Failing check: in `docs/TESTING.md` there is no `Release` section and `wipe_test_data.sql` never resets `seasons.results_released_at` (`grep -c results_released_at supabase/manual/wipe_test_data.sql` → `0`).
- [ ] Implement:
  - `wipe_test_data.sql`: after deleting test ballots, `update public.seasons set results_released_at = null` for seasons with no remaining `released` ballot whose name is not `[TEST]%`; otherwise `raise warning 'Season % has real released ballots; release left as is.'` (so the wipe can never un-release the real ceremony). Verification select adds `(select count(*) from public.results r join public.categories c on c.id = r.category_id join public.ballots b on b.id = c.ballot_id where b.name like '[TEST]%') as test_results -- 0` and `(select count(*) from public.seasons where results_released_at is not null) as released_seasons -- 0 before the ceremony`.
  - `TESTING.md` new section "Results, release and stats" using `[TEST] Tie Practice`: (1) as committee, Tie Practice → Record results; Clear Winner podium A1/A2/A3; (2) create the tiebreak round for Two-Way and Three-Way Tie, vote as members (Two-Way: break it; Three-Way: leave tied → committee round → vote as Rickey and Kadin, or manual pick); (3) No Votes: manual pick; (4) `[TEST] Main Ballot`: Close now, Record results, resolve its ties by manual pick (the release check needs every main ballot closed and every category decided); (5) Release page: blocked state shows reasons; short press and scroll do nothing; hold 3 s; envelope state; (6) as `test.micah`: Results shows podiums, tied tags, `Winner decided by tiebreak`, no counts, same order after reload; Stats shows leaderboard and You card; (7) Member names: reset a test member, then re-run the seed if needed; (8) UN-RELEASE (mandatory before real voting): run `wipe_test_data.sql`, or the SQL `update seasons set results_released_at = null where name = 'JSC Oscars Fall 2026'; update ballots set status = 'closed' where status = 'released';`.
  - `DEPLOY.md`: new step in §4 "Apply `20261121000100_results_places.sql` (MCP or SQL editor) and run `03_results_places.test.sql` (needs the `tests` schema: run 000 first if it was dropped, then drop again)"; §7 Real launch: replace "When closed" with the ceremony flow: close the ballot → Record results → tiebreak/committee/manual → if any category was recorded before the migration, main ballot → `Fill in podium places` → Profile → Release results (checklist, hold 3 s) → members open Results; a "Release went wrong" note: `Not ready` errors list the reason; a half-done release (ballots `released` but season not) is safe and retrying finishes it; undoing a real release is SQL only (`update seasons set results_released_at = null …`) and members may already have seen winners; and the member-names reset procedure (Reset in app, then delete the login in Authentication → Users), replacing the old SQL-only recovery.
- [ ] Check passes: `grep -c results_released_at supabase/manual/wipe_test_data.sql` ≥ 1; both docs mention `Hold to release` and `Fill in podium places`. Controller reads the wipe SQL; the USER runs it in the dashboard after the practice release and confirms `released_seasons = 0`, `test_results = 0`.
- [ ] Commit: `git add docs/DEPLOY.md docs/TESTING.md supabase/manual/wipe_test_data.sql && git commit -m "Document release flow and reset release in test wipe"`
