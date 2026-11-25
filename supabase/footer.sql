-- IMMA News — site footer settings and newsletter subscribers.
-- Run once in the Supabase SQL Editor (safe to run again). Needs advertising.sql first (is_admin, ad_audit, ad_client_ip_hash).

-- =============================================================
-- Site settings (footer). One JSON document per key; everyone can read, only admins can change.
-- =============================================================
create table if not exists public.site_settings (
  key        text primary key check (key ~ '^[a-z0-9_]{1,40}$'),
  value      jsonb not null check (jsonb_typeof(value) = 'object' and pg_column_size(value) < 65536),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.site_settings enable row level security;

drop policy if exists "site settings readable" on public.site_settings;
create policy "site settings readable" on public.site_settings for select using (true);
drop policy if exists "site settings admin insert" on public.site_settings;
create policy "site settings admin insert" on public.site_settings for insert to authenticated with check (public.is_admin());
drop policy if exists "site settings admin update" on public.site_settings;
create policy "site settings admin update" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "site settings admin delete" on public.site_settings;
create policy "site settings admin delete" on public.site_settings for delete to authenticated using (public.is_admin());

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

create or replace function public.site_settings_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists site_settings_stamp on public.site_settings;
create trigger site_settings_stamp before insert or update on public.site_settings
  for each row execute function public.site_settings_stamp();

-- Every change is written to the existing admin audit log
drop trigger if exists ad_admin_audit on public.site_settings;
create trigger ad_admin_audit after insert or update or delete on public.site_settings
  for each row execute function public.ad_admin_audit();

-- =============================================================
-- Newsletter subscribers. Nobody can read or write the table directly except admins;
-- the public uses the two functions below.
-- =============================================================
create table if not exists public.newsletter_subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null check (length(email) <= 254 and email = lower(email)),
  status            text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  consent           boolean not null check (consent),
  consent_text      text not null,
  consent_at        timestamptz not null default now(),
  source            text,
  ip_hash           text,
  confirmed         boolean not null default false,   -- becomes true once a confirmation email has been sent and clicked
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unsubscribed_at   timestamptz
);
create unique index if not exists newsletter_subscribers_email on public.newsletter_subscribers (email);
alter table public.newsletter_subscribers enable row level security;

drop policy if exists "newsletter admin read" on public.newsletter_subscribers;
create policy "newsletter admin read" on public.newsletter_subscribers for select to authenticated using (public.is_admin());
drop policy if exists "newsletter admin update" on public.newsletter_subscribers;
create policy "newsletter admin update" on public.newsletter_subscribers for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "newsletter admin delete" on public.newsletter_subscribers;
create policy "newsletter admin delete" on public.newsletter_subscribers for delete to authenticated using (public.is_admin());

revoke all on public.newsletter_subscribers from anon, authenticated;
grant select, update, delete on public.newsletter_subscribers to authenticated;

-- Abuse protection: recent attempts per (daily-hashed) IP address. No IP addresses are stored.
create table if not exists public.newsletter_attempts (
  id      bigint generated always as identity primary key,
  ip_hash text,
  kind    text not null,
  at      timestamptz not null default now()
);
alter table public.newsletter_attempts enable row level security;
revoke all on public.newsletter_attempts from anon, authenticated;

create or replace function public.newsletter_guard(p_kind text)
returns void language plpgsql security definer set search_path = public as $$
declare iph text := public.ad_client_ip_hash();
begin
  delete from public.newsletter_attempts where at < now() - interval '1 day';
  if iph is not null and (select count(*) from public.newsletter_attempts
      where ip_hash = iph and kind = p_kind and at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.newsletter_attempts (ip_hash, kind) values (iph, p_kind);
end $$;
revoke all on function public.newsletter_guard(text) from public, anon, authenticated;

create or replace function public.newsletter_subscribe(p_email text, p_consent boolean, p_source text default null, p_website text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  e text := lower(trim(coalesce(p_email, '')));
  enabled text;
  r public.newsletter_subscribers%rowtype;
  consent_words constant text := 'I agree to receive the IMMA News newsletter by email and accept the Privacy Policy. I can unsubscribe at any time.';
begin
  -- Hidden "website" field: real people leave it empty, simple bots fill it in
  if coalesce(p_website, '') <> '' then return json_build_object('status', 'subscribed'); end if;

  select value -> 'newsletter' ->> 'enabled' into enabled from public.site_settings where key = 'footer';
  if enabled = 'false' then raise exception 'newsletter_closed' using errcode = 'P0001'; end if;

  if length(e) > 254 or e !~ '^[a-z0-9._%+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;
  if not coalesce(p_consent, false) then raise exception 'consent_required' using errcode = 'P0001'; end if;

  perform public.newsletter_guard('subscribe');

  select * into r from public.newsletter_subscribers where email = e;
  if found and r.status = 'subscribed' then
    return json_build_object('status', 'already');
  elsif found then
    update public.newsletter_subscribers
       set status = 'subscribed', consent = true, consent_text = consent_words, consent_at = now(),
           source = left(p_source, 200), ip_hash = public.ad_client_ip_hash(), unsubscribed_at = null,
           unsubscribe_token = gen_random_uuid(), updated_at = now()
     where id = r.id returning * into r;
    return json_build_object('status', 'resubscribed', 'token', r.unsubscribe_token);
  end if;

  insert into public.newsletter_subscribers (email, consent, consent_text, source, ip_hash)
  values (e, true, consent_words, left(p_source, 200), public.ad_client_ip_hash())
  returning * into r;
  return json_build_object('status', 'subscribed', 'token', r.unsubscribe_token);
end $$;

-- Unsubscribe with the link token (from an email or the confirmation message) or with the address itself.
-- The answer is the same whether or not the address was on the list, so nobody can use it to check who subscribed.
create or replace function public.newsletter_unsubscribe(p_token uuid default null, p_email text default null)
returns json language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email, '')));
begin
  if p_token is null and e = '' then raise exception 'invalid_email' using errcode = 'P0001'; end if;
  if p_token is null and (length(e) > 254 or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;
  perform public.newsletter_guard('unsubscribe');
  update public.newsletter_subscribers
     set status = 'unsubscribed', unsubscribed_at = now(), updated_at = now()
   where status = 'subscribed'
     and ((p_token is not null and unsubscribe_token = p_token) or (p_token is null and email = e));
  return json_build_object('status', 'unsubscribed');
end $$;

revoke all on function public.newsletter_subscribe(text, boolean, text, text) from public;
revoke all on function public.newsletter_unsubscribe(uuid, text) from public;
grant execute on function public.newsletter_subscribe(text, boolean, text, text) to anon, authenticated;
grant execute on function public.newsletter_unsubscribe(uuid, text) to anon, authenticated;
