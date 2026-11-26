-- =============================================================
--  IMMA News — readership counts for "Most read" (and homepage settings)
--  Run once in the Supabase SQL Editor (safe to run again).
--  Needs: advertising.sql (is_admin, ad_client_ip_hash) and footer.sql (site_settings).
--
--  A story view is stored as: story key, day, a random per-tab session code and a
--  one-way, daily-changing hash of the connection. No names, accounts or IP addresses.
--  Readers who switch off "Advert measurement" in Cookie Settings are not counted.
-- =============================================================

create table if not exists public.story_views (
  id           bigserial primary key,
  story_key    text not null check (char_length(story_key) between 3 and 160),
  day          date not null default (now() at time zone 'Africa/Nairobi')::date,
  session_hash text,
  ip_hash      text,
  created_at   timestamptz not null default now()
);
create index if not exists story_views_day_idx on public.story_views (day, story_key);
create index if not exists story_views_dedupe_idx on public.story_views (story_key, session_hash, day);
alter table public.story_views enable row level security;
drop policy if exists "Admins read story views" on public.story_views;
create policy "Admins read story views" on public.story_views for select using (public.is_admin());

-- Count one view per reader per story per day; cap per connection to resist inflation
create or replace function public.track_story_view(p_key text, p_session text default null)
returns void language plpgsql security definer set search_path = public as $$
declare ip text := public.ad_client_ip_hash(); d date := (now() at time zone 'Africa/Nairobi')::date; n int; s text;
begin
  if p_key is null or p_key !~ '^[a-z0-9-]{3,160}$' then return; end if;
  s := coalesce(left(p_session, 64), ip);
  if s is null then return; end if;
  if exists (select 1 from public.story_views where story_key = p_key and session_hash = s and day = d) then return; end if;
  select count(*) into n from public.story_views where ip_hash = ip and day = d;
  if n > 300 then return; end if;
  insert into public.story_views (story_key, session_hash, ip_hash) values (p_key, s, ip);
end $$;

-- Most read: totals only (no visitor data leaves the database)
create or replace function public.trending_stories(p_days int default 7, p_limit int default 8)
returns table (story_key text, views bigint)
language sql stable security definer set search_path = public as $$
  select v.story_key, count(*) as views from public.story_views v
  where v.day > (now() at time zone 'Africa/Nairobi')::date - greatest(1, least(p_days, 60))
  group by v.story_key
  having count(*) >= 3          -- do not rank stories on one or two visits
  order by views desc, max(v.created_at) desc
  limit greatest(1, least(p_limit, 20));
$$;

grant execute on function public.track_story_view(text, text) to anon, authenticated;
grant execute on function public.trending_stories(int, int) to anon, authenticated;

-- Homepage and design settings live in site_settings (keys "homepage" and "theme"),
-- readable by everyone and editable only by administrators (policies from footer.sql).
insert into public.site_settings (key, value) values ('homepage', '{}'::jsonb) on conflict (key) do nothing;
insert into public.site_settings (key, value) values ('theme', '{}'::jsonb) on conflict (key) do nothing;
