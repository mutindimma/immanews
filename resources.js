// Kenya at Your Fingertips — Citizen Resource Centre (hub page + guide page).
// Reads published content from Supabase; if that fails, falls back to /resources/data.json
// so emergency numbers and guides are always available. No sign-in needed.
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  const fmt = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const kes = (n) => "KSh " + Number(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const telHref = (n) => "tel:" + String(n).replace(/[^\d+]/g, "");

  const COUNTIES = ["Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho",
    "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", "Meru",
    "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta",
    "Tana River", "Tharaka-Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot"];

  const ICONS = {
    landmark: '<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-6 10 6"/>',
    health: '<path d="M12 21s-7-4.5-9-9.5C1.6 7.6 4.3 4 8 4c1.9 0 3.2 1 4 2.3C12.8 5 14.1 4 16 4c3.7 0 6.4 3.6 5 7.5-2 5-9 9.5-9 9.5z"/><path d="M12 9v6M9 12h6"/>',
    bus: '<rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16M8 21v-4M16 21v-4M7.5 14h.01M16.5 14h.01"/>',
    school: '<path d="M22 9L12 4 2 9l10 5 10-5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    scale: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7zM19 7l-3 7a3 3 0 0 0 6 0l-3-7z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    vote: '<path d="M4 13h16v8H4zM8 13V5h8v8M10 9l1.5 1.5L14 8"/>',
    cloud: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8H7z"/>',
    coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7M9 15v2c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    leaf: '<path d="M5 21c0-9 6-15 16-16-1 10-7 16-16 16zM5 21l8-8"/>'
  };
  const icon = (n, size) => `<svg viewBox="0 0 24 24" width="${size || 24}" height="${size || 24}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.landmark}</svg>`;
  const BADGE = { verified: ["ok", "Verified"], partially_verified: ["part", "Partly verified"], unverified: ["warn", "Not yet verified"], needs_review: ["warn", "Due for re-check"] };
  const badge = (r) => { const b = BADGE[isStale(r) ? "needs_review" : r.verification_status] || BADGE.unverified; return `<span class="vbadge ${b[0]}">${b[1]}</span>`; };
  const isStale = (r) => r.verification_status === "needs_review" || (r.next_review && r.next_review < today);

  // ---------- Data ----------
  async function loadData() {
    const cfg = typeof SUPABASE !== "undefined" ? SUPABASE : {};
    const client = window.IMMA_AUTH && window.IMMA_AUTH.client;
    if (client) {
      try {
        const q = await Promise.all([
          client.from("resource_categories").select("*").order("sort_order"),
          client.from("public_resources").select("*").eq("status", "published").order("sort_order"),
          client.from("emergency_contacts").select("*").eq("status", "published").order("sort_order"),
          client.from("fuel_prices").select("*").eq("status", "published").order("cycle_start", { ascending: false }),
          client.from("education_calendar").select("*").eq("status", "published").order("start_date"),
          client.from("scholarships").select("*").eq("status", "published").order("name"),
          client.from("public_notices").select("*").eq("status", "published").order("starts_at", { ascending: false }).limit(50),
          client.from("health_facilities").select("*").eq("status", "published").order("name").limit(2000)
        ]);
        if (q.every((r) => !r.error) && q[1].data.length) {
          const [c, r, e, f, cal, s, n, h] = q.map((x) => x.data);
          return { categories: c, resources: r, emergency: e, fuel: f, calendar: cal, scholarships: s, notices: n, facilities: h, live: true };
        }
      } catch (err) { /* fall back */ }
    }
    const res = await fetch("/resources/data.json", { cache: "no-cache" });
    const d = await res.json();
    return { ...d, facilities: [], live: false };
  }

  // ---------- Shared bits ----------
  function emergencyHtml(list, mini) {
    return list.map((e) => `<a class="${mini ? "em-mini-btn" : "em-btn"}" href="${telHref(e.number)}" aria-label="Call ${esc(e.name)} on ${esc(e.number)}">
      <b>${esc(e.number)}</b><span>${esc(e.name)}</span>${mini ? "" : `<small>${esc(e.available || "")}</small>`}</a>`).join("");
  }
  function setAd(el, slot, adCategory) {
    if (!el) return;
    el.removeAttribute("data-ad-wait");
    el.dataset.adSlot = slot;
    if (adCategory) el.dataset.adCategory = adCategory; else delete el.dataset.adCategory;
    el.dataset.adFilled = "";
    if (!el.querySelector(".ad-frame")) el.innerHTML = '<span class="ad-label">&nbsp;</span><div class="ad-frame"></div>';
    if (window.IMMA_ADS) window.IMMA_ADS.fillAll();
  }

  // ======================= HUB =======================
  async function hub() {
    let D;
    try { D = await loadData(); } catch (e) { $("#rc-grid").innerHTML = `<p class="notice bad">Resources could not be loaded. Please refresh the page.</p>`; return; }
    const cats = D.categories.filter((c) => c.is_active);
    const catBy = (s) => D.categories.find((c) => c.slug === s) || {};
    let active = params.get("c") && cats.some((c) => c.slug === params.get("c")) ? params.get("c") : "";
    let county = "";
    $("#rc-q").value = params.get("q") || "";

    // Emergency panel
    $("#em-grid").innerHTML = emergencyHtml(D.emergency);
    const lv = D.emergency.map((e) => e.last_verified).filter(Boolean).sort().pop();
    $("#em-checked").textContent = lv ? `Numbers last checked against official sources on ${fmt(lv)}.` : "";

    // Category cards + chips
    $("#rc-cats").innerHTML = cats.map((c) => `<a class="rc-cat" href="?c=${c.slug}" data-cat="${c.slug}">
        <span class="rc-cat-ico">${icon(c.icon, 26)}</span><b>${esc(c.name)}</b><small>${esc(c.description || "")}</small>
        <span class="rc-cat-n">${D.resources.filter((r) => r.category_slug === c.slug).length} guides</span></a>`).join("");
    $("#rc-chips").innerHTML = [{ slug: "", name: "All" }, ...cats].map((c) => `<button type="button" class="chip" data-cat="${c.slug}" role="tab">${esc(c.name)}</button>`).join("");
    $("#rc-county").innerHTML += COUNTIES.map((c) => `<option>${esc(c)}</option>`).join("");
    const soon = D.categories.filter((c) => !c.is_active);
    $("#rc-more").innerHTML = soon.length ? `<b>Coming soon:</b> ${soon.map((c) => `<span>${icon(c.icon, 16)} ${esc(c.name)}</span>`).join(" ")}` : "";

    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-cat]");
      if (!a || !a.closest("#rc-cats, #rc-chips")) return;
      e.preventDefault();
      active = a.dataset.cat;
      history.replaceState(null, "", active ? "?c=" + active : location.pathname);
      render();
      $("#rc-filters").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#rc-county").addEventListener("change", (e) => { county = e.target.value; render(); });
    $("#rc-search").addEventListener("submit", (e) => { e.preventDefault(); render(); $("#rc-list-title").scrollIntoView({ behavior: "smooth" }); });
    $("#rc-q").addEventListener("input", () => render());

    function matches(r, q) {
      if (!q) return true;
      const hay = [r.title, r.summary, (r.tags || []).join(" "), r.source_name, JSON.stringify(r.content || {})].join(" ").toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    }

    function render() {
      const q = $("#rc-q").value.trim().toLowerCase();
      const c = catBy(active);
      document.querySelectorAll("#rc-chips .chip").forEach((b) => { b.classList.toggle("on", b.dataset.cat === active); b.setAttribute("aria-selected", b.dataset.cat === active); });
      document.querySelectorAll(".rc-cat").forEach((b) => b.classList.toggle("on", b.dataset.cat === active));
      $("#rc-title").textContent = active ? c.name : "Kenya at Your Fingertips";
      $("#rc-sub").textContent = active ? c.description : "Essential information, government services and practical resources for everyday life in Kenya.";
      document.title = (active ? c.name + " · " : "") + "Kenya at Your Fingertips · IMMA News";

      const list = D.resources.filter((r) => (!active || r.category_slug === active) && (!county || !r.county || r.county === county) && matches(r, q));
      if (q) {
        const score = (r) => q.split(/\s+/).reduce((n, w) => n + (r.title.toLowerCase().includes(w) ? 10 : 0) + ((r.tags || []).some((t) => t.includes(w)) ? 5 : 0) + (r.summary.toLowerCase().includes(w) ? 2 : 0), 0);
        list.sort((a, b) => score(b) - score(a));
      }
      $("#rc-list-title").textContent = q ? `Results for “${$("#rc-q").value.trim()}”` : active ? `${c.name} guides` : "All resources";
      $("#rc-grid").innerHTML = list.length ? list.map((r) => {
        const cc = catBy(r.category_slug);
        return `<a class="rc-card" href="resource.html?r=${encodeURIComponent(r.slug)}">
          <span class="rc-card-ico">${icon(cc.icon, 22)}</span>
          <span class="rc-card-body"><span class="rc-card-cat">${esc(cc.name || "")}${r.county ? " · " + esc(r.county) : ""}</span>
          <b>${esc(r.title)}</b><span class="rc-card-sum">${esc(r.summary)}</span>
          <span class="rc-card-meta">${badge(r)} <span>Checked ${esc(fmt(r.last_verified))}</span></span></span></a>`;
      }).join("") : `<p class="empty-state">No guides match. Try another word, or <a href="contact.html?type=general">ask us to add it</a>.</p>`;

      // Category-relevant advert (clearly labelled; never affects which resources appear or their order)
      const ad = $("#rc-ad");
      if (active && c.ad_category) { ad.hidden = false; if (ad.dataset.adCategory !== c.ad_category) setAd(ad, "category_banner", c.ad_category); }
      else { ad.hidden = true; }

      tools(active);
      notices();
    }

    function notices() {
      const list = (D.notices || []).filter((n) => (!n.ends_at || n.ends_at >= today) && (!active || n.category_slug === active) && (!county || !n.county || n.county === county));
      $("#rc-notices").innerHTML = list.length ? list.slice(0, 8).map((n) => `<li>
        <b>${esc(n.title)}</b><span>${esc(n.summary)}</span>
        <small>${n.county ? esc(n.county) + " · " : ""}${n.starts_at ? esc(fmt(n.starts_at)) : ""}${n.ends_at && n.ends_at !== n.starts_at ? " – " + esc(fmt(n.ends_at)) : ""} · <a href="${esc(n.source_url)}" target="_blank" rel="noopener">${esc(n.source_name)}</a></small></li>`).join("")
        : `<li class="muted">No current notices${active ? " in this category" : ""}.</li>`;
    }

    // ---------- Category tools ----------
    function tools(cat) {
      const box = $("#rc-tools");
      if (cat === "transport") box.innerHTML = fuelTool();
      else if (cat === "education") box.innerHTML = calendarTool() + scholarshipTool();
      else if (cat === "health-safety") box.innerHTML = facilityTool();
      else box.innerHTML = "";
      if (cat === "transport") bindFuel();
      if (cat === "education") bindEdu();
      if (cat === "health-safety") bindFacilities();
    }

    function fuelTool() {
      const cycles = [...new Set(D.fuel.map((f) => f.cycle_start))].sort().reverse();
      if (!cycles.length) return "";
      const cur = cycles[0], prev = cycles[1];
      const rows = D.fuel.filter((f) => f.cycle_start === cur);
      const p = (town) => D.fuel.find((f) => f.cycle_start === prev && f.town === town);
      const diff = (a, b) => { if (b == null) return ""; const d = Number(a) - Number(b); return d === 0 ? `<span class="ch same">no change</span>` : `<span class="ch ${d > 0 ? "up" : "down"}">${d > 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(2)}</span>`; };
      const r0 = rows[0];
      return `<section class="tool card-tool" id="fuel">
        <div class="tool-head"><h2>⛽ Fuel price tracker</h2><span class="vbadge ok">Official EPRA prices</span></div>
        <p class="muted small">Maximum pump prices per litre for <b>${esc(fmt(cur))} – ${esc(fmt(r0.cycle_end))}</b>. Change compared with the previous cycle.</p>
        <div class="table-wrap"><table class="rc-table"><thead><tr><th>Town</th><th>Super petrol</th><th>Diesel</th><th>Kerosene</th></tr></thead><tbody>
          ${rows.map((f) => { const o = p(f.town); return `<tr><td><b>${esc(f.town)}</b></td><td>${kes(f.petrol)} ${o ? diff(f.petrol, o.petrol) : ""}</td><td>${kes(f.diesel)} ${o ? diff(f.diesel, o.diesel) : ""}</td><td>${kes(f.kerosene)} ${o ? diff(f.kerosene, o.kerosene) : ""}</td></tr>`; }).join("")}
        </tbody></table></div>
        <p class="small">Source: <a href="${esc(r0.source_url)}" target="_blank" rel="noopener">Energy and Petroleum Regulatory Authority</a> · Other towns: <a href="https://www.epra.go.ke/pump-prices" target="_blank" rel="noopener">EPRA full price list</a>. Prices are reviewed on the 14th of each month.</p>
      </section>`;
    }
    function bindFuel() {}

    function calendarTool() {
      if (!D.calendar.length) return "";
      return `<section class="tool" id="calendar">
        <div class="tool-head"><h2>📅 Education calendar</h2>
          <div class="tabs" id="cal-tabs"><button class="on" data-l="">All</button><button data-l="primary">Primary &amp; junior</button><button data-l="senior">Senior</button><button data-l="exam">Exams &amp; results</button></div></div>
        <ol class="timeline" id="cal-list"></ol>
        <p class="small muted">Term dates as reported from the Ministry of Education's 2027 calendar circular. Results dates are targets announced by the Cabinet Secretary. Confirm with your school.</p>
      </section>`;
    }
    function scholarshipTool() {
      if (!D.scholarships.length) return "";
      const countries = [...new Set(D.scholarships.map((s) => s.country))].sort();
      return `<section class="tool" id="scholarships">
        <div class="tool-head"><h2>🎓 Scholarship directory</h2></div>
        <div class="toolbar"><input type="search" id="sch-q" placeholder="Search scholarships" aria-label="Search scholarships">
          <select id="sch-status" aria-label="Status"><option value="">Any status</option><option value="open">Open</option><option value="upcoming">Opening later</option><option value="check">Varies — check site</option><option value="closed">Closed</option></select>
          <select id="sch-country" aria-label="Country"><option value="">Any country</option>${countries.map((c) => `<option>${esc(c)}</option>`).join("")}</select></div>
        <div class="sch-grid" id="sch-list"></div>
        <p class="small muted">Never pay anyone who promises to "guarantee" a scholarship. Always apply on the official website.</p>
      </section>`;
    }
    function bindEdu() {
      const list = $("#cal-list");
      if (list) {
        const draw = (l) => {
          const ev = D.calendar.filter((e) => !l || (l === "exam" ? ["exam", "results"].includes(e.event_type) : e.level === l || e.level === "all"));
          list.innerHTML = ev.map((e) => `<li class="ev ${esc(e.event_type)}${(e.end_date || e.start_date) < today ? " past" : ""}">
            <span class="ev-date">${esc(fmt(e.start_date))}${e.end_date && e.end_date !== e.start_date ? " – " + esc(fmt(e.end_date)) : ""}</span>
            <b>${esc(e.title)}</b>${e.notes ? `<small>${esc(e.notes)}</small>` : ""}</li>`).join("");
        };
        draw("");
        $("#cal-tabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; $("#cal-tabs").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b)); draw(b.dataset.l); });
      }
      const sl = $("#sch-list");
      if (sl) {
        const ST = { open: ["ok", "Open"], upcoming: ["part", "Opening later"], check: ["info", "Varies — check site"], closed: ["warn", "Closed"] };
        const draw = () => {
          const q = $("#sch-q").value.trim().toLowerCase(), st = $("#sch-status").value, co = $("#sch-country").value;
          const rows = D.scholarships.filter((s) => {
            const status = s.deadline && s.deadline < today && s.open_status !== "check" ? "closed" : s.open_status;
            return (!st || status === st) && (!co || s.country === co) && (!q || (s.name + s.institution + s.country + s.eligibility + (s.level || "")).toLowerCase().includes(q));
          });
          sl.innerHTML = rows.map((s) => {
            const status = s.deadline && s.deadline < today && s.open_status !== "check" ? "closed" : s.open_status;
            const b = ST[status] || ST.check;
            return `<article class="sch">
              <div class="sch-top"><span class="vbadge ${b[0]}">${b[1]}</span><span class="muted small">${esc(s.country)}</span></div>
              <h3>${esc(s.name)}</h3><p class="small muted">${esc(s.institution)}${s.level ? " · " + esc(s.level) : ""}</p>
              <dl><dt>Who can apply</dt><dd>${esc(s.eligibility)}</dd>${s.coverage ? `<dt>Covers</dt><dd>${esc(s.coverage)}</dd>` : ""}
                <dt>Deadline</dt><dd>${s.deadline ? esc(fmt(s.deadline)) : "Not announced"}</dd>${s.notes ? `<dt>Note</dt><dd>${esc(s.notes)}</dd>` : ""}</dl>
              <div class="sch-foot"><a class="btn-outline btn-sm" href="${esc(s.url)}" target="_blank" rel="noopener">Official website</a><small class="muted">Checked ${esc(fmt(s.last_verified))}</small></div>
            </article>`;
          }).join("") || `<p class="empty-state">No scholarships match.</p>`;
        };
        ["#sch-q", "#sch-status", "#sch-country"].forEach((s) => $(s).addEventListener("input", draw));
        draw();
      }
    }

    function facilityTool() {
      return `<section class="tool" id="facilities">
        <div class="tool-head"><h2>🏥 Health facility directory</h2></div>
        <div class="toolbar"><input type="search" id="hf-q" placeholder="Facility name" aria-label="Facility name">
          <select id="hf-county" aria-label="County"><option value="">All counties</option>${COUNTIES.map((c) => `<option>${esc(c)}</option>`).join("")}</select></div>
        <div id="hf-list"></div>
        <p class="small muted">We list only facilities whose details we have verified. For every registered facility in all 47 counties, use the official
          <a href="https://nhfr.dha.go.ke/facilities" target="_blank" rel="noopener">Kenya National Health Facility Registry</a>, and check licences on the
          <a href="https://registers.kmpdc.go.ke/healthFacilities/getLicensedPrivateHealthFacilities/" target="_blank" rel="noopener">KMPDC register</a>.</p>
      </section>`;
    }
    function bindFacilities() {
      const draw = () => {
        const q = $("#hf-q").value.trim().toLowerCase(), c = $("#hf-county").value || county;
        const rows = (D.facilities || []).filter((f) => (!c || f.county === c) && (!q || f.name.toLowerCase().includes(q)));
        $("#hf-list").innerHTML = rows.length ? `<div class="table-wrap"><table class="rc-table"><thead><tr><th>Facility</th><th>County</th><th>Type / level</th><th>Registry code</th></tr></thead><tbody>
          ${rows.slice(0, 200).map((f) => `<tr><td><b>${esc(f.name)}</b>${f.phone ? `<br><a href="${telHref(f.phone)}">${esc(f.phone)}</a>` : ""}</td><td>${esc(f.county)}${f.sub_county ? ", " + esc(f.sub_county) : ""}</td><td>${esc(f.facility_type || "")} ${esc(f.level || "")}</td><td>${esc(f.registry_code || "—")}</td></tr>`).join("")}
          </tbody></table></div>` : `<p class="empty-state">No verified facilities listed here yet${c ? " for " + esc(c) : ""}. Use the official registry linked below.</p>`;
      };
      $("#hf-q").addEventListener("input", draw);
      $("#hf-county").addEventListener("change", draw);
      draw();
    }

    render();
  }

  // ======================= GUIDE =======================
  async function guide() {
    let D;
    const slug = params.get("r");
    try { D = await loadData(); } catch (e) { $("#guide").innerHTML = `<p class="notice bad">This guide could not be loaded. Please refresh.</p>`; return; }
    $("#em-mini").innerHTML = emergencyHtml(D.emergency.slice(0, 6), true);
    const r = D.resources.find((x) => x.slug === slug);
    if (!r) { $("#guide").innerHTML = `<h1>Guide not found</h1><p>This guide may have moved. <a href="resources.html"><u>See all resources</u></a>.</p>`; return; }
    const cat = D.categories.find((c) => c.slug === r.category_slug) || {};
    const c = r.content || {};
    document.title = r.title + " · Kenya at Your Fingertips · IMMA News";
    const md = document.querySelector('meta[name="description"]'); if (md) md.content = r.summary;
    $("#crumbs").innerHTML = `<a href="resources.html">Kenya at Your Fingertips</a> <span>›</span> <a href="resources.html?c=${esc(cat.slug)}">${esc(cat.name || "")}</a>`;
    const stale = isStale(r);
    const sec = (title, html) => html ? `<section class="g-sec"><h2>${title}</h2>${html}</section>` : "";
    const ul = (a) => a && a.length ? `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    const ol = (a) => a && a.length ? `<ol class="g-steps">${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>` : "";
    const ext = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;
    $("#guide").innerHTML = `
      <p class="rc-card-cat">${icon(cat.icon, 16)} ${esc(cat.name || "")}${r.county ? " · " + esc(r.county) : " · National"}</p>
      <h1>${esc(r.title)}</h1>
      <div class="g-meta">${badge(r)} <span>Last checked <b>${esc(fmt(r.last_verified))}</b></span>${r.next_review ? `<span>Next review ${esc(fmt(r.next_review))}</span>` : ""}</div>
      ${stale ? `<div class="notice warn">This guide is due for a re-check, so some details may have changed. Confirm with the official source below.</div>` : ""}
      <p class="g-lead">${esc(r.summary)}</p>
      ${c.caution ? `<div class="notice warn"><b>Please note:</b> ${esc(c.caution)}</div>` : ""}
      ${sec("Who can apply", c.eligibility ? `<p>${esc(c.eligibility)}</p>` : "")}
      ${sec("What you need", ul(c.documents))}
      ${sec("Step by step", ol(c.steps))}
      ${sec("Fees", c.fees ? `<p>${esc(c.fees)}</p>` : "")}
      ${sec("Processing time and hours", c.processing ? `<p>${esc(c.processing)}</p>` : "")}
      ${sec("Tips", ul(c.tips))}
      ${c.contacts && c.contacts.length ? sec("Official contacts", `<ul class="g-contacts">${c.contacts.map((k) => `<li><span>${esc(k.label)}</span> ${k.href ? `<a href="${esc(k.href)}"${/^https?:/.test(k.href) ? ' target="_blank" rel="noopener"' : ""}>${esc(k.value)}</a>` : esc(k.value)}</li>`).join("")}</ul>`) : ""}
      ${r.apply_url ? `<p class="g-apply"><a class="btn-gold" href="${esc(r.apply_url)}" target="_blank" rel="noopener">${esc(r.apply_label || "Go to the official site")} ↗</a></p>` : ""}
      <section class="g-sec g-sources"><h2>Sources</h2><ul>
        <li>${ext(r.source_url, r.source_name)}</li>${(c.sources || []).map((s) => `<li>${ext(s.url, s.name)}</li>`).join("")}</ul>
        <p class="small muted">Written by IMMA News in our own words from the official sources above. Fees, requirements and deadlines can change at any time.</p></section>`;
    const rel = D.resources.filter((x) => x.category_slug === r.category_slug && x.slug !== r.slug).slice(0, 6);
    $("#related").innerHTML = rel.map((x) => `<li><a href="resource.html?r=${encodeURIComponent(x.slug)}">${esc(x.title)}</a></li>`).join("") + `<li><a href="resources.html?c=${esc(cat.slug)}"><b>All ${esc(cat.name || "")} guides →</b></a></li>`;
    setAd($("#guide-ad"), "sidebar", cat.ad_category);
  }

  if (page === "hub") hub();
  if (page === "guide") guide();
})();
