# Design System Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Rebuild the JSC Oscars UI before voting opens (about Nov 25-26 2026; ceremony Dec 4) as a native-feeling **Marquee × Fruity Pebbles** web app on the user's own Oscars theme:

- the dark zinc base;
- the cream `#fffadd` text;
- the "JUST SIDECHATTING / OSCARS" wordmark;
- Century Gothic for type.

It must be optimized for phones AND computers. Work is staged in 4 stop points that the user reviews from screenshots. Two pieces are deferrable and gated: the Submit-ballot DB task and the Vote page redesign. Every existing behavior and pure-logic test stays green after every task.

**Architecture:**
- **Tokens.** One token layer. `client/src/ui/tokens.ts` is the only TS file with color literals. `client/src/index.css` mirrors it as CSS variables exposed through Tailwind v4 `@theme inline`, and a test keeps the two in sync.
- **New code.** A new `client/src/ui/` folder holds the primitives, the AppShell (floating frosted tab bar on phones, sidebar from 1024 px) and the Sheet family. New pure helpers live in `client/src/ui/logic/*.ts` with vitest coverage.
- **Existing code.** `client/src/lib/**` is NOT modified. Pages are re-skinned onto primitives without changing their data flow.
- **Gallery.** A dev-only, auth-free gallery at `/dev/design` shows every component in every state.
- **Old Vote page.** The AppShell hosts the OLD `VotePage.tsx` unchanged through compatibility adapters, so the Vote redesign can be dropped without touching anything else.

**Tech Stack:**
- Vite 7, React 19, TypeScript 5.9, Tailwind v4.1 (`@tailwindcss/vite`), react-router 7, motion 12 (`motion/react`, incl. `Reorder`), lucide-react, supabase-js 2, vitest 3.
- Dev-only additions: `jsdom` and `@testing-library/react` + `@testing-library/dom` (Task 1), `@resvg/resvg-js` (Task 19).
- Font conversion: optional `fonttools` + `brotli` (Python, Task 2, only with the user's OK).
- No runtime dependencies are added.
- Supabase hosted project `fsuczxowirmsxtmzzsys` (no Docker/CLI). Only Task 20 touches the DB, and it is deferrable.

**Spec:** `docs/superpowers/specs/2026-11-21-design-system-design.md` (audit findings, components, a11y rules). The **User direction** below supersedes the spec wherever they differ: palette, dark-only, fonts, Marquee look, home, submit. Rulings are in `.superpowers/sdd/2026-11-20-finish-the-event/progress.md` and `.superpowers/sdd/2026-11-19-voting-loop/progress.md`.

Mocks, all in `.superpowers/brainstorm/99508-1795180704/content/`:
- `screens-all.html` (current, all screens)
- `screens-1-auth-home.html`
- `screens-2-tabs-committee.html`
- `marquee-fruity-pebbles.html` (palette and blocks)
- `design-directions*.html` (background)

## User direction (binding)

1. **Dark only.** There is no light token set, light gallery variant or theme switch, and `color-scheme` is `dark`. The token structure (raw `--*` vars in one `:root` block → `@theme inline`) is kept so a light block can be added later. This plan does not build one.
2. **Oscars brand.**
   - `OscarLogo` (Century Gothic wordmark) is used prominently: on Landing (with the falling circle-head avatars), on Log in / Create account / Reset password, in the Home header (and compact in the NavBar after scroll), on the reveal and Release pages, at the top of the desktop sidebar, and as the source of the PWA icons.
   - Cream `#fffadd` is the text color on the zinc family `#18181b` / `#27272a` / `#3f3f46`.
   - Champagne `#E6C77A` is a restrained secondary accent.
3. **Marquee × Fruity Pebbles.**
   - Big, bold headlines; color blocks (NOT glass cards) carry content; chunky pill buttons and tiles; big targets.
   - A-style native chrome stays: frosted floating tab bar, frosted sheets and toasts, large titles. Glass appears only on that chrome.
   - The pebbles are, in order: strawberry `#FF4F9A`, cherry `#FF5148`, tangerine `#FF8A3D`, lemon `#FFD23F`, lime `#7ED957`, sky `#3DB8FF`, grape `#8B5CF6`.
   - One pebble per region, rotated deterministically by `pebbleFor(key)` / `pebbleAt(index)`, which use all 7, stably.
4. **Lemon belongs to the envelope.** The Release page is full-bleed lemon with dark text `#1A1204`. Its hold-to-release is a LIME track (with a dark edge) and a deeper-green `#4FA832` fill, with a dark label. The sealed envelope cards on Results are lemon too. Anywhere else lemon is sparing: never a hero or full-bleed block (`HERO_EXCLUDE`); it appears only as a small accent such as the "released" chip, the You avatar ring and the "envelope" teaser tile.
5. **Submit ballot** is a new official full-page screen in full-bleed LIME with dark text. It follows the same ceremony as Release: checklist rows, hold-to-submit on a dark track with a grape fill, and "Not yet, back to voting". **Behavior is an OPEN QUESTION.** The default adopted here: submitting is a confirmation, votes stay editable until the ballot closes, and the committee sees who submitted. The screen ships first with local state (Task 15). Persistence is a separate, deferrable DB task (Task 20).
6. **Podium colors FIXED, flat:** gold `#FFC23D` / `#3B2A00`, silver-blue `#9DB4D0` / `#17263A`, bronze-orange `#E8803A` / `#2B1204`. The opened results cards and the leaderboard never rotate lemon or tangerine (`RESULTS_EXCLUDE`), since they read as gold and bronze.
7. **Fonts: brand only, no cursive.**
   - **Century Gothic** is used for all UI text, body, buttons, large titles and the wordmark, with real weights 300 / 400 / 700 so the browser never synthesizes bold. Bold is converted from `centurygothic_bold.ttf` to woff2 when possible.
   - **Bellaboo** is the display face for category names, the reveal title and slide-style headings, never under 18 px. The user has NO Bellaboo file yet, so the display token falls back to Century Gothic Bold now, and a documented `@font-face` slot lets the file be dropped into `client/public/fonts/Bellaboo/` later.
   - **WindSong is removed** from the app and its files deleted (`OscarLogo` does not use it). Bricolage and Jost are not used.
   - System UI is only the fallback stack.
8. **Desktop is first-class.**
   - From 1024 px a left sidebar (logo, nav, Committee group, user chip) replaces the tab bar.
   - Content sits in a centered column (720 px lists and forms; 60ch prose) or a responsive grid: Home widgets 2 columns at ≥1024 and 3 at ≥1400; Results 2 / 3 columns; committee tables up to 1040 px.
   - Hover states (under `(hover: hover)`) and focus states exist on every control. Full keyboard support: tab order, Esc closes sheets, Enter/Space activate. Targets are still ≥ 44 px.
   - Sheets become centered dialogs.
   - The Vote page becomes two-pane (in the deferrable Vote task).
   - Release and Submit stay full-bleed.
   - Every UI check runs at 375×812, 1280×800 and 1440×900 (`resize_window`).
9. **Vote dash strip is CREAM:** voted dashes are filled `#fffadd`, unvoted are `#fffadd` at 20%, and the current dash is taller. Pebbles stay on tiles and blocks.
10. **Home is a personal dashboard of widgets.**
    - 6 member widgets: ceremony details (date, location, "Add to calendar" `.ics`), pending ballots, countdown, my progress, leaderboard peek (after release), latest winners (an envelope teaser before release).
    - 3 committee-only widgets: who hasn't voted, needs your attention, quick actions.
    - A "Customize Home" sheet toggles and reorders widgets, stored per user in localStorage. A future DB step is clearly marked and is NOT in this plan.
    - The default shows 5-7 widgets.
11. **Tabs:** Home, Ballots, Results, **You**. The routes stay `/app`, `/app/ballots`, `/app/results` and `/app/profile`. Stats folds into Results as the "Leaderboard" segment, and Settings lives under You.
12. **Copy:** "Log in", "Log out", "Create account" (the user's words; this replaces the spec's "Sign in"). Sentence case everywhere.
13. **Timing:** everything before voting, in 4 stop points. Vote (Task 21) and Submit-DB (Task 20) are deferrable.
14. **PWA:** manifest, icons, theme-color and apple-touch-icon are in scope. **No service worker or offline caching.**
15. **Defaults adopted for open questions:**
    - Spec Q1, Q2 and Q4 are superseded by items 1-13.
    - Q3 yes, with the 4th tab named "You".
    - Q5: sealed (lemon) envelope cards with "Open all", remembered per device per season.
    - Q6: cream is the primary accent, champagne secondary, pebbles the bold color.
    - Q7: the icon is derived from the wordmark; the user approves it at SP4.
    - Q8: keep Labs › Joke generator.
    - **Still open (asked at the stop points):** Submit behavior (item 5), Taken-names RPC (Task 20B), Font licensing (pre-publish checklist).

## Global Constraints

- **Branches:**
  - Work happens on `feat/design-system`, cut from `feat/voting-loop` HEAD.
  - Task 20 is on `feat/submissions-db` and Task 21 on `feat/vote-redesign`. Each merges only through its gate.
- **Build gate for every task:** `cd client && npm test && npm run build` exits 0.
  - Never edit `client/src/lib/**` or any existing `*.test.ts`.
  - `client/src/pages/VotePage.test.tsx` (Task 1) stays green after every task. Only its adapter block may change, and only in Task 21.
  - `client/src/api/**` changes only where a task says so: Task 7 call sites, Task 15 `submissions.ts`, Task 20.
- **Tokens only:** new and migrated files contain no hex, no `rgb(`, no raw palette classes (`zinc-`, `amber-`, …), no `[#…]`, no `dark:` and no `h-screen` / `min-h-screen` / `100vh`. Each screen task appends its files to `MIGRATED` in `client/src/ui/__tests__/tokensOnly.test.ts`. Color literals live only in `ui/tokens.ts`, `index.css`, `public/icons/icon.svg` and `public/manifest.webmanifest`; the last two are tested to equal the tokens.
- **Token names (exact; used by every task):**
  - Surfaces and labels: `bg-bg`, `bg-surface`, `bg-surface-2`, `bg-elevated`, `bg-fill`, `border-sep`, `text-label`, `text-label-2`, `text-label-3`.
  - Primary: `bg-inverse text-on-inverse` (cream pill, zinc text). Champagne: `text-accent bg-accent text-on-accent`.
  - Status: `text-danger text-success text-warn`.
  - Pebbles: `bg-pebble-{strawberry,cherry,tangerine,lemon,lime,sky,grape}` + `text-on-pebble-{…}`.
  - Special fills: `bg-lime-deep` (release fill), `bg-strip-off` (dash strip, unvoted).
  - Podium: `bg-gold text-on-gold`, `bg-silver text-on-silver`, `bg-bronze text-on-bronze`.
  - Type: `text-display`, `text-large-title`, `text-title-1`, `text-title-2`, `text-title-3`, `text-headline`, `text-body`, `text-callout`, `text-subhead`, `text-footnote`, `text-caption-1`, `text-caption-2`.
  - Fonts: `font-sans` (Century Gothic stack), `font-display` (Bellaboo → Century Gothic Bold), `font-brand` (wordmark, Century Gothic 300/400).
  - Radii: `rounded-control` (16), `rounded-card` (24), `rounded-sheet` (28), `rounded-full`. Shadows: `shadow-e1`, `shadow-e2`.
  - Utilities: `material-bar`, `material-sheet`, `material-scrim`, `pt-safe`, `pb-safe`, `px-gutter`, `min-h-dvh`, `prose-width` (max-width 60ch).
- **Pebble rules (all tested in Task 2):**
  - Text on a pebble uses `on-pebble-*`.
  - Grape's best on-color is 4.38:1, so grape carries large text only (≥ `title-3` 700 ≈ 19 px bold). Small-text uses call `pebbleFor(key, { smallText: true })`, which never returns grape.
  - Hero and full-bleed blocks outside Release and the reveal use `HERO_EXCLUDE = ["lemon"]`. Opened results cards and the leaderboard use `RESULTS_EXCLUDE = ["lemon", "tangerine"]`.
  - Cherry is never a status or error color, and `danger` is never a fill (errors are icon + words).
  - Status map (fixed): open = lime, upcoming = sky, voted/submitted = strawberry, released = lemon (small chip only), closed and draft = neutral `fill`.
- **Font rules:**
  - `font-display` only on `text-title-2` or larger (tested by regex in `tokensOnly`).
  - Paragraphs get `prose-width`.
  - Century Gothic is wide, so the type scale below is tightened and rows must wrap without clipping at 375 px and at 200% text.
- **Accessibility floor:**
  - Contrast pairs come from the dark palette and are tested.
  - Focus: `:focus-visible { outline: 3px solid var(--label); outline-offset: 2px; box-shadow: 0 0 0 2px var(--bg) }`. This two-tone ring stays visible on cream, lemon and lime.
  - Targets ≥ 44×44 (56 for `lg`). Text ≥ 11 px.
  - `<MotionConfig reducedMotion="user">` plus the spec §3.7 substitutes.
  - `viewport-fit=cover` with safe-area padding, `min-h-dvh`, zoom enabled.
  - Hover styles only under `@media (hover: hover)`.
- **Copy:** sentence case. No raw `e.message` shown to people (log it). Shared strings live in `ui/copy.ts`.
- **Commits:** stage only the task's own files.
- **Browser verification (every UI task):** the CONTROLLER runs dev server `jsc-client` and checks at **375×812, 1280×800 and 1440×900**. Unauthenticated routes (`/`, `/login`, `/signup`, `/login/reset`, `/dev/design`) need no login; others use the `[TEST]` seed accounts in `docs/TESTING.md`. Reduced motion is checked with the gallery's "Reduce motion" toggle.
- **Stop points (the user approves before the next stage):**
  - SP1 after Task 5: gallery.
  - SP2 after Task 12: shell, sheets, auth, Ballots, Home + Customize, and the old Vote page in the new shell.
  - SP3 after Task 18: Results/reveal, Release, Submit, committee, builder, You/Settings.
  - SP4 after Task 19: PWA + audit.
  - Then the gates for Task 20 and Task 21.
- **Target schedule:** SP1 Nov 22 midday, SP2 Nov 22 night, SP3 Nov 23 night, SP4 Nov 24 morning, gates Nov 24 23:59 local. If SP3 is not approved by Nov 24 noon, Tasks 20 and 21 are deferred automatically.
- **Downloads and installs that need the user's yes** (the CONTROLLER asks and states name, source and size):
  - the Python `fonttools brotli` install for the woff2 conversion (Task 2);
  - any Bellaboo file (the user supplies it; not in this plan's critical path).
  - npm dev-dependency installs named in this plan are ordinary project tooling.

## Review Focus

1. **Voting regressions (highest).** These must hold after every task:
   - `VotePage.test.tsx` passes.
   - `/app/ballots/:ballotId` renders the old page in the shell with one `nav[aria-label="Main"]` and its bottom bar in the accessory slot (Task 6 test).
   - `lib/**` is untouched.
   - Submit (Tasks 15 and 20) never writes or deletes `votes`.
2. **Results leak before release.** `ResultsPage`, Leaderboard, You stats and the Home widgets "leaderboard peek" and "latest winners" all branch on `season.results_released_at` before any results fetch. Members never see vote counts. The "who hasn't voted" widget renders only for the committee: it is `adminOnly` in the registry AND rendered behind `profile.is_committee`, and RLS is the real guard.
3. **Token discipline.** `tokensOnly` covers every new or migrated file. Palette values appear only in `tokens.ts`/`index.css` (synced by test).
4. **Contrast and color rules.** `contrast.test.ts` pins every pair. Grape stays large-text only, hero blocks exclude lemon, results exclude lemon and tangerine, and the status map is fixed.
5. **Dialog semantics.** Sheet and ConfirmSheet: role, `aria-modal`, label, focus trap and return, Esc. Zero `window.confirm`.
6. **Dev gallery not shipped.** After build, `grep -rl "Design gallery" client/dist` prints nothing.
7. **Motion safety.** No auto-advance. The reveal can be skipped. Reduced motion gives cross-fades.
8. **Home prefs robustness.** Corrupt or old prefs fall back to defaults. Unknown widget ids are dropped and new ones appended. Committee-only widgets are never shown to members even if prefs list them.
9. **Fonts.** Real 300/400/700 faces (no faux bold). First-load fonts ≤ 250 KB. `font-display` is never on small text. The Bellaboo slot is absent or harmless when the file is missing.

---

## Tokens (values; Task 2 writes them; dark only)

| Role | Value | Notes |
|---|---|---|
| `bg` | `#18181B` | zinc-900 base |
| `surface` | `#27272A` | neutral blocks, grouped lists |
| `surface-2` | `#3F3F46` | fields, option rows, skeleton |
| `elevated` | `#2C2C31` | sheet body |
| `label` | `#FFFADD` | cream |
| `label-2` | `rgb(255 250 221 / .68)` | secondary |
| `label-3` | `rgb(255 250 221 / .40)` | decorative/disabled only |
| `fill` | `rgb(255 250 221 / .10)` | chips, segment track, press |
| `sep` | `rgb(255 250 221 / .12)` | hairlines |
| `strip-off` | `rgb(255 250 221 / .20)` | unvoted dash (decorative; count text carries meaning) |
| `inverse` / `on-inverse` | `#FFFADD` / `#18181B` | primary button |
| `accent` / `on-accent` | `#E6C77A` / `#1A1304` | champagne |
| `danger` / `success` / `warn` | `#FF7A73` / `#30D158` / `#FFB340` | text + icon only |
| `pebble-strawberry` / on | `#FF4F9A` / `#1A1204` | |
| `pebble-cherry` / on | `#FF5148` / `#1A1204` | never status/error |
| `pebble-tangerine` / on | `#FF8A3D` / `#1A1204` | not on results |
| `pebble-lemon` / on | `#FFD23F` / `#1A1204` | envelope only (Release, sealed cards); small accents |
| `pebble-lime` / on | `#7ED957` / `#1A1204` | Submit page, open status |
| `pebble-sky` / on | `#3DB8FF` / `#1A1204` | |
| `pebble-grape` / on | `#8B5CF6` / `#1A1204` | large text only |
| `lime-deep` | `#4FA832` | hold-to-release fill |
| `gold` / `silver` / `bronze` (+ on) | `#FFC23D`/`#3B2A00`, `#9DB4D0`/`#17263A`, `#E8803A`/`#2B1204` | fixed |

Contrast (WCAG 2; alpha composited; pinned in Task 2):

| Pair | Ratio |
|---|---|
| `label` on `bg` / `surface` / `surface-2` / `elevated` | 16.85 / 14.16 / 9.93 / 13.21 |
| `label-2` on `bg` / `surface` / `surface-2` / `elevated` | 8.28 / 7.34 / 5.60 / 6.97 |
| `accent` on `bg` / `surface` / `surface-2` | 10.81 / 9.09 / 6.37 |
| `on-inverse` on `inverse` | 16.85 |
| `danger` on `bg` / `surface` (never on `surface-2`: 4.12) | 6.99 / 5.88 |
| `success` / `warn` on `surface` | 7.37 / 8.35 |
| on-pebble on strawberry / cherry / tangerine / lemon / lime / sky / grape | 6.04 / 5.76 / 7.91 / 12.84 / 10.55 / 8.39 / **4.38 (large only)** |
| white on strawberry / cherry / grape (rejected: dark wins) | 3.07 / 3.22 / 4.23 |
| Pebble block vs `bg` (non-text ≥ 3) | 5.77 / 5.50 / 7.55 / 12.27 / 10.08 / 8.01 / 4.18 |
| Release: `on-pebble-lemon` text on lemon page | 12.84 |
| Release hold: dark label on lime track / on `lime-deep` fill | 10.55 / 6.16 |
| Release hold: lime vs lemon (1.22) | edge carried by a 2 px `on-pebble-lemon` border (12.84) |
| Submit: dark text on lime page | 10.55 |
| Submit hold: `bg` track vs lime | 10.08 |
| Submit hold: `label` on `bg` track / on grape fill (label is `title-3` 700 = large) | 16.85 / 4.03 (≥ 3) |
| Dash strip: voted `label` vs `bg` / unvoted `strip-off` vs `bg` | 16.85 / 1.85 (decorative; "8 of 30 voted" text and aria labels carry state) |
| on-gold / on-silver / on-bronze | 8.59 / 7.18 / 6.36 |
| Inactive tab `label-2` over `material-bar` | 7.34 |

Type scale (rem at a 17 px iOS root / 16 px desktop root; tightened for wide Century Gothic; tracking 0 unless noted):

| Token | Size | Weight | Line height | Font |
|---|---|---|---|---|
| `display` | 2.75rem | 700 | 1.0 (tracking -0.01em) | `font-display` |
| `large-title` | 1.882rem | 700 | 1.15 | `font-sans` (page titles); `font-display` for slide-style headings |
| `title-1` | 1.529rem | 700 | 1.2 | |
| `title-2` | 1.235rem | 700 | 1.25 | category names use `font-display` here and up |
| `title-3` | 1.118rem | 700 | 1.25 | |
| `headline` | 1rem | 700 | 1.3 | |
| `body` | 1rem | 400 | 1.45 | |
| `callout` | 0.941rem | 400 | 1.4 | |
| `subhead` | 0.882rem | 400 | 1.4 | |
| `footnote` | 0.765rem | 400 | 1.4 | |
| `caption-1` | 0.706rem | 400 (700 in chips) | 1.35 | |
| `caption-2` | 0.647rem | 700 | 1.2 | tab labels |

Eyebrows are uppercase `caption-1` 700 with tracking 0.08em, and are the only uppercase text. The Century Gothic Light 300 face is used by the wordmark only.

Fonts and loading:

| Face | File | Size | Loading |
|---|---|---|---|
| CG 300 | `CenturyGothicPaneuropeanLight.woff2` | 68.5 KB | preloaded; wordmark on Landing |
| CG 400 | `CenturyGothicPaneuropeanRegular.woff2` | 64.7 KB | preloaded |
| CG 700 | `centurygothic_bold.woff2` | ≈ 55-70 KB | not preloaded; loads on first bold text |

- **CG 700 conversion:** the woff2 is converted from the 129.7 KB TTF, or the TTF ships if conversion is declined (that breaks the budget by ~60 KB; recorded).
- **Bellaboo:** no `@font-face` until the file exists. When it does, add it and preload it only if Landing uses it.
- **Budget:** first-load fonts ≤ 250 KB, which is ≈ 190-205 KB with a woff2 bold.
- **Fallbacks:** `--font-sans: "CG", "Century Gothic", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; `--font-display: "Bellaboo", "CG", "Century Gothic", system-ui, sans-serif` (with `font-weight: 700`).
- **Deleted:** Poppins (2.9 MB, unused), WindSong, and both Google `@import`s (a render-blocking third-party request).

Materials:

- `material-bar`: `rgb(24 24 27 / .78)` + `blur(24px) saturate(1.4)`.
- `material-sheet`: `rgb(44 44 49 / .90)` + `blur(32px) saturate(1.3)`.
- `material-scrim`: `rgb(0 0 0 / .55)`, no blur.
- Every material also gets a hairline `0 0 0 .5px var(--sep)`, an inner highlight `inset 0 .5px 0 rgb(255 250 221 / .10)` and `e2 = 0 8px 32px rgb(0 0 0 / .45)`.
- Opaque fallback: `surface` + 1 px `sep`, under `@supports not (backdrop-filter…)`, `prefers-reduced-transparency: reduce` and `prefers-contrast: more`.

Motion: `ui/motion.ts` exports `spring.snappy | sheet | page | podium` (spec §3.7), `fade`, `PRESS_SCALE = 0.97`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `client/vite.config.ts`, `client/src/test/{setup,fixtures}.ts` | DOM test harness |
| `client/src/pages/VotePage.test.tsx` | Vote behavior (characterization) tests |
| `client/src/ui/tokens.ts`, `client/src/index.css` | tokens (single source), `@font-face`, `@theme inline`, `@utility`, base |
| `client/src/ui/logic/*.ts` | contrast, pebble, avatar, segmented, toast, progress, countdown, sheetDrag, focusTrap, tabs, ballotsView, homeWidgets, homePrefs, ics, attention, submit, reveal, resultsTab, youStats, builder, voteScroll |
| `client/src/ui/*.tsx` | primitives, AppShell family, Sheet family, HoldButton, Podium, RevealCard |
| `client/src/ui/__tests__/*` | token sync, tokens-only scan, contrast, component tests, audit, pwa |
| `client/src/dev/DesignGallery.tsx`, `client/src/dev/sections/*` | dev-only gallery |
| `client/src/pages/home/*` | widget components + `CustomizeHomeSheet` |
| `client/src/pages/results/*` | `WinnersView`, `LeaderboardView`, `YouCard` |
| `client/src/pages/SubmitBallotPage.tsx`, `client/src/api/submissions.ts` | Submit screen + `SubmissionIO` |
| `client/src/pages/SettingsPage.tsx` | Settings under You |
| `client/public/fonts/CenturyGothic/centurygothic_bold.woff2` | converted bold |
| `client/public/manifest.webmanifest`, `client/public/icons/*`, `client/scripts/{render-icons,bundle-size}.mjs` | PWA, size check |
| `supabase/migrations/20261122000100_ballot_submissions.sql`, `supabase/tests/database/05_ballot_submissions.test.sql` | Task 20 (deferrable) |
| Modified | `App.tsx`, `main.tsx`, `index.html`, all pages, `components/{OscarLogo,Podium,Countdown,BallotCard,PendingBallots,ProfileSetup,FallingProfileBallPhysics,NavigationTabs,NavigationBar,Modal,DeleteConfirmationModal,EditProfileModal,ManageOscarsModal,CreateOscarsEvent,EditOscarEvent,JokeGeneratorModal,WithAuth,RequireCommittee}.tsx`, `components/committee/*`, `components/vote/*` (Task 21 only), `docs/TESTING.md`, `docs/DEPLOY.md` |
| Deleted when unused | `FullScreenLoader.tsx`, `ProfilePageButton.tsx`, `StatusBadge.tsx`, `StatsPage.tsx`, `public/fonts/Poppins/`, `public/fonts/WindSong/`, `public/vite.svg` |

Order: 1 → 19, then 20 and 21 (deferrable, independent). Tasks 3-5 can run in parallel after 2. Tasks 13-18 depend only on 6-7.

---

### Task 1: Test harness and Vote page behavior tests (guard first)

**Files:** Modify `client/package.json`, `client/package-lock.json`, `client/vite.config.ts`, `client/tsconfig.app.json`. Create `client/src/test/setup.ts`, `client/src/test/fixtures.ts`, `client/src/pages/VotePage.test.tsx`.

**Interfaces — Consumes:** `VotePage` (unchanged), `api/ballots.fetchBallotDetail`, `api/votes.{fetchMyVotes,castVote,clearVote,addNominee}`, `api/members.fetchMembers`, `useUserData`. **Produces:**
- devDeps `jsdom`, `@testing-library/react`, `@testing-library/dom`.
- vitest config: `include: ["src/**/*.test.ts", "src/**/*.test.tsx"]`, `setupFiles: ["src/test/setup.ts"]`. Node stays the default environment, and DOM tests start with `// @vitest-environment jsdom`.
- `setup.ts`: `if (typeof document !== "undefined") { const { cleanup } = await import("@testing-library/react"); afterEach(cleanup) }`. When a DOM exists it also stubs `IntersectionObserver`, `ResizeObserver`, `matchMedia` and `Element.prototype.scrollIntoView`.
- `tsconfig.app.json` exclude adds `src/**/*.test.tsx`, `src/test/**`.
- `fixtures.ts`: `ballot()`, `category()`, `nominee()`, `MEMBERS` (14 names, ids `m-<name>`, photos `/sidechatters/N.jpg`), `deferred<T>()`, `memStorage()`.

The test file starts with an **adapter block**, the only part Task 21 may edit:
```ts
// ADAPTER (Task 21 may change these helpers, never the assertions)
const radio = (name: RegExp) => screen.getByRole("radio", { name })
const section = (cat: RegExp) => screen.getByRole("region", { name: cat })   // old: <section aria-label="Category 1 of 2: …">
const expandCard = async (cat: RegExp) => { /* old UI: click the "Tap to change" button inside section(cat) */ }
const clearButton = (cat: RegExp) => within(section(cat)).getByRole("button", { name: /clear/i })
const nextUnvoted = () => screen.getByRole("button", { name: /next unvoted/i })
const loadError = () => screen.findByText(/couldn't load/i)
```
Mocks: `vi.mock("../api/votes")`, `vi.mock("../api/ballots")`, `vi.mock("../api/members")`, `vi.mock("../context/UserContenxt", () => ({ useUserData: () => state }))`. Render via `MemoryRouter initialEntries={["/app/ballots/B1"]}` + `<Route path="/app/ballots/:ballotId" element={<VotePage/>}/>`. B1 is open (opened yesterday, closes tomorrow) with c1 (Ann, Bo) and c2 (Cy, Di).

- [ ] Write the tests. They describe today's behavior, so they PASS on first run; a failure means the mocks are wrong.
```ts
it("optimistic vote then save", …)                     // click Ann → aria-checked true immediately; castVote("B1","c1","n-ann")
it("failed save reverts and alerts in that category only", …)   // reject → alert within c1; Ann unchecked; no alert in c2
it("rapid taps save in tap order", …)                  // first castVote deferred; Bo queued; 1 call until resolve; last call Bo
it("a stale failure does not override a newer successful tap", …)
it("clear removes the vote", …)                        // expandCard + clearButton → clearVote("B1","c1"); nothing checked
it("closed ballot is read-only", …)                    // radios disabled; role=status /voting is closed/i
it("upcoming ballot says when it opens", …)            // status text = opensAtLabel(opensAt)
it("load failure shows an error", …)
it("no linked member explains why", …)                 // /isn't linked/i
it("next unvoted scrolls to the first unvoted category", …)   // scrollIntoView on c2 section
it("typing an existing option votes for it without creating a nominee", …)
```
- [ ] `cd client && npm test`. Expected PASS. If a test fails, fix the test or mocks, never `VotePage.tsx`.
- [ ] `npm run build`. Expected PASS.
- [ ] Commit: `git add client/package.json client/package-lock.json client/vite.config.ts client/tsconfig.app.json client/src/test client/src/pages/VotePage.test.tsx && git commit -m "Add DOM test harness and Vote page behavior tests"`

### Task 2: Tokens, brand fonts, base CSS, safe areas

**Files:** Create `client/src/ui/tokens.ts`, `client/src/ui/logic/{contrast,pebble}.ts`, `client/src/ui/{motion,haptics}.ts`, `client/public/fonts/CenturyGothic/centurygothic_bold.woff2` (if converted), `client/scripts/bundle-size.mjs`. Modify `client/src/index.css`, `client/index.html`, `client/src/main.tsx`. Delete `client/public/fonts/Poppins/`, `client/public/fonts/WindSong/`. Test `client/src/ui/__tests__/{contrast,tokensCss,pebble,haptics}.test.ts`.

**Interfaces — Produces:**
```ts
// tokens.ts
export const COLORS = { bg: "#18181B", surface: "#27272A", "surface-2": "#3F3F46", elevated: "#2C2C31", label: "#FFFADD", "label-2": "rgb(255 250 221 / .68)", "label-3": "rgb(255 250 221 / .40)", fill: "rgb(255 250 221 / .10)", sep: "rgb(255 250 221 / .12)", "strip-off": "rgb(255 250 221 / .20)", inverse: "#FFFADD", "on-inverse": "#18181B", accent: "#E6C77A", "on-accent": "#1A1304", danger: "#FF7A73", success: "#30D158", warn: "#FFB340", "lime-deep": "#4FA832", gold: "#FFC23D", "on-gold": "#3B2A00", silver: "#9DB4D0", "on-silver": "#17263A", bronze: "#E8803A", "on-bronze": "#2B1204" } as const
export const PEBBLE_COLORS = { strawberry: { bg: "#FF4F9A", on: "#1A1204" }, cherry: { bg: "#FF5148", on: "#1A1204" }, tangerine: {…}, lemon: {…}, lime: {…}, sky: {…}, grape: { bg: "#8B5CF6", on: "#1A1204" } } as const
export type PebbleName = keyof typeof PEBBLE_COLORS
export type ContrastPair = { fg: string; bg: string; min: 3 | 4.5; expect: number; note?: string }   // fg/bg are token names or "pebble:<name>" / "on:<name>"
export const CONTRAST_PAIRS: ContrastPair[]   // every row of the contrast table above, except the rows marked rejected/decorative (those are asserted separately)
// logic/contrast.ts
export function parseColor(c: string): { r: number; g: number; b: number; a: number }
export function composite(fg: string, bg: string): { r: number; g: number; b: number }
export function contrastRatio(fg: string, bg: string): number
// logic/pebble.ts
export const PEBBLES: PebbleName[] = ["strawberry","cherry","tangerine","lemon","lime","sky","grape"]
export const SMALL_TEXT_OK: PebbleName[]   // computed: on-color ratio ≥ 4.5 (all but grape)
export const HERO_EXCLUDE: PebbleName[] = ["lemon"]
export const RESULTS_EXCLUDE: PebbleName[] = ["lemon","tangerine"]
export const STATUS_PEBBLE = { open: "lime", upcoming: "sky", voted: "strawberry", submitted: "strawberry", released: "lemon", closed: null, draft: null } as const
export type PebbleOpts = { exclude?: PebbleName[]; smallText?: boolean }
export function pebbleFor(key: string, opts?: PebbleOpts): PebbleName    // FNV-1a 32-bit over UTF-16 units (start 0x811c9dc5, Math.imul 0x01000193 >>> 0), mod allowed list; empty allowed → "strawberry"
export function pebbleAt(index: number, opts?: PebbleOpts): PebbleName   // allowed[((index % n) + n) % n]
export const PEBBLE_CLASS: Record<PebbleName, { bg: string; text: string }>   // literal strings, e.g. { bg: "bg-pebble-cherry", text: "text-on-pebble-cherry" }
// motion.ts / haptics.ts
export const spring = {…} as const; export const fade = {…} as const; export const PRESS_SCALE = 0.97
export const HAPTIC = { release: 20, submit: 20, reveal: [15, 60, 15], saveFailed: 40 } as const
export function vibrate(kind: keyof typeof HAPTIC): void   // no-op without navigator.vibrate; never throws
```
`index.css`, in order:
1. `@import "tailwindcss";`
2. `@font-face` blocks for family **"CG"**: 300 → `CenturyGothicPaneuropeanLight.woff2`, 400 → `CenturyGothicPaneuropeanRegular.woff2`, 700 → `centurygothic_bold.woff2` (or `.ttf` + `format("truetype")`), each with `font-display: swap`. Add a commented `/* BELLABOO SLOT: @font-face { font-family: "Bellaboo"; src: url("/fonts/Bellaboo/Bellaboo.woff2") format("woff2"); font-weight: 400; font-display: swap; } — enable when the file exists and its web license is confirmed */`.
3. `:root { color-scheme: dark; --bg: …; … }` with every `COLORS` and `PEBBLE_COLORS` value, and the comment `/* Dark only. A light set would be a second block under @media (prefers-color-scheme: light). */`.
4. `@theme inline` mapping `--color-<role>: var(--<role>)` for every role, pebble and on-pebble, plus `--font-sans`, `--font-display`, `--font-brand: "CG", "Century Gothic", sans-serif`, the `--text-<name>` sizes with `--line-height` and `--font-weight` sub-keys, `--radius-control: 16px`, `--radius-card: 24px`, `--radius-sheet: 28px`, `--shadow-e1: none`, `--shadow-e2: …`, and `--breakpoint-3xl: 87.5rem` (1400 px).
5. `@utility` `material-bar`, `material-sheet`, `material-scrim` (each with BOTH `-webkit-backdrop-filter` and `backdrop-filter`), `pt-safe`, `pb-safe`, `px-gutter` (`max(16px, env(safe-area-inset-left/right))`; 24 px ≥ 768; 32 px ≥ 1024) and `prose-width`.
6. Unlayered opaque fallbacks for materials.
7. Base:
   - `html { background: var(--bg); color: var(--label); font-family: var(--font-sans); -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100% }`
   - `@supports (font: -apple-system-body) { html { font: -apple-system-body; font-family: var(--font-sans) } }` (iOS text size)
   - `body { min-height: 100dvh }`
   - the global `:focus-visible` two-tone ring
   - `.skeleton` pulse, with `@media (prefers-reduced-motion: reduce)` and `[data-reduce-motion]` turning it off
   - `.font-oscars-regular { font-family: var(--font-brand); font-weight: 400 }` and `.font-oscars-thin { font-family: var(--font-brand); font-weight: 300 }`, kept for legacy pages and the wordmark
8. Delete the Google `@import`s, the WindSong and Poppins classes, the old `CenturyGothicRegular`/`Thin` faces (replaced by "CG" 300/400) and the global `button:active` scale.

`index.html`:
- `lang="en"`
- `viewport` = `width=device-width, initial-scale=1, viewport-fit=cover`
- `<title>JSC Oscars</title>`
- `<meta name="color-scheme" content="dark">`
- `<meta name="theme-color" content="#18181B">`
- `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the CG 300 and 400 files

`main.tsx` wraps `<App/>` in `<MotionConfig reducedMotion="user">`.

`bundle-size.mjs` prints the gzip size of `dist/assets/*.{js,css}`, the raw size of each font file under `dist/fonts`, and the totals.

- [ ] CONTROLLER: check for `python3 -c "import fontTools, brotli"`. If missing, ask the user to OK `python3 -m pip install --user fonttools brotli` (PyPI, ~5 MB). On yes, the implementer runs `python3 -m fontTools.ttLib.woff2 compress -o client/public/fonts/CenturyGothic/centurygothic_bold.woff2 client/public/fonts/CenturyGothic/centurygothic_bold.ttf`. On no, the `@font-face` uses the TTF and the ledger notes "fonts over budget by ~60 KB".
- [ ] Failing tests:
```ts
expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1)
expect(contrastRatio("rgb(255 250 221 / .68)", "#3F3F46")).toBeCloseTo(5.60, 1)
for (const p of CONTRAST_PAIRS) { const r = contrastRatio(resolve(p.fg), resolve(p.bg)); expect(r).toBeGreaterThanOrEqual(p.min); expect(r).toBeCloseTo(p.expect, 1) }
for (const n of PEBBLES) expect(contrastRatio(PEBBLE_COLORS[n].on, PEBBLE_COLORS[n].bg)).toBeGreaterThanOrEqual(contrastRatio("#FFFFFF", PEBBLE_COLORS[n].bg))   // on-color chosen by contrast
expect(SMALL_TEXT_OK).toEqual(["strawberry","cherry","tangerine","lemon","lime","sky"])
expect(contrastRatio(COLORS["on-inverse"], COLORS.inverse)).toBeGreaterThanOrEqual(4.5)
expect(contrastRatio(PEBBLE_COLORS.lemon.on, COLORS["lime-deep"])).toBeCloseTo(6.16, 1)
// tokensCss.test.ts (fs): every COLORS / PEBBLE_COLORS value appears in index.css as `--<name>: <value>;` (hex case-insensitive) and `--color-<name>: var(--<name>)`;
//   both -webkit-backdrop-filter and backdrop-filter present; no "fonts.googleapis", "Poppins", "WindSong", "button:active";
//   @font-face for CG declares weights 300, 400 and 700; index.html has "viewport-fit=cover", no "maximum-scale"/"user-scalable"
// pebble.test.ts
expect(PEBBLES).toHaveLength(7)
expect(pebbleFor("m-Micah")).toBe(pebbleFor("m-Micah"))
expect(new Set(MEMBERS.map(m => pebbleFor(m.id))).size).toBeGreaterThanOrEqual(5)
for (const m of MEMBERS) expect(pebbleFor(m.id, { smallText: true })).not.toBe("grape")
for (let i = 0; i < 40; i++) { expect(pebbleAt(i, { exclude: HERO_EXCLUDE })).not.toBe("lemon"); expect(RESULTS_EXCLUDE).not.toContain(pebbleAt(i, { exclude: RESULTS_EXCLUDE })) }
expect([0,1,2,3,4,5,6,7].map(i => pebbleAt(i))).toEqual(["strawberry","cherry","tangerine","lemon","lime","sky","grape","strawberry"])
expect(pebbleFor("x", { exclude: PEBBLES })).toBe("strawberry")
expect(Object.values(STATUS_PEBBLE)).not.toContain("cherry")
expect(pebbleFor("m-Rickey")).toBe("<pinned on first green run; controller records it>")   // freezes the mapping
// haptics.test.ts
vi.stubGlobal("navigator", { vibrate: v }); vibrate("reveal"); expect(v).toHaveBeenCalledWith([15,60,15]); vi.stubGlobal("navigator", {}); expect(() => vibrate("submit")).not.toThrow()
```
- [ ] `npm test`. Expected FAIL: modules not found.
- [ ] Implement. Run `grep -rn "font-windsong\|font-poppins" client/src` and remove those classes (no other page edits).
- [ ] `npm test && npm run build`. Expected PASS. Run `node client/scripts/bundle-size.mjs`; the controller stores the totals as `BASELINE` in the ledger.
- [ ] Controller browser check (375 / 1280 / 1440): every existing page renders in Century Gothic on the same dark base. The wordmark is unchanged. In DevTools › Rendering, bold text uses the real 700 face (Computed › Rendered fonts shows "CG" Bold, not synthesized). Tab shows the focus ring. The notch area is respected.
- [ ] Commit: `git add -A client/src/ui client/src/index.css client/index.html client/src/main.tsx client/public/fonts client/scripts/bundle-size.mjs && git commit -m "Add dark brand tokens, Fruity Pebbles palette and Century Gothic faces"`

### Task 3: Dev gallery, OscarLogo on tokens, tokens-only scan

**Files:** Create `client/src/dev/DesignGallery.tsx`, `client/src/dev/sections/{index,Foundations,Type,Logo}.tsx`, `client/src/ui/__tests__/tokensOnly.test.ts`. Modify `client/src/App.tsx`, `client/src/components/OscarLogo.tsx`.

**Interfaces — Produces:**
- `App.tsx`: `const DesignGallery = import.meta.env.DEV ? lazy(() => import("./dev/DesignGallery")) : null`; `{DesignGallery && <Route path="/dev/design" element={<Suspense fallback={null}><DesignGallery/></Suspense>}/>}` outside every auth wrapper.
- `DesignGallery`:
  - heading "Design gallery";
  - a section index;
  - a "Reduce motion" toggle (`<MotionConfig reducedMotion="always">` + `data-reduce-motion`);
  - a width ruler showing the current viewport width;
  - `?section=<id>` renders one section;
  - `SECTIONS: { id; title; Component }[]` registry in `sections/index.ts`.
- `Foundations`: swatches for every role and pebble with an on-color sample and the live `contrastRatio` (dark palette only), materials over a photo strip, the focus ring on every pebble plus cream, lemon and lime.
- `Type`: specimens for both families.
  - Century Gothic: 300 / 400 / 700 at each type token, a paragraph at `prose-width`, and a long category name wrapping at the current width.
  - Display slot: "Best locs" at `title-2` / `title-1` / `display`, with a live status line: `document.fonts.check("700 1em Bellaboo") ? "Bellaboo loaded" : "Bellaboo not installed, showing Century Gothic Bold"`.
- `OscarLogo`:
  - props `{ size?: LogoSize; as?: "h1" | "div"; decorative?: boolean; tone?: "cream" | "onLemon" | "onLime" }`, default `as="div"`, `tone="cream"` (`text-label`; `onLemon`/`onLime` → `text-on-pebble-lemon`/`-lime`);
  - `decorative` → `aria-hidden`, otherwise `role="img" aria-label="Just Sidechatting Oscars"`;
  - `text-label`, `font-oscars-regular` / `font-oscars-thin` (now "CG" 400/300), sizes unchanged.
- `Logo` section: every `LogoSize` plus placements:
  - Landing hero over the falling-avatar strip;
  - auth header;
  - NavBar compact `xxsmall` on `material-bar`;
  - Home header `small`;
  - sidebar top `xsmall` (at 1280);
  - Release header on lemon (dark logo variant: `tone="onLemon"` prop → `text-on-pebble-lemon`);
  - reveal header.
- `tokensOnly.test.ts` scans `src/ui/**`, `src/dev/**` (excluding `ui/tokens.ts`) + `MIGRATED` (starts with `src/components/OscarLogo.tsx`). It fails on:
  - `/#[0-9a-fA-F]{3,8}\b/`, `/\brgba?\(/`, `/\[#/`;
  - raw palette classes `/\b(bg|text|border|ring|outline|fill|stroke|from|to|via|shadow|divide|placeholder)-(zinc|amber|neutral|gray|slate|stone|red|green|blue|purple|yellow|orange|pink|emerald|sky|lime|rose|violet)-\d/`;
  - `/\bdark:/`, `/\b(h-screen|min-h-screen|100vh)\b/`;
  - a className containing `font-display` together with `text-(headline|body|callout|subhead|footnote|caption-1|caption-2|title-3)`.
  - It reports file:line.

- [ ] Failing test: `tokensOnly.test.ts`. Expected FAIL: `OscarLogo.tsx: text-[#fffadd]`.
- [ ] Implement.
- [ ] `npm test && npm run build`. Expected PASS. `grep -rl "Design gallery" client/dist` prints nothing.
- [ ] Controller browser check at 375, 1280 and 1440, no login: `/dev/design`. Swatch ratios match the table (dark only). **Logo:** every size and placement renders in Century Gothic (`javascript_tool`: `document.fonts.check("300 1em CG") && document.fonts.check("400 1em CG")` → true), and the dark-on-lemon variant is legible. Type specimens wrap cleanly at 375, with no clipped headings.
- [ ] Commit: `git add client/src/dev client/src/ui/__tests__/tokensOnly.test.ts client/src/App.tsx client/src/components/OscarLogo.tsx && git commit -m "Add dev design gallery, type specimens and tokenized Oscars logo"`

### Task 4: Primitives A (Button, Chip, Avatar, ColorBlock, Card, ListRow, Skeleton, EmptyState, ErrorState)

**Files:** Create `client/src/ui/{Button,Chip,Avatar,AvatarStack,ColorBlock,Card,GroupedSection,ListRow,Switch,Skeleton,EmptyState,ErrorState}.tsx`, `client/src/ui/logic/avatar.ts`, `client/src/ui/copy.ts`, `client/src/dev/sections/PrimitivesA.tsx`. Test `client/src/ui/__tests__/{avatar.test.ts,primitivesA.test.tsx}`.

**Interfaces — Consumes:** tokens, `PEBBLE_CLASS`, `pebbleFor`, `PRESS_SCALE`. **Produces:**
```ts
type ButtonProps = { variant?: "primary" | "pebble" | "secondary" | "tinted" | "destructive" | "plain"; pebble?: PebbleName; size?: "lg" | "md" | "sm"; loading?: boolean; loadingLabel?: string; icon?: ReactNode; to?: string; fullWidth?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>
// <Link> when `to` (never link+button); primary bg-inverse text-on-inverse; pebble PEBBLE_CLASS; secondary bg-surface-2; tinted bg-fill; destructive bg-fill text-danger; plain text-only
// lg 56px pill text-headline; md 44px; sm 32px visual + 44px hit; hover (hover:hover) brightness step; pressed scale PRESS_SCALE via motion whileTap; disabled text-label-3 bg-fill; loading → disabled + aria-busy + spinner + loadingLabel
export function Chip(p: { tone?: "neutral" | "success" | "warn" | "danger" | "gold" | Exclude<PebbleName, "grape">; icon?: ReactNode; children: ReactNode })   // 24px, caption-1 700
export function Avatar(p: { id: string; name: string; src?: string | null; size: 24 | 32 | 40 | 56 | 72 | 96; ring?: "bg" | "gold" | "silver" | "bronze" | "lemon"; decorative?: boolean; struck?: boolean })   // struck = crossed-out (taken names)
export function AvatarStack(p: { people: { id: string; name: string; src?: string | null }[]; max?: number; size?: 24 | 32 })
export function ColorBlock(p: { pebble: PebbleName; as?: "section" | "div" | "a"; to?: string; eyebrow?: string; title?: ReactNode; children?: ReactNode; className?: string })   // rounded-card p-5, on-pebble text; link when `to` with hover lift (hover:hover) and focus ring
export function Card(p: { as?: "section" | "div"; children: ReactNode; className?: string })
export function GroupedSection(p: { header?: string; footer?: string; children: ReactNode })
export function ListRow(p: { title: ReactNode; subtitle?: ReactNode; leading?: ReactNode; trailing?: ReactNode; to?: string; onClick?: () => void; chevron?: boolean; selected?: boolean; destructive?: boolean })
export function Switch(p: { checked: boolean; onChange(v: boolean): void; label: string })   // role="switch", 51x31 visual in 44px hit
export function Skeleton(p: { shape: "line" | "block" | "circle" | "card" | "row"; width?: string; height?: string }); export function SkeletonScreen(p: { label: string; children: ReactNode })
export function EmptyState(p: { icon: LucideIcon; title: string; body?: string; action?: ReactNode })
export function ErrorState(p: { title: string; body: string; onRetry?: () => void })   // role="alert"
// logic/avatar.ts
export function initials(name: string): string; export function avatarFallback(id: string): PebbleName   // pebbleFor(id, { smallText: true })
// copy.ts
export const COPY = { retry: "Try again", logIn: "Log in", logOut: "Log out", createAccount: "Create account", loadFailed: (what: string) => `Couldn't load ${what}. Check your connection and try again.`, … } as const
```
- [ ] Failing tests:
```ts
expect(initials("Nick, Rickey")).toBe("NR"); expect(initials("anthony")).toBe("A"); expect(initials("  ")).toBe("?"); expect(initials("Mary Jane Watson")).toBe("MW")
expect(avatarFallback("m-Micah")).not.toBe("grape")
// jsdom
render(<Button loading loadingLabel="Logging in…">Log in</Button>) → disabled, aria-busy="true", text contains "Logging in…"
render(<MemoryRouter><Button to="/x">Go</Button></MemoryRouter>) → link "Go" has no descendant button
render(<Avatar id="m1" name="Ann" src="/bad.jpg" size={40} />); fireEvent.error(img) → text "A"
render(<AvatarStack people={six} />) → "+2"
render(<ErrorState … onRetry={r} />) → role alert; click "Try again" calls r
render(<Switch checked={false} onChange={f} label="Countdown" />); click → f(true); role "switch" aria-checked "false"
```
- [ ] `npm test`. Expected FAIL: modules not found.
- [ ] Implement, and add the gallery section: all Button variants × sizes × idle / hover (`data-hover`) / pressed (`data-pressed`) / disabled / loading, every Chip tone, Avatars (photo, initials, broken, rings incl. lemon, struck), ColorBlock in all 7 pebbles (grape with headline only), Card, GroupedSection rows, Switch, Skeletons, EmptyState, ErrorState.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller browser check (375 / 1280 / 1440): `/dev/design?section=primitives-a`. States are visible, hover only appears on the desktop pointer, Tab order is sensible and the focus ring shows on every control.
- [ ] Commit: `git add client/src/ui client/src/dev && git commit -m "Add buttons, chips, avatars, color blocks, lists and state primitives"`

### Task 5: Primitives B (SegmentedControl, Toast, ProgressStrip, Countdown, Podium, HoldButton) — STOP POINT 1

**Files:** Create `client/src/ui/{SegmentedControl,Toast,ProgressStrip,Countdown,Podium,HoldButton}.tsx`, `client/src/ui/logic/{segmented,toast,progress,countdown}.ts`, `client/src/dev/sections/PrimitivesB.tsx`. Modify `client/src/components/Podium.tsx` (re-export `ui/Podium` + `PodiumItem`), `client/src/components/Countdown.tsx` (re-export `ui/Countdown` with the current props contract; read it first), `client/src/pages/committee/ReleasePage.tsx` (import `HoldButton` from `ui/`; delete the local copy; nothing else). Test `client/src/ui/__tests__/{segmented,toast,progress,countdown}.test.ts`, `primitivesB.test.tsx`.

**Interfaces — Consumes:** `countdownParts`, `holdProgress`/`HoldState`, `ordinal` (lib, unchanged). **Produces:**
```ts
export function nextSegment(index: number, key: string, count: number): number | null   // arrows wrap, Home/End, else null
export function SegmentedControl<T extends string>(p: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; idPrefix: string })   // role tablist/tab, roving tabIndex, thumb bg-inverse text-on-inverse on bg-fill, 44px, layoutId thumb spring.snappy
export type ToastItem = { id: number; text: string; actionLabel?: string; persistent?: boolean }
export function toastReducer(s: ToastItem[], a: { type: "show"; item: ToastItem } | { type: "dismiss"; id: number }): ToastItem[]   // one visible; show replaces
export const TOAST_MS = 4000; export function ToastProvider(p: { children: ReactNode }); export function useToast(): { show(text: string, o?: { actionLabel?: string; onAction?: () => void; persistent?: boolean }): void }   // optional context: no-op outside provider
export function progressLabel(voted: number, total: number): string   // "8 of 30 voted. Jump to a category"
export function segmentsTappable(widthPx: number, count: number): boolean   // width / count - 2 >= 20
export function ProgressStrip(p: { states: DashState[]; labels: string[]; orientation?: "horizontal" | "vertical"; onJump(i: number): void; onOpenJump(): void })
// CREAM: voted bg-label, unvoted bg-strip-off, current taller (8px vs 4px; vertical: wider) + outline; one button when !segmentsTappable, else per-segment buttons with aria-label "Category 3: Best locs, voted"
export type CountdownView = { state: "none" } | { state: "live" } | { state: "today"; timeLabel: string } | { state: "scheduled"; main: string; seconds: string; dateLabel: string; ariaLabel: string }
export function countdownView(target: Date | null, now: Date): CountdownView
// Countdown.tsx: text-display font-display tabular-nums, aria-live="off", aria-label per minute; copy: "Date coming soon" / "Tonight at 3:00 PM" / "It's Oscar night"
// ui/Podium.tsx: PodiumItem unchanged + `variant?: "card" | "hero"`, `animate?: boolean`; blocks 112/84/64 (hero x1.4) flat bg-gold/silver/bronze + on-*; numeral font-display; avatars 72/56/56 with podium ring; DOM order 1-2-3, CSS order 2-1-3; sr-only "1st place: "
// ui/HoldButton.tsx: export type HoldButtonProps = existing props + `tone?: "release" | "submit"`, `label: string`, `hint: string`
//   release: track bg-pebble-lime with 2px border text-on-pebble-lemon color (border-current), fill bg-lime-deep, label text-on-pebble-lime title-3 700
//   submit:  track bg-bg, fill bg-pebble-grape, label text-label title-3 700
//   56px pill; keep every handler (pointer capture, touch-action none, select-none, contextmenu, keyboard) exactly
```
- [ ] Failing tests:
```ts
expect(nextSegment(0,"ArrowRight",2)).toBe(1); expect(nextSegment(1,"ArrowRight",2)).toBe(0); expect(nextSegment(0,"ArrowLeft",3)).toBe(2); expect(nextSegment(2,"Home",3)).toBe(0); expect(nextSegment(0,"End",3)).toBe(2); expect(nextSegment(0,"a",3)).toBeNull()
expect(toastReducer([{ id: 1, text: "a" }], { type: "show", item: { id: 2, text: "b" } }).map(t => t.id)).toEqual([2]); expect(toastReducer([{ id: 2, text: "b" }], { type: "dismiss", id: 1 })).toHaveLength(1)
expect(progressLabel(8, 30)).toBe("8 of 30 voted. Jump to a category"); expect(segmentsTappable(375, 30)).toBe(false); expect(segmentsTappable(1040, 30)).toBe(true)
const t = new Date("2026-12-04T21:00:00Z")
expect(countdownView(null, t)).toEqual({ state: "none" }); expect(countdownView(t, new Date("2026-12-04T21:00:01Z"))).toEqual({ state: "live" })
expect(countdownView(t, new Date("2026-11-22T16:28:53Z"))).toMatchObject({ state: "scheduled", main: "12d 04h 31m", seconds: "07s", ariaLabel: "12 days 4 hours 31 minutes until Oscar night" })
expect(countdownView(t, new Date("2026-12-04T15:00:00Z")).state).toBe("today")
// jsdom: SegmentedControl tablist + ArrowRight → onChange("leaderboard"); Podium first listitem contains "1st place";
// ProgressStrip at width 375 renders exactly one button named "8 of 30 voted. Jump to a category"; voted dash has class bg-label, unvoted bg-strip-off
```
- [ ] `npm test`. Expected FAIL: modules not found.
- [ ] Implement, and add the gallery section: SegmentedControl, Toast (info / undo / persistent), ProgressStrip horizontal at 375 and 1280 and vertical (desktop vote pane), Countdown in all states, Podium card and hero (ties, missing 3rd), HoldButton release-on-lemon and submit-on-lime (idle / 50% / busy / disabled with reasons).
- [ ] `npm test && npm run build`. Expected PASS (`hold.test.ts`, `VotePage.test.tsx` green; Release unchanged in behavior).
- [ ] Controller check, then **STOP POINT 1**. Screenshot the gallery (foundations, type, logo, primitives A/B) at 375, 1280 and 1440, with reduced motion on and off. The user approves the look, the palette (tweaks go only into `tokens.ts` + `index.css`, keeping `contrast.test.ts` green), the type specimens and the logo placements.
- [ ] Commit: `git add client/src/ui client/src/dev client/src/components/Podium.tsx client/src/components/Countdown.tsx client/src/pages/committee/ReleasePage.tsx && git commit -m "Add segmented control, toast, cream progress strip, countdown, podium and hold button"`

### Task 6: AppShell (Screen, NavBar, LargeTitle, TabBar, Sidebar, accessory) and nested routes

**Files:** Create `client/src/ui/{AppShell,Screen,NavBar,LargeTitle,TabBar,Sidebar,BottomAccessory,RequireAuth,NotFound}.tsx`, `client/src/ui/logic/tabs.ts`, `client/src/dev/sections/Shell.tsx`. Modify `client/src/App.tsx`, `client/src/components/{NavigationTabs,NavigationBar,RequireCommittee,WithAuth}.tsx`. Test `client/src/ui/__tests__/{tabs.test.ts,shell.test.tsx}`.

**Interfaces — Consumes:** `useAuth`, `UserDataProvider`/`useUserData`, `fetchBallotSummaries`, `pendingBallots`, `fetchMemberAvatars`, `OscarLogo`, `ToastProvider`, primitives. **Produces:**
```ts
export type TabId = "home" | "ballots" | "results" | "you"
export const TABS: { id: TabId; label: string; to: string; icon: LucideIcon }[]   // Home /app, Ballots /app/ballots, Results /app/results, You /app/profile
export function activeTab(pathname: string): TabId | null   // /app/stats → results; /app/profile/** → you; /app/ballots/:id/submit → ballots
export function Screen(p: { title: string; back?: { to: string; label: string }; trailing?: ReactNode; subtitle?: ReactNode; brandHeader?: boolean; ceremony?: PebbleName; width?: "column" | "wide" | "full"; children: ReactNode })
// NavBar sticky pt-safe: transparent at rest → material-bar + hairline after the large title scrolls under (IntersectionObserver sentinel); compact title (or OscarLogo xxsmall decorative when brandHeader); back link "‹ {label}" ≥44px aria-label "Back to {label}"; trailing slot
// LargeTitle: h1 text-large-title; brandHeader → OscarLogo small + sr-only h1
// width: column = max-w-[720px] mx-auto; wide = max-w-[1040px]; full = no max (grids decide)
// ceremony: full-bleed page in that pebble with on-pebble text, NavBar transparent with on-pebble back link, hides TabBar (via shell context setHideTabBar) — used by Release (lemon) and Submit (lime)
export function BottomAccessory(p: { children: ReactNode })   // portal into the shell slot; ResizeObserver → --accessory-h
// AppShell: skip link; ToastProvider; ConfirmProvider (Task 7); <Outlet/>; phone (<1024): fixed bottom stack [accessory slot data-testid="shell-accessory", TabBar]; ≥1024: Sidebar (260px bg-surface: OscarLogo xsmall, nav items with icons + hover/active states + aria-current, "Committee" group when profile.is_committee (New ballot, Manage ballots, Members, The envelope), user chip at bottom (Avatar 32 + name → /app/profile)), content offset, accessory sits at the bottom of the content column; --content-pb = calc(64px + 8px + env(safe-area-inset-bottom) + var(--accessory-h, 0px) + 16px) on phone, 32px on desktop
// TabBar: <nav aria-label="Main"> floating capsule material-bar rounded-sheet shadow-e2 (left/right 12, bottom calc(8px + safe-area)); 4 <Link>s flex-1 min-h-[49px]; icon 24 (selected fill="currentColor") + caption-2; selected text-label + bg-fill pill, inactive text-label-2; aria-current="page"; Ballots badge = pendingBallots count (fetch on mount + visibilitychange; failure → none); hidden while a text input has focus on phone
// Sidebar is also <nav aria-label="Main"> but only one of the two renders at a time (matchMedia (min-width: 1024px) hook), so there is always exactly one "Main" nav
export function RequireAuth(p: { children: ReactNode })   // loading SkeletonScreen; no user → Navigate "/"
export function NotFound()   // EmptyState "Page not found" + "Go home"
// compat: NavigationTabs = ({ children }) => children ? <BottomAccessory>{children}</BottomAccessory> : null ; NavigationBar = () => null
```
Routes:
```tsx
<Route path="/app" element={<RequireAuth><UserDataProvider><AppShell/></UserDataProvider></RequireAuth>}>
  index Home · ballots · ballots/:ballotId (VotePage) · results · stats (StatsPage until Task 13) · profile
  <Route element={<RequireCommittee><Outlet/></RequireCommittee>}> profile/ballots/create · profile/ballots · profile/ballots/:ballotId · profile/release · profile/members </Route>
  * NotFound
</Route>
<Route path="*" element={<NotFound/>}/>
```
- [ ] Failing tests:
```ts
expect(activeTab("/app")).toBe("home"); expect(activeTab("/app/ballots/123")).toBe("ballots"); expect(activeTab("/app/ballots/123/submit")).toBe("ballots"); expect(activeTab("/app/stats")).toBe("results"); expect(activeTab("/app/profile/settings")).toBe("you"); expect(activeTab("/login")).toBeNull()
it("phone: tab bar has 4 links, current marked, no nested buttons", …)                 // matchMedia false
it("desktop: sidebar replaces tab bar; user chip links to /app/profile; committee group only for committee", …)   // matchMedia true
it("hosts the OLD vote page: one Main nav, its bottom bar in the accessory slot", …)  // findAllByRole radio; getAllByRole navigation Main length 1; within(shell-accessory) button /next unvoted/i
it("unknown /app path → Page not found", …); it("signed out → /", …)
```
- [ ] `npm test`. Expected FAIL: modules not found.
- [ ] Implement, and add the gallery `Shell` section: a static Screen at rest and scrolled (`?scrolled=1`), a ceremony Screen on lemon and lime, the TabBar with a badge, and the Sidebar with the user chip (rendered when width ≥ 1024).
- [ ] `npm test && npm run build`. Expected PASS, including `VotePage.test.tsx`.
- [ ] Controller browser check (`test.micah` and `test.rickey`; 375 / 1280 / 1440):
  - The tab bar floats with blur and clears the home indicator. Tabs read Home, Ballots, Results, You.
  - At ≥ 1024 the sidebar has the logo and the user chip, and keyboard Tab moves through the sidebar then the content.
  - **The old Vote page on `[TEST] Main Ballot`**: vote, change and clear one category, then reload; the votes persist and the bottom bar sits above the tab bar (phone) or at the column bottom (desktop).
- [ ] Commit: `git add client/src/ui client/src/dev client/src/App.tsx client/src/components/NavigationTabs.tsx client/src/components/NavigationBar.tsx client/src/components/RequireCommittee.tsx client/src/components/WithAuth.tsx && git commit -m "Add app shell with floating tab bar, desktop sidebar and nested routes"`

### Task 7: Sheet, ConfirmSheet, useConfirm; Modal adapters; replace window.confirm

**Files:** Create `client/src/ui/{Sheet,ConfirmSheet,ConfirmProvider}.tsx`, `client/src/ui/logic/{sheetDrag,focusTrap}.ts`, `client/src/dev/sections/Sheets.tsx`. Modify `client/src/ui/AppShell.tsx`, `client/src/components/{Modal,DeleteConfirmationModal}.tsx`, `client/src/components/committee/TallyPanel.tsx`, `client/src/pages/committee/BallotAdminPage.tsx`, `client/src/pages/ballot-builder/NomineeModePicker.tsx`. Test `client/src/ui/__tests__/{sheetDrag,focusTrap}.test.ts`, `sheet.test.tsx`.

**Interfaces — Produces:**
```ts
export type Detent = "medium" | "large"
export function dragOutcome(p: { offsetY: number; velocityY: number; height: number; detent: Detent; detents: Detent[] }): "dismiss" | Detent
export const FOCUSABLE: string; export function nextFocus(items: HTMLElement[], current: Element | null, shift: boolean): HTMLElement | null
export function Sheet(p: { open: boolean; onClose: () => void; title: string; detents?: Detent[]; initialDetent?: Detent; leading?: ReactNode; trailing?: ReactNode; footer?: ReactNode; dirty?: boolean; initialFocus?: "first" | "title"; children: ReactNode })
// phone (<1024): bottom sheet material-sheet, grabber button "Resize sheet", detents, drag (motion drag="y" on grabber/header, body when scrollTop 0) → dragOutcome; data-dragging drops blur to 12px
// desktop (≥1024): centered dialog 560px (rounded-sheet, scrim), no drag, close button top-right, Esc; width "wide" option 720 for builder sheets
// both: portal; AnimatePresence outside the open check; role="dialog" aria-modal aria-labelledby; focus trap; Esc → onClose (dirty → ConfirmSheet "Discard changes?"/"Discard"); focus returns to opener; body scroll lock; overscroll-contain; footer pb-safe; visualViewport keeps footer above keyboard; reduced motion: fade only
export function ConfirmSheet(p: { open: boolean; title: string; message?: string; confirmLabel: string; destructive?: boolean; onConfirm(): void; onCancel(): void })   // role="alertdialog"; Cancel focused first; confirm labelled with the verb; desktop = centered 400px alert
export function useConfirm(): (o: { title: string; message?: string; confirmLabel: string; destructive?: boolean }) => Promise<boolean>
// Modal.tsx compat (same exports/props) → Sheet detents ["large"]; DeleteConfirmationModal compat → ConfirmSheet destructive
```
Call sites: each `if (!window.confirm(msg)) return …` becomes `if (!(await confirm({…}))) return …`, making the handler `async` where needed. Nothing else changes.

| Call site | Title | Message | Confirm label | Destructive |
|---|---|---|---|---|
| TallyPanel:144 | "Replace recorded winners?" | existing list | "Replace" | |
| TallyPanel:163 | `Create a ${roundLabel} round?` | "It opens for voting right away." | "Create round" | |
| TallyPanel:174 | `Replace the winner for ${v.name}?` | | "Replace" | yes |
| BallotAdminPage:50 | consequence title ("Close voting for {name}?") | | verb ("Close voting") | yes |
| NomineeModePicker:25 | "Switch mode and clear nominees?" | | "Switch" | yes |

- [ ] Failing tests:
```ts
expect(dragOutcome({ offsetY: 400, velocityY: 0, height: 800, detent: "large", detents: ["medium","large"] })).toBe("medium")
expect(dragOutcome({ offsetY: 400, velocityY: 0, height: 800, detent: "large", detents: ["large"] })).toBe("dismiss")
expect(dragOutcome({ offsetY: 40, velocityY: 900, height: 800, detent: "medium", detents: ["medium","large"] })).toBe("dismiss")
expect(dragOutcome({ offsetY: 40, velocityY: 100, height: 800, detent: "medium", detents: ["medium","large"] })).toBe("medium")
expect(dragOutcome({ offsetY: -200, velocityY: -100, height: 800, detent: "medium", detents: ["medium","large"] })).toBe("large")
expect(nextFocus([a,b,c], c, false)).toBe(a); expect(nextFocus([a,b,c], a, true)).toBe(c)
it("dialog semantics, focus in, Esc closes, focus returns to opener", …); it("Tab wraps inside", …)
it("desktop renders a centered dialog without a grabber", …)    // matchMedia true → no "Resize sheet" button
it("useConfirm resolves true on confirm, false on cancel; Cancel focused first", …)
it("no window.confirm left in src", …)
```
- [ ] `npm test`. Expected FAIL.
- [ ] Implement, and add the gallery `Sheets` section (medium, large, dirty close, destructive confirm, keyboard-open input, desktop dialog).
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller check (375 / 1280 / 1440): gallery sheets drag on phone and are centered dialogs on desktop. Esc and the trap work. In the app: You › Edit profile (adapter) and Ballot admin › Close now (ConfirmSheet; cancel).
- [ ] Commit: `git add client/src/ui client/src/dev client/src/components/Modal.tsx client/src/components/DeleteConfirmationModal.tsx client/src/components/committee/TallyPanel.tsx client/src/pages/committee/BallotAdminPage.tsx client/src/pages/ballot-builder/NomineeModePicker.tsx && git commit -m "Add sheet and confirm sheet; replace window.confirm"`

### Task 8: Sheet migrations (photo setup, forgot password, verify email, bulk import)

**Files:** Modify `client/src/components/ProfileSetup.tsx`, `client/src/pages/HomePage.tsx` (only the ProfileSetup render), `client/src/pages/LoginPage.tsx` (ForgotPasswordModal → Sheet), `client/src/pages/SignupPage.tsx` (VerifyEmailModal → Sheet), `client/src/pages/ballot-builder/BulkImportPanel.tsx` (→ Sheet large). Test `client/src/ui/__tests__/addPhotoSheet.test.tsx`.

**Interfaces — Produces:** `ProfileSetup(p: { open: boolean; onComplete(): void; onSkip(): void })`.
- It is one step: an Avatar 96 preview with the lemon ring, a "Choose photo" file input (label-wrapped), a primary "Continue" ("Saving…" while loading) and a plain "Not now".
- The upload code and `uploadError` copy are kept verbatim. On success: `useToast().show("Photo updated")`.
- **No timers, no auto-advance, no auto-dismiss.**
- Forgot password: medium sheet with a labelled email field (`autoComplete="email"`) and "Send reset link", using the same supabase call.
- Verify email: the same copy with "Done".
- BulkImportPanel: the same logic inside `Sheet title="Import categories" detents={["large"]}` with Cancel / Import.

- [ ] Failing tests: with fake timers advanced 30 s, the dialog is still open and neither callback has been called. "Not now" → `onSkip`. The source has no `setTimeout|setInterval`.
- [ ] `npm test`. Expected FAIL.
- [ ] Implement. Append `ProfileSetup.tsx` and `BulkImportPanel.tsx` to `MIGRATED`.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller check (375 / 1280 / 1440): `/login` › Forgot password (no login). Builder › Import. A fresh test member gets the photo sheet, which stays until "Not now".
- [ ] Commit: `git add client/src/components/ProfileSetup.tsx client/src/pages/HomePage.tsx client/src/pages/LoginPage.tsx client/src/pages/SignupPage.tsx client/src/pages/ballot-builder/BulkImportPanel.tsx client/src/ui/__tests__ && git commit -m "Move photo setup, password reset, verify email and import into sheets"`

### Task 9: Landing, Log in, Create account, Reset password, Confirmed email

**Files:** Modify `client/src/pages/{LandingPage,LoginPage,SignupPage,ResetPassword,ComfirmedEmailPage}.tsx`, `client/src/components/FallingProfileBallPhysics.tsx`, `client/src/ui/__tests__/tokensOnly.test.ts`. Test `client/src/ui/__tests__/auth.test.tsx`.

**Interfaces — Consumes:** `OscarLogo`, `Button`, `Screen` (standalone, no shell), `Avatar`, `Sheet`, `loginErrorText`/`signupErrorText` (unchanged), `fetchAvailableMemberNames`, `fetchMemberNameStatus` (Task 20B; absent until then). **Produces (screen rules; mock `screens-all.html` part 1):**
- **Landing:**
  - Falling circle-head member avatars (existing physics) fill the screen. The wordmark `OscarLogo size="medium" as="h1"` sits in the upper third.
  - Tagline: "Be there or be square." in **plain Century Gothic** (`text-title-3`, no cursive).
  - Bottom third, above `pb-safe`: full-width `lg` links "Create account" (variant `pebble`, strawberry) and "Log in" (secondary).
  - Desktop: the logo and buttons sit in a centered 420 px column over the physics canvas, and the canvas fills the viewport.
  - No glass.
  - Physics: sized from `visualViewport` / `100dvh`. Reduced motion renders the faces settled.
- **Log in:**
  - OscarLogo `small` header and the large title "Log in".
  - Labelled fields (`htmlFor`): Email (`autoComplete="email"`, `inputMode="email"`) and Password (`current-password`). Fields are 52 px, `bg-surface-2 rounded-control text-body`.
  - "Forgot password?" is plain. The primary "Log in" shows "Logging in…" while busy. Errors appear inline with `role="alert"`.
  - Footer: "Not getting emails? Ask Rickey or Kadin to reset your account."
  - Desktop: a centered 420 px card column.
- **Create account:**
  - **Name chips first**: the 14 names as chips (Avatar 32 initials + name). When Task 20B's `fetchMemberNameStatus` exists, taken names render `struck` and disabled with `aria-disabled` and the label "{name}, taken". Until then, only available names show.
  - Then the email and password fields (`new-password`) and the primary "Create account".
  - Loading, empty and error states for the name list.
- **Reset password / Confirmed email:** the same header, with sentence-case copy.

- [ ] Failing tests (mock supabase and AuthContext):
  - Log in: Email `autocomplete` is `email`, Password is `current-password`, and a button is named "Log in".
  - Landing: link "Create account" has no descendant button; link "Log in" exists; there is no `font-windsong`/`cursive` in the source.
  - Signup: name chips render before the email field (DOM order); clicking a chip marks it `aria-pressed="true"`.
- [ ] `npm test`. Expected FAIL.
- [ ] Implement. Append the files to `MIGRATED`.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller check (no login; 375 / 1280 / 1440): `/`, `/login`, `/signup`, `/login/reset`. The logo is prominent and the avatars fall. The keyboard path works (Tab to the fields, Enter submits). Password autofill prompts. A wrong password shows the inline error.
- [ ] Commit: `git add client/src/pages/LandingPage.tsx client/src/pages/LoginPage.tsx client/src/pages/SignupPage.tsx client/src/pages/ResetPassword.tsx client/src/pages/ComfirmedEmailPage.tsx client/src/components/FallingProfileBallPhysics.tsx client/src/ui/__tests__ && git commit -m "Redesign landing and auth screens on the brand theme"`

### Task 10: Ballots tab

**Files:** Modify `client/src/pages/BallotsPage.tsx`, `client/src/components/BallotCard.tsx`, `client/src/ui/__tests__/tokensOnly.test.ts`. Create `client/src/ui/logic/ballotsView.ts`, `client/src/ui/useRefetchOnFocus.ts`. Delete `client/src/components/StatusBadge.tsx` if unused. Test `client/src/ui/__tests__/ballotsView.test.ts`.

**Interfaces — Consumes:** `ballotCardStatus`, `BallotSummary`, `closesInLabel`, `urgency`, `opensAtLabel`, `fetchBallotSummaries`, `STATUS_PEBBLE`, `SegmentedControl`, `ColorBlock`, `Card`, `Chip`, states. **Produces:**
```ts
export type BallotFilter = "all" | "open" | "voted" | "closed"
export function filterBallots(list: BallotSummary[], f: BallotFilter, now: Date): BallotSummary[]   // open = card status open|upcoming; voted; closed
export function ballotSubtitle(b: BallotSummary, now: Date): string    // "7 of 30 voted · Closes in 3 days"; upcoming opensAtLabel; closed "Voting closed"; singular "category"
export function emptyFilterText(f: BallotFilter): string
export function useRefetchOnFocus(fn: () => void): void                // visibilitychange + focus, throttled 30 s
```
Screen: `Screen title="Ballots"` + SegmentedControl All / Open / Voted / Closed + a list of `BallotCard`s. Each card is a whole-card link `ColorBlock` in its status pebble (closed → neutral `Card`) with the name in `title-3`, the subtitle, a status Chip with an icon and word, and a chevron. When all of its categories are voted and the ballot is open, a secondary link "Submit ballot" → `/app/ballots/:id/submit` (route added in Task 15; until then the link is hidden behind `SUBMIT_ENABLED` in `ui/copy.ts`, set true by Task 15). Grid: 1 column on phone, 2 at ≥ 1024. Skeleton, ErrorState, EmptyState per filter.
- [ ] Failing tests:
```ts
const now = new Date("2026-11-27T12:00:00Z")
expect(filterBallots([open, voted, closed, upcoming], "open", now).map(b => b.id)).toEqual(["open","upcoming"])
expect(ballotSubtitle({ ...open, category_count: 1, my_vote_count: 0 }, now)).toContain("0 of 1 voted")
expect(emptyFilterText("closed")).toBe("No closed ballots yet.")
expect(read("src/components/BallotCard.tsx")).not.toMatch(/categorie\(s\)|uppercase|toUpperCase/)
```
- [ ] `npm test`. Expected FAIL.
- [ ] Implement. Append the files to `MIGRATED`.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller check (375 / 1280 / 1440): each filter, an empty filter, the error (offline) with Retry, and keyboard arrows on the segmented control.
- [ ] Commit: `git add client/src/pages/BallotsPage.tsx client/src/components/BallotCard.tsx client/src/components/StatusBadge.tsx client/src/ui && git commit -m "Redesign Ballots with status color blocks and filters"`

### Task 11: Home dashboard logic (widget registry, prefs, .ics, attention)

**Files:** Create `client/src/ui/logic/{homeWidgets,homePrefs,ics,attention}.ts`. Test `client/src/ui/__tests__/{homeWidgets,homePrefs,ics,attention}.test.ts`. (Pure; no UI.)

**Interfaces — Consumes:** `ReleaseCheck` (`lib/release.ts`), `Ballot`, `Season`. **Produces:**
```ts
// homeWidgets.ts
export type WidgetId = "ceremony" | "countdown" | "pending" | "progress" | "leaderboardPeek" | "latestWinners" | "notVoted" | "attention" | "quickActions"
export type WidgetDef = { id: WidgetId; title: string; adminOnly: boolean; requiresRelease: boolean; defaultMember: boolean; defaultCommittee: boolean; span: 1 | 2 }
export const WIDGETS: readonly WidgetDef[]   // in this default order:
//  ceremony    "Oscar night"          member  defaultM ✓ defaultC ✓
//  countdown   "Countdown"            member  ✓ / ✗ (committee sees the date in ceremony)
//  pending     "Your ballots"         member  ✓ / ✓
//  progress    "Your progress"        member  ✓ / ✓
//  latestWinners "Latest winners"     member  ✓ / ✓   (before release: lemon envelope teaser)
//  leaderboardPeek "Leaderboard"      member  requiresRelease ✓ / ✓
//  notVoted    "Who hasn't voted"     adminOnly ✓
//  attention   "Needs your attention" adminOnly ✓
//  quickActions "Quick actions"       adminOnly ✓
export type HomeCtx = { isCommittee: boolean; released: boolean }
export function resolveWidgets(prefs: HomePrefs | null, ctx: HomeCtx): WidgetDef[]   // order from prefs (or default), drop hidden, drop adminOnly unless committee, drop requiresRelease unless released
// homePrefs.ts
export type HomePrefs = { version: 1; order: WidgetId[]; hidden: WidgetId[] }
export const homePrefsKey = (userId: string) => `jsc.home.v1.${userId}`
export function defaultPrefs(isCommittee: boolean): HomePrefs
export function normalizePrefs(raw: unknown, isCommittee: boolean): HomePrefs   // invalid → default; unknown ids dropped; missing ids appended (hidden if not default)
export function loadHomePrefs(storage: Pick<Storage,"getItem"> | null, userId: string, isCommittee: boolean): HomePrefs   // try/catch
export function saveHomePrefs(storage: Pick<Storage,"setItem"> | null, userId: string, prefs: HomePrefs): void           // try/catch, never throws
export function moveWidget(p: HomePrefs, id: WidgetId, dir: -1 | 1): HomePrefs   // no-op at the ends
export function toggleWidget(p: HomePrefs, id: WidgetId, on: boolean): HomePrefs
// FUTURE (not in this plan): persist prefs in profiles.home_prefs jsonb; loadHomePrefs stays the local fallback.
// ics.ts
export function buildIcs(e: { uid: string; title: string; start: Date; durationMinutes: number; location?: string | null; description?: string; now: Date }): string   // RFC 5545, CRLF, UTC "YYYYMMDDTHHMMSSZ", escapes , ; \ and newlines
export function icsFileName(title: string): string   // "jsc-oscars-2026.ics" style slug
// attention.ts
export type AttentionItem = { id: "close" | "ties" | "release" | "ready"; label: string; to: string; tone: "warn" | "success" }
export function attentionItems(i: { ballots: Ballot[]; checks: ReleaseCheck[] | null; released: boolean; now: Date }): AttentionItem[]
// close: open ballots with closes_at <= now → "2 ballots ended but are still open" → /app/profile/ballots
// ties: checks.winners not ok → its label + " · Go to tally" → /app/profile/ballots
// release: not released and some check fails (other than above) → failing label → /app/profile/release
// ready: not released and all checks ok → "Ready to open the envelope" (success) → /app/profile/release ; released → []
```
- [ ] Failing tests:
```ts
expect(resolveWidgets(null, { isCommittee: false, released: false }).map(w => w.id)).toEqual(["ceremony","countdown","pending","progress","latestWinners"])   // 5
expect(resolveWidgets(null, { isCommittee: false, released: true })).toHaveLength(6)
expect(resolveWidgets(null, { isCommittee: true, released: false }).map(w => w.id)).toEqual(["ceremony","pending","progress","latestWinners","notVoted","attention","quickActions"])   // 7
expect(resolveWidgets({ version: 1, order: ["notVoted","ceremony"], hidden: [] }, { isCommittee: false, released: false }).map(w => w.id)).not.toContain("notVoted")
expect(normalizePrefs("garbage", false)).toEqual(defaultPrefs(false))
expect(normalizePrefs({ version: 1, order: ["bogus","pending"], hidden: [] }, false).order[0]).toBe("pending")
expect(normalizePrefs({ version: 1, order: ["pending"], hidden: [] }, false).order).toHaveLength(WIDGETS.length)
const p = defaultPrefs(false); expect(moveWidget(p, "countdown", -1).order.slice(0,2)).toEqual(["countdown","ceremony"]); expect(moveWidget(p, "ceremony", -1)).toEqual(p)
expect(toggleWidget(p, "countdown", false).hidden).toContain("countdown")
expect(loadHomePrefs({ getItem: () => { throw new Error() } }, "u", false)).toEqual(defaultPrefs(false))
const ics = buildIcs({ uid: "s1@jsc-oscars", title: "JSC Oscars", start: new Date("2026-12-04T21:00:00Z"), durationMinutes: 180, location: "Kadin's, 12 Main St; Apt 2", now: new Date("2026-11-21T00:00:00Z") })
expect(ics).toContain("BEGIN:VCALENDAR\r\n"); expect(ics).toContain("DTSTART:20261204T210000Z"); expect(ics).toContain("DTEND:20261205T000000Z"); expect(ics).toContain("LOCATION:Kadin's\\, 12 Main St\\; Apt 2"); expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true)
expect(attentionItems({ ballots: [openEnded], checks: [ok("ballots_closed"), ok("no_round_open"), bad("winners","27 of 30 categories have a winner")], released: false, now }).map(a => a.id)).toEqual(["close","ties"])
expect(attentionItems({ ballots: [], checks: allOk, released: false, now })).toEqual([{ id: "ready", label: "Ready to open the envelope", to: "/app/profile/release", tone: "success" }])
expect(attentionItems({ ballots: [], checks: allOk, released: true, now })).toEqual([])
```
- [ ] `npm test`. Expected FAIL: modules not found.
- [ ] Implement.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Commit: `git add client/src/ui/logic client/src/ui/__tests__ && git commit -m "Add home widget registry, prefs, calendar file and attention helpers"`

### Task 12: Home dashboard UI and Customize Home — STOP POINT 2

**Files:** Modify `client/src/pages/HomePage.tsx`, `client/src/components/PendingBallots.tsx` (→ the `pending` widget body), `client/src/ui/__tests__/tokensOnly.test.ts`. Create `client/src/pages/home/{widgets,CustomizeHomeSheet,useHomeData}.tsx`. Test `client/src/ui/__tests__/home.test.tsx`.

**Interfaces — Consumes:** Task 11 helpers. Data, all existing and unchanged: `fetchCurrentSeason` (`ceremony_at`, `location`, `results_released_at`), `fetchBallotSummaries`, `pendingBallots`, `votedCount`, `fetchAllVotes` + `fetchMembers` + `completionByMember` (committee only), `fetchReleaseStatus` + `releaseChecks` (committee only), `fetchSeasonResults` + `buildResultCards` + `leaderboard` + `nomineeStats` (only after release), `fetchMemberAvatars`. Plus `Screen brandHeader`, `ColorBlock`, `Countdown`, `AvatarStack`, `Podium`, `Sheet`, `Switch`, `useToast`. **Produces:**
- `useHomeData()`: one shared loader (season and summaries first; committee and release fetches only when needed). Each widget gets `{ status: "loading" | "ready" | "error"; data; retry }`.
- Widgets (each in its own `ColorBlock`/`Card` with its own skeleton and error):
  - **ceremony**: grape block with "Oscar night", the date + time, the location, and a secondary "Add to calendar" button that downloads `buildIcs(...)` as a Blob with `icsFileName` (`a[download]`; revoke the URL after 1 s).
  - **countdown**: `Countdown` on a neutral `Card`.
  - **pending**: one lime block per pending ballot with a progress bar, "7 of 30 voted", a warn chip when urgent, and "Continue voting" (plus "Submit ballot" once all are voted, behind `SUBMIT_ENABLED`).
  - **progress**: "You've voted in 2 of 3 ballots" with a cream bar.
  - **latestWinners**: before release, the lemon envelope teaser "The envelope opens on Oscar night"; after release, the last 3 `ResultCard` winners with avatars → Results.
  - **leaderboardPeek** (after release): top 3 `Podium variant="card"` → Results › Leaderboard.
  - **notVoted** (committee): for the most recent open main ballot, AvatarStack + list of names with "12 of 30" → ballot admin.
  - **attention** (committee): `attentionItems` rows.
  - **quickActions** (committee): buttons New ballot, Manage ballots, Members, The envelope.
- Layout: `Screen title="Home" brandHeader` with the trailing "Customize" button (icon `SlidersHorizontal`, `aria-label="Customize Home"`). Phone: one column. ≥ 1024: 2-column grid. ≥ 1400: 3 columns; `span: 2` widgets span 2.
- The photo card stays ("Add your photo…" → `ProfileSetup`, which no longer auto-opens).
- **CustomizeHomeSheet**: `Sheet title="Customize Home" detents={["large"]}`. It lists widgets the user may see (committee ones carry a neutral Chip "Committee"). Each row has a `Switch`, plus "Move up" / "Move down" icon buttons (`aria-label="Move Countdown up"`) and drag via motion `Reorder` on phone and desktop. "Reset to default". Changes save immediately (`saveHomePrefs`) and show the Toast "Home updated".
- [ ] Failing tests (jsdom; mock api modules):
```ts
it("member sees 5 default widgets and no committee widgets", …)   // headings Oscar night, Countdown, Your ballots, Your progress, Latest winners; no "Who hasn't voted"
it("committee sees 7 and the attention list", …)
it("customize: hiding Countdown removes it and persists", …)      // open sheet, toggle switch "Countdown" off, close → heading gone; memStorage has key jsc.home.v1.<uid>
it("Move up reorders", …)
it("no results fetch for members before release", …)               // fetchSeasonResults not called when results_released_at null
it("Add to calendar creates an .ics download", …)                  // URL.createObjectURL called with a Blob of type text/calendar
```
- [ ] `npm test`. Expected FAIL.
- [ ] Implement. Append the files to `MIGRATED`.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller check, then **STOP POINT 2** (375 / 1280 / 1440), as `test.micah` and `test.rickey`. Screenshots of:
  - Landing, Log in, Create account;
  - Home (member and committee; skeleton, then content; one widget forced to error by going offline);
  - the Customize Home sheet;
  - the `.ics` opening in Calendar;
  - Ballots (filters);
  - **the old Vote page inside the new shell**;
  - the photo sheet and a ConfirmSheet.
  The user approves before Task 13.
- [ ] Commit: `git add client/src/pages/HomePage.tsx client/src/pages/home client/src/components/PendingBallots.tsx client/src/ui/__tests__ && git commit -m "Turn Home into a customizable widget dashboard"`

### Task 13: Results, Leaderboard segment and the envelope reveal

**Files:** Modify `client/src/pages/ResultsPage.tsx`, `client/src/App.tsx` (`stats` → `<Navigate to="/app/results?view=leaderboard" replace/>`), `client/src/ui/__tests__/tokensOnly.test.ts`. Create `client/src/pages/results/{WinnersView,LeaderboardView,YouCard}.tsx` (moved from `StatsPage.tsx`, same data calls), `client/src/ui/RevealCard.tsx`, `client/src/ui/logic/{reveal,resultsTab}.ts`, `client/src/dev/sections/Reveal.tsx`. Delete `client/src/pages/StatsPage.tsx`. Test `client/src/ui/__tests__/{reveal,resultsTab}.test.ts`.

**Interfaces — Consumes:** `buildResultCards`, `ResultCard`, `ordinal`, `leaderboard`, `myCategories`, `nomineeStats`, `fetchCurrentSeason`, `fetchSeasonResults`, `fetchMemberAvatars`, `fetchMembers`, `Podium`, `pebbleAt(i, { exclude: RESULTS_EXCLUDE })`, `SegmentedControl`, `Countdown`, `vibrate("reveal")`, `spring.podium`. **Produces:**
```ts
export type ResultsTab = "winners" | "leaderboard"; export function parseResultsTab(search: string): ResultsTab
export const revealKey = (seasonId: string) => `jsc.reveal.${seasonId}`
export function loadOpened(storage: Pick<Storage,"getItem"> | null, seasonId: string): Set<string>
export function saveOpened(storage: Pick<Storage,"setItem"> | null, seasonId: string, ids: Set<string>): void
export const REVEAL_ORDER: (1 | 2 | 3)[] = [3, 2, 1]
export function RevealCard(p: { card: ResultCard; index: number; avatars: Record<string, string | null>; opened: boolean; onOpen(): void })
// sealed: full-bleed LEMON envelope face (bg-pebble-lemon text-on-pebble-lemon): eyebrow number, category name text-title-1 font-display, "Tap to open"; whole card <button aria-expanded="false">
// opening: bronze → silver → gold rise (spring.podium), avatars drop, one gold sweep; tap skips to end; vibrate("reveal") once; reduced motion: 200 ms cross-fade
// opened: bg-surface Card, header strip in pebbleAt(index, RESULTS_EXCLUDE) with `${number} · ${name}` (category name font-display title-2), Podium card, "Also placed" rows, note
```
Screen rules:
- `Screen title="Results"`. Segmented "Winners | Leaderboard" bound to `?view=`. The trailing "Open all" while any sealed card remains.
- **Release gate unchanged:** members before release get the lemon sealed state "Results open on Oscar night" + `Countdown`, with no results fetch. The committee sees the warn chip "Preview · only the committee sees this" and opened cards.
- After release: OscarLogo `xsmall`, then the ceremonial heading "And the winners are…" (`font-display text-large-title`), then the RevealCards. Grid: 1 column on phone, 2 at ≥ 1024, 3 at ≥ 1400.
- **Leaderboard:** `Podium variant="hero"`, then `YouCard` (stat blocks in `pebbleAt(0..2, RESULTS_EXCLUDE)`, a gold "Winner" chip on won categories, a "Nominated" disclosure), then the GroupedSection list (rank, Avatar 32, name, "5 wins · 9 noms · 56%"). Keep the `ol` + sr text semantics. Empty: "Stats appear after the envelope opens."
- No vote counts.
- [ ] Failing tests:
```ts
expect(parseResultsTab("?view=leaderboard")).toBe("leaderboard"); expect(parseResultsTab("")).toBe("winners")
saveOpened(st, "S", new Set(["c1","c2"])); expect([...loadOpened(st, "S")].sort()).toEqual(["c1","c2"])
expect(loadOpened({ getItem: () => "{bad" }, "S").size).toBe(0); expect(loadOpened(null, "S").size).toBe(0)
expect(() => saveOpened({ setItem: () => { throw new Error("quota") } }, "S", new Set(["c1"]))).not.toThrow()
expect(read("src/pages/ResultsPage.tsx")).toMatch(/results_released_at/)
```
- [ ] `npm test`. Expected FAIL.
- [ ] Implement, and add the `Reveal` gallery section (sealed, frozen mid-animation via a `progress` prop, opened, reduced motion).
- [ ] `npm test && npm run build`. Expected PASS (`resultsView`, `leaderboard` green).
- [ ] Controller check (375 / 1280 / 1440): the gallery reveal plays, can be skipped and handles reduced motion. A practice release on the seed (per TESTING.md; un-release after): `test.micah` sees sealed lemon cards, "Open all" works, opened cards persist on reload, podium colors are exact (`getComputedStyle`), no lemon or tangerine appears on opened cards, and `/app/stats` redirects. Before release, no `results` request for a member.
- [ ] Commit: `git add client/src/pages/ResultsPage.tsx client/src/pages/results client/src/pages/StatsPage.tsx client/src/App.tsx client/src/ui client/src/dev && git commit -m "Redesign Results with lemon envelope reveal and Leaderboard segment"`

### Task 14: Release page (full-bleed lemon)

**Files:** Modify `client/src/pages/committee/ReleasePage.tsx`, `client/src/ui/__tests__/tokensOnly.test.ts`. Test `client/src/ui/__tests__/releasePage.test.tsx`.

**Interfaces — Consumes:** `releaseChecks`, `releaseSeasonResults`, `fetchReleaseStatus`, the hold reducer (unchanged), `HoldButton tone="release"`, `Screen ceremony="lemon"`, `OscarLogo tone="onLemon"`, `vibrate("release")`. **Produces (UI only; mock: screens-all "reveal"):**
- A full-bleed lemon page with dark text and the back link "‹ You". OscarLogo `small` (dark) on top, then the heading "Reveal the winners?" (`font-display text-display` on phone, `large-title` at narrow widths if it wraps over 2 lines), then "Every member will see every winner. This can't be undone."
- Checklist rows on a translucent dark inset (`bg-on-pebble-lemon/10`, rounded-card): check or warn icon + label in dark; a failing row carries its fix as the subtitle with a "Go to tally" link. Plus the static row "Members never see vote counts".
- `HoldButton tone="release" label="Hold to open the envelope" hint="Press and hold for 3 seconds"` (lime track, dark edge, `lime-deep` fill, dark label), then the plain "Not yet" → `/app/profile`.
- All existing behavior is kept exactly: 30 s recheck, cancel when checks turn red, ref-guarded single release, blur and visibility cancel, `aria-live`.
- Errors map to "Couldn't open the envelope. Check your connection and hold again."
- Success: "The envelope is open" with the gold podium tease and `lg` "See results". `vibrate("release")`.
- Desktop: a centered 560 px column on the full-bleed lemon.
- [ ] Failing test: not ready → the HoldButton has `aria-disabled="true"` and the failing labels are listed; a release error → the mapped alert text, not the raw message; a released season → "The envelope is open".
- [ ] `npm test`. Expected FAIL.
- [ ] Implement. Append to `MIGRATED`.
- [ ] `npm test && npm run build`. Expected PASS (`release.test.ts`, `hold.test.ts` green).
- [ ] Controller check (`test.rickey`; 375 / 1280 / 1440): blocked reasons show; a short press and a scroll do nothing; the keyboard hold (Space) works; practice release then un-release. Focus ring visible on lemon.
- [ ] Commit: `git add client/src/pages/committee/ReleasePage.tsx client/src/ui/__tests__ && git commit -m "Make the envelope release page full-bleed lemon"`

### Task 15: Submit ballot screen (full-bleed lime; local state)

**Files:** Create `client/src/pages/SubmitBallotPage.tsx`, `client/src/api/submissions.ts`, `client/src/ui/logic/submit.ts`. Modify `client/src/App.tsx` (route `ballots/:ballotId/submit` inside `/app`), `client/src/ui/copy.ts` (`SUBMIT_ENABLED = true`), `client/src/ui/__tests__/tokensOnly.test.ts`. Test `client/src/ui/__tests__/{submit.test.ts,submitPage.test.tsx}`.

**Open question (default adopted until the user answers):** submitting is a confirmation. Votes stay editable until the ballot closes. The committee sees who submitted, but only after Task 20; until then the state is per device.

**Interfaces — Consumes:** `fetchBallotDetail`, `fetchMyVotes`, `votedCount`, `closesInLabel`, the hold reducer, `HoldButton tone="submit"`, `Screen ceremony="lime"`, `vibrate("submit")`. **Produces:**
```ts
// logic/submit.ts
export type SubmitCheck = { id: "all_voted" | "open" | "editable"; label: string; ok: boolean; fixTo?: string }
export function submitChecks(i: { categoryIds: string[]; myVotes: Record<string, string>; ballot: Ballot; now: Date }): { checks: SubmitCheck[]; ready: boolean }
// all_voted: ok "All 30 categories voted" / "3 categories still need a vote" (fixTo /app/ballots/:id); open: ok `Voting ${closesInLabel}` / "Voting is closed" (not ok); editable: always ok "You can change votes until voting closes"; ready = all ok
// api/submissions.ts
export type SubmissionIO = { get(ballotId: string): Promise<string | null>; submit(ballotId: string): Promise<string> }   // returns ISO submitted_at
export const submissionKey = (ballotId: string, userId: string) => `jsc.submitted.${ballotId}.${userId}`
export function localSubmissionIO(storage: Storage | null, userId: string, now: () => Date): SubmissionIO
export let submissionIO: (userId: string) => SubmissionIO   // = localSubmissionIO(localStorage…) now; Task 20 swaps to the DB IO
```
Screen:
- A full-bleed lime page with dark text, "‹ Back to voting", OscarLogo `small` (dark), then the heading "Submit your ballot?" and "{ballot name} · {n} categories".
- Checklist rows (same style as Release).
- `HoldButton tone="submit" label="Hold to submit" hint="Press and hold for 3 seconds"` (dark track, grape fill, cream label `title-3`), disabled with reasons until `ready`, then the plain "Not yet, back to voting".
- Success: "Ballot submitted", "You can still change votes until {closes}.", "Back to ballots".
- An already-submitted ballot shows the success state with the time.
- It never calls `castVote`/`clearVote`.
- [ ] Failing tests:
```ts
expect(submitChecks({ categoryIds: ["c1","c2"], myVotes: { c1: "a" }, ballot: openB, now }).checks.find(c => c.id === "all_voted")).toMatchObject({ ok: false, label: "1 category still needs a vote" })
expect(submitChecks({ categoryIds: ["c1"], myVotes: { c1: "a" }, ballot: openB, now }).ready).toBe(true)
expect(submitChecks({ categoryIds: ["c1"], myVotes: { c1: "a" }, ballot: closedB, now }).ready).toBe(false)
const io = localSubmissionIO(memStorage(), "u1", () => new Date("2026-11-27T12:00:00Z")); expect(await io.get("B1")).toBeNull(); expect(await io.submit("B1")).toBe("2026-11-27T12:00:00.000Z"); expect(await io.get("B1")).toBe("2026-11-27T12:00:00.000Z")
// page: not ready → hold aria-disabled + "1 category still needs a vote"; submitted → "Ballot submitted"; castVote/clearVote never called
```
- [ ] `npm test`. Expected FAIL.
- [ ] Implement. Append to `MIGRATED`.
- [ ] `npm test && npm run build`. Expected PASS (Vote tests green).
- [ ] Controller check (375 / 1280 / 1440): from Ballots and the Home pending widget, a ballot with all categories voted → Submit → hold 3 s → success. A partially voted ballot shows the reason and link. Focus ring on lime.
- [ ] Commit: `git add client/src/pages/SubmitBallotPage.tsx client/src/api/submissions.ts client/src/ui client/src/App.tsx && git commit -m "Add the lime Submit ballot screen with hold to submit"`

### Task 16: Committee pages (ballot control, tally, completion, member names, manage ballots)

**Files:** Modify `client/src/pages/committee/{ManageBallotsPage,BallotAdminPage,MemberNamesPage}.tsx`, `client/src/components/committee/{TallyPanel,CompletionPanel,StatusChip,ExportCsvButton}.tsx`, `client/src/ui/__tests__/tokensOnly.test.ts`.

**Interfaces — Consumes:** all existing lib/api calls unchanged, `useConfirm`, `Screen width="wide"`, `GroupedSection`, `ListRow`, `Chip`, `Avatar`, `AvatarStack`, `Podium variant="card"`, `BottomAccessory`, states. **Produces (UI only; mock: screens-2-tabs-committee):**
- Back = You (or Manage ballots).
- `StatusChip` → `Chip` per `STATUS_PEBBLE`, with an icon and a word.
- **Ballot control:** a status header `ColorBlock` in the status pebble with name, dates and chip; "Close now" through `useConfirm` via the accessory primary.
  - CompletionPanel: AvatarStack summary, rows with Avatar 32, name and "12 of 30" (unclaimed in `label-2`).
  - Export CSV as a secondary button in the results card header.
- **Tally:** per-category cards with rank (tabular), name and votes; the badge as a Chip; `Podium variant="card"` for recorded winners; buttons as `Button`s. On desktop the ranked rows render as a table with column headers (`<table>` with `th scope="col"`) in a 1040 px column. No `text-[10px]`.
- **Member names:** GroupedSection rows; the reset confirm as an inline `Card` with a destructive Button (existing logic).
- Raw `e.message` → `COPY` text (+ `console.error`).
- [ ] Failing check: append the files to `MIGRATED` → `tokensOnly` FAILS. `grepSrc(/text-\[1[01]px\]/)` → FAILS.
- [ ] Implement (styling and copy only).
- [ ] `npm test && npm run build`. Expected PASS (`tallyView`, `tally`, `rounds`, `places`, `exportCsv`, `memberNames` green).
- [ ] Controller check (`test.rickey`; 375 / 1280 / 1440): Manage ballots, the `[TEST] Tie Practice` control page and tally (table on desktop, cards on phone), Record results still works (places unchanged in Table Editor), Export CSV downloads, Member names reset sheet (cancel).
- [ ] Commit: `git add client/src/pages/committee client/src/components/committee client/src/ui/__tests__ && git commit -m "Re-skin committee pages onto the design system"`

### Task 17: Ballot builder in 3 steps

**Files:** Modify `client/src/pages/ballot-builder/{BallotBuilderPage,BallotBasicInfo,CategoryList,CategoryModal,NomineeModePicker,BulkImportPanel}.tsx`, `client/src/ui/__tests__/tokensOnly.test.ts`. Create `client/src/ui/logic/builder.ts`. Test `client/src/ui/__tests__/builder.test.ts`.

**Interfaces — Consumes:** `validateBallotForPublish`, `buildNomineeRows`, `csv`, `categoryImport`, `saveBallotDraft` (all unchanged), `Sheet`, `SegmentedControl`, `useConfirm`, motion `Reorder`. **Produces:**
```ts
export type BuilderStep = "details" | "categories" | "review"
export const BUILDER_STEPS: { id: BuilderStep; label: string }[]   // Details, Categories, Review
export function stepIssues(step: BuilderStep, form: BallotFormData): string[]   // details: "Add a ballot name" if blank, "Closing time must be after opening time" if closes_at <= opens_at; categories: "Add at least one category" if none; review: validateBallotForPublish(form)
export function moveCategory(cats: Category[], from: number, to: number): Category[]   // returns new array with `order` renumbered 0..n-1
```
Screen:
- `Screen title="New ballot"` (or "Edit ballot"). A step indicator: 3 segments with labels and `aria-current="step"`. The accessory has "Back" / "Next" (Next disabled with the issues listed above it) and, on Review, "Save draft" / "Publish" (existing handlers).
- **Categories:** a list with drag reorder (`Reorder.Group` on phone and desktop, a grab handle with `aria-label`) plus "Move up/down" buttons for keyboard. Category names use `font-display text-title-3` only at ≥ 1024 (else `headline` sans). "Import" opens the BulkImport sheet; "Add category" opens the editor.
- **Category editor:** `Sheet` (bottom on phone, centered on desktop) with name and description fields, a nominee-mode `SegmentedControl` (Everyone / Subset / Preset / Group; confirm when switching clears nominees), the nominee editor and Cancel / Save, with `dirty` set.
- **Review:** a summary GroupedSection plus the blockers list.
- [ ] Failing tests:
```ts
expect(stepIssues("details", { ...form, name: " " })).toContain("Add a ballot name")
expect(stepIssues("details", { ...form, opens_at: "2026-11-26T12:00", closes_at: "2026-11-26T11:00" })).toContain("Closing time must be after opening time")
expect(stepIssues("categories", { ...form, categories: [] })).toEqual(["Add at least one category"])
expect(stepIssues("review", form)).toEqual(validateBallotForPublish(form))
expect(moveCategory([c("a",0), c("b",1), c("c",2)], 2, 0).map(x => [x.id, x.order])).toEqual([["c",0],["a",1],["b",2]])
```
- [ ] `npm test`. Expected FAIL.
- [ ] Implement. Append the files to `MIGRATED`. Delete `focus:outline-none` from builder inputs.
- [ ] `npm test && npm run build`. Expected PASS (`ballotForm`, `csv`, `categoryImport`, `api/ballots.test.ts` green).
- [ ] Controller check (375 / 1280 / 1440): create `[TEST] Builder check` with a preset and a group category, drag-reorder (touch and mouse), reorder by keyboard, dirty-close the editor (discard confirm), save the draft, then delete it in Manage ballots.
- [ ] Commit: `git add client/src/pages/ballot-builder client/src/ui && git commit -m "Rebuild the ballot builder as three steps with a category sheet"`

### Task 18: You tab and Settings — STOP POINT 3

**Files:** Modify `client/src/pages/ProfilePage.tsx` (the You screen), `client/src/components/{EditProfileModal,ManageOscarsModal,CreateOscarsEvent,EditOscarEvent,JokeGeneratorModal}.tsx`, `client/src/App.tsx` (route `profile/settings`), `client/src/ui/__tests__/tokensOnly.test.ts`. Create `client/src/pages/SettingsPage.tsx`, `client/src/ui/logic/youStats.ts`. Delete `client/src/components/{ProfilePageButton,FullScreenLoader}.tsx` and `Modal.tsx`/`DeleteConfirmationModal.tsx` once unused. Test `client/src/ui/__tests__/youStats.test.ts`.

**Interfaces — Consumes:** `useUserData`, `fetchBallotSummaries`, `fetchCurrentSeason`, `countdownParts`; after release only `fetchSeasonResults` + `nomineeStats`. Existing supabase calls for profile edits and sign-out are unchanged, as is `supabase.auth.resetPasswordForEmail` + `authRedirectUrl` (exactly as LoginPage). Plus `Avatar ring="lemon"`, `ColorBlock`, `GroupedSection`, `ListRow`, `Sheet`, `useToast`. **Produces:**
```ts
export type YouStat = { label: string; value: string; pebble: PebbleName }
export function youStats(i: { released: boolean; summaries: BallotSummary[]; tally: { wins: number; noms: number } | null; ceremonyAt: Date | null; now: Date }): YouStat[]
// before release: "Ballots voted" "2 of 3", "Categories voted" "41", "Days to Oscars" "13" (or "—" → omit tile when no date)  pebbles pebbleAt(0..2, { exclude: HERO_EXCLUDE })
// after release: "Wins" "3", "Nominations" "7", "Win rate" "43%" (pebbleAt(…, RESULTS_EXCLUDE))
```
- **You** (`Screen title="You"`): Avatar 96 with the **lemon ring**, name (`title-1`), email (`subhead label-2`), "Edit". Then 3 stat `ColorBlock`s (phone: 3 across with wrapping; desktop: a row). Then rows:
  - **Account**: Edit profile, Change photo.
  - **Committee** (if committee): New ballot, Manage ballots, Members, The envelope, Event dates (ManageOscarsModal sheet).
  - **Labs**: Joke generator.
  - Settings ›.
  - A separate group with "Log out" (destructive row, no confirm).
- Remove "Settings" placeholder, the fake data and the duplicate "View Results".
- **Settings** (`/app/profile/settings`, back You), only rows that exist:
  - **Account**: Edit profile, Change photo, "Send password reset email" (Toast "Check your email").
  - **App**: Customize Home (opens CustomizeHomeSheet), "Install on your phone" (info row with Add to Home Screen steps, no action).
  - **Help**: "Not getting emails? Ask Rickey or Kadin" (text only). No version row: it would need a build-config change this task does not own.
- Profile modals render `Sheet` directly. Toast "Profile updated".
- [ ] Failing tests: `youStats` before release returns the labels `["Ballots voted","Categories voted","Days to Oscars"]` with values from the fixtures; after release `["Wins","Nominations","Win rate"]` and rate "43%" for 3/7; no date → 2 tiles. `ProfilePage.tsx` contains no `username@example.com`, `"--"` or the old "Settings" placeholder row. "Log out" exists.
- [ ] `npm test`. Expected FAIL.
- [ ] Implement. Append the files to `MIGRATED`.
- [ ] `npm test && npm run build`. Expected PASS.
- [ ] Controller check, then **STOP POINT 3** (375 / 1280 / 1440). Screenshots of:
  - Results before release (member + committee preview);
  - the reveal (sealed, mid, opened; a short recording if possible);
  - Leaderboard + You card;
  - Release (blocked, ready, success);
  - Submit (not ready, ready, done);
  - Manage ballots, ballot control + tally, Member names;
  - Builder steps + category sheet;
  - You (member and committee), Settings, the Edit sheet.
  The user approves, and answers the **Submit behavior** and **taken-names RPC** questions (needed for Task 20).
- [ ] Commit: `git add client/src/pages/ProfilePage.tsx client/src/pages/SettingsPage.tsx client/src/components client/src/App.tsx client/src/ui && git commit -m "Redesign the You tab and add Settings"`

### Task 19: PWA assets, final audit, docs and pre-publish checklist — STOP POINT 4

**Files:** Create `client/public/manifest.webmanifest`, `client/public/icons/{icon.svg,icon-192.png,icon-512.png,icon-maskable-512.png,apple-touch-icon.png,favicon-32.png}`, `client/scripts/render-icons.mjs`, `client/src/ui/__tests__/{pwa,audit}.test.ts`. Modify `client/index.html`, `client/package.json` (devDep `@resvg/resvg-js`), `docs/TESTING.md`, `docs/DEPLOY.md`. Delete `client/public/vite.svg`.

**Interfaces — Produces:**
- **Icon:** `icon.svg` is derived from the wordmark: a `#18181B` square, cream "OSCARS" in Century Gothic Light (rendered by `render-icons.mjs` via resvg with `fontFiles: ["public/fonts/CenturyGothic/centurygothic.ttf"]`, or the text converted to paths), "JUST SIDECHATTING" above it on the 512 sizes only, and a thin lemon rule. Maskable keeps the content in the central 80%. The 180×180 apple-touch-icon is opaque.
- **Manifest:** `name` "JSC Oscars", `short_name` "Oscars", `start_url` "/app", `scope` "/", `display` "standalone", `background_color` and `theme_color` "#18181B" (Android builds the splash from the icon + this color), icons 192, 512 and 512 maskable.
- **`index.html` additions:** manifest link, apple-touch-icon, favicon png and svg, `apple-mobile-web-app-capable`, `mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` = `black-translucent`, `apple-mobile-web-app-title` = "Oscars". **No service worker.** An iOS splash is added only if the white flash shows on a real iPhone.
- **`audit.test.ts`** runs over `src` except tests, `dev/`, and `LEGACY_ALLOW = ["src/pages/VotePage.tsx", "src/components/vote/CategoryVoteCard.tsx", "src/components/vote/GroupPicker.tsx"]` (removed by Task 21). It requires:
  - no `h-screen|min-h-screen|100vh`, no `text-[10px]|text-[11px]`, no `<Link[^>]*>\s*<button`, no `window.confirm`, no `fonts.googleapis`, no `WindSong|cursive`, no `serviceWorker.register`;
  - `MIGRATED` covers every `.tsx` in `pages/` and `components/` except `LEGACY_ALLOW` and `IndividualDetailsModal.tsx`;
  - every `<img` has `alt=`;
  - every `onClick` on a non-button element has `role=` + `tabIndex`.
- **`pwa.test.ts`:** the manifest fields equal the tokens; PNG IHDR sizes are 192, 512, 512, 180 and 32; there is a maskable icon; `index.html` contains the manifest, apple-touch-icon, theme-color, `viewport-fit=cover` and `black-translucent`; the colors in `icon.svg` ⊆ {`COLORS.bg`, `COLORS.label`, `PEBBLE_COLORS.lemon.bg`}.
- **Bundle check** (`node scripts/bundle-size.mjs`): JS gzip ≤ BASELINE + 35 KB and CSS gzip ≤ BASELINE + 12 KB (motion `Reorder` + widgets). First-load fonts (preloaded 300 + 400 + bold) ≤ 250 KB. Record the numbers in the ledger.

- [ ] Failing tests: `pwa.test.ts`, `audit.test.ts`. Expected FAIL.
- [ ] Implement. Run `node scripts/render-icons.mjs` and commit the PNGs. Fix audit hits in migrated files only.
- [ ] `npm test && npm run build`. Expected PASS. The gallery is absent from `dist`. Run the bundle check.
- [ ] Manual audit (controller, with the user for devices):
  - Lighthouse accessibility + installable on `/` and `/app`, desktop and mobile.
  - A full keyboard pass at 1440: sidebar → content → sheets (Esc, trap) → segmented arrows → HoldButton Space.
  - Hover states at 1280 and 1440, and line lengths (prose ≤ 60ch).
  - iPhone Safari: safe areas, the tab bar, the keyboard hiding the tab bar, 200% text, Reduce Motion, Increase Contrast, Add to Home Screen (icon, solid dark launch, standalone back buttons).
  - Android: install, vibration (release, submit, reveal), blur performance on Ballots scroll and a sheet drag (mitigate per Risks if janky).
- [ ] Docs:
  - `TESTING.md` gets a new "Design review" section: `/dev/design`, `?section=`, the reduce-motion toggle, the screenshot list at 375×812 / 1280×800 / 1440×900, and how to check fonts.
  - Copy updates: "Log in", "Create account", Results › Leaderboard, "Hold to open the envelope", Submit ballot, Customize Home.
  - `DEPLOY.md`: manifest and icons, no service worker, the Vote page status (Task 21), and the **Pre-publish checklist** below.
- [ ] **Pre-publish checklist** (in `DEPLOY.md`; the user decides before any public launch):
  1. **Font licensing.** Century Gothic is a Monotype commercial typeface, so web embedding needs a webfont license. Bellaboo's license is unknown (and the file has not been supplied). If licensing blocks publishing, swap in OFL lookalikes: Century Gothic → Questrial or Jost; Bellaboo → TBD. Only `index.css` `@font-face` changes.
  2. Bellaboo drop-in: put the file at `client/public/fonts/Bellaboo/`, enable the commented `@font-face`, check the gallery Type section.
  3. Home prefs in the DB (future `profiles.home_prefs`).
  4. The offline cache is a future spec.
- [ ] Controller check, then **STOP POINT 4**: the final screenshot set (every screen at 375 / 1280 / 1440, the gallery), the home-screen icon, the bundle and font numbers, and the Lighthouse scores. The user approves the icon.
- [ ] Commit: `git add client/public/manifest.webmanifest client/public/icons client/public/vite.svg client/scripts/render-icons.mjs client/index.html client/package.json client/package-lock.json client/src/ui/__tests__ docs/TESTING.md docs/DEPLOY.md && git commit -m "Add PWA manifest and icons, audit tests, design review docs and pre-publish checklist"`

### Task 20: Submissions in the DB and taken-name status — DEFERRABLE (open question)

**Gate:** runs only after the user answers the Submit behavior question (asked at SP3) and says the default (or their variant) is right. Part B runs only if the user wants crossed-out taken names, since it shows anonymous visitors which names have signed up. The work goes on `feat/submissions-db` and is merged only if the DB tests pass by **Nov 24 23:59** and voting has not opened. Otherwise Task 15's local state stays (per device) and this waits until after Dec 4. It never alters `votes` or the voting functions.

**Files:** Create `supabase/migrations/20261122000100_ballot_submissions.sql`, `supabase/tests/database/05_ballot_submissions.test.sql`. Modify `client/src/api/submissions.ts`, `client/src/database.types.ts`, `client/src/components/committee/CompletionPanel.tsx`, `client/src/api/members.ts` (B), `client/src/pages/SignupPage.tsx` (B).

**Interfaces — Produces:**
- **A.**
  - `create table public.ballot_submissions (ballot_id uuid not null references public.ballots(id) on delete cascade, voter_id uuid not null default auth.uid() references auth.users(id) on delete cascade, submitted_at timestamptz not null default now(), primary key (ballot_id, voter_id));`
  - RLS on. `select` own row, or all when `public.is_committee()`.
  - `insert` with check `voter_id = auth.uid() and public.ballot_is_open(ballot_id) and exists (select 1 from public.members where user_id = auth.uid())`.
  - No update or delete policies. `grant select, insert on public.ballot_submissions to authenticated;`
  - Header comment: "Additive. Apply with Supabase MCP apply_migration or paste in the dashboard SQL editor."
  - Client: `dbSubmissionIO()` `get` = `select submitted_at … maybeSingle()`, `submit` = `upsert({ ballot_id }, { onConflict: "ballot_id,voter_id", ignoreDuplicates: true }).select("submitted_at")`. `submissionIO` switches to the DB IO and migrates any local flag once, on load. `fetchSubmissions(ballotId): Promise<Set<string>>` (committee) feeds the CompletionPanel "Submitted" chip (strawberry).
- **B.** `create function public.member_name_status() returns table (name text, taken boolean) language sql stable security definer set search_path = public as $$ select name, user_id is not null from public.members order by name $$;` with `revoke … from public; grant execute … to anon, authenticated;`. Client: `fetchMemberNameStatus()` → Signup shows struck taken names.
- [ ] Write the failing DB test (02 pattern: `begin; … rollback;`, `public.__tap`/`__ids`, needs the `tests` schema; run 000 first if dropped and drop it again afterwards), with `plan(9)`:
  - table exists;
  - member inserts own submission on an open ballot;
  - a duplicate is ignored (`ON CONFLICT`);
  - insert on a closed ballot throws `42501`;
  - an unclaimed user cannot insert;
  - a member reads 1 own row and 0 of others';
  - the committee reads all;
  - a member cannot delete;
  - the `votes` count is unchanged by submitting.
  - (B, if approved: `plan(11)`) anon `member_name_status()` returns 14 rows, and the `taken` flags match claims.
- [ ] Ask the user to run it in the dashboard. Expected FAIL (relation does not exist).
- [ ] Write the migration. The CONTROLLER applies it with MCP `apply_migration` after the user says yes. Hand-edit `database.types.ts`, then implement the client.
- [ ] The user re-runs the test. Expected PASS, all `ok`.
- [ ] `cd client && npm test && npm run build`. Expected PASS.
- [ ] Controller check: submit as `test.micah`, and as `test.rickey` see "Submitted" on the CompletionPanel.
- [ ] Commit: `git add supabase/migrations/20261122000100_ballot_submissions.sql supabase/tests/database/05_ballot_submissions.test.sql client/src/api/submissions.ts client/src/api/members.ts client/src/database.types.ts client/src/components/committee/CompletionPanel.tsx client/src/pages/SignupPage.tsx && git commit -m "Store ballot submissions and expose taken member names"`

### Task 21: Vote page redesign — DEFERRABLE (gate: Nov 24 23:59 local)

**Deferral rules (binding):**
- Work happens on `feat/vote-redesign`, cut from `feat/design-system` after Task 19 (or Task 18 if 19 is in review). It merges into `feat/design-system` ONLY if ALL of these hold by **Nov 24 23:59**:
  1. `VotePage.test.tsx` passes with only its adapter block changed, plus the new tests.
  2. `npm test && npm run build` pass.
  3. A real-user dry run passes on a phone AND a laptop against `[TEST] Main Ballot`: vote all categories, rapid-tap 3 options, airplane mode → inline error → reconnect → retap, Clear → Undo, the Jump sheet (phone) and the left pane (desktop), next unvoted, group and add-an-option categories, a read-only closed ballot, reload → position restored, Submit link.
  4. The user says "ship the vote page".
- Otherwise it is NOT merged: the old `VotePage.tsx` keeps running in the shell, and the work resumes after voting closes (Nov 29).
- **Never merge between voting open and close**, even with a late yes. Record GO/NO-GO in the ledger.
- If deferred, findings 15, 16 and 17 stay open and `LEGACY_ALLOW` stays.

**Files:** Modify `client/src/pages/VotePage.tsx`, `client/src/components/vote/{CategoryVoteCard,GroupPicker}.tsx`, `client/src/pages/VotePage.test.tsx` (adapter + new tests), `client/src/ui/__tests__/{tokensOnly,audit}.test.ts` (move the files from `LEGACY_ALLOW` to `MIGRATED`). Create `client/src/ui/logic/voteScroll.ts`, `client/src/components/vote/JumpSheet.tsx`.

**Interfaces — Consumes:**
- **Copied unchanged:** the save queue (`chains`/`seqs`/`confirmed`, `save`, `addOption`, `addGroup`), plus `dashStates`, `nextUnvotedIndex`, `votedCount`, `selectableNominees`, `findMatchingNominee`, `groupCandidates`.
- **New:** `fetchMemberAvatars` in parallel (failure → initials only, never blocks voting), `Screen` (back Ballots), `ProgressStrip` (cream; horizontal on phone, vertical in the desktop left pane), `Sheet`, `Avatar` 40, `Button`, `BottomAccessory`, `useToast`, `pebbleAt`, `vibrate("saveFailed")`.

**Produces:**
```ts
export const voteScrollKey = (ballotId: string) => `jsc.vote.active.${ballotId}`
export function readActive(storage: Pick<Storage,"getItem"> | null, ballotId: string, ids: string[]): string | null
export function writeActive(storage: Pick<Storage,"setItem"> | null, ballotId: string, id: string): void
```
UI:
- **Phone (< 1024):** layout B (one scrolling list) with the cream `ProgressStrip` sticky under the NavBar (one button → `JumpSheet` with the category list and voted checks).
  - Category cards have a header strip in `pebbleAt(index)` with the number + name in `font-display text-title-3` (grape: `title-2`) and an on-pebble color; the body is `bg-surface`.
  - Nominee rows: `role="radio"` named by the nominee, 52 px, Avatar 40 (photo for single-member nominees), selected = `bg-inverse text-on-inverse` + a check.
  - A voted card collapses to "Best locs · Dakarai ✓ · Change".
  - "Clear" sits in the expanded card and shows the Toast "Vote cleared" with Undo (re-casts through `save`).
  - Status line "Saving…" → check. Error `role="alert"`: "Couldn't save your vote. Check your connection and tap again." (closed: "Voting closed. Your earlier pick still counts.") plus `vibrate("saveFailed")`.
  - Read-only `role="status"`. Finished: "All {n} voted. Nice." + "Submit ballot" + "Back to ballots".
  - Accessory: "{n} left" + "Next unvoted".
- **Desktop (≥ 1024), two-pane:** the left pane (320 px, sticky) is a vertical cream strip + the category list (name, voted check, current highlighted; a keyboard listbox with arrows). The right pane shows the current category card at 640 px with Previous / Next buttons. "Next unvoted" sits in the pane footer.
  - Keyboard: ↑/↓ in the list, Enter selects, the arrow keys move within the radiogroup, `N` = next unvoted (with an `aria-keyshortcuts` hint).
  - Both layouts share one save queue and one `myVotes` state.
- Scroll and active category restore via `readActive`/`writeActive` (sessionStorage).

- [ ] Failing tests (append): nominee rows show photos; Clear → Toast Undo restores the pick; an avatar fetch failure never blocks voting; the save-error copy; the desktop (matchMedia true) shows a listbox of categories and selecting the 2nd shows its radios; `readActive` valid/unknown/null cases.
- [ ] `npm test`. Expected FAIL (new tests). The Task 1 assertions still pass on the old page.
- [ ] Implement. Change only the adapter helpers. Every Task 1 assertion must pass unmodified.
- [ ] `npm test && npm run build`. Expected PASS. Re-run the bundle check.
- [ ] Controller check (`test.micah`; 375 / 1280 / 1440): 40 categories, rapid taps, offline, Jump sheet, two-pane keyboard flow, scroll restore, reduced motion.
- [ ] Gate: the real-user dry run (rules above). Record GO/NO-GO.
- [ ] Commit on `feat/vote-redesign`: `git add client/src/pages/VotePage.tsx client/src/pages/VotePage.test.tsx client/src/components/vote client/src/ui && git commit -m "Redesign the Vote page with photos, cream strip, jump sheet, undo and desktop two-pane"`. Merge only on GO.

---

## Risks and mitigations (steps inside the tasks)

- **`backdrop-filter` cost on older phones.**
  - Glass only on the tab bar, scrolled nav bar, accessory, sheets and toasts. No blur on scrims, Landing or ceremony pages. Blur drops to 12 px while dragging (Tasks 2, 6, 7).
  - If Android janks at SP4, cut the bar blur to 16 px; as a last resort use opaque materials under `(hover: none) and (max-resolution: 2dppx)`.
- **Safari quirks.**
  - Explicit `-webkit-backdrop-filter` (tested). Blur on the rounded element itself.
  - Fixed bars jump with the keyboard: hide the TabBar on input focus and use `visualViewport` for sheet footers.
  - `env()` needs `viewport-fit=cover`.
  - `prefers-reduced-transparency` is Chromium-only, so `prefers-contrast: more` is wired too.
  - The WebKit `-apple-system-body` root may change rem sizes: verify Century Gothic widths at SP1.
- **Tailwind v4 specifics.**
  - `@theme inline` (else values are hard-coded). `--text-*` sub-keys.
  - `@utility` for materials. Unlayered fallbacks beat layered utilities.
  - Literal class strings only (`PEBBLE_CLASS`). No `dark:`.
  - The custom `3xl` breakpoint via `--breakpoint-3xl`.
- **Fonts.**
  - Century Gothic is wide and can overflow 375 px headings: the scale is tightened and checked in the gallery Type section at SP1.
  - Faux bold is avoided with a real 700 face.
  - The fonts budget depends on the woff2 conversion (Task 2).
  - Licensing (Monotype, Bellaboo unknown) is on the pre-publish checklist, with OFL fallbacks.
- **Look-alike colors.** Lemon ≈ gold, so lemon is reserved for the envelope and `RESULTS_EXCLUDE` keeps it out of the opened podium cards. Tangerine ≈ bronze (excluded on results). Cherry ≈ danger: cherry is never status or error, and danger is never a fill.
- **Grape contrast (4.38).** Large text only, plus the `smallText` rule (tested). Offer `#7C3AED` (white 5.70) at SP1.
- **Vote regression.** The characterization tests come first (Task 1), the shell compat test is in Task 6, the gates are in Task 21, and Submit never touches votes.
- **Schedule.** 19 core tasks in about 3 days.
  - Stop points are screenshot reviews. Tasks 3-5, 9-10 and 13-18 parallelize.
  - If SP3 is not approved by Nov 24 noon, Tasks 20 and 21 are deferred automatically and Task 19 still ships.
  - Home (Tasks 11-12) is the largest new surface. If SP2 slips, ship Home with the default widgets and no Customize sheet (hide the trailing button behind `CUSTOMIZE_ENABLED`) and finish it after voting.
- **Data exposure.** "Who hasn't voted" uses committee-only RLS reads (adminOnly + render guard). Taken names (Task 20B) are an explicit user decision.

## Spec coverage map

Audit findings → tasks:

| Finding | Task |
|---|---|
| 1 | 8 |
| 2 | 2, 6 |
| 3 | 6, 9, 10, 12 |
| 4 | 7 |
| 5 | 13, 16, 19 |
| 6 | 2 |
| 7 | 2, 9, 17 |
| 8 | 2, 9, 13 |
| 9 | 6 |
| 10 | 6, 13 |
| 11 | 4, 6, 10-18 |
| 12 | 7, 8, 17, 18 |
| 13 | 7 |
| 14 | 2, 10, 16 |
| 15 | 21 (deferrable) |
| 16 | 6, 21 |
| 17 | 5, 21 |
| 18 | 9-18 |
| 19 | 5, 12 |
| 20 | 4 |
| 21 | 2 |
| 22 | 2, 19 |
| 23 | 6, 18 |

Spec sections → tasks:

| Spec section | Task |
|---|---|
| §3.1-3.6 | 2 (dark only, brand + pebble palette, Century Gothic) |
| §3.7 | 2, 5, 13 |
| §3.8 | 4, 6 |
| §3.9 | 4 |
| §3.10 | 2, 6, 7 |
| §3.11 | 2, 6, 7 |
| §3.12 | 6, 7, 12, 13, 16, 21 (desktop first-class) |
| §3.13 | 2, 13, 14, 15, 21 |
| §4 | 4-7, 13 |
| §5 | 9-18, 21 |
| §6 | 19, minus the service worker |
| §7 | Tasks 2-21 (test guard first; PWA and audit before the deferrable tasks) |

New user screens → tasks:

| Screen | Task |
|---|---|
| Home widgets | 11-12 |
| Customize Home | 12 |
| Submit | 15, 20 |
| Settings | 18 |
| Builder steps | 17 |
| Sign-up name chips | 9, 20B |
