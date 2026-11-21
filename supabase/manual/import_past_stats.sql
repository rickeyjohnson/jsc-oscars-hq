-- Import past semester stats (Previous Oscars). Run in the Supabase SQL editor AFTER 20261124000800_past_stats.sql.
-- Idempotent: re-running updates the same rows. Names map to members.name case-insensitively
-- (Jonathan Madden -> Jonathan, JSamp / John Sampson -> John Sampson). An unmatched name raises an exception and nothing is written.
-- Reserved: Fall 23 = order 0, Fall 24 = order 2 (add them later as more rows in a second file).
-- Source: transcribed screenshots; counted by nominations (top 3 in votes), live-voting categories excluded.

do $$
declare
  r record;
  v_id uuid;
begin
  for r in
    select * from (values
      ('Spring 24', 1, 'Anthony', 9, 4),
      ('Spring 24', 1, 'Dakarai', 17, 4),
      ('Spring 24', 1, 'Evan', 12, 4),
      ('Spring 24', 1, 'Jonathan', 12, 2),
      ('Spring 24', 1, 'John Sampson', 3, 2),
      ('Spring 24', 1, 'Justin', 9, 4),
      ('Spring 24', 1, 'Kadin', 7, 3),
      ('Spring 24', 1, 'Langston', 8, 2),
      ('Spring 24', 1, 'Micah', 14, 4),
      ('Spring 24', 1, 'Nick', 8, 4),
      ('Spring 24', 1, 'Rickey', 9, 4),
      ('Spring 24', 1, 'TJ', 8, 4),
      ('Spring 25', 3, 'Micah', 20, 6),
      ('Spring 25', 3, 'John Sampson', 19, 7),
      ('Spring 25', 3, 'Anthony', 13, 6),
      ('Spring 25', 3, 'Rickey', 20, 4),
      ('Spring 25', 3, 'Justin', 6, 3),
      ('Spring 25', 3, 'Dakarai', 14, 4),
      ('Spring 25', 3, 'TJ', 9, 2),
      ('Spring 25', 3, 'Jonathan', 13, 2),
      ('Spring 25', 3, 'Evan', 14, 3),
      ('Spring 25', 3, 'Kadin', 10, 2),
      ('Spring 25', 3, 'Langston', 15, 2),
      ('Spring 25', 3, 'Nick', 4, 0),
      ('Fall 25', 4, 'Anthony', 17, 3),
      ('Fall 25', 4, 'Dakarai', 21, 8),
      ('Fall 25', 4, 'DeMichael', 16, 4),
      ('Fall 25', 4, 'Evan', 11, 1),
      ('Fall 25', 4, 'John Sampson', 18, 6),
      ('Fall 25', 4, 'Jonathan', 16, 4),
      ('Fall 25', 4, 'Justin', 6, 1),
      ('Fall 25', 4, 'Kadin', 16, 4),
      ('Fall 25', 4, 'Langston', 10, 1),
      ('Fall 25', 4, 'Micah', 19, 6),
      ('Fall 25', 4, 'Nick', 5, 1),
      ('Fall 25', 4, 'Rickey', 16, 3),
      ('Fall 25', 4, 'TJ', 7, 2),
      ('Spring 26', 5, 'Anthony', 11, 1),
      ('Spring 26', 5, 'Dakarai', 14, 3),
      ('Spring 26', 5, 'DeMichael', 16, 8),
      ('Spring 26', 5, 'Evan', 11, 1),
      ('Spring 26', 5, 'John Sampson', 10, 2),
      ('Spring 26', 5, 'Jonathan', 10, 2),
      ('Spring 26', 5, 'Justin', 5, 1),
      ('Spring 26', 5, 'Kadin', 11, 1),
      ('Spring 26', 5, 'Langston', 10, 2),
      ('Spring 26', 5, 'Micah', 10, 2),
      ('Spring 26', 5, 'Nick', 6, 2),
      ('Spring 26', 5, 'Rickey', 12, 4),
      ('Spring 26', 5, 'TJ', 10, 6)
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
  raise notice 'past stats import done';
end $$;

-- Verification: expect 12 / 12 / 13 / 13 rows and these totals.
select p.season_label, p.season_order, count(*) as members, sum(p.noms) as noms, sum(p.wins) as wins
from public.past_stats p
group by p.season_label, p.season_order
order by p.season_order;
-- Spring 24: 116 noms 41 wins | Spring 25: 157 / 41 | Fall 25: 190 / 44 | Spring 26: 126 / 35
