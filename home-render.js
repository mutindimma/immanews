// IMMA News — homepage renderer.
// tools/build_articles.js uses it to write the homepage as real HTML (so readers without
// JavaScript and search engines see every story); script.js uses it again in the browser
// when administrators choose a different lead story, featured stories or section order.
// Only published content is used: empty sections are not shown at all.
(function (root) {
  "use strict";
  const U = typeof module === "object" && module.exports ? require("./story-url.js") : root.IMMA_URL;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shortDate = (d) => new Date(String(d).slice(0, 10) + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  const SECTION_NAMES = { kenya: "Kenya", world: "International", business: "Business & Economy", sports: "Sports" };
  const FEATURES = {
    "morning-brief": { name: "The IMMA Morning Brief", dek: "What Kenya needs to know this morning." },
    "kenya-explained": { name: "Kenya Explained", dek: "The issues behind the headlines, made clear." },
    "made-in-kenya": { name: "Made in Kenya", dek: "Kenyan makers, founders and the things they build." },
    "weekend-edition": { name: "The Weekend Edition", dek: "Longer reads for slower days." }
  };
  const DEFAULT_ORDER = ["latest", "kenya", "world", "business", "sports", "morning-brief", "kenya-explained", "btbf", "living", "made-in-kenya", "weekend-edition", "resources", "directory", "newsletter"];
  const TYPES = { analysis: "Analysis", opinion: "Opinion", sponsored: "Sponsored", guide: "Guide", explainer: "Explainer" };

  // What kind of piece this is, so readers can tell news from analysis, opinion and paid content
  const typeOf = (s) => s.type || (["Health", "Travel"].includes(s.category) ? "guide" : "news");
  function tags(s, opts = {}) {
    const t = typeOf(s), out = [];
    if (TYPES[t]) out.push(`<span class="tag tag--${t}">${TYPES[t]}</span>`);
    if (opts.ai !== false && (s.imageAi || /AI-generated|AI generated/i.test(s.caption || ""))) out.push('<span class="tag tag--ai">AI-generated image</span>');
    return out.join(" ");
  }
  const sectionLabel = (s) => s.series ? "History & Heritage" : s.category === "International" ? "World" : s.category;
  const img = (s, w, h) => s.image ? (U && U.resizable(s.image) ? U.imageUrl(s.image, w, h) : s.image) : "/images/placeholder.svg";
  const srcset = (s, sizes) => s.image && U && U.resizable(s.image) ? ` srcset="${sizes.map(([w, h]) => esc(U.imageUrl(s.image, w, h)) + " " + w + "w").join(", ")}"` : "";

  function story(s, o = {}) {
    const [w, h] = o.size || [600, 400];
    const pic = o.image === false ? "" : `<a class="thumb" href="${esc(s.url)}" tabindex="-1" aria-hidden="true"><img src="${esc(img(s, w, h))}"${srcset(s, [[w, h], [w * 2, h * 2]])} sizes="${o.sizes || "(max-width: 820px) 110px, 33vw"}" alt="" width="${w}" height="${h}" loading="lazy" decoding="async"></a>`;
    return `<article class="story${o.big ? " story--big" : ""}">
          ${pic}
          <p class="kicker">${esc(sectionLabel(s))} ${tags(s)}</p>
          <h3><a href="${esc(s.url)}">${esc(s.title)}</a></h3>
          ${o.dek === false ? "" : `<p>${esc(s.summary)}</p>`}
          <p class="byline"><time datetime="${esc(s.date)}">${esc(shortDate(s.date))}</time></p>
        </article>`;
  }

  function sectionBlock(id, title, link, list, o = {}) {
    if (!list.length) return "";
    const [first, ...rest] = list;
    const body = o.three
      ? `<div class="hsec-grid">${list.slice(0, 3).map((s) => story(s, { size: [600, 400], sizes: "(max-width: 820px) 100vw, 30vw" })).join("")}</div>`
      : `<div class="hsec-grid">${story(first, { big: true, size: [900, 600], sizes: "(max-width: 820px) 100vw, 55vw" })}<div class="hsec-list">${rest.slice(0, 4).map((s) => story(s, { image: false })).join("")}</div></div>`;
    return `<section class="hsec${o.three ? " hsec--three" : ""}" data-section="${id}" aria-labelledby="h-${id}">
        <div class="sec-head"><h2 id="h-${id}">${esc(title)}</h2>${link ? `<a href="${esc(link)}">More ${esc(title)} →</a>` : ""}</div>
        ${body}
      </section>`;
  }

  /**
   * data: { stories: [...], series: [...], resources: [...], directory: true }
   * settings: { lead, featured: [], order: [], hidden: [], labels: {} }
   */
  function render(data, settings = {}) {
    const labels = settings.labels || {};
    const all = data.stories.map((s) => Object.assign({}, s, labels[s.key] ? { type: labels[s.key] } : {}))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const byKey = (k) => all.find((s) => s.key === k);
    const lead = byKey(settings.lead) || all.find((s) => s.featured) || all[0];
    if (!lead) return { main: '<p class="empty">Stories will appear here soon.</p>', count: 0 };
    const featured = (settings.featured || []).map(byKey).filter((s) => s && s !== lead);
    const support = featured.concat(all.filter((s) => s !== lead && !featured.includes(s))).slice(0, 3);
    const top = [lead, ...support];
    const rest = all.filter((s) => !top.includes(s));
    const latest = rest.slice(0, 5);
    // Sections avoid repeating stories already shown above; with few stories they may repeat Latest
    const inSec = (cats) => {
      const fresh = all.filter((s) => cats.includes(s.category) && !top.includes(s) && !latest.includes(s));
      return fresh.length ? fresh : all.filter((s) => cats.includes(s.category) && !top.includes(s)).slice(0, 3);
    };
    const hidden = new Set(settings.hidden || []);

    const blocks = {
      latest: () => latest.length ? `<section class="hsec" data-section="latest" aria-labelledby="h-latest">
        <div class="sec-head"><h2 id="h-latest">Latest News</h2><a href="/news/">All stories →</a></div>
        <ol class="river">${latest.map((s) => `<li><time datetime="${esc(s.date)}">${esc(shortDate(s.date))}</time>
          <div><p class="kicker">${esc(sectionLabel(s))} ${tags(s)}</p><h3><a href="${esc(s.url)}">${esc(s.title)}</a></h3><p>${esc(s.summary)}</p></div>
          <a href="${esc(s.url)}" tabindex="-1" aria-hidden="true"><img src="${esc(img(s, 264, 176))}" alt="" width="132" height="88" loading="lazy" decoding="async"></a></li>`).join("")}</ol>
      </section>` : "",
      kenya: () => sectionBlock("kenya", "Kenya", "/news/kenya/", inSec(["Kenya", "Nairobi", "Politics"])),
      world: () => sectionBlock("world", "International", "/news/world/", inSec(["International"])),
      business: () => sectionBlock("business", "Business & Economy", "/news/business/", inSec(["Business"])),
      sports: () => sectionBlock("sports", "Sports", "/news/sports/", inSec(["Sports"]), { three: true }),
      btbf: () => {
        const ed = (data.series || [])[0];
        if (!ed) return "";
        return `<section class="feature-band" data-section="btbf" aria-labelledby="h-btbf"><div class="wrap">
          <div class="sec-head"><h2 id="h-btbf">Before They Became Famous</h2><a href="/history/before-they-became-famous/">All editions →</a></div>
          <div class="btbf"><a href="${esc(ed.url)}" tabindex="-1" aria-hidden="true"><img src="${esc(ed.image)}" alt="" width="640" height="480" loading="lazy" decoding="async"></a>
          <div><p class="kicker">History &amp; Heritage · Edition ${esc(ed.edition || "")}</p><h3><a href="${esc(ed.url)}">${esc(ed.title)}</a></h3><p class="dek">${esc(ed.summary)}</p>
          <p class="byline">A weekly series, every Sunday</p></div></div></div></section>`;
      },
      living: () => {
        const list = all.filter((s) => ["Health", "Travel", "Lifestyle"].includes(s.category) || s.feature === "imma-living").slice(0, 3);
        if (!list.length) return "";
        return `<section class="living" data-section="living" aria-labelledby="h-living"><div class="wrap">
          <div class="sec-head"><h2 id="h-living">IMMA Living</h2><a href="/news/health/">Health, food &amp; travel →</a></div>
          <div class="hsec--three"><div class="hsec-grid">${list.map((s) => story(s, { size: [600, 400], sizes: "(max-width: 820px) 100vw, 30vw" })).join("")}</div></div></div></section>`;
      },
      resources: () => {
        const cats = (data.resources || []).filter((c) => c.ready).slice(0, 6);
        if (!cats.length) return "";
        return `<section class="hsec" data-section="resources" aria-labelledby="h-rc">
          <div class="sec-head"><h2 id="h-rc">Kenya Citizen Resource Centre</h2><a href="/resources.html">Open the Resource Centre →</a></div>
          <div class="rc-strip">${cats.map((c) => `<a href="/resources.html?c=${esc(c.slug)}">${c.svg}<b>${esc(c.name)}</b><small>${esc(c.description)}</small></a>`).join("")}</div>
        </section>`;
      },
      directory: () => data.directory === false ? "" : `<section class="hsec" data-section="directory" data-bd-widget data-home="1" data-limit="6" data-title="Discover Local Businesses" aria-label="Discover Local Businesses" hidden></section>`,
      newsletter: () => `<section class="nl-band" data-section="newsletter" id="newsletter" aria-labelledby="h-nl">
          <div><p class="kicker">The IMMA News newsletter</p><h2 id="h-nl">Kenya's news, delivered with care.</h2><p>The stories that matter, verified and clearly explained. Free. Unsubscribe at any time.</p></div>
          <form data-home-newsletter novalidate>
            <label class="sr-only" for="nl-email">Email address</label>
            <input id="nl-email" type="email" name="email" required autocomplete="email" placeholder="Your email address">
            <button class="btn" type="submit">Subscribe</button>
            <input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
            <label class="fine"><input type="checkbox" name="consent" required> I agree to receive the IMMA News newsletter and accept the <a href="/privacy.html#newsletter">Privacy Policy</a>.</label>
            <p class="status sf-status" role="status"></p>
          </form>
        </section>`
    };
    Object.keys(FEATURES).forEach((f) => {
      blocks[f] = () => {
        const list = all.filter((s) => s.feature === f);
        if (!list.length) return "";
        return sectionBlock(f, FEATURES[f].name, null, list).replace('class="hsec"', `class="hsec hsec--feature hsec--${f}"`).replace("<h2", `<p class="feature-tag">${esc(FEATURES[f].dek)}</p><h2`);
      };
    });

    const order = (settings.order && settings.order.length ? settings.order.filter((k) => blocks[k]).concat(DEFAULT_ORDER.filter((k) => !(settings.order || []).includes(k))) : DEFAULT_ORDER);
    const full = new Set(["btbf", "living"]);   // full-width bands
    const parts = order.filter((k) => !hidden.has(k)).map((k) => [k, blocks[k]()]).filter(([, h]) => h);

    const leadHtml = `<section class="lead" data-section="lead" aria-label="Lead story">
        <a class="lead-img" href="${esc(lead.url)}" tabindex="-1" aria-hidden="true"><img src="${esc(img(lead, 1200, 750))}"${srcset(lead, [[800, 500], [1200, 750], [1600, 1000]])} sizes="(max-width: 820px) 100vw, 55vw" alt="" width="1200" height="750" fetchpriority="high" decoding="async"></a>
        <div class="lead-text">
          <p class="kicker">${esc(sectionLabel(lead))} ${tags(lead)}</p>
          <h2><a href="${esc(lead.url)}">${esc(lead.title)}</a></h2>
          <p class="dek">${esc(lead.summary)}</p>
          <p class="byline">IMMA News · <time datetime="${esc(lead.date)}">${esc(shortDate(lead.date))}</time></p>
          ${lead.caption ? `<p class="cap">${esc(lead.caption)}</p>` : ""}
        </div>
      </section>
      ${support.length ? `<section class="support" data-section="support" aria-label="Top stories">${support.map((s) => story(s, { size: [600, 400], sizes: "(max-width: 820px) 110px, 22vw", dek: true })).join("")}</section>` : ""}`;

    // Bands run full width, so the page is split into blocks: [main + sidebar] then bands then the rest
    const firstBand = parts.findIndex(([k]) => full.has(k));
    const beforeBand = firstBand < 0 ? parts : parts.slice(0, firstBand);
    const after = firstBand < 0 ? [] : parts.slice(firstBand);
    return {
      lead: lead.key,
      count: all.length,
      main: `<div class="wrap"><div class="home-grid">
      <div class="home-main">
      ${leadHtml}
      ${beforeBand.map(([, h]) => h).join("\n")}
      </div>
      <aside class="home-side" aria-label="More">
        <section class="side-mod" data-trending hidden aria-labelledby="h-trend"><h2 id="h-trend">Most read</h2><ol class="trending"></ol><p class="trending-note">Based on readers' visits over the last 7 days.</p></section>
        <section class="countdown" id="election" aria-label="Kenya Elections 2027 countdown">
          <span class="kicker">Kenya Elections 2027</span>
          <b data-election-days></b><span data-election-label>days to go</span>
          <p>Tuesday 10 August 2027 · <a href="https://www.iebc.or.ke/" target="_blank" rel="noopener">IEBC information</a></p>
        </section>
        <div class="ad-slot ad-slot--side" data-ad-slot="sidebar"><span class="ad-label">&nbsp;</span><div class="ad-frame"></div></div>
        <div class="ad-slot ad-slot--side-lg" data-ad-slot="sidebar_large" hidden></div>
      </aside>
      </div></div>
      ${after.map(([k, h]) => full.has(k) ? h : `<div class="wrap">${h}</div>`).join("\n")}`
    };
  }

  const api = { render, DEFAULT_ORDER, FEATURES, TYPES, typeOf, tags, sectionLabel };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.IMMA_HOME = api;
})(typeof window !== "undefined" ? window : globalThis);
