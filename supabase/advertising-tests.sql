-- =============================================================
--  IMMA News advertising — automated checks (changes nothing)
--  Creates throw-away test users and campaigns, checks the rules,
--  then deliberately raises an error so EVERYTHING is rolled back.
--  Run in the SQL Editor; the error message is the test report.
-- =============================================================
do $$
declare
  ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); um uuid := gen_random_uuid();
  adv_a uuid; adv_b uuid; c1 uuid; c2 uuid; cr1 uuid; pay uuid; n int; t text; ok boolean; j json;
  rep text := '';
  procedure_ok boolean;
  tomorrow date := (now() at time zone 'Africa/Nairobi')::date + 1;
  today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  -- helpers via set_config: role + JWT subject
  insert into auth.users (id, email, aud, role) values (ua, 'test-a@example.invalid', 'authenticated', 'authenticated'),
    (ub, 'test-b@example.invalid', 'authenticated', 'authenticated'), (um, 'test-m@example.invalid', 'authenticated', 'authenticated');
  update public.profiles set role = 'admin' where id = um;

  -- ===== Advertiser A registers =====
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  insert into public.advertisers (user_id, business_name, contact_name, email, phone, terms_accepted_at, is_blocked)
    values (ua, 'Test Bakery A', 'Alice Test', 'a@example.invalid', '0700000001', now(), true) returning id into adv_a;
  select is_blocked into ok from public.advertisers where id = adv_a;
  rep := rep || E'\n01 advertiser cannot self-set blocked flag: ' || case when ok then 'FAIL' else 'PASS' end;

  -- campaign with a tampered price
  insert into public.ad_campaigns (advertiser_id, name, placement_key, start_date, months, total_kes, status, payment_status, complimentary, priority)
    values (adv_a, 'A sidebar', 'sidebar', tomorrow, 2, 1, 'approved', 'paid', true, 99) returning id into c1;
  select total_kes::text || '/' || status || '/' || payment_status || '/' || complimentary || '/' || priority into t from public.ad_campaigns where id = c1;
  rep := rep || E'\n02 price & status forced by server (expect 30000.00/draft/unpaid/false/0): ' || t;

  insert into public.ad_creatives (campaign_id, image_path, destination_url, status)
    values (c1, ua::text || '/c/desktop.png', 'https://example.com', 'approved') returning id into cr1;
  select status into t from public.ad_creatives where id = cr1;
  rep := rep || E'\n03 creative forced to pending: ' || case when t = 'pending' then 'PASS' else 'FAIL ' || t end;

  begin
    insert into public.ad_creatives (campaign_id, image_path, destination_url) values (c1, ub::text || '/x.png', 'https://example.com');
    rep := rep || E'\n04 image from another user''s folder blocked: FAIL';
  exception when others then rep := rep || E'\n04 image from another user''s folder blocked: PASS';
  end;
  begin
    insert into public.ad_creatives (campaign_id, image_path, destination_url) values (c1, ua::text || '/x.png', 'javascript:alert(1)');
    rep := rep || E'\n05 javascript: link blocked: FAIL';
  exception when others then rep := rep || E'\n05 javascript: link blocked: PASS';
  end;

  update public.ad_campaigns set status = 'submitted' where id = c1;
  select count(*) into n from public.ad_invoices where campaign_id = c1;
  rep := rep || E'\n06 submit creates invoice: ' || case when n = 1 then 'PASS' else 'FAIL' end;

  begin
    update public.ad_campaigns set payment_status = 'paid' where id = c1;
    rep := rep || E'\n07 advertiser cannot mark own campaign paid: FAIL';
  exception when others then rep := rep || E'\n07 advertiser cannot mark own campaign paid: PASS';
  end;

  -- ===== Advertiser B cannot see or touch A =====
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  select count(*) into n from public.ad_campaigns where id = c1;
  rep := rep || E'\n08 other advertiser cannot see campaign: ' || case when n = 0 then 'PASS' else 'FAIL' end;
  select count(*) into n from public.ad_invoices where campaign_id = c1;
  rep := rep || E'\n09 other advertiser cannot see invoice: ' || case when n = 0 then 'PASS' else 'FAIL' end;
  insert into public.advertisers (user_id, business_name, contact_name, email, phone, terms_accepted_at)
    values (ub, 'Test Shop B', 'Bob Test', 'b@example.invalid', '0700000002', now()) returning id into adv_b;
  begin
    insert into public.ad_payments (campaign_id, method, reference, amount_kes) values (c1, 'mpesa_manual', 'FAKEREF1', 30000);
    rep := rep || E'\n10 other advertiser cannot report payment: FAIL';
  exception when others then rep := rep || E'\n10 other advertiser cannot report payment: PASS';
  end;
  begin
    update public.profiles set role = 'admin' where id = ub;
    select role into t from public.profiles where id = ub;
    rep := rep || E'\n11 reader cannot promote self to admin: ' || case when t = 'admin' then 'FAIL' else 'PASS' end;
  exception when others then rep := rep || E'\n11 reader cannot promote self to admin: PASS';
  end;
  select count(*) into n from public.ad_impressions;
  rep := rep || E'\n12 advertiser cannot read raw impressions: ' || case when n = 0 then 'PASS' else 'FAIL' end;

  -- ===== Admin approves =====
  perform set_config('request.jwt.claims', json_build_object('sub', um, 'role', 'authenticated')::text, true);
  update public.ad_creatives set status = 'approved' where campaign_id = c1;
  update public.ad_campaigns set status = 'approved' where id = c1;
  select status into t from public.ad_campaigns where id = c1;
  rep := rep || E'\n13 admin approves: ' || case when t = 'approved' then 'PASS' else 'FAIL ' || t end;

  -- not live while unpaid (and start date is tomorrow)
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  j := public.ad_get_live();
  select count(*) into n from json_array_elements(j -> 'ads') e where e ->> 'campaign' = c1::text;
  rep := rep || E'\n14 unpaid approved advert not served: ' || case when n = 0 then 'PASS' else 'FAIL' end;

  -- ===== A reports payment, admin confirms =====
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  insert into public.ad_payments (campaign_id, method, reference, amount_kes, status) values (c1, 'mpesa_manual', 'tst123abc', 30000, 'confirmed') returning id into pay;
  select status into t from public.ad_payments where id = pay;
  rep := rep || E'\n15 advertiser payment starts unverified: ' || case when t = 'pending_verification' then 'PASS' else 'FAIL ' || t end;
  select payment_status into t from public.ad_campaigns where id = c1;
  rep := rep || E'\n16 campaign shows payment being checked: ' || case when t = 'pending_verification' then 'PASS' else 'FAIL ' || t end;
  begin
    insert into public.ad_payments (campaign_id, method, reference, amount_kes) values (c1, 'mpesa_manual', 'TST123ABC', 30000);
    rep := rep || E'\n17 duplicate M-Pesa reference refused: FAIL';
  exception when others then rep := rep || E'\n17 duplicate M-Pesa reference refused: PASS';
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', um, 'role', 'authenticated')::text, true);
  update public.ad_payments set status = 'confirmed' where id = pay;
  select payment_status into t from public.ad_campaigns where id = c1;
  rep := rep || E'\n18 confirming payment marks campaign paid: ' || case when t = 'paid' then 'PASS' else 'FAIL ' || t end;
  select status || '/' || coalesce(receipt_number, 'none') into t from public.ad_invoices where campaign_id = c1;
  rep := rep || E'\n19 invoice paid + receipt number: ' || t;

  update public.ad_campaigns set start_date = today where id = c1;   -- bring it live today
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  j := public.ad_get_live();
  select count(*) into n from json_array_elements(j -> 'ads') e where e ->> 'campaign' = c1::text;
  rep := rep || E'\n20 approved + paid advert served today: ' || case when n = 1 then 'PASS' else 'FAIL' end;

  -- ===== Tracking and fraud filters =====
  perform set_config('request.headers', '{"user-agent":"Mozilla/5.0 (Windows NT 10.0)","x-forwarded-for":"203.0.113.9"}', true);
  rep := rep || E'\n21 first view counted: ' || public.ad_track(cr1, 'impression', 'sessionAAAAAAAAAAAAAAAA', 'desktop');
  rep := rep || E'\n22 repeat view in 30 min ignored (expect false): ' || public.ad_track(cr1, 'impression', 'sessionAAAAAAAAAAAAAAAA', 'desktop');
  rep := rep || E'\n23 click without a view ignored (expect false): ' || public.ad_track(cr1, 'click', 'sessionBBBBBBBBBBBBBBBB', 'mobile');
  rep := rep || E'\n24 click after view counted: ' || public.ad_track(cr1, 'click', 'sessionAAAAAAAAAAAAAAAA', 'desktop');
  rep := rep || E'\n25 repeat click ignored (expect false): ' || public.ad_track(cr1, 'click', 'sessionAAAAAAAAAAAAAAAA', 'desktop');
  perform set_config('request.headers', '{"user-agent":"Googlebot/2.1","x-forwarded-for":"203.0.113.10"}', true);
  rep := rep || E'\n26 bot view ignored (expect false): ' || public.ad_track(cr1, 'impression', 'sessionCCCCCCCCCCCCCCCC', 'desktop');

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  select coalesce(sum(impressions), 0)::text || ' views / ' || coalesce(sum(clicks), 0)::text || ' clicks' into t from public.ad_stats(today - 1, today + 1, null);
  rep := rep || E'\n27 owner stats (expect 1 views / 1 clicks): ' || t;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  select count(*) into n from public.ad_stats(today - 1, today + 1, c1);
  rep := rep || E'\n28 other advertiser gets no stats: ' || case when n = 0 then 'PASS' else 'FAIL' end;

  -- ===== Inventory: sidebar holds 4; A has 1, so B can book 3 more, the 5th is refused =====
  for i in 1..3 loop
    insert into public.ad_campaigns (advertiser_id, name, placement_key, start_date, status) values (adv_b, 'B sidebar ' || i, 'sidebar', today + 2, 'submitted');
  end loop;
  begin
    insert into public.ad_campaigns (advertiser_id, name, placement_key, start_date, status) values (adv_b, 'B sidebar 4', 'sidebar', today + 2, 'submitted');
    rep := rep || E'\n29 overbooking refused: FAIL';
  exception when others then rep := rep || E'\n29 overbooking refused: PASS (' || left(sqlerrm, 60) || ')';
  end;
  select (public.ad_check_availability('sidebar', today + 2, 1, null) ->> 'available') into t;
  rep := rep || E'\n30 availability check says full (expect false): ' || t;

  -- ===== Discount code =====
  perform set_config('request.jwt.claims', json_build_object('sub', um, 'role', 'authenticated')::text, true);
  insert into public.ad_discount_codes (code, percent_off) values ('TESTTEN', 10);
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  insert into public.ad_campaigns (advertiser_id, name, placement_key, start_date, discount_code) values (adv_b, 'B footer', 'footer_banner', today + 2, 'testten') returning id into c2;
  select list_price_kes || ' - ' || discount_kes || ' = ' || total_kes into t from public.ad_campaigns where id = c2;
  rep := rep || E'\n31 10% code on KSh 5,000 (expect 5000.00 - 500.00 = 4500.00): ' || t;
  begin
    insert into public.ad_campaigns (advertiser_id, name, placement_key, start_date, discount_code) values (adv_b, 'B bad code', 'footer_banner', today + 2, 'NOPE');
    rep := rep || E'\n32 invalid code refused: FAIL';
  exception when others then rep := rep || E'\n32 invalid code refused: PASS';
  end;
  begin
    insert into public.ad_campaigns (advertiser_id, name, placement_key, start_date) values (adv_b, 'B past', 'footer_banner', today - 3);
    rep := rep || E'\n33 past start date refused: FAIL';
  exception when others then rep := rep || E'\n33 past start date refused: PASS';
  end;

  -- ===== Expiry, notifications, blocking =====
  perform set_config('request.jwt.claims', json_build_object('sub', um, 'role', 'authenticated')::text, true);
  update public.ad_campaigns set start_date = today - 70, months = 1 where id = c1;
  j := public.ad_run_schedule();
  select status into t from public.ad_campaigns where id = c1;
  rep := rep || E'\n34 finished campaign expires: ' || case when t = 'expired' then 'PASS' else 'FAIL ' || t end;
  select count(*) into n from public.ad_notifications where user_id = ua;
  rep := rep || E'\n35 advertiser notifications created: ' || n;
  update public.advertisers set is_blocked = true, blocked_reason = 'test' where id = adv_b;
  perform set_config('request.jwt.claims', json_build_object('sub', ub, 'role', 'authenticated')::text, true);
  begin
    insert into public.ad_campaigns (advertiser_id, name, placement_key, start_date) values (adv_b, 'B blocked', 'footer_banner', today + 5);
    rep := rep || E'\n36 blocked advertiser cannot book: FAIL';
  exception when others then rep := rep || E'\n36 blocked advertiser cannot book: PASS';
  end;
  select count(*) into n from public.ad_audit_logs where actor_id = um;
  rep := rep || E'\n37 admin actions in audit log: ' || n;

  -- ===== Public enquiry =====
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  insert into public.ad_enquiries (name, phone, message) values ('Test Person', '0700000003', 'Testing the enquiry form');
  rep := rep || E'\n38 anonymous enquiry accepted: PASS';
  begin
    perform count(*) from public.ad_enquiries;
    get diagnostics n = row_count;
    select count(*) into n from public.ad_enquiries;
    rep := rep || E'\n39 public cannot read enquiries: ' || case when n = 0 then 'PASS' else 'FAIL' end;
  exception when others then rep := rep || E'\n39 public cannot read enquiries: PASS';
  end;

  raise exception 'TEST REPORT (all changes rolled back):%', rep;
end $$;
