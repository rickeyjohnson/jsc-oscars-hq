-- OAuth sign-in support + member name status.  ADDITIVE: only create [or replace] function.
--
-- HOW TO APPLY: paste this whole file into the Supabase dashboard SQL editor and run it once.
-- Nothing is dropped and no table is changed; re-running is safe (create or replace).
--
-- WHAT IT DOES
--   member_name_status()  - lists all 14 members with taken = (user_id is not null). Exposes
--                           no ids, emails or user ids. Callable by signed-out visitors (anon).
--   handle_new_user()     - auth.users insert trigger function (trigger itself unchanged):
--                             member_name present -> unchanged: claim that free name or raise
--                               'member name % is not available'.
--                             member_name absent + OAuth provider (not 'email') -> profile only,
--                               claims nothing; the user links a name later via claim_member_name.
--                             member_name absent + provider 'email'/missing -> raise
--                               'member name is required' (email signup stays allowlist-gated).
--                           is_committee is ALWAYS false; metadata is never trusted for it.
--   claim_member_name(p_name) - a signed-in user links themselves to one free member name, once.
--
-- MANUAL SETUP FOR 'Continue with Google' (done in dashboards, no secrets belong in this repo)
--   1. Google Cloud Console -> APIs & Services -> Credentials -> Create OAuth client ID (Web).
--      Add as Authorized redirect URI the Supabase callback URL shown in
--      Supabase -> Authentication -> Providers -> Google.
--   2. Paste the Client ID and Client Secret into that Google provider panel and enable it.
--   3. Supabase -> Authentication -> URL Configuration: add the Vercel site URL and
--      http://localhost:5173 to the redirect URLs.

create or replace function public.member_name_status()
returns table(name text, taken boolean)
language sql stable security definer set search_path = '' as $$
  select m.name, (m.user_id is not null) as taken
  from public.members m
  order by m.name;
$$;
revoke execute on function public.member_name_status() from public;
grant execute on function public.member_name_status() to anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(btrim(new.raw_user_meta_data ->> 'member_name'), '');
  v_provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  v_username text;
begin
  if v_name is not null then
    -- unchanged behavior: allowlisted name claim at signup
    update public.members set user_id = new.id, claimed_at = now()
    where name = v_name and user_id is null;
    if not found then
      raise exception 'member name % is not available', v_name;
    end if;
    insert into public.profiles (user_id, username, display_name, email, is_committee)
    values (
      new.id,
      new.raw_user_meta_data ->> 'username',
      coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'username'),
      new.email,
      false
    )
    on conflict (user_id) do nothing;
  elsif v_provider <> 'email' then
    -- OAuth: profile only, claim nothing
    v_username := coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), '')
    );
    insert into public.profiles (user_id, username, display_name, email, is_committee)
    values (new.id, v_username, v_username, new.email, false)
    on conflict (user_id) do nothing;
  else
    raise exception 'member name is required';
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.claim_member_name(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'already linked to a member';
  end if;
  update public.members set user_id = auth.uid(), claimed_at = now()
  where name = p_name and user_id is null;
  if not found then
    raise exception 'member name % is not available', p_name;
  end if;
end $$;
revoke execute on function public.claim_member_name(text) from public, anon;
grant execute on function public.claim_member_name(text) to authenticated;
