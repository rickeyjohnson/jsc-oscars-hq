-- DB CHANGE (not applied): one round of each kind per main ballot (P1-12). The client's "refuse a second round" is a
-- read-then-insert, so two committee members tapping Start tiebreak together could create two. This makes it impossible.
--
-- WARNING: if two rows with the same (parent_ballot_id, round) already exist, the CREATE UNIQUE INDEX below FAILS
-- (duplicate key) and nothing is changed. Run this read-only check first; it must return no rows:
--
--   select b.parent_ballot_id, b.round, count(*) as n, array_agg(b.id order by b.created_at) as ballot_ids
--   from public.ballots b
--   where b.parent_ballot_id is not null
--   group by b.parent_ballot_id, b.round
--   having count(*) > 1;
--
-- If it returns rows, look at each duplicate before touching it (read-only):
--   select b.id, b.name, b.status, b.created_at, (select count(*) from public.votes v where v.ballot_id = b.id) as votes
--   from public.ballots b where b.id = any(<ballot_ids from above>) order by b.created_at;
-- Safe fix: keep the earliest one (or the one that has votes) and delete only the extra ballot(s) that have 0 votes
-- (delete from public.ballots where id = '<extra id>'; its round_nominees cascade). If an extra has votes, do not delete
-- it: ask the committee which one counts, move or discard those votes deliberately, then delete it.

create unique index if not exists ballots_one_round_per_kind
  on public.ballots (parent_ballot_id, round)
  where parent_ballot_id is not null;
