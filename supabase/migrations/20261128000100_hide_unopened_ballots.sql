-- DB CHANGE (not applied): members cannot see a published ballot (or its categories and nominees) until its opening time.
-- The committee still sees everything, including drafts and scheduled ballots, in Manage ballots.
-- Closed and released ballots stay visible. Only the "opens_at <= now()" rule is new.

create or replace function public.ballot_visible(p_ballot uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_committee() or coalesce((
    select b.status <> 'draft' and b.round <> 'committee' and b.opens_at <= now()
    from public.ballots b where b.id = p_ballot
  ), false);
$$;
