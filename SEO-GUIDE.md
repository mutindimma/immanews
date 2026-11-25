# IMMA News — search, Google News and AI search

## Publishing a story

1. Add the story to `news.js`. As well as the usual fields, give it:

   | Field | What it is | Limit |
   |---|---|---|
   | `slug` | the web address, e.g. `nairobi-building-collapses-nine-killed` | never change it after publishing |
   | `seoTitle` | the title Google shows | 60 characters |
   | `description` | the snippet Google shows | 155 characters |

   Optional fields:
   * `author`: an id from `tools/authors.json` (the default is the IMMA News Editorial Desk)
   * `updated`: a `YYYY-MM-DD` date, added when you make a meaningful update
   * `published`: an exact time, e.g. `"2026-11-25T09:30:00+03:00"`
   * `imageAlt`: a short description of the photo
2. Run `node tools/build_articles.js`. It reports any title, description or slug problems.
3. Commit and push.

Use a photo at least 1200px wide; Unsplash and Pexels photos are resized automatically. Google Discover needs this.

## What the build creates

| File | Purpose |
|---|---|
| `news/<section>/<slug>/index.html` | One page per story, containing: <ul><li>NewsArticle schema (Article for Health and Travel guides)</li><li>Open Graph and X cards</li><li>canonical URL</li><li>`max-image-preview:large`</li><li>author box</li><li>sources</li><li>related stories</li></ul> |
| `news/<section>/` and `news/` | Section pages (Kenya, Nairobi, Politics, World, Sports, Health, Travel) that link to every story |
| `news-sitemap.xml` | Google News sitemap containing only stories from the last 48 hours |
| `sitemap.xml` | Every page, with last-modified dates |
| `llms.txt` | A plain summary of the site for AI answer engines |
| `feed.xml` | The RSS feed, built by build_footer.js, which this script runs |

The homepage and About page also get the NewsMediaOrganization and WebSite schema. Old `index.html?story=…` links redirect to the new pages.

## Authors (E-E-A-T)

Stories are credited to the **IMMA News Editorial Desk** until you add real people. To add a person:

1. Copy `_template` in `tools/authors.json` and fill in their real name, role, bio and qualifications.
2. Set `"published": true`.
3. Add `author: "<id>"` to their stories.

Only list qualifications and profiles that are genuine.

Person authors will need a profile page at `/authors/<id>/`. Ask for this to be built when you add the first author.

## Policies linked from every story

* `editorial-policy.html`
* `fact-checking.html`
* `masthead.html`
* `corrections.html`

The organisation schema points to these pages (`publishingPrinciples`, `verificationFactCheckingPolicy`, `correctionsPolicy` and `masthead`). Please read them and adjust anything that does not match how you work.

## After publishing: one-time setup (you)

1. **Google Search Console** (search.google.com/search-console): add `immanews.com` and submit both `sitemap.xml` and `news-sitemap.xml`.
2. **Google Publisher Center** (publishercenter.google.com): add IMMA News and its sections. Google News inclusion is decided by Google and isn't guaranteed.
3. **Bing Webmaster Tools**: import the site from Search Console.
