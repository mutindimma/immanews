// IMMA News — global site footer (advertising call-to-action, newsletter, brand, navigation,
// contact, IMMA Media ownership, legal bar, cookie settings).
//
// One source of truth:
//   * DEFAULTS below are baked into every page as static HTML by `node tools/build_footer.js`
//     (so the footer shows instantly, without layout shift, and works without JavaScript);
//   * administrators can override any part in Advertising Management → Footer & newsletter,
//     which saves to the Supabase table `site_settings` (key "footer"). This script loads that
//     and re-renders the footer if it differs.
(function (root) {
  "use strict";

  const WA_NUMBER = "254785887830";
  const DEFAULTS = {
    logo: "/images/imma-news-logo-reverse.png",
    tagline: "Inform. Inspire. Empower.",
    description: "An independent Kenyan digital publication bringing you news, meaningful stories, practical information and perspectives that matter.",
    contact: {
      location: "Nairobi, Kenya",
      phone: "+254 785 887 830",
      whatsapp: WA_NUMBER,
      whatsappMessage: "Hello IMMA News, I would like to make an enquiry.",
      // Email addresses are only shown once they exist and are ticked as verified.
      emails: {
        general: { address: "", verified: false },
        editorial: { address: "", verified: false },
        advertising: { address: "", verified: false }
      }
    },
    // Only links that have been filled in are shown. Never add placeholder links.
    social: { facebook: "", instagram: "", x: "", youtube: "", linkedin: "", tiktok: "", whatsappChannel: "" },
    newsletter: {
      enabled: true,
      eyebrow: "The IMMA News newsletter",
      headline: "Stay Informed. Stay Ahead.",
      description: "Kenya's news, insights and essential information, delivered to your inbox.",
      supporting: "Free newsletter. Unsubscribe at any time."
    },
    cta: {
      enabled: true,
      eyebrow: "Advertising & partnerships",
      headline: "Put Your Brand Where Kenya Reads.",
      description: "Discover advertising and partnership opportunities with IMMA News.",
      primaryLabel: "Advertise With Us", primaryHref: "/advertise.html",
      secondaryLabel: "View Advertising Packages", secondaryHref: "/advertise.html#packages"
    },
    // show: "always" | "auto" (only when that news category has stories) | "hidden"
    columns: [
      { title: "Explore IMMA", links: [
        { label: "Latest News", href: "/news/", show: "always" },
        { label: "Politics & Governance", href: "/index.html?c=Politics", show: "auto" },
        { label: "Business & Economy", href: "/index.html?c=Business", show: "auto" },
        { label: "Sports", href: "/index.html?c=Sports", show: "auto" },
        { label: "Lifestyle", href: "/index.html?c=Lifestyle", show: "auto" },
        { label: "Technology", href: "/index.html?c=Technology", show: "auto" },
        { label: "History & Heritage", href: "/history/before-they-became-famous/", show: "always" },
        { label: "Opinion & Analysis", href: "/index.html?c=Opinion", show: "auto" }
      ] },
      { title: "Useful Information", links: [
        { label: "Public Services", href: "/resources.html?c=public-services", show: "always" },
        { label: "Health & Safety", href: "/resources.html?c=health-safety", show: "always" },
        { label: "Transport", href: "/resources.html?c=transport", show: "always" },
        { label: "Education", href: "/resources.html?c=education", show: "always" },
        { label: "Jobs & Opportunities", href: "/resources.html", show: "hidden" },
        { label: "Kenya Elections 2027", href: "/index.html#election", show: "always" },
        { label: "Weather", href: "/index.html#weather", show: "always" },
        { label: "Kenyan Laws", href: "/resources.html", show: "hidden" }
      ] },
      { title: "Work With Us", links: [
        { label: "Advertise With Us", href: "/advertise.html", show: "always" },
        { label: "Advertising Rate Card", href: "/advertise.html#placements", show: "always" },
        { label: "Sponsored Content", href: "/advertise.html#sponsored", show: "always" },
        { label: "Business Directory", href: "/advertise.html", show: "hidden" },
        { label: "Media Partnerships", href: "/contact.html?type=partnership", show: "always" },
        { label: "Submit a News Tip", href: "/contact.html?type=tip", show: "always" },
        { label: "Careers", href: "/contact.html", show: "hidden" },
        { label: "Download Media Kit", href: "/advertise.html", show: "hidden" }
      ] },
      { title: "About & Support", links: [
        { label: "About IMMA News", href: "/about.html", show: "always" },
        { label: "About IMMA Media", href: "/about.html#imma-media", show: "always" },
        { label: "Editorial Policy", href: "/editorial-policy.html", show: "always" },
        { label: "Fact-Checking Policy", href: "/fact-checking.html", show: "always" },
        { label: "Masthead", href: "/masthead.html", show: "always" },
        { label: "Corrections & Complaints", href: "/corrections.html", show: "always" },
        { label: "Contact Us", href: "/contact.html", show: "always" },
        { label: "Frequently Asked Questions", href: "/faq.html", show: "always" },
        { label: "Privacy Policy", href: "/privacy.html", show: "always" },
        { label: "Terms of Use", href: "/terms.html", show: "always" }
      ] }
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy.html", show: "always" },
      { label: "Terms of Use", href: "/terms.html", show: "always" },
      { label: "Editorial Policy", href: "/editorial-policy.html", show: "always" },
      { label: "Sitemap", href: "/sitemap.html", show: "always" },
      { label: "RSS Feed", href: "/feed.xml", show: "always" },
      { label: "Accessibility", href: "/accessibility.html", show: "always" }
    ],
    owner: {
      label: "A publication of",
      logo: "/images/imma-media-logo-reverse.png",
      pillars: "Content • Broadcast • Production",
      statement: "IMMA News is owned and published by IMMA Media.",
      proud: "Proudly Kenyan. Connected to the World.",
      copyright: "© {year} IMMA Media. All rights reserved."
    },
    colors: { bg: "#09192E", gold: "#EAB43F", text: "#FFFFFF", muted: "#B4C0D1", line: "#364357" }
  };

  const SOCIAL = {
    facebook: { name: "Facebook", hosts: ["facebook.com", "fb.com"],
      svg: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5z"/>' },
    instagram: { name: "Instagram", hosts: ["instagram.com"],
      svg: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2"/>' },
    x: { name: "X", hosts: ["x.com", "twitter.com"],
      svg: '<path d="M3.5 3h5l4.2 5.9L17.8 3h2.6l-6.5 7.5L21 21h-5l-4.6-6.4L5.9 21H3.3l6.9-7.9z"/>' },
    youtube: { name: "YouTube", hosts: ["youtube.com", "youtu.be"],
      svg: '<path fill-rule="evenodd" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z"/>' },
    linkedin: { name: "LinkedIn", hosts: ["linkedin.com"],
      svg: '<path d="M4.5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 9h3v12H3zM9 9h2.9v1.7h.1c.4-.8 1.4-1.9 3.2-1.9 3.4 0 4 2.2 4 5.1V21h-3v-6.2c0-1.5 0-3.3-2-3.3s-2.3 1.6-2.3 3.2V21H9z"/>' },
    tiktok: { name: "TikTok", hosts: ["tiktok.com"],
      svg: '<path d="M16.5 3c.3 2.2 1.6 3.6 3.8 3.8v3.1a7 7 0 0 1-3.7-1.2v6.1A5.8 5.8 0 1 1 10.8 9v3.2a2.7 2.7 0 1 0 2.6 2.7V3z"/>' },
    whatsappChannel: { name: "WhatsApp Channel", hosts: ["whatsapp.com"],
      svg: '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z"/>' }
  };
  const EMAIL_LABELS = { general: "General enquiries", editorial: "Editorial", advertising: "Advertising" };

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const str = (v, d, max) => (typeof v === "string" ? v.trim().slice(0, max || 400) : d);
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const HEX = /^#[0-9a-f]{6}$/i;
  const EMAIL = /^[^\s@<>"']{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

  // Site paths ("/about.html"), in-page anchors, https links, phone and mail links only.
  function safeHref(h) {
    h = String(h || "").trim();
    if (!h) return "";
    if (/^\/(?!\/)[^\s<>"']*$/.test(h) || /^#[\w-]*$/.test(h)) return h;
    if (/^(mailto:|tel:)[^\s<>"']+$/i.test(h)) return h;
    try { const u = new URL(h); return u.protocol === "https:" ? u.href : ""; } catch (e) { return ""; }
  }
  function socialOk(key, url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") return false;
      const host = u.hostname.replace(/^www\.|^m\./, "");
      return SOCIAL[key].hosts.some((h) => host === h || host.endsWith("." + h));
    } catch (e) { return false; }
  }
  function cleanLinks(list, fallback) {
    if (!Array.isArray(list)) return fallback;
    return list.slice(0, 20).filter(isObj).map((l) => ({
      label: str(l.label, "", 60),
      href: str(l.href, "", 300),
      show: ["always", "auto", "hidden"].includes(l.show) ? l.show : "always"
    })).filter((l) => l.label);
  }

  // Merge stored settings over the defaults, keeping only valid values of the right type.
  function sanitize(s) {
    const D = DEFAULTS, o = isObj(s) ? s : {};
    const sub = (k) => (isObj(o[k]) ? o[k] : {});
    const c = sub("contact"), em = isObj(c.emails) ? c.emails : {}, nl = sub("newsletter"), cta = sub("cta"), ow = sub("owner"), col = sub("colors"), so = sub("social");
    const bool = (v, d) => (typeof v === "boolean" ? v : d);
    const out = {
      logo: safeHref(str(o.logo, D.logo, 300)) || D.logo,
      tagline: str(o.tagline, D.tagline, 80),
      description: str(o.description, D.description, 400),
      contact: {
        location: str(c.location, D.contact.location, 80),
        phone: str(c.phone, D.contact.phone, 30).replace(/[^\d+ ()-]/g, ""),
        whatsapp: str(c.whatsapp, D.contact.whatsapp, 20).replace(/\D/g, ""),
        whatsappMessage: str(c.whatsappMessage, D.contact.whatsappMessage, 200),
        emails: {}
      },
      social: {},
      newsletter: {
        enabled: bool(nl.enabled, D.newsletter.enabled),
        eyebrow: str(nl.eyebrow, D.newsletter.eyebrow, 60),
        headline: str(nl.headline, D.newsletter.headline, 80),
        description: str(nl.description, D.newsletter.description, 200),
        supporting: str(nl.supporting, D.newsletter.supporting, 120)
      },
      cta: {
        enabled: bool(cta.enabled, D.cta.enabled),
        eyebrow: str(cta.eyebrow, D.cta.eyebrow, 60),
        headline: str(cta.headline, D.cta.headline, 90),
        description: str(cta.description, D.cta.description, 200),
        primaryLabel: str(cta.primaryLabel, D.cta.primaryLabel, 40),
        primaryHref: safeHref(str(cta.primaryHref, D.cta.primaryHref, 300)) || D.cta.primaryHref,
        secondaryLabel: str(cta.secondaryLabel, D.cta.secondaryLabel, 40),
        secondaryHref: safeHref(str(cta.secondaryHref, D.cta.secondaryHref, 300))
      },
      columns: Array.isArray(o.columns)
        ? o.columns.slice(0, 6).filter(isObj).map((x) => ({ title: str(x.title, "", 40), links: cleanLinks(x.links, []) })).filter((x) => x.title)
        : D.columns,
      legal: cleanLinks(o.legal, D.legal),
      owner: {
        label: str(ow.label, D.owner.label, 40),
        logo: safeHref(str(ow.logo, D.owner.logo, 300)) || D.owner.logo,
        pillars: str(ow.pillars, D.owner.pillars, 80),
        statement: str(ow.statement, D.owner.statement, 160),
        proud: str(ow.proud, D.owner.proud, 80),
        copyright: str(ow.copyright, D.owner.copyright, 160)
      },
      colors: {}
    };
    for (const k of Object.keys(D.contact.emails)) {
      const e = isObj(em[k]) ? em[k] : {};
      const address = str(e.address, "", 254).toLowerCase();
      out.contact.emails[k] = { address: EMAIL.test(address) ? address : "", verified: e.verified === true };
    }
    for (const k of Object.keys(SOCIAL)) {
      const v = str(so[k], "", 300);
      out.social[k] = v && socialOk(k, v) ? v : "";
    }
    for (const k of Object.keys(D.colors)) out.colors[k] = HEX.test(col[k] || "") ? col[k] : D.colors[k];
    return out;
  }

  // Categories that currently have stories (for "auto" links). Pages that don't load the
  // stories reuse the list baked into the footer when the site was built.
  function storyCategories() {
    if (typeof NEWS === "undefined" && typeof document !== "undefined") {
      const f = document.querySelector("[data-site-footer][data-cats]");
      try { if (f) return new Set(JSON.parse(f.dataset.cats)); } catch (e) {}
    }
    const list = [].concat(typeof NEWS !== "undefined" ? NEWS : [], root.SERIES_FEED || []);
    return new Set(list.map((n) => n && n.category).filter(Boolean));
  }
  function linkVisible(l, cats) {
    if (l.show === "hidden" || !safeHref(l.href)) return false;
    if (l.show !== "auto") return true;
    const m = /[?&]c=([^&#]+)/.exec(l.href);
    return !!m && !!cats && cats.has(decodeURIComponent(m[1].replace(/\+/g, " ")));
  }
  const ext = (h) => /^https:/i.test(h) ? ' target="_blank" rel="noopener"' : "";

  // Accurate small Kenyan flag: black, red and green bands with white fimbriation, Maasai shield and spears.
  const FLAG = '<svg class="sf-flag" viewBox="0 0 30 20" width="27" height="18" role="img" aria-label="Flag of Kenya">' +
    '<rect width="30" height="20" fill="#fff"/><rect width="30" height="6" fill="#000"/><rect y="7" width="30" height="6" fill="#BB0000"/><rect y="14" width="30" height="6" fill="#006600"/>' +
    '<path d="M11.2 3.2 18.8 16.8M18.8 3.2 11.2 16.8" stroke="#fff" stroke-width=".8"/>' +
    '<ellipse cx="15" cy="10" rx="3" ry="5.8" fill="#000"/><ellipse cx="15" cy="10" rx="1.9" ry="5.8" fill="#BB0000"/>' +
    '<ellipse cx="15" cy="10" rx=".55" ry="1.5" fill="#fff"/><path d="M15 5.3v2.4M15 12.3v2.4" stroke="#fff" stroke-width=".5"/></svg>';
  const ICON = {
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h3.5l1.7 4.4-2.2 1.4a11 11 0 0 0 6.2 6.2l1.4-2.2L20 14.5V18a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  // ---------- rendering ----------
  function renderCta(s) {
    const c = s.cta;
    if (!c.enabled) return "";
    return `<section class="sf-cta" aria-labelledby="sf-cta-h"><div class="wrap sf-cta-inner">
  <div class="sf-cta-copy"><p class="sf-eyebrow">${esc(c.eyebrow)}</p><h2 id="sf-cta-h">${esc(c.headline)}</h2><p>${esc(c.description)}</p></div>
  <div class="sf-cta-btns"><a class="sf-btn sf-btn-gold" href="${esc(c.primaryHref)}"${ext(c.primaryHref)}>${esc(c.primaryLabel)}</a>${c.secondaryHref && c.secondaryLabel ? `<a class="sf-btn sf-btn-ghost" href="${esc(c.secondaryHref)}"${ext(c.secondaryHref)}>${esc(c.secondaryLabel)}</a>` : ""}</div>
</div></section>`;
  }

  function renderNewsletter(s) {
    const n = s.newsletter;
    if (!n.enabled) return "";
    return `<section class="sf-news" aria-labelledby="sf-news-h"><div class="wrap sf-news-inner">
  <div class="sf-news-copy"><p class="sf-eyebrow">${esc(n.eyebrow)}</p><h2 id="sf-news-h">${esc(n.headline)}</h2><p>${esc(n.description)}</p></div>
  <form class="sf-news-form" data-newsletter novalidate>
    <div class="sf-news-row">
      <label class="sf-sr" for="sf-email">Email address</label>
      <input id="sf-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" placeholder="Your email address" required aria-describedby="sf-news-fine sf-news-status">
      <button class="sf-btn sf-btn-gold" type="submit">Subscribe</button>
    </div>
    <div class="sf-hp" aria-hidden="true"><label>Website <input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
    <label class="sf-consent"><input type="checkbox" name="consent" required><span>I agree to receive the IMMA News newsletter by email and accept the <a href="/privacy.html#newsletter">Privacy Policy</a>.</span></label>
    <p class="sf-fine" id="sf-news-fine">${esc(n.supporting)} <a href="/unsubscribe.html">Unsubscribe</a></p>
    <p class="sf-status" id="sf-news-status" role="status" aria-live="polite"></p>
  </form>
</div></section>`;
  }

  function renderFooter(s, cats, year) {
    const c = s.contact;
    const social = Object.keys(SOCIAL).filter((k) => s.social[k]);
    const tel = c.phone.replace(/[^\d+]/g, "");
    const wa = c.whatsapp ? `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(c.whatsappMessage)}` : "";
    const emails = Object.keys(EMAIL_LABELS).filter((k) => c.emails[k] && c.emails[k].verified && c.emails[k].address);
    const cols = s.columns.map((col, i) => ({ col, i, links: col.links.filter((l) => linkVisible(l, cats)) })).filter((x) => x.links.length);
    const legal = s.legal.filter((l) => linkVisible(l, cats));
    const copy = esc(s.owner.copyright).replace("{year}", `<span data-year>${year}</span>`);
    const st = s.colors;

    return `<footer class="sf" id="site-footer" data-site-footer data-cats="${esc(JSON.stringify([...(cats || [])].sort()))}" style="--sf-bg:${st.bg};--sf-gold:${st.gold};--sf-text:${st.text};--sf-muted:${st.muted};--sf-line:${st.line}">
${renderNewsletter(s)}
<div class="wrap sf-main">
  <div class="sf-brand">
    <a class="sf-logo" href="/index.html" aria-label="IMMA News home"><img src="${esc(s.logo)}" alt="IMMA News" width="320" height="234" loading="lazy" decoding="async"></a>
    <p class="sf-tagline">${esc(s.tagline)}</p>
    <p class="sf-desc">${esc(s.description)}</p>
    ${social.length ? `<ul class="sf-social" aria-label="IMMA News on social media">${social.map((k) => `<li><a href="${esc(s.social[k])}" target="_blank" rel="noopener me" aria-label="IMMA News on ${SOCIAL[k].name} (opens in a new tab)"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${SOCIAL[k].svg}</svg></a></li>`).join("")}</ul>` : ""}
  </div>
  <nav class="sf-nav" aria-label="Footer">
    ${cols.map(({ col, i, links }) => `<div class="sf-col">
      <h2 class="sf-col-title">${esc(col.title)}</h2>
      <button class="sf-col-toggle" type="button" aria-expanded="false" aria-controls="sf-col-${i}">${esc(col.title)}${ICON.chev}</button>
      <ul id="sf-col-${i}">${links.map((l) => `<li><a href="${esc(safeHref(l.href))}"${ext(l.href)}>${esc(l.label)}</a></li>`).join("")}</ul>
    </div>`).join("")}
  </nav>
</div>
<div class="wrap sf-contact">
  <p class="sf-contact-title">Contact</p>
  <ul>
    ${c.location ? `<li>${ICON.pin}<span>${esc(c.location)}</span></li>` : ""}
    ${tel ? `<li>${ICON.phone}<a href="tel:${esc(tel)}">${esc(c.phone)}</a></li>` : ""}
    ${emails.map((k) => `<li>${ICON.mail}<span><span class="sf-email-k">${EMAIL_LABELS[k]}:</span> <a href="mailto:${esc(c.emails[k].address)}">${esc(c.emails[k].address)}</a></span></li>`).join("")}
  </ul>
  ${wa ? `<a class="sf-btn sf-btn-wa" href="${esc(wa)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${SOCIAL.whatsappChannel.svg}</svg>Chat on WhatsApp</a>` : ""}
</div>
<div class="sf-owner"><div class="wrap sf-owner-inner">
  <div class="sf-pub">
    <p class="sf-pub-label">${esc(s.owner.label)}</p>
    <a href="/about.html#imma-media" class="sf-pub-logo"><img src="${esc(s.owner.logo)}" alt="IMMA Media" width="280" height="205" loading="lazy" decoding="async"></a>
    <p class="sf-pillars">${esc(s.owner.pillars)}</p>
  </div>
  <div class="sf-owner-copy">
    <p class="sf-statement">${esc(s.owner.statement)}</p>
    <p class="sf-proud">${FLAG}<span>${esc(s.owner.proud)}</span></p>
    <p class="sf-copyright">${copy}</p>
  </div>
</div></div>
<div class="sf-legal"><div class="wrap sf-legal-inner">
  <nav aria-label="Legal"><ul>
    ${legal.slice(0, 2).map((l) => `<li><a href="${esc(safeHref(l.href))}"${ext(l.href)}>${esc(l.label)}</a></li>`).join("")}
    <li><button type="button" class="sf-linkbtn" data-cookie-settings>Cookie Settings</button></li>
    ${legal.slice(2).map((l) => `<li><a href="${esc(safeHref(l.href))}"${ext(l.href)}>${esc(l.label)}</a></li>`).join("")}
  </ul></nav>
  <button type="button" class="sf-top" data-back-to-top>${ICON.up}<span>Back to top</span></button>
</div></div>
</footer>`;
  }

  function render(settings, cats, year) {
    const s = sanitize(settings);
    return renderCta(s) + "\n" + renderFooter(s, cats || storyCategories(), year || new Date().getFullYear());
  }

  const API = { DEFAULTS, SOCIAL, EMAIL_LABELS, sanitize, safeHref, socialOk, render, renderCta, renderFooter, storyCategories };

  // ---------- Node (build tool) ----------
  if (typeof module !== "undefined" && module.exports) { module.exports = API; return; }
  root.IMMA_FOOTER = API;
  if (typeof document === "undefined") return;

  // ---------- Browser ----------
  const CFG = typeof SUPABASE !== "undefined" ? SUPABASE : {};
  const CACHE = "imma_footer_v1", PREFS = "imma_prefs_v1";
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const reduceMotion = () => root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const onAdvertisePage = /\/advertiser?\.html$/.test(location.pathname);
  let current = null;   // JSON of the settings currently shown

  function mount(settings) {
    const json = JSON.stringify(sanitize(settings));
    if (json === current) return;
    const footer = document.querySelector("[data-site-footer]");
    if (!footer) return;
    const old = document.querySelector(".sf-cta");
    // Keep anything the reader typed in the newsletter box
    const typed = footer.querySelector("#sf-email") ? footer.querySelector("#sf-email").value : "";
    const tpl = document.createElement("template");
    tpl.innerHTML = render(settings);
    const cta = tpl.content.querySelector(".sf-cta"), next = tpl.content.querySelector("[data-site-footer]");
    if (old) old.remove();
    if (cta && !onAdvertisePage) footer.before(cta);
    footer.replaceWith(next);
    if (typed && next.querySelector("#sf-email")) next.querySelector("#sf-email").value = typed;
    current = json;
  }
  API.apply = (settings) => { current = null; mount(settings); };   // re-render with given settings

  async function loadSettings() {
    const cached = store.get(CACHE);
    if (cached && cached.v) mount(cached.v);
    if (!CFG.url || !CFG.anonKey) return;
    try {
      const r = await fetch(`${CFG.url}/rest/v1/site_settings?key=eq.footer&select=value`, { headers: { apikey: CFG.anonKey } });
      if (!r.ok) return;
      const rows = await r.json();
      const v = rows && rows[0] ? rows[0].value : null;
      store.set(CACHE, { t: Date.now(), v });
      mount(v);
    } catch (e) { /* offline: keep the built-in footer */ }
  }

  // Newsletter
  const MESSAGES = {
    invalid_email: "Please enter a valid email address.",
    consent_required: "Please tick the box to agree to receive the newsletter.",
    rate_limited: "Too many attempts from this connection. Please try again in an hour.",
    newsletter_closed: "Newsletter sign-ups are closed at the moment.",
    unavailable: "Sign-up isn't available right now. Please try again later.",
    network: "We couldn't reach our server. Check your connection and try again."
  };
  async function rpc(name, body) {
    if (!CFG.url || !CFG.anonKey) throw new Error("unavailable");
    let r;
    try {
      r = await fetch(`${CFG.url}/rest/v1/rpc/${name}`, {
        method: "POST", headers: { apikey: CFG.anonKey, "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
    } catch (e) { throw new Error("network"); }
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const m = data && data.message;
      throw new Error(MESSAGES[m] ? m : "unavailable");
    }
    return data;
  }
  async function subscribe(form) {
    const status = form.querySelector(".sf-status"), btn = form.querySelector('button[type="submit"]'), input = form.elements.email;
    const say = (msg, kind) => { status.textContent = msg; status.className = "sf-status" + (kind ? " is-" + kind : ""); };
    const email = input.value.trim().toLowerCase();
    input.removeAttribute("aria-invalid");
    if (!EMAIL.test(email) || email.length > 254) { input.setAttribute("aria-invalid", "true"); input.focus(); return say(MESSAGES.invalid_email, "error"); }
    if (!form.elements.consent.checked) { form.elements.consent.focus(); return say(MESSAGES.consent_required, "error"); }
    btn.disabled = true; form.setAttribute("aria-busy", "true"); btn.dataset.label = btn.textContent; btn.textContent = "Subscribing…";
    say("Subscribing…", "loading");
    try {
      const res = await rpc("newsletter_subscribe", { p_email: email, p_consent: true, p_source: location.pathname.slice(0, 200), p_website: form.elements.website.value });
      if (res && res.status === "already") {
        say(`${email} is already subscribed. Nothing more to do.`, "info");
      } else {
        const t = res && res.token ? `/unsubscribe.html?t=${encodeURIComponent(res.token)}` : "/unsubscribe.html";
        status.className = "sf-status is-success";
        status.innerHTML = `${res && res.status === "resubscribed" ? "Welcome back! " : ""}You're subscribed. The IMMA News newsletter will be sent to <b>${esc(email)}</b>. Changed your mind? <a href="${t}">Unsubscribe</a>.`;
        form.reset();
      }
    } catch (e) {
      say(MESSAGES[e.message] || MESSAGES.unavailable, "error");
    } finally {
      btn.disabled = false; form.removeAttribute("aria-busy"); btn.textContent = btn.dataset.label || "Subscribe";
    }
  }
  root.IMMA_NEWSLETTER = { rpc, MESSAGES, EMAIL };

  // Cookie settings. Essential storage is always on. Optional:
  //   * analytics  — Google Tag Manager (GTM-KZZ2PRJM) loads only after the visitor accepts
  //                  (the loader, window.immaLoadGTM, is in each page's <head>);
  //   * adMeasure  — a random per-tab code used to count advert views/clicks (on unless switched off).
  const prefs = () => Object.assign({ adMeasure: true }, store.get(PREFS) || {});
  root.IMMA_PREFS = { get: prefs };
  function savePrefs(p) {
    const before = prefs();
    const next = Object.assign({}, before, p, { savedAt: new Date().toISOString() });
    store.set(PREFS, next);
    if (next.adMeasure === false) { try { sessionStorage.removeItem("imma_ad_sid"); } catch (e) {} }
    if (next.analytics === true && typeof root.immaLoadGTM === "function") root.immaLoadGTM();
    if (next.analytics === false && before.analytics === true) {
      if (typeof root.gtag === "function") root.gtag("consent", "update", { analytics_storage: "denied" });
      // Remove Google Analytics cookies already set on this site
      document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter((n) => /^(_ga|_gid|_gat)/.test(n)).forEach((n) => {
        for (const dom of ["", "; domain=" + location.hostname, "; domain=." + location.hostname.replace(/^www\./, "")]) {
          document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + dom;
        }
      });
    }
    const b = document.getElementById("sf-consent");
    if (b) b.remove();
  }
  function openCookies() {
    let d = document.getElementById("sf-cookies");
    if (!d) {
      d = document.createElement("dialog");
      d.id = "sf-cookies"; d.className = "sf-dialog"; d.setAttribute("aria-labelledby", "sf-cookies-h");
      d.innerHTML = `<form method="dialog" class="sf-dialog-body">
  <h2 id="sf-cookies-h">Cookie settings</h2>
  <p>We use analytics cookies only if you allow them. We do not use advertising cookies, and we do not sell your data.</p>
  <div class="sf-pref"><div><b>Essential</b><p>Your sign-in (only if you sign in), these preferences, and a short-lived copy of the footer and adverts so pages load faster.</p></div><span class="sf-pref-on">Always on</span></div>
  <div class="sf-pref"><div><b>Analytics</b><p>Google Tag Manager and Google Analytics cookies help us understand which pages readers visit, so we can improve IMMA News. Google receives your IP address and page visits.</p></div>
    <label class="sf-switch"><input type="checkbox" name="analytics"><span class="sf-sr">Allow analytics cookies</span><i aria-hidden="true"></i></label></div>
  <div class="sf-pref"><div><b>Advert measurement</b><p>A random code, kept only until you close the tab, lets us count advert views and clicks fairly for advertisers. It is not a cookie and does not identify you.</p></div>
    <label class="sf-switch"><input type="checkbox" name="adMeasure"><span class="sf-sr">Allow advert measurement</span><i aria-hidden="true"></i></label></div>
  <p class="sf-small">Read more in our <a href="/privacy.html#storage">Privacy Policy</a>.</p>
  <div class="sf-dialog-btns"><button class="sf-btn sf-btn-ghost-dark" value="cancel" type="submit">Cancel</button><button class="sf-btn sf-btn-gold" value="save" type="submit">Save preferences</button></div>
</form>`;
      document.body.appendChild(d);
      d.addEventListener("close", () => {
        if (d.returnValue === "save") {
          savePrefs({ adMeasure: d.querySelector('[name="adMeasure"]').checked, analytics: d.querySelector('[name="analytics"]').checked });
        }
        const opener = document.querySelector("[data-cookie-settings]");
        if (opener) opener.focus();
      });
    }
    d.querySelector('[name="adMeasure"]').checked = prefs().adMeasure !== false;
    d.querySelector('[name="analytics"]').checked = prefs().analytics === true;
    d.returnValue = "";
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  }

  // First visit: ask once about analytics cookies (nothing optional loads until the reader chooses)
  function consentBanner() {
    if (typeof prefs().analytics === "boolean" || document.getElementById("sf-consent")) return;
    const b = document.createElement("section");
    b.id = "sf-consent"; b.className = "sf-consent-bar"; b.setAttribute("aria-label", "Cookie choice");
    b.innerHTML = `<div class="wrap sf-consent-inner">
  <p>We'd like to use analytics cookies (Google Analytics) to learn which stories readers find useful. They are off unless you accept. <a href="/privacy.html#storage">Privacy Policy</a></p>
  <div class="sf-consent-btns"><button type="button" class="sf-btn sf-btn-ghost-dark" data-consent="no">Decline</button><button type="button" class="sf-btn sf-btn-ghost-dark" data-cookie-settings>Settings</button><button type="button" class="sf-btn sf-btn-gold" data-consent="yes">Accept</button></div>
</div>`;
    document.body.appendChild(b);
  }
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-consent]");
    if (c) savePrefs({ analytics: c.dataset.consent === "yes" });
  });

  // One set of listeners for everything (survives re-rendering)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-back-to-top], [data-cookie-settings], .sf-col-toggle");
    if (!t) return;
    if (t.matches("[data-back-to-top]")) {
      root.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" });
      const first = document.querySelector("header a, main a, a");
      if (first) first.focus({ preventScroll: true });
    } else if (t.matches("[data-cookie-settings]")) {
      openCookies();
    } else {
      const open = t.getAttribute("aria-expanded") !== "true";
      t.setAttribute("aria-expanded", String(open));
      t.closest(".sf-col").classList.toggle("is-open", open);
    }
  });
  document.addEventListener("submit", (e) => {
    const f = e.target.closest("[data-newsletter]");
    if (f) { e.preventDefault(); subscribe(f); }
  });

  // Links like /advertise.html#sponsored open the matching collapsed <details> section
  function openTarget() {
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id && document.getElementById(id);
    if (el && el.tagName === "DETAILS") { el.open = true; el.scrollIntoView({ block: "center" }); }
  }
  root.addEventListener("hashchange", openTarget);

  function start() {
    openTarget();
    document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
    if (onAdvertisePage) { const c = document.querySelector(".sf-cta"); if (c) c.remove(); }
    // Re-render once so "auto" links reflect the stories actually loaded on this page
    current = null;
    mount(null);
    loadSettings();
    consentBanner();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})(typeof window !== "undefined" ? window : globalThis);
