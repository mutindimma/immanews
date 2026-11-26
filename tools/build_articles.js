// Builds a real, crawlable page for every story in news.js, plus the search files
// Google News, Google Discover and AI search engines read.
//
//   node tools/build_articles.js
//
// Writes:
//   news/<section>/<slug>/index.html   one page per story (NewsArticle schema, meta, author box)
//   news/<section>/index.html          section pages (e.g. /news/kenya/) for internal linking
//   news/index.html                    all stories, newest first
//   news-sitemap.xml                   Google News sitemap: stories from the last 48 hours only
//   sitemap.xml                        story and section addresses (other entries are kept)
//   index.html / about.html            organisation schema and the hero image preload
// and then runs tools/build_footer.js so every new page gets the shared footer.
//
// Run it every time you add or edit a story. Pages for removed stories are deleted.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), cp = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const U = require(path.join(ROOT, "story-url.js"));
const SITE = "https://immanews.com";
const NOW = new Date();

// ---------- data ----------
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "news.js"), "utf8") + "\n;this.NEWS = NEWS;", sandbox);
const SERIES_FILE = path.join(ROOT, "series-feed.js");
if (fs.existsSync(SERIES_FILE)) vm.runInContext(fs.readFileSync(SERIES_FILE, "utf8"), sandbox);
const NEWS = sandbox.NEWS;
const SERIES = (sandbox.window.SERIES_FEED || []).filter((s) => !s.draft);
const SERIES_INFO = sandbox.window.SERIES_INFO;
const AUTHORS = JSON.parse(fs.readFileSync(path.join(__dirname, "authors.json"), "utf8"));

const stories = NEWS.filter((s) => !s.url && s.title && s.date).sort((a, b) => (b.published || b.date).localeCompare(a.published || a.date));
const problems = [];
for (const s of stories) {
  if ((s.seoTitle || s.title).length > 60) problems.push(`seoTitle over 60 characters: ${s.title}`);
  if (s.description && s.description.length > 155) problems.push(`description over 155 characters: ${s.title}`);
  if (!s.slug) problems.push(`no slug (address made from the headline): ${s.title}`);
}
const paths = new Map();
for (const s of stories) {
  const p = U.storyPath(s);
  if (paths.has(p)) throw new Error(`Two stories share the address ${p}: give one a different slug.`);
  paths.set(p, s);
}

// ---------- helpers ----------
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const xml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const abs = (u) => !u ? "" : /^https?:/i.test(u) ? u : SITE + "/" + u.replace(/^\/+/, "");
const local = (u) => !u ? "" : /^https?:/i.test(u) ? u : "/" + u.replace(/^\/+/, "");
const longDate = (d) => new Date(d.slice(0, 10) + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
// Dates are given as written in news.js (a plain YYYY-MM-DD unless the story sets an exact
// `published` time), so no time of day is invented. `when` is only used for the 48-hour window.
const iso = (d) => d;
const when = (d) => new Date(d.length === 10 ? d + "T00:00:00+03:00" : d).getTime();
const plain = (md) => String(md).replace(/<[^>]+>/g, " ").replace(/[#*_`|>\[\]()-]+/g, " ").replace(/\s+/g, " ").trim();
const words = (s) => plain(s.body || "").split(" ").filter(Boolean).length;
const sectionName = (cat) => cat === "International" ? "World" : cat;

// Image sizes from the photo libraries' own resizing; local files are used as they are.
const img = U.imageUrl;
function imageSet(s) {
  if (!s.image || /placeholder/.test(s.image)) return { src: SITE + "/images/og-image.png", w: 1200, h: 630, list: [SITE + "/images/og-image.png"], resizable: false };
  // Local photo sets have their own shape, so no cropped sizes are claimed for them
  if (U.isLocalSet(s.image)) return { src: abs(img(s.image, 1600)), w: null, h: null, list: [abs(img(s.image, 1600))], resizable: false };
  const resizable = U.resizable(s.image);
  if (!resizable) return { src: abs(s.image), w: null, h: null, list: [abs(s.image)], resizable };
  return { src: img(s.image, 1600, 900), w: 1600, h: 900, list: [img(s.image, 1600, 900), img(s.image, 1600, 1200), img(s.image, 1200, 1200)], resizable };
}
// "Photo: Name / Unsplash." credits are not alt text; keep the description part only.
function altText(s) {
  if (s.imageAlt) return s.imageAlt;
  const c = String(s.caption || "").replace(/\s*Photo:.*$/i, "").replace(/^Illustrative image:\s*/i, "").trim();
  return c || "";
}

// ---------- story body ----------
function inline(t) {
  return esc(t)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, (m, a, u) => `<a href="${u}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ""}>${a}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}
// The small Markdown subset the guides use: ### headings, lists, tables, bold/italic, links, <figure> blocks.
function markdown(src) {
  const out = [];
  const blocks = String(src).replace(/\r/g, "").split(/\n\s*\n/);
  for (let b of blocks) {
    b = b.trim();
    if (!b) continue;
    if (/^</.test(b)) {   // HTML written into the story (photos): keep, but make images lazy and async
      out.push(b.replace(/<img(?![^>]*loading=)/g, '<img loading="lazy"').replace(/<img(?![^>]*decoding=)/g, '<img decoding="async"'));
      continue;
    }
    const lines = b.split("\n");
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      let m;
      if ((m = /^(#{2,4})\s+(.*)$/.exec(l))) { const n = Math.min(4, m[1].length === 4 ? 3 : 2); out.push(`<h${n}>${inline(m[2])}</h${n}>`); i++; continue; }
      if (/^\s*[-*]\s+/.test(l)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ""));
        out.push(`<ul>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</ul>`); continue;
      }
      if (/^\s*\d+\.\s+/.test(l)) {
        const items = [];
        const start = parseInt(l, 10);
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ""));
        out.push(`<ol${start > 1 ? ` start="${start}"` : ""}>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</ol>`); continue;
      }
      if (/^\|/.test(l)) {
        const rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
        const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        const head = cells(rows[0]), body = rows.slice(/^\|?\s*:?-{3,}/.test(rows[1] || "") ? 2 : 1).map(cells);
        out.push(`<div class="art-table"><table><thead><tr>${head.map((c) => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
        continue;
      }
      const para = [];
      while (i < lines.length && !/^(#{2,4}\s|\s*[-*]\s+|\s*\d+\.\s+|\|)/.test(lines[i])) para.push(lines[i++].trim());
      if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    }
  }
  return out.join("\n      ");
}
// News stories: paragraphs; a short "Heading: text" opener is bold (same as the homepage reader).
function paragraphs(body, extras = []) {
  const parts = String(body).replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => {
    const m = p.match(/^([A-Z][^:.\n]{2,70}):\s+([\s\S]+)$/);
    return m ? `<p><strong>${esc(m[1])}:</strong> ${esc(m[2])}</p>` : `<p>${esc(p)}</p>`;
  });
  extras.forEach((x, j) => {
    const at = Math.round(((j + 1) * parts.length) / (extras.length + 1));
    const src = U.resizable(x.image) ? img(x.image, 1200, 800) : local(x.image);
    const dims = U.resizable(x.image) && !U.isLocalSet(x.image) ? ' width="1200" height="800"' : "";
    parts[at - 1] += `
      <figure class="bf-figure">
        <img src="${esc(src)}" alt="${esc(altText(x))}" loading="lazy" decoding="async"${dims}>
        ${x.caption ? `<figcaption><span class="bf-cap">${esc(x.caption)}</span></figcaption>` : ""}
      </figure>`;
  });
  return parts.join("\n      ");
}

// ---------- organisation (one definition, referenced by @id everywhere) ----------
const ORG_ID = SITE + "/#organization";
const ORG = {
  "@type": "NewsMediaOrganization",
  "@id": ORG_ID,
  name: "IMMA News",
  alternateName: "IMMA News Kenya",
  url: SITE + "/",
  logo: { "@type": "ImageObject", "@id": SITE + "/#logo", url: SITE + "/images/imma-news-logo.png", width: 632, height: 462, caption: "IMMA News" },
  image: { "@id": SITE + "/#logo" },
  description: "IMMA News is a Kenyan digital publication based in Nairobi, covering Kenyan current affairs, public health, food and nutrition, and the public services Kenyans use every day.",
  slogan: "Inform. Inspire. Empower.",
  address: { "@type": "PostalAddress", addressLocality: "Nairobi", addressRegion: "Nairobi County", addressCountry: "KE" },
  areaServed: { "@type": "Country", name: "Kenya" },
  knowsLanguage: "en-KE",
  contactPoint: [{ "@type": "ContactPoint", contactType: "newsroom", telephone: "+254785887830", url: SITE + "/contact.html", areaServed: "KE", availableLanguage: ["English", "Swahili"] }],
  parentOrganization: { "@type": "Organization", name: "IMMA Media", url: SITE + "/about.html#imma-media" },
  publishingPrinciples: SITE + "/editorial-policy.html",
  ethicsPolicy: SITE + "/editorial-policy.html#ethics",
  verificationFactCheckingPolicy: SITE + "/fact-checking.html",
  correctionsPolicy: SITE + "/corrections.html",
  actionableFeedbackPolicy: SITE + "/corrections.html",
  unnamedSourcesPolicy: SITE + "/editorial-policy.html#sources",
  ownershipFundingInfo: SITE + "/about.html#imma-media",
  masthead: SITE + "/masthead.html"
};
const WEBSITE = {
  "@type": "WebSite", "@id": SITE + "/#website", url: SITE + "/", name: "IMMA News", inLanguage: "en-KE", publisher: { "@id": ORG_ID },
  potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: SITE + "/index.html?q={search_term_string}" }, "query-input": "required name=search_term_string" }
};

function author(s) {
  const id = s.author && AUTHORS[s.author] && AUTHORS[s.author].published !== false ? s.author : "desk";
  if (s.author && id !== s.author) problems.push(`author "${s.author}" not found or not published (used the Editorial Desk): ${s.title}`);
  const a = AUTHORS[id];
  const url = a.type === "Person" ? `${SITE}/authors/${id}/` : `${SITE}/masthead.html#editorial-desk`;
  return { id, ...a, url };
}
function authorLd(a) {
  const o = { "@type": a.type === "Person" ? "Person" : "Organization", name: a.name, url: a.url };
  if (a.type === "Person") {
    if (a.jobTitle) o.jobTitle = a.jobTitle;
    if (a.bio) o.description = a.bio;
    if (a.photo) o.image = abs(a.photo);
    if (a.knowsAbout && a.knowsAbout.length) o.knowsAbout = a.knowsAbout;
    if (a.credentials && a.credentials.length) o.hasCredential = a.credentials.map((c) => ({ "@type": "EducationalOccupationalCredential", name: c }));
    if (a.sameAs && a.sameAs.length) o.sameAs = a.sameAs;
    o.worksFor = { "@id": ORG_ID };
  } else {
    o.parentOrganization = { "@id": ORG_ID };
  }
  return o;
}
function authorBox(a) {
  const pic = a.photo
    ? `<img class="ab-photo" src="${esc(local(a.photo))}" alt="${esc(a.name)}" width="88" height="88" loading="lazy" decoding="async">`
    : `<img class="ab-photo" src="/images/imma-news-emblem.png" alt="" width="88" height="88" loading="lazy" decoding="async">`;
  const creds = (a.credentials || []).filter(Boolean);
  const topics = (a.knowsAbout || []).filter(Boolean);
  const links = (a.sameAs || []).filter((u) => /^https:\/\//.test(u));
  return `
      <aside class="author-box" aria-labelledby="ab-name" itemscope itemtype="https://schema.org/${a.type === "Person" ? "Person" : "Organization"}">
        ${pic}
        <div class="ab-text">
          <p class="ab-kicker">About the ${a.type === "Person" ? "author" : "newsroom"}</p>
          <h2 class="ab-name" id="ab-name"><a href="${esc(a.url.replace(SITE, ""))}" itemprop="url"><span itemprop="name">${esc(a.name)}</span></a></h2>
          ${a.jobTitle ? `<p class="ab-role" itemprop="${a.type === "Person" ? "jobTitle" : "description"}">${esc(a.jobTitle)}</p>` : ""}
          ${a.bio ? `<p class="ab-bio">${esc(a.bio)}</p>` : ""}
          ${creds.length ? `<ul class="ab-creds" aria-label="Qualifications">${creds.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
          ${topics.length ? `<p class="ab-topics"><b>Covers:</b> ${topics.map(esc).join(" · ")}</p>` : ""}
          ${links.length ? `<p class="ab-links">${links.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener me">${esc(new URL(u).hostname.replace(/^www\./, ""))}</a>`).join("")}</p>` : ""}
          <p class="ab-policy">How we work: <a href="/editorial-policy.html">Editorial Policy</a> · <a href="/fact-checking.html">Fact-Checking</a> · <a href="/corrections.html">Corrections</a></p>
        </div>
      </aside>`;
}

// ---------- shared page parts ----------
const sections = [...new Set(stories.map((s) => s.category))];
const catbar = () => `<a class="chip" href="/">Home</a>` +
  sections.map((c) => `<a class="chip" href="/news/${U.section(c)}/">${esc(sectionName(c))}</a>`).join("") +
  (SERIES.length && SERIES_INFO ? `<a class="chip" href="${esc(SERIES_INFO.url)}">History &amp; Heritage</a>` : "");

function head({ title, description, url, image, imageAlt, imageW, imageH, type = "article", extra = "", ld, preload }) {
  return `<!doctype html>
<html lang="en-KE">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${esc(url)}">
  <link rel="icon" type="image/png" href="/images/favicon.png">
  <link rel="alternate" type="application/rss+xml" title="IMMA News" href="/feed.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${preload || ""}
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/pages.css">
  <link rel="stylesheet" href="/series.css">
  <link rel="stylesheet" href="/ads.css">
  <link rel="stylesheet" href="/footer.css">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="IMMA News">
  <meta property="og:locale" content="en_KE">
  <meta property="og:title" content="${esc(extra.ogTitle || title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(image)}">
  ${imageW ? `<meta property="og:image:width" content="${imageW}">\n  <meta property="og:image:height" content="${imageH}">` : ""}
  ${imageAlt ? `<meta property="og:image:alt" content="${esc(imageAlt)}">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(extra.ogTitle || title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(image)}">
  ${imageAlt ? `<meta name="twitter:image:alt" content="${esc(imageAlt)}">` : ""}
  <meta name="theme-color" content="#04163a">
  ${extra.meta || ""}
  <script type="application/ld+json">${json({ "@context": "https://schema.org", "@graph": ld })}</script>
</head>`;
}
const topbar = () => `
<body class="bf">
  <a class="skip-link" href="#main">Skip to the story</a>
  <header class="topbar">
    <div class="wrap topbar-inner">
      <a href="/" class="logo" aria-label="IMMA News home"><img src="/images/imma-news-emblem.png" alt="" width="200" height="192"><span class="logo-text"><b>IMMA</b><i>NEWS</i></span></a>
      <form class="searchbox" action="/index.html" method="get" role="search">
        <input type="search" name="q" placeholder="Search the news" aria-label="Search the news">
        <button type="submit" aria-label="Search"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/></svg></button>
      </form>
      <div class="top-links">
        <a href="/about.html">About Us</a>
        <a href="/advertise.html" class="adv-link">Advertise</a>
        <a href="/signin.html" data-auth-link>Sign in</a>
        <a href="/contact.html" class="pill">Contact</a>
      </div>
    </div>
    <nav class="catbar" aria-label="News sections"><div class="wrap catbar-inner">${catbar()}</div></nav>
  </header>`;
const FOOT = `
  <div class="wrap"><div class="ad-slot ad-slot--footer" data-ad-slot="footer_banner"><span class="ad-label">&nbsp;</span><div class="ad-frame"></div></div></div>

  <!-- SITE-FOOTER:START (generated by tools/build_footer.js from footer.js; do not edit here) -->
  <!-- SITE-FOOTER:END -->`;
const SCRIPTS = (inlineJs = "") => `
  <script src="/config.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js" defer></script>
  <script src="/auth.js" defer></script>
  <script src="/site.js" defer></script>
  <script src="/ads.js" defer></script>
  <script src="/directory-widget.js" defer></script>
  <script src="/footer.js"></script>${inlineJs}
</body>
</html>
`;

function card(s, { eager = false } = {}) {
  const has = s.image && !/placeholder/.test(s.image);
  const src = has ? (U.resizable(s.image) ? img(s.image, 480, 300) : local(s.image)) : "/images/placeholder.svg";
  const srcset = has && U.resizable(s.image) ? ` srcset="${esc(img(s.image, 480, 300))} 480w, ${esc(img(s.image, 800, 500))} 800w" sizes="(max-width: 700px) 40vw, 260px"` : "";
  return `
          <a class="bf-mini art-card" href="${esc(U.storyPath(s))}">
            <img src="${esc(src)}"${srcset} alt="" width="480" height="300" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
            <span><small>${esc(sectionName(s.category))} · <time datetime="${esc(s.date)}">${esc(longDate(s.date))}</time></small><b>${esc(s.title)}</b></span>
          </a>`;
}
function related(s) {
  const same = stories.filter((o) => o !== s && o.category === s.category);
  const other = stories.filter((o) => o !== s && o.category !== s.category);
  return [...same.slice(0, 3), ...other].slice(0, 4);
}

// Related local businesses from the IMMA Business Directory (shown only when listings exist)
function dirWidget(s) {
  const t = (s.title + " " + (s.summary || "")).toLowerCase();
  let cats = null, title = "Discover Local Businesses";
  if (/meal|recipe|food|cook|bak|cake|nutrition|diet/.test(t)) { cats = "restaurants,bakeries,groceries"; title = "Local food businesses"; }
  else if (s.category === "Health") { cats = "clinics,pharmacies,wellness,fitness"; title = "Local health providers"; }
  else if (s.category === "Travel") { cats = "hotels,travel,transport"; title = "Hotels and travel services"; }
  else if (/school|education|university|college|exam/.test(t)) { cats = "schools"; title = "Schools and training"; }
  else if (/property|land|housing|rent|real estate/.test(t)) { cats = "real-estate,construction"; title = "Property services"; }
  else if (s.category === "Sports") { cats = "fitness"; title = "Gyms and sports"; }
  if (!cats) return "";
  return `
    <section class="wrap" data-bd-widget data-cats="${cats}" data-title="${esc(title)}" aria-label="${esc(title)}" hidden></section>`;
}

// ---------- story page ----------
function storyPage(s) {
  const p = U.storyPath(s), url = SITE + p;
  const a = author(s);
  const im = imageSet(s);
  const alt = altText(s);
  const desc = s.description || (s.summary.length > 155 ? s.summary.slice(0, 152).replace(/\s+\S*$/, "") + "…" : s.summary);
  const seo = s.seoTitle || s.title;
  const title = (seo + " | IMMA News").length <= 60 ? seo + " | IMMA News" : seo;
  const published = iso(s.published || s.date), modified = iso(s.updated || s.published || s.date);
  const isGuide = ["Health", "Travel"].includes(s.category);
  const secUrl = `${SITE}/news/${U.section(s.category)}/`;
  const sources = s.sources && s.sources.length ? s.sources : s.source ? [{ name: s.source, url: s.sourceUrl }] : [];
  const minutes = Math.max(1, Math.round(words(s) / 220));
  const ld = [
    ORG,
    { "@type": "WebPage", "@id": url, url, name: s.title, description: desc, inLanguage: "en-KE", isPartOf: { "@id": SITE + "/#website" },
      breadcrumb: { "@id": url + "#breadcrumb" }, primaryImageOfPage: { "@type": "ImageObject", url: im.src } },
    { "@type": isGuide ? "Article" : "NewsArticle", "@id": url + "#article", mainEntityOfPage: { "@id": url },
      headline: s.title, alternativeHeadline: s.seoTitle && s.seoTitle !== s.title ? s.seoTitle : undefined,
      description: desc, image: im.list, thumbnailUrl: im.resizable ? img(s.image, 480, 300) : im.src,
      datePublished: published, dateModified: modified,
      author: [authorLd(a)], publisher: { "@id": ORG_ID },
      articleSection: s.category, inLanguage: "en-KE", wordCount: words(s), isAccessibleForFree: true,
      locationCreated: { "@type": "Place", name: "Nairobi, Kenya" },
      citation: sources.filter((x) => x.url).map((x) => ({ "@type": "CreativeWork", name: x.name, url: x.url })),
      copyrightHolder: { "@id": ORG_ID }, copyrightYear: Number(s.date.slice(0, 4)) },
    { "@type": "BreadcrumbList", "@id": url + "#breadcrumb", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: sectionName(s.category), item: secUrl },
      { "@type": "ListItem", position: 3, name: s.title, item: url }] }
  ];
  const heroSrc = im.resizable ? img(s.image, 1600, 900) : local(s.image) || "/images/og-image.png";
  const heroSet = im.resizable ? `${img(s.image, 800, 450)} 800w, ${img(s.image, 1200, 675)} 1200w, ${img(s.image, 1600, 900)} 1600w` : "";
  const preload = im.resizable ? `<link rel="preload" as="image" href="${esc(heroSrc)}" imagesrcset="${esc(heroSet)}" imagesizes="(max-width: 860px) 100vw, 820px" fetchpriority="high">` : "";
  const meta = `<meta property="article:published_time" content="${published}">
  <meta property="article:modified_time" content="${modified}">
  <meta property="article:section" content="${esc(s.category)}">
  <meta property="article:author" content="${esc(a.url)}">
  <meta name="author" content="${esc(a.name)}">`;
  let body = s.format === "markdown" ? markdown(s.body) : paragraphs(s.body, s.extraImages);
  // Long guides get a table of contents (every main heading gets an address)
  const heads = [];
  body = body.replace(/<h2>([\s\S]*?)<\/h2>/g, (m, inner) => { const id = "s-" + (U.slugify(inner.replace(/<[^>]+>/g, "").replace(/&amp;/g, "and").replace(/&[a-z#0-9]+;/g, ""), 50) || heads.length + 1); heads.push([id, inner.replace(/<[^>]+>/g, "")]); return `<h2 id="${id}">${inner}</h2>`; });
  const toc = heads.length >= 4 ? `
      <nav class="art-toc" aria-labelledby="toc-h"><h2 id="toc-h">In this guide</h2><ol>${heads.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join("")}</ol></nav>` : "";
  const HOME_R = require(path.join(ROOT, "home-render.js"));
  const kind = HOME_R.tags(s);
  const aiImage = s.imageAi || /AI-generated|AI generated/i.test(s.caption || "");
  const share = encodeURIComponent(url), shareText = encodeURIComponent(s.title + " | IMMA News");
  const storyData = { title: s.title, date: s.date, category: s.category };

  return head({ title, description: desc, url, image: im.src, imageAlt: alt, imageW: im.w, imageH: im.h, ld, preload, extra: { meta, ogTitle: s.title } }) + topbar() + `

  <main class="bf-page" id="main">
    <nav class="bf-crumbs wrap" aria-label="Breadcrumb">
      <a href="/">Home</a><span aria-hidden="true">›</span>
      <a href="/news/${U.section(s.category)}/">${esc(sectionName(s.category))}</a><span aria-hidden="true">›</span>
      <span aria-current="page">${esc(s.seoTitle || s.title)}</span>
    </nav>

    <div class="read-progress" aria-hidden="true"></div>
    <article class="bf-article art" data-story-key="${esc((s.date + "-" + s.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120))}">
      <header class="bf-head">
        <p class="bf-kicker"><a href="/news/${U.section(s.category)}/">${esc(sectionName(s.category))}</a>${kind ? " " + kind : ""}</p>
        <h1>${esc(s.title)}</h1>
        <p class="bf-dek">${esc(s.summary)}</p>
        <p class="bf-meta">By <a href="${esc(a.url.replace(SITE, ""))}" rel="author"><b>${esc(a.name)}</b></a> <i>·</i> <time datetime="${published}">${longDate(s.published || s.date)}</time>${s.updated && s.updated !== s.date ? ` <i>·</i> Updated <time datetime="${modified}">${longDate(s.updated)}</time>` : ""} <i>·</i> ${minutes} min read</p>
        <div class="art-tools" role="toolbar" aria-label="Reading tools">
          <button type="button" data-text="-1" aria-label="Smaller text">A−</button>
          <button type="button" data-text="1" aria-label="Larger text">A+</button>
          <button type="button" data-listen hidden aria-pressed="false">Listen</button>
          <button type="button" data-print>Print</button>
          <a href="#share">Share</a>
          <span class="sep"></span>
          <a href="/corrections.html?story=${encodeURIComponent(p)}">Report an error</a>
        </div>
      </header>

      <figure class="bf-figure art-hero">
        <img src="${esc(heroSrc)}"${heroSet ? ` srcset="${esc(heroSet)}" sizes="(max-width: 860px) 100vw, 820px"` : ""} alt="${esc(alt)}"${im.w ? ` width="${im.w}" height="${im.h}"` : ""} fetchpriority="high" decoding="async">
        ${s.caption || aiImage ? `<figcaption><span class="bf-cap">${aiImage && !/AI-generated|AI generated/i.test(s.caption || "") ? "AI-generated illustration. " : ""}${esc(s.caption || "")}</span></figcaption>` : ""}
      </figure>
${toc}
      <div class="bf-body" data-story-body>
      ${body}
      </div>

      <div class="bf-share" id="share" aria-label="Share this story">
        <span>Share</span>
        <a class="bf-share-btn" target="_blank" rel="noopener" href="https://wa.me/?text=${shareText}%20${share}">WhatsApp</a>
        <a class="bf-share-btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${share}">Facebook</a>
        <a class="bf-share-btn" target="_blank" rel="noopener" href="https://x.com/intent/post?url=${share}&amp;text=${shareText}">X</a>
        <button type="button" class="bf-share-btn" data-copy-link="${esc(url)}">Copy link</button>
      </div>
${sources.length ? `
      <section class="bf-sources" aria-labelledby="src-title">
        <h2 id="src-title">Sources</h2>
        <ol>${sources.map((x) => `
          <li>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>` : esc(x.name)}</li>`).join("")}
        </ol>
        <p class="bf-note">${s.sources ? "Written for IMMA News using the sources above." : "Based on reporting by the source above. Written for IMMA News."} Spotted an error? <a href="/corrections.html">Tell us</a>.</p>
      </section>` : ""}
${authorBox(a)}
    </article>
${dirWidget(s)}

    <aside class="bf-more wrap" aria-labelledby="more-title">
      <h2 id="more-title">More from IMMA News</h2>
      <div class="bf-more-list">${related(s).map((o) => card(o)).join("")}
      </div>
      <p class="art-all"><a href="/news/${U.section(s.category)}/">All ${esc(sectionName(s.category))} stories →</a></p>
    </aside>
  </main>
` + FOOT + SCRIPTS(`
  <script src="/article-tools.js" defer></script>
  <script>
    // Copy link, and the "Save story" button for signed-in readers
    document.querySelectorAll("[data-copy-link]").forEach(function (b) {
      b.addEventListener("click", function () {
        (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.copyLink) : Promise.reject()).then(function () { b.textContent = "Link copied"; }, function () { prompt("Copy this link:", b.dataset.copyLink); });
      });
    });
    window.addEventListener("DOMContentLoaded", function () {
      var A = window.IMMA_AUTH, box = document.querySelector("[data-story-body]");
      if (!A || !A.configured || !box) return;
      var story = ${json(storyData)};
      A.onChange(function () { var old = box.querySelector(".save-btn"); if (old) old.remove(); A.decorateReader(story, box); });
    });
  </script>`);
}

// ---------- section pages ----------
const SECTION_SEO = {
  kenya: ["Kenya News Today: Latest Kenyan Headlines | IMMA News", "The latest news from across Kenya: government, public services, wildlife, the economy and the stories that matter to Kenyans, from IMMA News in Nairobi."],
  nairobi: ["Nairobi News: Latest From the Capital | IMMA News", "Latest Nairobi news from IMMA News: city safety, buildings and planning, transport, county services and the stories affecting Nairobians."],
  politics: ["Kenya Politics News: IEBC & 2027 Election | IMMA News", "Kenyan politics explained: the IEBC, the road to the 2027 General Election, Parliament, government and the opposition, from IMMA News."],
  world: ["World News for Kenyan Readers | IMMA News", "International news that matters in Kenya: global business, science, space, courts and diplomacy, explained by IMMA News in Nairobi."],
  sports: ["Kenya Sports News: Athletics, Rugby, Football | IMMA News", "Kenyan sports news: athletics and cross-country, Kenya Cup rugby, Premier League football and Kenyan athletes competing at home and abroad."],
  health: ["Health Guides for Kenyans | IMMA News", "Practical health and nutrition guides for Kenyans: healthy weight, high-protein Kenyan meals and how to get safe medical care in Kenya."],
  travel: ["Kenya Travel & Passport Guides | IMMA News", "Step-by-step Kenyan travel guides: passports, eCitizen applications, fees and requirements, explained clearly by IMMA News."]
};
function listPage({ p, h1, intro, list, seo, crumbs }) {
  const url = SITE + p;
  const [title, desc] = seo;
  const ld = [ORG,
    { "@type": "CollectionPage", "@id": url, url, name: h1, description: desc, inLanguage: "en-KE", isPartOf: { "@id": SITE + "/#website" }, breadcrumb: { "@id": url + "#breadcrumb" },
      mainEntity: { "@type": "ItemList", itemListElement: list.slice(0, 30).map((s, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + U.storyPath(s), name: s.title })) } },
    { "@type": "BreadcrumbList", "@id": url + "#breadcrumb", itemListElement: crumbs.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: SITE + u })) }];
  const first = list[0];
  const preload = first && U.resizable(first.image) ? `<link rel="preload" as="image" href="${esc(img(first.image, 480, 300))}" imagesrcset="${esc(img(first.image, 480, 300))} 480w, ${esc(img(first.image, 800, 500))} 800w" imagesizes="(max-width: 700px) 40vw, 260px">` : "";
  return head({ title, description: desc, url, image: SITE + "/images/og-image.png", imageW: 1200, imageH: 630, type: "website", ld, preload }) + topbar() + `

  <main class="bf-page" id="main">
    <nav class="bf-crumbs wrap" aria-label="Breadcrumb">
      ${crumbs.map(([n, u], i) => i === crumbs.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${u}">${esc(n)}</a><span aria-hidden="true">›</span>`).join("\n      ")}
    </nav>
    <header class="bf-masthead art-section-head wrap">
      <h1>${esc(h1)}</h1>
      <p class="bf-intro">${esc(intro)}</p>
    </header>
    <section class="bf-more wrap art-list" aria-label="${esc(h1)}">
      <div class="bf-more-list">${list.map((s, i) => card(s, { eager: i === 0 })).join("")}
      </div>
    </section>
    <nav class="wrap art-sections" aria-label="Other sections">
      <h2>Browse by section</h2>
      <p>${sections.map((c) => `<a class="chip" href="/news/${U.section(c)}/">${esc(sectionName(c))}</a>`).join(" ")}</p>
    </nav>
  </main>
` + FOOT + SCRIPTS();
}

// ---------- write pages ----------
const NEWS_DIR = path.join(ROOT, "news");
const wanted = new Set();
function write(rel, html) {
  const file = path.join(ROOT, rel.replace(/^\//, "").replace(/\/$/, "/index.html"));
  wanted.add(path.normalize(file));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // keep the footer that build_footer.js baked last time so unchanged pages stay unchanged
  if (fs.existsSync(file)) {
    const old = fs.readFileSync(file, "utf8");
    const a = old.indexOf("<!-- SITE-FOOTER:START"), b = old.indexOf("<!-- SITE-FOOTER:END -->");
    if (a >= 0 && b > a) html = html.replace(/<!-- SITE-FOOTER:START[^>]*-->\s*<!-- SITE-FOOTER:END -->/, old.slice(a, b + "<!-- SITE-FOOTER:END -->".length));
  }
  fs.writeFileSync(file, html);
}
for (const s of stories) write(U.storyPath(s), storyPage(s));
for (const c of sections) {
  const sec = U.section(c), name = sectionName(c);
  const list = stories.filter((s) => s.category === c);
  write(`/news/${sec}/`, listPage({
    p: `/news/${sec}/`, h1: `${name} News`, list,
    intro: SECTION_SEO[sec] ? SECTION_SEO[sec][1] : `The latest ${name} stories from IMMA News.`,
    seo: SECTION_SEO[sec] || [`${name} News | IMMA News`, `The latest ${name} stories from IMMA News in Nairobi, Kenya.`],
    crumbs: [["Home", "/"], [name, `/news/${sec}/`]]
  }));
}
write("/news/", listPage({
  p: "/news/", h1: "Latest News", list: stories,
  intro: "Every IMMA News story, newest first: Kenyan current affairs, Nairobi, politics, sport, health and practical guides.",
  seo: ["Latest Kenya News, Health & Guides | IMMA News", "Every IMMA News story, newest first: Kenyan current affairs, Nairobi, politics, sport, public health and practical guides for Kenyans."],
  crumbs: [["Home", "/"], ["Latest News", "/news/"]]
}));
// Remove pages of stories that were deleted or renamed
(function prune(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { prune(f); if (!fs.readdirSync(f).length) fs.rmdirSync(f); }
    else if (e.name === "index.html" && !wanted.has(path.normalize(f))) { fs.unlinkSync(f); console.log("removed", path.relative(ROOT, f)); }
  }
})(NEWS_DIR);
console.log(`story pages: ${stories.length}; section pages: ${sections.length + 1}`);

// ---------- Google News sitemap (last 48 hours only) ----------
const cutoff = NOW.getTime() - 48 * 3600 * 1000;
const fresh = stories.filter((s) => when(s.published || s.date) >= cutoff);
fs.writeFileSync(path.join(ROOT, "news-sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<!-- Google News sitemap: stories published in the last 48 hours (built ${NOW.toISOString()}). Rebuilt by tools/build_articles.js. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${fresh.map((s) => `  <url>
    <loc>${xml(SITE + U.storyPath(s))}</loc>
    <news:news>
      <news:publication>
        <news:name>IMMA News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${xml(iso(s.published || s.date))}</news:publication_date>
      <news:title>${xml(s.title)}</news:title>
    </news:news>
  </url>`).join("\n")}
</urlset>
`);
console.log(`news-sitemap.xml: ${fresh.length} story(ies) from the last 48 hours`);

// ---------- sitemap.xml: replace /news/ entries, keep everything else ----------
const SM = path.join(ROOT, "sitemap.xml");
let sm = fs.readFileSync(SM, "utf8").replace(/\s*<url><loc>https:\/\/immanews\.com\/news\/[^<]*<\/loc>(<lastmod>[^<]*<\/lastmod>)?<\/url>/g, "");
for (const extra of ["/editorial-policy.html", "/fact-checking.html", "/masthead.html"]) {
  if (fs.existsSync(path.join(ROOT, extra)) && !sm.includes(`<loc>${SITE}${extra}</loc>`)) sm = sm.replace("</urlset>", `  <url><loc>${SITE}${extra}</loc></url>\n</urlset>`);
}
const latest = (list) => list.reduce((m, s) => ((s.updated || s.date) > m ? (s.updated || s.date) : m), "");
const entries = [[`/news/`, latest(stories)], ...sections.map((c) => [`/news/${U.section(c)}/`, latest(stories.filter((s) => s.category === c))]),
  ...stories.map((s) => [U.storyPath(s), s.updated || s.date])];
sm = sm.replace(/\s*<\/urlset>\s*$/, "\n" + entries.map(([p, d]) => `  <url><loc>${SITE}${p}</loc><lastmod>${d.slice(0, 10)}</lastmod></url>`).join("\n") + "\n</urlset>\n");
fs.writeFileSync(SM, sm);
console.log(`sitemap.xml: ${entries.length} news address(es)`);

// ---------- homepage and About page: organisation schema; homepage hero preload ----------
function inject(file, startMark, endMark, block) {
  const f = path.join(ROOT, file);
  let html = fs.readFileSync(f, "utf8");
  const a = html.indexOf(startMark);
  if (a >= 0) { const b = html.indexOf(endMark, a); html = html.slice(0, a) + html.slice(b + endMark.length).replace(/^\s*/, ""); }
  html = html.replace(/\n?(\s*)<\/head>/, `\n  ${startMark}\n  ${block}\n  ${endMark}\n</head>`);
  fs.writeFileSync(f, html);
}
const SCHEMA_START = "<!-- SCHEMA:START (generated by tools/build_articles.js) -->", SCHEMA_END = "<!-- SCHEMA:END -->";
inject("index.html", SCHEMA_START, SCHEMA_END, `<script type="application/ld+json">${json({ "@context": "https://schema.org", "@graph": [ORG, WEBSITE,
  { "@type": "ItemList", "@id": SITE + "/#latest", name: "Latest stories", itemListElement: stories.slice(0, 10).map((s, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + U.storyPath(s), name: s.title })) }] })}</script>`);
inject("about.html", SCHEMA_START, SCHEMA_END, `<script type="application/ld+json">${json({ "@context": "https://schema.org", "@graph": [ORG, { "@type": "AboutPage", "@id": SITE + "/about.html", url: SITE + "/about.html", name: "About IMMA News", about: { "@id": ORG_ID }, isPartOf: WEBSITE }] })}</script>`);
// ---------- Homepage: the edition is written into the page as real HTML ----------
const HOME = require(path.join(ROOT, "home-render.js"));
const RESOURCE_ICONS = {
  landmark: '<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-6 10 6"/>',
  health: '<path d="M12 21s-7-4.5-9-9.5C1.6 7.6 4.3 4 8 4c1.9 0 3.2 1 4 2.3C12.8 5 14.1 4 16 4c3.7 0 6.4 3.6 5 7.5-2 5-9 9.5-9 9.5z"/><path d="M12 9v6M9 12h6"/>',
  bus: '<rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16M8 21v-4M16 21v-4M7.5 14h.01M16.5 14h.01"/>',
  school: '<path d="M22 9L12 4 2 9l10 5 10-5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  scale: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
};
const storyKey = (s) => (s.date + "-" + s.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);   // same as auth.js
let resources = [];
try {
  resources = JSON.parse(fs.readFileSync(path.join(ROOT, "resources", "data.json"), "utf8")).categories
    .filter((c) => !/coming soon/i.test(c.description || ""))
    .map((c) => ({ slug: c.slug, name: c.name, description: c.description, ready: true,
      svg: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RESOURCE_ICONS[c.icon] || RESOURCE_ICONS.landmark}</svg>` }));
} catch (e) { console.warn("resources/data.json not read:", e.message); }
const homeData = {
  stories: stories.map((s) => ({ key: storyKey(s), title: s.title, url: U.storyPath(s), date: s.date, category: s.category, summary: s.summary,
    image: s.image || "", thumb: U.resizable(s.image) ? img(s.image, 264, 176) : (s.image || ""), caption: s.caption || "", featured: !!s.featured,
    type: s.type || undefined, feature: s.feature || undefined, imageAi: s.imageAi || undefined })),
  series: SERIES.map((s) => ({ key: storyKey(s), title: s.title, url: s.url, date: s.date, summary: s.summary, image: s.image, edition: s.edition, series: true })),
  resources
};
const home = HOME.render(homeData, {});
{
  const f = path.join(ROOT, "index.html");
  let html = fs.readFileSync(f, "utf8");
  const A = "<!-- HOME:START -->", B = "<!-- HOME:END -->";
  const block = `${A}\n<!-- written by tools/build_articles.js from news.js (do not edit here) -->\n${home.main}\n<script type="application/json" id="home-data">${json(homeData)}</script>\n${B}`;
  const a = html.indexOf(A), b = html.indexOf(B);
  if (a >= 0 && b > a) { html = html.slice(0, a) + block + html.slice(b + B.length); fs.writeFileSync(f, html); }
  else console.warn("index.html has no HOME markers");
}
// Start downloading the lead story's photo before anything else (faster Largest Contentful Paint)
const lead = homeData.stories.find((s) => s.key === home.lead);
if (lead && U.resizable(lead.image)) {
  inject("index.html", "<!-- HERO-PRELOAD:START -->", "<!-- HERO-PRELOAD:END -->",
    `<link rel="preload" as="image" href="${esc(img(lead.image, 1200, 750))}" imagesrcset="${esc(img(lead.image, 800, 500))} 800w, ${esc(img(lead.image, 1200, 750))} 1200w, ${esc(img(lead.image, 1600, 1000))} 1600w" imagesizes="(max-width: 820px) 100vw, 55vw" fetchpriority="high">`);
}
console.log(`homepage: ${home.count} stories; lead: ${lead ? lead.title : "none"}`);

// llms.txt: a plain summary of the site for AI answer engines (https://llmstxt.org)
fs.writeFileSync(path.join(ROOT, "llms.txt"), `# IMMA News

> IMMA News is a Kenyan digital news publication based in Nairobi and owned by IMMA Media. It covers Kenyan current affairs, Nairobi, politics, sport, public health, Kenyan food and nutrition, and practical guides to public services, plus international news for Kenyan readers. Every story lists its sources.

When citing IMMA News, please link to the story page and name "IMMA News".

## Sections
- [Latest news](${SITE}/news/): every story, newest first
${sections.map((c) => `- [${sectionName(c)}](${SITE}/news/${U.section(c)}/)`).join("\n")}
- [Kenya at Your Fingertips](${SITE}/resources.html): guides to Kenyan public services, health and safety, transport and education

## Latest stories
${stories.slice(0, 20).map((s) => `- [${s.title}](${SITE}${U.storyPath(s)}): ${s.description || s.summary}`).join("\n")}

## Trust and policies
- [Editorial Policy](${SITE}/editorial-policy.html)
- [Fact-Checking Policy](${SITE}/fact-checking.html)
- [Corrections & Complaints](${SITE}/corrections.html)
- [Masthead and contacts](${SITE}/masthead.html)
- [About IMMA News and IMMA Media](${SITE}/about.html)

## Feeds
- [RSS](${SITE}/feed.xml)
- [Sitemap](${SITE}/sitemap.xml)
- [Google News sitemap](${SITE}/news-sitemap.xml)
`);

// HTML sitemap: the News list always matches the sections that have stories
{
  const f = path.join(ROOT, "sitemap.html");
  const html = fs.readFileSync(f, "utf8");
  const a = html.indexOf("<section><h2>News</h2>");
  if (a >= 0) {
    const b = html.indexOf("</section>", a) + "</section>".length;
    const list = `<section><h2>News</h2><ul><li><a href="/news/">Latest news</a></li>${sections.map((c) => `<li><a href="/news/${U.section(c)}/">${esc(sectionName(c))}</a></li>`).join("")}<li><a href="/feed.xml">RSS feed</a></li></ul></section>`;
    if (html.slice(a, b) !== list) fs.writeFileSync(f, html.slice(0, a) + list + html.slice(b));
  }
}

// ---------- shared footer, RSS feed ----------
if (!process.env.IMMA_NO_FOOTER) cp.execFileSync(process.execPath, [path.join(__dirname, "build_footer.js")], { stdio: "inherit" });
if (problems.length) { console.warn("\nCheck these:"); problems.forEach((p) => console.warn("  - " + p)); }
