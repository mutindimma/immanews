// IMMA News homepage behaviour. The stories themselves are already in the page
// (written by tools/build_articles.js), so this script only:
//   * applies the administrators' homepage settings (lead story, featured stories,
//     section order and visibility, labels, breaking news, advert density);
//   * shows search results (?q=), and forwards old links (?c=, ?story=);
//   * fills "Most read" from recorded readership (hidden until there is enough data);
//   * handles the homepage newsletter form and the sponsored-content reader.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cfg = typeof SUPABASE !== "undefined" ? SUPABASE : null;
  const dataEl = $("#home-data");
  const DATA = dataEl ? JSON.parse(dataEl.textContent) : { stories: [], series: [], resources: [] };
  const params = new URLSearchParams(location.search);
  const rest = (path) => fetch(`${cfg.url}/rest/v1/${path}`, { headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey } }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  const rpc = (fn, body) => fetch(`${cfg.url}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey, "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

  // ---------- Old links ----------
  const storyParam = params.get("story");
  if (storyParam) {
    const s = DATA.stories.find((x) => x.key === storyParam);
    if (s) { location.replace(s.url); return; }
  }
  const c = params.get("c");
  if (c && window.IMMA_URL) {
    const hub = c === "History & Heritage" ? "/history/before-they-became-famous/" : `/news/${window.IMMA_URL.section(c)}/`;
    location.replace(hub); return;
  }

  const count = $("#edition-count");
  if (count) count.textContent = `${DATA.stories.length} ${DATA.stories.length === 1 ? "story" : "stories"}`;

  // ---------- Search ----------
  const q = (params.get("q") || "").trim();
  if (q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = DATA.stories.concat(DATA.series.map((s) => Object.assign({ category: "History & Heritage" }, s)))
      .filter((s) => words.every((w) => (s.title + " " + s.summary + " " + s.category).toLowerCase().includes(w)))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const box = $("#search-results");
    box.innerHTML = `<div class="results-head"><h1>${hits.length} result${hits.length === 1 ? "" : "s"} for “${esc(q)}”</h1><a class="btn btn-ghost" href="/">Back to today's edition</a></div>
      ${hits.length ? `<ol class="river">${hits.map((s) => `<li><time datetime="${esc(s.date)}">${esc(new Date(s.date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))}</time>
        <div><p class="kicker">${esc(s.category)}</p><h3><a href="${esc(s.url)}">${esc(s.title)}</a></h3><p>${esc(s.summary)}</p></div>
        <a href="${esc(s.url)}" tabindex="-1" aria-hidden="true"><img src="${esc(s.thumb || s.image || "/images/placeholder.svg")}" alt="" width="132" height="88" loading="lazy"></a></li>`).join("")}</ol>`
        : `<p class="empty">No stories match your search. Try other words, or browse the <a href="/news/">latest news</a>.</p>`}`;
    box.hidden = false;
    $("#home").hidden = true;
    document.title = `Search: ${q} · IMMA News`;
    const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex, follow"; document.head.appendChild(m);
  }

  // ---------- Administrator settings ----------
  const CACHE = "imma_home_v1";
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE) || "null"); } catch (e) {}
  const differs = (s) => !!(s && (s.lead || (s.featured && s.featured.length) || (s.order && s.order.length) || (s.hidden && s.hidden.length) || (s.labels && Object.keys(s.labels).length)));

  function applyAds(s) {
    const density = (s && s.adDensity) || "standard";
    const off = density === "minimal" ? ['[data-ad-slot="top_leaderboard"]', '[data-ad-slot="sidebar"]', '[data-ad-slot="sidebar_large"]', '[data-ad-slot="home_premium"]']
      : density === "light" ? ['[data-ad-slot="sidebar_large"]', '[data-ad-slot="home_premium"]', '[data-ad-slot="sidebar"]'] : [];
    off.forEach((sel) => document.querySelectorAll(sel).forEach((el) => { (el.closest(".ad-band") || el).remove(); }));
  }
  function applyBreaking(s) {
    const b = s && s.breaking, bar = $("#breaking");
    if (!bar) return;
    if (b && b.text && (!b.until || new Date(b.until) > new Date())) {
      const safe = b.url && /^(https:\/\/|\/)/.test(b.url) ? b.url : null;
      bar.innerHTML = `<div class="wrap"><b>Breaking</b><span>${safe ? `<a href="${esc(safe)}">${esc(b.text)}</a>` : esc(b.text)}</span></div>`;
      bar.hidden = false;
    } else { bar.hidden = true; bar.innerHTML = ""; }
  }
  function applyLayout(s) {
    if (!differs(s) || !window.IMMA_HOME || q) return;
    const out = window.IMMA_HOME.render(DATA, s);
    const home = $("#home");
    const keep = home.querySelector("#home-data");
    home.innerHTML = out.main;
    if (keep) home.appendChild(keep);
    wire();
  }
  function apply(s) { applyAds(s); applyBreaking(s); applyLayout(s); }
  if (cached) apply(cached.value);
  if (cfg && cfg.url) {
    rest("site_settings?key=eq.homepage&select=value,updated_at").then((rows) => {
      const v = (rows[0] && rows[0].value) || {};
      const before = cached && cached.value;
      try { localStorage.setItem(CACHE, JSON.stringify({ value: v, at: Date.now() })); } catch (e) {}
      if (JSON.stringify(v) === JSON.stringify(before)) return;
      applyAds(v); applyBreaking(v);
      if (differs(v)) applyLayout(v);
      else if (differs(before)) location.reload();   // settings were cleared: show the built page
    }).catch(() => {});
  }

  // ---------- Things inside the edition that need wiring (also after a re-render) ----------
  function wire() {
    const days = window.IMMA_HEADER ? window.IMMA_HEADER.daysToElection() : null;
    if (days != null) {
      document.querySelectorAll(".countdown [data-election-days]").forEach((el) => (el.textContent = days > 0 ? days.toLocaleString("en-KE") : days === 0 ? "Today" : "✓"));
      document.querySelectorAll(".countdown [data-election-label]").forEach((el) => (el.textContent = days > 1 ? "days to go" : days === 1 ? "day to go" : days === 0 ? "Election Day" : "Kenya has voted"));
    }
    const form = $("[data-home-newsletter]");
    if (form && !form.dataset.wired) {
      form.dataset.wired = "1";
      form.addEventListener("submit", (e) => { e.preventDefault(); if (window.IMMA_NEWSLETTER && window.IMMA_NEWSLETTER.subscribe) window.IMMA_NEWSLETTER.subscribe(form); });
    }
    trending();
  }

  // ---------- Most read (real recorded visits only) ----------
  let trendData = null;
  async function trending() {
    const box = $("[data-trending]");
    if (!box || !cfg || !cfg.url) return;
    try {
      if (!trendData) trendData = await rpc("trending_stories", { p_days: 7, p_limit: 8 });
      const all = DATA.stories.concat(DATA.series);
      const list = (trendData || []).map((r) => all.find((s) => s.key === r.story_key)).filter(Boolean).slice(0, 6);
      if (list.length < 3) return;   // not enough real data yet
      box.querySelector("ol").innerHTML = list.map((s) => `<li><a href="${esc(s.url)}">${esc(s.title)}</a></li>`).join("");
      box.hidden = false;
    } catch (e) { /* the module simply stays hidden */ }
  }

  // ---------- Pop-up reader (sponsored content from ads.js) ----------
  const reader = $("#reader");
  if (reader) {
    reader.querySelector(".close").addEventListener("click", () => reader.close());
    reader.addEventListener("click", (e) => { if (e.target === reader) reader.close(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
