-- Run manually as postgres (SQL editor / MCP). The guard trigger only blocks client roles.
update public.profiles
set is_committee = (user_id in (select user_id from public.members where name in ('Rickey','Kadin')));
