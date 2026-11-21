-- DB CHANGE: reopen a closed ballot (committee only).
-- Paste this into the Supabase SQL editor; it is not applied automatically.
--
-- Rules:
--   * committee only (public.is_committee(), same check as the other committee helpers)
--   * the ballot must be closed, or open with its close time already past (what the client calls "ended");
--     drafts, scheduled/running ballots and released ballots are refused
--   * the season must NOT be released (seasons.results_released_at is null)
--   * refused while child round ballots (tiebreak/committee) exist for it
--   * p_closes_at must be in the future (and after the ballot's opens_at)
--   * deletes the results rows this ballot decided, so they record again automatically on the next close
--   * votes are kept; the ballot becomes status 'open' with the new closes_at, which is exactly what
--     ballot_is_open / can_cast_vote check (status = 'open' and now() < closes_at)

create or replace function public.reopen_ballot(p_ballot_id uuid, p_closes_at timestamptz)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_ballot public.ballots%rowtype;
  v_released timestamptz;
begin
  if not public.is_committee() then
    raise exception 'Only committee members can reopen a ballot' using errcode = '42501';
  end if;

  select * into v_ballot from public.ballots where id = p_ballot_id for update;
  if not found then
    raise exception 'Ballot not found';
  end if;

  select s.results_released_at into v_released from public.seasons s where s.id = v_ballot.season_id;
  if v_released is not null or v_ballot.status = 'released' then
    raise exception 'Results are already released, so this ballot cannot be reopened';
  end if;

  if not (v_ballot.status = 'closed' or (v_ballot.status = 'open' and v_ballot.closes_at <= now())) then
    raise exception 'Only a closed ballot can be reopened';
  end if;

  if exists (select 1 from public.ballots c where c.parent_ballot_id = p_ballot_id) then
    raise exception 'This ballot has tiebreak or committee rounds, so it cannot be reopened';
  end if;

  if p_closes_at is null or p_closes_at <= now() then
    raise exception 'The new close time must be in the future';
  end if;
  if p_closes_at <= v_ballot.opens_at then
    raise exception 'The new close time must be after the ballot opens';
  end if;

  delete from public.results where decided_ballot_id = p_ballot_id;

  update public.ballots set status = 'open', closes_at = p_closes_at where id = p_ballot_id;
end;
$$;

revoke execute on function public.reopen_ballot(uuid, timestamptz) from public, anon;
grant execute on function public.reopen_ballot(uuid, timestamptz) to authenticated;
