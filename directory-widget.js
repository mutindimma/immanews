// "Discover Local Businesses": shows IMMA Business Directory listings on the homepage and
// on related news stories. Markup: <section data-bd-widget data-cats="bakeries,restaurants"
// data-title="…" hidden></section>. Nothing is downloaded or shown until there are listings.
(() => {
  const boxes = [...document.querySelectorAll("[data-bd-widget]")];
  const cfg = typeof SUPABASE !== "undefined" ? SUPABASE : null;
  if (!boxes.length || !cfg || !cfg.url) return;
  const load = (tag, attrs) => new Promise((res, rej) => { const e = document.createElement(tag); Object.assign(e, attrs); e.onload = res; e.onerror = rej; document.head.appendChild(e); });
  const COLS = "id,slug,name,tagline,description,category_slug,category_name,logo_path,cover_path,verified,rating_avg,rating_count,sponsored,featured,featured_home,premium_design,county,town,neighbourhood,has_offer,is_online,delivery,hours,published_at";
  boxes.forEach(async (box) => {
    const cats = (box.dataset.cats || "").split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9-]+$/.test(s));
    let q = `select=${COLS}&limit=12`;
    if (cats.length) q += `&category_slug=in.(${cats.join(",")})`;
    if (box.dataset.home) q += "&order=featured_home.desc,published_at.desc";
    else q += "&order=featured.desc,rating_avg.desc";
    try {
      const r = await fetch(`${cfg.url}/rest/v1/dir_businesses?${q}`, { headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey } });
      if (!r.ok) return;
      let list = await r.json();
      if (!list.length) return;
      // paid (featured) listings first, rotated fairly; then others
      const paid = list.filter((b) => b.featured).sort(() => Math.random() - 0.5), rest = list.filter((b) => !b.featured);
      list = paid.concat(rest).slice(0, Number(box.dataset.limit || 4));
      if (!document.querySelector('link[href="/directory.css"]')) load("link", { rel: "stylesheet", href: "/directory.css" });
      if (!window.IMMA_DIR) await load("script", { src: "/directory-common.js" });
      const D = window.IMMA_DIR;
      box.innerHTML = `<div class="bd-widget"><div class="bd-widget-head"><h2>${D.esc(box.dataset.title || "Discover Local Businesses")}</h2><a href="/business-directory/${cats.length === 1 ? D.esc(cats[0]) + "/" : ""}">See all →</a></div>
        <div class="bd-grid">${list.map((b) => D.card(b, { sponsored: true, showOpen: false })).join("")}</div>
        <p class="bd-fine" style="margin:10px 0 0">From the <a href="/business-directory/">IMMA Business Directory</a>. Listings marked Sponsored are paid placements; IMMA News does not endorse businesses. <a href="/business-directory/register.html">List your business</a></p></div>`;
      box.hidden = false;
      box.addEventListener("click", (e) => { const c = e.target.closest(".bd-card"); if (c && !e.target.closest("a")) { const a = c.querySelector("h3 a"); if (a) location.href = a.href; } });
    } catch (e) { /* the widget is optional */ }
  });
})();
