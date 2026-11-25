// IMMA Business Directory — shared helpers and page parts.
// Used in the browser (window.IMMA_DIR) and by tools/build_directory.js (require).
(function (root) {
  "use strict";
  const cfg = (typeof SUPABASE !== "undefined" ? SUPABASE : root.SUPABASE) || {};
  const SITE = "https://immanews.com";
  const BASE = "/business-directory/";

  const COUNTIES = [
    ["mombasa", "Mombasa"], ["kwale", "Kwale"], ["kilifi", "Kilifi"], ["tana-river", "Tana River"], ["lamu", "Lamu"], ["taita-taveta", "Taita-Taveta"],
    ["garissa", "Garissa"], ["wajir", "Wajir"], ["mandera", "Mandera"], ["marsabit", "Marsabit"], ["isiolo", "Isiolo"], ["meru", "Meru"],
    ["tharaka-nithi", "Tharaka-Nithi"], ["embu", "Embu"], ["kitui", "Kitui"], ["machakos", "Machakos"], ["makueni", "Makueni"], ["nyandarua", "Nyandarua"],
    ["nyeri", "Nyeri"], ["kirinyaga", "Kirinyaga"], ["muranga", "Murang'a"], ["kiambu", "Kiambu"], ["turkana", "Turkana"], ["west-pokot", "West Pokot"],
    ["samburu", "Samburu"], ["trans-nzoia", "Trans Nzoia"], ["uasin-gishu", "Uasin Gishu"], ["elgeyo-marakwet", "Elgeyo-Marakwet"], ["nandi", "Nandi"],
    ["baringo", "Baringo"], ["laikipia", "Laikipia"], ["nakuru", "Nakuru"], ["narok", "Narok"], ["kajiado", "Kajiado"], ["kericho", "Kericho"],
    ["bomet", "Bomet"], ["kakamega", "Kakamega"], ["vihiga", "Vihiga"], ["bungoma", "Bungoma"], ["busia", "Busia"], ["siaya", "Siaya"],
    ["kisumu", "Kisumu"], ["homa-bay", "Homa Bay"], ["migori", "Migori"], ["kisii", "Kisii"], ["nyamira", "Nyamira"], ["nairobi", "Nairobi"]
  ];
  const countyName = (slug) => (COUNTIES.find((c) => c[0] === slug) || [slug, slug || ""])[1];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const kes = (n) => n == null || n === "" ? "" : "KSh " + Number(n).toLocaleString("en-KE", { maximumFractionDigits: 2 });
  const slugify = (t) => String(t || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’`]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const media = (path) => !path ? "" : /^https?:/.test(path) ? path : (cfg.url || "") + "/storage/v1/object/public/business-media/" + String(path).split("/").map(encodeURIComponent).join("/");
  const profileUrl = (b) => BASE + b.slug + "/";
  const date = (d) => d ? new Date(String(d).length === 10 ? d + "T12:00:00Z" : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

  // Kenyan numbers: 0712 345 678 / +254 712 345 678 → 254712345678
  function intl(num) {
    let d = String(num || "").replace(/\D/g, "");
    if (d.startsWith("0")) d = "254" + d.slice(1);
    else if (d.length === 9 && /^[17]/.test(d)) d = "254" + d;
    return d;
  }
  const tel = (num) => num ? "tel:+" + intl(num) : "";
  const wa = (num, text) => num ? "https://wa.me/" + intl(num) + (text ? "?text=" + encodeURIComponent(text) : "") : "";
  const prettyPhone = (num) => { const d = intl(num); return d.length === 12 ? `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}` : num; };

  // Open now (Nairobi time). hours: [{d, o:"08:00", c:"17:00", x:false}]
  function nairobiNow() {
    const n = new Date(Date.now() + 3 * 3600 * 1000);
    return { day: n.getUTCDay(), mins: n.getUTCHours() * 60 + n.getUTCMinutes() };
  }
  const toMins = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
  function openNow(hours) {
    if (!hours || !hours.length) return null;
    const { day, mins } = nairobiNow();
    const today = hours.filter((h) => h.d === day && !h.x);
    const prev = hours.filter((h) => h.d === (day + 6) % 7 && !h.x && toMins(h.c) < toMins(h.o));   // overnight hours
    return today.some((h) => { const o = toMins(h.o), c = toMins(h.c); return c > o ? mins >= o && mins < c : mins >= o; })
      || prev.some((h) => mins < toMins(h.c));
  }
  function hoursTable(hours) {
    if (!hours || !hours.length) return "";
    const { day } = nairobiNow();
    return `<table class="bd-hours"><tbody>${[1, 2, 3, 4, 5, 6, 0].map((d) => {
      const rows = hours.filter((h) => h.d === d);
      const txt = !rows.length ? "—" : rows.some((h) => h.x) ? "Closed" : rows.map((h) => `${h.o}–${h.c}`).join(", ");
      return `<tr${d === day ? ' class="today"' : ""}><th scope="row">${DAYS[d]}</th><td>${esc(txt)}</td></tr>`;
    }).join("")}</tbody></table>`;
  }

  const stars = (r, n) => {
    const full = Math.round(Number(r || 0));
    return `<span class="bd-stars" aria-label="${Number(r || 0).toFixed(1)} out of 5 stars${n != null ? ` from ${n} review${n === 1 ? "" : "s"}` : ""}">${"★".repeat(full)}<i>${"★".repeat(5 - full)}</i></span>`;
  };
  const VERIFIED_NOTE = "Verified means IMMA Media checked documents or contact details showing this business is real and run by the people managing the listing. It is not a guarantee of quality or safety.";
  const verifiedBadge = (b) => b.verified ? `<span class="bd-badge bd-verified" title="${esc(VERIFIED_NOTE)}"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1.1 3 1.1 3-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1-2.8-1.6 1.1-3-1.1-3 2.8-1.6.9-3.1 3.2.3z"/><path fill="#fff" d="M10.6 15.2l-3-3 1.2-1.2 1.8 1.8 4.6-4.6 1.2 1.2z"/></svg>Verified</span>` : "";
  const place = (b) => [b.neighbourhood, b.town, b.county ? countyName(b.county) : ""].filter(Boolean).join(", ");

  // Listing card (search results, landing sections, homepage and news widgets)
  function card(b, opts = {}) {
    const logo = b.logo_path ? `<img src="${esc(media(b.logo_path))}" alt="" width="64" height="64" loading="lazy" decoding="async">` : `<span class="bd-mono" aria-hidden="true">${esc((b.name || "?").trim().charAt(0).toUpperCase())}</span>`;
    const cover = b.cover_path ? `<img class="bd-card-cover" src="${esc(media(b.cover_path))}" alt="" width="400" height="200" loading="lazy" decoding="async">` : "";
    const open = opts.showOpen !== false ? openNow(b.hours) : null;
    return `<article class="bd-card${b.premium_design ? " bd-card--premium" : ""}${cover ? " has-cover" : ""}" data-biz="${esc(b.id)}">
      ${cover}
      <div class="bd-card-body">
        <div class="bd-card-head">
          <span class="bd-logo">${logo}</span>
          <div>
            ${opts.sponsored && b.sponsored ? '<span class="bd-sponsored">Sponsored</span>' : ""}
            <h3><a href="${esc(profileUrl(b))}">${esc(b.name)}</a></h3>
            <p class="bd-card-cat">${esc(b.category_name || "")}${place(b) ? ` · ${esc(place(b))}` : ""}</p>
          </div>
        </div>
        ${b.tagline ? `<p class="bd-card-tag">${esc(b.tagline)}</p>` : b.description ? `<p class="bd-card-tag">${esc(String(b.description).slice(0, 120))}${String(b.description).length > 120 ? "…" : ""}</p>` : ""}
        <p class="bd-card-meta">
          ${verifiedBadge(b)}
          ${b.featured && opts.featuredLabel !== false ? '<span class="bd-badge bd-featured">Featured</span>' : ""}
          ${b.rating_count ? `${stars(b.rating_avg)} <small>${Number(b.rating_avg).toFixed(1)} (${b.rating_count})</small>` : ""}
          ${open === true ? '<span class="bd-open">Open now</span>' : open === false ? '<span class="bd-closed">Closed</span>' : ""}
          ${b.has_offer ? '<span class="bd-badge bd-offer">Offer</span>' : ""}
          ${b.is_online ? '<span class="bd-badge">Online</span>' : ""}
          ${b.delivery ? '<span class="bd-badge">Delivers</span>' : ""}
          ${opts.distance != null ? `<span class="bd-dist">${opts.distance < 1 ? Math.round(opts.distance * 1000) + " m" : opts.distance.toFixed(1) + " km"}</span>` : ""}
        </p>
      </div>
    </article>`;
  }

  // ---------- Business profile (static pages and the live preview share this) ----------
  const SCHEMA_TYPES = {
    bakeries: "Bakery", restaurants: "Restaurant", hotels: "LodgingBusiness", fashion: "ClothingStore", beauty: "BeautySalon",
    wellness: "HealthAndBeautyBusiness", clinics: "MedicalClinic", pharmacies: "Pharmacy", schools: "EducationalOrganization",
    "professional-services": "ProfessionalService", "real-estate": "RealEstateAgent", construction: "HomeAndConstructionBusiness",
    interiors: "FurnitureStore", "home-garden": "HomeGoodsStore", cleaning: "HomeAndConstructionBusiness", automotive: "AutomotiveBusiness",
    transport: "MovingCompany", technology: "ElectronicsStore", agriculture: "LocalBusiness", groceries: "GroceryStore", events: "LocalBusiness",
    photography: "ProfessionalService", travel: "TravelAgency", finance: "FinancialService", legal: "LegalService", entertainment: "EntertainmentBusiness",
    fitness: "SportsActivityLocation", manufacturing: "LocalBusiness", online: "OnlineStore", "home-based": "LocalBusiness"
  };
  const SOCIAL_NAMES = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", x: "X", linkedin: "LinkedIn", youtube: "YouTube" };
  const SOCIAL_HOSTS = { facebook: /(^|\.)facebook\.com$|(^|\.)fb\.com$/, instagram: /(^|\.)instagram\.com$/, tiktok: /(^|\.)tiktok\.com$/, x: /(^|\.)(x|twitter)\.com$/, linkedin: /(^|\.)linkedin\.com$/, youtube: /(^|\.)(youtube\.com|youtu\.be)$/ };
  function socialOk(k, u) { try { const h = new URL(u); return h.protocol === "https:" && SOCIAL_HOSTS[k] && SOCIAL_HOSTS[k].test(h.hostname); } catch (e) { return false; } }
  function videoEmbed(u) {
    const y = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/.exec(u || ""), v = /vimeo\.com\/(\d+)/.exec(u || "");
    if (y) return `https://www.youtube-nocookie.com/embed/${y[1]}`;
    if (v) return `https://player.vimeo.com/video/${v[1]}`;
    return "";
  }
  function mapsLink(b) {
    if (b.latitude != null && b.longitude != null) return `https://www.google.com/maps/dir/?api=1&destination=${b.latitude},${b.longitude}`;
    if (b.address_line && b.allow_map) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([b.name, b.address_line, b.town, countyName(b.county), "Kenya"].filter(Boolean).join(", "))}`;
    return "";
  }

  function profile(b, x = {}) {
    const images = x.images || [], products = x.products || [], services = x.services || [], promos = x.promotions || [], reviews = x.reviews || [];
    const url = SITE + profileUrl(b);
    const waText = `Hello ${b.name}, I found you on the IMMA Business Directory (${url}).`;
    const open = openNow(b.hours);
    const socials = Object.entries(b.socials || {}).filter(([k, u]) => socialOk(k, u));
    const dirLink = mapsLink(b);
    const video = videoEmbed(b.video_url);
    const groups = {};
    products.forEach((p) => { const g = p.product_category || "Products"; (groups[g] = groups[g] || []).push(p); });
    const contact = [
      b.whatsapp ? `<a class="bd-btn bd-btn-wa" href="${esc(wa(b.whatsapp, waText))}" target="_blank" rel="noopener" data-track="whatsapp">WhatsApp</a>` : "",
      b.phone ? `<a class="bd-btn" href="${esc(tel(b.phone))}" data-track="phone">Call ${esc(prettyPhone(b.phone))}</a>` : "",
      b.email ? `<a class="bd-btn bd-btn-ghost" href="mailto:${esc(b.email)}" data-track="email">Email</a>` : "",
      b.website ? `<a class="bd-btn bd-btn-ghost" href="${esc(b.website)}" target="_blank" rel="noopener nofollow" data-track="website">Website</a>` : "",
      dirLink ? `<a class="bd-btn bd-btn-ghost" href="${esc(dirLink)}" target="_blank" rel="noopener" data-track="directions">Directions</a>` : ""
    ].filter(Boolean).join("");

    return `
    <article class="bd-profile${b.premium_design ? " bd-profile--premium" : ""}" data-biz="${esc(b.id)}" data-slug="${esc(b.slug)}">
      <header class="bd-hero${b.cover_path ? " has-cover" : ""}">
        ${b.cover_path ? `<img class="bd-hero-img" src="${esc(media(b.cover_path))}" alt="" width="1200" height="400" fetchpriority="high" decoding="async">` : ""}
        <div class="bd-hero-inner wrap">
          <span class="bd-logo bd-logo-lg">${b.logo_path ? `<img src="${esc(media(b.logo_path))}" alt="${esc(b.name)} logo" width="120" height="120">` : `<span class="bd-mono" aria-hidden="true">${esc(b.name.charAt(0).toUpperCase())}</span>`}</span>
          <div class="bd-hero-text">
            <p class="bd-kicker"><a href="${BASE}${esc(b.category_slug || "")}/">${esc(b.category_name || "Business")}</a>${b.county ? ` · <a href="${BASE}county/${esc(b.county)}/">${esc(countyName(b.county))}</a>` : ""}</p>
            <h1>${esc(b.name)}</h1>
            ${b.tagline ? `<p class="bd-tagline">${esc(b.tagline)}</p>` : ""}
            <p class="bd-hero-meta">
              ${verifiedBadge(b)}
              ${b.rating_count ? `${stars(b.rating_avg, b.rating_count)} <a href="#reviews">${Number(b.rating_avg).toFixed(1)} · ${b.rating_count} review${b.rating_count === 1 ? "" : "s"}</a>` : ""}
              ${open === true ? '<span class="bd-open">Open now</span>' : open === false ? '<span class="bd-closed">Closed now</span>' : ""}
              ${b.is_online ? '<span class="bd-badge">Online business</span>' : ""}
              ${b.delivery ? '<span class="bd-badge">Delivery available</span>' : ""}
              ${b.price_range ? `<span class="bd-badge" title="Price range">Prices: ${["", "Budget", "Moderate", "Upmarket", "Premium"][b.price_range]}</span>` : ""}
            </p>
          </div>
        </div>
      </header>

      <div class="wrap bd-profile-grid">
        <div class="bd-main">
          ${contact ? `<div class="bd-actions">${contact}</div>` : ""}
          <div class="bd-tools">
            <button type="button" class="bd-tool" data-share>Share</button>
            <button type="button" class="bd-tool" data-save aria-pressed="false">☆ Save</button>
            <button type="button" class="bd-tool" data-report>Report incorrect information</button>
            ${b.claimable ? '<button type="button" class="bd-tool bd-tool-claim" data-claim>Claim this business</button>' : ""}
          </div>

          ${promos.length ? `<section class="bd-section bd-promos" aria-labelledby="bd-promo-h"><h2 id="bd-promo-h">Special offers</h2>${promos.map((p) => `
            <div class="bd-promo">${p.image_path ? `<img src="${esc(media(p.image_path))}" alt="" loading="lazy" width="160" height="120">` : ""}<div><h3>${esc(p.title)}</h3>${p.description ? `<p>${esc(p.description)}</p>` : ""}<small>Until ${esc(date(p.ends_on))}</small></div></div>`).join("")}</section>` : ""}

          <section class="bd-section" aria-labelledby="bd-about-h">
            <h2 id="bd-about-h">About ${esc(b.name)}</h2>
            ${String(b.description || "").split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("")}
            ${(b.product_categories || []).length && !products.length ? `<p class="bd-chips">${b.product_categories.map((c) => `<span>${esc(c)}</span>`).join("")}</p>` : ""}
          </section>

          ${images.length ? `<section class="bd-section" aria-labelledby="bd-gal-h"><h2 id="bd-gal-h">Photos</h2><div class="bd-gallery">${images.map((i, n) => `
            <a href="${esc(media(i.path))}" target="_blank" rel="noopener"><img src="${esc(media(i.path))}" alt="${esc(i.caption || `${b.name} photo ${n + 1}`)}" loading="lazy" decoding="async" width="300" height="225"></a>`).join("")}</div></section>` : ""}

          ${video ? `<section class="bd-section" aria-labelledby="bd-vid-h"><h2 id="bd-vid-h">Video</h2><div class="bd-video"><iframe src="${esc(video)}" title="${esc(b.name)} video" loading="lazy" allowfullscreen></iframe></div></section>` : ""}

          ${products.length ? `<section class="bd-section" aria-labelledby="bd-prod-h"><h2 id="bd-prod-h">Products &amp; prices</h2>${Object.entries(groups).map(([g, list]) => `
            <h3 class="bd-group">${esc(g)}</h3><div class="bd-products">${list.map((p) => `
              <div class="bd-product">
                ${p.image_path ? `<img src="${esc(media(p.image_path))}" alt="${esc(p.name)}" loading="lazy" decoding="async" width="240" height="180">` : ""}
                <div><h4>${esc(p.name)}</h4>${p.description ? `<p>${esc(p.description)}</p>` : ""}
                <p class="bd-price">${p.promo_price_kes != null && p.price_kes != null ? `<del>${kes(p.price_kes)}</del> <b>${kes(p.promo_price_kes)}</b>` : p.price_kes != null ? `<b>${kes(p.price_kes)}</b>` : ""}
                  ${p.availability === "out_of_stock" ? '<span class="bd-closed">Out of stock</span>' : p.availability === "on_order" ? '<span class="bd-badge">Made to order</span>' : ""}</p>
                ${b.whatsapp && p.availability !== "out_of_stock" ? `<a class="bd-btn bd-btn-wa bd-btn-sm" target="_blank" rel="noopener" data-track="product_whatsapp" href="${esc(wa(b.whatsapp, `Hello ${b.name}, I would like to order: ${p.name}. (Seen on the IMMA Business Directory)`))}">Order on WhatsApp</a>` : ""}
                </div>
              </div>`).join("")}</div>`).join("")}</section>` : ""}

          ${services.length ? `<section class="bd-section" aria-labelledby="bd-svc-h"><h2 id="bd-svc-h">Services</h2><ul class="bd-services">${services.map((s) => `
            <li><div><b>${esc(s.name)}</b>${s.description ? `<p>${esc(s.description)}</p>` : ""}</div><span>${s.price_from_kes != null ? "From " + kes(s.price_from_kes) : ""}${s.price_note ? ` <small>${esc(s.price_note)}</small>` : ""}</span></li>`).join("")}</ul></section>` : ""}

          <section class="bd-section" id="reviews" aria-labelledby="bd-rev-h">
            <h2 id="bd-rev-h">Reviews</h2>
            <div data-reviews>${reviews.length ? reviews.map(reviewHtml).join("") : '<p class="bd-muted">No reviews yet.</p>'}</div>
            <button type="button" class="bd-btn bd-btn-ghost" data-write-review>Write a review</button>
            <p class="bd-fine">Reviews come from signed-in readers and are checked before they appear. Businesses cannot pay to remove honest reviews. <a href="${BASE}terms.html#reviews">Review rules</a></p>
          </section>

          <section class="bd-section" aria-labelledby="bd-enq-h">
            <h2 id="bd-enq-h">Send an enquiry</h2>
            <form class="bd-form" data-enquiry novalidate>
              <div class="bd-row"><label>Your name<input name="name" required maxlength="80" autocomplete="name"></label>
              <label>Phone<input name="phone" type="tel" maxlength="16" autocomplete="tel" placeholder="07xx xxx xxx"></label></div>
              <label>Email<input name="email" type="email" maxlength="120" autocomplete="email"></label>
              <label>Message<textarea name="message" required maxlength="1500" rows="4"></textarea></label>
              <p class="bd-fine">Your details go only to ${esc(b.name)} and IMMA Media so they can reply. Give a phone number or an email. <a href="/privacy.html">Privacy</a></p>
              <button class="bd-btn" type="submit">Send enquiry</button>
              <p class="bd-status" role="status" hidden></p>
            </form>
          </section>
        </div>

        <aside class="bd-side">
          <div class="bd-panel">
            <h2>Contact &amp; location</h2>
            <dl class="bd-dl">
              ${place(b) ? `<dt>Area</dt><dd>${esc(place(b))}</dd>` : ""}
              ${b.address_line ? `<dt>Address</dt><dd>${esc(b.address_line)}${b.landmark ? `<br><small>${esc(b.landmark)}</small>` : ""}</dd>` : !b.has_premises || b.is_online ? `<dt>Address</dt><dd>${b.is_online ? "Online business" : "No public premises"}${b.delivery ? " · delivers" : ""}</dd>` : ""}
              ${b.phone ? `<dt>Phone</dt><dd><a href="${esc(tel(b.phone))}" data-track="phone">${esc(prettyPhone(b.phone))}</a></dd>` : ""}
              ${b.whatsapp ? `<dt>WhatsApp</dt><dd><a href="${esc(wa(b.whatsapp, waText))}" target="_blank" rel="noopener" data-track="whatsapp">${esc(prettyPhone(b.whatsapp))}</a></dd>` : ""}
              ${b.email ? `<dt>Email</dt><dd><a href="mailto:${esc(b.email)}" data-track="email">${esc(b.email)}</a></dd>` : ""}
              ${b.website ? `<dt>Website</dt><dd><a href="${esc(b.website)}" target="_blank" rel="noopener nofollow" data-track="website">${esc(b.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))}</a></dd>` : ""}
            </dl>
            ${socials.length ? `<p class="bd-social">${socials.map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener nofollow" data-track="social">${SOCIAL_NAMES[k]}</a>`).join("")}</p>` : ""}
            ${dirLink ? `<a class="bd-btn bd-btn-ghost bd-block" href="${esc(dirLink)}" target="_blank" rel="noopener" data-track="directions">Get directions on Google Maps</a>` : ""}
          </div>
          ${b.hours && b.hours.length ? `<div class="bd-panel"><h2>Opening hours</h2>${hoursTable(b.hours)}${b.hours_note ? `<p class="bd-fine">${esc(b.hours_note)}</p>` : ""}</div>` : ""}
          ${b.verified ? `<div class="bd-panel bd-panel-note"><h2>${verifiedBadge(b)}</h2><p class="bd-fine">${esc(VERIFIED_NOTE)} <a href="${BASE}terms.html#verified">Learn more</a></p></div>` : ""}
          <div class="bd-panel bd-panel-note"><p class="bd-fine">Listed on the IMMA Business Directory${b.published_at ? " since " + esc(date(b.published_at)) : ""}. Information is provided by the business. Always confirm prices and details directly.</p></div>
          <div class="ad-slot ad-slot--side" data-ad-slot="sidebar"><span class="ad-label">&nbsp;</span><div class="ad-frame"></div></div>
        </aside>
      </div>
    </article>`;
  }
  function reviewHtml(r) {
    return `<div class="bd-review" data-review="${esc(r.id)}">
      <p class="bd-review-head">${stars(r.rating)} <b>${esc(r.title || "")}</b></p>
      <p>${esc(r.body)}</p>
      <p class="bd-fine">${esc(r.reviewer_name || "IMMA reader")} · ${esc(date(r.created_at))} · <button type="button" class="bd-link" data-report-review="${esc(r.id)}">Report</button></p>
      ${r.reply_body ? `<div class="bd-reply"><b>Response from the business</b><p>${esc(r.reply_body)}</p></div>` : ""}
    </div>`;
  }

  // schema.org LocalBusiness for a profile (only public facts; ratings only from real, approved reviews)
  function jsonLd(b, x = {}) {
    const url = SITE + profileUrl(b);
    const o = {
      "@context": "https://schema.org", "@type": SCHEMA_TYPES[b.category_slug] || "LocalBusiness", "@id": url + "#business",
      name: b.name, url, description: b.description || undefined,
      image: [b.cover_path, b.logo_path, ...(x.images || []).map((i) => i.path)].filter(Boolean).map(media).slice(0, 6),
      logo: b.logo_path ? media(b.logo_path) : undefined,
      telephone: b.phone ? "+" + intl(b.phone) : undefined, email: b.email || undefined,
      address: { "@type": "PostalAddress", streetAddress: b.address_line || undefined, addressLocality: b.town || undefined, addressRegion: b.county ? countyName(b.county) + " County" : undefined, addressCountry: "KE" },
      geo: b.latitude != null ? { "@type": "GeoCoordinates", latitude: Number(b.latitude), longitude: Number(b.longitude) } : undefined,
      areaServed: b.county ? countyName(b.county) : "Kenya",
      sameAs: Object.entries(b.socials || {}).filter(([k, u]) => socialOk(k, u)).map(([, u]) => u).concat(b.website ? [b.website] : []),
      priceRange: b.price_range ? ["", "KSh", "KSh KSh", "KSh KSh KSh", "KSh KSh KSh KSh"][b.price_range] : undefined,
      openingHoursSpecification: (b.hours || []).filter((h) => !h.x).map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/" + DAYS[h.d], opens: h.o, closes: h.c })),
      aggregateRating: b.rating_count > 0 ? { "@type": "AggregateRating", ratingValue: Number(b.rating_avg), reviewCount: b.rating_count, bestRating: 5, worstRating: 1 } : undefined,
      makesOffer: (x.products || []).filter((p) => p.price_kes != null).slice(0, 20).map((p) => ({ "@type": "Offer", price: Number(p.promo_price_kes ?? p.price_kes), priceCurrency: "KES", itemOffered: { "@type": "Product", name: p.name } }))
    };
    if (!o.openingHoursSpecification.length) delete o.openingHoursSpecification;
    if (!o.makesOffer.length) delete o.makesOffer;
    if (!o.sameAs.length) delete o.sameAs;
    if (!o.image.length) delete o.image;
    return o;
  }

  const api = { SITE, BASE, COUNTIES, DAYS, countyName, esc, kes, slugify, media, profileUrl, date, intl, tel, wa, prettyPhone, openNow, hoursTable, stars,
    VERIFIED_NOTE, verifiedBadge, place, card, profile, reviewHtml, jsonLd, SCHEMA_TYPES, socialOk, SOCIAL_NAMES, videoEmbed, mapsLink };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.IMMA_DIR = api;
})(typeof window !== "undefined" ? window : globalThis);
