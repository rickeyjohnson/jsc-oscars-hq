-- Ask JSC chatbot: per-member and overall daily question counts.
-- Paste this into the Supabase SQL editor; it is not applied automatically. Additive: no existing table or policy changes.

create table if not exists public.chat_usage (
  day     date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  n       int  not null default 0,
  primary key (day, user_id)
);
alter table public.chat_usage enable row level security;
-- No policies on purpose: only chat_take_quota (security definer) reads or writes this table.

-- Takes one question from today's allowance for the signed-in member. Atomic: an advisory lock makes the
-- check and the increment one step, so two requests at the cap boundary can never both get in.
create or replace function public.chat_take_quota(p_user_cap int, p_global_cap int)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  today date := (now() at time zone 'America/New_York')::date;
  mine  int;
  total int;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('chat_take_quota'));
  select coalesce(sum(n), 0) into total from public.chat_usage where day = today;
  select coalesce(max(n), 0) into mine from public.chat_usage where day = today and user_id = uid;
  if mine >= p_user_cap then
    return jsonb_build_object('ok', false, 'reason', 'user', 'left', 0);
  end if;
  if total >= p_global_cap then
    return jsonb_build_object('ok', false, 'reason', 'global', 'left', 0);
  end if;
  insert into public.chat_usage (day, user_id, n) values (today, uid, 1)
  on conflict (day, user_id) do update set n = public.chat_usage.n + 1;
  return jsonb_build_object('ok', true, 'reason', null, 'left', p_user_cap - mine - 1);
end;
$$;

revoke all on function public.chat_take_quota(int, int) from public, anon;
grant execute on function public.chat_take_quota(int, int) to authenticated;
