# Part 1: gap fixes against the approved mock

Source of truth: `.superpowers/brainstorm/99508-1795180704/content/part1-reworked.html` (Landing, Login, Sign up, Home member/committee, Customize, widget catalog).
Compared with: `client/src/pages/{LandingPage,LoginPage,SignupPage,ClaimNamePage,HomePage}.tsx`, `pages/home/{widgets,CustomizeHomeSheet,useHomeData}.tsx`,
`ui/{AuthLayout,NameChips,GoogleButton,NavBar,AppShell,TabBar,ClaimGate,Sheet}.tsx`, `ui/logic/{homeWidgets,homePrefs,dragReorder,landingBalls}.ts`,
`components/FallingProfileBallPhysics.tsx`. Tests: `ui/__tests__/{authRework,home,homeRework,homePrefs,homeWidgets}.test.*`.

Not gaps (deliberate, per user): no logo on login/signup forms, "New here? Sign up" at the bottom, desktop right panel without logo, no R pill, no quick actions,
widgets are title + content with a colored left edge and no buttons, every pebble color used once before repeating, bigger Committee heading with no pill,
two-column faces table for who-hasn't-voted, taller sticky logo header, tab transitions.

Already matching the mock (verified, no work): landing has no tagline and centered buttons, falling faces have pebble rings (stable per photo, also in reduced-motion layout),
Google-first login/signup with "or use email instead" behind a flag (`VITE_GOOGLE_AUTH`), taken names crossed out on signup and unselectable (sr-only "(taken)"),
Customize has drag handles, lifted row, lemon drop line, Esc to cancel, keyboard Move up/down, COMMITTEE ONLY group, Reset to default, desktop sheet is a centered modal, per-widget skeleton/error/empty states.

Run tests with `cd client && npx vitest run`; finish every task with `npx tsc -b` clean. Severity: **H** = broken or trapped user, **M** = real a11y problem or visible mismatch, **L** = polish or a decision to confirm.

---

## Gap list

### H
- **H1 Claim page is a dead end.** `/claim` has `back={null}` and no Log out. Someone who signs in with the wrong Google account (or whose name is gone) cannot leave; ClaimGate redirects every `/app/*` back. Mock has Back everywhere.
- **H2 Claim failure leaves a stale picker.** After a "name isn't available" error (someone claimed it first) the chip list is not reloaded and the picked name stays selected, so the user retries the same dead name. Also the pending-name auto-claim shows an idle page (Continue disabled, no "Claiming..." state) while the RPC runs, then flashes the chips on failure.

### M
- **M1 Customize keyboard path is hidden and shifts layout.** The Move up/down buttons are `sr-only` until focused, then jump in and push the switch. The drag handle is a focusable button that does nothing on Enter/Space/arrows. No live announcement of the new position (only the generic "Home updated" toast).
- **M2 Customize silently accepts widgets that cannot show.** Leaderboard and Your stats are `requiresRelease`; a user can switch them on and nothing appears, with no hint. Rows also have no one-line description (mock catalog shows "Date, place, calendar", "Votes cast so far" etc.) and no on/off grouping, so there is nothing to ideate from. Mock "+ Add widgets" catalog does not exist.
- **M3 Layout jump on first load.** Release-gated widgets (Leaderboard, Your stats) are filtered out until `data.released` is known, so they pop in after the skeletons. Same for the Committee section height. Mock shows a stable list.
- **M4 Whole-load failure renders N identical error cards.** `baseStatus` gives every widget the same `state.error`, so 5 to 7 "Couldn't load X / Try again" cards all call the same `reload`. "One widget failing never blanks the others" only holds for the partial `errors.*` cases.
- **M5 Login/signup email toggle drops focus.** Clicking "use email instead" unmounts the button; focus falls to `body`. No `aria-expanded`, no focus into the Email field. Signup's Google error ("Pick your name first.") renders below the Google button, not at the chips, with no focus move.
- **M6 Ceremony card label-in-name.** The inner location link has `aria-label="Directions"` while its visible text is the address (WCAG 2.5.3), and the card-wide overlay button's label ("Add to calendar") differs from visible text. The directions link can also be hit by the overlay on touch where `z-10` and the stretched area disagree at small sizes.
- **M7 Phone layout of the half-width widgets.** Mock phone shows Countdown + Your votes side by side (`span 1` widgets). Real grid is `grid-cols-1` below 1024px, so every `span: 1` widget is full width on phones (long scroll, big empty cards).
- **M8 Claim page copy and behavior differ from signup.** Signup shows taken names crossed out; Claim says "Taken names are hidden" and drops them (mock: crossed out). No step label, no way to see why a name is missing.

### L
- **L1 Home header avatar.** Mock has the user's pebble-ring avatar top right ("Hey Rico." + ring). Real has only the Customize icon there. Confirm intent (the R-pill removal may have taken it); if wanted, add it left of Customize and link to You.
- **L2 Signup "Step 1 of 2".** Email path has no visible step 2 (just a "Check your email" sheet); Google path goes to Google then Home. Either add the step or drop the label. Mock says "1 of 2" without a second screen either.
- **L3 Google button state.** `GoogleButton` disables on `loading` but has no spinner/aria-busy/label change; after cancelling Google and returning via back/bfcache it can stay disabled forever. Signup could disable it until a name is picked instead of erroring after the tap.
- **L4 Name chips semantics.** Chips are toggle buttons in a div; a real single-choice group (radiogroup, arrow keys) would announce "x of 14". Mock shows selected chip cream + lemon outline; real is inverse + lemon ring + check (close; confirm).
- **L5 Landing polish.** A signed-in visitor to `/` still sees Get started/Log in (Login redirects, Landing does not). Faces are uniform size (mock varies 36 to 58). A failed `/sidechatters/n.jpg` draws a blank ring (no onerror fallback). Falling faces can sit under the buttons on short phones.
- **L6 Drag edge cases.** Row rects are captured at drag start, so scrolling the sheet mid-drag (no auto-scroll near the edges) mis-drops; handles lack `touch-action` testing on iOS Safari inside a scrolling sheet.
- **L7 Defaults differ from mock.** Mock member default = Oscar night, Pending ballot, Countdown + My progress (4). Real = 5/6/7 (adds Latest winners, Leaderboard when released, Ballot health for committee). Mock Customize also shows Countdown OFF while Home shows it ON (mock is self-inconsistent). Titles differ ("Your ballots"/"Your progress" vs "Pending ballots"/"My progress"). Confirm the real defaults are intended.
- **L8 Prefs are per-device.** `jsc.home.v1.<user>` is localStorage only (code already notes a future `profiles.home_prefs`). A logged-in phone and laptop disagree.
- **L9 Home never refetches while open.** `useHomeData` loads on mount only; AppShell's badge refreshes on visibility but Home does not (stale countdown state/ballot open or closed after a long background).
- **L10 No route title/announcement.** No `document.title` per route and no focus/announce on tab change (the new tab transition is visual only).
- **L11 Signup password.** Login has Show/Hide; Signup password field does not and shows no rules.

Counts: H 2, M 8, L 11 (21 total).

---

## Implementation tasks (ordered)

Do H first, then M by risk. **RISKY** = touches auth/claim flow; write the test first, one commit each.

### T1 (H1) Escape hatch on /claim  **RISKY**
- Files: `pages/ClaimNamePage.tsx`, `ui/AuthLayout.tsx` (optional `action` slot in the top row), test `ui/__tests__/authRework.test.tsx`.
- Do: replace `back={null}` with a "Log out" action (calls `supabase.auth.signOut()` then `navigate("/")`); keep it 44px.
- Acceptance: a signed-in user with no member can reach `/` and `/login` after Log out; ClaimGate does not bounce them; no logo added.
- Tests: renders a "Log out" button; click calls `signOut` and navigates to `/`.

### T2 (H2, M8) Claim: reload on failure, claiming state, crossed-out names  **RISKY**
- Files: `pages/ClaimNamePage.tsx`, `ui/NameChips.tsx` (reuse), `lib/claimName.ts` (no change expected), tests in `authRework.test.tsx`.
- Do: on claim error call `load()` and clear `picked`; show all names with taken crossed out (same as signup) and copy "Crossed-out names are taken. Wrong one? Ask a committee member."; while the pending auto-claim runs show a "Claiming <name>..." state instead of chips; if it fails show chips + error.
- Acceptance: after a TAKEN error the name appears crossed out and nothing is selected; during auto-claim no chips flash.
- Tests: TAKEN error triggers a second `member_name_status` call and clears selection; auto-claim renders "Claiming" until the RPC resolves.

### T3 (M5, L3) Email toggle focus and Google button state
- Files: `pages/LoginPage.tsx`, `pages/SignupPage.tsx`, `ui/GoogleButton.tsx`, new tiny shared `ui/EmailToggle.tsx` (optional), tests `auth.test.tsx`/`authRework.test.tsx`.
- Do: toggle button gets `aria-expanded`; on open, focus the Email (login) / Username (signup) field via ref + effect; Google button shows `aria-busy` and "Opening Google..." while loading and resets on `pageshow` (persisted); signup Google is `aria-disabled` until a name is picked and the hint "Pick your name first." is linked with `aria-describedby` and shown near the chips.
- Acceptance: keyboard user lands in the first email field after activating the toggle; Google button never stays stuck after Back.
- Tests: `document.activeElement` is the email field after click; `pageshow` with `persisted: true` re-enables the button.

### T4 (M1) Customize keyboard reorder that does not shift layout
- Files: `pages/home/CustomizeHomeSheet.tsx`, `ui/logic/dragReorder.ts` (add `moveByKey`), tests `home.test.tsx`, `homeRework.test.ts`.
- Do: make the handle itself keyboard operable (Space/Enter grabs, Up/Down move one place, Space/Enter drops, Esc cancels; `aria-roledescription="sortable"`, `aria-describedby` instructions); remove the hidden Move up/down buttons or keep them as `sr-only` only (never `focus-visible:not-sr-only`); announce "Moved <title> to position N of M" in a polite live region; update the sheet intro line to mention keyboard use.
- Acceptance: Tab to a handle, Space, ArrowDown, Space reorders and persists; no layout shift on focus; announcement text correct; Esc restores.
- Tests: key sequence yields the expected `order` in saved prefs; live region text; Esc leaves prefs unchanged. Keep the existing "Move up/down" test passing or replace it consistently.

### T5 (M2) Customize descriptions, release hint, add-widgets grouping
- Files: `ui/logic/homeWidgets.ts` (add `blurb: string`), `pages/home/CustomizeHomeSheet.tsx`, tests `homeWidgets.test.ts`, `home.test.tsx`.
- Do: show `blurb` under each row title (callout/footnote, label-2); for `requiresRelease` rows add "Appears after results are released" and mark them so toggling on is explained; keep one list (a separate catalog screen is out of scope unless the user wants it, confirm).
- Acceptance: every widget has a blurb; release-gated rows show the hint while `released` is false (pass `released` into the sheet).
- Tests: all `WIDGETS` have non-empty `blurb`; hint rendered only for gated rows pre-release.

### T6 (M3, M4) Stable first load and one error for a whole-load failure
- Files: `pages/HomePage.tsx`, `pages/home/widgets.tsx`, `pages/home/useHomeData.ts`, tests `home.test.tsx`, `homeFetch.test.tsx`.
- Do: while `state.data` is null render gated widgets (use `resolveWidgets` with `released: true` for layout only) as skeletons, then drop them if not released; if `state.error && !state.data` render one `ErrorState` ("Couldn't load Home", Try again) above the grid instead of N cards; widgets keep their own error for partial `errors.*`.
- Acceptance: no gated widget pops in after load when released; total failure shows exactly one Try again; partial failure still shows per-widget errors.
- Tests: reject all fetches then `getAllByRole("button", {name: /try again/i})` has length 1; released data renders Leaderboard from the first skeleton slot (no extra reflow assertion needed, check count of regions before/after).

### T7 (M6) Ceremony card a11y
- Files: `pages/home/widgets.tsx` (Ceremony), test `home.test.tsx`.
- Do: directions link label = visible text (drop `aria-label="Directions"`, add `aria-describedby` or a visually hidden ", get directions" suffix inside the link so the accessible name still starts with the address); card overlay button label "Add to calendar, <date and time>"; make sure the link sits above the overlay on all sizes.
- Acceptance: `getByRole("link", {name: /Langston/})` works; clicking the address opens Maps, clicking elsewhere downloads the .ics.
- Tests: update the existing "Directions encodes the location" test to the new name; ics download still fires.

### T8 (M7) Two-up half-width widgets on phones
- Files: `pages/HomePage.tsx` (GRID), possibly `widgets.tsx` for tighter padding, tests `home.test.tsx`.
- Do: `grid-cols-2` on phones with `span: 2` widgets `col-span-2` at all sizes and `span: 1` widgets half width; keep `lg:grid-cols-2`, `min-[1400px]:grid-cols-3`; verify long values (Countdown, "Win rate") at 320px do not clip (use `text-title-2` on narrow). Confirm with the user first because it reverses the current single column.
- Acceptance: at 375px Countdown and Your progress sit side by side; at 1024px+ layout unchanged.
- Tests: class assertions on the grid and wrappers; manual check at 320/375/1024/1400.

### T9 (L1, L2, L11) Small visual decisions (ask first)
- Files: `pages/HomePage.tsx` (header avatar via `Avatar ring="pebble"` linking to `/app/profile`), `pages/SignupPage.tsx` (drop or implement "Step 1 of 2"; add Show/Hide to password like Login).
- Acceptance: whichever the user picks; no new buttons inside widgets.
- Tests: header avatar has accessible name and link; signup password toggle `aria-pressed`.

### T10 (L5) Landing polish
- Files: `pages/LandingPage.tsx`, `components/FallingProfileBallPhysics.tsx`, `ui/logic/landingBalls.ts`, tests `authRework.test.tsx`.
- Do: redirect or swap CTAs for a signed-in user ("Open app"); vary ball radius deterministically per key (36 to 58 equivalent); on image `onerror` skip the photo and draw initials-less ring; keep ball z-order behind content.
- Acceptance: no blank ring when an image 404s; sizes vary but stay stable per key; reduced-motion layout still draws once.
- Tests: `ballRadius(key)` is stable and in range; signed-in landing shows "Open app".

### T11 (L6, L9, L10) Robustness
- Files: `CustomizeHomeSheet.tsx` (re-measure rects on scroll, auto-scroll within 40px of the sheet edge), `pages/home/useHomeData.ts` (reload on `visibilitychange` when older than 60s), `ui/AppShell.tsx` (set `document.title` per tab and focus `#main-content` after tab change when focus was on the tab bar), tests `home.test.tsx`, `shell.test.tsx`.
- Acceptance: dropping after scrolling lands in the gap shown by the line; Home refreshes on returning after 60s; title reads "Ballots | JSC Oscars" etc.

### T12 (L4, L7, L8) Confirm or defer
- Decide with the user: radiogroup for NameChips (arrow keys), real defaults vs mock (L7), and cross-device prefs (`profiles.home_prefs` migration, new Supabase migration plus RLS; the code comment already marks it future). No code until answered.

Final gate after T1 to T8: `npx vitest run`, `npx tsc -b`, manual pass on 375px and 1024px+ for Landing, Login, Signup, Claim, Home (member and committee), Customize (touch drag and keyboard).
