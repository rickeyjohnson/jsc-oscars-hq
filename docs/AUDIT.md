# Audit findings (Task 19)

Findings NOT fixed, highest severity first. Fixed in the same pass: `h-screen` on three fixed overlays, an unlabeled click scrim, informational `text-label-3` (Login, Sidebar, nominee detail) moved to `label-2`, titles for every route (`lib/routeTitle.ts`), contrast table extended to every pair in use, new `audit.test.ts`. Not verified here (needs a device or Lighthouse): iOS safe areas, real-device blur performance, 200% text, VoiceOver order.

## High
1. **Legacy modals reachable from You (Profile).** `ManageOscarsModal`, `EditOscarEvent`, `DeleteConfirmationModal`, `Modal`, `JokeGeneratorModal`, `StatusBadge`, `FullScreenLoader`, `RequireCommittee` still use raw palette classes (`amber-*`, `zinc-*`, `green-400`...), `text-xs`, and `Modal` has no `role="dialog"`, `aria-modal`, focus trap or Esc. They are not in the `tokensOnly` MIGRATED list. Fix: move onto `Sheet`/`ConfirmSheet` + tokens, or delete the Manage Oscars flow if the committee pages replaced it.
2. **`CategoryVoteCard` caption uses `text-label-3`** ("YOU'RE IN THESE...", about 3.5:1, informational). Change to `label-2`. Left alone because the vote screens were being edited concurrently.
3. **Single JS chunk, 835 KB (254 KB gzip).** Fine on Wi-Fi, slow on first load over weak cell. Route-level `lazy()` for committee pages, the builder and Results would cut the member first load noticeably.

## Medium
4. **`Sheet` resize handle is 24 px tall** (`h-6 w-16`), under the 44 px target. It is a secondary drag affordance, but keyboard and switch users hit it. Give it a 44 px hit area (padding) while keeping the visual pill small. Not touched (Sheet was being edited concurrently).
5. **`danger` text on `surface-2` is 4.12:1** (fields, option rows). Currently unused there; pinned in `DECORATIVE_PAIRS` as a trap. Error text must sit on `bg`/`surface`/`elevated`.
6. **Placeholders use `label-3` (3.0 to 3.7:1)** in TextField, builder fields, bulk import and the write-in input. Placeholders are not required to meet 4.5 when a label exists, but a visible label is not present on all of them (relies on `aria-label`). Consider `label-2` for placeholders.
7. **Dead legacy components** (no importers): `Announcements`, `CreateOscarsEvent`, `Locked`, `MakeYourOwnCategories`, `MusicPlaylistSection`, `NavigationBar`, `NavigationTabs`, `ProfilePageButton`, `WithAuth`, and `IndividualDetailsModal` (excluded from the build). Delete them; they only add audit noise.
8. **Legacy files not under `tokensOnly`** (the list above plus `Countdown`, `Podium` in `components/`, `VoteBanner`): not verified token-clean.
9. **Service worker is untested in a real browser here.** Logic is unit tested and `sw.js` parses after stamping, but install, update-on-navigate and the "not mid-vote" swap need one manual pass on the deployed preview (see TESTING.md, PWA section).

## Low
10. `BulkImportPanel` textarea uses `focus:ring` plus `outline-none`. It still shows a ring, but the global two-tone `:focus-visible` style is bypassed.
11. Test output contains expected error-path `console.error` lines (login, names, upload, results retry) and jsdom "Not implemented: scrollTo / navigation" notices. No React warnings. Could be silenced with a console spy in the tests that assert those paths.
12. Icons render the tagline and wordmark in Century Gothic Regular (the Light TTF is not in the repo), so the icon is slightly heavier than the in-app wordmark. Cosmetic; the licensing note in PRE-PUBLISH.md applies to the embedded glyphs too.
13. `apple-touch-icon.png` is an RGBA PNG with fully opaque pixels. iOS renders it correctly; flatten to RGB if a validator complains.
14. No iOS splash images; a white flash may show on cold launch of the home-screen app. Only add them if it shows on a real iPhone.
15. `og:image` is a relative path; crawlers want an absolute URL. Set it once the production domain is known (`VITE_SITE_URL`), otherwise link previews show no image.
