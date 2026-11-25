# IMMA News — site footer and newsletter

Every public page shares one footer. It has six parts:

* the advertising banner above it ("Put Your Brand Where Kenya Reads")
* the newsletter sign-up
* the brand block and social icons
* four navigation columns
* contact details
* the IMMA Media ownership block and the legal bar (Cookie Settings, Back to top)

## How it works

| Part | File |
|---|---|
| Footer content, defaults, rendering, newsletter, cookie settings | `footer.js` |
| Styles (desktop, tablet, phone accordion, dark-mode safe) | `footer.css` |
| Bakes the footer into every page as plain HTML, and rebuilds `feed.xml` | `tools/build_footer.js` |
| Admin screen: Advertising Management → **Footer & newsletter** (`ads-admin.html#footer`) | `footer-admin.js` |
| Database: `site_settings`, `newsletter_subscribers`, sign-up and unsubscribe functions | `supabase/footer.sql` |
| Rollback-only checks (23) | `supabase/footer-tests.sql` |
| New pages | `faq.html`, `corrections.html`, `accessibility.html`, `sitemap.html`, `unsubscribe.html` (+ `unsubscribe.js`) |
| Light logos for the dark footer | `images/imma-news-logo-reverse.png`, `images/imma-media-logo-reverse.png` |

`footer.sql` was run on 25 Nov 2026, and all 23 checks in `footer-tests.sql` passed.

**Changes made in the admin screen** go live on every page straight away. No rebuild is needed.

**Run `node tools/build_footer.js`** after you:

* change the defaults in `footer.js`
* add a new page
* add stories to `news.js`

It also refreshes the RSS feed. `python tools/build_series.py` runs it automatically.

## Links that are hidden until their page exists

To switch one on, set its visibility to **Always show** in the admin screen. You can also change where it points.

| Link | Why it is hidden |
|---|---|
| Business & Economy, Lifestyle, Technology, Opinion & Analysis | Set to *Only when the category has stories*. Each appears by itself once a story uses that category (`Business`, `Lifestyle`, `Technology`, `Opinion`). |
| Jobs & Opportunities, Kenyan Laws | These categories in Kenya at Your Fingertips are still "coming soon". |
| Business Directory, Careers, Download Media Kit | There is no directory, vacancies page or media kit yet. |

Politics & Governance and Sports also use *Only when the category has stories*, so they never lead readers to an empty page.

## Things you need to set up

1. **Email addresses.** Create the mailboxes, for example:
   * news@ for general enquiries
   * editor@ for editorial
   * ads@ for advertising

   Send each one a test email, then enter it in the admin screen and tick **Verified**. Addresses that aren't ticked are never shown.
2. **Social media.** Paste the full https link for each official account. Empty ones stay hidden. Links to the wrong website are refused.
3. **Newsletter delivery.** Sign-ups are stored with:
   * the reader's consent (the exact wording and the time)
   * the page they signed up on
   * a daily-changing coded IP address, used for abuse protection

   **No email is sent yet.** To start sending:
   * Choose an email service (for example Brevo, Mailchimp or Resend). Keep its API key in a Supabase Edge Function, never in the website code.
   * Send a confirmation email first (double opt-in), then set `confirmed = true`.
   * Put this unsubscribe link in every email: `https://immanews.com/unsubscribe.html?t=<unsubscribe_token>`
   * Name the service in section 5 of the Privacy Policy before the first send.

   Admins can export subscribers as CSV from the admin screen.
4. **Legal review.** These pages describe how we actually work, but please read and adjust them:
   * Corrections & Complaints
   * FAQ
   * Accessibility statement
   * the new newsletter paragraphs in the Privacy Policy

## Cookie settings and Google Tag Manager

* **Google Tag Manager (`GTM-KZZ2PRJM`)** is placed right after `<head>` on every public page by `tools/build_footer.js`. The container is downloaded **only after the visitor clicks Accept** on the first-visit cookie bar, or switches **Analytics** on in Cookie Settings.
  * Google Consent Mode starts with everything denied. Accepting grants `analytics_storage` only; advertising storage stays denied.
  * Switching Analytics off removes the Google Analytics cookies.
  * The sign-in, account, advertiser dashboard, unsubscribe, admin and invoice pages do not get the tag, because their addresses can contain private details.
  * Use the container for analytics (for example Google Analytics 4). Before adding advertising or remarketing tags, the Privacy Policy and the cookie choice would need an "advertising" option first.
  * To change the container ID, edit `GTM_ID` in `tools/build_footer.js` and run it.
* **Advert measurement** is a random per-tab code used to count advert views and clicks fairly. It is on by default, and readers can switch it off in Cookie Settings. Once it is off, `ads.js` records nothing for that reader.

## Safety built in

* Only administrators (`profiles.role = admin`) can change footer settings. Every change is written to the advertising audit log.
* Nobody but administrators can read the subscriber list. The public can only call the sign-up and unsubscribe functions.
* Sign-ups have several protections:
  * the email address is checked
  * consent is required
  * duplicates are detected regardless of upper or lower case
  * a hidden anti-bot field catches automated sign-ups
  * each connection is limited to 10 attempts an hour
* Unsubscribing gives the same answer whether or not an address was on the list, so it can't be used to find out who subscribed.
* Admin-entered links are limited to site paths, https, `tel:` and `mailto:`. Colours that fail the WCAG AA contrast check can't be saved.
