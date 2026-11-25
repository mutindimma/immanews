# Kenya at Your Fingertips — Citizen Resource Centre

Public page: <https://immanews.com/resources.html> · Admin: <https://immanews.com/resources-admin.html>

## What is included

| Part | Files |
|---|---|
| Hub: search, category cards and filters, county filter, emergency panel (tap to call), notices, disclaimer, labelled category adverts | `resources.html`, `resources.js`, `resources.css` |
| Guide pages (eligibility, documents, steps, fees, times, contacts, apply link, sources, last-checked date, "may have changed" warning) | `resource.html?r=<slug>` |
| Fuel price tracker (EPRA), education calendar, scholarship directory, health facility directory | inside `resources.html?c=transport / education / health-safety` |
| Homepage "Useful Information" panel now links to each category | `index.html` |
| Admin module: add / edit / approve / archive / "verified today", needs-review queue, new EPRA cycle form, ReliefWeb import, change log, CSV export | `resources-admin.html`, `resources-admin.js` |
| Database tables, security rules, change log, daily housekeeping | `supabase/resources.sql` |
| Verified starting content (47 guides, 7 emergency numbers, fuel, calendar, 6 scholarships, 3 notices) | `tools/resources_seed.py` → `supabase/resources-seed.sql` and `resources/data.json` (offline fallback) |
| Rollback-only permission checks | `supabase/resources-tests.sql` |

`resources.sql` and `resources-seed.sql` were run on 25 Nov 2026; all 15 checks in `resources-tests.sql` passed.

## Editorial rules built in

* The public sees only `published` rows. Only admins (profiles.role = `admin`) can change anything; every change is logged.
* Every resource carries a source, last-verified and next-review date. When the review date passes, the site shows
  "due for a re-check" and the item appears under **Needs review** in the admin.
* Expired notices are hidden and past-deadline scholarships are marked closed automatically (daily with pg_cron,
  and every time the admin page opens).
* Automatically collected items (ReliefWeb) arrive as `pending` and need approval with an original summary.
* Adverts on resource pages use the existing advertising system, are labelled, and never change which resources
  appear or their order. Emergency numbers and official links are never behind adverts or sign-in.

## Automatic updates — what was found

| Source | Machine access? | What we do |
|---|---|---|
| EPRA fuel prices | Web page + scanned PDF, no API | Admin "New EPRA cycle" form on the 14th; reminder in the admin overview |
| KeNHA road closures | Web posts, no feed found | Manual notices with an end date (auto-hidden after) |
| KMD weather warnings | Website | Link out; weather panel on the homepage already uses Open-Meteo |
| MoE / KNEC / HELB / TSC | Websites (education.go.ke refused automated and browser connections when tested) | Manual updates |
| KMHFR health facility registry | REST API exists, but no published data licence; did not respond when tested | Not imported. Admins can add individually verified facilities; the page links to the official registries |
| ReliefWeb (UN OCHA) | Free API, needs an approved appname | Built in; switched off until you request an appname at apidoc.reliefweb.int and save it in the admin |
| Kenya Power / water interruptions | Not investigated in depth; no open feed found | "Utilities" category is marked coming soon |

## Your to-do

1. Set your Supabase profile role to `admin` (Table Editor → profiles) to use the admin pages.
2. Each month on/after the 14th: Admin → Fuel prices → **New EPRA cycle** (copy prices from EPRA).
3. Work through **Needs review** as items fall due.
4. Optional: request a ReliefWeb appname; enable pg_cron for nightly housekeeping.
5. To target adverts at resource pages, set campaign sections to `Public Services`, `Health`, `Travel` or `Education`.
