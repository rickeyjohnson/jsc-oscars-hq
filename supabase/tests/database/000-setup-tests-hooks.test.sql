-- NOTE: no Docker/Supabase CLI here. This file is applied ONCE via the Supabase MCP
-- execute_sql (it persists: pgtap extension, `tests` schema, helpers). The final
-- plan/has_function check is run separately inside begin/rollback.
-- SECURITY: the `tests` schema (create_user inserts into auth.users) MUST be dropped
-- before voting opens:  drop schema tests cascade;

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

create or replace function tests.create_user(p_member_name text, p_meta jsonb default '{}')
returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    lower(replace(p_member_name, ' ', '.')) || '@test.local',
    jsonb_build_object('member_name', p_member_name, 'username', p_member_name) || p_meta,
    now(), now());
  return v_id;
end $$;

create or replace function tests.authenticate_as(p_user uuid) returns void
language plpgsql security invoker as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function tests.authenticate_anon() returns void
language plpgsql security invoker as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end $$;

create or replace function tests.clear_authentication() returns void
language plpgsql security invoker as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- Task 2: promote a user to committee (runs as postgres; the guard trigger only blocks client roles)
create or replace function tests.make_committee(p_user uuid) returns void
language plpgsql as $$
begin
  update public.profiles set is_committee = true where user_id = p_user;
end $$;
revoke execute on function tests.make_committee(uuid) from public, anon, authenticated;
