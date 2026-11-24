-- Member feedback (bugs, ideas, other). Anyone signed in can send; the committee reads, marks done and deletes.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'idea' check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

create policy "feedback_insert_own" on public.feedback
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "feedback_select_committee_or_own" on public.feedback
  for select to authenticated using ((select public.is_committee()) or user_id = (select auth.uid()));
create policy "feedback_update_committee" on public.feedback
  for update to authenticated using ((select public.is_committee())) with check ((select public.is_committee()));
create policy "feedback_delete_committee" on public.feedback
  for delete to authenticated using ((select public.is_committee()));
