-- Names for the trophies on a member's shelf (Labs > Trophy shelf). Wins come from the stats; this table only
-- holds the award names members add ("Best Dressed", Fall 24). Private: you see and edit only your own shelf.
create table if not exists public.trophy_awards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  semester text not null check (char_length(btrim(semester)) between 1 and 40),
  award text not null check (char_length(btrim(award)) between 1 and 80),
  created_at timestamptz not null default now()
);
create index if not exists trophy_awards_member_idx on public.trophy_awards (member_id);

alter table public.trophy_awards enable row level security;

create policy "trophy_awards_select_own" on public.trophy_awards
  for select to authenticated using (member_id in (select m.id from public.members m where m.user_id = (select auth.uid())));
create policy "trophy_awards_insert_own" on public.trophy_awards
  for insert to authenticated with check (member_id in (select m.id from public.members m where m.user_id = (select auth.uid())));
create policy "trophy_awards_update_own" on public.trophy_awards
  for update to authenticated using (member_id in (select m.id from public.members m where m.user_id = (select auth.uid()))) with check (member_id in (select m.id from public.members m where m.user_id = (select auth.uid())));
create policy "trophy_awards_delete_own" on public.trophy_awards
  for delete to authenticated using (member_id in (select m.id from public.members m where m.user_id = (select auth.uid())));
