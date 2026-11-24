-- A ballot can be marked "practice": its results still show on the Results tab, but never count toward stats
-- (leaderboard, My stats, Home stat widgets). Default true, so every existing ballot counts as before.

alter table public.ballots add column if not exists count_in_stats boolean not null default true;

-- save_ballot_draft now also stores count_in_stats (body otherwise identical to 20261125000100).
create or replace function public.save_ballot_draft(p_ballot_id uuid, p_ballot jsonb, p_categories jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := p_ballot_id;
  v_status public.ballot_status;
  v_cat jsonb;
  v_cat_id uuid;
begin
  if not public.is_committee() then
    raise exception 'Only committee members can save a ballot' using errcode = '42501';
  end if;

  if v_id is null then
    insert into public.ballots (season_id, name, status, opens_at, closes_at, count_in_stats)
    values ((p_ballot ->> 'season_id')::uuid, p_ballot ->> 'name', 'draft', (p_ballot ->> 'opens_at')::timestamptz, (p_ballot ->> 'closes_at')::timestamptz,
            coalesce((p_ballot ->> 'count_in_stats')::boolean, true))
    returning id into v_id;
  else
    select status into v_status from public.ballots where id = v_id for update;
    if not found then
      raise exception 'Ballot not found';
    end if;
    if v_status <> 'draft' then
      raise exception 'Only draft ballots can be rewritten';
    end if;
    update public.ballots
       set season_id = (p_ballot ->> 'season_id')::uuid, name = p_ballot ->> 'name',
           opens_at = (p_ballot ->> 'opens_at')::timestamptz, closes_at = (p_ballot ->> 'closes_at')::timestamptz,
           count_in_stats = coalesce((p_ballot ->> 'count_in_stats')::boolean, true)
     where id = v_id;
    delete from public.categories where ballot_id = v_id;
  end if;

  for v_cat in select * from jsonb_array_elements(coalesce(p_categories, '[]'::jsonb)) loop
    insert into public.categories (ballot_id, name, description, sort_order, nominee_mode, allow_member_add, group_size)
    values (v_id, v_cat ->> 'name', coalesce(v_cat ->> 'description', ''), coalesce((v_cat ->> 'sort_order')::int, 0),
            (v_cat ->> 'nominee_mode')::public.nominee_mode, coalesce((v_cat ->> 'allow_member_add')::boolean, false),
            nullif(v_cat ->> 'group_size', '')::int)
    returning id into v_cat_id;

    insert into public.nominees (category_id, display_name, secondary_text, type, member_ids)
    select v_cat_id, n ->> 'display_name', nullif(n ->> 'secondary_text', ''), (n ->> 'type')::public.nominee_type,
           coalesce(array(select jsonb_array_elements_text(n -> 'member_ids'))::uuid[], '{}')
      from jsonb_array_elements(coalesce(v_cat -> 'nominees', '[]'::jsonb)) n;
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.save_ballot_draft(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_ballot_draft(uuid, jsonb, jsonb) to authenticated;
