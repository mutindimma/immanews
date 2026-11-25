-- =============================================================
--  IMMA News — Kenya Citizen Resource Centre (Supabase migration)
--  Run AFTER setup.sql and advertising.sql (uses public.is_admin()).
--  Then run resources-seed.sql to load the verified starting content.
--  Safe to run again.
--
--  Rules:
--  * The public can read only rows with status = 'published'.
--  * Only admins can add, edit, approve or archive anything.
--  * Automatically collected notices arrive as 'pending' and need approval.
--  * Every change is written to resource_update_logs.
-- =============================================================

create table if not exists public.resource_categories (
  slug        text primary key check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  description text,
  icon        text,
  ad_category text,                        -- advert category used on these pages (see ad_campaigns.categories)
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

create table if not exists public.public_resources (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null check (slug ~ '^[a-z0-9-]+$'),
  category_slug text not null references public.resource_categories (slug) on update cascade,
  title         text not null check (char_length(title) between 3 and 160),
  summary       text not null check (char_length(summary) <= 600),
  content       jsonb not null default '{}'::jsonb,   -- eligibility, documents[], steps[], fees, processing, contacts[], caution, tips[], sources[]
  county        text,                                 -- null = national
  apply_url     text check (apply_url is null or apply_url ~* '^https://'),
  apply_label   text,
  source_name   text not null,
  source_url    text not null check (source_url ~* '^https://'),
  verification_status text not null default 'unverified'
                check (verification_status in ('verified', 'partially_verified', 'unverified', 'needs_review')),
  status        text not null default 'draft' check (status in ('draft', 'pending', 'published', 'archived')),
  published_at  date,
  last_verified date,
  next_review   date,
  expires_at    date,
  tags          text[] not null default '{}',
  sort_order    int not null default 0,
  updated_by    uuid default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists public_resources_cat_idx on public.public_resources (category_slug, status, sort_order);

create table if not exists public.resource_sources (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  url          text unique not null,
  kind         text not null default 'website' check (kind in ('website', 'api', 'rss', 'pdf', 'dataset')),
  automation   text not null default 'manual' check (automation in ('manual', 'api', 'rss')),
  terms_note   text,
  last_checked date,
  is_active    boolean not null default true
);

create table if not exists public.emergency_contacts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  number        text unique not null check (number ~ '^[0-9 +]{3,20}$'),
  description   text,
  available     text,
  sort_order    int not null default 0,
  source_name   text not null,
  source_url    text not null,
  last_verified date,
  status        text not null default 'published' check (status in ('draft', 'pending', 'published', 'archived'))
);

-- Only verified facilities may be added; nothing is imported from registries without a licence.
create table if not exists public.health_facilities (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  county        text not null,
  sub_county    text,
  facility_type text,
  level         text,
  ownership     text,
  registry_code text,                       -- KMHFR / NHFR code, so readers can check the official record
  phone         text,
  services      text,
  source_name   text not null,
  source_url    text not null,
  last_verified date,
  next_review   date,
  status        text not null default 'draft' check (status in ('draft', 'pending', 'published', 'archived'))
);
create index if not exists health_facilities_county_idx on public.health_facilities (county, status);

create table if not exists public.transport_information (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('fare', 'route', 'timetable', 'notice', 'other')),
  mode          text,                        -- sgr, commuter, matatu, bus, air
  title         text not null,
  origin        text,
  destination   text,
  price_kes     numeric(10,2),
  price_type    text check (price_type in ('verified', 'reported', 'estimated')),
  details       text,
  source_name   text not null,
  source_url    text not null,
  last_verified date,
  valid_until   date,
  status        text not null default 'draft' check (status in ('draft', 'pending', 'published', 'archived'))
);

create table if not exists public.fuel_prices (
  id          uuid primary key default gen_random_uuid(),
  cycle_start date not null,
  cycle_end   date not null,
  town        text not null,
  petrol      numeric(8,2) not null,
  diesel      numeric(8,2) not null,
  kerosene    numeric(8,2) not null,
  source_url  text not null,
  verified    boolean not null default false,
  status      text not null default 'pending' check (status in ('pending', 'published', 'archived')),
  created_at  timestamptz not null default now(),
  unique (cycle_start, town)
);

create table if not exists public.education_calendar (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  event_type    text not null check (event_type in ('term', 'half_term', 'holiday', 'exam', 'results', 'application', 'other')),
  level         text not null default 'all',
  start_date    date not null,
  end_date      date,
  notes         text,
  source_name   text not null,
  source_url    text not null,
  last_verified date,
  status        text not null default 'draft' check (status in ('draft', 'pending', 'published', 'archived')),
  unique (title, start_date)
);

create table if not exists public.scholarships (
  id            uuid primary key default gen_random_uuid(),
  name          text unique not null,
  institution   text not null,
  country       text not null,
  level         text,
  eligibility   text not null,
  coverage      text,
  deadline      date,
  opens_on      date,
  url           text not null check (url ~* '^https://'),
  open_status   text not null default 'check' check (open_status in ('open', 'closed', 'upcoming', 'check')),
  notes         text,
  last_verified date,
  next_review   date,
  status        text not null default 'draft' check (status in ('draft', 'pending', 'published', 'archived'))
);

create table if not exists public.public_notices (
  id            uuid primary key default gen_random_uuid(),
  category_slug text references public.resource_categories (slug) on update cascade,
  title         text unique not null,
  summary       text not null,
  county        text,
  source_name   text not null,
  source_url    text not null,
  starts_at     date,
  ends_at       date,
  origin        text not null default 'manual' check (origin in ('manual', 'automated')),
  external_id   text unique,                 -- e.g. ReliefWeb report id, to avoid duplicates
  status        text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'archived')),
  approved_by   uuid,
  approved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.resource_update_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  table_name text not null,
  row_id     text,
  action     text not null,
  details    jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Change log + approval stamp ----------
create or replace function public.resource_log_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid text;
begin
  rid := coalesce(to_jsonb(coalesce(new, old)) ->> 'id', to_jsonb(coalesce(new, old)) ->> 'slug');
  if tg_op = 'UPDATE' and tg_table_name = 'public_resources' then new.updated_at := now(); new.updated_by := auth.uid(); end if;
  if tg_op in ('INSERT', 'UPDATE') and tg_table_name = 'public_notices' and new.status = 'published'
     and (tg_op = 'INSERT' or old.status <> 'published') then
    new.approved_by := auth.uid(); new.approved_at := now();
  end if;
  insert into public.resource_update_logs (actor_id, table_name, row_id, action, details)
  values (auth.uid(), tg_table_name, rid, lower(tg_op),
          case when tg_op = 'UPDATE' then jsonb_build_object('status', jsonb_build_array(to_jsonb(old) ->> 'status', to_jsonb(new) ->> 'status'),
                                                             'title', coalesce(to_jsonb(new) ->> 'title', to_jsonb(new) ->> 'name'))
               when tg_op = 'INSERT' then jsonb_build_object('title', coalesce(to_jsonb(new) ->> 'title', to_jsonb(new) ->> 'name', to_jsonb(new) ->> 'town'))
               else jsonb_build_object('title', coalesce(to_jsonb(old) ->> 'title', to_jsonb(old) ->> 'name')) end);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['resource_categories', 'public_resources', 'resource_sources', 'emergency_contacts', 'health_facilities',
    'transport_information', 'fuel_prices', 'education_calendar', 'scholarships', 'public_notices'] loop
    execute format('drop trigger if exists resource_log_before on public.%I', t);
    execute format('drop trigger if exists resource_log_after on public.%I', t);
    if t in ('public_resources', 'public_notices') then
      execute format('create trigger resource_log_before before insert or update on public.%I for each row execute function public.resource_log_change()', t);
      execute format('create trigger resource_log_after after delete on public.%I for each row execute function public.resource_log_change()', t);
    else
      execute format('create trigger resource_log_after after insert or update or delete on public.%I for each row execute function public.resource_log_change()', t);
    end if;
  end loop;
end $$;

-- ---------- Housekeeping: flag stale items, hide expired ones ----------
create or replace function public.resource_housekeeping()
returns json language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Africa/Nairobi')::date; n_stale int; n_exp int; n_sch int; n_notice int;
begin
  -- Past their review date → flagged (still visible, with a "may have changed" label on the site)
  update public.public_resources set verification_status = 'needs_review'
    where status = 'published' and next_review < today and verification_status <> 'needs_review';
  get diagnostics n_stale = row_count;
  -- Expired resources and notices are archived (hidden from public listings)
  update public.public_resources set status = 'archived' where status = 'published' and expires_at < today;
  get diagnostics n_exp = row_count;
  update public.public_notices set status = 'archived' where status = 'published' and ends_at < today;
  get diagnostics n_notice = row_count;
  -- Scholarships past their deadline are marked closed
  update public.scholarships set open_status = 'closed' where open_status in ('open', 'upcoming') and deadline < today;
  get diagnostics n_sch = row_count;
  return json_build_object('flagged_for_review', n_stale, 'resources_expired', n_exp, 'notices_archived', n_notice, 'scholarships_closed', n_sch);
end $$;
grant execute on function public.resource_housekeeping() to authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'imma-resources-daily';
    perform cron.schedule('imma-resources-daily', '10 21 * * *', 'select public.resource_housekeeping();');
  end if;
exception when others then
  raise notice 'pg_cron not set up; the admin page runs housekeeping when it opens.';
end $$;

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['resource_categories', 'public_resources', 'resource_sources', 'emergency_contacts', 'health_facilities',
    'transport_information', 'fuel_prices', 'education_calendar', 'scholarships', 'public_notices', 'resource_update_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Admins manage" on public.%I', t);
    execute format('create policy "Admins manage" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
  foreach t in array array['public_resources', 'emergency_contacts', 'health_facilities', 'transport_information', 'fuel_prices',
    'education_calendar', 'scholarships', 'public_notices'] loop
    execute format('drop policy if exists "Public reads published" on public.%I', t);
    execute format('create policy "Public reads published" on public.%I for select using (status = %L)', t, 'published');
    execute format('grant select on public.%I to anon', t);
  end loop;
end $$;
drop policy if exists "Public reads categories" on public.resource_categories;
create policy "Public reads categories" on public.resource_categories for select using (true);
grant select on public.resource_categories to anon;
-- resource_sources and resource_update_logs: admins only (policy above)
