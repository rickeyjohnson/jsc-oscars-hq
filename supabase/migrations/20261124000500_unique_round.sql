-- DB CHANGE (not applied): one round of each kind per main ballot (P1-12). The client's "refuse a second round" is a
-- read-then-insert, so two committee members tapping Start tiebreak together could create two. This makes it impossible.
-- If duplicates already exist the index creation fails: delete the extra round ballot first
--   select parent_ballot_id, round, count(*) from public.ballots where parent_ballot_id is not null group by 1,2 having count(*) > 1;

create unique index if not exists ballots_one_round_per_kind
  on public.ballots (parent_ballot_id, round)
  where parent_ballot_id is not null;
