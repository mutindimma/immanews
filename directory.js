// IMMA Business Directory — landing page and search (/business-directory/)
(() => {
  const D = window.IMMA_DIR, A = window.IMMA_AUTH;
  const { esc } = D;
  const $ = (s) => document.querySelector(s);
  const db = A && A.client;
  const params = new URLSearchParams(location.search);
  const COLS = "id,slug,name,tagline,description,category_id,category_slug,category_name,subcategory_ids,logo_path,cover_path,verified,rating_avg,rating_count,created_at,published_at,package,sponsored,featured,featured_home,premium_design,county,town,neighbourhood,latitude,longitude,hours,has_offer,is_online,has_premises,delivery,price_range";
  let CATS = [], userPos = null;

  // Counties and categories in the search form
  $("#bd-county").insertAdjacentHTML("beforeend", D.COUNTIES.slice().sort((a, b) => a[1].localeCompare(b[1])).map(([s, n]) => `<option value="${s}">${esc(n)}</option>`).join(""));
  $("#bd-counties").innerHTML = D.COUNTIES.slice().sort((a, b) => a[1].localeCompare(b[1])).map(([s, n]) => `<a href="/business-directory/?county=${s}">${esc(n)}</a>`).join("");
  document.querySelectorAll("#bd-counties a").forEach((a) => { a.style.cssText = "padding:6px 12px;border-radius:99px;border:1px solid var(--line);text-decoration:none;color:var(--text);font-size:.9rem"; });

  if (!db) { $("#bd-packages").innerHTML = '<p class="bd-muted">The directory is not available right now.</p>'; return; }

  const session = (() => { try { let s = sessionStorage.getItem("imma_bd_s"); if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("imma_bd_s", s); } return s; } catch (e) { return null; } })();
  const measure = () => { try { return (JSON.parse(localStorage.getItem("imma_prefs_v1")) || {}).adMeasure !== false; } catch (e) { return true; } };
  const track = (id, ev) => { if (measure()) db.rpc("biz_track", { p_business: id, p_event: ev, p_session: session, p_source: "directory" }).then(() => {}, () => {}); };

  // Whole card is clickable; the headline is the real link
  document.addEventListener("click", (e) => {
    const c = e.target.closest(".bd-card");
    if (!c || e.target.closest("a, button")) return;
    const a = c.querySelector("h3 a"); if (a) location.href = a.href;
  });

  async function loadCategories() {
    const { data } = await db.from("business_categories").select("id,slug,name,icon,parent_id,sort_order").eq("active", true).order("sort_order");
    CATS = data || [];
    const top = CATS.filter((c) => !c.parent_id);
    $("#bd-cat").insertAdjacentHTML("beforeend", top.map((c) => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join(""));
    const { data: counts } = await db.from("dir_businesses").select("category_slug");
    const n = {}; (counts || []).forEach((r) => { n[r.category_slug] = (n[r.category_slug] || 0) + 1; });
    $("#bd-cats").innerHTML = top.map((c) => `<a class="bd-cat" href="/business-directory/?cat=${esc(c.slug)}"><span class="bd-cat-icon" aria-hidden="true">${esc(c.icon || "•")}</span><span><b>${esc(c.name)}</b><small>${n[c.slug] ? n[c.slug] + " listed" : "Be the first"}</small></span></a>`).join("");
  }

  async function loadPackages(billing) {
    const { data } = await db.from("business_packages").select("*").eq("active", true).order("sort_order");
    if (!data) return;
    $("#bd-packages").innerHTML = data.map((p) => {
      const annual = Math.round(p.price_monthly_kes * 12 * (1 - p.annual_discount_pct / 100));
      const price = p.price_monthly_kes <= 0 ? "KSh 0" : billing === "annual" ? D.kes(annual) + " <small>/ year</small>" : D.kes(p.price_monthly_kes) + " <small>/ month</small>";
      return `<div class="bd-pack${p.highlight ? " hl" : ""}">${p.highlight ? '<span class="bd-pop">Most popular</span>' : ""}
        <h3>${esc(p.name)}</h3><p class="bd-amount">${price}</p>
        ${billing === "annual" && p.annual_discount_pct > 0 && p.price_monthly_kes > 0 ? `<p class="bd-fine">Save ${Number(p.annual_discount_pct)}% with annual billing</p>` : ""}
        <ul>${(p.benefits || []).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
        <a class="bd-btn${p.highlight ? " bd-btn-gold" : " bd-btn-ghost"}" href="/business-directory/register.html?package=${esc(p.slug)}&billing=${billing}">${p.price_monthly_kes <= 0 ? "Start free" : "Choose " + esc(p.name)}</a></div>`;
    }).join("");
  }
  document.querySelectorAll("[data-billing]").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("[data-billing]").forEach((x) => x.classList.toggle("on", x === b));
    loadPackages(b.dataset.billing);
  }));

  function fill(el, list, opts) {
    el.innerHTML = list.map((b) => D.card(b, opts)).join("");
  }

  async function loadLanding() {
    const [feat, recent, ver] = await Promise.all([
      db.from("dir_businesses").select(COLS).eq("featured_home", true).limit(12),
      db.from("dir_businesses").select(COLS).order("published_at", { ascending: false }).limit(8),
      db.from("dir_businesses").select(COLS).eq("verified", true).order("rating_avg", { ascending: false }).limit(8)
    ]);
    const f = (feat.data || []).sort(() => Math.random() - .5).slice(0, 6);   // fair rotation among paid featured listings
    if (f.length) { fill($("#bd-featured"), f, { featuredLabel: true }); $("#bd-featured-sec").hidden = false; f.forEach((b) => track(b.id, "search_impression")); }
    if ((recent.data || []).length) fill($("#bd-recent"), recent.data); else $("#bd-recent-empty").hidden = false;
    if ((ver.data || []).length) { fill($("#bd-verified"), ver.data); $("#bd-verified-sec").hidden = false; }
  }

  // ---------- Near me (location stays in the browser) ----------
  const km = (a, b) => {
    const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lng - a.lng) * r;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  function locate() {
    return new Promise((res, rej) => {
      if (userPos) return res(userPos);
      if (!navigator.geolocation) return rej(new Error("Your browser cannot share its location."));
      navigator.geolocation.getCurrentPosition((p) => { userPos = { lat: p.coords.latitude, lng: p.coords.longitude }; res(userPos); },
        () => rej(new Error("Location permission was not given. You can still search by county or town.")), { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
    });
  }
  $("#bd-near").addEventListener("click", async () => {
    $("#bd-near-sec").hidden = false;
    $("#bd-near-list").innerHTML = '<p class="bd-muted">Finding your location…</p>';
    $("#bd-near-sec").scrollIntoView({ behavior: "smooth" });
    try {
      const me = await locate();
      const { data } = await db.from("dir_businesses").select(COLS).not("latitude", "is", null).limit(500);
      const list = (data || []).map((b) => ({ b, d: km(me, { lat: +b.latitude, lng: +b.longitude }) })).filter((x) => x.d <= 30).sort((a, b) => a.d - b.d).slice(0, 12);
      $("#bd-near-list").innerHTML = list.length ? list.map((x) => D.card(x.b, { distance: x.d })).join("")
        : '<div class="bd-empty"><h3>No listed businesses within 30 km yet</h3><p>Only businesses that choose to publish their location appear here. Try searching by county or town.</p></div>';
    } catch (e) { $("#bd-near-list").innerHTML = `<div class="bd-empty"><p>${esc(e.message)}</p></div>`; }
  });

  // ---------- Search ----------
  const searching = ["q", "cat", "county", "town", "f", "sort"].some((k) => params.get(k));
  $("#bd-q").value = params.get("q") || "";
  $("#bd-town").value = params.get("town") || "";
  const flags = new Set((params.get("f") || "").split(",").filter(Boolean));
  document.querySelectorAll("[data-f]").forEach((el) => {
    if (el.type === "checkbox") el.checked = flags.has(el.dataset.f);
    else el.value = params.get(el.dataset.f) || "";
    el.addEventListener("change", () => { const u = new URL(location.href); writeFilters(u); history.replaceState(null, "", u); runSearch(); });
  });
  $("#bd-sort").value = params.get("sort") || "relevance";
  $("#bd-sort").addEventListener("change", () => { const u = new URL(location.href); u.searchParams.set("sort", $("#bd-sort").value); history.replaceState(null, "", u); runSearch(); });
  $("#bd-filter-toggle").addEventListener("click", (e) => { const f = $("#bd-filters"); f.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", f.classList.contains("open")); });
  function writeFilters(u) {
    const on = [...document.querySelectorAll('[data-f][type="checkbox"]')].filter((x) => x.checked).map((x) => x.dataset.f);
    on.length ? u.searchParams.set("f", on.join(",")) : u.searchParams.delete("f");
    ["rating", "price"].forEach((k) => { const v = document.querySelector(`[data-f="${k}"]`).value; v ? u.searchParams.set(k, v) : u.searchParams.delete(k); });
  }

  async function runSearch() {
    const p = new URLSearchParams(location.search);
    const q = (p.get("q") || "").trim().toLowerCase(), cat = p.get("cat"), county = p.get("county"), town = (p.get("town") || "").trim();
    const f = new Set((p.get("f") || "").split(",").filter(Boolean));
    let query = db.from("dir_businesses").select(COLS).limit(300);
    if (cat) {
      const c = CATS.find((x) => x.slug === cat);
      if (c && c.parent_id) query = query.contains("subcategory_ids", [c.id]);
      else query = query.eq("category_slug", cat);
    }
    if (county) query = query.eq("county", county);
    if (town) query = query.ilike("town", `%${town.replace(/[%_,()]/g, " ")}%`);
    q.split(/\s+/).filter((w) => w.length > 1).slice(0, 6).forEach((w) => { query = query.ilike("search_text", `%${w.replace(/[%_,()]/g, "")}%`); });
    if (f.has("verified")) query = query.eq("verified", true);
    if (f.has("featured")) query = query.eq("featured", true);
    if (f.has("offer")) query = query.eq("has_offer", true);
    if (f.has("delivery")) query = query.eq("delivery", true);
    if (f.has("online")) query = query.eq("is_online", true);
    if (f.has("physical")) query = query.eq("has_premises", true);
    if (p.get("rating")) query = query.gte("rating_avg", Number(p.get("rating")));
    if (p.get("price")) query = query.eq("price_range", Number(p.get("price")));
    const { data, error } = await query;
    let list = error ? [] : data || [];
    if (f.has("open")) list = list.filter((b) => D.openNow(b.hours) === true);

    const sort = p.get("sort") || "relevance";
    let dist = {};
    if (sort === "distance") {
      try { const me = await locate(); list.forEach((b) => { if (b.latitude != null) dist[b.id] = km(me, { lat: +b.latitude, lng: +b.longitude }); }); }
      catch (e) { $("#bd-sort").value = "relevance"; }
    }
    const score = (b) => (q && b.name.toLowerCase().includes(q) ? 100 : 0) + (b.featured ? 10 : 0) + (b.verified ? 5 : 0) + Number(b.rating_avg || 0) + Math.min(b.rating_count || 0, 20) / 10;
    const by = {
      relevance: (a, b) => score(b) - score(a),
      rating: (a, b) => (b.rating_avg - a.rating_avg) || (b.rating_count - a.rating_count),
      recent: (a, b) => String(b.published_at).localeCompare(String(a.published_at)),
      distance: (a, b) => (dist[a.id] ?? 1e9) - (dist[b.id] ?? 1e9)
    }[$("#bd-sort").value] || ((a, b) => score(b) - score(a));
    list.sort(by);

    // Paid priority placement is shown separately and labelled; organic results are not re-ordered by payment
    const sponsored = sort === "relevance" ? list.filter((b) => b.sponsored).sort(() => Math.random() - .5).slice(0, 3) : [];
    const sp = $("#bd-sponsored");
    sp.hidden = !sponsored.length;
    sp.querySelector(".bd-grid").innerHTML = sponsored.map((b) => D.card(b, { sponsored: true })).join("");
    sponsored.forEach((b) => track(b.id, "search_impression"));
    $("#bd-list").innerHTML = list.map((b) => D.card(b, { distance: dist[b.id] })).join("");
    $("#bd-none").hidden = list.length > 0;

    const catName = cat ? (CATS.find((c) => c.slug === cat) || {}).name : "";
    const where = [town, county ? D.countyName(county) : ""].filter(Boolean).join(", ");
    $("#bd-results-title").textContent = `${list.length} ${list.length === 1 ? "business" : "businesses"}${catName ? " · " + catName : ""}${q ? ` for “${p.get("q")}”` : ""}${where ? " in " + where : ""}`;
    document.title = `${catName || (q ? p.get("q") : "Businesses")}${where ? " in " + where : ""} · IMMA Business Directory`;
  }

  (async () => {
    await loadCategories();
    loadPackages("monthly");
    $("#bd-cat").value = params.get("cat") || "";
    $("#bd-county").value = params.get("county") || "";
    if (searching) {
      $("#bd-results").hidden = false;
      $("#bd-landing").hidden = true;
      // search pages are for visitors; the landing pages built for Google are indexed instead
      const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex, follow"; document.head.appendChild(m);
      await runSearch();
      $("#bd-results").scrollIntoView({ block: "start" });
    } else {
      loadLanding();
    }
  })();
})();
