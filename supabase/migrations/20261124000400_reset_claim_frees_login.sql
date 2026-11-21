-- DB CHANGE (not applied): resetting a member's name claim also frees their login, so the committee no longer
-- has to delete the user in the Supabase dashboard (P1-7). Everything else about reset_member_claim is unchanged:
-- committee only, cannot reset yourself, the 2-argument form refuses a stale list, the account's votes are deleted.
-- Deleting the auth user also removes its profile (and anything else that cascades from auth.users).

create or replace function public.reset_member_claim(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  if not public.is_committee() then
    raise exception 'committee only';
  end if;
  select m.user_id into v_user from public.members m where m.name = p_name;
  if v_user is not null and v_user = (select auth.uid()) then
    raise exception 'cannot reset yourself';
  end if;
  update public.members set user_id = null, claimed_at = null where name = p_name;
  if v_user is not null then
    delete from public.votes v where v.voter_id = v_user;
    delete from auth.users u where u.id = v_user;
  end if;
end $$;

create or replace function public.reset_member_claim(p_name text, p_expected_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  if not public.is_committee() then
    raise exception 'committee only';
  end if;
  select m.user_id into v_user from public.members m where m.name = p_name;
  if v_user is distinct from p_expected_user then
    raise exception 'member claim changed';
  end if;
  if v_user is not null and v_user = (select auth.uid()) then
    raise exception 'cannot reset yourself';
  end if;
  update public.members set user_id = null, claimed_at = null where name = p_name;
  if v_user is not null then
    delete from public.votes v where v.voter_id = v_user;
    delete from auth.users u where u.id = v_user;
  end if;
end $$;

revoke execute on function public.reset_member_claim(text) from public, anon;
revoke execute on function public.reset_member_claim(text, uuid) from public, anon;
grant execute on function public.reset_member_claim(text) to authenticated;
grant execute on function public.reset_member_claim(text, uuid) to authenticated;
