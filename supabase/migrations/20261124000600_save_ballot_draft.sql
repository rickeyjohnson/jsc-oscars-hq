-- DB CHANGE (not applied): save a ballot draft (ballot row, categories, nominees) in ONE transaction (P1-11d).
-- The client used to insert the ballot, each category and each nominee set one by one, so a failure left a half-built
-- draft. SECURITY INVOKER: RLS (committee only) still decides what is allowed; the function adds the draft-only rule.
--   p_ballot      {season_id, name, opens_at, closes_at}
--   p_categories  [{name, description, sort_order, nominee_mode, allow_member_add,
--                   nominees: [{display_name, secondary_text, type, member_ids: [uuid]}]}]

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
    insert into public.ballots (season_id, name, status, opens_at, closes_at)
    values ((p_ballot ->> 'season_id')::uuid, p_ballot ->> 'name', 'draft', (p_ballot ->> 'opens_at')::timestamptz, (p_ballot ->> 'closes_at')::timestamptz)
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
           opens_at = (p_ballot ->> 'opens_at')::timestamptz, closes_at = (p_ballot ->> 'closes_at')::timestamptz
     where id = v_id;
    delete from public.categories where ballot_id = v_id;
  end if;

  for v_cat in select * from jsonb_array_elements(coalesce(p_categories, '[]'::jsonb)) loop
    insert into public.categories (ballot_id, name, description, sort_order, nominee_mode, allow_member_add)
    values (v_id, v_cat ->> 'name', coalesce(v_cat ->> 'description', ''), coalesce((v_cat ->> 'sort_order')::int, 0),
            (v_cat ->> 'nominee_mode')::public.nominee_mode, coalesce((v_cat ->> 'allow_member_add')::boolean, false))
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
