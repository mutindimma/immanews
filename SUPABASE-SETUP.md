# Setting up IMMA Media accounts (Supabase + Google sign-in)

About 20–30 minutes. Everything here is free to start.
You create the accounts and handle every password and secret yourself —
only the **Project URL** and **publishable key** go into the website.

---

## Part 1 — Create the Supabase project

1. Go to **https://supabase.com** → **Start your project** → sign in
   (signing in with your GitHub account is easiest).
2. **New project**:
   - Name: `immanews`
   - Database password: click **Generate**, then save it somewhere safe
     (you won't need it for the website)
   - Region: pick the one closest to Kenya that's offered (e.g. Europe or South Africa)
3. Wait ~2 minutes for the project to start.

## Part 2 — Create the database tables

1. In your project: **SQL Editor → New query**.
2. Open the file `supabase/setup.sql` from the website folder, copy all of it,
   paste it in, and click **Run**. You should see "Success. No rows returned".

This creates:
- **profiles** — name, email, picture, role (reader / staff / admin) and the
  newsletter choice (off unless the reader switches it on)
- **saved_stories** — each reader's saved stories

Security is built in: readers can only see and change their own data, and
nobody can make themselves staff from the website.

## Part 3 — Create the Google sign-in key (Google Cloud)

1. In Supabase: **Authentication → Sign In / Providers → Google**.
   Copy the **Callback URL** shown there
   (it looks like `https://xxxxxxxx.supabase.co/auth/v1/callback`).
2. Go to **https://console.cloud.google.com** (sign in with your Google account).
3. Create a project called `IMMA Media` (top bar → project picker → **New project**).
4. **APIs & Services → OAuth consent screen** (may be called **Google Auth Platform**):
   - App name: `IMMA Media`
   - Support email: your email
   - Audience: **External**
   - Authorised domain: `immanews.com`
   - Save. When ready to open sign-in to everyone, click **Publish app**.
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `IMMA Media website`
   - Authorised JavaScript origins: `https://immanews.com`
   - Authorised redirect URIs: paste the **Callback URL** from step 1
   - **Create**. Copy the **Client ID** and **Client secret**.
6. Back in Supabase → **Authentication → Sign In / Providers → Google**:
   turn **Enable**, paste the Client ID and Client secret, **Save**.

## Part 4 — Tell Supabase where your website is

**Authentication → URL Configuration**:
- Site URL: `https://immanews.com`
- Redirect URLs → **Add URL**: `https://immanews.com/**`

## Part 5 — Connect the website

1. In Supabase: **Project Settings → API Keys** (or **Data API**).
   Copy the **Project URL** and the **publishable** key
   (starts with `sb_publishable_`, or the older long **anon public** key).
   ⚠️ **Never** copy the `secret` / `service_role` key anywhere.
2. Give both to Claude, or paste them into `config.js`:
   ```js
   const SUPABASE = {
     url: "https://xxxxxxxx.supabase.co",
     anonKey: "sb_publishable_..."
   };
   ```
3. Claude uploads the change to GitHub, and **Sign in** goes live.

## Making someone staff

Supabase → **Table Editor → profiles** → find the person (they must have
signed in once) → change **role** to `staff` or `admin` → **Save**.

## Seeing the newsletter list

Supabase → **Table Editor → profiles** → filter **newsletter = true**.
Export as CSV for your email tool (e.g. Mailchimp, Brevo).

## Coming next

- **Comments** with moderation (staff approve before they appear)
- **Staff publishing** — add and edit stories from a page on the site
- A **Privacy Policy** page — recommended now that the site collects
  names and email addresses (Kenya's Data Protection Act, 2019)
