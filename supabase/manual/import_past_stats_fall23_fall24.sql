-- Import past semester stats for Fall 23 and Fall 24 (counted by hand from the ceremony slide decks). Run in the Supabase SQL editor AFTER 20261124000800_past_stats.sql.
-- Companion to import_past_stats.sql (Spring 24 .. Spring 26); do not run this one against a database that does not have public.past_stats yet.
-- Idempotent: re-running updates the same rows. Names map to members.name case-insensitively
-- (Jonathan Madden -> Jonathan, JSamp / John Sampson -> John Sampson). An unmatched name raises an exception and nothing is written.
-- Season order: Fall 23 = 0, Fall 24 = 2 (Spring 24 = 1, Spring 25 = 3, Fall 25 = 4, Spring 26 = 5).
-- Source: manual count of nominee/winner slides. Nominations = people shown on the nominee slide (max 3 per category, so noms are a lower bound);
-- group wins count per member; team awards (1st Team All-Funny / All-Goon) = 1 nom + 1 win each; Down Bad (Fall 23, no nominee slide) and Participation Award (Fall 24) not counted.
-- Only members who were in the semester get a row (no zero rows).

do $$
declare
  r record;
  v_id uuid;
begin
  for r in
    select * from (values
      ('Fall 23', 0, 'Anthony', 8, 1),
      ('Fall 23', 0, 'Dakarai', 16, 5),
      ('Fall 23', 0, 'Evan', 7, 3),
      ('Fall 23', 0, 'Jonathan', 9, 4),
      ('Fall 23', 0, 'Justin', 5, 1),
      ('Fall 23', 0, 'Kadin', 4, 1),
      ('Fall 23', 0, 'Langston', 4, 2),
      ('Fall 23', 0, 'Micah', 6, 2),
      ('Fall 23', 0, 'Nick', 4, 3),
      ('Fall 23', 0, 'Rickey', 12, 4),
      ('Fall 23', 0, 'TJ', 2, 1),
      ('Fall 24', 2, 'Anthony', 6, 3),
      ('Fall 24', 2, 'Dakarai', 5, 2),
      ('Fall 24', 2, 'Evan', 6, 3),
      ('Fall 24', 2, 'John Sampson', 6, 4),
      ('Fall 24', 2, 'Jonathan', 10, 6),
      ('Fall 24', 2, 'Justin', 3, 1),
      ('Fall 24', 2, 'Kadin', 4, 2),
      ('Fall 24', 2, 'Langston', 7, 2),
      ('Fall 24', 2, 'Micah', 14, 5),
      ('Fall 24', 2, 'Nick', 3, 1),
      ('Fall 24', 2, 'Rickey', 11, 5),
      ('Fall 24', 2, 'TJ', 2, 0)
    ) as t(season_label, season_order, member_name, noms, wins)
  loop
    select m.id into v_id from public.members m where lower(m.name) = lower(r.member_name);
    if v_id is null then
      raise exception 'past stats import: no member named % (semester %)', r.member_name, r.season_label;
    end if;
    insert into public.past_stats (season_label, season_order, member_id, noms, wins)
    values (r.season_label, r.season_order, v_id, r.noms, r.wins)
    on conflict (season_label, member_id) do update
      set season_order = excluded.season_order, noms = excluded.noms, wins = excluded.wins;
  end loop;
  raise notice 'past stats import (Fall 23 / Fall 24) done';
end $$;

-- Verification: expect 11 / 12 rows and these totals.
select p.season_label, p.season_order, count(*) as members, sum(p.noms) as noms, sum(p.wins) as wins
from public.past_stats p
where p.season_label in ('Fall 23', 'Fall 24')
group by p.season_label, p.season_order
order by p.season_order;
-- Fall 23: 77 noms 27 wins | Fall 24: 77 noms 34 wins
