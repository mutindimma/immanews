// Useful Information admin — add, edit, approve, archive and re-verify everything in the
// Kenya Citizen Resource Centre. Access is enforced by Supabase (admins only).
(() => {
  const A = window.IMMA_AUTH, U = window.ADS_UI, { esc } = U;
  const $ = (s) => document.querySelector(s);
  const panel = $("#panel"), dlg = $("#dlg");
  if (!A || !A.configured) { $("#loading").textContent = "Supabase is not configured."; return; }
  const db = A.client;
  const today = U.today();
  const toast = (m, k) => { const d = document.createElement("div"); d.className = "notice " + (k || "ok"); d.textContent = m; d.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;max-width:420px;box-shadow:0 10px 30px rgba(0,0,0,.2)"; document.body.appendChild(d); setTimeout(() => d.remove(), 4500); };
  const fail = (e) => toast(U.friendlyError(e), "bad");
  const STATUS = ["draft", "pending", "published", "archived"];
  let CATS = [];

  // Field types: text, textarea, date, number, select, bool, lines (array of strings), url
  const T = {
    resources: { table: "public_resources", label: "Resources", key: "id", order: "sort_order",
      cols: ["title", "category_slug", "verification_status", "last_verified", "next_review", "status"],
      fields: [["title", "Title", "text"], ["slug", "Web address (slug, a-z and dashes)", "text"], ["category_slug", "Category", "cat"],
        ["summary", "Short original description", "textarea"], ["county", "County (empty = national)", "text"],
        ["c.eligibility", "Who can apply", "textarea"], ["c.documents", "What you need (one per line)", "lines"], ["c.steps", "Steps (one per line)", "lines"],
        ["c.fees", "Fees (only verified amounts)", "textarea"], ["c.processing", "Processing time / hours", "textarea"], ["c.caution", "Caution / may have changed note", "textarea"],
        ["c.tips", "Tips (one per line)", "lines"], ["c.contacts", "Contacts (one per line: Label | value | link)", "pairs3"], ["c.sources", "Extra sources (one per line: Name | https://…)", "pairs2"],
        ["apply_url", "Direct application link (https://)", "url"], ["apply_label", "Application button text", "text"],
        ["source_name", "Official source name", "text"], ["source_url", "Official source URL (https://)", "url"],
        ["published_at", "Publication date", "date"], ["last_verified", "Last verified", "date"], ["next_review", "Next review", "date"], ["expires_at", "Expiry date (optional)", "date"],
        ["verification_status", "Verification status", "select", ["verified", "partially_verified", "unverified", "needs_review"]],
        ["tags", "Search tags (comma-separated)", "tags"], ["sort_order", "Order", "number"], ["status", "Status", "select", STATUS]] },
    notices: { table: "public_notices", label: "Public notices", key: "id", order: "created_at", desc: true,
      cols: ["title", "category_slug", "county", "ends_at", "origin", "status"],
      fields: [["title", "Title", "text"], ["category_slug", "Category", "cat"], ["summary", "Summary (original wording)", "textarea"], ["county", "County", "text"],
        ["source_name", "Source name", "text"], ["source_url", "Source URL", "url"], ["starts_at", "Starts", "date"], ["ends_at", "Ends (hidden after this date)", "date"],
        ["status", "Status", "select", ["pending", "published", "rejected", "archived"]]] },
    emergency: { table: "emergency_contacts", label: "Emergency numbers", key: "id", order: "sort_order",
      cols: ["number", "name", "last_verified", "status"],
      fields: [["name", "Name", "text"], ["number", "Number", "text"], ["description", "Description", "text"], ["available", "Availability", "text"],
        ["source_name", "Official source", "text"], ["source_url", "Source URL", "url"], ["last_verified", "Last verified", "date"], ["sort_order", "Order", "number"], ["status", "Status", "select", STATUS]] },
    fuel: { table: "fuel_prices", label: "Fuel prices", key: "id", order: "cycle_start", desc: true,
      cols: ["cycle_start", "cycle_end", "town", "petrol", "diesel", "kerosene", "status"],
      fields: [["cycle_start", "Cycle start", "date"], ["cycle_end", "Cycle end", "date"], ["town", "Town", "text"], ["petrol", "Super petrol (KSh/litre)", "number"],
        ["diesel", "Diesel", "number"], ["kerosene", "Kerosene", "number"], ["source_url", "EPRA source URL", "url"], ["verified", "Checked against EPRA", "bool"], ["status", "Status", "select", ["pending", "published", "archived"]]] },
    calendar: { table: "education_calendar", label: "Education calendar", key: "id", order: "start_date",
      cols: ["title", "level", "start_date", "end_date", "status"],
      fields: [["title", "Title", "text"], ["event_type", "Type", "select", ["term", "half_term", "holiday", "exam", "results", "application", "other"]],
        ["level", "Level", "select", ["all", "primary", "junior", "senior", "university", "tvet"]], ["start_date", "Start", "date"], ["end_date", "End", "date"], ["notes", "Notes", "text"],
        ["source_name", "Source", "text"], ["source_url", "Source URL", "url"], ["last_verified", "Last verified", "date"], ["status", "Status", "select", STATUS]] },
    scholarships: { table: "scholarships", label: "Scholarships", key: "id", order: "name",
      cols: ["name", "country", "open_status", "deadline", "next_review", "status"],
      fields: [["name", "Scholarship name", "text"], ["institution", "Institution", "text"], ["country", "Country", "text"], ["level", "Level", "text"],
        ["eligibility", "Eligibility", "textarea"], ["coverage", "Funding coverage", "textarea"], ["opens_on", "Opens", "date"], ["deadline", "Application deadline", "date"],
        ["url", "Official application URL", "url"], ["open_status", "Open/closed", "select", ["open", "upcoming", "check", "closed"]], ["notes", "Notes", "textarea"],
        ["last_verified", "Last verified", "date"], ["next_review", "Next review", "date"], ["status", "Status", "select", STATUS]] },
    facilities: { table: "health_facilities", label: "Health facilities", key: "id", order: "name",
      cols: ["name", "county", "facility_type", "registry_code", "status"],
      fields: [["name", "Facility name", "text"], ["county", "County", "text"], ["sub_county", "Sub-county", "text"], ["facility_type", "Type", "text"], ["level", "Level", "text"],
        ["ownership", "Ownership", "text"], ["registry_code", "Registry code (KMHFR/NHFR)", "text"], ["phone", "Phone (only if verified)", "text"], ["services", "Services (only if verified)", "textarea"],
        ["source_name", "Source", "text"], ["source_url", "Source URL", "url"], ["last_verified", "Last verified", "date"], ["next_review", "Next review", "date"], ["status", "Status", "select", STATUS]] },
    transport: { table: "transport_information", label: "Transport info", key: "id", order: "title",
      cols: ["title", "mode", "price_kes", "price_type", "status"],
      fields: [["kind", "Kind", "select", ["fare", "route", "timetable", "notice", "other"]], ["mode", "Mode (sgr, commuter, matatu, bus, air)", "text"], ["title", "Title", "text"],
        ["origin", "From", "text"], ["destination", "To", "text"], ["price_kes", "Price (KSh)", "number"], ["price_type", "Price type", "select", ["verified", "reported", "estimated"]],
        ["details", "Details", "textarea"], ["source_name", "Source", "text"], ["source_url", "Source URL", "url"], ["last_verified", "Last verified", "date"], ["valid_until", "Valid until", "date"],
        ["status", "Status", "select", STATUS]] },
    categories: { table: "resource_categories", label: "Categories", key: "slug", order: "sort_order",
      cols: ["name", "slug", "is_active", "ad_category"],
      fields: [["name", "Name", "text"], ["slug", "Slug", "text"], ["description", "Description", "textarea"],
        ["icon", "Icon", "select", ["landmark", "health", "bus", "school", "briefcase", "scale", "calendar", "vote", "cloud", "coins", "bolt", "leaf"]],
        ["ad_category", "Advert category shown on these pages", "text"], ["sort_order", "Order", "number"], ["is_active", "Visible on the site", "bool"]] },
    sources: { table: "resource_sources", label: "Sources & automation", key: "id", order: "name",
      cols: ["name", "kind", "automation", "last_checked"],
      fields: [["name", "Name", "text"], ["url", "URL", "url"], ["kind", "Kind", "select", ["website", "api", "rss", "pdf", "dataset"]],
        ["automation", "Updates", "select", ["manual", "api", "rss"]], ["terms_note", "Terms / access notes", "textarea"], ["last_checked", "Last checked", "date"], ["is_active", "Active", "bool"]] }
  };
  const NAV = [["overview", "Overview"], ["review", "Needs review"], ["resources"], ["notices"], ["emergency"], ["fuel"], ["calendar"], ["scholarships"], ["facilities"], ["transport"], ["categories"], ["sources"], ["log", "Change log"]];

  A.onChange(async (user) => {
    if (!user) { location.replace("signin.html?next=resources-admin.html"); return; }
    const { data: isAdmin, error } = await db.rpc("is_admin");
    $("#loading").hidden = true;
    if (error || !isAdmin) { $("#denied").hidden = false; $("#denied-msg").innerHTML = "This page is for IMMA Media administrators (profiles.role = <b>admin</b>)."; return; }
    $("#dash").hidden = false;
    const hk = await db.rpc("resource_housekeeping");
    if (hk.data) $("#hk").textContent = `Daily check: ${hk.data.flagged_for_review} flagged for review, ${hk.data.notices_archived} expired notice(s) hidden, ${hk.data.scholarships_closed} scholarship(s) closed.`;
    else if (hk.error) $("#hk").textContent = "Run supabase/resources.sql to set up the database.";
    const c = await db.from("resource_categories").select("*").order("sort_order"); CATS = c.data || [];
    $("#nav").innerHTML = NAV.map(([k, l]) => `<button type="button" data-go="${k}">${esc(l || T[k].label)}</button>`).join("");
    go("overview");
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]"); if (b) go(b.dataset.go);
    if (e.target.closest("[data-close]")) dlg.close();
  });
  function go(v) {
    document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.go === v));
    if (v === "overview") return overview();
    if (v === "review") return review();
    if (v === "log") return log();
    list(v);
  }
  const reviewDays = (t) => t === "fuel_prices" ? 30 : t === "emergency_contacts" ? 30 : t === "scholarships" ? 30 : 90;
  const addDays = (n) => U.addDays(today, n);

  // ---------- Overview ----------
  async function overview() {
    const q = await Promise.all([
      db.from("public_resources").select("status, verification_status, next_review, category_slug"),
      db.from("public_notices").select("status"), db.from("scholarships").select("open_status, next_review, status"),
      db.from("fuel_prices").select("cycle_start, cycle_end").order("cycle_start", { ascending: false }).limit(1)
    ]);
    const [res, no, sc, fu] = q.map((r) => r.data || []);
    const due = res.filter((r) => r.status === "published" && (r.verification_status === "needs_review" || (r.next_review && r.next_review < today)));
    const fuelDue = !fu[0] || fu[0].cycle_end < today;
    panel.innerHTML = `
      <div class="kpis">
        <div class="kpi gold"><small>Published resources</small><b>${res.filter((r) => r.status === "published").length}</b></div>
        <div class="kpi"><small>Due for re-check</small><b>${due.length}</b></div>
        <div class="kpi"><small>Notices awaiting approval</small><b>${no.filter((n) => n.status === "pending").length}</b></div>
        <div class="kpi"><small>Scholarships open</small><b>${sc.filter((s) => s.open_status === "open" && s.status === "published").length}</b></div>
        <div class="kpi"><small>Latest fuel cycle</small><b>${fu[0] ? esc(U.date(fu[0].cycle_start)) : "—"}</b></div>
      </div>
      ${fuelDue ? `<div class="notice warn"><b>Fuel prices need updating.</b> EPRA publishes new prices on the 14th. <button class="btn-gold btn-sm" data-go="fuel">Add new cycle</button></div>` : ""}
      ${due.length ? `<div class="notice warn">${due.length} resource(s) are past their review date and show a "may have changed" note on the site. <button class="btn-outline btn-sm" data-go="review">Review now</button></div>` : ""}
      <div class="card"><h2>Resources by category</h2>
        ${CATS.filter((c) => c.is_active).map((c) => `<p>${esc(c.name)}: <b>${res.filter((r) => r.category_slug === c.slug && r.status === "published").length}</b> published</p>`).join("")}</div>
      <div class="card"><h2>Automatic updates</h2>
        <p class="muted small">Official Kenyan sites checked (EPRA, KeNHA, KMD, MoE, KNEC, HELB, TSC, KPLC) publish web pages and PDFs, not open APIs or feeds, so their updates are entered here by an editor. ReliefWeb (UN OCHA) offers a free API for disaster and health reports; imported items arrive as <b>pending</b> and must be approved.</p>
        <button class="btn-outline btn-sm" id="rw">Check ReliefWeb for new Kenya reports</button> <span id="rw-msg" class="small muted"></span></div>`;
    $("#rw").addEventListener("click", reliefweb);
  }

  async function reliefweb() {
    const msg = $("#rw-msg");
    const s = await db.from("ad_settings").select("value").eq("key", "reliefweb_appname").maybeSingle();
    const app = s.data && s.data.value;
    if (!app) { msg.innerHTML = "Add your approved ReliefWeb appname first (request one at <a href='https://apidoc.reliefweb.int/#appname' target='_blank' rel='noopener'><u>apidoc.reliefweb.int</u></a>), then save it below."; showAppnameForm(); return; }
    msg.textContent = "Checking…";
    try {
      const url = `https://api.reliefweb.int/v2/reports?appname=${encodeURIComponent(app)}&filter[field]=country&filter[value]=Kenya&sort[]=date.created:desc&limit=10&fields[include][]=title&fields[include][]=url_alias&fields[include][]=date.created&fields[include][]=source.shortname&fields[include][]=body`;
      const r = await fetch(url); const j = await r.json();
      if (!r.ok) throw new Error((j.error && j.error.message) || r.status);
      let added = 0;
      for (const it of j.data || []) {
        const f = it.fields || {};
        const row = { external_id: "reliefweb-" + it.id, title: String(f.title || "").slice(0, 200), origin: "automated", status: "pending", category_slug: "health-safety",
          summary: "Imported from ReliefWeb — write an original summary before approving.", source_name: "ReliefWeb — " + ((f.source || [])[0] || {}).shortname,
          source_url: f.url_alias || "https://reliefweb.int/node/" + it.id, starts_at: (f.date && f.date.created || "").slice(0, 10) || null };
        const ins = await db.from("public_notices").insert(row);
        if (!ins.error) added++;
      }
      msg.textContent = `${added} new item(s) added as pending. Review them under Public notices.`;
    } catch (e) { msg.textContent = "ReliefWeb request failed: " + e.message; }
  }
  function showAppnameForm() {
    const box = document.createElement("form");
    box.className = "toolbar"; box.innerHTML = `<input id="rw-app" placeholder="Approved ReliefWeb appname"><button class="btn-gold btn-sm">Save</button>`;
    $("#rw-msg").after(box);
    box.addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = $("#rw-app").value.trim(); if (!v) return;
      const r = await db.from("ad_settings").upsert({ key: "reliefweb_appname", value: v, label: "ReliefWeb API appname", is_public: false });
      if (r.error) return fail(r.error); toast("Saved."); box.remove();
    });
  }

  // ---------- Needs review ----------
  async function review() {
    const r = await db.from("public_resources").select("*").eq("status", "published").or(`verification_status.eq.needs_review,next_review.lt.${today}`).order("next_review");
    const s = await db.from("scholarships").select("*").eq("status", "published").lt("next_review", today);
    const rows = [...(r.data || []).map((x) => ({ ...x, _t: "resources" })), ...(s.data || []).map((x) => ({ ...x, _t: "scholarships", title: x.name }))];
    panel.innerHTML = `<div class="card"><h2>Needs review</h2><p class="muted small">Open each official source, check every fact, edit if needed, then click <b>Mark verified today</b>. Items stay visible with a "may have changed" label until then.</p>
      ${rows.length ? `<div class="table-wrap"><table class="dtable"><thead><tr><th>Item</th><th>Due</th><th>Source</th><th></th></tr></thead><tbody>
      ${rows.map((x) => `<tr><td><b>${esc(x.title)}</b><br><small>${esc(T[x._t].label)}</small></td><td>${esc(U.date(x.next_review))}</td><td><a href="${esc(x.source_url || x.url)}" target="_blank" rel="noopener"><u>Open source</u></a></td>
        <td class="row-actions"><button class="btn-outline btn-sm" data-edit="${x.id}" data-t="${x._t}">Edit</button><button class="btn-gold btn-sm" data-ok="${x.id}" data-t="${x._t}">Mark verified today</button></td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty-state">Nothing is due for review. 🎉</p>`}</div>`;
    bindRowActions(review);
  }

  // ---------- Generic list ----------
  async function list(k, filter) {
    const t = T[k];
    let q = db.from(t.table).select("*").order(t.order, { ascending: !t.desc }).limit(1000);
    const r = await q;
    if (r.error) { panel.innerHTML = `<div class="notice bad">${esc(U.friendlyError(r.error))}</div>`; return; }
    let rows = r.data || [];
    const st = filter || "";
    if (st) rows = rows.filter((x) => x.status === st);
    const statuses = [...new Set((r.data || []).map((x) => x.status).filter(Boolean))];
    panel.innerHTML = `<div class="card"><div class="card-head"><h2>${esc(t.label)}</h2><div class="cta-buttons">
        ${k === "fuel" ? `<button class="btn-gold btn-sm" id="fuel-cycle">+ New EPRA cycle</button>` : ""}
        <button class="btn-outline btn-sm" id="csv">Export CSV</button><button class="btn-gold btn-sm" data-new="${k}">+ Add</button></div></div>
      ${statuses.length > 1 ? `<div class="tabs">${["", ...statuses].map((s) => `<button data-f="${s}" class="${s === st ? "on" : ""}">${s || "All"} (${s ? (r.data || []).filter((x) => x.status === s).length : (r.data || []).length})</button>`).join("")}</div>` : ""}
      ${rows.length ? `<div class="table-wrap"><table class="dtable"><thead><tr>${t.cols.map((c) => `<th>${esc(label(t, c))}</th>`).join("")}<th></th></tr></thead><tbody>
      ${rows.map((x) => `<tr>${t.cols.map((c) => `<td>${cell(x, c)}</td>`).join("")}<td class="row-actions">
        <button class="btn-outline btn-sm" data-edit="${esc(x[t.key])}" data-t="${k}">Edit</button>
        ${x.status && x.status !== "published" && x.status !== "rejected" ? `<button class="btn-gold btn-sm" data-pub="${esc(x[t.key])}" data-t="${k}">${x.status === "pending" ? "Approve" : "Publish"}</button>` : ""}
        ${x.status === "published" ? `<button class="btn-outline btn-sm" data-arch="${esc(x[t.key])}" data-t="${k}">Archive</button>` : ""}
        ${x.status === "pending" && k === "notices" ? `<button class="btn-danger" data-rej="${esc(x[t.key])}" data-t="${k}">Reject</button>` : ""}
        ${"last_verified" in x ? `<button class="btn-outline btn-sm" data-ok="${esc(x[t.key])}" data-t="${k}">Verified today</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty-state">Nothing here yet.</p>`}</div>`;
    panel.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => list(k, b.dataset.f)));
    $("#csv").addEventListener("click", () => U.csv(r.data || [], `imma-${t.table}-${today}.csv`));
    panel.querySelector("[data-new]").addEventListener("click", () => edit(k, null));
    const fc = $("#fuel-cycle"); if (fc) fc.addEventListener("click", () => fuelCycle(r.data || []));
    bindRowActions(() => list(k, st));
  }
  const label = (t, c) => (t.fields.find((f) => f[0] === c) || [c, c])[1].replace(/\s*\(.*\)$/, "");
  function cell(x, c) {
    const v = x[c];
    if (c === "status" || c === "verification_status" || c === "open_status") return U.badge(v === "partially_verified" ? "pending" : v === "needs_review" ? "unpaid" : v);
    if (c.endsWith("_date") || ["last_verified", "next_review", "cycle_start", "cycle_end", "deadline", "ends_at", "last_checked"].includes(c))
      return v ? `<span${c === "next_review" && v < today ? ' style="color:var(--down);font-weight:700"' : ""}>${esc(U.date(v))}</span>` : "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (c === "category_slug") return esc((CATS.find((k) => k.slug === v) || {}).name || v || "");
    return esc(v ?? "—");
  }
  function bindRowActions(after) {
    const act = async (sel, fn) => panel.querySelectorAll(sel).forEach((b) => b.addEventListener("click", async () => { b.disabled = true; try { await fn(b.dataset.t, b.dataset[Object.keys(b.dataset).find((k) => k !== "t")]); after(); } catch (e) { fail(e); b.disabled = false; } }));
    const upd = async (k, id, row) => { const t = T[k]; const r = await db.from(t.table).update(row).eq(t.key, id); if (r.error) throw r.error; };
    panel.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => edit(b.dataset.t, b.dataset.edit)));
    act("[data-pub]", async (k, id) => { await upd(k, id, { status: "published" }); toast("Published."); });
    act("[data-arch]", async (k, id) => { await upd(k, id, { status: "archived" }); toast("Archived — hidden from the public site."); });
    act("[data-rej]", async (k, id) => { await upd(k, id, { status: "rejected" }); toast("Rejected."); });
    act("[data-ok]", async (k, id) => {
      const t = T[k], row = { last_verified: today };
      if (t.fields.some((f) => f[0] === "next_review")) row.next_review = addDays(reviewDays(t.table));
      if (k === "resources") row.verification_status = "verified";
      await upd(k, id, row); toast("Marked as verified today.");
    });
  }

  // ---------- Edit form ----------
  async function edit(k, id) {
    const t = T[k];
    let x = {};
    if (id) { const r = await db.from(t.table).select("*").eq(t.key, id).single(); if (r.error) return fail(r.error); x = r.data; }
    const c = x.content || {};
    const get = (f) => f.startsWith("c.") ? c[f.slice(2)] : x[f];
    const input = ([f, l, type, opts]) => {
      const v = get(f);
      const id_ = "f_" + f.replace(/\W/g, "_");
      const wide = ["textarea", "lines", "pairs2", "pairs3"].includes(type) ? " full" : "";
      let el;
      if (type === "textarea") el = `<textarea id="${id_}" rows="3">${esc(v || "")}</textarea>`;
      else if (type === "lines") el = `<textarea id="${id_}" rows="5">${esc((v || []).join("\n"))}</textarea>`;
      else if (type === "pairs2") el = `<textarea id="${id_}" rows="3">${esc((v || []).map((s) => `${s.name} | ${s.url}`).join("\n"))}</textarea>`;
      else if (type === "pairs3") el = `<textarea id="${id_}" rows="4">${esc((v || []).map((s) => `${s.label} | ${s.value} | ${s.href || ""}`).join("\n"))}</textarea>`;
      else if (type === "select") el = `<select id="${id_}">${opts.map((o) => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
      else if (type === "cat") el = `<select id="${id_}">${CATS.map((o) => `<option value="${esc(o.slug)}" ${o.slug === v ? "selected" : ""}>${esc(o.name)}</option>`).join("")}</select>`;
      else if (type === "bool") el = `<input id="${id_}" type="checkbox" ${v ? "checked" : ""}>`;
      else if (type === "tags") el = `<input id="${id_}" value="${esc((v || []).join(", "))}">`;
      else el = `<input id="${id_}" type="${type === "date" ? "date" : type === "number" ? "number" : type === "url" ? "url" : "text"}" ${type === "number" ? 'step="0.01"' : ""} value="${esc(v ?? "")}">`;
      return `<div class="field${wide}"><label for="${id_}">${esc(l)}</label>${el}</div>`;
    };
    $("#dlg-title").textContent = (id ? "Edit " : "Add ") + t.label.replace(/s$/, "").toLowerCase();
    $("#dlg-body").innerHTML = `<form class="cform" id="ed"><div class="form-grid">${t.fields.map(input).join("")}</div>
      <p class="small muted">Write in your own words. Only include fees, dates and contacts you have confirmed on the official source. New items default to the review schedule if you leave "Next review" empty.</p>
      <div class="cta-buttons"><button class="btn-gold" type="submit">Save</button>${id && k !== "categories" ? `<button class="btn-danger" type="button" id="del">Delete permanently</button>` : ""}</div></form>`;
    if (!dlg.open) dlg.showModal();
    $("#ed").addEventListener("submit", async (e) => {
      e.preventDefault();
      const row = {}, content = { ...c };
      for (const [f, , type] of t.fields) {
        const el = document.getElementById("f_" + f.replace(/\W/g, "_")); let v;
        if (type === "bool") v = el.checked;
        else if (type === "lines") v = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
        else if (type === "tags") v = el.value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        else if (type === "pairs2") v = el.value.split("\n").map((s) => s.split("|").map((p) => p.trim())).filter((p) => p[0] && p[1]).map(([name, url]) => ({ name, url }));
        else if (type === "pairs3") v = el.value.split("\n").map((s) => s.split("|").map((p) => p.trim())).filter((p) => p[0] && p[1]).map(([label, value, href]) => ({ label, value, href: href || null }));
        else if (type === "number") v = el.value === "" ? null : Number(el.value);
        else v = el.value.trim() === "" ? null : el.value.trim();
        if (f.startsWith("c.")) content[f.slice(2)] = v; else row[f] = v;
      }
      if (k === "resources") row.content = content;
      if ("next_review" in row && !row.next_review && row.last_verified) row.next_review = U.addDays(row.last_verified, reviewDays(t.table));
      for (const [f, , type] of t.fields) if (type === "url" && row[f] && !/^https:\/\//i.test(row[f])) return toast("Links must start with https://", "bad");
      const r = id ? await db.from(t.table).update(row).eq(t.key, id) : await db.from(t.table).insert(row);
      if (r.error) return fail(r.error);
      dlg.close(); toast("Saved."); go(k);
    });
    const del = $("#del");
    if (del) del.addEventListener("click", async () => {
      if (!confirm("Delete permanently? Archiving hides it but keeps the record. This cannot be undone.")) return;
      const r = await db.from(t.table).delete().eq(t.key, id); if (r.error) return fail(r.error);
      dlg.close(); toast("Deleted."); go(k);
    });
  }

  // ---------- New EPRA cycle (copies the town list) ----------
  function fuelCycle(rows) {
    const last = rows[0];
    const towns = last ? rows.filter((r) => r.cycle_start === last.cycle_start) : [{ town: "Nairobi" }, { town: "Mombasa" }, { town: "Kisumu" }, { town: "Nakuru" }, { town: "Eldoret" }];
    const start = last ? U.addDays(last.cycle_end, 1) : today;
    const end = (() => { const d = new Date(start + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(14); return d.toISOString().slice(0, 10); })();
    $("#dlg-title").textContent = "New EPRA price cycle";
    $("#dlg-body").innerHTML = `<form class="cform" id="fc">
      <div class="form-grid"><div class="field"><label>From</label><input id="fc-s" type="date" value="${start}"></div><div class="field"><label>To</label><input id="fc-e" type="date" value="${end}"></div>
      <div class="field full"><label>EPRA press release URL</label><input id="fc-u" type="url" placeholder="https://www.epra.go.ke/maximum-retail-petroleum-prices-kenya-period-…"></div></div>
      <table class="dtable"><thead><tr><th>Town</th><th>Super petrol</th><th>Diesel</th><th>Kerosene</th></tr></thead><tbody>
      ${towns.map((t2, i) => `<tr><td><input data-i="${i}" data-k="town" value="${esc(t2.town)}"></td>${["petrol", "diesel", "kerosene"].map((k) => `<td><input data-i="${i}" data-k="${k}" type="number" step="0.01" placeholder="${t2[k] ?? ""}"></td>`).join("")}</tr>`).join("")}
      </tbody></table>
      <label class="check"><input type="checkbox" id="fc-v"> I copied these prices from EPRA's official release</label>
      <button class="btn-gold" type="submit">Save and publish</button></form>`;
    if (!dlg.open) dlg.showModal();
    $("#fc").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!$("#fc-v").checked) return toast("Please confirm the prices are from EPRA.", "bad");
      const url = $("#fc-u").value.trim(); if (!/^https:\/\//.test(url)) return toast("Add the EPRA source link.", "bad");
      const out = towns.map((_, i) => { const o = {}; document.querySelectorAll(`[data-i="${i}"]`).forEach((el) => { o[el.dataset.k] = el.dataset.k === "town" ? el.value.trim() : Number(el.value); }); return o; })
        .filter((o) => o.town && o.petrol > 0 && o.diesel > 0 && o.kerosene > 0)
        .map((o) => ({ ...o, cycle_start: $("#fc-s").value, cycle_end: $("#fc-e").value, source_url: url, verified: true, status: "published" }));
      if (!out.length) return toast("Enter the prices for at least one town.", "bad");
      const r = await db.from("fuel_prices").insert(out); if (r.error) return fail(r.error);
      dlg.close(); toast(`Saved ${out.length} town(s).`); go("fuel");
    });
  }

  // ---------- Change log ----------
  async function log() {
    const r = await db.from("resource_update_logs").select("*").order("created_at", { ascending: false }).limit(300);
    panel.innerHTML = `<div class="card"><h2>Change log</h2><div class="table-wrap"><table class="dtable"><thead><tr><th>When</th><th>Table</th><th>Action</th><th>Details</th></tr></thead><tbody>
      ${(r.data || []).map((l) => `<tr><td>${esc(U.dateTime(l.created_at))}</td><td>${esc(l.table_name)}</td><td>${esc(l.action)}</td><td><small>${esc(JSON.stringify(l.details || {}))}</small></td></tr>`).join("")}
      </tbody></table></div></div>`;
  }
})();
