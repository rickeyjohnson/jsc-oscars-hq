-- Review fixes for 20261120000200_voting.sql:
-- 1. A voter must be linked to a member (an account unlinked by reset_member_claim can
--    no longer vote or add nominees), and reset_member_claim deletes that account's votes.
-- 2. add_nominee refuses a name collision with a row whose member_ids/type differ, so a
--    hand-made unlinked group cannot be handed to a member and bypass the self-vote rule.

create or replace function public.can_cast_vote(p_ballot uuid, p_category uuid, p_nominee uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select public.ballot_is_open(b.id)
      and c.ballot_id = coalesce(b.parent_ballot_id, b.id)
      and (b.round = 'main' or exists (
        select 1 from public.round_nominees rn
        where rn.ballot_id = b.id and rn.category_id = c.id and rn.nominee_id = n.id))
      and (b.round <> 'committee' or public.is_committee())
      and exists (select 1 from public.members m where m.user_id = (select auth.uid()))
      and not exists (
        select 1 from public.members m
        where m.user_id = (select auth.uid()) and m.id = any (n.member_ids))
    from public.ballots b, public.categories c, public.nominees n
    where b.id = p_ballot and c.id = p_category and n.id = p_nominee
      and n.category_id = c.id
  ), false);
$$;

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

create or replace function public.reset_member_claim(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  if not public.is_committee() then
    raise exception 'committee only';
  end if;
  select m.user_id into v_user from public.members m where m.name = p_name;
  update public.members set user_id = null, claimed_at = null where name = p_name;
  -- the unlinked account's votes no longer count
  if v_user is not null then
    delete from public.votes v where v.voter_id = v_user;
  end if;
end $$;

revoke execute on function public.can_cast_vote(uuid, uuid, uuid) from public, anon;
revoke execute on function public.add_nominee(uuid, text, uuid[]) from public, anon;
revoke execute on function public.reset_member_claim(text) from public, anon;
grant execute on function public.can_cast_vote(uuid, uuid, uuid) to authenticated;
grant execute on function public.add_nominee(uuid, text, uuid[]) to authenticated;
grant execute on function public.reset_member_claim(text) to authenticated;
