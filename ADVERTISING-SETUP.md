# IMMA News — Advertising system: setup and admin guide

## What was built

| Area | Where |
|---|---|
| Advert spaces on the site (leaderboard, premium banner, sidebar, large sidebar, in-article, category banner, footer, mobile banner, sponsored articles) | `ads.js`, `ads.css`, slots in `index.html`, `about.html`, `contact.html`, history series pages |
| "Your brand belongs here" IMMA promo in unsold spaces | `ads.js` (`houseAd`) — switch per placement in **Placements & prices** |
| Advertise With Us page (intro, placements explorer, specs, packages, FAQ, enquiry form, WhatsApp) | `advertise.html`, `advertise.js`, `advertise.css` |
| Advertiser registration + self-service dashboard | `advertiser.html`, `advertiser.js` |
| Invoices and receipts (print / save as PDF) | `invoice.html` |
| Advertising Management for admins | `ads-admin.html`, `ads-admin.js` |
| Advertising terms | `advertising-terms.html` (also linked from Privacy, sign-up form, FAQ) |
| Database, security rules, pricing, inventory, tracking, scheduling | `supabase/advertising.sql` |
| Automated database checks (roll back after running) | `supabase/advertising-tests.sql` |

## Database

`supabase/advertising.sql` has already been run on the IMMA News Supabase project (25 Nov 2026).
It is safe to run again after changes (SQL Editor → paste → Run).
`supabase/advertising-tests.sql` creates throw-away users and campaigns, checks 39 rules and then rolls everything back;
the error message it shows is the report.

## Make yourself an administrator (required once)

The admin dashboard only opens for accounts whose role is `admin`.

1. Sign in on immanews.com with your Google account (so your profile exists).
2. Supabase → **Table Editor** → `profiles` → find your row (by email) → set `role` to `admin` → Save.
3. Open <https://immanews.com/ads-admin.html> (also linked from **My Account**).

Nobody can make themselves admin from the website; it can only be changed in Supabase.

## Payments

* **Now:** manual verification. After you approve a campaign, the advertiser sees the payment instructions from
  **Settings** (fill in your M-Pesa Paybill/Till and bank details there), pays, and enters the M-Pesa code or bank
  reference. You check your statement and click **Confirm** under **Payments & invoices**. Only then does the
  advert go live (or mark a campaign *Complimentary*). Duplicate references are refused automatically.
* **Later — M-Pesa STK Push (Safaricom Daraja) or cards:** needs a small server function that holds the secret keys.
  Never put these keys in `config.js` or any website file.
  1. Get Daraja credentials (Consumer Key/Secret, Shortcode, Passkey) at <https://developer.safaricom.co.ke>, start in the sandbox.
  2. Create a Supabase Edge Function (e.g. `mpesa-stk`) that requests the STK push, and a second (`mpesa-callback`)
     that receives Safaricom's confirmation and inserts a row in `ad_payments` with `method = 'mpesa_stk'`,
     `status = 'confirmed'` using the service role.
  3. Store the keys as Edge Function secrets: `DARAJA_CONSUMER_KEY`, `DARAJA_CONSUMER_SECRET`, `DARAJA_SHORTCODE`,
     `DARAJA_PASSKEY`, `DARAJA_ENV` (`sandbox`/`production`), `DARAJA_CALLBACK_URL`.
  4. The existing database triggers then mark the campaign paid, issue the receipt and notify the advertiser.

## Daily schedule

Campaigns expire and expiry reminders (7 days / 1 day / unpaid) are created by `ad_run_schedule()`.
It runs every time an admin opens the dashboard. To run it automatically every night, enable **pg_cron**
(Supabase → Database → Extensions) and run `supabase/advertising.sql` again — it schedules itself.

## Email notifications

Notifications are stored in `ad_notifications` and shown in the dashboards. Sending them by email needs an email
service (for example Resend or Brevo) and an Edge Function that sends rows where `emailed_at` is empty.
Environment variables: `RESEND_API_KEY` (or your provider's key) and a verified sender such as `ads@immanews.com`
(needs a business email on the domain).

## Admin how-to

* **Approve / reject:** *Pending approvals* → check artwork, link and content rules → Approve or Reject (with a note).
* **Pause / resume / terminate, change dates, placement, priority, rotation weight, price:** *Campaigns* → click a row.
* **Manual or complimentary adverts, IMMA house promotions:** *+ Create advert*.
* **Record an offline payment:** campaign → *Record payment*, or *Payments & invoices*.
* **Prices, capacity, promo in empty spaces, turn a space off:** *Placements & prices*.
* **Packages (price, benefits, duration, included sponsored articles):** *Packages*.
* **Discount codes:** *Discount codes*.
* **Block an advertiser:** *Advertisers* → click → tick *Blocked* (their adverts stop at once).
* **CSV exports:** Campaigns, Advertisers, Invoices, Revenue, Analytics, Enquiries.
* **Turn all adverts off:** *Settings* → `ads_enabled` = `false`.

## Outstanding configuration

1. Set your role to `admin` (above).
2. Fill in **Settings** → M-Pesa Paybill/Till and/or bank details.
3. Optional: enable pg_cron for nightly expiry.
4. Optional: email notifications and automatic M-Pesa/card payments (above).
5. Have the advertising terms reviewed by a Kenyan lawyer before taking large contracts.
