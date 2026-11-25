-- IMMA News footer + newsletter — automated checks (rolls everything back; the error message is the report)
do $$
declare ua uuid := gen_random_uuid(); um uuid := gen_random_uuid(); n int; t text; j json; tok uuid; rep text := ''; i int;
begin
  insert into auth.users (id, email, aud, role) values (ua, 'ft-a@example.invalid', 'authenticated', 'authenticated'), (um, 'ft-m@example.invalid', 'authenticated', 'authenticated');
  update public.profiles set role = 'admin' where id = um;
  delete from public.newsletter_attempts;

  -- ---------- Public visitor ----------
  perform set_config('role', 'anon', true); perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.site_settings;
  rep := rep || E'\n01 public can read footer settings (rows): ' || n;
  begin
    insert into public.site_settings (key, value) values ('footer', '{"tagline":"Hacked"}');
    rep := rep || E'\n02 public cannot change footer: FAIL';
  exception when others then rep := rep || E'\n02 public cannot change footer: PASS';
  end;
  begin
    select count(*) into n from public.newsletter_subscribers;
    rep := rep || E'\n03 public cannot read subscribers: ' || case when n = 0 then 'PASS (0 rows)' else 'FAIL' end;
  exception when insufficient_privilege then rep := rep || E'\n03 public cannot read subscribers: PASS (permission denied)';
  end;
  begin
    insert into public.newsletter_subscribers (email, consent, consent_text) values ('x@example.com', true, 'x');
    rep := rep || E'\n04 public cannot insert into subscribers directly: FAIL';
  exception when others then rep := rep || E'\n04 public cannot insert into subscribers directly: PASS';
  end;

  j := public.newsletter_subscribe('  Test.Reader@Example.com ', true, '/index.html', '');
  rep := rep || E'\n05 subscribe: ' || case when j ->> 'status' = 'subscribed' and j ->> 'token' is not null then 'PASS' else 'FAIL ' || j::text end;
  tok := (j ->> 'token')::uuid;
  j := public.newsletter_subscribe('test.reader@example.com', true, '/about.html', '');
  rep := rep || E'\n06 duplicate detected (case-insensitive): ' || case when j ->> 'status' = 'already' and j ->> 'token' is null then 'PASS' else 'FAIL ' || j::text end;
  begin
    j := public.newsletter_subscribe('not-an-email', true, '/', '');
    rep := rep || E'\n07 invalid email refused: FAIL';
  exception when others then rep := rep || E'\n07 invalid email refused: ' || case when sqlerrm = 'invalid_email' then 'PASS' else 'FAIL ' || sqlerrm end;
  end;
  begin
    j := public.newsletter_subscribe('<script>@x.com', true, '/', '');
    rep := rep || E'\n08 markup in email refused: FAIL';
  exception when others then rep := rep || E'\n08 markup in email refused: ' || case when sqlerrm = 'invalid_email' then 'PASS' else 'FAIL ' || sqlerrm end;
  end;
  begin
    j := public.newsletter_subscribe('noconsent@example.com', false, '/', '');
    rep := rep || E'\n09 consent required: FAIL';
  exception when others then rep := rep || E'\n09 consent required: ' || case when sqlerrm = 'consent_required' then 'PASS' else 'FAIL ' || sqlerrm end;
  end;
  j := public.newsletter_subscribe('bot@example.com', true, '/', 'http://spam.example');
  reset role;
  select count(*) into n from public.newsletter_subscribers where email = 'bot@example.com';
  rep := rep || E'\n10 honeypot sign-up not stored: ' || case when n = 0 then 'PASS' else 'FAIL' end;
  select consent_text into t from public.newsletter_subscribers where email = 'test.reader@example.com';
  rep := rep || E'\n11 consent wording stored: ' || case when t like 'I agree%' then 'PASS' else 'FAIL' end;

  perform set_config('role', 'anon', true);
  j := public.newsletter_unsubscribe(tok, null);
  reset role;
  select status into t from public.newsletter_subscribers where email = 'test.reader@example.com';
  rep := rep || E'\n12 unsubscribe by link: ' || case when t = 'unsubscribed' then 'PASS' else 'FAIL ' || t end;
  perform set_config('role', 'anon', true);
  j := public.newsletter_subscribe('test.reader@example.com', true, '/', '');
  rep := rep || E'\n13 resubscribe: ' || case when j ->> 'status' = 'resubscribed' then 'PASS' else 'FAIL ' || j::text end;
  j := public.newsletter_unsubscribe(null, 'TEST.reader@example.com');
  j := public.newsletter_unsubscribe(null, 'nobody-here@example.com');
  rep := rep || E'\n14 unknown address gives the same answer: ' || case when j ->> 'status' = 'unsubscribed' then 'PASS' else 'FAIL' end;
  reset role;
  select status into t from public.newsletter_subscribers where email = 'test.reader@example.com';
  rep := rep || E'\n15 unsubscribe by email: ' || case when t = 'unsubscribed' then 'PASS' else 'FAIL ' || t end;

  -- Rate limit: 10 attempts per hour from one connection
  perform set_config('request.headers', '{"x-forwarded-for":"203.0.113.9"}', true);
  perform set_config('role', 'anon', true);
  begin
    for i in 1..11 loop j := public.newsletter_subscribe('rate' || i || '@example.com', true, '/', ''); end loop;
    rep := rep || E'\n16 rate limit after 10 attempts: FAIL';
  exception when others then rep := rep || E'\n16 rate limit after 10 attempts: ' || case when sqlerrm = 'rate_limited' then 'PASS' else 'FAIL ' || sqlerrm end;
  end;
  perform set_config('request.headers', '{}', true);

  -- ---------- Signed-in reader (not admin) ----------
  perform set_config('role', 'authenticated', true); perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  begin
    insert into public.site_settings (key, value) values ('footer', '{"tagline":"Hacked"}');
    rep := rep || E'\n17 reader cannot change footer: FAIL';
  exception when others then rep := rep || E'\n17 reader cannot change footer: PASS';
  end;
  select count(*) into n from public.newsletter_subscribers;
  rep := rep || E'\n18 reader cannot see subscribers: ' || case when n = 0 then 'PASS' else 'FAIL' end;

  -- ---------- Administrator ----------
  perform set_config('request.jwt.claims', json_build_object('sub', um, 'role', 'authenticated')::text, true);
  insert into public.site_settings (key, value) values ('footer', '{"tagline":"Test","newsletter":{"enabled":false}}')
    on conflict (key) do update set value = excluded.value;
  select count(*) into n from public.site_settings where key = 'footer' and updated_by = um;
  rep := rep || E'\n19 admin can save footer (stamped with admin id): ' || case when n = 1 then 'PASS' else 'FAIL' end;
  select count(*) into n from public.newsletter_subscribers;
  rep := rep || E'\n20 admin can see subscribers: ' || case when n >= 1 then 'PASS (' || n || ')' else 'FAIL' end;
  reset role;
  select count(*) into n from public.ad_audit_logs where entity = 'site_settings' and actor_id = um;
  rep := rep || E'\n21 footer change written to audit log: ' || case when n >= 1 then 'PASS' else 'FAIL' end;

  perform set_config('role', 'anon', true); perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    j := public.newsletter_subscribe('closed@example.com', true, '/', '');
    rep := rep || E'\n22 sign-up refused when newsletter switched off: FAIL';
  exception when others then rep := rep || E'\n22 sign-up refused when newsletter switched off: ' || case when sqlerrm = 'newsletter_closed' then 'PASS' else 'FAIL ' || sqlerrm end;
  end;
  begin
    reset role;
    insert into public.site_settings (key, value) values ('Bad Key!', '{}');
    rep := rep || E'\n23 invalid settings key refused: FAIL';
  exception when others then rep := rep || E'\n23 invalid settings key refused: PASS';
  end;

  raise exception 'FOOTER TEST REPORT (rolled back):%', rep;
end $$;
