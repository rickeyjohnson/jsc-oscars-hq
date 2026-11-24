-- Group categories get their own size: "pick exactly N" (duos, trios, quads...). Null keeps the old 2 to 3 rule
-- for categories made before this column existed.

alter table public.categories
  add column if not exists group_size int check (group_size is null or group_size between 2 and 8);

-- Same function as before (see 20261120000300), plus: when the category has a group_size, the group must be exactly that big.
create or replace function public.add_nominee(p_category uuid, p_display_name text, p_member_ids uuid[])
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_cat public.categories%rowtype;
  v_name text;
  v_ids uuid[];
  v_type public.nominee_type;
  v_count int;
  v_id uuid;
  v_existing public.nominees%rowtype;
begin
  if not exists (select 1 from public.members m where m.user_id = (select auth.uid())) then
    raise exception 'account is not linked to a member';
  end if;

  select * into v_cat from public.categories c where c.id = p_category;
  if not found or not public.ballot_is_open(v_cat.ballot_id) then
    raise exception 'ballot is not open';
  end if;

  if v_cat.nominee_mode = 'group' then
    select count(*), string_agg(m.name, ', ' order by m.name), array_agg(m.id order by m.name)
      into v_count, v_name, v_ids
      from public.members m where m.id = any (p_member_ids);
    -- unknown or repeated ids make the counts differ
    if v_count < 2 or v_count <> coalesce(cardinality(p_member_ids), 0) then
      raise exception 'a group needs at least two different members';
    end if;
    if v_cat.group_size is not null and v_count <> v_cat.group_size then
      raise exception 'a group here needs exactly % different members', v_cat.group_size;
    end if;
    v_type := 'group';
  elsif v_cat.nominee_mode = 'preset' and v_cat.allow_member_add then
    if coalesce(cardinality(p_member_ids), 0) <> 0 then
      raise exception 'preset options cannot link members';
    end if;
    v_name := btrim(coalesce(p_display_name, ''));
    if v_name = '' then
      raise exception 'name is required';
    end if;
    if char_length(v_name) > 100 then
      raise exception 'name is too long';
    end if;
    v_ids := '{}';
    v_type := 'noun';
  else
    raise exception 'category does not accept new nominees';
  end if;

  insert into public.nominees (category_id, display_name, type, member_ids, created_by)
  values (p_category, v_name, v_type, v_ids, (select auth.uid()))
  on conflict (category_id, lower(display_name)) do nothing
  returning id into v_id;

  if v_id is null then
    select * into v_existing from public.nominees n
    where n.category_id = p_category and lower(n.display_name) = lower(v_name);
    if v_existing.member_ids is distinct from v_ids or v_existing.type is distinct from v_type then
      raise exception 'a different nominee with this name already exists';
    end if;
    v_id := v_existing.id;
  end if;
  return v_id;
end $$;

-- save_ballot_draft now also stores group_size (body otherwise identical to 20261124000600).
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

revoke execute on function public.add_nominee(uuid, text, uuid[]) from public, anon;
grant execute on function public.add_nominee(uuid, text, uuid[]) to authenticated;
revoke execute on function public.save_ballot_draft(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_ballot_draft(uuid, jsonb, jsonb) to authenticated;
