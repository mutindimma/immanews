-- =============================================================
--  IMMA News — Direct advertising system (Supabase migration)
--  Run AFTER setup.sql: SQL Editor → New query → paste → Run.
--  Safe to run again: it creates what is missing and replaces functions.
--
--  Money rule: a campaign only goes live when an ADMIN has approved it
--  AND its payment is confirmed (or an admin marked it complimentary).
--  Prices are always calculated here, never trusted from the browser.
-- =============================================================

-- ---------- Roles ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Settings (editable by admins, readable by everyone) ----------
create table if not exists public.ad_settings (
  key        text primary key,
  value      text not null default '',
  label      text,
  is_public  boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.ad_settings (key, value, label) values
  ('payment_instructions', 'After your campaign is approved, IMMA Media will send you payment details by WhatsApp or phone. Then enter your M-Pesa confirmation code or bank reference here so we can verify it.', 'Payment instructions shown to advertisers'),
  ('mpesa_paybill', '', 'M-Pesa Paybill / Till number (leave empty to hide)'),
  ('mpesa_account', '', 'M-Pesa account number to quote (optional)'),
  ('bank_details', '', 'Bank transfer details (leave empty to hide)'),
  ('invoice_footer', 'IMMA Media · Nairobi, Kenya · +254 785 887 830', 'Text printed at the bottom of invoices'),
  ('vat_note', 'Prices are in Kenya shillings (KES).', 'Tax note printed on invoices'),
  ('ads_enabled', 'true', 'Show adverts on the site (true/false)')
on conflict (key) do nothing;

-- ---------- Placements ----------
create table if not exists public.ad_placements (
  key            text primary key,
  name           text not null,
  description    text,
  width          int  not null,
  height         int  not null,
  mobile_width   int,
  mobile_height  int,
  price_kes      numeric(12,2) not null check (price_kes >= 0),
  price_unit     text not null default 'month' check (price_unit in ('month', 'article')),
  max_concurrent int  not null default 3 check (max_concurrent > 0),   -- adverts that can rotate at once
  house_when_vacant boolean not null default true,                    -- show the IMMA promo when empty
  is_active      boolean not null default true,
  sort_order     int not null default 0
);
insert into public.ad_placements (key, name, description, width, height, mobile_width, mobile_height, price_kes, price_unit, max_concurrent, house_when_vacant, sort_order) values
  ('top_leaderboard',  'Top leaderboard',             'Across the top of the homepage, under the menu.',        970,  90, 320, 100, 30000, 'month',   3, true,  1),
  ('home_premium',     'Homepage premium banner',     'Large banner between the top stories and Latest Stories.', 970, 250, 320, 100, 50000, 'month',   2, false, 2),
  ('sidebar',          'Sidebar advertisement',       'Box in the right-hand column, next to the news.',       300, 250, null, null, 15000, 'month',   4, true,  3),
  ('sidebar_large',    'Large sidebar advertisement', 'Tall unit lower in the right-hand column.',               300, 600, null, null, 25000, 'month',   2, false, 4),
  ('in_article',       'In-article advertisement',    'Inside stories, after the opening paragraphs.',          728,  90, 320, 100, 10000, 'month',   4, true,  5),
  ('category_banner',  'Category page banner',        'At the top of a news section such as Sports or Kenya.',  728,  90, 320, 100, 15000, 'month',   2, true,  6),
  ('footer_banner',    'Footer banner',               'Above the footer on every page.',                        728,  90, 320, 100,  5000, 'month',   4, true,  7),
  ('mobile_banner',    'Mobile banner',               'Shown at the top of the page on phones.',                320, 100, 320, 100, 10000, 'month',   3, true,  8),
  ('sponsored_article','Sponsored article',           'A story in the news feed, clearly labelled Sponsored Content.', 0, 0, null, null, 10000, 'article', 4, false, 9)
on conflict (key) do nothing;

-- ---------- Packages ----------
create table if not exists public.ad_packages (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  price_kes       numeric(12,2) not null check (price_kes >= 0),
  duration_months int  not null default 1 check (duration_months between 1 and 12),
  placement_keys  text[] not null,                 -- the advertiser picks one of these
  sponsored_articles int not null default 0 check (sponsored_articles >= 0),
  benefits        text[] not null default '{}',
  highlight       boolean not null default false,
  is_available    boolean not null default true,
  sort_order      int not null default 0
);
insert into public.ad_packages (slug, name, price_kes, placement_keys, sponsored_articles, benefits, highlight, sort_order) values
  ('starter',   'Starter',   5000,  array['footer_banner'], 0,
     array['Footer banner advertisement', 'Basic performance reporting (views and clicks)'], false, 1),
  ('business',  'Business',  15000, array['sidebar', 'category_banner'], 1,
     array['Sidebar or category page advertisement', 'One sponsored article', 'Advertisement performance reporting'], false, 2),
  ('premium',   'Premium',   30000, array['top_leaderboard'], 2,
     array['Homepage leaderboard advertisement', 'Two sponsored articles', 'Priority advertisement placement', 'Detailed performance reporting'], true, 3),
  ('corporate', 'Corporate', 60000, array['home_premium', 'category_banner'], 4,
     array['Premium homepage advertisement', 'Category sponsorship', 'Four sponsored articles', 'Priority placement', 'Custom campaign reporting'], false, 4)
on conflict (slug) do nothing;

-- ---------- Advertisers ----------
create table if not exists public.advertisers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users (id) on delete set null,   -- null = created by an admin
  business_name    text not null check (char_length(business_name) between 2 and 120),
  contact_name     text not null check (char_length(contact_name) between 2 and 120),
  email            text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone            text not null check (char_length(phone) between 7 and 20),
  website          text check (website is null or website ~* '^https?://'),
  category         text,
  billing_name     text,
  billing_address  text,
  kra_pin          text,
  logo_path        text,
  terms_accepted_at timestamptz,
  is_blocked       boolean not null default false,
  blocked_reason   text,
  admin_notes      text,
  created_at       timestamptz not null default now()
);

-- ---------- Discount codes ----------
create table if not exists public.ad_discount_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null check (code = upper(code) and char_length(code) between 3 and 30),
  description text,
  percent_off numeric(5,2) check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
  amount_off  numeric(12,2) check (amount_off is null or amount_off > 0),
  valid_from  date,
  valid_to    date,
  max_uses    int,
  times_used  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  check ((percent_off is null) <> (amount_off is null))
);

-- ---------- Campaigns ----------
create table if not exists public.ad_campaigns (
  id             uuid primary key default gen_random_uuid(),
  advertiser_id  uuid references public.advertisers (id) on delete cascade,     -- null for IMMA house adverts
  name           text not null check (char_length(name) between 2 and 120),
  kind           text not null default 'display' check (kind in ('display', 'sponsored')),
  package_id     uuid references public.ad_packages (id),
  parent_id      uuid references public.ad_campaigns (id) on delete set null,    -- sponsored article included in a package
  renewed_from   uuid references public.ad_campaigns (id) on delete set null,
  placement_key  text not null references public.ad_placements (key),
  categories     text[],                                                        -- null = every section
  start_date     date not null,
  months         int  not null default 1 check (months between 1 and 12),
  end_date       date,
  list_price_kes numeric(12,2),
  discount_code  text,
  discount_kes   numeric(12,2) not null default 0,
  total_kes      numeric(12,2),
  status         text not null default 'draft'
                 check (status in ('draft', 'submitted', 'approved', 'rejected', 'paused', 'terminated', 'expired')),
  payment_status text not null default 'unpaid'
                 check (payment_status in ('unpaid', 'pending_verification', 'paid', 'waived')),
  complimentary  boolean not null default false,
  is_house       boolean not null default false,       -- IMMA Media's own promotions
  priority       int not null default 0,               -- higher shows first in rotation
  weight         int not null default 1 check (weight between 1 and 100),
  rejection_reason text,
  approved_by    uuid references auth.users (id),
  approved_at    timestamptz,
  submitted_at   timestamptz,
  created_by     uuid default auth.uid() references auth.users (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists ad_campaigns_live_idx on public.ad_campaigns (placement_key, status, start_date, end_date);
create index if not exists ad_campaigns_adv_idx on public.ad_campaigns (advertiser_id);

-- ---------- Creatives (artwork, or the text of a sponsored article) ----------
create table if not exists public.ad_creatives (
  id                uuid primary key default gen_random_uuid(),
  campaign_id       uuid not null references public.ad_campaigns (id) on delete cascade,
  image_path        text,                 -- path inside the "ad-creatives" storage bucket
  mobile_image_path text,
  alt_text          text check (alt_text is null or char_length(alt_text) <= 200),
  destination_url   text check (destination_url is null or destination_url ~* '^https?://[^\s<>"]+$'),
  headline          text check (headline is null or char_length(headline) <= 140),
  body              text check (body is null or char_length(body) <= 12000),
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note       text,
  created_at        timestamptz not null default now()
);
create index if not exists ad_creatives_campaign_idx on public.ad_creatives (campaign_id);

-- ---------- Analytics ----------
create table if not exists public.ad_impressions (
  id            bigint generated always as identity primary key,
  creative_id   uuid not null references public.ad_creatives (id) on delete cascade,
  campaign_id   uuid not null references public.ad_campaigns (id) on delete cascade,
  placement_key text not null,
  device        text not null check (device in ('desktop', 'mobile')),
  session_hash  text not null,
  ip_hash       text,
  day           date not null default (now() at time zone 'Africa/Nairobi')::date,
  created_at    timestamptz not null default now()
);
create index if not exists ad_impr_dedupe_idx on public.ad_impressions (creative_id, session_hash, created_at);
create index if not exists ad_impr_campaign_day_idx on public.ad_impressions (campaign_id, day);
create index if not exists ad_impr_ip_idx on public.ad_impressions (ip_hash, day);

create table if not exists public.ad_clicks (
  id            bigint generated always as identity primary key,
  creative_id   uuid not null references public.ad_creatives (id) on delete cascade,
  campaign_id   uuid not null references public.ad_campaigns (id) on delete cascade,
  placement_key text not null,
  device        text not null check (device in ('desktop', 'mobile')),
  session_hash  text not null,
  ip_hash       text,
  day           date not null default (now() at time zone 'Africa/Nairobi')::date,
  created_at    timestamptz not null default now()
);
create index if not exists ad_clicks_dedupe_idx on public.ad_clicks (creative_id, session_hash, day);
create index if not exists ad_clicks_campaign_day_idx on public.ad_clicks (campaign_id, day);
create index if not exists ad_clicks_ip_idx on public.ad_clicks (ip_hash, day);

-- ---------- Invoices and payments ----------
create sequence if not exists public.ad_invoice_seq;
create table if not exists public.ad_invoices (
  id            uuid primary key default gen_random_uuid(),
  number        text unique not null,
  campaign_id   uuid not null unique references public.ad_campaigns (id) on delete cascade,
  advertiser_id uuid references public.advertisers (id) on delete set null,
  amount_kes    numeric(12,2) not null,
  status        text not null default 'unpaid' check (status in ('unpaid', 'paid', 'void')),
  issued_at     timestamptz not null default now(),
  due_date      date,
  paid_at       timestamptz,
  receipt_number text unique
);

create table if not exists public.ad_payments (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.ad_campaigns (id) on delete cascade,
  advertiser_id uuid references public.advertisers (id) on delete set null,
  method        text not null check (method in ('mpesa_manual', 'bank_transfer', 'cash', 'card', 'mpesa_stk', 'other')),
  reference     text not null check (char_length(reference) between 4 and 60),   -- e.g. M-Pesa confirmation code
  amount_kes    numeric(12,2) not null check (amount_kes > 0),
  payer_phone   text,
  status        text not null default 'pending_verification' check (status in ('pending_verification', 'confirmed', 'rejected')),
  note          text,
  verified_by   uuid references auth.users (id),
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);
create unique index if not exists ad_payments_ref_uniq on public.ad_payments (method, upper(reference)) where status <> 'rejected';

-- ---------- Enquiries, notifications, audit ----------
create table if not exists public.ad_enquiries (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 100),
  business_name text check (business_name is null or char_length(business_name) <= 120),
  email         text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone         text check (phone is null or char_length(phone) between 7 and 20),
  interest      text check (interest is null or char_length(interest) <= 60),
  budget        text check (budget is null or char_length(budget) <= 60),
  message       text not null check (char_length(message) between 5 and 3000),
  status        text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  ip_hash       text,
  created_at    timestamptz not null default now(),
  check (email is not null or phone is not null)
);

create table if not exists public.ad_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,   -- null + audience 'admin' = for admins
  audience    text not null default 'advertiser' check (audience in ('advertiser', 'admin')),
  campaign_id uuid references public.ad_campaigns (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  is_read     boolean not null default false,
  emailed_at  timestamptz,                                         -- for a future email sender
  created_at  timestamptz not null default now()
);
create index if not exists ad_notif_user_idx on public.ad_notifications (user_id, is_read, created_at desc);
create unique index if not exists ad_notif_once_idx on public.ad_notifications (campaign_id, kind)
  where kind in ('expiring_7', 'expiring_1', 'completed') or kind like 'invoice_due_%';

create table if not exists public.ad_audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  details    jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================
--  Helper functions
-- =============================================================
create or replace function public.ad_my_advertiser_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.advertisers where user_id = auth.uid();
$$;
grant execute on function public.ad_my_advertiser_id() to authenticated;

create or replace function public.ad_client_ip_hash()
returns text language plpgsql stable security definer set search_path = public as $$
declare h json; ip text;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then h := null; end;
  ip := split_part(coalesce(h ->> 'x-forwarded-for', h ->> 'x-real-ip', ''), ',', 1);
  if ip = '' then return null; end if;
  -- Daily salted hash: lets us spot repeat clicks without storing anyone's IP address
  return md5(trim(ip) || ':' || (now() at time zone 'Africa/Nairobi')::date::text || ':imma-ads');
end $$;

create or replace function public.ad_notify(p_user uuid, p_audience text, p_campaign uuid, p_kind text, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_audience = 'advertiser' and p_user is null then return; end if;   -- e.g. IMMA house adverts
  insert into public.ad_notifications (user_id, audience, campaign_id, kind, title, body)
  values (p_user, p_audience, p_campaign, p_kind, p_title, p_body)
  on conflict do nothing;
end $$;

-- System updates made by the database itself (payment confirmed, campaign expired)
create or replace function public.ad_system_update_campaign(p_id uuid, p_status text, p_payment text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('imma.internal', 'on', true);
  update public.ad_campaigns set status = coalesce(p_status, status), payment_status = coalesce(p_payment, payment_status) where id = p_id;
  perform set_config('imma.internal', 'off', true);
end $$;
revoke execute on function public.ad_system_update_campaign(uuid, text, text) from public, anon, authenticated;

create or replace function public.ad_audit(p_action text, p_entity text, p_id text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.ad_audit_logs (actor_id, action, entity, entity_id, details) values (auth.uid(), p_action, p_entity, p_id, p_details);
$$;

-- Inventory: how many campaigns already hold this placement on overlapping dates
create or replace function public.ad_slots_taken(p_placement text, p_start date, p_end date, p_categories text[], p_exclude uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.ad_campaigns c
  where c.placement_key = p_placement
    and c.is_house = false
    and c.status in ('submitted', 'approved', 'paused')
    and c.id is distinct from p_exclude
    and c.start_date <= p_end and c.end_date >= p_start
    and (c.categories is null or p_categories is null or c.categories && p_categories);
$$;

-- Public availability check used by the booking form
create or replace function public.ad_check_availability(p_placement text, p_start date, p_months int, p_categories text[] default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare pl public.ad_placements; e date; taken int;
begin
  select * into pl from public.ad_placements where key = p_placement and is_active;
  if not found then return json_build_object('available', false, 'reason', 'This placement is not on sale.'); end if;
  e := case when pl.price_unit = 'article' then p_start + 29 else (p_start + make_interval(months => greatest(p_months, 1)))::date - 1 end;
  taken := public.ad_slots_taken(p_placement, p_start, e, p_categories, null);
  return json_build_object('available', taken < pl.max_concurrent, 'taken', taken, 'capacity', pl.max_concurrent, 'end_date', e,
    'reason', case when taken < pl.max_concurrent then null else 'This placement is fully booked for those dates. Please choose other dates or another placement.' end);
end $$;
grant execute on function public.ad_check_availability(text, date, int, text[]) to anon, authenticated;

-- =============================================================
--  Campaign rules (runs before every insert/update)
-- =============================================================
create or replace function public.ad_campaign_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  admin boolean := public.is_admin();
  pl public.ad_placements;
  pk public.ad_packages;
  dc public.ad_discount_codes;
  my_adv uuid;
  used int;
begin
  if coalesce(current_setting('imma.internal', true), '') = 'on' then
    new.updated_at := now();
    return new;
  end if;
  if not admin then
    my_adv := public.ad_my_advertiser_id();
    if my_adv is null then raise exception 'Please complete your advertiser profile first.'; end if;
    if exists (select 1 from public.advertisers where id = my_adv and is_blocked) then
      raise exception 'This advertiser account is suspended. Please contact IMMA Media.';
    end if;
    if tg_op = 'INSERT' then
      new.advertiser_id := my_adv;
      new.status := case when new.status = 'submitted' then 'submitted' else 'draft' end;
    else
      if old.advertiser_id is distinct from my_adv then raise exception 'Not your campaign.'; end if;
      if old.status not in ('draft', 'rejected') then
        raise exception 'This campaign is with IMMA Media for review and can no longer be changed. Contact us if you need a change.';
      end if;
      if new.status not in ('draft', 'submitted') then new.status := old.status; end if;
      new.advertiser_id := old.advertiser_id;
    end if;
    -- Only admins can set these
    new.payment_status := case when tg_op = 'INSERT' then 'unpaid' else old.payment_status end;
    new.complimentary := false; new.is_house := false; new.priority := 0; new.weight := 1;
    new.approved_by := null; new.approved_at := null; new.rejection_reason := case when tg_op = 'UPDATE' then old.rejection_reason end;
    new.list_price_kes := null; new.total_kes := null; new.discount_kes := 0;   -- recalculated below
    if new.start_date < (now() at time zone 'Africa/Nairobi')::date then
      raise exception 'The start date cannot be in the past.';
    end if;
  end if;

  select * into pl from public.ad_placements where key = new.placement_key;
  if not found or (not pl.is_active and not admin) then raise exception 'That placement is not available.'; end if;
  new.kind := case when new.placement_key = 'sponsored_article' then 'sponsored' else 'display' end;
  if new.kind = 'sponsored' then new.months := 1; end if;

  -- Packages: the placement must belong to the package; duration comes from the package
  if new.package_id is not null then
    select * into pk from public.ad_packages where id = new.package_id;
    if not found or (not pk.is_available and not admin) then raise exception 'That package is not available.'; end if;
    if not (new.placement_key = any (pk.placement_keys)) then raise exception 'That placement is not part of the % package.', pk.name; end if;
    if not admin then new.months := greatest(pk.duration_months, new.months); end if;
  end if;

  new.end_date := case when new.kind = 'sponsored' then new.start_date + 29
                       else (new.start_date + make_interval(months => new.months))::date - 1 end;

  -- Price (admins may type their own price; otherwise it is calculated)
  if not admin or new.total_kes is null then
    if new.parent_id is not null and new.kind = 'sponsored' then
      -- Sponsored article included in a package
      select p.sponsored_articles into used from public.ad_campaigns c join public.ad_packages p on p.id = c.package_id
        where c.id = new.parent_id and (admin or c.advertiser_id = new.advertiser_id);
      if used is null then raise exception 'That package campaign was not found.'; end if;
      if (select count(*) from public.ad_campaigns where parent_id = new.parent_id and id <> new.id) >= used then
        raise exception 'All sponsored articles included in this package have been used.';
      end if;
      new.list_price_kes := 0;
    elsif new.package_id is not null then
      new.list_price_kes := pk.price_kes * greatest(1, new.months / pk.duration_months);
    else
      new.list_price_kes := pl.price_kes * case when pl.price_unit = 'article' then 1 else new.months end;
    end if;

    new.discount_kes := 0;
    if coalesce(new.discount_code, '') <> '' and new.list_price_kes > 0 then
      new.discount_code := upper(trim(new.discount_code));
      select * into dc from public.ad_discount_codes where code = new.discount_code and is_active
        and (valid_from is null or valid_from <= current_date) and (valid_to is null or valid_to >= current_date)
        and (max_uses is null or times_used < max_uses);
      if not found then raise exception 'That discount code is not valid.'; end if;
      new.discount_kes := least(new.list_price_kes, coalesce(dc.amount_off, round(new.list_price_kes * dc.percent_off / 100, 2)));
    else
      new.discount_code := null;
    end if;
    new.total_kes := new.list_price_kes - new.discount_kes;
  end if;

  if new.complimentary or new.is_house or new.total_kes = 0 then new.payment_status := 'waived'; end if;

  -- Inventory check when booking is submitted or approved
  if new.status in ('submitted', 'approved') and not new.is_house
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.start_date <> new.start_date
          or old.end_date <> new.end_date or old.placement_key <> new.placement_key) then
    if public.ad_slots_taken(new.placement_key, new.start_date, new.end_date, new.categories, new.id) >= pl.max_concurrent then
      raise exception 'Sorry, "%" is fully booked for those dates. Please choose other dates or another placement.', pl.name;
    end if;
  end if;

  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then new.submitted_at := now(); end if;
  if admin and new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then
    new.approved_by := auth.uid(); new.approved_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists ad_campaign_guard on public.ad_campaigns;
create trigger ad_campaign_guard before insert or update on public.ad_campaigns
  for each row execute function public.ad_campaign_guard();

-- After a campaign changes: invoices, notifications, audit log
create or replace function public.ad_campaign_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid; nm text;
begin
  select user_id into uid from public.advertisers where id = new.advertiser_id;
  nm := new.name;

  if new.status in ('submitted', 'approved') and new.total_kes > 0 and not new.complimentary and not new.is_house
     and not exists (select 1 from public.ad_invoices where campaign_id = new.id) then
    insert into public.ad_invoices (number, campaign_id, advertiser_id, amount_kes, due_date)
    values ('IMMA-INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ad_invoice_seq')::text, 5, '0'),
            new.id, new.advertiser_id, new.total_kes, new.start_date);
  end if;

  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then
    if exists (select 1 from public.ad_invoices where campaign_id = new.id and status = 'unpaid') then
      update public.ad_invoices set amount_kes = new.total_kes where campaign_id = new.id and status = 'unpaid';
    end if;
    if new.discount_code is not null and (tg_op = 'INSERT' or old.discount_code is distinct from new.discount_code or old.status <> 'submitted') then
      update public.ad_discount_codes set times_used = times_used + 1 where code = new.discount_code;
    end if;
    perform public.ad_notify(uid, 'advertiser', new.id, 'submitted', 'Campaign submitted for review',
      '"' || nm || '" has been sent to IMMA Media for review. We will check your artwork and confirm availability.');
    perform public.ad_notify(null, 'admin', new.id, 'submitted', 'New campaign to review', '"' || nm || '" is waiting for approval.');
  end if;

  if tg_op = 'UPDATE' and old.status <> new.status then
    if new.status = 'approved' then
      perform public.ad_notify(uid, 'advertiser', new.id, 'approved', 'Campaign approved',
        '"' || nm || '" has been approved.' || case when new.payment_status in ('paid', 'waived') then ' It will run from ' || to_char(new.start_date, 'DD Mon YYYY') || '.'
        else ' It will go live once your payment is confirmed.' end);
    elsif new.status = 'rejected' then
      perform public.ad_notify(uid, 'advertiser', new.id, 'rejected', 'Campaign needs changes',
        '"' || nm || '" was not approved' || coalesce(': ' || new.rejection_reason, '.') || ' You can edit it and submit again.');
    elsif new.status = 'paused' then
      perform public.ad_notify(uid, 'advertiser', new.id, 'paused', 'Campaign paused', '"' || nm || '" has been paused by IMMA Media.');
    elsif new.status = 'terminated' then
      perform public.ad_notify(uid, 'advertiser', new.id, 'terminated', 'Campaign ended', '"' || nm || '" has been ended by IMMA Media.');
    elsif new.status = 'expired' then
      perform public.ad_notify(uid, 'advertiser', new.id, 'completed', 'Campaign completed',
        '"' || nm || '" finished on ' || to_char(new.end_date, 'DD Mon YYYY') || '. You can renew it from your dashboard.');
    end if;
  end if;

  if tg_op = 'UPDATE' and old.payment_status <> new.payment_status and new.payment_status = 'paid' then
    update public.ad_invoices set status = 'paid', paid_at = now(),
      receipt_number = coalesce(receipt_number, replace(number, 'INV', 'RCT'))
      where campaign_id = new.id and status = 'unpaid';
    perform public.ad_notify(uid, 'advertiser', new.id, 'paid', 'Payment confirmed',
      'We have confirmed your payment for "' || nm || '". Your receipt is ready in your dashboard.');
  end if;

  if public.is_admin() then
    perform public.ad_audit(lower(tg_op), 'campaign', new.id::text,
      case when tg_op = 'INSERT' then jsonb_build_object('name', nm, 'status', new.status)
      else jsonb_strip_nulls(jsonb_build_object(
        'status', case when old.status <> new.status then old.status || ' → ' || new.status end,
        'payment', case when old.payment_status <> new.payment_status then old.payment_status || ' → ' || new.payment_status end,
        'placement', case when old.placement_key <> new.placement_key then old.placement_key || ' → ' || new.placement_key end,
        'priority', case when old.priority <> new.priority then new.priority end,
        'weight', case when old.weight <> new.weight then new.weight end,
        'complimentary', case when old.complimentary <> new.complimentary then new.complimentary end,
        'total_kes', case when old.total_kes is distinct from new.total_kes then new.total_kes end)) end);
  end if;
  return new;
end $$;
drop trigger if exists ad_campaign_after on public.ad_campaigns;
create trigger ad_campaign_after after insert or update on public.ad_campaigns
  for each row execute function public.ad_campaign_after();

-- Creatives: advertisers upload only into their own folder; everything starts as "pending"
create or replace function public.ad_creative_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.ad_campaigns; prefix text;
begin
  select * into c from public.ad_campaigns where id = new.campaign_id;
  if not found then raise exception 'Campaign not found.'; end if;
  if not public.is_admin() then
    if c.advertiser_id is distinct from public.ad_my_advertiser_id() then raise exception 'Not your campaign.'; end if;
    if c.status not in ('draft', 'rejected') then raise exception 'Artwork can only be changed before the campaign is submitted.'; end if;
    prefix := auth.uid()::text || '/';
    if (new.image_path is not null and left(new.image_path, length(prefix)) <> prefix)
       or (new.mobile_image_path is not null and left(new.mobile_image_path, length(prefix)) <> prefix) then
      raise exception 'Invalid image.';
    end if;
    new.status := 'pending'; new.review_note := null;
  elsif tg_op = 'UPDATE' and old.status <> new.status then
    perform public.ad_audit('review', 'creative', new.id::text, jsonb_build_object('status', new.status, 'note', new.review_note));
  end if;
  if c.kind = 'display' and new.image_path is null then raise exception 'Please upload your advert image.'; end if;
  if c.kind = 'sponsored' and (coalesce(new.headline, '') = '' or coalesce(new.body, '') = '') then
    raise exception 'A sponsored article needs a headline and text.';
  end if;
  return new;
end $$;
drop trigger if exists ad_creative_guard on public.ad_creatives;
create trigger ad_creative_guard before insert or update on public.ad_creatives
  for each row execute function public.ad_creative_guard();

-- Advertisers cannot unblock themselves or edit admin notes
create or replace function public.ad_advertiser_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.user_id := auth.uid(); new.is_blocked := false; new.blocked_reason := null; new.admin_notes := null;
      if new.terms_accepted_at is null then raise exception 'Please accept the advertising terms.'; end if;
      new.terms_accepted_at := now();
    else
      new.user_id := old.user_id; new.is_blocked := old.is_blocked; new.blocked_reason := old.blocked_reason;
      new.admin_notes := old.admin_notes; new.terms_accepted_at := old.terms_accepted_at;
    end if;
    if new.logo_path is not null and left(new.logo_path, length(auth.uid()::text) + 1) <> auth.uid()::text || '/' then
      raise exception 'Invalid logo.';
    end if;
  elsif tg_op = 'UPDATE' and old.is_blocked <> new.is_blocked then
    perform public.ad_audit(case when new.is_blocked then 'block' else 'unblock' end, 'advertiser', new.id::text,
      jsonb_build_object('business', new.business_name, 'reason', new.blocked_reason));
  end if;
  return new;
end $$;
drop trigger if exists ad_advertiser_guard on public.advertisers;
create trigger ad_advertiser_guard before insert or update on public.advertisers
  for each row execute function public.ad_advertiser_guard();

create or replace function public.ad_advertiser_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.ad_notify(new.user_id, 'advertiser', null, 'registered', 'Welcome to IMMA News advertising',
    'Your advertiser account for ' || new.business_name || ' is ready. Choose a package or placement to book your first campaign.');
  perform public.ad_notify(null, 'admin', null, 'registered', 'New advertiser', new.business_name || ' created an advertiser account.');
  return new;
end $$;
drop trigger if exists ad_advertiser_after on public.advertisers;
create trigger ad_advertiser_after after insert on public.advertisers
  for each row execute function public.ad_advertiser_after();

-- Payments: advertisers can only report a payment; only admins confirm it
create or replace function public.ad_payment_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare c public.ad_campaigns;
begin
  select * into c from public.ad_campaigns where id = new.campaign_id;
  if not found then raise exception 'Campaign not found.'; end if;
  new.reference := upper(trim(new.reference));
  if not public.is_admin() then
    if tg_op <> 'INSERT' then raise exception 'Only IMMA Media can change a payment.'; end if;
    if c.advertiser_id is distinct from public.ad_my_advertiser_id() then raise exception 'Not your campaign.'; end if;
    if c.payment_status in ('paid', 'waived') then raise exception 'This campaign is already paid.'; end if;
    if new.method not in ('mpesa_manual', 'bank_transfer') then raise exception 'Choose M-Pesa or bank transfer.'; end if;
    new.status := 'pending_verification'; new.verified_by := null; new.verified_at := null; new.note := null;
  else
    if new.status <> 'pending_verification' and (tg_op = 'INSERT' or old.status <> new.status) then
      new.verified_by := auth.uid(); new.verified_at := now();
    end if;
  end if;
  new.advertiser_id := c.advertiser_id;
  return new;
end $$;
drop trigger if exists ad_payment_guard on public.ad_payments;
create trigger ad_payment_guard before insert or update on public.ad_payments
  for each row execute function public.ad_payment_guard();

create or replace function public.ad_payment_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare paid numeric; due numeric; uid uuid;
begin
  select user_id into uid from public.advertisers where id = new.advertiser_id;
  if new.status = 'pending_verification' and tg_op = 'INSERT' then
    if (select payment_status from public.ad_campaigns where id = new.campaign_id) = 'unpaid' then
      perform public.ad_system_update_campaign(new.campaign_id, null, 'pending_verification');
    end if;
    perform public.ad_notify(null, 'admin', new.campaign_id, 'payment_reported', 'Payment to verify',
      'KES ' || new.amount_kes || ' reported with reference ' || new.reference || '.');
  end if;
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status <> 'confirmed') then
    select coalesce(sum(amount_kes), 0) into paid from public.ad_payments where campaign_id = new.campaign_id and status = 'confirmed';
    select total_kes into due from public.ad_campaigns where id = new.campaign_id;
    if paid >= coalesce(due, 0) then
      perform public.ad_system_update_campaign(new.campaign_id, null, 'paid');
    end if;
    perform public.ad_audit('confirm', 'payment', new.id::text, jsonb_build_object('amount', new.amount_kes, 'reference', new.reference));
  elsif new.status = 'rejected' and tg_op = 'UPDATE' and old.status <> 'rejected' then
    if (select payment_status from public.ad_campaigns where id = new.campaign_id) = 'pending_verification'
       and not exists (select 1 from public.ad_payments where campaign_id = new.campaign_id and status = 'pending_verification' and id <> new.id) then
      perform public.ad_system_update_campaign(new.campaign_id, null, 'unpaid');
    end if;
    perform public.ad_notify(uid, 'advertiser', new.campaign_id, 'payment_rejected', 'Payment could not be verified',
      'We could not match reference ' || new.reference || coalesce(' (' || new.note || ')', '') || '. Please check it or contact us.');
    perform public.ad_audit('reject', 'payment', new.id::text, jsonb_build_object('reference', new.reference, 'note', new.note));
  end if;
  return new;
end $$;
drop trigger if exists ad_payment_after on public.ad_payments;
create trigger ad_payment_after after insert or update on public.ad_payments
  for each row execute function public.ad_payment_after();

-- Enquiries: basic flood protection
create or replace function public.ad_enquiry_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.ip_hash := public.ad_client_ip_hash();
  new.status := 'new';
  if new.ip_hash is not null and (select count(*) from public.ad_enquiries
      where ip_hash = new.ip_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many enquiries. Please try again later or call us.';
  end if;
  perform public.ad_notify(null, 'admin', null, 'enquiry', 'New advertising enquiry', new.name || coalesce(' — ' || new.business_name, ''));
  return new;
end $$;
drop trigger if exists ad_enquiry_guard on public.ad_enquiries;
create trigger ad_enquiry_guard before insert on public.ad_enquiries
  for each row execute function public.ad_enquiry_guard();

-- =============================================================
--  Scheduling: expire finished campaigns, send expiry reminders
-- =============================================================
create or replace function public.ad_run_schedule()
returns json language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Africa/Nairobi')::date; r record; n_exp int := 0; n_rem int := 0;
begin
  -- Fixed housekeeping only (expire finished campaigns, reminders), so anyone signed in may trigger it.

  for r in select c.*, a.user_id from public.ad_campaigns c left join public.advertisers a on a.id = c.advertiser_id
           where c.status = 'approved' and c.end_date < today loop
    perform public.ad_system_update_campaign(r.id, 'expired', null);
    n_exp := n_exp + 1;
  end loop;

  for r in select c.*, a.user_id from public.ad_campaigns c join public.advertisers a on a.id = c.advertiser_id
           where c.status = 'approved' and c.end_date between today and today + 7 loop
    if r.end_date - today <= 1 then
      perform public.ad_notify(r.user_id, 'advertiser', r.id, 'expiring_1', 'Campaign ends tomorrow',
        '"' || r.name || '" ends on ' || to_char(r.end_date, 'DD Mon YYYY') || '. Renew now to keep your advert running.');
    else
      perform public.ad_notify(r.user_id, 'advertiser', r.id, 'expiring_7', 'Campaign ends within a week',
        '"' || r.name || '" ends on ' || to_char(r.end_date, 'DD Mon YYYY') || '. You can renew it from your dashboard.');
    end if;
    n_rem := n_rem + 1;
  end loop;

  -- Reminder about unpaid invoices for approved campaigns starting soon
  for r in select c.*, a.user_id from public.ad_campaigns c join public.advertisers a on a.id = c.advertiser_id
           where c.status = 'approved' and c.payment_status = 'unpaid' and c.start_date <= today + 3 loop
    perform public.ad_notify(r.user_id, 'advertiser', r.id, 'invoice_due_' || to_char(today, 'YYYYMMDD'), 'Payment outstanding',
      'Your advert "' || r.name || '" is approved but will not appear until payment is received.');
  end loop;
  return json_build_object('expired', n_exp, 'reminders', n_rem);
end $$;
grant execute on function public.ad_run_schedule() to authenticated;

-- Run it every day at 00:05 Nairobi time if pg_cron is available (Database → Extensions → pg_cron).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'imma-ads-daily';
    perform cron.schedule('imma-ads-daily', '5 21 * * *', 'select public.ad_run_schedule();');
  end if;
exception when others then
  raise notice 'pg_cron not set up; the admin dashboard runs the schedule when it opens.';
end $$;

-- =============================================================
--  Serving adverts and counting views/clicks (public)
-- =============================================================
create or replace function public.ad_get_live()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'enabled', coalesce((select value from public.ad_settings where key = 'ads_enabled'), 'true') = 'true',
    'placements', (select coalesce(json_agg(json_build_object('key', key, 'name', name, 'width', width, 'height', height,
        'mobile_width', mobile_width, 'mobile_height', mobile_height, 'house', house_when_vacant, 'active', is_active) order by sort_order), '[]')
        from public.ad_placements),
    'ads', (select coalesce(json_agg(json_build_object(
        'creative', cr.id, 'campaign', c.id, 'placement', c.placement_key, 'categories', c.categories,
        'image', cr.image_path, 'mobile_image', cr.mobile_image_path, 'alt', cr.alt_text, 'url', cr.destination_url,
        'headline', cr.headline, 'body', cr.body, 'priority', c.priority, 'weight', c.weight, 'house', c.is_house,
        'advertiser', coalesce(a.business_name, 'IMMA Media'), 'start', c.start_date)), '[]')
      from public.ad_campaigns c
      join public.ad_creatives cr on cr.campaign_id = c.id and cr.status = 'approved'
      left join public.advertisers a on a.id = c.advertiser_id
      join public.ad_placements p on p.key = c.placement_key and p.is_active
      where c.status = 'approved'
        and (c.payment_status in ('paid', 'waived') or c.complimentary or c.is_house)
        and (now() at time zone 'Africa/Nairobi')::date between c.start_date and c.end_date
        and (c.parent_id is null or exists (select 1 from public.ad_campaigns pc where pc.id = c.parent_id and pc.payment_status in ('paid', 'waived')))
        and (a.id is null or not a.is_blocked))
  );
$$;
grant execute on function public.ad_get_live() to anon, authenticated;

create or replace function public.ad_track(p_creative uuid, p_event text, p_session text, p_device text)
returns boolean language plpgsql security definer set search_path = public as $$
declare c record; ua text; iph text; h json;
begin
  if p_event not in ('impression', 'click') or p_device not in ('desktop', 'mobile')
     or p_session is null or char_length(p_session) not between 16 and 64 then return false; end if;
  begin h := current_setting('request.headers', true)::json; exception when others then h := null; end;
  ua := lower(coalesce(h ->> 'user-agent', ''));
  if ua = '' or ua ~ '(bot|crawl|spider|slurp|headless|preview|scan|monitor|curl|wget|python|java/|go-http|httpclient|lighthouse)' then
    return false;
  end if;

  -- Only count adverts that are actually live right now
  select cr.id, cr.campaign_id, ca.placement_key into c
    from public.ad_creatives cr join public.ad_campaigns ca on ca.id = cr.campaign_id
    where cr.id = p_creative and cr.status = 'approved' and ca.status = 'approved'
      and (ca.payment_status in ('paid', 'waived') or ca.complimentary or ca.is_house)
      and (now() at time zone 'Africa/Nairobi')::date between ca.start_date and ca.end_date
      and (ca.parent_id is null or exists (select 1 from public.ad_campaigns pc where pc.id = ca.parent_id and pc.payment_status in ('paid', 'waived')))
      and not exists (select 1 from public.advertisers a where a.id = ca.advertiser_id and a.is_blocked);
  if not found then return false; end if;

  iph := public.ad_client_ip_hash();
  if p_event = 'impression' then
    -- One view per visitor session per advert every 30 minutes; at most 60 per network per day
    if exists (select 1 from public.ad_impressions where creative_id = p_creative and session_hash = md5(p_session)
               and created_at > now() - interval '30 minutes') then return false; end if;
    if iph is not null and (select count(*) from public.ad_impressions where ip_hash = iph and creative_id = p_creative
               and day = (now() at time zone 'Africa/Nairobi')::date) >= 60 then return false; end if;
    insert into public.ad_impressions (creative_id, campaign_id, placement_key, device, session_hash, ip_hash)
    values (p_creative, c.campaign_id, c.placement_key, p_device, md5(p_session), iph);
  else
    -- One click per session per advert per day, at most 3 per network per day, and only after a view
    if exists (select 1 from public.ad_clicks where creative_id = p_creative and session_hash = md5(p_session)
               and day = (now() at time zone 'Africa/Nairobi')::date) then return false; end if;
    if iph is not null and (select count(*) from public.ad_clicks where ip_hash = iph and creative_id = p_creative
               and day = (now() at time zone 'Africa/Nairobi')::date) >= 3 then return false; end if;
    if not exists (select 1 from public.ad_impressions where creative_id = p_creative and session_hash = md5(p_session)
               and created_at > now() - interval '1 day') then return false; end if;
    insert into public.ad_clicks (creative_id, campaign_id, placement_key, device, session_hash, ip_hash)
    values (p_creative, c.campaign_id, c.placement_key, p_device, md5(p_session), iph);
  end if;
  return true;
end $$;
grant execute on function public.ad_track(uuid, text, text, text) to anon, authenticated;

-- Statistics: advertisers see only their own campaigns; admins see everything
create or replace function public.ad_stats(p_from date, p_to date, p_campaign uuid default null)
returns table (day date, campaign_id uuid, placement_key text, device text, impressions bigint, clicks bigint)
language sql stable security definer set search_path = public as $$
  with allowed as (
    select c.id from public.ad_campaigns c
    where (p_campaign is null or c.id = p_campaign)
      and (public.is_admin() or c.advertiser_id = public.ad_my_advertiser_id())
  ),
  i as (select day, campaign_id, placement_key, device, count(*) n from public.ad_impressions
        where day between p_from and p_to and campaign_id in (select id from allowed) group by 1, 2, 3, 4),
  k as (select day, campaign_id, placement_key, device, count(*) n from public.ad_clicks
        where day between p_from and p_to and campaign_id in (select id from allowed) group by 1, 2, 3, 4)
  select coalesce(i.day, k.day), coalesce(i.campaign_id, k.campaign_id), coalesce(i.placement_key, k.placement_key),
         coalesce(i.device, k.device), coalesce(i.n, 0), coalesce(k.n, 0)
  from i full join k on i.day = k.day and i.campaign_id = k.campaign_id and i.placement_key = k.placement_key and i.device = k.device
  order by 1;
$$;
grant execute on function public.ad_stats(date, date, uuid) to authenticated;

-- =============================================================
--  Row Level Security
-- =============================================================
alter table public.ad_settings       enable row level security;
alter table public.ad_placements     enable row level security;
alter table public.ad_packages       enable row level security;
alter table public.advertisers       enable row level security;
alter table public.ad_discount_codes enable row level security;
alter table public.ad_campaigns      enable row level security;
alter table public.ad_creatives      enable row level security;
alter table public.ad_impressions    enable row level security;
alter table public.ad_clicks         enable row level security;
alter table public.ad_invoices       enable row level security;
alter table public.ad_payments       enable row level security;
alter table public.ad_enquiries      enable row level security;
alter table public.ad_notifications  enable row level security;
alter table public.ad_audit_logs     enable row level security;

do $$
declare t text;
begin
  -- Admins can do everything on every advertising table
  foreach t in array array['ad_settings','ad_placements','ad_packages','advertisers','ad_discount_codes','ad_campaigns',
    'ad_creatives','ad_impressions','ad_clicks','ad_invoices','ad_payments','ad_enquiries','ad_notifications','ad_audit_logs'] loop
    execute format('drop policy if exists "Admins manage" on public.%I', t);
    execute format('create policy "Admins manage" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "Public settings" on public.ad_settings;
create policy "Public settings" on public.ad_settings for select using (is_public);
drop policy if exists "Public placements" on public.ad_placements;
create policy "Public placements" on public.ad_placements for select using (true);
drop policy if exists "Public packages" on public.ad_packages;
create policy "Public packages" on public.ad_packages for select using (true);

drop policy if exists "Own advertiser" on public.advertisers;
create policy "Own advertiser" on public.advertisers for select using (user_id = auth.uid());
drop policy if exists "Create own advertiser" on public.advertisers;
create policy "Create own advertiser" on public.advertisers for insert with check (user_id = auth.uid());
drop policy if exists "Update own advertiser" on public.advertisers;
create policy "Update own advertiser" on public.advertisers for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Own campaigns" on public.ad_campaigns;
create policy "Own campaigns" on public.ad_campaigns for select using (advertiser_id = public.ad_my_advertiser_id());
drop policy if exists "Create own campaigns" on public.ad_campaigns;
create policy "Create own campaigns" on public.ad_campaigns for insert with check (advertiser_id = public.ad_my_advertiser_id());
drop policy if exists "Edit own campaigns" on public.ad_campaigns;
create policy "Edit own campaigns" on public.ad_campaigns for update
  using (advertiser_id = public.ad_my_advertiser_id()) with check (advertiser_id = public.ad_my_advertiser_id());
drop policy if exists "Delete own drafts" on public.ad_campaigns;
create policy "Delete own drafts" on public.ad_campaigns for delete
  using (advertiser_id = public.ad_my_advertiser_id() and status = 'draft');

drop policy if exists "Own creatives" on public.ad_creatives;
create policy "Own creatives" on public.ad_creatives for select
  using (exists (select 1 from public.ad_campaigns c where c.id = campaign_id and c.advertiser_id = public.ad_my_advertiser_id()));
drop policy if exists "Add own creatives" on public.ad_creatives;
create policy "Add own creatives" on public.ad_creatives for insert
  with check (exists (select 1 from public.ad_campaigns c where c.id = campaign_id and c.advertiser_id = public.ad_my_advertiser_id()));
drop policy if exists "Edit own creatives" on public.ad_creatives;
create policy "Edit own creatives" on public.ad_creatives for update
  using (exists (select 1 from public.ad_campaigns c where c.id = campaign_id and c.advertiser_id = public.ad_my_advertiser_id()))
  with check (exists (select 1 from public.ad_campaigns c where c.id = campaign_id and c.advertiser_id = public.ad_my_advertiser_id()));
drop policy if exists "Delete own draft creatives" on public.ad_creatives;
create policy "Delete own draft creatives" on public.ad_creatives for delete
  using (exists (select 1 from public.ad_campaigns c where c.id = campaign_id and c.advertiser_id = public.ad_my_advertiser_id()
                 and c.status in ('draft', 'rejected')));

drop policy if exists "Own invoices" on public.ad_invoices;
create policy "Own invoices" on public.ad_invoices for select using (advertiser_id = public.ad_my_advertiser_id());

drop policy if exists "Own payments" on public.ad_payments;
create policy "Own payments" on public.ad_payments for select using (advertiser_id = public.ad_my_advertiser_id());
drop policy if exists "Report own payment" on public.ad_payments;
create policy "Report own payment" on public.ad_payments for insert
  with check (exists (select 1 from public.ad_campaigns c where c.id = campaign_id and c.advertiser_id = public.ad_my_advertiser_id()));

drop policy if exists "Anyone can enquire" on public.ad_enquiries;
create policy "Anyone can enquire" on public.ad_enquiries for insert with check (status = 'new');

drop policy if exists "Own notifications" on public.ad_notifications;
create policy "Own notifications" on public.ad_notifications for select using (user_id = auth.uid());
drop policy if exists "Mark own notifications read" on public.ad_notifications;
create policy "Mark own notifications read" on public.ad_notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Table permissions (RLS above still decides which rows)
grant select on public.ad_settings, public.ad_placements, public.ad_packages to anon, authenticated;
grant insert on public.ad_enquiries to anon, authenticated;
grant select, insert, update on public.advertisers to authenticated;
grant select, insert, update, delete on public.ad_campaigns, public.ad_creatives to authenticated;
grant select, insert on public.ad_payments to authenticated;
grant select on public.ad_invoices to authenticated;
grant select, update on public.ad_notifications to authenticated;
-- Admin-only tables (RLS limits these to admins)
grant select, insert, update, delete on public.ad_settings, public.ad_placements, public.ad_packages,
  public.ad_discount_codes, public.ad_enquiries, public.ad_audit_logs, public.ad_invoices to authenticated;
grant update, delete on public.ad_payments, public.advertisers to authenticated;
grant insert, delete on public.ad_notifications to authenticated;
grant select on public.ad_impressions, public.ad_clicks to authenticated;
grant usage, select on sequence public.ad_invoice_seq to authenticated;

-- =============================================================
--  Storage for advert artwork and logos
--  JPEG, PNG, WebP and GIF only (no SVG), 2 MB maximum.
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-creatives', 'ad-creatives', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Ad artwork upload own folder" on storage.objects;
create policy "Ad artwork upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'ad-creatives' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "Ad artwork manage own folder" on storage.objects;
create policy "Ad artwork manage own folder" on storage.objects for update to authenticated
  using (bucket_id = 'ad-creatives' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "Ad artwork delete own folder" on storage.objects;
create policy "Ad artwork delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'ad-creatives' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "Ad artwork list own folder" on storage.objects;
create policy "Ad artwork list own folder" on storage.objects for select to authenticated
  using (bucket_id = 'ad-creatives' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- =============================================================
--  Audit trail for admin edits to prices, packages, settings, codes and invoices
-- =============================================================
create or replace function public.ad_admin_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if not public.is_admin() then return coalesce(new, old); end if;
  k := coalesce(to_jsonb(coalesce(new, old)) ->> 'key', to_jsonb(coalesce(new, old)) ->> 'id', to_jsonb(coalesce(new, old)) ->> 'code');
  perform public.ad_audit(lower(tg_op), tg_table_name, k,
    case when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
         when tg_op = 'INSERT' then to_jsonb(new) else to_jsonb(old) end);
  return coalesce(new, old);
end $$;
do $$
declare t text;
begin
  foreach t in array array['ad_placements', 'ad_packages', 'ad_settings', 'ad_discount_codes', 'ad_invoices'] loop
    execute format('drop trigger if exists ad_admin_audit on public.%I', t);
    execute format('create trigger ad_admin_audit after insert or update or delete on public.%I for each row execute function public.ad_admin_audit()', t);
  end loop;
end $$;
