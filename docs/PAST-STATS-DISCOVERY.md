# Past stats import: discovery (read-only)

Generated 2026-11-21. Nothing in the repo (other than this file) or any database was changed. Transcribed CSVs live in `/private/tmp/claude-501/-Users-rickeyjohnson-repos-jsc-oscars-hq/4e83cadc-0981-4ddf-abab-44fe11f7ff37/scratchpad/csv/img11.csv` ... `img15.csv`.

## 1. What is in the zips

Both zips contain ONLY numbered `.webp` images (page exports of the "Just Sidechatting Oscars" slide decks). There are no forms exports, no tiebreaker files, no .pptx/.xlsx/.csv, no stats table slides, and no speaker notes. Text was recovered with macOS Vision OCR (python-pptx/openpyxl/PIL are not installed, and no .pptx exists anyway).

| zip | files | content |
|---|---|---|
| `OSCARS FALL '23.zip` | 80 x .webp (1-80) | Slide 1 title, 2 rules (<1.5 min speech), then ~25 categories as category slide, nominee photo slide(s), winner slide ("Name" + award caption). Slide 78 is a tie pie chart (36.4% / 36.4% / 9.1% x3 = 11 voters) for Hairiest Cock; slide 80 "End". No date on title slide. |
| `OSCARS FALL '24.zip` | 84 x .webp (1-84) | Title says "SATURDAY, DEC 7 @ 10am" (Dec 7 2024 is a Saturday: confirms Fall 2024). Rules (<1 min speech, no interruptions), category list (slides 4-5), ~27 categories (category, 3 nominee photos, winner). Includes group awards (Underrated Duo, 1st Team All-Funny, 1st Team All-Goon). Slide 84 "End". |

Fall '23 winners (on screen): Duo Dakarai+Rickey; Trio Dakarai/Jonathan/Rickey; Mr Funny Anthony; Spades Nick; Life of Party Dakarai; Invisible Man TJ; Blind Leading Jonathan; Keeper of Gate Rickey; Scroller Jonathan; Nomad Justin; Alcoholic Nick; Human Vulture Micah; Lurker Evan; Stand on Business Nick; Sidechatter Rickey; Social Butterfly Jonathan; Emptiest Pockets Langston; Give Him the Aux Kadin; Grinch Evan; Cowgirl Micah; Aggie Pride Dakarai; Down Bad Jonathan; "I'm from Atlanta" Evan; Jaggy Dakarai; Hairiest (tie) Langston. Some slides are hard to OCR (Best Duo/Trio nominees), so this is a close but not guaranteed tally. John Sampson and DeMichael do not appear at all.

Fall '24 winners (on screen): A&T Ass JSamp; Yes Massa JSamp; "The Langston" Langston; Freaky Frog Micah; Locitician pt2 Jonathan; Cuck Jonathan; Hawk Tuah Rickey; Honeybun Micah; How Do You Want Me To React Dakarai; Jim Crow Micah; Kadin Get The Car Micah; Colonizer Rickey; Chill Guy Justin; Underrated Duo Evan+Kadin; Qatar Langston; N-word award Jonathan; Craziest Comment Rickey; Sophie Rain Nick; 1st Team All-Funny (Anthony, Evan, Dakarai, Jonathan, Kadin shown); Assist Leader Anthony; Funny Guy Rickey (+Anthony slide); Unfunny Guy Rickey; 1st Team All-Goon (Rickey, Micah, Evan, Jonathan, JSamp); Gooner Jonathan; Dumbest Stupidest JSamp; Participation TJ. DeMichael does not appear.

## 2. Image to semester mapping

The images are the user's pasted screenshots (`.../images/11.png` to `15.png`). The zips hold no stats tables, so the mapping rests on indirect evidence only. Fall '23 style evidence: the zip decks are plain black Canva-like slides; images 11/12 use the same black background with script-font headers.

| image | columns / style | members | semester | confidence |
|---|---|---|---|---|
| 11 | Names / Nominations / Wins / Percentage, script header, no footnote | 12, "Jonathan Madden", no DeMichael | probable Fall '23 (earliest style, matches Canva deck look, no DeMichael, no footnote) BUT see conflict below | low-medium |
| 12 | identical numbers to 11, wider crop | same | same as 11 (exact duplicate, all 12 rows equal) | certain duplicate |
| 13 | Name / Wins / Noms / Win%, Century-Gothic style, footnote cut off at bottom, Nick row partly cut off | 12, "Jonathan Madden", no DeMichael | unknown: probably the semester between 11 and 14 (Spring '24 or Fall '24) | low |
| 14 | NAME / WINS / NOMS / WIN %, marker font, full footnote, Dakarai row highlighted | 13 incl. DeMichael, "Jonathan" | later semester than 11/13 (DeMichael exists) | low-medium |
| 15 | same style as 14, DeMichael wins+noms and TJ win% highlighted | 13 incl. DeMichael | later semester than 11/13; adjacent to 14 | low-medium |

Conflicts that stop me confirming Fall '23 / Fall '24:
- Image 11 has John Sampson (3 noms, 2 wins) but John Sampson is not in the Fall '23 deck at all, and Jonathan has only 2 wins there while the deck shows ~5 on-screen Jonathan wins. Image 11 therefore does not look like the Fall '23 ceremony; it may be Spring '24 (JS newly joined, only 3 noms). Nick (4 wins) and Rickey (4 wins) do match Fall '23 reasonably.
- Fall '24 deck has no DeMichael, yet images 14 and 15 both include him with 16 noms. If DeMichael only joined after Fall '24, then 14 and 15 are Spring '25 / Fall '25 and image 13 (no DeMichael, John Sampson 19 noms/7 wins) is the best candidate for Fall '24. But image 13 Nick has 0 wins while the Fall '24 deck shows Nick winning Sophie Rain, and its Jonathan has 2 wins vs ~6 on-screen. The deck only reflects what was on screen (top 3 + live-voting categories excluded), so some drift is expected, but the correlation was weak.
- Correlation of on-screen winner counts vs table wins (Pearson, rough): Fall '23 deck vs 11: -0.18, vs 13: -0.09, vs 14: 0.43, vs 15: 0.14. Fall '24 deck vs 11: -0.30, vs 13: 0.42, vs 14: 0.39, vs 15: -0.04. Nothing is strong. Do not rely on this: it is a hint only.
- Totals: image 11 total wins 41, noms 116; image 13 total wins 41, noms 157; image 14 total wins 44, noms 190; image 15 total wins 35, noms 126.
- Fall '23 deck: 11 voters (pie 36.4% = 4/11). Image 11 sum of noms 116 with ~25 categories fits "top 3 + group categories", plausible.

Best guess for the user to confirm: 11/12 = Fall '23 (or the first semester after), 13 = Fall '24, 14 and 15 = two later semesters (Spring '25, Fall '25, or Spring '26). The user must confirm.

## 3. Transcribed tables

Image 11 (Names / Nominations / Wins / Percentage). Image 12 is an identical table.
| member | noms | wins | win_pct |
|---|---|---|---|
| Anthony | 9 | 4 | 44.44% |
| Dakarai | 17 | 4 | 23.53% |
| Evan | 12 | 4 | 33.33% |
| Jonathan Madden | 12 | 2 | 16.67% |
| John Sampson | 3 | 2 | 66.66% |
| Justin | 9 | 4 | 44.44% |
| Kadin | 7 | 3 | 42.86% |
| Langston | 8 | 2 | 25% |
| Micah | 14 | 4 | 28.57% |
| Nick | 8 | 4 | 50% |
| Rickey | 9 | 4 | 44.44% |
| TJ | 8 | 4 | 50% |

Image 13 (Name / Wins / Noms / Win%). NOTE: crop cuts off below Nick; rows may be missing (e.g. DeMichael, TJ is present). Footnote is cut off.
| member | noms | wins | win_pct |
|---|---|---|---|
| Micah | 20 | 6 | 30.00% |
| John Sampson | 19 | 7 | 36.84% |
| Anthony | 13 | 6 | 46.15% |
| Rickey | 20 | 4 | 20.00% |
| Justin | 6 | 3 | 50.00% |
| Dakarai | 14 | 4 | 28.57% |
| TJ | 9 | 2 | 22.22% |
| Jonathan Madden | 13 | 2 | 15.38% |
| Evan | 14 | 3 | 21.43% |
| Kadin | 10 | 2 | 20.00% |
| Langston | 15 | 2 | 13.33% |
| Nick | 4 | 0 | 0.00% |

Image 14 (Dakarai highlighted: 8 wins, 21 noms, 38.10%)
| member | noms | wins | win_pct |
|---|---|---|---|
| Anthony | 17 | 3 | 17.65% |
| Dakarai | 21 | 8 | 38.10% |
| DeMichael | 16 | 4 | 25.00% |
| Evan | 11 | 1 | 9.09% |
| John Sampson | 18 | 6 | 33.33% |
| Jonathan | 16 | 4 | 25.00% |
| Justin | 6 | 1 | 16.67% |
| Kadin | 16 | 4 | 25.00% |
| Langston | 10 | 1 | 10.00% |
| Micah | 19 | 6 | 31.58% |
| Nick | 5 | 1 | 20.00% |
| Rickey | 16 | 3 | 18.75% |
| TJ | 7 | 2 | 28.57% |

Image 15 (DeMichael wins/noms and TJ win% highlighted)
| member | noms | wins | win_pct |
|---|---|---|---|
| Anthony | 11 | 1 | 9.09% |
| Dakarai | 14 | 3 | 21.43% |
| DeMichael | 16 | 8 | 50.00% |
| Evan | 11 | 1 | 9.09% |
| John Sampson | 10 | 2 | 20.00% |
| Jonathan | 10 | 2 | 20.00% |
| Justin | 5 | 1 | 20.00% |
| Kadin | 11 | 1 | 9.09% |
| Langston | 10 | 2 | 20.00% |
| Micah | 10 | 2 | 20.00% |
| Nick | 6 | 2 | 33.33% |
| Rickey | 12 | 4 | 33.33% |
| TJ | 10 | 6 | 60.00% |

Footnote on 14/15 (and cut off on 13): stats are calculated by nominations = top 3 in votes, NOT what is on the screen, so if you were not on screen you might have tied with another nomination and a random one was chosen on screen. LIVE VOTING CATEGORIES NOT REPRESENTED IN THE STATS. Group votes are counted in the wins and nominations stats.

## 4. Verification

Every row: win_pct vs wins/noms checked by script. No row is off by more than 0.02 pct points. Note John Sampson in image 11/12 shows 66.66% (truncated; exact 66.67%), so the source truncates rather than rounds in at least that cell. All other rows are consistent. No transcription errors were detected at this level (a swapped digit that still matches the percentage cannot be detected this way).

Anomalies (not arithmetic errors):
- Name variants: "Jonathan Madden" in 11/12/13, "Jonathan" in 14/15. "DeMichael" in 14/15 only (app seed uses "Demichael"). Image 15 TJ 60% highlighted and Nick 0/4 in 13 are real values, not errors.
- Image 13: the bottom is cropped; only 12 rows are visible and the last row (Nick) is half cut off.
- Image 14 vs 15 DeMichael: 4/16 vs 8/16 (same noms count, double the wins): possible but worth confirming they are different semesters and not a copy error. Evan 11 noms in both 14 and 15 with 1 win in both (also possible coincidence).
- Image 15 has the same noms for Anthony, Evan and Kadin (11) and equal win%: fine.
- Rico (14th app member) appears in none of the tables.

## 5. Name mapping to the app's 14 members

Members migration (`supabase/migrations/20261120000100_members_and_roles.sql` and the test seed) lists: Anthony, Dakarai, Demichael, Micah, Rico, Nick, Rickey, Kadin, Langston, Jonathan, John Sampson, Evan, TJ, Justin.

| table name | app member |
|---|---|
| Anthony, Dakarai, Evan, Justin, Kadin, Langston, Micah, Nick, Rickey, TJ, John Sampson | same name |
| Jonathan Madden / Jonathan | Jonathan |
| DeMichael | Demichael (case differs) |
| (none) | Rico: no past stats in any of the 5 tables; either new member or listed under another name/nickname. Ask the user. |

## 6. Missing / ambiguous

- No table is labelled with a semester. Confirm the semester of each of the 5 images.
- Image 13 is cropped: confirm whether more rows exist below Nick.
- Spring semesters, Fall '25, Spring '26 (and anything before Fall '23) are not in the zips. The user pasted 4 distinct tables (11=12), but the number of semesters they represent is unconfirmed.
- Whether Fall '24 / Fall '23 stats tables exist at all as images: the zips only have the ceremony slides, no stats slide.
- The 13-image set may include a combined/lifetime table; none of them looks cumulative (noms are too small), but confirm.
- Rico's history, if any.

## 7. Proposed table design

```sql
create table public.past_stats (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id),
  season_label text not null,          -- e.g. 'Fall 2023' (free text, not a FK to seasons)
  noms        int  not null check (noms >= 0),
  wins        int  not null check (wins >= 0 and wins <= noms),
  source      text,                    -- 'screenshot', 'slides', 'manual'
  unique (member_id, season_label)
);
alter table public.past_stats enable row level security; -- read for all members, write for committee/service role only
-- lifetime view: sum(noms), sum(wins), wins/noms per member, plus per-season rows.
```

Keep it separate from `public.seasons`/`results` (those drive the live voting loop). Store win% as derived, never as input (sources truncate/round inconsistently). Include a nullable `notes` column for caveats (live-voting categories excluded, ties on screen). Seed with an idempotent script under `supabase/manual/` so the user can re-run it.

## 8. Can the zips give per-category won-categories later?

Partially. The slide decks give, per category, the on-screen nominees (3 photos) and the winner, readable via OCR/viewing the slides (about 25 + 27 categories). That is enough to build a `past_wins(member_id, season_label, category_name)` list for Fall '23 and Fall '24 for the on-screen winners (needs a human check because OCR and ties/group awards are noisy). It is NOT enough to match the stats tables because: (a) there are no forms exports or tiebreaker data in the zips (no vote counts per nominee, only the single Fall '23 tie pie chart), (b) stats nominations are top 3 by votes, not what is on screen, and (c) live-voting categories are excluded from the stats but are on the slides. To get won-categories for the other semesters (Spring '24, Spring '25, Fall '25, ...), the user needs to supply those decks or forms results. Proposed: `past_wins(member_id, season_label, category text, place smallint)` filled from slides, kept independent of `past_stats` totals.


---

# UPDATE: user answers and manual slide counts

## 9. Confirmed semesters (from the user)

| image | semester |
|---|---|
| 11 / 12 (duplicates) | Spring 2024 |
| 13 | Spring 2025 |
| 14 | Fall 2025 |
| 15 | Spring 2026 |

This replaces the guesses in section 2. Name facts from the user: Jonathan = Jon = Jonathan Madden; JSamp = John = John Sampson (not in Fall '23); DeMichael was not a member in earlier semesters (his 4/16 in Fall 25 and 8/16 in Spring 26 are both correct); there is no Rico in any past table. The app's exact spelling is `Demichael` (lowercase m, per `supabase/migrations/20261120000100_members_and_roles.sql`), so past-stats rows use `Demichael`, `Jonathan`, `John Sampson`.

All four tables are normalized in one CSV: `/private/tmp/claude-501/-Users-rickeyjohnson-repos-jsc-oscars-hq/4e83cadc-0981-4ddf-abab-44fe11f7ff37/scratchpad/csv/past_stats_all.csv` (columns season_label, member, noms, wins, win_pct, source; also contains the two slide-counted semesters, labelled "on-screen count").

## 10. Method for Fall '23 and Fall '24 counts

Counted by hand (OCR plus viewing slides) from the slide images. Per category: nominees = the people shown on the nominee slide, winner = the person on the winner slide. noms = categories where the member (or a group containing them) is shown as a nominee; wins = categories won; group wins count for each member. Competitive categories only. Files (scratchpad, `.../scratchpad/csv/`): `fall23_categories.csv`, `fall24_categories.csv` (columns category, nominee, member(s), is_winner, slide_file(s), notes, ambiguity) and `fall23_counts.csv`, `fall24_counts.csv`. Counting script: `.../scratchpad/tools/count.py`.

Important limit: the slides show at most 3 nominees (top 3 on screen). The real stats use the top 3 by votes with ties picked at random for the screen, so a person tied for a nom could be missing here. The user-confirmed tables (Spring '24 onward) show far more noms per person so noms here are a LOWER BOUND and wins should be close. Also live-voting categories are not in the stats and the slides do not mark which categories were live, so none were removed (see ambiguities).

## 11. Fall 2023 (25 categories, 11 voters per the tie pie chart)

| # | category | nominees on screen | winner(s) | slides | ambiguity |
|---|---|---|---|---|---|
| 1 | Best Duo | Anthony & Kadin, Jonathan & Rickey, Dakarai & Rickey | Dakarai & Rickey | 4,5,6 |  |
| 2 | Best Trio | Anthony, Kadin & Dakarai, Anthony, Dakarai & Rickey, Jonathan, Dakarai & Rickey | Jonathan, Dakarai & Rickey | 7,8,9 | slide 8 caption 'Anthony, Kadin, & Dakarai' is partly cropped but legible |
| 3 | Mr. Funny Guy | Anthony, Evan, Jonathan | Anthony | 10,11,12 |  |
| 4 | Best Spades Player | Micah, Nick, Rickey | Nick | 13,14,15 |  |
| 5 | Life of the Party | Rickey, Anthony, Dakarai | Dakarai | 16,17,18 | nominee slide 17 is captioned 'Best Spades Player' (copy-paste label error); nominees assumed for Life of the Party because it follows slide 16 |
| 6 | The Invisible Man | Justin, Nick, TJ | TJ | 19,20,21 |  |
| 7 | The Blind Leading the Blind | Dakarai, Jonathan | Jonathan | 22,23,24 | only 2 nominees on screen; top-3 by votes may have had a third |
| 8 | The Keeper of the Gate | Langston, Dakarai, Rickey | Rickey | 25,26,27 |  |
| 9 | The Scroller | Anthony, Jonathan, Dakarai | Jonathan | 28,29,30 |  |
| 10 | The Nomad | Justin, Kadin, Dakarai | Justin | 31,32,33 |  |
| 11 | The Alcoholic | Dakarai, Nick | Nick | 34,35,36 | only 2 nominees on screen |
| 12 | Human Vulture | Rickey, Langston, Micah | Micah | 37,38,39 |  |
| 13 | Lurker | Justin, Evan, TJ | Evan | 40,41,42 |  |
| 14 | Most Likely to Stand on Business | Nick, Justin, Evan | Nick | 43,44,45 |  |
| 15 | Best Sidechatter | Jonathan, Rickey, Anthony | Rickey | 46,47,48 |  |
| 16 | Social Butterfly | Rickey, Justin, Jonathan | Jonathan | 49,50,51 |  |
| 17 | Emptiest Pockets | Langston, Evan | Langston | 52,53,54 | only 2 nominees on screen |
| 18 | Give Him the Aux | Kadin, Dakarai, Rickey | Kadin | 55,56,57 |  |
| 19 | Grinch | Evan, Micah | Evan | 58,59,60 | only 2 nominees on screen |
| 20 | Cowgirl | Micah, Rickey, Dakarai | Micah | 61,62,63 |  |
| 21 | Aggie "Pride" | Anthony, Dakarai, Jonathan | Dakarai | 64,65,66 |  |
| 22 | Down Bad | Jonathan (winner only, nominees not shown) | Jonathan (winner only, nominees not shown) | 67,68,69 | nominees not shown: only the winner is known, so only Jonathan gets a nom+win; other nominees unknown (under-count of noms) |
| 23 | "I'm from Atlanta" | Dakarai, Micah, Evan | Evan | 70,71,72 |  |
| 24 | Sassy (slide title 'Jaggy') | Dakarai, Evan, Micah | Dakarai | 73,74,75 | category list says 'Sassy', slides say 'Jaggy' |
| 25 | Hairiest Cock | Jonathan, Dakarai, Langston | Langston | 76,77,78,79 | tie: another nominee tied with Langston; Langston is the on-screen pick |

Counts (on-screen):
| member | noms | wins | win_pct |
|---|---|---|---|
| Anthony | 8 | 1 | 12.50% |
| Dakarai | 16 | 5 | 31.25% |
| Evan | 7 | 3 | 42.86% |
| Jonathan | 10 | 5 | 50.00% |
| Justin | 5 | 1 | 20.00% |
| Kadin | 4 | 1 | 25.00% |
| Langston | 4 | 2 | 50.00% |
| Micah | 6 | 2 | 33.33% |
| Nick | 4 | 3 | 75.00% |
| Rickey | 12 | 4 | 33.33% |
| TJ | 2 | 1 | 50.00% |

Sanity check: 25 categories, 28 wins counted = 23 single-winner categories + Best Duo (2 members) + Best Trio (3 members) = 23 + 2 + 3 = 28. Matches. Total nominations counted 78. Members with no slide noms: Demichael (not a member), John Sampson (not a member), Rico (none).

Ambiguities Fall '23 (6):
1. Down Bad: no nominee slide ("unanimous vote*, excluded the winner who couldn't vote for themself"); only Jonathan counted (nom+win), other nominees unknown, so everyone else's noms are an under-count by one for this category.
2. Life of the Party nominee slide 17 carries the caption "Best Spades Player" (label copy-paste); nominees Rickey, Anthony, Dakarai assumed for Life of the Party.
3. Hairiest Cock: tie pie chart (36.4% x2); winner shown Langston; the other tied nominee is not identifiable, so it is a tie broken on screen.
4. Four categories show only 2 nominees (Blind Leading the Blind, The Alcoholic, Emptiest Pockets, Grinch): top-3 by votes may have had a third nominee not shown.
5. Sassy vs "Jaggy": category list says Sassy, slides say Jaggy; treated as one category.
6. Live-voting categories: the slides do not say which categories were live; none excluded.

## 12. Fall 2024 (23 competitive + 3 special categories; Dec 7 2024)

| # | category | nominees on screen | winner(s) | slides | ambiguity |
|---|---|---|---|---|---|
| 1 | A&T's Ass | TJ, Micah, John Sampson | John Sampson | 6,7,8 |  |
| 2 | Yes Massa | John Sampson, Kadin, Micah | John Sampson | 9,10,11 |  |
| 3 | The "Langston" | Jonathan, Langston, Nick | Langston | 12,13,14 |  |
| 4 | Freaky Frog | Evan, Micah | Micah | 15,16,17 | only 2 on screen |
| 5 | Locitician Part 2 | Jonathan, Justin | Jonathan | 18,19,20 | only 2 on screen |
| 6 | Cuck | Jonathan, John Sampson, Langston | Jonathan | 21,22,23 |  |
| 7 | Hawk Tuah Award | Rickey, Evan, Jonathan | Rickey | 24,25,26 | Evan caption is hidden under the award text; identified from his photo (blue shirt, same photo as other Evan slides) |
| 8 | Honeybun Award | Justin, Micah, TJ | Micah | 27,28,29 | middle nominee is Micah's photo but captioned 'Justin'; winner slide says Micah; counted as Micah |
| 9 | How Do You Want Me To React Award | Anthony, Rickey, Dakarai | Dakarai | 30,31,32,33 | Anthony = Huggy-Wuggy costume photo (caption partly covered); winner slide shown twice (32, 33) |
| 10 | Jim Crow Award | Anthony, Micah, Rickey | Micah | 34,35,36 |  |
| 11 | Kadin Get The Car Award | Micah, Langston, Rickey | Micah | 37,38,39 |  |
| 12 | Colonizer Award | Rickey, Dakarai, Langston | Rickey | 40,41,42 |  |
| 13 | Chill Guy | Langston, Justin, Nick | Justin | 43,44,45 |  |
| 14 | Underrated Duo | Evan & Kadin, Rickey (partner not shown) | Evan & Kadin | 46,47,48 | duo nominees ambiguous: Rickey's partner (if any) is not shown; counted Evan, Kadin, Rickey as nominees |
| 15 | Qatar Award | Langston, Dakarai, Micah | Langston | 49,50,51 |  |
| 16 | "Nigga What" Award | Rickey, Micah, Jonathan | Jonathan | 52,53,54 |  |
| 17 | Craziest Comment OTY | Jonathan, Rickey, Micah | Rickey | 55,56,57 |  |
| 18 | Sophie Rain | Dakarai, Micah, Nick | Nick | 58,59,60 |  |
| 19 | Assist Leader | Jonathan, Kadin, Anthony | Anthony | 64,65,66 |  |
| 20 | Funny Guy | Anthony, Rickey, Evan | Anthony, Rickey | 67,68,69,70 | likely a tie shown as two winners; counted as TWO wins (Rickey and Anthony). If the tie was broken randomly and only one counts, subtract 1 win from one of them |
| 21 | Unfunny Guy | John Sampson, Rickey, Micah | Rickey | 71,72,73 |  |
| 22 | Gooner | Jonathan, Langston, Micah | Jonathan | 76,77,78 |  |
| 23 | Dumbest Stupidest Award | John Sampson, Anthony, Micah | John Sampson | 79,80,81 |  |
| 24 | 1st Team All-Funny (special) | Anthony, Evan, Dakarai, Jonathan, Kadin | n/a (special, not counted) | 61,62,63 | special category, not counted |
| 25 | 1st Team All-Goon (special) | Rickey, Micah, Evan, Jonathan, John Sampson | n/a (special, not counted) | 74,75 | special category, not counted |
| 26 | Participation Award (special) | TJ | n/a (special, not counted) | 82,83 | special category, not counted |

Counts (on-screen):
| member | noms | wins | win_pct |
|---|---|---|---|
| Anthony | 5 | 2 | 40.00% |
| Dakarai | 4 | 1 | 25.00% |
| Evan | 4 | 1 | 25.00% |
| John Sampson | 5 | 3 | 60.00% |
| Jonathan | 8 | 4 | 50.00% |
| Justin | 3 | 1 | 33.33% |
| Kadin | 3 | 1 | 33.33% |
| Langston | 7 | 2 | 28.57% |
| Micah | 13 | 4 | 30.77% |
| Nick | 3 | 1 | 33.33% |
| Rickey | 10 | 5 | 50.00% |
| TJ | 2 | 0 | 0.00% |

Sanity check: 23 competitive categories; wins counted 25 = 23 + 1 (Funny Guy shows two winner slides) + 1 (Underrated Duo winner is two members). Total nominations counted 67. Members with no slide noms: Demichael (not a member), Rico.

Special categories excluded: 1st Team All-Funny (Anthony, Evan, Dakarai, Jonathan, Kadin; winner slide 63 is an unidentified person in a Carolina A&T hoodie, unreadable), 1st Team All-Goon (Rickey, Micah, Evan, Jonathan, John Sampson), Participation Award (TJ). If the team awards should count (nom + win for all five on each team), add +1/+1 to each team member.

Ambiguities Fall '24 (7):
1. Funny Guy has two winner slides (69 Rickey, 70 Anthony): counted both as winners (tie). If only one counts, subtract a win from one.
2. Underrated Duo: nominee slide shows three individual photos (Evan, Rickey, Kadin) but the winner is "Evan & Kadin"; Rickey's partner is not shown; counted Evan, Kadin, Rickey as noms and Evan, Kadin as wins.
3. Honeybun: the middle nominee is Micah's photo captioned "Justin"; winner slide says Micah; counted as Micah (so Justin has a nom from the first photo only).
4. Freaky Frog and Locitician Part 2 show only 2 nominees.
5. Hawk Tuah: Evan's caption is hidden; identified from his photo.
6. 1st Team All-Funny winner slide 63 unidentified; special categories excluded as above.
7. Live-voting categories not marked on slides; none excluded.

## 13. Cross-check against the known tables

The Spring '24 table (img 11) shows e.g. Anthony 9 noms / 4 wins, Rickey 9/4. Slide counts for Fall '23 (Anthony 8/1, Rickey 12/4) and Fall '24 (Anthony 5/2, Rickey 10/5) are different semesters so no direct comparison is possible. Slide-counted noms are lower bounds because of the 3-nominee screen limit; slide-counted wins should be close to the real wins except for live categories and ties.

## 14. Proposed storage and next step

`past_stats(member_id, season_label, noms, wins, source, notes)` as in section 7, with `source` = 'screenshot' (Spring '24, Spring '25, Fall '25, Spring '26) or 'slides' (Fall '23, Fall '24). Fall '23 and Fall '24 rows come with a note: "counted from on-screen nominees; noms are a lower bound; live-voting categories not excluded". For per-category history, `fall23_categories.csv` and `fall24_categories.csv` already hold category, nominees and winner per slide and can be loaded into a `past_category_results(season_label, category, member_id, is_winner)` table. The 4 screenshot semesters have no per-category data (stats only).


---

# FINAL: Fall '23 and Fall '24 counts with the user's rules (supersedes sections 10-14 counts)

Rules applied: slides with no nominee slide are not counted (Fall '23 Down Bad dropped: Jonathan loses 1 nom and 1 win vs the earlier count); no live-voting categories exist; Fall '24 Funny Guy winner is Anthony only; Fall '23 Hairiest Cock winner is Langston only; team awards (1st Team All-Funny, 1st Team All-Goon) give each of the 5 members 1 nom and 1 win; photos beat captions (Fall '24 Honeybun nominees = Justin, Micah, TJ by photo; Fall '23 Life of the Party nominees = Rickey, Anthony, Dakarai from the mislabeled "Best Spades Player" slide, which matches the category context and winner Dakarai); Participation Award excluded. Team photos were checked against the same people's photos elsewhere in the decks: all 10 team slots match their captions (Anthony = blue Huggy-Wuggy costume, Evan = blue shirt at chalkboard, Jonathan = sitting on concrete ledge, Kadin = laptop in tan hoodie, Dakarai = curly hair / patterned shirt, Rickey = mugshot-style photo, Micah = beanie with "Sick of these hoes" sign, JSamp = Jergens bottle).

## Fall 2023: 24 categories, 77 noms, 27 wins
| # | category | nominees | winner(s) | slides |
|---|---|---|---|---|
| 1 | Best Duo | Anthony & Kadin, Jonathan & Rickey, Dakarai & Rickey | Dakarai & Rickey | 4,5,6 |
| 2 | Best Trio | Anthony, Kadin & Dakarai, Anthony, Dakarai & Rickey, Jonathan, Dakarai & Rickey | Jonathan, Dakarai & Rickey | 7,8,9 |
| 3 | Mr. Funny Guy | Anthony, Evan, Jonathan | Anthony | 10,11,12 |
| 4 | Best Spades Player | Micah, Nick, Rickey | Nick | 13,14,15 |
| 5 | Life of the Party | Rickey, Anthony, Dakarai | Dakarai | 16,17,18 |
| 6 | The Invisible Man | Justin, Nick, TJ | TJ | 19,20,21 |
| 7 | The Blind Leading the Blind | Dakarai, Jonathan | Jonathan | 22,23,24 |
| 8 | The Keeper of the Gate | Langston, Dakarai, Rickey | Rickey | 25,26,27 |
| 9 | The Scroller | Anthony, Jonathan, Dakarai | Jonathan | 28,29,30 |
| 10 | The Nomad | Justin, Kadin, Dakarai | Justin | 31,32,33 |
| 11 | The Alcoholic | Dakarai, Nick | Nick | 34,35,36 |
| 12 | Human Vulture | Rickey, Langston, Micah | Micah | 37,38,39 |
| 13 | Lurker | Justin, Evan, TJ | Evan | 40,41,42 |
| 14 | Most Likely to Stand on Business | Nick, Justin, Evan | Nick | 43,44,45 |
| 15 | Best Sidechatter | Jonathan, Rickey, Anthony | Rickey | 46,47,48 |
| 16 | Social Butterfly | Rickey, Justin, Jonathan | Jonathan | 49,50,51 |
| 17 | Emptiest Pockets | Langston, Evan | Langston | 52,53,54 |
| 18 | Give Him the Aux | Kadin, Dakarai, Rickey | Kadin | 55,56,57 |
| 19 | Grinch | Evan, Micah | Evan | 58,59,60 |
| 20 | Cowgirl | Micah, Rickey, Dakarai | Micah | 61,62,63 |
| 21 | Aggie "Pride" | Anthony, Dakarai, Jonathan | Dakarai | 64,65,66 |
| 22 | "I'm from Atlanta" | Dakarai, Micah, Evan | Evan | 70,71,72 |
| 23 | Sassy (slide title 'Jaggy') | Dakarai, Evan, Micah | Dakarai | 73,74,75 |
| 24 | Hairiest Cock | Jonathan, Dakarai, Langston | Langston | 76,77,78,79 |

| member | noms | wins | win_pct |
|---|---|---|---|
| Anthony | 8 | 1 | 12.50% |
| Dakarai | 16 | 5 | 31.25% |
| Evan | 7 | 3 | 42.86% |
| Jonathan | 9 | 4 | 44.44% |
| Justin | 5 | 1 | 20.00% |
| Kadin | 4 | 1 | 25.00% |
| Langston | 4 | 2 | 50.00% |
| Micah | 6 | 2 | 33.33% |
| Nick | 4 | 3 | 75.00% |
| Rickey | 12 | 4 | 33.33% |
| TJ | 2 | 1 | 50.00% |

Sanity: 27 wins = 24 categories + 1 extra for Best Duo (2 members) + 2 extra for Best Trio (3 members). Win leaders: Dakarai 5, Jonathan 4, Rickey 4.

## Fall 2024: 25 categories counted (23 + 2 team awards), 77 noms, 34 wins
| # | category | nominees | winner(s) | slides |
|---|---|---|---|---|
| 1 | A&T's Ass | TJ, Micah, John Sampson | John Sampson | 6,7,8 |
| 2 | Yes Massa | John Sampson, Kadin, Micah | John Sampson | 9,10,11 |
| 3 | The "Langston" | Jonathan, Langston, Nick | Langston | 12,13,14 |
| 4 | Freaky Frog | Evan, Micah | Micah | 15,16,17 |
| 5 | Locitician Part 2 | Jonathan, Justin | Jonathan | 18,19,20 |
| 6 | Cuck | Jonathan, John Sampson, Langston | Jonathan | 21,22,23 |
| 7 | Hawk Tuah Award | Rickey, Evan, Jonathan | Rickey | 24,25,26 |
| 8 | Honeybun Award | Justin, Micah, TJ | Micah | 27,28,29 |
| 9 | How Do You Want Me To React Award | Anthony, Rickey, Dakarai | Dakarai | 30,31,32,33 |
| 10 | Jim Crow Award | Anthony, Micah, Rickey | Micah | 34,35,36 |
| 11 | Kadin Get The Car Award | Micah, Langston, Rickey | Micah | 37,38,39 |
| 12 | Colonizer Award | Rickey, Dakarai, Langston | Rickey | 40,41,42 |
| 13 | Chill Guy | Langston, Justin, Nick | Justin | 43,44,45 |
| 14 | Underrated Duo | Evan & Kadin, Rickey (partner not identified) | Evan & Kadin | 46,47,48 |
| 15 | Qatar Award | Langston, Dakarai, Micah | Langston | 49,50,51 |
| 16 | "Nigga What" Award | Rickey, Micah, Jonathan | Jonathan | 52,53,54 |
| 17 | Craziest Comment OTY | Jonathan, Rickey, Micah | Rickey | 55,56,57 |
| 18 | Sophie Rain | Dakarai, Micah, Nick | Nick | 58,59,60 |
| 19 | Assist Leader | Jonathan, Kadin, Anthony | Anthony | 64,65,66 |
| 20 | Funny Guy | Anthony, Rickey, Evan | Anthony | 67,68,69,70 |
| 21 | Unfunny Guy | John Sampson, Rickey, Micah | Rickey | 71,72,73 |
| 22 | Gooner | Jonathan, Langston, Micah | Jonathan | 76,77,78 |
| 23 | Dumbest Stupidest Award | John Sampson, Anthony, Micah | John Sampson | 79,80,81 |
| 24 | 1st Team All-Funny | Anthony, Evan, Dakarai, Jonathan, Kadin | Anthony, Evan, Dakarai, Jonathan, Kadin | 61,62,63 |
| 25 | 1st Team All-Goon | Rickey, Micah, Evan, Jonathan, John Sampson | Rickey, Micah, Evan, Jonathan, John Sampson | 74,75 |
| 26 | Participation Award (special) | TJ |  | 82,83 |

| member | noms | wins | win_pct |
|---|---|---|---|
| Anthony | 6 | 3 | 50.00% |
| Dakarai | 5 | 2 | 40.00% |
| Evan | 6 | 3 | 50.00% |
| John Sampson | 6 | 4 | 66.67% |
| Jonathan | 10 | 6 | 60.00% |
| Justin | 3 | 1 | 33.33% |
| Kadin | 4 | 2 | 50.00% |
| Langston | 7 | 2 | 28.57% |
| Micah | 14 | 5 | 35.71% |
| Nick | 3 | 1 | 33.33% |
| Rickey | 11 | 5 | 45.45% |
| TJ | 2 | 0 | 0.00% |

Sanity: 34 wins = 23 competitive categories + 1 extra for Underrated Duo (Evan & Kadin) + 10 team-award wins (5 + 5). Win leaders: Jonathan 6, Micah 5, Rickey 5. Not counted: Participation Award (TJ).

## Still low confidence (for the user to eyeball)
1. Fall '24 Underrated Duo: Rickey's partner cannot be identified (the nominee slide shows separate photos of Evan, Rickey, Kadin; the winner is Evan & Kadin). Counted Rickey alone (1 nom), Evan and Kadin 1 nom + 1 win each. The photo order suggests Evan and Kadin may be the left/right photos and Rickey a separate nominee, but this is not certain.
2. Six categories show only 2 nominees (Fall '23: Blind Leading the Blind, The Alcoholic, Emptiest Pockets, Grinch; Fall '24: Freaky Frog, Locitician Part 2); a third nominee may have existed. Noms everywhere are lower bounds of the real top-3 stats.
3. Fall '24 Hawk Tuah: Evan's caption is hidden; identified by photo.
4. Fall '23 Best Trio: nominee caption 'Anthony, Kadin & Dakarai' is partially cropped.
5. Fall '24 1st Team All-Funny winner slide 63 shows an unnamed person (Carolina A&T hoodie); not needed since the team is from slide 62, but who is that person?
6. Dropped by rule: Fall '23 Down Bad (winner Jonathan, not counted) and Fall '24 Participation (TJ).
7. Fall '23 slide title 'Jaggy' vs category list 'Sassy': treated as the same category.

SQL: `/Users/rickeyjohnson/repos/jsc-oscars-hq/supabase/manual/import_past_stats_fall23_fall24.sql` (not applied). Labels 'Fall 23' (order 0) and 'Fall 24' (order 2), same format and spelling as `import_past_stats.sql`.
