-- IMMA News resource centre — automated checks (rolls everything back; the error message is the report)
do $$
declare ua uuid := gen_random_uuid(); um uuid := gen_random_uuid(); n int; t text; rep text := ''; rid uuid;
  today date := (now() at time zone 'Africa/Nairobi')::date; j json;
begin
  insert into auth.users (id, email, aud, role) values (ua, 'res-a@example.invalid', 'authenticated', 'authenticated'), (um, 'res-m@example.invalid', 'authenticated', 'authenticated');
  update public.profiles set role = 'admin' where id = um;

  -- Public (anon) can read published content only
  perform set_config('role', 'anon', true); perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.public_resources;
  rep := rep || E'\n01 public sees published resources: ' || n;
  select count(*) into n from public.public_resources where status <> 'published';
  rep := rep || E'\n02 public sees no drafts/archived: ' || case when n = 0 then 'PASS' else 'FAIL' end;
  select count(*) into n from public.emergency_contacts;
  rep := rep || E'\n03 emergency numbers readable without sign-in: ' || n;
  begin
    select count(*) into n from public.resource_update_logs;
    rep := rep || E'\n04 public cannot read change log: ' || case when n = 0 then 'PASS' else 'FAIL' end;
  exception when insufficient_privilege then rep := rep || E'\n04 public cannot read change log: PASS (permission denied)';
  end;
  begin
    insert into public.public_notices (title, summary, source_name, source_url, status) values ('x', 'y', 'z', 'https://example.com', 'published');
    rep := rep || E'\n05 public cannot add notices: FAIL';
  exception when others then rep := rep || E'\n05 public cannot add notices: PASS';
  end;

  -- Signed-in non-admin cannot edit
  perform set_config('role', 'authenticated', true); perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  update public.public_resources set title = 'Hacked' where slug = 'kra-pin';
  get diagnostics n = row_count;
  rep := rep || E'\n06 reader cannot edit resources: ' || case when n = 0 then 'PASS' else 'FAIL' end;
  update public.emergency_contacts set number = '000' where number = '999';
  get diagnostics n = row_count;
  rep := rep || E'\n07 reader cannot change emergency numbers: ' || case when n = 0 then 'PASS' else 'FAIL' end;

  -- Admin can add, publish, archive; changes are logged
  perform set_config('request.jwt.claims', json_build_object('sub', um, 'role', 'authenticated')::text, true);
  insert into public.public_resources (slug, category_slug, title, summary, source_name, source_url, status, last_verified, next_review, verification_status)
    values ('test-guide', 'public-services', 'Test guide', 'Test', 'Test source', 'https://example.com', 'draft', today - 200, today - 10, 'verified') returning id into rid;
  update public.public_resources set status = 'published' where id = rid;
  select count(*) into n from public.resource_update_logs where row_id = rid::text;
  rep := rep || E'\n08 admin add + publish logged (expect 2): ' || n;
  begin
    insert into public.public_resources (slug, category_slug, title, summary, source_name, source_url) values ('bad-link', 'public-services', 'Bad', 'x', 'x', 'javascript:alert(1)');
    rep := rep || E'\n09 non-https source link refused: FAIL';
  exception when others then rep := rep || E'\n09 non-https source link refused: PASS';
  end;

  -- Housekeeping flags stale items and hides expired notices / closes scholarships
  insert into public.public_notices (title, summary, source_name, source_url, starts_at, ends_at, status) values ('Old notice test', 's', 'x', 'https://example.com', today - 30, today - 1, 'published');
  insert into public.scholarships (name, institution, country, eligibility, url, deadline, open_status, status) values ('Test scholarship', 'X', 'Y', 'Z', 'https://example.com', today - 1, 'open', 'published');
  j := public.resource_housekeeping();
  select verification_status into t from public.public_resources where id = rid;
  rep := rep || E'\n10 stale resource flagged needs_review: ' || case when t = 'needs_review' then 'PASS' else 'FAIL ' || t end;
  select status into t from public.public_notices where title = 'Old notice test';
  rep := rep || E'\n11 expired notice archived: ' || case when t = 'archived' then 'PASS' else 'FAIL ' || t end;
  select open_status into t from public.scholarships where name = 'Test scholarship';
  rep := rep || E'\n12 past-deadline scholarship closed: ' || case when t = 'closed' then 'PASS' else 'FAIL ' || t end;
  rep := rep || E'\n13 housekeeping report: ' || j::text;

  -- Pending (automated) notices are not public until approved
  insert into public.public_notices (title, summary, source_name, source_url, origin, status, external_id) values ('Auto test', 's', 'ReliefWeb', 'https://reliefweb.int', 'automated', 'pending', 'rw-test');
  perform set_config('role', 'anon', true); perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.public_notices where title = 'Auto test';
  rep := rep || E'\n14 pending automated notice hidden from public: ' || case when n = 0 then 'PASS' else 'FAIL' end;
  select count(*) into n from public.fuel_prices where town = 'Nairobi' and cycle_start = '2026-11-15';
  rep := rep || E'\n15 current Nairobi fuel price public: ' || case when n = 1 then 'PASS' else 'FAIL' end;

  raise exception 'RESOURCE TEST REPORT (rolled back):%', rep;
end $$;
