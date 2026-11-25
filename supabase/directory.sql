-- =============================================================
--  IMMA Business Directory — database, security and storage
--  Run once in the Supabase SQL Editor (safe to run again).
--  Needs: setup.sql (profiles) and advertising.sql (is_admin, ad_client_ip_hash, ad_settings).
--
--  Privacy model
--   * Base tables are readable only by the business's owners/managers and administrators.
--   * The public (and the site's search) read the dir_* views, which only include approved,
--     non-suspended businesses and only the fields their package allows. A street address,
--     map pin and exact location are shown only if the owner ticked "show my address".
--   * Verification and claim documents live in a private storage bucket.
-- =============================================================

-- ---------- Helpers ----------
create or replace function public.biz_today() returns date language sql stable as $$ select (now() at time zone 'Africa/Nairobi')::date $$;

create or replace function public.biz_slugify(t text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(regexp_replace(coalesce(t, ''), '[''’`]', '', 'g')), '[^a-z0-9]+', '-', 'g'))
$$;

-- The 47 counties (slug list used by checks and landing pages)
create or replace function public.biz_county_ok(c text) returns boolean language sql immutable as $$
  select c = any (array['mombasa','kwale','kilifi','tana-river','lamu','taita-taveta','garissa','wajir','mandera','marsabit','isiolo','meru',
    'tharaka-nithi','embu','kitui','machakos','makueni','nyandarua','nyeri','kirinyaga','muranga','kiambu','turkana','west-pokot','samburu',
    'trans-nzoia','uasin-gishu','elgeyo-marakwet','nandi','baringo','laikipia','nakuru','narok','kajiado','kericho','bomet','kakamega',
    'vihiga','bungoma','busia','siaya','kisumu','homa-bay','migori','kisii','nyamira','nairobi'])
$$;

-- ---------- Categories ----------
create table if not exists public.business_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  name        text not null check (char_length(name) between 2 and 80),
  parent_id   uuid references public.business_categories (id) on delete cascade,
  description text,
  icon        text,
  sort_order  int not null default 100,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists business_categories_parent_idx on public.business_categories (parent_id, sort_order);

-- ---------- Packages and discount codes ----------
create table if not exists public.business_packages (
  slug              text primary key check (slug ~ '^[a-z0-9-]{2,30}$'),
  name              text not null,
  price_monthly_kes numeric(12,2) not null default 0 check (price_monthly_kes >= 0),
  annual_discount_pct numeric(5,2) not null default 0 check (annual_discount_pct between 0 and 90),
  benefits          text[] not null default '{}',
  max_photos        int not null default 0,
  allow_links       boolean not null default false,   -- website + social media
  allow_hours       boolean not null default false,
  allow_catalogue   boolean not null default false,   -- products and services
  allow_map         boolean not null default false,
  allow_offers      boolean not null default false,
  allow_video       boolean not null default false,
  featured_category boolean not null default false,
  featured_home     boolean not null default false,
  priority_search   boolean not null default false,   -- always labelled "Sponsored"
  premium_design    boolean not null default false,
  analytics_level   text not null default 'none' check (analytics_level in ('none', 'basic', 'detailed')),
  highlight         boolean not null default false,
  active            boolean not null default true,
  sort_order        int not null default 100,
  updated_at        timestamptz not null default now()
);
insert into public.business_packages (slug, name, price_monthly_kes, annual_discount_pct, max_photos, allow_links, allow_hours, allow_catalogue, allow_map, allow_offers, allow_video,
  featured_category, featured_home, priority_search, premium_design, analytics_level, highlight, sort_order, benefits) values
 ('free', 'Free', 0, 0, 0, false, false, false, false, false, false, false, false, false, false, 'none', false, 1,
  array['Business name and category', 'Business description', 'One logo', 'Telephone and WhatsApp contact', 'County and town', 'Standard search visibility']),
 ('standard', 'Standard', 1000, 15, 10, true, true, true, true, false, false, false, false, false, false, 'basic', false, 2,
  array['Everything in Free', 'Up to 10 photographs', 'Website and social media links', 'Opening hours', 'Products and services catalogue', 'Map and directions', 'Basic performance analytics']),
 ('premium', 'Premium', 3000, 15, 30, true, true, true, true, true, true, true, false, true, true, 'detailed', true, 3,
  array['Everything in Standard', 'Featured placement in your category', 'Up to 30 photographs', 'Special offers and promotions', 'Priority search placement (labelled Sponsored)', 'Detailed performance analytics', 'Premium profile design', 'Promotional video']),
 ('elite', 'Elite', 7500, 15, 60, true, true, true, true, true, true, true, true, true, true, 'detailed', false, 4,
  array['Everything in Premium', 'Featured homepage placement (subject to availability)', 'One sponsored IMMA News business feature per month', 'Premium advertising opportunities', 'Enhanced product catalogue', 'Detailed monthly performance reports', 'Priority customer support'])
on conflict (slug) do nothing;

create table if not exists public.business_discount_codes (
  code          text primary key check (code ~ '^[A-Z0-9-]{3,30}$'),
  description   text,
  percent_off   numeric(5,2) check (percent_off between 0 and 100),
  amount_off_kes numeric(12,2) check (amount_off_kes >= 0),
  packages      text[],                         -- null = all paid packages
  billing       text check (billing in ('monthly', 'annual')),   -- null = both
  founding      boolean not null default false, -- founding-business offer
  valid_from    date,
  valid_to      date,
  max_uses      int,
  used_count    int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- Businesses ----------
create table if not exists public.businesses (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null check (char_length(name) between 2 and 100),
  tagline         text check (char_length(tagline) <= 140),
  description     text check (char_length(description) <= 4000),
  category_id     uuid references public.business_categories (id) on delete set null,
  subcategory_ids uuid[] not null default '{}',
  keywords        text[] not null default '{}',
  product_categories text[] not null default '{}',
  logo_path       text,
  cover_path      text,
  video_url       text check (video_url is null or video_url ~ '^https://(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/'),
  phone           text check (phone is null or phone ~ '^\+?[0-9 ]{9,16}$'),
  whatsapp        text check (whatsapp is null or whatsapp ~ '^\+?[0-9 ]{9,16}$'),
  email           text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  website         text check (website is null or website ~ '^https?://'),
  socials         jsonb not null default '{}',
  hours_note      text,
  price_range     smallint check (price_range between 1 and 4),
  delivery        boolean not null default false,
  is_online       boolean not null default false,
  has_premises    boolean not null default true,
  status          text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'rejected', 'suspended')),
  status_note     text,                 -- reason shown to the owner when rejected or suspended
  verified        boolean not null default false,
  verified_at     timestamptz,
  featured_until  date,                 -- admin-managed featured placement
  claimable       boolean not null default false,   -- added by IMMA Media; the real owner may claim it
  source_note     text,                 -- where an admin-added listing's information came from (must permit reuse)
  terms_accepted_at timestamptz,
  deletion_requested_at timestamptz,
  rating_avg      numeric(3,2) not null default 0,
  rating_count    int not null default 0,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz
);
create index if not exists businesses_status_idx on public.businesses (status, category_id);
create index if not exists businesses_created_idx on public.businesses (created_at desc);

create table if not exists public.business_owners (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner', 'manager')),
  created_at  timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index if not exists business_owners_user_idx on public.business_owners (user_id);

create or replace function public.biz_is_owner(p_business uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.business_owners where business_id = p_business and user_id = auth.uid())
$$;
create or replace function public.biz_can_edit(p_business uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.biz_is_owner(p_business)
$$;

create table if not exists public.business_locations (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  county        text not null check (public.biz_county_ok(county)),
  town          text not null check (char_length(town) between 2 and 60),
  neighbourhood text check (char_length(neighbourhood) <= 80),
  address_line  text check (char_length(address_line) <= 200),
  landmark      text check (char_length(landmark) <= 120),
  latitude      numeric(9,6) check (latitude between -5 and 5.5),
  longitude     numeric(9,6) check (longitude between 33.5 and 42.5),
  show_address  boolean not null default false,   -- explicit permission to publish the address and map pin
  is_primary    boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists business_locations_biz_idx on public.business_locations (business_id);
create index if not exists business_locations_place_idx on public.business_locations (county, town);

create table if not exists public.business_images (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  path        text not null,
  caption     text check (char_length(caption) <= 160),
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);
create index if not exists business_images_biz_idx on public.business_images (business_id, sort_order);

create table if not exists public.business_products (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 100),
  description     text check (char_length(description) <= 600),
  image_path      text,
  price_kes       numeric(12,2) check (price_kes >= 0),
  promo_price_kes numeric(12,2) check (promo_price_kes >= 0),
  availability    text not null default 'available' check (availability in ('available', 'out_of_stock', 'on_order')),
  product_category text check (char_length(product_category) <= 60),
  sort_order      int not null default 100,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists business_products_biz_idx on public.business_products (business_id, sort_order);

create table if not exists public.business_services (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 100),
  description    text check (char_length(description) <= 600),
  price_from_kes numeric(12,2) check (price_from_kes >= 0),
  price_note     text check (char_length(price_note) <= 80),
  sort_order     int not null default 100,
  created_at     timestamptz not null default now()
);
create index if not exists business_services_biz_idx on public.business_services (business_id, sort_order);

create table if not exists public.business_hours (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),   -- 0 = Sunday
  opens       time,
  closes      time,
  closed      boolean not null default false,
  check (closed or (opens is not null and closes is not null))
);
create index if not exists business_hours_biz_idx on public.business_hours (business_id, weekday);

create table if not exists public.business_promotions (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 100),
  description text check (char_length(description) <= 600),
  image_path  text,
  starts_on   date not null default public.biz_today(),
  ends_on     date not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index if not exists business_promotions_biz_idx on public.business_promotions (business_id, ends_on);

-- ---------- Reviews ----------
create table if not exists public.business_reviews (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  reviewer_name text,
  rating      smallint not null check (rating between 1 and 5),
  title       text check (char_length(title) <= 100),
  body        text not null check (char_length(body) between 20 and 2000),
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  moderation_note text,
  created_at  timestamptz not null default now(),
  moderated_at timestamptz,
  unique (business_id, user_id)
);
create index if not exists business_reviews_biz_idx on public.business_reviews (business_id, status, created_at desc);

create table if not exists public.business_review_replies (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null unique references public.business_reviews (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  body        text not null check (char_length(body) between 2 and 1500),
  status      text not null default 'published' check (status in ('published', 'hidden')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Verification and claims (documents in the private bucket) ----------
create table if not exists public.business_verifications (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  submitted_by  uuid references auth.users (id) on delete set null,
  evidence_type text not null check (evidence_type in ('registration_certificate', 'business_permit', 'contact_confirmation', 'ownership_confirmation', 'professional_licence', 'other')),
  document_path text,
  notes         text check (char_length(notes) <= 1000),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note    text,
  reviewed_by   uuid references auth.users (id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists business_verifications_biz_idx on public.business_verifications (business_id, status);

create table if not exists public.business_claims (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  claimant_name text not null check (char_length(claimant_name) between 2 and 100),
  claimant_role text check (char_length(claimant_role) <= 80),
  phone         text check (phone is null or phone ~ '^\+?[0-9 ]{9,16}$'),
  evidence_path text,
  message       text check (char_length(message) <= 1500),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note    text,
  reviewed_by   uuid references auth.users (id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create unique index if not exists business_claims_open_uniq on public.business_claims (business_id, user_id) where status = 'pending';

-- ---------- Subscriptions, invoices, payments ----------
create sequence if not exists public.business_invoice_seq;
create table if not exists public.business_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses (id) on delete cascade,
  package_slug  text not null references public.business_packages (slug),
  billing       text not null default 'monthly' check (billing in ('monthly', 'annual')),
  status        text not null default 'pending_payment' check (status in ('pending_payment', 'active', 'expired', 'cancelled', 'complimentary')),
  starts_on     date,
  ends_on       date,
  list_price_kes numeric(12,2) not null default 0,
  discount_code text,
  discount_kes  numeric(12,2) not null default 0,
  amount_kes    numeric(12,2) not null default 0,
  note          text,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  activated_at  timestamptz
);
create index if not exists business_subscriptions_biz_idx on public.business_subscriptions (business_id, status, ends_on);

create table if not exists public.business_invoices (
  id             uuid primary key default gen_random_uuid(),
  number         text unique not null,
  subscription_id uuid not null unique references public.business_subscriptions (id) on delete cascade,
  business_id    uuid not null references public.businesses (id) on delete cascade,
  description    text not null,
  list_price_kes numeric(12,2) not null,
  discount_kes   numeric(12,2) not null default 0,
  amount_kes     numeric(12,2) not null,
  status         text not null default 'unpaid' check (status in ('unpaid', 'paid', 'void')),
  issued_at      timestamptz not null default now(),
  due_date       date,
  paid_at        timestamptz,
  receipt_number text unique
);

create table if not exists public.business_payments (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.business_subscriptions (id) on delete cascade,
  business_id     uuid references public.businesses (id) on delete set null,
  method          text not null check (method in ('mpesa_manual', 'bank_transfer', 'cash', 'card', 'mpesa_stk', 'other')),
  reference       text not null check (char_length(reference) between 4 and 60),
  amount_kes      numeric(12,2) not null check (amount_kes > 0),
  payer_phone     text,
  status          text not null default 'pending_verification' check (status in ('pending_verification', 'confirmed', 'rejected')),
  note            text,
  reported_by     uuid references auth.users (id) on delete set null,
  verified_by     uuid references auth.users (id),
  verified_at     timestamptz,
  created_at      timestamptz not null default now()
);
create unique index if not exists business_payments_ref_uniq on public.business_payments (method, upper(reference)) where status <> 'rejected';

-- ---------- Enquiries, analytics, favourites, reports, audit ----------
create table if not exists public.business_enquiries (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  name        text not null check (char_length(name) between 2 and 80),
  phone       text check (phone is null or phone ~ '^\+?[0-9 ]{9,16}$'),
  email       text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message     text not null check (char_length(message) between 5 and 1500),
  status      text not null default 'new' check (status in ('new', 'read', 'replied', 'closed', 'spam')),
  ip_hash     text,
  created_at  timestamptz not null default now(),
  check (phone is not null or email is not null)
);
create index if not exists business_enquiries_biz_idx on public.business_enquiries (business_id, created_at desc);

create table if not exists public.business_analytics (
  id           bigserial primary key,
  business_id  uuid not null references public.businesses (id) on delete cascade,
  event        text not null check (event in ('view', 'search_impression', 'phone', 'whatsapp', 'website', 'email', 'directions', 'share', 'enquiry', 'social', 'product_whatsapp')),
  day          date not null default public.biz_today(),
  session_hash text,
  ip_hash      text,
  source       text,
  created_at   timestamptz not null default now()
);
create index if not exists business_analytics_biz_day_idx on public.business_analytics (business_id, day, event);
create index if not exists business_analytics_dedupe_idx on public.business_analytics (business_id, event, session_hash, day);

create table if not exists public.business_favourites (
  user_id     uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, business_id)
);

create table if not exists public.business_reports (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  review_id   uuid references public.business_reviews (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  reason      text not null check (reason in ('incorrect_information', 'closed', 'fraud', 'illegal', 'inappropriate', 'personal_information', 'fake_review', 'spam', 'other')),
  details     text check (char_length(details) <= 1500),
  contact     text check (char_length(contact) <= 120),
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_note  text,
  ip_hash     text,
  created_at  timestamptz not null default now(),
  check (business_id is not null or review_id is not null)
);

create table if not exists public.business_audit_logs (
  id         bigserial primary key,
  actor      uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  details    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists business_audit_entity_idx on public.business_audit_logs (entity, entity_id, created_at desc);

-- Who may bypass the owner rules: administrators, the database itself (SQL Editor, migrations,
-- service role) and the directory's own internal steps (biz.system flag, set and cleared inside
-- one statement). Inside SECURITY DEFINER functions current_user is always the owner, so the
-- caller is identified from the request's JWT instead.
create or replace function public.biz_privileged() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or coalesce(current_setting('biz.system', true), '') = 'on'
    or coalesce(nullif(current_setting('request.jwt.claims', true), ''), '') = ''
    or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
$$;
create or replace function public.biz_system(p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('biz.system', case when p_on then 'on' else 'off' end, true);
end $$;
revoke execute on function public.biz_system(boolean) from public, anon, authenticated;

create or replace function public.biz_audit(p_action text, p_entity text, p_id text, p_details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.business_audit_logs (actor, action, entity, entity_id, details) values (auth.uid(), p_action, p_entity, p_id, p_details);
$$;

-- =============================================================
--  Package in force: an active (paid) or complimentary subscription covering today;
--  otherwise Free. Expired listings fall back to Free automatically — nothing is deleted.
-- =============================================================
create or replace function public.biz_package(p_business uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((
    select s.package_slug from public.business_subscriptions s join public.business_packages p on p.slug = s.package_slug
    where s.business_id = p_business and s.status in ('active', 'complimentary')
      and s.starts_on <= public.biz_today() and s.ends_on >= public.biz_today()
    order by p.sort_order desc limit 1), 'free')
$$;

-- =============================================================
--  Guards (triggers)
-- =============================================================
create or replace function public.biz_unique_slug(p_name text, p_id uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare base text := left(public.biz_slugify(p_name), 60); s text; n int := 1;
begin
  if base = '' or base is null then base := 'business'; end if;
  -- words used by directory pages and category addresses cannot be business addresses
  if base in ('register', 'dashboard', 'terms', 'search', 'county', 'invoice', 'claim', 'about', 'sitemap')
     or exists (select 1 from public.business_categories where slug = base) then base := base || '-business'; end if;
  s := base;
  while exists (select 1 from public.businesses where slug = s and id is distinct from p_id) loop
    n := n + 1; s := base || '-' || n;
  end loop;
  return s;
end $$;

create or replace function public.biz_business_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare admin boolean := public.biz_privileged();
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if auth.uid() is null and not admin then raise exception 'Please sign in.'; end if;
    new.created_by := coalesce(new.created_by, auth.uid());
    if new.slug is null or new.slug = '' then new.slug := public.biz_unique_slug(new.name, new.id); end if;
  end if;
  if new.slug is distinct from (case when tg_op = 'UPDATE' then old.slug end) then
    new.slug := public.biz_unique_slug(new.slug, new.id);
  end if;
  if not admin then
    -- owners can only move a listing between draft and pending (submit / withdraw)
    if tg_op = 'INSERT' then
      if new.status not in ('draft', 'pending') then new.status := 'draft'; end if;
      new.verified := false; new.verified_at := null; new.featured_until := null; new.claimable := false;
      new.rating_avg := 0; new.rating_count := 0; new.source_note := null; new.status_note := null; new.published_at := null;
    else
      if old.status = 'suspended' and new.status <> 'suspended' then raise exception 'This listing is suspended. Please contact IMMA Media.'; end if;
      if new.status <> old.status and not (new.status in ('draft', 'pending') or (old.status = 'approved' and new.status = 'draft')) then
        raise exception 'Only IMMA Media can approve or reject a listing.';
      end if;
      if new.status = 'pending' and old.status = 'approved' then new.status := 'approved'; end if;   -- edits to live listings stay live
      new.verified := old.verified; new.verified_at := old.verified_at; new.featured_until := old.featured_until;
      new.claimable := old.claimable; new.rating_avg := old.rating_avg; new.rating_count := old.rating_count;
      new.source_note := old.source_note; new.published_at := old.published_at; new.created_by := old.created_by;
      if new.status = old.status then new.status_note := old.status_note; end if;
    end if;
    if new.status = 'pending' and new.terms_accepted_at is null then raise exception 'Please accept the directory terms before submitting.'; end if;
    if new.status = 'pending' and (new.description is null or char_length(new.description) < 40) then raise exception 'Please add a description of at least 40 characters.'; end if;
    if new.status = 'pending' and new.category_id is null then raise exception 'Please choose a category.'; end if;
  end if;
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then new.published_at := coalesce(new.published_at, now()); end if;
  if new.verified and (tg_op = 'INSERT' or not old.verified) then new.verified_at := now(); end if;
  if not new.verified then new.verified_at := null; end if;
  return new;
end $$;
drop trigger if exists biz_business_guard on public.businesses;
create trigger biz_business_guard before insert or update on public.businesses for each row execute function public.biz_business_guard();

create or replace function public.biz_business_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and auth.uid() is not null and not public.is_admin() then
    perform public.biz_system(true);
    insert into public.business_owners (business_id, user_id, role) values (new.id, auth.uid(), 'owner') on conflict do nothing;
    perform public.biz_system(false);
  end if;
  if tg_op = 'INSERT' then
    perform public.biz_audit('create', 'business', new.id::text, jsonb_build_object('name', new.name, 'status', new.status));
  elsif old.status <> new.status or old.verified <> new.verified or old.featured_until is distinct from new.featured_until then
    perform public.biz_audit('status', 'business', new.id::text, jsonb_build_object('from', old.status, 'to', new.status, 'verified', new.verified, 'featured_until', new.featured_until, 'note', new.status_note));
  else
    perform public.biz_audit('edit', 'business', new.id::text, jsonb_build_object('name', new.name));
  end if;
  return new;
end $$;
drop trigger if exists biz_business_after on public.businesses;
create trigger biz_business_after after insert or update on public.businesses for each row execute function public.biz_business_after();

-- Owners: only admins add or remove people (claims add owners automatically)
create or replace function public.biz_owner_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.biz_privileged() then
    raise exception 'Only IMMA Media can change who manages a business.';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists biz_owner_guard on public.business_owners;
create trigger biz_owner_guard before insert or update or delete on public.business_owners for each row execute function public.biz_owner_guard();

-- Reviews: signed-in readers with a confirmed email; not the business's own people; moderated
create or replace function public.biz_review_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare recent int;
begin
  if public.is_admin() then
    if tg_op = 'UPDATE' and new.status <> old.status then new.moderated_at := now(); end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.user_id <> auth.uid() then raise exception 'You can only edit your own review.'; end if;
    new.status := 'pending'; new.moderation_note := null; new.moderated_at := null;   -- edited reviews are checked again
    new.business_id := old.business_id; new.user_id := old.user_id; new.created_at := old.created_at;
    return new;
  end if;
  if auth.uid() is null then raise exception 'Please sign in to write a review.'; end if;
  if not exists (select 1 from auth.users where id = auth.uid() and (email_confirmed_at is not null or confirmed_at is not null)) then
    raise exception 'Please confirm your email address before writing a review.';
  end if;
  if public.biz_is_owner(new.business_id) then raise exception 'You cannot review a business you manage.'; end if;
  if not exists (select 1 from public.businesses where id = new.business_id and status = 'approved') then raise exception 'This business is not listed.'; end if;
  select count(*) into recent from public.business_reviews where user_id = auth.uid() and created_at > now() - interval '1 day';
  if recent >= 5 then raise exception 'You have written several reviews today. Please try again tomorrow.'; end if;
  new.user_id := auth.uid(); new.status := 'pending'; new.moderation_note := null; new.moderated_at := null;
  new.reviewer_name := left(coalesce(nullif(trim(new.reviewer_name), ''), (select split_part(coalesce(full_name, 'IMMA reader'), ' ', 1) from public.profiles where id = auth.uid()), 'IMMA reader'), 40);
  return new;
end $$;
drop trigger if exists biz_review_guard on public.business_reviews;
create trigger biz_review_guard before insert or update on public.business_reviews for each row execute function public.biz_review_guard();

create or replace function public.biz_review_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare b uuid := coalesce(new.business_id, old.business_id);
begin
  perform public.biz_system(true);
  update public.businesses set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.business_reviews where business_id = b and status = 'approved'), 0),
    rating_count = (select count(*) from public.business_reviews where business_id = b and status = 'approved')
  where id = b;
  perform public.biz_system(false);
  if tg_op = 'UPDATE' and new.status <> old.status then
    perform public.biz_audit('moderate', 'review', new.id::text, jsonb_build_object('from', old.status, 'to', new.status, 'note', new.moderation_note));
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists biz_review_after on public.business_reviews;
create trigger biz_review_after after insert or update or delete on public.business_reviews for each row execute function public.biz_review_after();

create or replace function public.biz_reply_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select business_id into new.business_id from public.business_reviews where id = new.review_id;
  if new.business_id is null then raise exception 'Review not found.'; end if;
  if not public.is_admin() then
    if not public.biz_is_owner(new.business_id) then raise exception 'Only the business can reply to its reviews.'; end if;
    new.user_id := auth.uid();
    if tg_op = 'UPDATE' then new.status := old.status; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists biz_reply_guard on public.business_review_replies;
create trigger biz_reply_guard before insert or update on public.business_review_replies for each row execute function public.biz_reply_guard();

-- Verification requests: owners submit; only admins decide (and that sets the badge)
create or replace function public.biz_verification_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op <> 'INSERT' then raise exception 'Only IMMA Media can review verification requests.'; end if;
    if not public.biz_is_owner(new.business_id) then raise exception 'Not your business.'; end if;
    new.submitted_by := auth.uid(); new.status := 'pending'; new.admin_note := null; new.reviewed_by := null; new.reviewed_at := null;
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
  end if;
  return new;
end $$;
drop trigger if exists biz_verification_guard on public.business_verifications;
create trigger biz_verification_guard before insert or update on public.business_verifications for each row execute function public.biz_verification_guard();

create or replace function public.biz_verification_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status <> old.status then
    if new.status = 'approved' then update public.businesses set verified = true where id = new.business_id; end if;
    perform public.biz_audit(new.status, 'verification', new.id::text, jsonb_build_object('business', new.business_id, 'type', new.evidence_type, 'note', new.admin_note));
  end if;
  return new;
end $$;
drop trigger if exists biz_verification_after on public.business_verifications;
create trigger biz_verification_after after update on public.business_verifications for each row execute function public.biz_verification_after();

-- Claims: approving a claim gives the claimant access to the listing
create or replace function public.biz_claim_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if tg_op <> 'INSERT' then raise exception 'Only IMMA Media can review claims.'; end if;
    if auth.uid() is null then raise exception 'Please sign in to claim a business.'; end if;
    if not exists (select 1 from public.businesses where id = new.business_id and claimable and status = 'approved') then raise exception 'This listing cannot be claimed online. Please contact IMMA Media.'; end if;
    new.user_id := auth.uid(); new.status := 'pending'; new.admin_note := null; new.reviewed_by := null; new.reviewed_at := null;
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
  end if;
  return new;
end $$;
drop trigger if exists biz_claim_guard on public.business_claims;
create trigger biz_claim_guard before insert or update on public.business_claims for each row execute function public.biz_claim_guard();

create or replace function public.biz_claim_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status = 'approved' and old.status <> 'approved' then
    insert into public.business_owners (business_id, user_id, role) values (new.business_id, new.user_id, 'owner') on conflict do nothing;
    update public.businesses set claimable = false where id = new.business_id;
    perform public.biz_audit('approve', 'claim', new.id::text, jsonb_build_object('business', new.business_id, 'user', new.user_id));
  elsif tg_op = 'UPDATE' and new.status <> old.status then
    perform public.biz_audit(new.status, 'claim', new.id::text, jsonb_build_object('business', new.business_id, 'note', new.admin_note));
  end if;
  return new;
end $$;
drop trigger if exists biz_claim_after on public.business_claims;
create trigger biz_claim_after after update on public.business_claims for each row execute function public.biz_claim_after();

-- Subscriptions: owners can only start one through biz_start_subscription(); admins can grant complimentary ones
create or replace function public.biz_subscription_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.biz_privileged() then
    raise exception 'Please choose a package from your dashboard.';
  end if;
  if tg_op = 'INSERT' then new.created_by := coalesce(new.created_by, auth.uid()); end if;
  if new.status in ('active', 'complimentary') and new.starts_on is null then new.starts_on := public.biz_today(); end if;
  if new.status in ('active', 'complimentary') and new.ends_on is null then
    new.ends_on := (new.starts_on + case when new.billing = 'annual' then interval '1 year' else interval '1 month' end - interval '1 day')::date;
  end if;
  if new.status in ('active', 'complimentary') and (tg_op = 'INSERT' or old.status not in ('active', 'complimentary')) then new.activated_at := now(); end if;
  return new;
end $$;
drop trigger if exists biz_subscription_guard on public.business_subscriptions;
create trigger biz_subscription_guard before insert or update on public.business_subscriptions for each row execute function public.biz_subscription_guard();

create or replace function public.biz_subscription_after()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.biz_audit(lower(tg_op), 'subscription', new.id::text,
    jsonb_build_object('business', new.business_id, 'package', new.package_slug, 'status', new.status, 'starts', new.starts_on, 'ends', new.ends_on, 'amount', new.amount_kes));
  return new;
end $$;
drop trigger if exists biz_subscription_after on public.business_subscriptions;
create trigger biz_subscription_after after insert or update on public.business_subscriptions for each row execute function public.biz_subscription_after();

-- Price a package (server-side, so a browser cannot change the amount)
create or replace function public.biz_quote(p_package text, p_billing text, p_code text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.business_packages; c public.business_discount_codes; list numeric; disc numeric := 0;
begin
  select * into p from public.business_packages where slug = p_package and active;
  if not found or p.price_monthly_kes <= 0 then raise exception 'Choose a paid package.'; end if;
  if p_billing not in ('monthly', 'annual') then raise exception 'Choose monthly or annual billing.'; end if;
  list := case when p_billing = 'annual' then round(p.price_monthly_kes * 12 * (1 - p.annual_discount_pct / 100)) else p.price_monthly_kes end;
  if nullif(trim(p_code), '') is not null then
    select * into c from public.business_discount_codes where code = upper(trim(p_code)) and active;
    if not found then raise exception 'That discount code is not valid.'; end if;
    if c.valid_from is not null and public.biz_today() < c.valid_from then raise exception 'That discount code is not active yet.'; end if;
    if c.valid_to is not null and public.biz_today() > c.valid_to then raise exception 'That discount code has expired.'; end if;
    if c.max_uses is not null and c.used_count >= c.max_uses then raise exception 'That discount code has been fully used.'; end if;
    if c.packages is not null and not (p_package = any (c.packages)) then raise exception 'That code does not apply to this package.'; end if;
    if c.billing is not null and c.billing <> p_billing then raise exception 'That code only applies to % billing.', c.billing; end if;
    disc := least(list, coalesce(round(list * c.percent_off / 100), 0) + coalesce(c.amount_off_kes, 0));
  end if;
  return jsonb_build_object('package', p.slug, 'name', p.name, 'billing', p_billing, 'list_price', list, 'discount', disc, 'amount', list - disc, 'code', upper(nullif(trim(p_code), '')));
end $$;

-- Start a paid subscription: creates it (awaiting payment) and its invoice
create or replace function public.biz_start_subscription(p_business uuid, p_package text, p_billing text, p_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q jsonb; s public.business_subscriptions; inv public.business_invoices; bname text;
begin
  if not public.biz_can_edit(p_business) then raise exception 'Not your business.'; end if;
  q := public.biz_quote(p_package, p_billing, p_code);
  perform public.biz_system(true);
  -- replace any unpaid request for this business instead of piling them up
  update public.business_subscriptions set status = 'cancelled', note = 'Replaced by a new package choice'
    where business_id = p_business and status = 'pending_payment';
  update public.business_invoices set status = 'void' where business_id = p_business and status = 'unpaid';
  insert into public.business_subscriptions (business_id, package_slug, billing, status, list_price_kes, discount_code, discount_kes, amount_kes, created_by)
  values (p_business, p_package, p_billing, case when (q ->> 'amount')::numeric = 0 then 'active' else 'pending_payment' end,
          (q ->> 'list_price')::numeric, q ->> 'code', (q ->> 'discount')::numeric, (q ->> 'amount')::numeric, auth.uid())
  returning * into s;
  if q ->> 'code' is not null then update public.business_discount_codes set used_count = used_count + 1 where code = q ->> 'code'; end if;
  select name into bname from public.businesses where id = p_business;
  insert into public.business_invoices (number, subscription_id, business_id, description, list_price_kes, discount_kes, amount_kes, status, due_date, paid_at)
  values ('BD-' || to_char(now() at time zone 'Africa/Nairobi', 'YYYY') || '-' || lpad(nextval('public.business_invoice_seq')::text, 5, '0'),
          s.id, p_business, 'IMMA Business Directory — ' || (q ->> 'name') || ' listing (' || p_billing || ') for ' || bname,
          (q ->> 'list_price')::numeric, (q ->> 'discount')::numeric, (q ->> 'amount')::numeric,
          case when (q ->> 'amount')::numeric = 0 then 'paid' else 'unpaid' end, public.biz_today() + 7,
          case when (q ->> 'amount')::numeric = 0 then now() end)
  returning * into inv;
  perform public.biz_system(false);
  return jsonb_build_object('subscription', to_jsonb(s), 'invoice', to_jsonb(inv));
end $$;

-- Payments: owners report an M-Pesa or bank reference; only admins confirm
create or replace function public.biz_payment_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare s public.business_subscriptions;
begin
  select * into s from public.business_subscriptions where id = new.subscription_id;
  if not found then raise exception 'Subscription not found.'; end if;
  new.reference := upper(trim(new.reference));
  new.business_id := s.business_id;
  if not public.is_admin() then
    if tg_op <> 'INSERT' then raise exception 'Only IMMA Media can change a payment.'; end if;
    if not public.biz_is_owner(s.business_id) then raise exception 'Not your business.'; end if;
    if s.status <> 'pending_payment' then raise exception 'This package does not need a payment.'; end if;
    if new.method not in ('mpesa_manual', 'bank_transfer') then raise exception 'Choose M-Pesa or bank transfer.'; end if;
    new.status := 'pending_verification'; new.verified_by := null; new.verified_at := null; new.note := null; new.reported_by := auth.uid();
  else
    new.reported_by := coalesce(new.reported_by, auth.uid());
    if new.status <> 'pending_verification' and (tg_op = 'INSERT' or old.status <> new.status) then
      new.verified_by := auth.uid(); new.verified_at := now();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists biz_payment_guard on public.business_payments;
create trigger biz_payment_guard before insert or update on public.business_payments for each row execute function public.biz_payment_guard();

-- Confirmed payment → subscription starts (after any current paid period) and the invoice is marked paid
create or replace function public.biz_payment_after()
returns trigger language plpgsql security definer set search_path = public as $$
declare s public.business_subscriptions; paid numeric; start_on date;
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status <> 'confirmed') then
    select * into s from public.business_subscriptions where id = new.subscription_id;
    select coalesce(sum(amount_kes), 0) into paid from public.business_payments where subscription_id = s.id and status = 'confirmed';
    if paid >= s.amount_kes and s.status = 'pending_payment' then
      select greatest(public.biz_today(), coalesce(max(ends_on) + 1, public.biz_today())) into start_on
        from public.business_subscriptions where business_id = s.business_id and status in ('active', 'complimentary') and ends_on >= public.biz_today()
          and package_slug = s.package_slug;
      update public.business_subscriptions set status = 'active', starts_on = start_on, ends_on = null where id = s.id;
      update public.business_invoices set status = 'paid', paid_at = now(),
        receipt_number = 'RC-' || substr(number, 4) where subscription_id = s.id and status <> 'paid';
    end if;
    perform public.biz_audit('confirm', 'payment', new.id::text, jsonb_build_object('amount', new.amount_kes, 'reference', new.reference));
  elsif tg_op = 'UPDATE' and new.status = 'rejected' and old.status <> 'rejected' then
    perform public.biz_audit('reject', 'payment', new.id::text, jsonb_build_object('reference', new.reference, 'note', new.note));
  end if;
  return new;
end $$;
drop trigger if exists biz_payment_after on public.business_payments;
create trigger biz_payment_after after insert or update on public.business_payments for each row execute function public.biz_payment_after();

-- Enquiries and reports from the public: rate-limited per connection
create or replace function public.biz_public_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare ip text := public.ad_client_ip_hash(); n int;
begin
  new.ip_hash := ip;
  if tg_table_name = 'business_enquiries' then
    new.status := 'new'; new.user_id := auth.uid();
    if not exists (select 1 from public.businesses where id = new.business_id and status = 'approved') then raise exception 'This business is not listed.'; end if;
    select count(*) into n from public.business_enquiries where ip_hash = ip and created_at > now() - interval '1 hour';
    if n >= 8 then raise exception 'Too many messages. Please try again later.'; end if;
  else
    new.status := 'open'; new.admin_note := null; new.user_id := auth.uid();
    select count(*) into n from public.business_reports where ip_hash = ip and created_at > now() - interval '1 hour';
    if n >= 10 then raise exception 'Too many reports. Please try again later.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists biz_enquiry_guard on public.business_enquiries;
create trigger biz_enquiry_guard before insert on public.business_enquiries for each row when (not public.is_admin()) execute function public.biz_public_guard();
drop trigger if exists biz_report_guard on public.business_reports;
create trigger biz_report_guard before insert on public.business_reports for each row when (not public.is_admin()) execute function public.biz_public_guard();

-- Owners' content changes are logged too
create or replace function public.biz_content_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.biz_audit(lower(tg_op), tg_table_name, coalesce(new.id, old.id)::text, jsonb_build_object('business', coalesce(new.business_id, old.business_id)));
  return coalesce(new, old);
end $$;
do $$
declare t text;
begin
  foreach t in array array['business_locations', 'business_images', 'business_products', 'business_services', 'business_promotions'] loop
    execute format('drop trigger if exists biz_content_audit on public.%I', t);
    execute format('create trigger biz_content_audit after insert or update or delete on public.%I for each row execute function public.biz_content_audit()', t);
  end loop;
end $$;

create or replace function public.biz_admin_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    perform public.biz_audit(lower(tg_op), tg_table_name, coalesce(to_jsonb(new) ->> 'slug', to_jsonb(new) ->> 'code', to_jsonb(old) ->> 'slug', to_jsonb(old) ->> 'code'),
      case when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)) else to_jsonb(coalesce(new, old)) end);
  end if;
  return coalesce(new, old);
end $$;
do $$
declare t text;
begin
  foreach t in array array['business_packages', 'business_discount_codes', 'business_categories'] loop
    execute format('drop trigger if exists biz_admin_audit on public.%I', t);
    execute format('create trigger biz_admin_audit after insert or update or delete on public.%I for each row execute function public.biz_admin_audit()', t);
  end loop;
end $$;

-- =============================================================
--  Public, privacy-safe views (what the website reads)
-- =============================================================
create or replace view public.dir_businesses as
with live as (
  select b.*, public.biz_package(b.id) as package from public.businesses b where b.status = 'approved'
)
select l.id, l.slug, l.name, l.tagline, l.description, l.category_id,
  c.slug as category_slug, c.name as category_name, l.subcategory_ids, l.keywords,
  case when p.allow_catalogue then l.product_categories else '{}' end as product_categories,
  l.logo_path, case when p.max_photos > 0 then l.cover_path end as cover_path,
  case when p.allow_video then l.video_url end as video_url,
  l.phone, l.whatsapp, l.email,
  case when p.allow_links then l.website end as website,
  case when p.allow_links then l.socials else '{}'::jsonb end as socials,
  case when p.allow_hours then l.hours_note end as hours_note,
  l.price_range, l.delivery, l.is_online, l.has_premises, l.verified, l.verified_at,
  l.rating_avg, l.rating_count, l.claimable, l.created_at, l.updated_at, l.published_at,
  l.package, p.name as package_name, p.max_photos, p.allow_hours, p.allow_catalogue, p.allow_map, p.allow_offers, p.premium_design,
  (p.priority_search) as sponsored,
  (p.featured_category or coalesce(l.featured_until >= public.biz_today(), false)) as featured,
  (p.featured_home or coalesce(l.featured_until >= public.biz_today(), false)) as featured_home,
  loc.county, loc.town, loc.neighbourhood,
  case when loc.show_address then loc.address_line end as address_line,
  case when loc.show_address then loc.landmark end as landmark,
  case when loc.show_address and p.allow_map then loc.latitude end as latitude,
  case when loc.show_address and p.allow_map then loc.longitude end as longitude,
  case when p.allow_hours then (select jsonb_agg(jsonb_build_object('d', h.weekday, 'o', to_char(h.opens, 'HH24:MI'), 'c', to_char(h.closes, 'HH24:MI'), 'x', h.closed) order by h.weekday, h.opens)
    from public.business_hours h where h.business_id = l.id) end as hours,
  exists (select 1 from public.business_promotions pr where pr.business_id = l.id and pr.active and p.allow_offers
    and public.biz_today() between pr.starts_on and pr.ends_on) as has_offer,
  lower(concat_ws(' ', l.name, l.tagline, c.name, array_to_string(l.keywords, ' '), loc.county, loc.town, loc.neighbourhood,
    (select string_agg(s.name, ' ') from public.business_categories s where s.id = any (l.subcategory_ids)),
    case when p.allow_catalogue then (select string_agg(pr.name || ' ' || coalesce(pr.product_category, ''), ' ') from public.business_products pr where pr.business_id = l.id and pr.active) end,
    case when p.allow_catalogue then (select string_agg(sv.name, ' ') from public.business_services sv where sv.business_id = l.id) end)) as search_text
from live l
join public.business_packages p on p.slug = l.package
left join public.business_categories c on c.id = l.category_id
left join lateral (select * from public.business_locations x where x.business_id = l.id order by x.is_primary desc, x.created_at limit 1) loc on true;

create or replace view public.dir_images as
select i.id, i.business_id, i.path, i.caption, i.sort_order from (
  select i.*, row_number() over (partition by i.business_id order by i.sort_order, i.created_at) as n from public.business_images i
) i join public.dir_businesses b on b.id = i.business_id where i.n <= b.max_photos;

create or replace view public.dir_products as
select p.id, p.business_id, p.name, p.description, p.image_path, p.price_kes,
  case when b.allow_offers then p.promo_price_kes end as promo_price_kes, p.availability, p.product_category, p.sort_order
from public.business_products p join public.dir_businesses b on b.id = p.business_id where p.active and b.allow_catalogue;

create or replace view public.dir_services as
select s.id, s.business_id, s.name, s.description, s.price_from_kes, s.price_note, s.sort_order
from public.business_services s join public.dir_businesses b on b.id = s.business_id where b.allow_catalogue;

create or replace view public.dir_promotions as
select pr.id, pr.business_id, pr.title, pr.description, pr.image_path, pr.starts_on, pr.ends_on
from public.business_promotions pr join public.dir_businesses b on b.id = pr.business_id
where pr.active and b.allow_offers and public.biz_today() between pr.starts_on and pr.ends_on;

create or replace view public.dir_reviews as
select r.id, r.business_id, r.reviewer_name, r.rating, r.title, r.body, r.created_at,
  rp.body as reply_body, rp.updated_at as reply_at
from public.business_reviews r join public.dir_businesses b on b.id = r.business_id
left join public.business_review_replies rp on rp.review_id = r.id and rp.status = 'published'
where r.status = 'approved';

-- =============================================================
--  Analytics (dedupes per visitor per day) and dashboards
-- =============================================================
create or replace function public.biz_track(p_business uuid, p_event text, p_session text default null, p_source text default null)
returns void language plpgsql security definer set search_path = public as $$
declare ip text := public.ad_client_ip_hash(); n int;
begin
  if p_event not in ('view', 'search_impression', 'phone', 'whatsapp', 'website', 'email', 'directions', 'share', 'enquiry', 'social', 'product_whatsapp') then return; end if;
  if not exists (select 1 from public.businesses where id = p_business and status = 'approved') then return; end if;
  if public.biz_is_owner(p_business) then return; end if;   -- owners' own visits don't count
  if exists (select 1 from public.business_analytics where business_id = p_business and event = p_event and day = public.biz_today()
             and session_hash = coalesce(left(p_session, 64), ip)) then return; end if;
  select count(*) into n from public.business_analytics where ip_hash = ip and day = public.biz_today();
  if n > 400 then return; end if;
  insert into public.business_analytics (business_id, event, session_hash, ip_hash, source)
  values (p_business, p_event, coalesce(left(p_session, 64), ip), ip, left(p_source, 60));
end $$;

create or replace function public.biz_stats(p_business uuid, p_from date, p_to date)
returns table (day date, event text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.biz_can_edit(p_business) then raise exception 'Not your business.'; end if;
  return query select a.day, a.event, count(*) from public.business_analytics a
    where a.business_id = p_business and a.day between p_from and p_to group by a.day, a.event order by a.day;
end $$;

-- Admin: mark lapsed subscriptions expired (listings fall back to Free on their own)
create or replace function public.biz_run_schedule() returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; soon int;
begin
  if not public.is_admin() then raise exception 'Administrators only.'; end if;
  update public.business_subscriptions set status = 'expired' where status in ('active', 'complimentary') and ends_on < public.biz_today();
  get diagnostics n = row_count;
  select count(*) into soon from public.business_subscriptions where status in ('active', 'complimentary') and ends_on between public.biz_today() and public.biz_today() + 7;
  return jsonb_build_object('expired', n, 'expiring_7_days', soon);
end $$;

create or replace function public.biz_admin_kpis() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Administrators only.'; end if;
  select jsonb_build_object(
    'total', (select count(*) from public.businesses),
    'active', (select count(*) from public.businesses where status = 'approved'),
    'pending', (select count(*) from public.businesses where status = 'pending'),
    'paid', (select count(*) from public.businesses b where b.status = 'approved' and public.biz_package(b.id) <> 'free'),
    'free', (select count(*) from public.businesses b where b.status = 'approved' and public.biz_package(b.id) = 'free'),
    'verified', (select count(*) from public.businesses where verified),
    'mrr', (select coalesce(sum(case when billing = 'annual' then amount_kes / 12 else amount_kes end), 0) from public.business_subscriptions
            where status = 'active' and public.biz_today() between starts_on and ends_on),
    'revenue', (select coalesce(sum(amount_kes), 0) from public.business_payments where status = 'confirmed'),
    'expiring', (select count(*) from public.business_subscriptions where status in ('active', 'complimentary') and ends_on between public.biz_today() and public.biz_today() + 14),
    'views_30', (select count(*) from public.business_analytics where event = 'view' and day > public.biz_today() - 30),
    'enquiries_30', (select count(*) from public.business_enquiries where created_at > now() - interval '30 days'),
    'contacts_30', (select count(*) from public.business_analytics where event in ('phone', 'whatsapp', 'website', 'email', 'directions', 'product_whatsapp') and day > public.biz_today() - 30),
    'payments_to_check', (select count(*) from public.business_payments where status = 'pending_verification'),
    'reviews_to_check', (select count(*) from public.business_reviews where status = 'pending'),
    'reports_open', (select count(*) from public.business_reports where status = 'open'),
    'claims_open', (select count(*) from public.business_claims where status = 'pending'),
    'verifications_open', (select count(*) from public.business_verifications where status = 'pending')
  ) into r;
  return r;
end $$;

-- =============================================================
--  Row-level security
-- =============================================================
do $$
declare t text;
begin
  foreach t in array array['business_categories', 'business_packages', 'business_discount_codes', 'businesses', 'business_owners', 'business_locations',
    'business_images', 'business_products', 'business_services', 'business_hours', 'business_promotions', 'business_reviews', 'business_review_replies',
    'business_verifications', 'business_claims', 'business_subscriptions', 'business_invoices', 'business_payments', 'business_enquiries',
    'business_analytics', 'business_favourites', 'business_reports', 'business_audit_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Admins manage" on public.%I', t);
    execute format('create policy "Admins manage" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "Public categories" on public.business_categories;
create policy "Public categories" on public.business_categories for select using (active or public.is_admin());
drop policy if exists "Public packages" on public.business_packages;
create policy "Public packages" on public.business_packages for select using (active or public.is_admin());

-- Businesses: owners see and edit their own; anyone signed in can start one
drop policy if exists "Owners read" on public.businesses;
-- created_by: lets the creator read the row back while it is being inserted (ownership is added just after)
create policy "Owners read" on public.businesses for select using (public.biz_is_owner(id) or created_by = auth.uid());
drop policy if exists "Signed-in create" on public.businesses;
create policy "Signed-in create" on public.businesses for insert to authenticated with check (auth.uid() is not null);
drop policy if exists "Owners update" on public.businesses;
create policy "Owners update" on public.businesses for update using (public.biz_is_owner(id)) with check (public.biz_is_owner(id));
drop policy if exists "Owners delete drafts" on public.businesses;
create policy "Owners delete drafts" on public.businesses for delete using (public.biz_is_owner(id) and status in ('draft', 'rejected'));

drop policy if exists "Own memberships" on public.business_owners;
create policy "Own memberships" on public.business_owners for select using (user_id = auth.uid() or public.biz_is_owner(business_id));

-- Child content: full control for the business's owners
do $$
declare t text;
begin
  foreach t in array array['business_locations', 'business_images', 'business_products', 'business_services', 'business_hours', 'business_promotions'] loop
    execute format('drop policy if exists "Owners manage" on public.%I', t);
    execute format('create policy "Owners manage" on public.%I for all using (public.biz_is_owner(business_id)) with check (public.biz_is_owner(business_id))', t);
  end loop;
end $$;

drop policy if exists "Write own review" on public.business_reviews;
create policy "Write own review" on public.business_reviews for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "See own and own-business reviews" on public.business_reviews;
create policy "See own and own-business reviews" on public.business_reviews for select using (user_id = auth.uid() or public.biz_is_owner(business_id));
drop policy if exists "Edit own review" on public.business_reviews;
create policy "Edit own review" on public.business_reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Delete own review" on public.business_reviews;
create policy "Delete own review" on public.business_reviews for delete using (user_id = auth.uid());

drop policy if exists "Owners reply" on public.business_review_replies;
create policy "Owners reply" on public.business_review_replies for all using (public.biz_is_owner(business_id)) with check (public.biz_is_owner(business_id));

drop policy if exists "Owners request verification" on public.business_verifications;
create policy "Owners request verification" on public.business_verifications for insert with check (public.biz_is_owner(business_id));
drop policy if exists "Owners see verification" on public.business_verifications;
create policy "Owners see verification" on public.business_verifications for select using (public.biz_is_owner(business_id));

drop policy if exists "Claim" on public.business_claims;
create policy "Claim" on public.business_claims for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "See own claims" on public.business_claims;
create policy "See own claims" on public.business_claims for select using (user_id = auth.uid());

drop policy if exists "Owners see subscriptions" on public.business_subscriptions;
create policy "Owners see subscriptions" on public.business_subscriptions for select using (public.biz_is_owner(business_id));
drop policy if exists "Owners see invoices" on public.business_invoices;
create policy "Owners see invoices" on public.business_invoices for select using (public.biz_is_owner(business_id));
drop policy if exists "Owners see payments" on public.business_payments;
create policy "Owners see payments" on public.business_payments for select using (public.biz_is_owner(business_id));
drop policy if exists "Owners report payment" on public.business_payments;
create policy "Owners report payment" on public.business_payments for insert to authenticated
  with check (exists (select 1 from public.business_subscriptions s where s.id = subscription_id and public.biz_is_owner(s.business_id)));

drop policy if exists "Anyone can enquire" on public.business_enquiries;
create policy "Anyone can enquire" on public.business_enquiries for insert with check (status = 'new');
drop policy if exists "Owners read enquiries" on public.business_enquiries;
create policy "Owners read enquiries" on public.business_enquiries for select using (public.biz_is_owner(business_id));
drop policy if exists "Owners update enquiries" on public.business_enquiries;
create policy "Owners update enquiries" on public.business_enquiries for update using (public.biz_is_owner(business_id)) with check (public.biz_is_owner(business_id));

drop policy if exists "Own favourites" on public.business_favourites;
create policy "Own favourites" on public.business_favourites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Anyone can report" on public.business_reports;
create policy "Anyone can report" on public.business_reports for insert with check (status = 'open');

-- Grants
grant select on public.business_categories, public.business_packages to anon, authenticated;
grant select on public.dir_businesses, public.dir_images, public.dir_products, public.dir_services, public.dir_promotions, public.dir_reviews to anon, authenticated;
grant select, insert, update, delete on public.businesses, public.business_locations, public.business_images, public.business_products,
  public.business_services, public.business_hours, public.business_promotions, public.business_reviews, public.business_review_replies,
  public.business_favourites, public.business_owners, public.business_categories, public.business_packages, public.business_discount_codes,
  public.business_subscriptions, public.business_invoices, public.business_payments, public.business_verifications, public.business_claims,
  public.business_enquiries, public.business_reports, public.business_audit_logs to authenticated;
grant select on public.business_analytics to authenticated;
grant insert on public.business_enquiries, public.business_reports to anon;
grant usage, select on sequence public.business_invoice_seq, public.business_analytics_id_seq, public.business_audit_logs_id_seq to authenticated;
grant execute on function public.biz_track(uuid, text, text, text) to anon, authenticated;
grant execute on function public.biz_quote(text, text, text) to anon, authenticated;
grant execute on function public.biz_start_subscription(uuid, text, text, text), public.biz_stats(uuid, date, date),
  public.biz_run_schedule(), public.biz_admin_kpis(), public.biz_is_owner(uuid), public.biz_can_edit(uuid), public.biz_package(uuid) to authenticated;
revoke execute on function public.biz_start_subscription(uuid, text, text, text) from anon;

-- =============================================================
--  Storage
--   business-media (public): logos, photos, product pictures — folder = business id
--   business-docs (private): verification and claim evidence — folder = uploader's user id
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-media', 'business-media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-docs', 'business-docs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

create or replace function public.biz_folder_owner(p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare f text := (storage.foldername(p_name))[1];
begin
  if f !~ '^[0-9a-f-]{36}$' then return false; end if;
  return public.biz_can_edit(f::uuid);
end $$;
grant execute on function public.biz_folder_owner(text) to authenticated;

drop policy if exists "Business media upload" on storage.objects;
create policy "Business media upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'business-media' and public.biz_folder_owner(name));
drop policy if exists "Business media update" on storage.objects;
create policy "Business media update" on storage.objects for update to authenticated
  using (bucket_id = 'business-media' and public.biz_folder_owner(name));
drop policy if exists "Business media delete" on storage.objects;
create policy "Business media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'business-media' and public.biz_folder_owner(name));
drop policy if exists "Business media list" on storage.objects;
create policy "Business media list" on storage.objects for select to authenticated
  using (bucket_id = 'business-media' and public.biz_folder_owner(name));

drop policy if exists "Business docs upload own" on storage.objects;
create policy "Business docs upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'business-docs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Business docs read own or admin" on storage.objects;
create policy "Business docs read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'business-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "Business docs delete admin" on storage.objects;
create policy "Business docs delete admin" on storage.objects for delete to authenticated
  using (bucket_id = 'business-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
