-- =============================================================
--  IMMA Business Directory — security and workflow checks
--  Creates temporary users and data, runs every check, then ROLLS BACK.
--  Nothing is kept. The result is reported as an error message:
--    "ALL n CHECKS PASSED" or the list of failures.
-- =============================================================
begin;
create temporary table _t (n serial, name text, ok boolean, detail text) on commit drop;
grant all on _t to authenticated, anon;
grant usage on sequence _t_n_seq to authenticated, anon;

-- Test people: an owner, another business owner, a reader (reviewer), an admin
insert into auth.users (id, email, email_confirmed_at, aud, role, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000a1', 'owner@test.invalid', now(), 'authenticated', 'authenticated', '{"full_name":"Olive Owner"}'),
  ('00000000-0000-4000-8000-0000000000a2', 'rival@test.invalid', now(), 'authenticated', 'authenticated', '{"full_name":"Rita Rival"}'),
  ('00000000-0000-4000-8000-0000000000a3', 'reader@test.invalid', now(), 'authenticated', 'authenticated', '{"full_name":"Remy Reader"}'),
  ('00000000-0000-4000-8000-0000000000a4', 'admin@test.invalid', now(), 'authenticated', 'authenticated', '{"full_name":"Ada Admin"}');
insert into public.profiles (id, full_name, email, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'Olive Owner', 'owner@test.invalid', 'reader'),
  ('00000000-0000-4000-8000-0000000000a2', 'Rita Rival', 'rival@test.invalid', 'reader'),
  ('00000000-0000-4000-8000-0000000000a3', 'Remy Reader', 'reader@test.invalid', 'reader'),
  ('00000000-0000-4000-8000-0000000000a4', 'Ada Admin', 'admin@test.invalid', 'admin')
on conflict (id) do update set role = excluded.role;

create or replace function pg_temp.act(uid text) returns void language plpgsql as $$
begin
  if uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    execute 'set local role anon';
  else
    perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
  end if;
end $$;
create or replace function pg_temp.ok(p_name text, p_ok boolean, p_detail text default null) returns void language sql as $$
  insert into _t (name, ok, detail) values (p_name, coalesce(p_ok, false), p_detail);
$$;

-- ---------- 1. Owner creates a listing ----------
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
do $$
declare b uuid; s text; st text; v boolean;
begin
  insert into public.businesses (name, description, category_id, status, verified, featured_until, claimable)
  values ('Test Bakes Kenya', 'A small test bakery used only by the automated directory checks.', (select id from public.business_categories where slug = 'bakeries'),
          'approved', true, '2099-01-01', true)
  returning id, slug, status, verified into b, s, st, v;
  perform pg_temp.ok('owner insert: status forced to draft', st = 'draft', st);
  perform pg_temp.ok('owner insert: cannot self-verify', v = false);
  perform pg_temp.ok('slug generated from name', s = 'test-bakes-kenya', s);
  perform pg_temp.ok('creator becomes owner', exists (select 1 from public.business_owners where business_id = b and user_id = auth.uid()));
  insert into public.business_locations (business_id, county, town, address_line, latitude, longitude, show_address)
    values (b, 'nairobi', 'Westlands', 'House 12, private road', -1.26, 36.8, false);
  insert into public.business_products (business_id, name, price_kes) values (b, 'Test cupcake', 150);
  insert into public.business_images (business_id, path) values (b, b::text || '/gallery/1.jpg'), (b, b::text || '/gallery/2.jpg');
  begin
    update public.businesses set status = 'approved' where id = b;
    perform pg_temp.ok('owner cannot approve own listing', false);
  exception when others then perform pg_temp.ok('owner cannot approve own listing', true, sqlerrm); end;
  begin
    update public.businesses set status = 'pending' where id = b;
    perform pg_temp.ok('submit without terms is refused', false);
  exception when others then perform pg_temp.ok('submit without terms is refused', true, sqlerrm); end;
  update public.businesses set status = 'pending', terms_accepted_at = now() where id = b;
  perform pg_temp.ok('owner can submit for approval', (select status from public.businesses where id = b) = 'pending');
  begin
    insert into public.business_owners (business_id, user_id) values (b, '00000000-0000-4000-8000-0000000000a2');
    perform pg_temp.ok('owner cannot add other owners', false);
  exception when others then perform pg_temp.ok('owner cannot add other owners', true, sqlerrm); end;
  begin
    insert into public.business_subscriptions (business_id, package_slug, status, starts_on, ends_on) values (b, 'elite', 'active', current_date, current_date + 30);
    perform pg_temp.ok('owner cannot grant themselves a package', false);
  exception when others then perform pg_temp.ok('owner cannot grant themselves a package', true, sqlerrm); end;
  perform set_config('test.b', b::text, true);
end $$;

-- ---------- 2. Another user cannot see or change it; the public cannot see a pending listing ----------
select pg_temp.act('00000000-0000-4000-8000-0000000000a2');
do $$
declare b uuid := current_setting('test.b')::uuid; n int;
begin
  select count(*) into n from public.businesses where id = b;
  perform pg_temp.ok('other user cannot read pending listing', n = 0);
  update public.businesses set name = 'Hijacked' where id = b;
  perform pg_temp.ok('other user cannot edit listing', (select name from public.businesses where id = b) is null);
  select count(*) into n from public.business_locations where business_id = b;
  perform pg_temp.ok('other user cannot read private address', n = 0);
end $$;
select pg_temp.act(null);
do $$
declare n int;
begin
  select count(*) into n from public.dir_businesses where id = current_setting('test.b')::uuid;
  perform pg_temp.ok('pending listing not public', n = 0);
  select count(*) into n from public.dir_businesses where slug = 'patricia-bakes';
  perform pg_temp.ok('Patricia Bakes draft not public', n = 0);
end $$;

-- ---------- 3. Admin approves; public view hides address and package-locked fields ----------
select pg_temp.act('00000000-0000-4000-8000-0000000000a4');
update public.businesses set status = 'approved', website = 'https://example.com' where id = current_setting('test.b')::uuid;
select pg_temp.act(null);
do $$
declare r record; n int;
begin
  select * into r from public.dir_businesses where id = current_setting('test.b')::uuid;
  perform pg_temp.ok('approved listing is public', r.id is not null);
  perform pg_temp.ok('private address hidden (show_address off)', r.address_line is null and r.latitude is null, coalesce(r.address_line, 'null'));
  perform pg_temp.ok('free package: website hidden', r.website is null);
  perform pg_temp.ok('free package: no photos shown', (select count(*) from public.dir_images where business_id = r.id) = 0);
  perform pg_temp.ok('free package: catalogue hidden', (select count(*) from public.dir_products where business_id = r.id) = 0);
  perform pg_temp.ok('county and town are public', r.county = 'nairobi' and r.town = 'Westlands');
  begin
    select count(*) into n from public.businesses;
    perform pg_temp.ok('anon cannot read base table', n = 0, n::text);
  exception when others then perform pg_temp.ok('anon cannot read base table', true, sqlerrm); end;
end $$;

-- ---------- 4. Paid package: quote, invoice, payment report, admin confirmation ----------
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
do $$
declare b uuid := current_setting('test.b')::uuid; r jsonb; sid uuid;
begin
  r := public.biz_quote('standard', 'annual');
  perform pg_temp.ok('annual price uses discount', (r ->> 'amount')::numeric = 10200, r ->> 'amount');
  r := public.biz_start_subscription(b, 'standard', 'monthly');
  sid := (r -> 'subscription' ->> 'id')::uuid;
  perform pg_temp.ok('subscription awaits payment', r -> 'subscription' ->> 'status' = 'pending_payment');
  perform pg_temp.ok('invoice created with BD number', r -> 'invoice' ->> 'number' like 'BD-%', r -> 'invoice' ->> 'number');
  perform pg_temp.ok('still free until paid', public.biz_package(b) = 'free');
  insert into public.business_payments (subscription_id, method, reference, amount_kes, status) values (sid, 'mpesa_manual', 'tst123abc', 1000, 'confirmed');
  perform pg_temp.ok('owner payment report stays pending', (select status from public.business_payments where subscription_id = sid) = 'pending_verification');
  perform set_config('test.sid', sid::text, true);
end $$;
select pg_temp.act('00000000-0000-4000-8000-0000000000a4');
update public.business_payments set status = 'confirmed' where subscription_id = current_setting('test.sid')::uuid;
select pg_temp.act(null);
do $$
declare b uuid := current_setting('test.b')::uuid; r record;
begin
  perform pg_temp.ok('confirmed payment activates Standard', public.biz_package(b) = 'standard');
  select * into r from public.dir_businesses where id = b;
  perform pg_temp.ok('standard: website now shown', r.website = 'https://example.com');
  perform pg_temp.ok('standard: photos shown', (select count(*) from public.dir_images where business_id = b) = 2);
  perform pg_temp.ok('standard: not labelled sponsored', not r.sponsored);
  perform pg_temp.ok('paid package does not verify', not r.verified);
end $$;
-- Expiry: listing falls back to Free without deleting anything
select pg_temp.act('00000000-0000-4000-8000-0000000000a4');
select pg_temp.ok('invoice marked paid with receipt', (select status = 'paid' and receipt_number like 'RC-%' from public.business_invoices where subscription_id = current_setting('test.sid')::uuid));
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
select pg_temp.ok('owner can read own invoice', exists (select 1 from public.business_invoices where subscription_id = current_setting('test.sid')::uuid));
select pg_temp.act('00000000-0000-4000-8000-0000000000a2');
select pg_temp.ok('other user cannot read invoice', not exists (select 1 from public.business_invoices where subscription_id = current_setting('test.sid')::uuid));
select pg_temp.act('00000000-0000-4000-8000-0000000000a4');
update public.business_subscriptions set starts_on = current_date - 60, ends_on = current_date - 1 where id = current_setting('test.sid')::uuid;
select pg_temp.act(null);
do $$
declare b uuid := current_setting('test.b')::uuid;
begin
  perform pg_temp.ok('expired package falls back to Free', public.biz_package(b) = 'free');
  perform pg_temp.ok('listing still public after expiry', exists (select 1 from public.dir_businesses where id = b));
end $$;

-- ---------- 5. Reviews ----------
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
do $$
begin
  insert into public.business_reviews (business_id, rating, body) values (current_setting('test.b')::uuid, 5, 'I am reviewing my own business which should not be allowed.');
  perform pg_temp.ok('owner cannot review own business', false);
exception when others then perform pg_temp.ok('owner cannot review own business', true, sqlerrm);
end $$;
select pg_temp.act('00000000-0000-4000-8000-0000000000a3');
do $$
declare rid uuid;
begin
  insert into public.business_reviews (business_id, rating, body, status) values (current_setting('test.b')::uuid, 2, 'The cupcakes were dry and the order arrived late.', 'approved') returning id into rid;
  perform pg_temp.ok('new review held for moderation', (select status from public.business_reviews where id = rid) = 'pending');
  perform set_config('test.rid', rid::text, true);
end $$;
select pg_temp.act(null);
select pg_temp.ok('pending review not public', not exists (select 1 from public.dir_reviews where id = current_setting('test.rid')::uuid));
select pg_temp.act('00000000-0000-4000-8000-0000000000a4');
update public.business_reviews set status = 'approved' where id = current_setting('test.rid')::uuid;
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
do $$
begin
  update public.business_reviews set status = 'hidden' where id = current_setting('test.rid')::uuid;
  perform pg_temp.ok('owner cannot hide a negative review', (select status from public.business_reviews where id = current_setting('test.rid')::uuid) = 'approved');
  delete from public.business_reviews where id = current_setting('test.rid')::uuid;
  perform pg_temp.ok('owner cannot delete a negative review', exists (select 1 from public.business_reviews where id = current_setting('test.rid')::uuid));
  insert into public.business_review_replies (review_id, body) values (current_setting('test.rid')::uuid, 'Sorry about this. We have changed our delivery partner.');
  perform pg_temp.ok('owner can reply to a review', true);
end $$;
select pg_temp.act(null);
select pg_temp.ok('approved review and reply are public', exists (select 1 from public.dir_reviews where id = current_setting('test.rid')::uuid and reply_body is not null));
select pg_temp.ok('rating average updated', (select rating_avg = 2 and rating_count = 1 from public.dir_businesses where id = current_setting('test.b')::uuid));

-- ---------- 6. Verification and claims ----------
select pg_temp.act('00000000-0000-4000-8000-0000000000a2');
do $$
begin
  insert into public.business_verifications (business_id, evidence_type) values (current_setting('test.b')::uuid, 'business_permit');
  perform pg_temp.ok('non-owner cannot request verification', false);
exception when others then perform pg_temp.ok('non-owner cannot request verification', true, sqlerrm);
end $$;
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
insert into public.business_verifications (business_id, evidence_type, status) values (current_setting('test.b')::uuid, 'business_permit', 'approved');
select pg_temp.ok('verification request starts pending', (select status from public.business_verifications where business_id = current_setting('test.b')::uuid) = 'pending');
select pg_temp.act('00000000-0000-4000-8000-0000000000a4');
update public.business_verifications set status = 'approved' where business_id = current_setting('test.b')::uuid;
select pg_temp.ok('admin approval sets verified badge', (select verified from public.businesses where id = current_setting('test.b')::uuid));
-- an admin-added, claimable listing
insert into public.businesses (name, description, category_id, status, claimable, source_note)
values ('Claimable Test Shop', 'A listing added by IMMA Media for the automated checks.', (select id from public.business_categories where slug = 'groceries'), 'approved', true, 'test');
select pg_temp.act('00000000-0000-4000-8000-0000000000a2');
do $$
declare c uuid; b uuid := (select id from public.dir_businesses where slug = 'claimable-test-shop');
begin
  insert into public.business_claims (business_id, claimant_name, status) values (b, 'Rita Rival', 'approved') returning id into c;
  perform pg_temp.ok('claim starts pending', (select status from public.business_claims where id = c) = 'pending');
  perform pg_temp.ok('claimant has no access before approval', not public.biz_is_owner(b));
  perform set_config('test.claim', c::text, true);
end $$;
select pg_temp.act('00000000-0000-4000-8000-0000000000a4');
update public.business_claims set status = 'approved' where id = current_setting('test.claim')::uuid;
select pg_temp.act('00000000-0000-4000-8000-0000000000a2');
select pg_temp.ok('approved claim grants access', public.biz_is_owner((select business_id from public.business_claims where id = current_setting('test.claim')::uuid)));

-- ---------- 7. Public enquiries, reports and analytics ----------
select pg_temp.act(null);
do $$
begin
  insert into public.business_enquiries (business_id, name, phone, message) values (current_setting('test.b')::uuid, 'Test Customer', '0712345678', 'Do you make birthday cakes?');
  perform pg_temp.ok('public can send an enquiry', true);
  perform public.biz_track(current_setting('test.b')::uuid, 'view', 'session-1');
  perform public.biz_track(current_setting('test.b')::uuid, 'view', 'session-1');
  insert into public.business_reports (business_id, reason, details) values (current_setting('test.b')::uuid, 'incorrect_information', 'Wrong town');
  perform pg_temp.ok('public can report a listing', true);
exception when others then perform pg_temp.ok('public enquiry / report / tracking', false, sqlerrm);
end $$;
select pg_temp.act('00000000-0000-4000-8000-0000000000a1');
select pg_temp.ok('owner sees the enquiry', (select count(*) from public.business_enquiries where business_id = current_setting('test.b')::uuid) = 1);
select pg_temp.ok('duplicate views counted once', (select sum(total) from public.biz_stats(current_setting('test.b')::uuid, current_date - 1, current_date + 1) where event = 'view') = 1);
select pg_temp.act('00000000-0000-4000-8000-0000000000a2');
do $$
begin
  perform public.biz_stats(current_setting('test.b')::uuid, current_date - 1, current_date + 1);
  perform pg_temp.ok('other user cannot read stats', false);
exception when others then perform pg_temp.ok('other user cannot read stats', true, sqlerrm);
end $$;
select pg_temp.ok('other user cannot read enquiries', (select count(*) from public.business_enquiries where business_id = current_setting('test.b')::uuid) = 0);

-- ---------- Report ----------
reset role;
do $$
declare total int; bad text;
begin
  select count(*), string_agg(case when not ok then n || '. ' || name || coalesce(' (' || detail || ')', '') end, E'\n') into total, bad from _t;
  if bad is null then raise exception 'ALL % CHECKS PASSED', total;
  else raise exception E'FAILED CHECKS (of %):\n%', total, bad; end if;
end $$;
rollback;
