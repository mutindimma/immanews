# IMMA News: premium editorial redesign (26 Nov 2026)

**Checkpoint before the work:** git tag `pre-redesign-2026-11-26`. To roll back:

```
git checkout pre-redesign-2026-11-26 -- .
```

Then commit and push.

All existing data is unchanged: articles, accounts, adverts and campaigns, business listings and admin settings.

## 1. Design audit (before)

| Finding | Cause | Status |
|---|---|---|
| A text-only fetch of the homepage showed **"No stories match your search"**, and the markets panel said **"Loading…"** | The homepage was built entirely by JavaScript. The HTML contained only the hidden empty-state message and loading placeholders, so crawlers and readers without JavaScript saw no stories. | **Fixed.** The homepage is now written as real HTML at build time and contains every story. |
| Markets could stay on "Loading…" | Placeholder text that only JavaScript replaced. Sources failing silently left it in place. | **Fixed.** The slim ticker shows the source names and the update time (EAT), or "Market data is unavailable right now". |
| The homepage and inner pages had different headers | The homepage had its own header and category chips; inner pages had copied headers. | **Fixed.** One shared masthead (`header.js`) is built into every public page. |
| **"Trending Now" was not real trending** | It simply listed the newest stories. | **Fixed.** "Most read" uses recorded visits only and stays hidden until at least 3 stories have real counts. |
| Layout shift on the homepage, desktop CLS **0.519** | Content was inserted by JavaScript after the page loaded. | **Fixed.** CLS is now 0.025. |
| The masthead logo was a **227 KB** PNG shown at 52 px | Unoptimised asset | **Fixed.** It is now a 14 KB WebP sized for the masthead. |
| Three overlapping stylesheet "layers" with conflicting colours, pill buttons and heavy gradients | The stylesheet had grown through successive patches. | **Fixed.** It has been replaced by one token-based design system. |
| The election countdown repeated on several pages with a hard-coded fallback number | Duplicate banner markup | **Fixed.** A compact live countdown appears in the utility bar and on the homepage, calculated in Kenya time. The duplicate banners were removed. |
| Accessibility: low-contrast labels, a heading-order skip, an unnamed menu button, and advert link names that didn't match their text | — | **Fixed.** Homepage accessibility on desktop went from 95 to 100. |
| Emoji icons in "Useful Information" | — | **Fixed.** They are replaced by the Resource Centre's outline icon set. |

## 2. What changed

### Design system (`styles.css`)

* **Colour tokens:**
  * Midnight Navy `#0B192C`
  * Champagne Gold `#C5A059` (`#876628` when gold text sits on a light background, for contrast)
  * Ivory `#FAF9F6`
  * Charcoal `#25282D`
  * Soft Grey `#E8EBEF`
  * White
* **Light and dark themes.** The reader's choice is remembered, and the page is never shown in the wrong theme first.
* **Type:**
  * Playfair Display for headlines
  * Source Serif 4 for reading text
  * Inter for the interface

  All three come from Google Fonts (SIL Open Font License) in one optimised request. Inter has a size-matched fallback, so text doesn't jump when the font arrives.
* **Spacing and shape:** a spacing scale, square 2 px corners, fine rules instead of shadows, and no decorative gradients.
* **Print styles:** article pages print cleanly, with link addresses shown.

### Shared masthead (`header.js`, built into every public page by `tools/build_footer.js`)

* **Utility bar:**
  * current date in Kenya
  * Nairobi weather (Open-Meteo, cached)
  * election countdown linked to the IEBC
  * Advertise, Newsletter and Sign in
  * dark-mode switch
* **Masthead:** a centred logo, "Kenya • Africa • The World", search and Subscribe.
* **Section navigation:** sections appear only when they have stories. History & Heritage, the Resource Centre and the Business Directory are always shown.
* **On phones:** a "Sections" menu that closes with Esc, and a compact masthead.

### Homepage (`home-render.js` + `tools/build_articles.js`, browser behaviour in `script.js`)

The page runs from top to bottom as follows:

1. Utility bar, masthead and navigation
2. Breaking-news bar (only when an admin sets one)
3. Markets ticker
4. Top advert
5. **Today's Edition:**
   * the lead story with a large image, plus 3 supporting stories
   * Latest News, a numbered list
   * Kenya, International, Business & Economy and Sports blocks in an asymmetrical layout
   * a sidebar with "Most read", the election countdown and an advert
6. Before They Became Famous, on a full-width navy band
7. IMMA Living (health, food and travel)
8. Kenya Citizen Resource Centre
9. Discover Local Businesses
10. Newsletter
11. Advertising call-to-action and footer

Empty sections are never shown. Business & Economy, the Morning Brief, Kenya Explained, Made in Kenya and the Weekend Edition appear automatically once stories exist (see below).

### Signature features

To put a story into a feature, add `feature: "<id>"` to it in `news.js`. Each feature has its own styling:

| Feature | id |
|---|---|
| The IMMA Morning Brief | `morning-brief` |
| Kenya Explained | `kenya-explained` |
| Made in Kenya | `made-in-kenya` |
| The Weekend Edition | `weekend-edition` |
| IMMA Living | `imma-living` |

IMMA Living also includes Health and Travel guides automatically.

### Article pages (template in `tools/build_articles.js`, tools in `article-tools.js`)

* **Labels:** News, Guide, Analysis, Opinion, Explainer and Sponsored. Set them with `type: "analysis"` and similar in `news.js`, or from the admin screen.
* **AI images:** `imageAi: true` labels the picture as an AI-generated illustration.
* **Reading tools:**
  * reading progress bar
  * text size A− / A+ (remembered on the device)
  * **Listen** (read aloud with the browser's own speech; nothing is sent anywhere)
  * Print
  * Share
  * **Report an error**
* **Navigation:** guides with 4 or more sections get a table of contents.
* **Already in place:** breadcrumb, author box, sources, related stories, NewsArticle schema, canonical URL and Open Graph.
* **Counting:** each story counts one anonymous view per reader per day after 8 seconds on the page. This feeds "Most read".

### Admin controls

**Advertising admin → Homepage & design** (`ads-admin.html#homepage`) lets you set:

* the lead story and 3 featured stories
* the breaking-news bar: text, link and an automatic end time
* the order of homepage sections and whether each is shown
* the editorial label for each story
* advert density on the homepage: standard, light or minimal
* theme colours (WCAG AA contrast is checked before saving)
* the headline font: Playfair Display or Libre Baskerville

"Reset to automatic" clears these settings. They are saved in the existing `site_settings` table, which only admins can write to.

The footer and newsletter settings are unchanged (`ads-admin.html#footer`).

## 3. Files

**New:**

| File | Purpose |
|---|---|
| `header.js` | Shared masthead |
| `home-render.js` | Homepage renderer |
| `article-tools.js` | Article reading tools |
| `home-admin.js` | Homepage & design admin screen |
| `supabase/editorial.sql` | Readership counts |
| `images/imma-news-masthead.webp`, `images/imma-news-masthead-reverse.webp`, `images/imma-news-masthead.png` | Optimised logos |
| `REDESIGN-REPORT.md` | This report |

**Rewritten:** `styles.css`, `index.html` and `script.js`.

**Updated:**

* **Build tools:**
  * `tools/build_footer.js`: masthead, fonts, dark-mode loader
  * `tools/build_articles.js`: homepage, article template
* **Stylesheets:** `pages.css`, `series.css`, `footer.css`, `directory.css`, `resources.css`, `advertise.css` and `ads.css` were moved onto the new tokens.
* **Scripts:**
  * `markets.js`: the ticker
  * `footer.js`: palette and newsletter export
  * `ads.js`: accessible house-advert links
* **Admin page:** `ads-admin.html` gets a new navigation item.
* **Policy pages:** `privacy.html` explains the readership counts.
* **Election banner:** removed from `about.html` and `contact.html`, because the countdown is now in the utility bar.
* **Rebuilt pages:** every generated page and every public page.

## 4. Database

`supabase/editorial.sql` was run on 26 Nov 2026. It adds:

* the `story_views` table
* the `track_story_view` and `trending_stories` functions
* the `homepage` and `theme` rows in `site_settings`

Visitors can't read the raw visit records; only totals come out. Invalid story keys are ignored. A tested bad call was ignored, "Most read" correctly returned nothing yet, and an anonymous read of `story_views` was refused.

## 5. Measured results

Results are from Lighthouse 12 run locally against the live site. Scores vary by a few points from run to run.

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| Home, mobile (before) | 82 | 95 | 79 | 100 | 3.9 s | 0 |
| Home, mobile (after) | 88–92 | 95 | 79 | 100 | 2.8–3.2 s | 0.002 |
| Home, desktop (before) | 65 | 95 | 78 | 100 | 1.6 s | **0.519** |
| Home, desktop (after) | **88** | **100** | 78 | 100 | 1.8 s | **0.025** |
| Article, mobile (before) | 94 | 100 | 100 | 100 | 2.5 s | 0 |
| Article, mobile (after) | 95 | 95 | 100 | 100 | 2.5 s | 0.023 |
| Article, desktop (before) | 87 | 100 | 100 | 100 | 2.1 s | 0.043 |
| Article, desktop (after) | 84 | 100 | 100 | 100 | 2.2 s | 0.009 |

The accessibility fixes were deployed after the "after" runs and have not been re-measured.

**Below 90, and why:**

* **Render-blocking stylesheets:** about 0.6–1 s on mobile. These are the Google Fonts CSS and 4 site stylesheets.
* **Photo sizes:** Unsplash and Pexels photos are larger than needed on some screens.
* **Best practices (78–79):** two of the story photos come from Pexels' servers, which set a third-party cookie (`_cfuvid`). Storing those two photos on immanews.com would remove it; that needs a download, so it is left for your approval.

Before and after screenshots (desktop, tablet and phone for the home, article, directory and resources pages) were taken at the same sizes. The key pairs were sent with this report.

## 6. Tested

* Every public page has the shared masthead. Admin and print pages keep a simple header.
* Homepage:
  * desktop, tablet and phone, with no sideways scrolling
  * Sections menu and dark mode
  * search results (`?q=`)
  * old links (`?story=`, `?c=`) redirect correctly
* Article page: the table of contents, text size, Listen, labels and fonts.
* Directory, Resource Centre and About pages in the new design.
* Admin "Homepage & design" on the live site: a lead-story change and an "Analysis" label reached anonymous readers, then the settings were reset to automatic.

## 7. Outstanding and external configuration

* **The two Pexels story photos.** If you approve, I'll download them and store them on the site, which removes the third-party cookie.
* **Performance above 90 on every page** would need the critical CSS built into each page and self-hosted fonts. That's a bigger change, available on request.
* **Google AdSense** is still waiting for approval. No Google ad code is loaded, and adverts stay in clearly labelled, size-reserved spaces.
* **Social media links** appear only once verified links are entered in Footer settings.
* **Signature features** (Morning Brief and the others) appear when stories are tagged with them. No placeholder content was created.
* **"Most read"** appears once real readers have visited at least 3 stories at least 3 times each in a week.
