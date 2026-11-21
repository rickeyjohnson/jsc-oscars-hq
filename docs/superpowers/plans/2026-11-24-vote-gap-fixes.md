# Vote flow: gap fixes against the approved mock

Source of truth: `.superpowers/brainstorm/99508-1795180704/content/vote-mechanics.html` (states a-f, proposed rules).
Compared with: `client/src/pages/VotePage.tsx`, `components/vote/{CategoryVoteCard,GroupSheet,ReviewStep}.tsx`,
`ui/ProgressStrip.tsx`, `ui/logic/progress.ts`, `lib/voting.ts`, `api/votes.ts`, `supabase/migrations/20261120000300_voting_fixes.sql`,
tests `pages/VotePage.test.tsx`, `lib/voting.test.ts`, `ui/__tests__/progress.test.ts`.

Run all tests with `cd client && npx vitest run`. Every task ends green and with `npx tsc -b` clean.
**RISKY** = touches the live save queue, error classification, read-only detection, or group creation. Do these with TDD,
one commit each, and do not change `api/votes.ts` call shapes or the per-category `chains`/`seqs`/`confirmed` refs semantics.

---

## Gap list

Severity: **H** = wrong behavior or an explicit user request; **M** = visible mismatch or real a11y problem; **L** = polish or a decision to confirm.

### Behavioral
- **H-B1 Closed-by-hand reads as a self-vote error.** RLS denial (42501) is mapped to `rule` ("You can't vote for yourself...") even when the committee closed the ballot early (`status` changed, `closes_at` still in the future). `classifySaveError` only checks `closes_at`.
- **H-B2 add_nominee errors are unclassified.** RPC raises P0001 text: `ballot is not open` -> shows generic "Something went wrong" *with Try again* (should be closed, no retry); `a group needs at least two different members`, `a different nominee with this name already exists`, `account is not linked to a member` -> all generic.
- **H-B3 Window closing mid-session is not detected.** `readOnly` is computed from `Date.now()` only on render; no timer at `closes_at`, no refetch on focus. Cards stay tappable until a tap fails. Mock rule 9: cards become read-only with a clear banner.
- **H-B4 Failures on a category you left are invisible.** Next/Back stay enabled while saving; if the save then fails, the alert renders inside a `hidden` section. Only the dash silently reverts to unvoted. Mock (d1) disables Next while saving.
- **H-B5 Duplicate-group info can hide a failed save.** `addGroup` awaits `save()` then always sets the info banner "That group already exists", overwriting the error banner if the save failed. A server-side dedupe (RPC returns an existing id after a race) shows no info at all.
- **L-B6 Typed preset duplicate** selects the existing option silently (no "already exists" note).
- **L-B7 Skip vs disabled Next.** Mock (a) shows Next disabled when nothing is picked; real shows an enabled "Skip". Rule 8 allows skipping, so real is likely right. Confirm.
- **L-B8 Finish voting target.** Mock: returns to Ballots. Real: `/app/ballots/:id/submit` (SUBMIT_ENABLED). Likely intentional. Confirm.
- **L-B9 Group cap.** Mock copy "2 or more"; real caps at 3 ("Pick 2 or 3 people"). Intentional client cap. Confirm.

### Visual: user requests
- **H-V1 Progress strip current dash is not sky.** `dashClass` paints current cream/cream-20% with a cream outline and taller height. Mock: current = sky `#3DB8FF`, 7px vs 5px, no outline. (User request 1.)
- **H-V2 Selected nominee card has an extra border.** The Avatar uses `ring="pebble"` = `ring-[3px] ring-offset-2 ring-offset-bg`, so on a pebble-filled card a dark `#18181B` halo plus a same-color ring draw a border around the face. Mock (c): card fill only; face turns ink with the letter in the card's pebble; check at right. (User request 2.)
- **H-V3 Saving state.** Real: plain "Saving..." text, no spinner, nothing on the tapped card, Next enabled. Mock: spinner + "Saving..." under the title, then "Saved"; Next disabled while saving. User asks for an inline per-card indicator as well. (User request 3.)
- **H-V4 Error banner.** Real: `bg-surface` + `border-danger`, Try again is a small *secondary* button wrapped inline. Mock: cherry-tinted banner (`#FF514826` bg, cherry border); phone = full-width *primary* Try again directly under the banner; 1024px+ = Try again inline at the right of the banner. (User request 3.)
- **H-V5 Voting closed.** Real: one centered `bg-surface-2` box "Voting is closed" above the title; footer still shows Back/Skip/Next; top shows plain "Closed". Mock (d3): lemon warn banner above the cards, "Voting closed at 9:00 PM" + "Your last saved vote stands. Cards are read-only."; footer only "Back to ballots"; "Closed" pill. Save-time closed message lacks the time. (User request 3.)
- **H-V6 Can't vote for self / your group.** Locked list + sheet exist and match. Gap is the *server* path: the rule message only appears for 42501 and is wrong for closed ballots (see H-B1); banner style per H-V4. (User request 3.)
- **H-V7 Duplicate group.** Real info banner uses `border-accent` (gold) on surface. Mock (d4): sky-tinted banner (`#3DB8FF1f`, sky border). Plus H-B5. (User request 3.)

### Visual: other
- **M-V8 No "Category N of M" line.** Mock (a) top row: "Category 3 of 6" left, sky "Jump to..." right. Real shows "N of M voted" + closes text, and a gold "Jump to category" button on its own line. Category index exists only in the section aria-label.
- **M-V9 Desktop (1024px+) footer.** Real: Back/Next stretch `flex-1` across a 1040px bar. Mock: compact buttons bottom-right; "+ Add a group" ghost bottom-left.
- **M-V10 Review step layout.** Real: Finish voting sits in content, footer shows a secondary Back, and the progress strip stays visible with a "current" dash. Mock (e): footer holds only primary "Finish voting"; "‹ Back" at top; no strip. Warn banner uses `warn` orange, mock lemon; "Vote" link for skipped rows is lemon in mock, gold in real.
- **M-V11 Group sheet.** Missing live preview card (stacked member rings + "Ava, Ben & Cam" + "3 people"); missing "Pick one more person" hint at 1 picked (button reads "Pick 2 or 3 people"); selected chips lack the check mark.
- **M-V12 Jump sheet rows.** Current row uses ListRow `selected` (gold check, sr "selected"), reads as "voted". Mock: current row bold with "→" and "(here)"; "Not voted" in lemon bold. No flag for a failed save.
- **L-V13 Selected subtitle.** Mock replaces the hint with "Your vote is saved. Tap another to change it."; real keeps the hint and adds "Saved. Tap another to change it." on a second line.
- **L-V14 Link color.** "Jump to..." and "Clear my vote" are `text-accent` (gold); mock uses sky.
- **L-V15 "+ Add a group"** is a filled secondary button; mock is ghost (2px cream/33% outline).
- **L-V16 Phone footer.** Mock Back is narrower (flex .45) with a fade-in gradient; real Back and Next are equal width.
- **L-V17 "Closes in 2 days"** is plain text; mock is a pill.
- **L-V18 Read-only hint.** Hint still says "Pick one..." when the ballot is closed.

### Accessibility
- **M-A1 Radiogroup keyboard.** `role="radio"` buttons are each a Tab stop; no roving tabindex or arrow keys. Arrows must move focus only (never cast a vote); Space/Enter votes.
- **M-A2 Grape small text.** `on-grape` on grape is 4.38:1 (large text only). Selected grape cards render footnote text ("3 people", secondary_text) below 4.5:1.
- **M-A3 Read-only radios use `disabled`**, dropping them from the tab order and from some screen readers' radio counts. Use `aria-disabled` plus the closed banner.
- **L-A4 Focus on failure.** Error banner is `role="alert"` (good) but focus stays on the card; on phone the primary Try again should be reachable next in tab order. No focus loss when the card re-renders.
- **L-A5 Jump sheet current row** announces "selected" instead of "current" (`aria-current`).

Totals: **High 12** (B1-B5, V1-V7) · **Medium 8** (V8-V12, A1-A3) · **Low 12** (B6-B9, V13-V18, A4, A5) = **32 gaps**.

---

## Tasks (ordered)

### Task 1. Progress strip: sky for the current category (H-V1)
Files: `client/src/ui/logic/progress.ts`, `client/src/ui/__tests__/progress.test.ts`, `client/src/ui/__tests__/primitivesB.test.tsx` (if it asserts outline), `client/src/ui/tokens.ts` (contrast pair note only if needed; `pebble:sky` vs `bg` = 8.01 already listed).
- `dashClass`: current -> `bg-pebble-sky` regardless of voted; height 7px/5px ratio kept as `h-2`/`h-1` (or `h-[7px]`/`h-[5px]` to match mock); drop the `outline` classes.
- Acceptance: current dash is sky on every category, voted dashes cream, unvoted cream/20%; vertical orientation same rule.
- Tests: `dashClass({voted:true,current:true})` contains `bg-pebble-sky`, not `outline`; non-current voted contains `bg-label`. Low risk.

### Task 2. Selected card: fill only, no extra border (H-V2)
Files: `client/src/components/vote/CategoryVoteCard.tsx`, `client/src/ui/Avatar.tsx` (add an optional `selectedOnPebble` or `ring={on ? undefined : "pebble"}`), `client/src/pages/VotePage.test.tsx`.
- When `on`: render the face with no ring and no ring-offset; face = ink (`bg-on-pebble-<x>`) with the initial/count in the card's pebble (`text-pebble-<x>`), matching mock (c). Photo avatars keep the photo, no ring.
- Card keeps no `border`, no `outline` other than `:focus-visible`.
- Acceptance: on a selected card the only colored shape is the card fill + ink face + check.
- Tests: extend "the chosen nominee fills with its pebble..." to assert the selected radio subtree has no `ring-offset-bg`, `ring-[3px]`, `border-` classes; unselected keeps the pebble ring. Low risk.

### Task 3. Shared VoteBanner + error banner per mock (H-V4, H-V7, part of H-V5, M-V10 warn)
Files: new `client/src/components/vote/VoteBanner.tsx`, `CategoryVoteCard.tsx`, `ReviewStep.tsx`, `lib/voting.ts` (`VoteMessage.tone` add `"warn"`), tests.
- Tones: error = cherry tint bg (`bg-pebble-cherry/15`) + `border-pebble-cherry`; info = sky tint + sky border; warn = lemon tint + lemon border. Bold title, detail below. Text stays `text-label` (check contrast on tint over `bg`).
- Retry: phone = full-width **primary** "Try again" directly under the banner; `lg:` = primary button inline at the right inside the banner.
- Banner sits directly above the cards (between subtitle/status line and the radiogroup).
- Acceptance: matches mock (d2), (d4), desktop (d5); ReviewStep "N not voted yet" uses warn tone.
- Tests: alert has cherry classes and a primary Try again; info has sky classes. Low risk (presentational).

### Task 4. Saving indicator, inline per card (H-V3)
Files: `CategoryVoteCard.tsx`, `VotePage.tsx`, `ui/Button.tsx` (reuse `Spinner`), `VotePage.test.tsx`.
- Status line under the title: spinner + "Saving..." while pending, then "Saved" (and the mock (c) subtitle "Your vote is saved. Tap another to change it." replaces the hint when selected and idle; L-V13).
- On the tapped (optimistic) card: `aria-busy="true"` and a small spinner in place of the check while pending.
- Next/Skip/Review and Back are disabled while the *current* category is pending (mock d1). Cards stay tappable.
- Acceptance: with a never-resolving `castVote`, spinner shows in the status line and on the card, footer nav disabled; resolve -> "Saved", nav enabled.
- Tests: new VotePage test with a deferred promise. **RISKY (light)**: only reads `pending`; must not alter `save()`.

### Task 5. Error classification (H-B1, H-B2, H-V6)  RISKY
Files: `client/src/lib/voting.ts`, `client/src/lib/voting.test.ts`, `client/src/pages/VotePage.tsx`, `VotePage.test.tsx`.
- `classifySaveError(e, ctx)` with `ctx = { closesAt, now, online, status }`. Order: past `closesAt` or `status !== "open"` -> `closed`; offline/TypeError/fetch text -> `network`; message `ballot is not open` -> `closed`; `a group needs at least two` -> `groupSize`; `a different nominee with this name already exists` -> `nameTaken`; `account is not linked` -> `unlinked`; 42501/RLS -> `rule`; else `generic`.
- On a `rule` result, VotePage refetches ballot detail once (`refreshDetail`) and reclassifies: if now closed -> closed message (fixes early-close mislabel). Refetch failure keeps `rule`.
- Messages (plain sentences, mock tone): closed "Voting closed at {time}" / "Your last saved vote stands. Cards are read-only." (no retry); groupSize "Pick one more person." (no retry); nameTaken "That name is already taken. Pick it from the list." (no retry); unlinked "Your account isn't linked to a member. Ask a committee member." (no retry); rule unchanged; generic unchanged (retry).
- Acceptance: each server text maps to its message; committee-closed ballot never shows the self-vote line.
- Tests: table test in `voting.test.ts` for every kind; VotePage test where `castVote` rejects 42501 and refetched detail has `status:"closed"` -> "Voting closed". Do not change `save()` ordering.

### Task 6. Window closes mid-session (H-B3, H-V5, L-V17, L-V18)  RISKY
Files: `VotePage.tsx`, `CategoryVoteCard.tsx`, `ui/useRefetchOnFocus.ts` (reuse), `lib/time.ts` (add `closedAtLabel`), tests.
- Hold `now` in state; set a single `setTimeout` to `closes_at` (and to `opens_at` when upcoming) that bumps `now`; refetch detail on window focus via `useRefetchOnFocus`; refetch after any `closed` failure.
- When read-only: warn VoteBanner in each category "Voting closed at 9:00 PM" / "Your last saved vote stands. Cards are read-only."; hint hidden; footer shows only "Back to ballots" (link to `/app/ballots`); top shows a "Closed" pill (closes label becomes a pill in all states).
- Pending saves are not cancelled; their result still updates `confirmed`.
- Acceptance: fake timers past `closes_at` -> banner appears without a tap, cards `aria-disabled`, footer has one button.
- Tests: fake-timer test; focus-refetch test returning `status:"closed"`.

### Task 7. Failures in a category you left (H-B4)  RISKY
Files: `VotePage.tsx`, `ui/ProgressStrip.tsx` / `ui/logic/progress.ts` (`DashState.failed?`), `lib/voting.ts` (`dashStates` takes failed set), tests.
- Task 4 already blocks nav while the current category saves. Additionally, if a non-current category's message becomes an error (e.g. jump-sheet navigation mid-save), show a page-level error toast/banner "Couldn't save your vote in {Category}" with "Go to it", and mark that dash (cherry) and jump row "Couldn't save".
- Acceptance: start save in C1, jump to C2 via jump sheet, reject -> visible notice on C2 view; "Go to it" shows C1 with its banner and Try again.
- Tests: VotePage test as above; `dashStates` unit test for `failed`.

### Task 8. Duplicate group correctness (H-B5, L-B6)  RISKY
Files: `VotePage.tsx`, `lib/voting.ts`, tests.
- `save()` resolves to `boolean ok` (true only when this seq succeeded). Only set the info banner when ok. Keep the existing seq guard.
- After `addNominee`, if the returned id already existed in the pre-refresh `cat.nominees`, show the same info banner (server dedupe). For typed preset duplicates, show "That option already exists" / "We selected "X" for you."
- Acceptance: existing set + failing cast -> error banner, no info; existing set + ok -> info.
- Tests: two VotePage tests (fail path, server-dedupe path).

### Task 9. Top row: Category N of M + Jump link (M-V8, L-V14, L-V17)
Files: `VotePage.tsx`, tests.
- Row under the strip: "Category {idx+1} of {total}" left, sky text-button "Jump to..." right (44px target). Keep "N of M voted" in the jump sheet header or drop it. Closes label as pill (shared with Task 6).
- Link color sky for "Jump to..." and "Clear my vote" (`text-pebble-sky`; sky on bg 8.01:1).
- Tests: text "Category 1 of 2" visible; Jump button opens sheet. Low risk.

### Task 10. Desktop and phone footer layout (M-V9, L-V15, L-V16)
Files: `VotePage.tsx`, `CategoryVoteCard.tsx`.
- `lg:`: footer content right-aligned, buttons auto width (`lg:flex-none lg:min-w-32`); "+ Add a group" moves to the footer left on group categories at `lg:` (ghost style), stays under the list on phone.
- Phone: Back `flex-[0.45]`, Next `flex-1`; optional top fade gradient on the accessory bar.
- Ghost style for "+ Add a group": transparent + `border-2 border-label/33`. If no ghost variant exists, add one to `ui/logic/variants.ts` with a test.
- Acceptance: at 1024px buttons bottom-right, compact; at 375px Back narrower. Verify in browser at 375 and 1280 widths. Low risk.

### Task 11. Group sheet preview and hints (M-V11)
Files: `components/vote/GroupSheet.tsx`, `VotePage.test.tsx`.
- Live preview card (bg `bg`, stacked 30px member faces in their pebbles, overlapping -8px, name via `joinNames`, "N people") shown when 1+ picked.
- Button label when 1 picked: disabled, with hint text "Pick one more person" under the chips; 0 picked: "Pick 2 or 3 people".
- Selected chips show a trailing check (aria-hidden; `aria-pressed` already announces).
- Acceptance/tests: pick 1 -> hint visible, button disabled; pick 2 -> preview shows "Ann & Bo", "2 people". Low risk (submit path unchanged).

### Task 12. Review step per mock (M-V10)
Files: `ReviewStep.tsx`, `VotePage.tsx`, tests.
- Hide the progress strip and category header while reviewing. Footer holds only primary "Finish voting" (or "Back to ballots" when read-only). A top text-button "‹ Back" returns to the last category.
- Warn banner via VoteBanner (lemon). Skipped rows: "Vote" link in lemon.
- Keep `finishTo` behavior (submit route) pending L-B8 decision.
- Tests: update the review test (Finish voting now in footer; strip absent). Low risk.

### Task 13. Jump sheet rows (M-V12, L-A5)
Files: `VotePage.tsx`, maybe `ui/ListRow.tsx` (add `current` prop with `aria-current="true"`), tests.
- Current row: bold title prefixed "→", subtitle "Voted (here)" / "Not voted (here)"; no gold check. "Not voted" in lemon bold. Failed rows "Couldn't save" in cherry (from Task 7).
- Ballot order unchanged. Tests: current row has `aria-current`. Low risk.

### Task 14. Accessibility pass (M-A1, M-A2, M-A3, L-A4)
Files: `CategoryVoteCard.tsx`, tests.
- Roving tabindex in the radiogroup: selected (or first) radio `tabIndex=0`, others `-1`; ArrowUp/Down/Left/Right move focus only; Space/Enter vote. **Do not vote on arrow keys** (each vote is a network write).
- Read-only: `aria-disabled="true"` + no-op click instead of `disabled`.
- Grape contrast: on selected cards whose pebble is grape, render the secondary line inside a small `bg-bg/80 text-label` pill (or use `text-headline`-size); assert via a unit test on the class choice. Run `tokensCss`/contrast tests.
- On a new error, move focus to the Try again button only if focus was inside that category; otherwise leave it.
- Tests: arrow keys move `document.activeElement` without calling `castVote`; Enter calls it once. Medium risk (event handlers on vote buttons).

### Decisions to confirm before coding (no code)
L-B7 Skip vs disabled Next, L-B8 Finish voting target, L-B9 3-person cap. Implement as today unless the owner says otherwise.

## Risk summary
RISKY for live voting: Task 5, 6, 7, 8 (and light: 4, 14). Ship 1-3, 9-13 first if time is short; they are presentational.
