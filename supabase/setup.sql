-- =============================================================
--  IMMA Media — Supabase database setup
--  Run this once in Supabase: SQL Editor → New query → paste → Run.
--  Safe to run again (it skips things that already exist).
-- =============================================================

-- ---------- Profiles: one row per signed-in person ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  avatar_url  text,
  email       text,
  role        text not null default 'reader' check (role in ('reader', 'staff', 'admin')),
  newsletter  boolean not null default false,       -- explicit opt-in only
  newsletter_updated_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- People can read and update only their own profile…
drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- …and only these columns. Nobody can promote themselves to staff/admin
-- from the website; change roles in the Supabase Table Editor instead.
revoke update on public.profiles from authenticated, anon;
grant  update (full_name, newsletter, newsletter_updated_at) on public.profiles to authenticated;

-- Create a profile automatically when someone signs up with Google
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Saved stories ----------
create table if not exists public.saved_stories (
  user_id    uuid not null references auth.users (id) on delete cascade,
  story_key  text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, story_key)
);

alter table public.saved_stories enable row level security;

drop policy if exists "Manage own saved stories" on public.saved_stories;
create policy "Manage own saved stories" on public.saved_stories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Helper for later stages (comments, staff publishing) ----------
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin'));
$$;

-- Staff can see the newsletter list (readers who opted in)
drop policy if exists "Staff read profiles" on public.profiles;
create policy "Staff read profiles" on public.profiles
  for select using (public.is_staff());

-- ---------- API access for signed-in users ----------
-- (Needed when "Grant API access to new tables automatically" is off.
--  Row Level Security above still limits each person to their own rows.)
grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, delete on public.saved_stories to authenticated;
grant execute on function public.is_staff() to authenticated;
