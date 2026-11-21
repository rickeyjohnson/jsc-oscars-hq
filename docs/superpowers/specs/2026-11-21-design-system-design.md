# JSC Oscars HQ: Design System and Redesign

Date: 2026-11-21. Status: draft for approval. Next step after approval: implementation plan (one task per section 7 item).

## Intent and why

The app works, but members and the committee read it as "blocky, bare and vibecoded": hard-coded zinc and cream on every element, boxed everything, alarm-red banners, UPPERCASE badges, "Loading..." text, centered modals, and no native feel on the phones 14 people actually use. The goal is a classy, native-feeling web app that could ship publicly: quiet, disciplined chrome (Apple HIG craft, translated to the web), the members' faces everywhere, and one bold moment: **the envelope and the podium**.

Grounding: Apple HIG pages in the `apple-design` skill. Citations read `file.md › Heading`. Anything not covered by a page is marked **(judgment)**. This is a web app, so Apple's foundations (accessibility, color, type, layout, writing) apply fully; platform conventions apply as translated patterns (`cross-platform.md › Vocabulary`: tab bar = bottom navigation, Liquid Glass = `backdrop-filter`, Dynamic Type = font-size settings, safe area = insets).

## Goals

1. One token system (`@theme` in Tailwind v4) for color, material, type, space, radius, elevation and motion; no hex values in components.
2. An app shell that feels native on iPhone and Android (floating material tab bar, large titles, safe areas, sheets) and becomes a sidebar layout on laptop.
3. Every screen has a real loading (skeleton), empty and error state, in plain, active, sentence-case copy.
4. Faces first: member photos on nominee rows, podiums, leaderboard and profile.
5. A signature reveal on Results (and the committee Release page) that is memorable, skippable and reduced-motion safe.
6. Installable PWA with correct icons, theme color and standalone behavior.

## Non-goals

- New features or data changes. This is a visual and interaction rebuild over the existing data and `lib/` logic, which stay untouched.
- Offline data. The offline cache idea (memory: `supabase-offline-cache`) is a later spec; this one only caches the app shell.
- Native apps, push notifications, custom haptic engines.

## Anti-goals (a failure even if it technically works)

- Glass on cards, rows or content. Blur lives only on bars, sheets and toasts.
- Any voting regression during the open window (Nov 26-29). The vote flow's behavior and tests are frozen while it is live.
- Disabling zoom, auto-advancing screens on a timer, or motion that cannot be skipped.
- The podium colors drifting. They are fixed: gold `#FFC23D`, silver-blue `#9DB4D0`, bronze-orange `#E8803A`, flat, no gradients.

## 1. Audit (ranked by impact)

Severity follows the skill: Critical = accessibility failure or convention break that confuses; High = real friction or looks foreign; Medium = suboptimal pattern; Low = polish.

| # | Sev | Finding (file:line or screen) | HIG basis | Fix |
|---|---|---|---|---|
| 1 | Critical | `ProfileSetup.tsx:101-115` auto-advances every 5 s and auto-dismisses the last slide; people who read slowly or use VoiceOver lose content | `accessibility.md › Cognitive`: "Minimize use of time-boxed interface elements… Prefer dismissing views with an explicit action." | Replace with a Sheet: one step with photo picker, "Continue" and "Not now". No timers. |
| 2 | Critical | No safe-area handling anywhere; `index.html:6` lacks `viewport-fit=cover`; tab bar (`NavigationTabs.tsx:7-9`) sits under the home indicator; `h-screen`/`min-h-screen` (100vh) on every page and overlay (`ProfileSetup.tsx:153`, `FullScreenLoader.tsx:28`, `SignupPage.tsx:20`) jumps when the Safari toolbar moves | `layout.md › Guides and safe areas`: "Respecting the safe area is essential to make sure system UI… don't obstruct content and controls." | `viewport-fit=cover`; `env(safe-area-inset-*)` padding on shell, bars and sheets; `min-h-dvh` everywhere. |
| 3 | Critical | Tab items are `<Link><button>` (nested interactive, two tab stops, `NavigationTabs.tsx:11-61`); same in `LandingPage.tsx:13-23`, `LoginPage.tsx` (Back, Sign Up), `PendingBallots.tsx:67-72`. Each tab's hit area is only its label width (~33 px for "Home") | `accessibility.md › Mobility`: 44x44 pt default; `buttons.md › Best practices`: "hit region of at least 44x44 pt" | One `<a>` per tab, `flex-1`, min 49 px tall; never nest button in link (judgment, HTML validity). |
| 4 | Critical | Modals (`Modal.tsx`) have no `role="dialog"`, `aria-modal`, label, Escape key, focus trap or focus return; `return null` before `<AnimatePresence>` (`Modal.tsx:60`) means exit animations never run | `modality.md › Best practices`: "Always give people an obvious way to dismiss a modal view." | Sheet component (section 4) with dialog semantics, focus management, swipe and Escape dismiss. |
| 5 | Critical | Text below the 11 pt mobile minimum: `text-[10px]` in `Podium.tsx:28-29`, `StatsPage.tsx:125,168,180`, `TallyPanel.tsx:269`; `text-[11px]` in `MemberNamesPage` buttons | `typography.md › Ensuring legibility`: iOS default 17 pt, minimum 11 pt | Caption 2 (11 px) is the floor; tags use Caption 1 (12 px) semibold. |
| 6 | Critical | Inactive tab labels `#fffadd`/40 on `#18181b` = **3.67:1** at 12 px; "closes in" `amber-100/40` = **3.56:1** (`BallotCard.tsx:53`) | `accessibility.md › Vision` table: up to 17 pt needs 4.5:1 | Label tokens in section 3 (secondary label ≥ 6.3:1 on every surface). |
| 7 | Critical | Inputs use `focus:outline-none` with a 10%→30% border shift (`LoginPage.tsx`, `BallotBasicInfo.tsx`, `CategoryModal.tsx`, `BulkImportPanel.tsx`); keyboard focus is nearly invisible. Labels are not tied to inputs (`<label>` without `htmlFor`, `LoginPage.tsx`) | `accessibility.md › Speech`: "Let people use the keyboard alone"; `writing.md › Show hints in text fields` | Global `:focus-visible` ring (section 3.10); `<label htmlFor>`; `autoComplete="email"`/`"current-password"`/`"new-password"`. |
| 8 | High | No motion respects Reduce Motion: blur-in slides (`ProfileSetup.tsx:160-175`), 1.25 s fly-away exits, global `button:active { scale(.95) }` (`index.css:53-60`), falling-faces physics | `accessibility.md › Cognitive`: replace x/y/z transitions with fades, avoid animating into and out of blurs | `<MotionConfig reducedMotion="user">` at root plus the substitutes in 3.7; physics settles instantly under reduced motion. |
| 9 | High | Tab bar is an opaque 95% zinc slab with a top border (`NavigationTabs.tsx:9`), nav bar is a sticky logo strip (`NavigationBar.tsx:5`) repeating the brand on every screen | `tab-bars.md › Phone (iOS)`: "A tab bar floats above content… on a Liquid Glass background"; `branding.md › Best practices`: "Resist the temptation to display your logo throughout your app" | Floating material tab bar; large-title nav bar with the screen's name, not the logo. |
| 10 | High | Results has no tab: `ResultsPage.tsx:22` passes `activeTab="results"`, which matches nothing, so no tab is selected; Profile has two "View Results" rows going to different places (`ProfilePage.tsx:96,148`) | `tab-bars.md › Best practices`: tabs show where you are; `writing.md › Build language patterns` | Tabs: Home, Ballots, Results, Profile. Stats becomes the Leaderboard segment of Results. |
| 11 | High | Loading is "Loading..." text (`BallotsPage.tsx:64`, `VotePage.tsx:113,116`, `ResultsPage.tsx:57`, `StatsPage.tsx:79`, committee pages) or a blocking blur overlay (`FullScreenLoader.tsx`); Profile shows fake "username@example.com" and "--" stats while loading (`ProfilePage.tsx:49-84`) | `loading.md › Best practices`: "Show something as soon as possible… placeholder text, graphics"; `progress-indicators.md › Best practices`: avoid vague terms like *loading* | Skeletons shaped like the final layout; delete fake stats or wire them to real data. |
| 12 | High | Centered modals for every task (`CategoryModal.tsx`, `EditProfileModal`, `ManageOscarsModal`, `JokeGeneratorModal`, forgot-password in `LoginPage`); `BulkImportPanel.tsx` is a bottom panel with no grabber or drag | `sheets.md › Mobile`: grabber, detents, "Support swiping to dismiss a sheet" | One Sheet component: bottom sheet on phone, centered card on laptop. |
| 13 | High | `window.confirm` for irreversible committee actions (`BallotAdminPage.tsx:50`, `TallyPanel.tsx:144,163,174`, `NomineeModePicker.tsx:25`) shows "localhost says" with OK/Cancel | `modality.md › Best practices`: explain the situation, give ways to resolve it; `buttons.md › Role`: never make destructive the primary role | ConfirmSheet: title says the consequence, destructive button labeled with the verb ("Close voting"), Cancel. |
| 14 | High | Color means many things: cream `#fffadd` and Tailwind `amber-100` (`#fef3c6`) are mixed as if one color; status badges use green/blue/red/purple; "CLOSED" is red like an error; "Action Required!" uses a red gradient banner (`PendingBallots.tsx:31-37`) | `color.md › Best practices`: "Avoid using the same color to mean different things"; `feedback.md`: match the significance of information to delivery | Semantic tokens; neutral chips; red only for destructive and errors. |
| 15 | High | Nominee rows show a gray initial bubble (`CategoryVoteCard.tsx:70-72`) even though member photos exist (`fetchMemberAvatars`); faces are the product's identity | `branding.md › Best practices`: express brand through content (judgment on faces) | Avatar with photo first, initials fallback. |
| 16 | High | Back navigation is 12 px text links ("← Back to ballots", `VotePage.tsx:182`; "← Back", `LoginPage`) with tiny hit areas; in an installed PWA on iOS there is no browser back button | `designing-for-ios.md › Best practices`: let people navigate back easily; `accessibility.md › Mobility` | Nav bar leading back button (chevron + parent title, 44 px) on every pushed screen. |
| 17 | Medium | Vote dash strip: 30-40 buttons at ~10 px wide x 32 px tall (`VotePage.tsx:163-177`) are far under the 28 pt minimum | `accessibility.md › Mobility`: minimum 28x28 pt; "Offer alternatives to gestures" | On phone the strip is one button ("8 of 30 voted") that opens a Jump sheet; individual dashes are tappable only at ≥ 20 px wide on laptop. |
| 18 | Medium | Mixed capitalization and tone: "Vote Now", "Review Votes", "Welcome Back", "Sign Out" vs "Skip for now"; "Login" vs "Sign Up" vs "Sign Out"; UPPERCASE badges; "categorie(s)" (`BallotCard.tsx:64`); raw `e.message` shown to people (`BallotsPage.tsx:22`, `ReleasePage.tsx:40`, `BallotAdminPage.tsx:38`) | `writing.md › Adopt capitalization rules… apply them consistently`; `› Write clear error messages` | Sentence case everywhere; "Sign in / Sign out / Create account"; pluralize; map errors to plain copy (section 5). |
| 19 | Medium | Countdown is four boxed tiles with proportional digits (`Countdown.tsx:33-40`) that jitter every second; the timer re-renders every second with no screen-reader strategy | `typography.md` (hierarchy) (judgment on tabular numerals) | One line, tabular numerals, no boxes; `aria-live="off"` with a per-minute `aria-label`. |
| 20 | Medium | Global press scale on every button including list rows and dash buttons (`index.css:53-60`) | `motion.md › Providing feedback`: "generally avoid adding motion to UI interactions that occur frequently"; `buttons.md`: "Always include a press state" | Press scale 0.97 only on standalone buttons; rows get a highlight fill instead. |
| 21 | Medium | Fonts: Poppins and WindSong load from Google Fonts via `@import` (render-blocking, third-party request) though `/public/fonts/` exists; three typefaces plus system fallbacks | `typography.md › Conveying hierarchy`: "Minimize the number of typefaces" | System UI stack for all UI; Century Gothic only in the wordmark; delete the Google imports. |
| 22 | Medium | `index.html`: title "client", Vite favicon, no `theme-color`, manifest, `apple-touch-icon` or `lang`-aware meta | `launching.md › Launch screens` (solid color matching first screen) (rest judgment) | Section 6 checklist. |
| 23 | Low | Unstyled 404 (`App.tsx:127`); `ProfilePage.tsx:44` `<img>` without `alt`; "Settings" row does nothing (`ProfilePage.tsx:100`); "Experimental · Joke Generator" gradient row | `writing.md › Provide clear next steps on any blank screens`; `design-principles` Simplicity (skill table) | EmptyState 404; alt text; remove dead rows. |

What works and must survive: per-category inline save errors (`CategoryVoteCard.tsx:109`, `role="alert"` next to the problem, per `writing.md › Write clear error messages`); the podium's DOM order 1-2-3 with visual 2-1-3 and `sr-only` place text (`Podium.tsx:11,25`); dark text on podium colors (8.59, 7.18, 6.36:1); the hold-to-release interaction with keyboard support and cancel-on-blur (`ReleasePage.tsx:173-207`); Retry buttons on errors; the falling faces on Landing.

## 2. Recommendation: "Glass Night" (A's shell, B's discipline, C's one loud moment)

**Build Direction A as the shell, with B's content discipline and C's color-blocking reserved for the reveal.**

- **From A (Glass):** dark-first appearance, system font, large titles, a floating blurred tab bar, materials on bars and sheets. This is the frosted feel the user loves in ProfileSetup, applied where Apple applies it.
- **Correction to A:** the mock puts glass on content cards (`.A .glass` on every block). That breaks `liquid-glass.md › Review checklist` #1: "Glass on app backgrounds, cards, list rows, or content containers is a defect." Cards become opaque surfaces; glass is limited to tab bar, nav bar (when scrolled), sheets and toasts. Drop A's radial "orbs" background (decoration, `design-principles` Delight warning).
- **From B (Studio):** photo-forward rows and cards, high-contrast label-colored primary buttons, quiet shadows in light mode, real light appearance.
- **From C (Marquee):** big tight-tracked display numerals and flat color blocks, used **only** on the podium and the reveal.

**What is distinctive here (the thesis):** a friend group's awards night. Three things nobody else has: **the faces** (14 real people), **the envelope** (the committee holds a button for 3 seconds and the night's results open for everyone), and **the podium** (flat gold, silver-blue, bronze blocks). Boldness is spent once: the Results reveal and podium. Everything else (Home, Ballots, Vote, Profile, committee tools) is quiet system UI so the faces and the podium carry the identity, as `branding.md › Best practices` puts it: "Ensure branding always defers to content."

**Self-critique (skill step 3):** would this plan fit any dark awards app? The shell would; the identity would not, because it lives in the members' photos and the envelope-to-podium ceremony, which only this product has. Kept. One accessory removed: A's champagne accent was going to tint buttons too; primary buttons are now monochrome (label-filled) and champagne is only for selection and focus, so gold reads as "winner" and nothing else.

## 3. Design system (tokens and rules)

### 3.1 Color roles

Defined as CSS variables on `:root` (light) and `@media (prefers-color-scheme: dark)`, exposed to Tailwind with `@theme inline` so utilities read `bg-bg`, `text-label-2`, `border-sep`. No app-level appearance switch (`dark-mode.md › Best practices`: "Avoid offering an app-specific appearance setting"). Web cannot read Apple's dynamic system colors, so these are custom colors with light, dark and increased-contrast variants, as `color.md › Best practices` requires.

| Role | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F2F2F7` | `#0B0B0F` | Page background (grouped) |
| `surface` | `#FFFFFF` | `#16161B` | Cards, grouped sections, rows |
| `surface-2` | `#E9E9EE` | `#222228` | Inset fields, selected-off option rows, skeleton base |
| `elevated` | `#FFFFFF` | `#1E1E24` | Sheet body (dark elevated, per `dark-mode.md › Mobile`) |
| `label` | `#111114` | `#F5F5F7` | Primary text and icons |
| `label-2` | `#5E5E66` | `rgb(235 235 245 / .64)` | Secondary text |
| `label-3` | `rgb(60 60 67 / .30)` | `rgb(235 235 245 / .40)` | Placeholders, disabled, decorative only (never essential text) |
| `fill` | `rgb(120 120 128 / .16)` | `rgb(120 120 128 / .32)` | Chip and segmented-control track, row press highlight |
| `sep` | `rgb(60 60 67 / .18)` | `rgb(84 84 88 / .55)` | Hairlines (0.5 px on 2x+, 1 px otherwise) |
| `accent` | `#8A6516` | `#E6C77A` | Champagne. Selected tab, selected nominee, progress fill, focus ring, links. Never on buttons' fills except the selected nominee row |
| `on-accent` | `#FFFFFF` | `#1A1304` | Text on accent fill |
| `inverse` / `on-inverse` | `#111114` / `#FFFFFF` | `#F5F5F7` / `#0B0B0F` | Primary button fill and its label |
| `danger` | `#D70015` | `#FF6961` | Destructive buttons, errors |
| `success` | `#1F7A35` | `#30D158` | "Voted" check, ready checks |
| `warn` | `#A35200` | `#FFB340` | Closing soon, failed release checks |
| `gold` / `on-gold` | `#FFC23D` / `#3B2A00` | same | 1st place and "Winner" only (fixed) |
| `silver` / `on-silver` | `#9DB4D0` / `#17263A` | same | 2nd place only (fixed) |
| `bronze` / `on-bronze` | `#E8803A` / `#2B1204` | same | 3rd place only (fixed) |

Increased contrast (`@media (prefers-contrast: more)`): `label-2` becomes `#3A3A40` light / `rgb(235 235 245 / .82)` dark; `sep` alpha doubles; materials go opaque. Rules: one color, one meaning (`color.md › Best practices`); status always pairs color with an icon or word (`accessibility.md › Vision`: "Convey information with more than color alone"); podium colors never appear outside placement.

### 3.2 Contrast pairs (WCAG 2 ratios computed from the hex values; `accessibility.md › Vision` needs 4.5:1 up to 17 pt, 3:1 at 18 pt or bold)

| Pair | Ratio | Pass |
|---|---|---|
| Current: cream `#fffadd` on `#18181b` | 16.85 | yes |
| Current: cream/60 on `#18181b` | 6.73 | yes |
| Current: cream/40 on `#18181b` (inactive tab, 12 px) | **3.67** | no |
| Current: amber-100/40 on `#18181b` | **3.56** | no |
| Dark `label` on `bg` / `surface` / `surface-2` | 18.04 / 16.56 / 14.53 | yes |
| Dark `label-2` on `bg` / `surface` / `surface-2` | 7.03 / 6.79 / 6.32 | yes |
| Dark `accent` on `bg` / `surface` | 11.99 / 11.00 | yes |
| Dark `on-accent` on `accent` | 11.25 | yes |
| Dark `danger` / `success` / `warn` on `surface` | 6.39 / 8.92 / 10.11 | yes |
| Light `label` on `bg` / `surface` | 16.89 / 18.85 | yes |
| Light `label-2` on `surface` / `bg` / `surface-2` | 6.42 / 5.76 / 5.31 | yes |
| Light `accent` on `surface` / `bg`; `on-accent` on `accent` | 5.31 / 4.76; 5.31 | yes |
| Light `danger` / `success` / `warn` on `surface` | 5.38 / 5.39 / 5.58 | yes |
| `on-gold` / `on-silver` / `on-bronze` on their blocks | 8.59 / 7.18 / 6.36 | yes |
| Dark inactive tab label `#A1A1AA` on tab material over white photo (worst case) / over `bg` | 4.15 / 6.83 | bold 3:1 yes (labels are semibold) |
| Light inactive tab label `#6E6E76` on light material over black (worst case) / over white | 3.41 / 4.85 | bold 3:1 yes |
| Podium blocks against light `surface` (non-text) | 1.61 / 2.13 / 2.77 | shape, height and numeral carry meaning; add `inset 0 0 0 1px rgb(0 0 0 / .08)` in light |

### 3.3 Materials (functional layer only)

`liquid-glass.md › Cross-platform translation` gives starting values (regular blur 20-40 px, fill 60-80%, saturation 1.2-1.5x); these are tuned for legibility above. Implemented as Tailwind `@utility` classes.

| Utility | Light | Dark | Used by |
|---|---|---|---|
| `material-bar` | `rgb(249 249 251 / .85)`, `blur(24px) saturate(1.4)` | `rgb(28 28 34 / .85)`, same | Tab bar, nav bar when scrolled, bottom action bar |
| `material-sheet` | `rgb(255 255 255 / .92)`, `blur(32px) saturate(1.3)` | `rgb(30 30 36 / .92)`, same | Sheets, toasts, Jump sheet |
| `material-scrim` | `rgb(0 0 0 / .25)` no blur | `rgb(0 0 0 / .50)` no blur | Behind sheets (no blur on the scrim keeps cost down) |

Every material gets a hairline and inner highlight: `box-shadow: inset 0 0.5px 0 rgb(255 255 255 / .14), 0 0 0 0.5px var(--sep)`. Scroll edge effect: a 24 px `mask-image: linear-gradient(to bottom, black, transparent)` fade on content where it meets the nav bar, instead of a solid band (`layout.md › Visual hierarchy`: "use a scroll edge effect… Instead of applying a solid or semi-opaque background").

Fallbacks: `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` and `@media (prefers-reduced-transparency: reduce)` and `@media (prefers-contrast: more)` all switch materials to opaque `surface` (light) / `#1C1C22` (dark) with a 1 px `sep` border (`liquid-glass.md › Review checklist` #5). Note `prefers-reduced-transparency` is Chromium-only; Safari users get the blur.

### 3.4 Type

Stack (`--font-sans`): `-apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. This yields SF on Apple devices without embedding it (`typography.md › Using system fonts`, developer note: "don't embed system fonts"). `--font-brand`: `"CenturyGothicRegular"` / `"CenturyGothicThin"` for the OscarLogo wordmark only. Delete Poppins and WindSong. Numerals: `font-variant-numeric: tabular-nums` on countdowns, counts, ranks, percentages (judgment).

Dynamic Type on the web: `@supports (font: -apple-system-body) { html { font: -apple-system-body; font-family: var(--font-sans); } }` makes iOS Safari's root size follow the person's text-size setting (17 px at default); elsewhere the root stays at the browser's 16 px and follows browser zoom. All sizes are rem so everything scales (`typography.md › Supporting Dynamic Type`; `accessibility.md › Vision`: enlarge text "by at least 200 percent"). Layouts must survive 200%: rows wrap, stat tiles stack.

Scale (from `typography.md › Specifications`, iOS Large default; tracking from `› Tracking values`, converted to em). Tailwind v4: `--text-<name>`, `--text-<name>--line-height`, `--text-<name>--letter-spacing`, `--text-<name>--font-weight`.

| Token | Size (rem / px at 17) | Weight | Line height | Tracking |
|---|---|---|---|---|
| `large-title` | 2.000 / 34 | 700 | 1.206 (41) | 0.012em |
| `title-1` | 1.647 / 28 | 700 | 1.214 (34) | 0.014em |
| `title-2` | 1.294 / 22 | 700 | 1.273 (28) | -0.012em |
| `title-3` | 1.176 / 20 | 600 | 1.250 (25) | -0.023em |
| `headline` | 1.000 / 17 | 600 | 1.294 (22) | -0.026em |
| `body` | 1.000 / 17 | 400 | 1.294 (22) | -0.026em |
| `callout` | 0.941 / 16 | 400 | 1.313 (21) | -0.020em |
| `subhead` | 0.882 / 15 | 400 | 1.333 (20) | -0.016em |
| `footnote` | 0.765 / 13 | 400 | 1.385 (18) | -0.006em |
| `caption-1` | 0.706 / 12 | 400 | 1.333 (16) | 0 |
| `caption-2` | 0.647 / 11 | 400 (600 on tab labels) | 1.182 (13) | 0.006em |
| `display` (reveal and countdown only) | 3.529 / 60 | 700 | 1.0 | -0.02em (judgment) |

Emphasis uses the next weight up (600/700), never Light/Thin for UI (`typography.md › Ensuring legibility`: "avoid light font weights"). Tracking check: WebKit may already track system-ui per size; verify one screen in Safari and, if doubled, zero the tracking tokens inside the `@supports (font: -apple-system-body)` block (judgment).

### 3.5 Spacing, layout and radii

- Grid: 4 px base (Tailwind default `--spacing: 0.25rem`). Steps in use: 4, 8, 12, 16, 20, 24, 32, 48.
- Margins: 16 px phone, 24 px ≥ 768, 32 px ≥ 1024. Section gap 32; card padding 16; row min height 44 (52 with avatar); 12 px between bezeled controls, 24 around bezel-less ones (`accessibility.md › Mobility`: "about 12 points of padding around elements that include a bezel… about 24 points" for those without).
- Radii, three only: `--radius-control: 12px` (fields, option rows, small buttons), `--radius-card: 20px` (cards, grouped sections), `--radius-sheet: 28px` (sheets, tab bar capsule). Pills and avatars are `9999px`. Nested shapes are concentric: inner radius = outer radius - padding (judgment).
- Continuous corners: progressive enhancement `@supports (corner-shape: squircle) { .rounded-card, .rounded-sheet { corner-shape: superellipse(1.6) } }` (Chromium only today; Safari keeps circular arcs) (judgment).

### 3.6 Elevation (two levels)

- `e1` content: dark = no shadow, surfaces step up in lightness; light = `0 1px 2px rgb(0 0 0 / .05), 0 4px 16px rgb(0 0 0 / .05)`.
- `e2` floating functional layer (tab bar, sheets, toasts, bottom action bar): dark = `0 8px 32px rgb(0 0 0 / .45)`; light = `0 8px 32px rgb(0 0 0 / .12)`; both plus the material hairline.

### 3.7 Motion

Library: `motion` (already installed). Wrap the app in `<MotionConfig reducedMotion="user">`. Springs use `visualDuration` and `bounce`:

| Token | Value | Use |
|---|---|---|
| `spring.snappy` | `{ type: "spring", visualDuration: 0.25, bounce: 0 }` | Selection, chip and segment changes, tab indicator |
| `spring.sheet` | `{ type: "spring", visualDuration: 0.4, bounce: 0.1 }` | Sheet present, detent snap |
| `spring.page` | `{ type: "spring", visualDuration: 0.35, bounce: 0 }` | Push navigation (x 24 px + fade), pop reverses |
| `spring.podium` | `{ type: "spring", visualDuration: 0.6, bounce: 0.28 }` | Reveal only |
| `ease.fade` | `0.2s cubic-bezier(.2,0,0,1)` | Fades, skeleton to content cross-fade |
| `press` | `scale 0.97`, 100 ms in, `spring.snappy` out | Standalone buttons only |

Tab switches do not animate the page (instant swap, like iOS). Reduced motion substitutes (`accessibility.md › Cognitive`): pushes become 150 ms fades; sheets fade and appear at their detent with no slide; podium blocks appear at full height with a 200 ms fade; no blur transitions anywhere; falling faces render settled; press scale off. All motion is interruptible: tapping during the reveal skips to the end (`motion.md › Let people cancel motion`).

### 3.8 Iconography

Keep `lucide-react` (already installed, consistent 24-grid). Rules: stroke 1.75 at 20-24 px, 2 at 16 px; size matches adjacent text (icon = 1.2x cap height of its label); selected tab icon uses the filled-style variant (`fill="currentColor"` where the glyph allows) per `tab-bars.md › Best practices`: "Prefer filled symbols or icons"; every icon-only button has `aria-label`. No emoji in UI chrome (the "✨" title, "▾" glyph toggles, "✓/✕" characters become icons).

### 3.9 Avatars

Photo first, initials fallback on a deterministic hue from the member id (6 muted hues, white text ≥ 4.5:1; current `#71717a` gray is 4.83:1 and stays as the neutral). Sizes: 24 (leaderboard dense), 32 (lists), 40 (nominee rows), 56 (podium 2nd and 3rd), 72 (podium 1st), 96 (profile). Ring: 2 px `bg` ring when stacked; 3 px podium color ring on podium avatars. `<img alt="">` when the name is adjacent; `loading="lazy"`, `decoding="async"`, `object-fit: cover`. AvatarStack: max 4 + "+N", -8 px overlap.

### 3.10 Accessibility rules

- Focus: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` globally; never `outline-none` without a replacement. Accent vs `bg` is 11.99 dark / 4.76 light (≥ 3:1 for non-text).
- Targets: 44x44 px minimum on touch (`accessibility.md › Mobility`), 28x28 px on pointer-only layouts; use invisible padding to grow small glyph buttons.
- Tabs: `<nav aria-label="Main">` with links and `aria-current="page"`. Segmented control: `role="tablist"`/`tab`/`tabpanel` with arrow keys.
- Sheets: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` the title, focus first field or the title, trap focus, Escape closes, focus returns to the opener; grabber is a `button` "Resize sheet".
- Live regions: save errors `role="alert"` (keep); toasts `role="status"`; countdown `aria-live="off"`.
- Status never by color alone; podium `sr-only` "1st place" text stays.
- Zoom stays enabled. No `maximum-scale`, no `user-scalable=no`. Inputs are ≥ 16 px (body is 17) so iOS does not auto-zoom.

### 3.11 Safe area and viewport

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- Shell: `min-height: 100dvh`; top bar `padding-top: env(safe-area-inset-top)`; tab bar `bottom: calc(8px + env(safe-area-inset-bottom))`; side gutters `max(16px, env(safe-area-inset-left/right))` for landscape.
- Content bottom padding = tab bar height (64) + 8 + safe-area + any bottom action bar (56).
- Sheets pad their footer with `env(safe-area-inset-bottom)`; with the keyboard open, use `visualViewport` resize to keep the footer above it (judgment).

### 3.12 Phone vs laptop

Breakpoints by available width, not device (`layout.md › Size classes`: "Determine layout based on size classes, not device type"):
- `< 768`: bottom floating tab bar, large titles, full-width cards, sheets from bottom.
- `768-1023`: same, content max 640 px centered.
- `≥ 1024`: left sidebar (260 px, `material-bar` not needed, opaque `surface`) with the same four sections plus a "Committee" group for committee members; tab bar hidden; content max 720 px (lists, forms) or 1040 px (Results grid, 2 columns); sheets become centered 560 px cards with the scrim (`sheets.md › Mobile`: form-sheet style on iPad). Functionality never changes across widths (`layout.md › Size classes`: "Don't change your app's functionality based on the space it occupies"). Hover states on rows and buttons only under `@media (hover: hover)`.

### 3.13 Haptic-like feedback on the web

`navigator.vibrate` works on Android Chrome, not iOS Safari. Use it for three discrete events only: hold-to-release completes (20 ms), reveal finishes (2 x 15 ms), vote save fails (40 ms). Not on every vote tap (`playing-haptics.md › Avoid overusing haptics`). Always paired with visual feedback (`› Prefer using haptics to complement other feedback`). No iOS checkbox-switch hacks (fragile) (judgment).

## 4. Component inventory

New folder `client/src/ui/`. Each component uses tokens only.

| Component | Anatomy and states | Tokens | A11y | Replaces |
|---|---|---|---|---|
| **AppShell** | `NavBar` (top) + `<Outlet>` + `TabBar` (phone) or `Sidebar` (≥ 1024). One `UserDataProvider` around a nested `/app` route instead of one per route | bg, material-bar, e2 | landmark `main`, skip link | `NavigationBar.tsx`, `NavigationTabs.tsx`, per-page `Shell`/`Page` in Vote, Results, Stats, Release; `App.tsx` route wrappers |
| **NavBar** | Leading back (chevron + parent title, 44 px) or nothing on tab roots; centered compact title that fades in when the large title scrolls under (IntersectionObserver); trailing slot (avatar on Home, actions); transparent at rest, `material-bar` + hairline after scroll | headline, material-bar | `<header>`, back is a link with "Back to Ballots" | NavigationBar logo strip, "← Back" links |
| **LargeTitle** | Page `h1` in `large-title` under the bar; optional subtitle in `subhead label-2` | large-title | one `h1` per screen | ad-hoc `text-3xl font-black` titles |
| **TabBar** | Floating capsule, `left/right 12`, height 64, radius sheet, 4 equal items: icon 24 + `caption-2` 600 label; selected = accent icon (filled) + label; badge = red dot + count for open unvoted ballots | material-bar, accent, e2 | links, `aria-current="page"`, 49 px min height | NavigationTabs |
| **Button** | Variants: `primary` (inverse fill), `secondary` (fill), `tinted` (accent 16% fill, accent label), `destructive` (danger label on fill; danger fill only in ConfirmSheet), `plain` (text). Sizes: `lg` 52 px (full-width CTAs), `md` 44, `sm` 32 visual with 44 hit area. States: hover (≥ hover devices), pressed (0.97 + 8% darken), disabled (label-3, no opacity on the whole button), loading (spinner + progressive label, e.g. "Signing in…", per `buttons.md › Mobile`) | radius-control or pill for `lg`, headline | native `<button>`/`<a>`; `aria-busy` while loading | every inline class string for buttons, `ProfilePageButton.tsx` |
| **GroupedSection / ListRow** | Inset grouped list: optional header (`footnote label-2`, sentence case, not UPPERCASE), rows separated by inset hairlines starting after the leading avatar/icon, footer note. Row: leading (avatar/icon 28), title (`body`), subtitle (`subhead label-2`), trailing (value, chip, chevron). States: pressed highlight `fill`, selected check | surface, sep, radius-card | rows that navigate are links; toggles are buttons | ProfilePageButton, Stats rows, Results "Also placed", MemberNames rows, Release checks, CompletionPanel |
| **Card** | `surface`, radius-card, padding 16, `e1`; optional media header (photo or podium) bleeding to edges | surface, e1 | `section` with heading | BallotCard, PendingBallots, Countdown, Results section |
| **Avatar / AvatarStack** | See 3.9 | | | Podium inline divs, Stats spans, Profile img, initials bubble |
| **Chip** | 24 px tall, `caption-1` 600, `fill` background, optional leading icon or dot; tones: neutral, success, warn, danger, gold (Winner only) | fill, status colors | text, not color, carries meaning | BallotCard badges, `StatusBadge.tsx`, `committee/StatusChip.tsx`, Podium tag |
| **SegmentedControl** | Track `fill`, radius-control, 36 px (44 hit), sliding thumb `surface` + e1 using `spring.snappy` | fill, surface | tablist pattern | Ballots filter pills, Results Winners/Leaderboard |
| **Sheet** | Scrim, panel `material-sheet` + `elevated` body, radius-sheet top corners, grabber (36x5, `label-3`), header row (Cancel leading, title, Done/primary trailing per `sheets.md › Mobile`), scroll body with `overscroll-behavior: contain`, sticky footer. Detents `medium` (~50%) and `large` (top inset 12 px). Drag to dismiss from grabber or when scrolled to top; velocity > 800 px/s or past 30% height dismisses; unsaved changes trigger ConfirmSheet. Laptop: centered card | material-sheet, spring.sheet | dialog rules in 3.10; Close button always present (`accessibility.md › Mobility`: alternatives to gestures) | `Modal.tsx` and all its users, `CategoryModal`, `BulkImportPanel`, forgot-password, `ProfileSetup`, `FullScreenLoader` (deleted) |
| **ConfirmSheet** | Title (consequence), message, destructive or primary action labeled with the verb, Cancel. Primary role never on the destructive button (`buttons.md › Role`) | | `alertdialog` | all `window.confirm` calls, `DeleteConfirmationModal.tsx` |
| **Toast** | Bottom, above tab bar, `material-sheet`, pill, icon + one line + optional action ("Undo"); 4 s for info, persistent until dismissed when it has an action that matters | | `role="status"`, pauses on hover/focus | none today; used for "Vote cleared · Undo", "Photo updated", background refresh failures |
| **Skeleton** | Blocks in `surface-2` matching final layout (cards, rows, podium); shimmer is a 1.5 s opacity pulse, off under reduced motion; cross-fade to content | surface-2 | container `aria-busy="true"`, one `sr-only` "Loading ballots" | all "Loading..." text, `FullScreenLoader.tsx` |
| **EmptyState** | Icon 40 in `label-3`, `title-3` title, `subhead label-2` one-line reason, optional action button | | heading + action | "No ballots", "No categories yet", 404 |
| **ErrorState** | Same layout, title says what happened, body says how to fix, `Retry` secondary button | | `role="alert"` | "Couldn't load… Retry" lines |
| **ProgressStrip** | Thin segmented bar (one segment per category, 4 px tall, 2 px gaps), voted = accent, current = label outline; phone: whole strip is one button opening the Jump sheet (category list with voted checks); ≥ 1024 with ≥ 20 px segments: segments are individually focusable | accent, fill | button label "8 of 30 voted. Jump to a category" | VotePage dash strip |
| **Podium** | Three columns visual 2-1-3; avatar above block (72/56/56) with podium-color ring, name `subhead` 600 (2 lines max, then ellipsis in the middle), sub `caption-1 label-2`, block heights 112/84/64, flat fixed color, numeral in `title-1` 700 `on-*` color, top radius 12; ties show a "Tied" chip. Variants: `card` (in Results list), `hero` (reveal, display numerals) | podium tokens, spring.podium | `ol` in place order, `sr-only` place text | `Podium.tsx` |
| **Countdown** | One line: `display` tabular numerals "12d 04h 31m", seconds in `title-3 label-2`; date line in `subhead label-2`; states: scheduled, today ("Tonight at 3:00 PM"), live ("It's Oscar night"), none ("Date coming soon") | display, tabular-nums | `aria-live="off"`, `aria-label` updated each minute | `Countdown.tsx` |
| **HoldButton** | 56 px pill, `secondary` base, fill sweeps left to right in `label` at 12% over 3 s, label "Hold to open the envelope", ring of `accent` when focused; states idle, holding, releasing (spinner, "Opening…"), done, disabled (with reason list above) | spring.snappy | keyboard hold kept; `aria-describedby` the 3 s hint | `HoldButton` in `ReleasePage.tsx` |

## 5. Screen notes

Copy rules for all screens: sentence case for every title, button, chip and header (`writing.md › Adopt capitalization rules`); verbs on buttons (`writing.md › Be action oriented`); errors say what happened and how to fix, no "we", no "oops" (`writing.md › Write clear error messages`, `› Use possessive pronouns sparingly`); empty states invite the next action (`writing.md › Provide clear next steps`). Glossary: "Sign in", "Sign out", "Create account", "Ballot", "Category", "Nominee", "Vote", "Results", "Leaderboard", "Committee", "The envelope".

**Landing** (keep the falling faces)
```
[ falling member photos, full-bleed, settle at bottom ]
          JUST SIDECHATTING
               OSCARS            (wordmark, brand font)
         Be there or be square.
  [ Create account (primary lg) ]
  [ Sign in (secondary lg)      ]
```
Buttons stacked full-width in the bottom third (thumb reach, `designing-for-ios.md › Best practices`), above `safe-area-inset-bottom`. Canvas uses `visualViewport` size and `100dvh`; reduced motion renders faces already settled. "Get Started"/"Login" become "Create account"/"Sign in".

**Sign in / Create account**: NavBar with back to Landing; large title "Sign in"; grouped fields (Email, Password) with icons removed (labels above fields, 52 px fields); "Forgot password?" plain button opens a medium-detent Sheet; primary "Sign in" → "Signing in…". Errors inline under the field: "That email and password don't match. Try again or reset your password." Signup name picker becomes a ListRow that opens a Sheet of the 14 names with photos. "Not getting emails? Ask Rickey or Kadin to reset your account."

**Home**
```
Home                          (large title)        [avatar]
┌ Oscar night ─────────────────────────────┐
│ 12d 04h 31m  (display, tabular)           │
│ Fri, Dec 4 · 3:00 PM                      │
└───────────────────────────────────────────┘
┌ Main ballot            Closes in 3 days ┐
│ ▓▓▓▓▓▓▓░░░░░░░░░░  7 of 30 voted        │
│ (●)(●)(●)(●) 9 of 14 members voted       │
│ [ Continue voting ]                      │
└──────────────────────────────────────────┘
(after release) ┌ The envelope is open ─ photo podium teaser ┐
```
No red "Action required!" banner: an open ballot card with a progress bar and a `warn` "Closes in 5 hours" chip when urgent. All-done state: "You're all set. Results open on Oscar night." with a "Review your votes" plain button. Profile setup becomes a dismissible card on Home ("Add your photo so friends can find you on the ballot · Add photo") that opens the photo Sheet; it never auto-advances.

**Ballots**: large title, SegmentedControl All / Open / Voted / Closed, list of Cards (name `headline`, "7 of 30 voted · Closes Sun 11:59 PM", status chip, chevron). Whole card is the link. Empty per filter: "No closed ballots yet." Remove UPPERCASE badges and "categorie(s)".

**Vote** (pushed screen; tab bar stays per `tab-bars.md › Best practices`: "Make sure the tab bar is visible")
```
‹ Ballots          Main ballot            (compact title after scroll)
[▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░]  ← ProgressStrip (sticky under bar)
Main ballot                   (large title)
Closes in 3 days · 7 of 30 voted
┌ 8 · Best locs ──────────────────────── ✓ ┐
│ Who has the best locs                    │
│ (photo) Anthony                       ○  │
│ (photo) Dakarai                       ◉  │  ← accent fill, on-accent text
│ (photo) Langston                      ○  │
│ + Add an option                          │
└──────────────────────────────────────────┘
╭ 23 left              [ Next unvoted ↓ ] ╮  ← bottom action bar, material-bar, above tab bar
```
Rows 52 px with 40 px photos (fetch `fetchMemberAvatars` alongside the ballot). Voted cards collapse to one row "Best locs · Dakarai ✓ · Change". "Clear" moves into the expanded card as a plain button and shows a Toast "Vote cleared · Undo". Status line per card: "Saving…" then a `success` check; error stays inline: "Couldn't save your vote. Check your connection and tap again." (if closed: "Voting closed at 11:59 PM. Your earlier pick still counts."). Read-only banner: "Voting opens Thu at 9:00 AM" / "Voting is closed". Finished: card "All 30 voted. Nice." with "Back to ballots". Group picker becomes a Sheet with photo checkboxes. **Freeze note:** this screen is rebuilt only after the Nov 26-29 window closes, unless the user decides otherwise (Open question 2).

**Results** (the signature)
```
Results                         (large title)
[ Winners | Leaderboard ]        (segmented)
Fall 2026 · 34 categories
┌ 8 · Best locs ───────────────────────────┐
│        (72 photo, gold ring)              │
│ (56)    Dakarai     (56)                  │
│ Anthony ██ 1 ██    Langston               │
│ ██ 2 ██ ██████████ ██ 3 ██                │
│ Also placed: 4th Jonathan                 │
└───────────────────────────────────────────┘
```
Before release: EmptyState "Results open on Oscar night" with the countdown; committee sees a `warn` chip "Preview · only the committee sees this". **First view after release (the reveal):** each category card starts sealed (an envelope face: card in `surface` with the category name centered in `title-2` and "Tap to open"); tap plays bronze, silver, then gold rising with `spring.podium`, photos dropping into place, a single gold sweep on the 1st block, one Android vibration. "Open all" in the nav bar trailing slot; once opened a card stays open (localStorage). Reduced motion: cross-fade to the finished podium. Results stays dark even in light appearance during the reveal (allowed by `dark-mode.md › Best practices`: "In rare cases, consider using only a dark appearance" for immersive content) (judgment; Open question 4). Laptop: 2-column grid.

**Leaderboard** (was Stats; segment of Results): hero Podium of season leaders (wins as sub), then a grouped list from 4th down: rank (tabular), avatar 32, name, trailing "5 wins · 9 noms · 56%" in `subhead label-2` (stacks under the name at large text sizes). "Show all 14" plain button. "You" card pinned above the list for the signed-in member: three stat tiles (Wins, Nominations, Win rate; `title-1` tabular, `caption-1` label), "Categories you won" rows with a gold "Winner" chip, "Nominated" disclosure row. Empty: "Stats appear after the envelope opens."

**Release** (committee, "The envelope")
```
‹ Profile                                        (always dark)
The envelope
Open the results for everyone?
Every member will see every winner. This can't be undone.
┌ Checks ───────────────────────────────────┐
│ ✓ All categories have a recorded winner   │
│ ✓ Voting is closed                        │
│ ✓ Members never see vote counts           │
└────────────────────────────────────────────┘
[ ███████░░░ Hold to open the envelope ]
Press and hold for 3 seconds · Not yet (plain)
```
Failing checks show `warn` icons with the fix in the row subtitle ("3 categories need a winner · Go to tally"). Success: "The envelope is open" with the season's gold podium tease and "See results". Raw error messages map to "Couldn't open the envelope. Check your connection and hold again."

**Committee pages** (Manage ballots, Ballot admin and Tally, Member names, Ballot builder): standard pushed screens with back to Profile; grouped lists; status as chips; actions as a bottom action bar (primary) plus rows (secondary); confirmations through ConfirmSheet with consequence titles ("Close voting for Main ballot?" / "Close voting"). CategoryModal and BulkImport become large-detent Sheets with Cancel/Save. Tally per-category rows show podium previews in `card` variant. Completion list shows member avatars with "12 of 30" trailing and an AvatarStack summary at top.

**Profile**
```
Profile                                   (large title)
(96 photo)  Rickey  · rickey@…    [Edit]
┌ Season ──────────────────────────────┐
│ Wins 3 · Nominations 7 · Win rate 43% │   (real data or omitted)
└───────────────────────────────────────┘
┌ Account ─ Edit profile › · Change photo › ┐
┌ Committee ─ New ballot › Manage ballots › Tally › Members › The envelope › Event dates › ┐
┌ Labs ─ Joke generator › ┐
[ Sign out ] (destructive plain, in its own group)
```
Remove the dead "Settings" row and the "--" tiles. Sign out asks nothing (expected result, per `feedback.md › Best practices`: don't warn when data loss is the expected result).

## 6. PWA and native-feel checklist

- [ ] `index.html`: `<title>JSC Oscars</title>`, `viewport-fit=cover`, `<meta name="theme-color" content="#F2F2F7" media="(prefers-color-scheme: light)">` and `#0B0B0F` for dark, `<meta name="color-scheme" content="light dark">`, `<link rel="manifest">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` (180x180, opaque), favicon 32 png + svg.
- [ ] `public/manifest.webmanifest`: `name` "JSC Oscars", `short_name` "Oscars", `start_url` "/app", `scope` "/", `display` "standalone", `background_color` "#0B0B0F", `theme_color` "#0B0B0F", icons 192, 512 and 512 `maskable`.
- [ ] `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` and `mobile-web-app-capable`; content pads with `safe-area-inset-top`.
- [ ] App icon (judgment; `app-icons.md` not reviewed here): gold statuette silhouette on near-black, no text, no wordmark.
- [ ] Launch: solid `#0B0B0F` only, no logo or text (`launching.md › Launch screens`: "If your app… displays a solid color… create a launch screen that displays only that solid color"); skip per-device `apple-touch-startup-image` unless the white flash shows in testing.
- [ ] Standalone mode has no browser back button on iOS: every pushed screen has a NavBar back (section 4). No custom edge-swipe-back (judgment).
- [ ] `-webkit-tap-highlight-color: transparent` on `html`, with real pressed states (`buttons.md › Best practices`).
- [ ] `user-select: none` and `-webkit-touch-callout: none` on tab bar, buttons, ProgressStrip, HoldButton only; content stays selectable.
- [ ] `100dvh` everywhere; no `100vh`/`h-screen`.
- [ ] Overscroll: keep the native bounce on the page; `overscroll-behavior: contain` on sheets and inner scrollers. No custom pull-to-refresh; refetch on `visibilitychange` and window focus (`progress-indicators.md › Mobile`: "Perform automatic content updates").
- [ ] Zoom: never disable. Inputs ≥ 16 px.
- [ ] Offline shell: precache built assets with a small service worker (`vite-plugin-pwa`, `generateSW`, navigate fallback to `index.html`); network-only for Supabase. Data caching is the later offline-cache spec.
- [ ] Restore state: Vote page restores scroll to the last active category (`launching.md › Best practices`: "Restore the previous state").

## 7. Build order (Sonnet-sized tasks)

Each task: one branch commit, `npm run build` and `npm test` green, then the browser check at 375x812 and 1280x800, dark and light. Stop points are user review with screenshots.

1. **Tokens and base.** `client/index.html`, `client/src/index.css` (`@theme inline` tokens from 3.1-3.6, `@utility material-*`, base: font stack, Dynamic Type `@supports`, focus ring, tap highlight, dvh), `client/src/main.tsx` (`MotionConfig`), `client/src/ui/motion.ts`. Delete Google Fonts imports and the global `button:active` scale. Verify: every page renders in system font, no layout breakage, focus ring visible on Tab.
2. **AppShell.** `client/src/ui/{AppShell,NavBar,LargeTitle,TabBar,Sidebar}.tsx`; `App.tsx` nested `/app` layout route with one `UserDataProvider`; tabs Home, Ballots, Results, Profile; `/app/stats` redirects to `/app/results?view=leaderboard`. Remove `NavigationBar`/`NavigationTabs` from all pages. Verify: safe areas on iPhone (Safari and installed), tab bar floats with blur over a scrolled list, sidebar at 1024+, back buttons on pushed screens. **Stop point 1:** screenshots of Home, Ballots, Vote, Profile in the new shell.
3. **Primitives.** `client/src/ui/{Button,ListRow,GroupedSection,Card,Chip,Avatar,AvatarStack,SegmentedControl,Skeleton,EmptyState,ErrorState,Toast}.tsx` plus a dev-only `/app/_ui` gallery route. Verify: each in all states, both appearances, 200% text size.
4. **Sheet family.** `client/src/ui/{Sheet,ConfirmSheet}.tsx`; migrate `Modal.tsx` users, `CategoryModal`, `BulkImportPanel`, forgot-password, signup modal; ProfileSetup becomes Home card + photo Sheet (no timers); replace all `window.confirm`. Verify: drag, detents, Escape, focus trap and return, keyboard open on iOS. Delete `Modal.tsx`, `FullScreenLoader.tsx`, `DeleteConfirmationModal.tsx` when unused.
5. **Home and Ballots.** `HomePage.tsx`, `BallotsPage.tsx`, `BallotCard.tsx`, `PendingBallots.tsx` (becomes `OpenBallotCard`), `Countdown.tsx`. Verify: skeleton then content, empty and error states, countdown digits do not jitter.
6. **Results, Leaderboard and the reveal.** `ResultsPage.tsx`, `StatsPage.tsx` (folded into a Leaderboard view), `Podium.tsx`, new `ui/RevealCard.tsx`, `ReleasePage.tsx` restyle with `HoldButton`. Verify: reveal plays, skips on tap, "Open all", reduced motion cross-fade, Android vibration, podium colors exact. **Stop point 2:** screen recording of the reveal on a phone.
7. **Vote.** `VotePage.tsx`, `vote/CategoryVoteCard.tsx`, `vote/GroupPicker.tsx` (Sheet), `ui/ProgressStrip.tsx`, Jump sheet, Toast undo for Clear. Keep all save-queue logic and tests untouched. Verify: 40 categories, rapid taps, offline error copy, scroll restore. Not merged during Nov 26-29. **Stop point 3.**
8. **Auth, Landing, Profile.** `LandingPage.tsx`, `FallingProfileBallPhysics.tsx` (dvh, reduced motion), `LoginPage.tsx`, `SignupPage.tsx`, `ResetPassword.tsx`, `ComfirmedEmailPage.tsx`, `ProfilePage.tsx`, `EditProfileModal.tsx`, `OscarLogo.tsx`. Verify: autofill works, errors inline, no fake data.
9. **Committee.** `committee/*` pages, `components/committee/*`, `ballot-builder/*`. Verify: every confirm is a ConfirmSheet, every error is mapped copy, tally readable on phone.
10. **PWA and QA.** Manifest, icons, service worker, section 6 checklist; axe scan per route; Lighthouse PWA and accessibility; real iPhone (Safari and installed) and an Android phone; Reduce Motion, Increase Contrast, 200% text. **Stop point 4:** final screenshot set.

Risks:
- **`backdrop-filter` cost** on low-end Android and older iPhones, worst over the Landing canvas and during sheet drags. Mitigation: glass only on the tab bar, scrolled nav bar, bottom action bar, sheets and toasts; no blur on scrims; drop blur to 12 px while a sheet is being dragged; no glass on Landing (`liquid-glass.md › Tauri and Electron`: "`backdrop-filter` over animating content is expensive").
- **Safari quirks:** needs `-webkit-backdrop-filter` (check Tailwind v4 output; add in the `@utility` if missing); blur with `border-radius` plus `overflow: hidden` can bleed square corners (put the blur on the rounded element itself); `position: fixed` bars shift when the keyboard opens (hide the tab bar while an input is focused on phone); `env()` is 0 without `viewport-fit=cover`; `prefers-reduced-transparency` unsupported.
- **Tailwind v4:** use `@theme inline` so utilities resolve the CSS variables at runtime; `--text-*--line-height`/`--letter-spacing`/`--font-weight` sub-keys; `@utility` for materials (not `@layer components`); the `dark:` variant follows `prefers-color-scheme` by default, which is what we want; avoid arbitrary hex classes in new code (lint rule or grep in review).
- **Schedule:** voting runs Nov 26-29 and the ceremony is Dec 4. The voting-loop spec deferred the redesign until after Dec 4; this plan needs the user's call (Open question 2).

## 8. My calls and open questions

### My calls

1. Direction: A's shell + B's content discipline + C's color-blocking only in the reveal (section 2).
2. Glass only on the functional layer; cards are opaque (`liquid-glass.md › The two layers`).
3. Primary buttons are monochrome (inverse label fill); champagne accent only for selection, progress, focus and links; gold is only for winning.
4. System font for all UI; Century Gothic only in the wordmark; Poppins and WindSong removed.
5. Four tabs: Home, Ballots, Results, Profile; Stats becomes Results › Leaderboard; committee tools live in Profile (sidebar group on laptop).
6. Sentence case everywhere, "Sign in / Sign out / Create account".
7. No auto-advancing or auto-dismissing UI anywhere.
8. Keep `lucide-react`; no SF Symbols imitation.
9. Native page bounce kept; no custom pull-to-refresh; refetch on focus.
10. No haptics on iOS; three vibration events on Android only.

### Open questions for the user (ranked, each with a default)

1. **Direction:** approve the A-based hybrid (dark-first glass shell, opaque cards, faces everywhere, bold only at the reveal)? Default: yes.
2. **Timing:** ship tasks 1-6 (shell, primitives, sheets, Home, Results reveal) before Dec 4 and hold the Vote rebuild (task 7) until after the Nov 26-29 window, or do the whole redesign after Dec 4 as the voting-loop spec planned? Default: tasks 1-6 before Dec 3 only if Stop point 2 is approved by Dec 1; Vote untouched until voting closes.
3. **Tabs:** fold Stats into Results as a Leaderboard segment and keep Profile as the fourth tab? Default: yes.
4. **Light mode:** follow the system appearance everywhere, with Results reveal and the Release page always dark? Default: yes.
5. **The reveal:** sealed envelope cards that members tap open on first view, with "Open all"? Default: yes, remembered per device.
6. **Accent:** champagne (`#E6C77A` dark / `#8A6516` light) for selection and focus, or fully monochrome with gold reserved for podiums? Default: champagne.
7. **App icon:** gold statuette silhouette on near-black, no text? Default: yes; the user supplies or approves the artwork.
8. **Labs:** keep the Joke generator under a "Labs" group in Profile? Default: keep, restyled as a plain row.
