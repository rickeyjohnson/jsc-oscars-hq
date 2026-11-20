begin;
select plan(12);

select lives_ok($$ select tests.create_user('Rico', '{"is_committee": true}') $$, 'Rico signs up');
select is((select is_committee from profiles p join members m on m.user_id = p.user_id where m.name = 'Rico'), false, 'metadata cannot grant committee');
select throws_ok($$ select tests.create_user('Rico') $$, null, 'second claim of Rico fails');
select throws_ok($$ select tests.create_user('Stranger') $$, null, 'name not on list fails');
select is((select count(*)::int from members), 14, '14 members');
select tests.authenticate_anon();
select is((select count(*)::int from available_member_names()), 13, 'Rico no longer available');
-- as Rico
select tests.clear_authentication();
select tests.authenticate_as((select user_id from members where name = 'Rico'));
select throws_ok($$ update profiles set is_committee = true where user_id = auth.uid() $$, 'P0001', 'is_committee is read-only', 'member cannot self-promote');
select lives_ok($$ update profiles set username = 'rico2' where user_id = auth.uid() $$, 'member edits own username');
select throws_ok($$ select reset_member_claim('Rico') $$, 'P0001', 'committee only', 'member cannot reset claims');
select throws_ok($$ insert into members(name) values ('Eve') $$, '42501', null, 'members table is read-only');
-- committee path
select tests.clear_authentication();
select tests.make_committee(tests.create_user('Rickey'));
select tests.authenticate_as((select user_id from members where name = 'Rickey'));
select lives_ok($$ select reset_member_claim('Rico') $$, 'committee resets a claim');
select is((select user_id from members where name = 'Rico'), null, 'Rico claimable again');

select * from finish();
rollback;
