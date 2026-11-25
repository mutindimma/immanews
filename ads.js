// IMMA News — advert slots on the public site.
// Each <div data-ad-slot="placement_key"> is filled with a live advert from Supabase
// (rotated by priority and weight) or, when empty, an IMMA Media "Advertise with us" promo.
// Views are counted only when at least half the advert is on screen for one second.
(() => {
  const cfg = typeof SUPABASE !== "undefined" ? SUPABASE : {};
  if (!cfg.url || !cfg.anonKey) return;
  const BUCKET = cfg.url + "/storage/v1/object/public/ad-creatives/";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
  const device = () => (isMobile() ? "mobile" : "desktop");
  const advertiseUrl = "/advertise.html";

  // Readers can switch advert measurement off in Cookie Settings (footer.js stores the choice)
  const measureOff = () => { try { return (JSON.parse(localStorage.getItem("imma_prefs_v1")) || {}).adMeasure === false; } catch (e) { return false; } };

  // Visitor session id for de-duplicating views/clicks (random, not linked to the person)
  let session = "";
  if (!measureOff()) try {
    session = sessionStorage.getItem("imma_ad_sid") || "";
    if (!session) { session = crypto.randomUUID().replace(/-/g, ""); sessionStorage.setItem("imma_ad_sid", session); }
  } catch (e) { session = Math.random().toString(36).slice(2) + Date.now().toString(36); }
  const looksAutomated = navigator.webdriver || /bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent);

  const rpc = (fn, body, keepalive) => fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
    method: "POST", keepalive: !!keepalive,
    headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  function track(creative, event) {
    if (looksAutomated || !creative || measureOff()) return;
    if (!session) { try { session = sessionStorage.getItem("imma_ad_sid") || crypto.randomUUID().replace(/-/g, ""); sessionStorage.setItem("imma_ad_sid", session); } catch (e) { session = Math.random().toString(36).slice(2); } }
    rpc("ad_track", { p_creative: creative, p_event: event, p_session: session, p_device: device() }, event === "click").catch(() => {});
  }

  let DATA = null;
  const shown = new Map();   // placement -> Set of creative ids already used on this page (avoid duplicates)

  async function load() {
    try {
      const cached = sessionStorage.getItem("imma_ads_v1");
      if (cached) { const c = JSON.parse(cached); if (Date.now() - c.t < 5 * 60 * 1000) return c.d; }
    } catch (e) {}
    const r = await rpc("ad_get_live");
    if (!r.ok) throw new Error("ads " + r.status);
    const d = await r.json();
    try { sessionStorage.setItem("imma_ads_v1", JSON.stringify({ t: Date.now(), d })); } catch (e) {}
    return d;
  }

  // Weighted random pick, highest priority group first
  function pick(list, exclude) {
    const pool = list.filter((a) => !exclude.has(a.creative));
    if (!pool.length) return null;
    const top = Math.max(...pool.map((a) => a.priority || 0));
    const group = pool.filter((a) => (a.priority || 0) === top);
    let r = Math.random() * group.reduce((n, a) => n + (a.weight || 1), 0);
    for (const a of group) { r -= a.weight || 1; if (r <= 0) return a; }
    return group[0];
  }

  function placementInfo(key) {
    return (DATA.placements || []).find((p) => p.key === key) || null;
  }

  function candidates(key, category) {
    return (DATA.ads || []).filter((a) => a.placement === key && a.image &&
      (!a.categories || !a.categories.length || (category && a.categories.includes(category))));
  }

  // Which placement a slot uses right now (phones: the top leaderboard becomes the mobile banner)
  function effectiveKey(slot) {
    const key = slot.dataset.adSlot;
    if (key === "top_leaderboard" && isMobile()) return "mobile_banner";
    return key;
  }

  function sizeOf(p, mobile) {
    if (mobile && p.mobile_width && p.mobile_height && p.width > 400) return [p.mobile_width, p.mobile_height];
    return [p.width, p.height];
  }

  function houseAd(p, mobile) {
    const [w, h] = sizeOf(p, mobile);
    const shape = h >= w * 1.5 ? "tall" : h >= w * 0.6 ? "box" : h > 150 ? "wide-big" : "wide";
    return `
      <a class="ad-house ad-house--${shape}" href="${advertiseUrl}" aria-label="Advertise with IMMA News">
        <img class="ad-house__emblem" src="/images/imma-news-emblem.png" alt="" width="200" height="192">
        <span class="ad-house__text">
          <b>YOUR BRAND BELONGS HERE</b>
          <span>Reach Kenyan readers with IMMA News. Advertise with us today.</span>
        </span>
        <span class="ad-house__btn">Advertise Now</span>
      </a>`;
  }

  function fill(slot) {
    if (!DATA || slot.dataset.adFilled === device()) return;
    const key = effectiveKey(slot);
    const p = placementInfo(key);
    const category = slot.dataset.adCategory || null;
    if (!p || !p.active || DATA.enabled === false) { slot.hidden = true; return; }

    const mobile = isMobile();
    const used = shown.get(key) || new Set();
    const ad = pick(candidates(key, category), used);
    slot.hidden = false;
    slot.dataset.adFilled = device();
    const [w, h] = sizeOf(p, mobile);
    slot.style.setProperty("--ad-w", w);
    slot.style.setProperty("--ad-h", h);
    slot.style.maxWidth = w + "px";

    if (!ad) {
      if (!p.house) { slot.hidden = true; return; }
      slot.innerHTML = `<span class="ad-label">Advertise with us</span><div class="ad-frame">${houseAd(p, mobile)}</div>`;
      return;
    }
    used.add(ad.creative); shown.set(key, used);
    const img = mobile && ad.mobile_image ? ad.mobile_image : ad.image;
    const label = ad.house ? "From IMMA Media" : "Advertisement";
    slot.innerHTML = `
      <span class="ad-label">${label}</span>
      <div class="ad-frame">
        <a href="${esc(ad.url || advertiseUrl)}" target="_blank" rel="sponsored noopener" data-creative="${esc(ad.creative)}">
          <img src="${esc(BUCKET + img)}" alt="${esc(ad.alt || "Advertisement: " + ad.advertiser)}" width="${w}" height="${h}" loading="lazy" decoding="async">
        </a>
      </div>`;
    slot.querySelector("a").addEventListener("click", () => track(ad.creative, "click"));
    watch(slot, ad.creative);
  }

  // Count a view once ≥50% of the advert has been visible for 1 second
  const timers = new WeakMap();
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const el = e.target;
      if (e.isIntersecting && e.intersectionRatio >= 0.5) {
        if (!timers.get(el)) timers.set(el, setTimeout(() => { track(el.dataset.viewCreative, "impression"); io.unobserve(el); }, 1000));
      } else if (timers.get(el)) { clearTimeout(timers.get(el)); timers.delete(el); }
    });
  }, { threshold: [0, 0.5, 1] }) : null;
  function watch(slot, creative) {
    if (!io) return;
    slot.dataset.viewCreative = creative;
    io.observe(slot);
  }

  function fillAll(root) {
    (root || document).querySelectorAll("[data-ad-slot]:not(#ad-category)").forEach(fill);
  }

  // ---------- Sponsored articles in the homepage news feed ----------
  function sponsoredList() {
    return (DATA.ads || []).filter((a) => a.placement === "sponsored_article" && a.headline && a.body);
  }
  function addSponsored() {
    const grid = document.getElementById("news-grid");
    if (!grid || grid.querySelector(".item--sponsored")) return;
    const list = sponsoredList();
    if (!list.length) return;
    const items = grid.querySelectorAll(".item");
    if (!items.length) return;
    list.slice(0, 2).forEach((a, n) => {
      const card = document.createElement("article");
      card.className = "item item--sponsored";
      card.tabIndex = 0;
      card.dataset.sponsored = a.creative;
      card.innerHTML = `
        ${a.image ? `<img src="${esc(BUCKET + a.image)}" alt="" loading="lazy">` : `<img src="/images/placeholder.svg" alt="">`}
        <div>
          <span class="label label--sponsored">Sponsored Content</span>
          <h3>${esc(a.headline)}</h3>
          <p>${esc(a.body.split(/\n\s*\n/)[0].slice(0, 220))}${a.body.length > 220 ? "…" : ""}</p>
          <span class="source">Paid for by ${esc(a.advertiser)}</span>
        </div>`;
      const at = items[Math.min(items.length - 1, 2 + n * 5)];
      at.after(card);
      watch(card, a.creative);
    });
  }
  function openSponsored(id) {
    const a = sponsoredList().find((x) => x.creative === id);
    const reader = document.getElementById("reader");
    if (!a || !reader) return;
    const paras = a.body.split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join("");
    document.getElementById("reader-body").innerHTML = `
      ${a.image ? `<img src="${esc(BUCKET + a.image)}" alt="">` : ""}
      <div class="reader-text">
        <span class="label label--sponsored">Sponsored Content</span>
        <h2>${esc(a.headline)}</h2>
        <p class="source">Paid for by ${esc(a.advertiser)} · not written by the IMMA News newsroom</p>
        ${paras}
        ${a.url ? `<p><a class="btn-gold" href="${esc(a.url)}" target="_blank" rel="sponsored noopener" data-creative="${esc(a.creative)}">Visit ${esc(a.advertiser)}</a></p>` : ""}
        <p class="credit">This is paid content from ${esc(a.advertiser)}. IMMA News reviews sponsored content before publishing but it is not independent journalism.</p>
      </div>`;
    const cta = reader.querySelector("[data-creative]");
    if (cta) cta.addEventListener("click", () => track(a.creative, "click"));
    reader.showModal();
  }
  document.addEventListener("click", (e) => {
    const card = e.target.closest("[data-sponsored]");
    if (card) { e.stopPropagation(); openSponsored(card.dataset.sponsored); }
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches && e.target.matches("[data-sponsored]")) { e.stopPropagation(); openSponsored(e.target.dataset.sponsored); }
  }, true);

  // ---------- In-article advert: after the 3rd paragraph of any opened story ----------
  function addInArticle() {
    const body = document.querySelector("#reader-body .reader-text");
    if (!body || body.querySelector("[data-ad-slot]") || body.closest("[data-no-ads]")) return;
    if (body.querySelector(".label--sponsored")) return;   // no adverts inside sponsored content
    const paras = body.querySelectorAll(":scope > p:not(.source):not(.lead):not(.credit)");
    if (paras.length < 4) return;
    const slot = document.createElement("div");
    slot.className = "ad-slot ad-slot--inline";
    slot.dataset.adSlot = "in_article";
    paras[2].after(slot);
    shown.delete("in_article");
    fill(slot);
  }

  // ---------- Category banner: shown when a news section is selected ----------
  function syncCategoryBanner() {
    const label = document.getElementById("stream-label");
    const slot = document.getElementById("ad-category");
    if (!label || !slot) return;
    const active = document.querySelector("#filters .chip.on");
    const cat = active && active.dataset.c !== "Home" && !document.getElementById("search").value.trim() ? active.dataset.c : null;
    if (!cat) { slot.hidden = true; slot.dataset.adFilled = ""; slot.innerHTML = ""; return; }
    if (slot.dataset.adCategory === cat && slot.dataset.adFilled) return;
    slot.dataset.adCategory = cat;
    slot.dataset.adFilled = "";
    shown.delete("category_banner");
    fill(slot);
  }

  // Re-fill when switching between phone and desktop sizes
  let lastDevice = device();
  window.addEventListener("resize", () => {
    if (device() === lastDevice) return;
    lastDevice = device();
    shown.clear();
    document.querySelectorAll("[data-ad-slot]").forEach((s) => { s.dataset.adFilled = ""; });
    fillAll();
    const cat = document.getElementById("ad-category");
    if (cat) cat.dataset.adCategory = "";
    syncCategoryBanner();
  });

  load().then((d) => {
    DATA = d;
    fillAll();
    addSponsored();
    syncCategoryBanner();
    const grid = document.getElementById("news-grid");
    if (grid) new MutationObserver(() => { addSponsored(); syncCategoryBanner(); }).observe(grid, { childList: true });
    const rb = document.getElementById("reader-body");
    if (rb) new MutationObserver(addInArticle).observe(rb, { childList: true });
  }).catch(() => {
    // Adverts are optional: if they fail to load, hide the empty slots and carry on.
    document.querySelectorAll("[data-ad-slot]").forEach((s) => (s.hidden = true));
  });

  window.IMMA_ADS = { fillAll, houseAd };
})();
