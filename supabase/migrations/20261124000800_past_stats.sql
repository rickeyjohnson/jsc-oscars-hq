-- DB CHANGE (not applied): per-member nominations/wins for past semesters ("Previous Oscars"). Paste into the Supabase SQL editor.
-- Stats are shared among members: any signed-in member can read every row; only the committee writes. Anon has no access.
-- Kept apart from seasons/results (those drive the live voting loop). Win % is derived in the app, never stored.

create table public.past_stats (
  id uuid primary key default gen_random_uuid(),
  season_label text not null,
  season_order int not null,
  member_id uuid not null references public.members (id) on delete cascade,
  noms int not null check (noms >= 0),
  wins int not null check (wins >= 0 and wins <= noms),
  unique (season_label, member_id)
);

alter table public.past_stats enable row level security;
revoke all on public.past_stats from anon, authenticated;
grant select, insert, update, delete on public.past_stats to authenticated;

create policy "past_stats_select_authenticated" on public.past_stats
  for select to authenticated using (true);
create policy "past_stats_insert_committee" on public.past_stats
  for insert to authenticated with check ((select public.is_committee()));
create policy "past_stats_update_committee" on public.past_stats
  for update to authenticated using ((select public.is_committee())) with check ((select public.is_committee()));
create policy "past_stats_delete_committee" on public.past_stats
  for delete to authenticated using ((select public.is_committee()));
