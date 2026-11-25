// IMMA Business Directory — administrator module (/directory-admin.html).
// Every action is enforced by Supabase row-level security (profiles.role = 'admin');
// this page only hides itself from everyone else.
(() => {
  const D = window.IMMA_DIR, A = window.IMMA_AUTH;
  const { esc, kes } = D;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const db = A && A.client;
  const root = $("#bd-admin");
  const S = { view: (location.hash || "#overview").slice(1), biz: [], cats: [], pk: [], codes: [], subs: [], pays: [], inv: [], reviews: [], reports: [], claims: [], vers: [], enq: [], promos: [], audit: [], kpi: {}, filter: "all", q: "" };
  const friendly = (e) => String((e && (e.message || e.details)) || e || "Something went wrong.").replace(/^.*?ERROR:\s*/, "");
  const toast = (msg, bad) => { const d = document.createElement("div"); d.className = "bd-status " + (bad ? "bad" : "ok"); d.textContent = msg; d.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;max-width:420px;box-shadow:0 10px 30px rgba(0,0,0,.2)"; document.body.appendChild(d); setTimeout(() => d.remove(), 5000); };
  const pill = (s) => `<span class="bd-pill ${esc(s)}">${esc(String(s).replace(/_/g, " "))}</span>`;
  const today = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const bizName = (id) => (S.biz.find((b) => b.id === id) || {}).name || "—";
  const catName = (id) => (S.cats.find((c) => c.id === id) || {}).name || "—";
  const run = async (p, ok) => { const r = await p; if (r.error) { toast(friendly(r.error), true); return null; } if (ok) toast(ok); return r; };
  function csv(rows, name) {
    if (!rows.length) return toast("Nothing to export.", true);
    const cols = Object.keys(rows[0]);
    const cell = (v) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n")], { type: "text/csv" }));
    a.download = name; a.click();
  }

  if (!db) { root.innerHTML = '<p class="bd-empty">Supabase is not configured.</p>'; return; }

  A.onChange(async (user) => {
    if (!user) { location.replace("/signin.html?next=" + encodeURIComponent("/directory-admin.html")); return; }
    const { data: isAdmin, error } = await db.rpc("is_admin");
    if (error || !isAdmin) { root.innerHTML = `<div class="bd-empty"><h3>Administrators only</h3><p>${error ? "Run <code>supabase/directory.sql</code> in the Supabase SQL Editor first." : "Ask an administrator to set your role to admin."}</p></div>`; return; }
    try { const r = await db.rpc("biz_run_schedule"); if (r.data) S.sched = r.data; } catch (e) {}
    await loadAll();
    draw();
  });
  window.addEventListener("hashchange", () => { S.view = location.hash.slice(1) || "overview"; draw(); });

  async function loadAll() {
    const q = await Promise.all([
      db.from("businesses").select("*, business_locations(county,town), business_owners(user_id,role)").order("created_at", { ascending: false }),
      db.from("business_categories").select("*").order("sort_order"),
      db.from("business_packages").select("*").order("sort_order"),
      db.from("business_discount_codes").select("*").order("created_at", { ascending: false }),
      db.from("business_subscriptions").select("*").order("created_at", { ascending: false }),
      db.from("business_payments").select("*").order("created_at", { ascending: false }),
      db.from("business_invoices").select("*").order("issued_at", { ascending: false }),
      db.from("business_reviews").select("*").order("created_at", { ascending: false }),
      db.from("business_reports").select("*").order("created_at", { ascending: false }),
      db.from("business_claims").select("*").order("created_at", { ascending: false }),
      db.from("business_verifications").select("*").order("created_at", { ascending: false }),
      db.from("business_enquiries").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("business_promotions").select("*").order("ends_on", { ascending: false }),
      db.from("business_audit_logs").select("*").order("created_at", { ascending: false }).limit(300),
      db.rpc("biz_admin_kpis")
    ]);
    const bad = q.find((r) => r.error); if (bad) toast(friendly(bad.error), true);
    [S.biz, S.cats, S.pk, S.codes, S.subs, S.pays, S.inv, S.reviews, S.reports, S.claims, S.vers, S.enq, S.promos, S.audit] = q.slice(0, 14).map((r) => r.data || []);
    S.kpi = q[14].data || {};
  }

  const NAV = [["overview", "Overview"], ["businesses", "All businesses"], ["pending", "Pending registrations", "pending"], ["verified", "Verification", "verifications_open"], ["claims", "Ownership claims", "claims_open"],
    ["categories", "Categories"], ["featured", "Featured listings"], ["packages", "Packages & codes"], ["payments", "Payments & invoices", "payments_to_check"], ["reviews", "Reviews", "reviews_to_check"],
    ["reports", "Reports & complaints", "reports_open"], ["enquiries", "Customer enquiries"], ["promotions", "Promotional offers"], ["revenue", "Revenue reports"], ["import", "Import CSV"], ["settings", "Settings"], ["audit", "Audit log"]];

  function draw() {
    root.innerHTML = `<div class="bd-sec-head"><div><h1 style="margin:0">Business Directory Management</h1><p>${S.sched ? `Schedule checked: ${S.sched.expired} subscription(s) expired; ${S.sched.expiring_7_days} ending within 7 days.` : ""}</p></div>
        <span style="display:flex;gap:8px;flex-wrap:wrap"><a class="bd-btn bd-btn-gold" href="/business-directory/register.html">+ Add business</a><a class="bd-btn bd-btn-ghost" href="/ads-admin.html">Advertising admin ↗</a></span></div>
      <nav class="bd-tabs" aria-label="Directory admin sections">${NAV.map(([k, t, c]) => `<button type="button" data-v="${k}" class="${S.view === k ? "on" : ""}">${t}${c && S.kpi[c] ? `<span class="count">${S.kpi[c]}</span>` : ""}</button>`).join("")}</nav>
      <div id="bd-v"></div>`;
    $$("[data-v]").forEach((x) => x.addEventListener("click", () => { location.hash = x.dataset.v; }));
    const fn = { overview, businesses, pending: () => businesses("pending"), verified, claims, categories, featured, packages, payments, reviews, reports, enquiries, promotions, revenue, import: importCsv, settings, audit }[S.view] || overview;
    fn();
  }
  const V = () => $("#bd-v");
  const refresh = async () => { await loadAll(); draw(); };

  // ---------- Overview ----------
  function overview() {
    const k = S.kpi, card = (n, t) => `<div class="bd-kpi"><b>${n}</b><span>${t}</span></div>`;
    const expiring = S.subs.filter((s) => ["active", "complimentary"].includes(s.status) && s.ends_on >= today() && s.ends_on <= addDays(today(), 14));
    V().innerHTML = `<div class="bd-kpis">
        ${card(k.total ?? 0, "Registered businesses")}${card(k.active ?? 0, "Active (approved)")}${card(k.free ?? 0, "Free listings")}${card(k.paid ?? 0, "Paid listings")}
        ${card(k.pending ?? 0, "Pending approvals")}${card(kes(k.mrr || 0), "Monthly recurring revenue")}${card(kes(k.revenue || 0), "Total directory revenue")}
        ${card(k.expiring ?? 0, "Expiring in 14 days")}${card(k.views_30 ?? 0, "Profile views (30 days)")}${card(k.enquiries_30 ?? 0, "Enquiries (30 days)")}${card(k.contacts_30 ?? 0, "Contact taps (30 days)")}${card(k.verified ?? 0, "Verified")}
      </div>
      <h2>Expiring subscriptions</h2>
      ${expiring.length ? table(["Business", "Package", "Ends"], expiring.map((s) => [esc(bizName(s.business_id)), esc(s.package_slug), esc(D.date(s.ends_on))])) : '<p class="bd-muted">None in the next 14 days.</p>'}
      <p class="bd-fine">Renewal reminders are shown to owners in their dashboard from 14 days before expiry. Email or SMS reminders need a messaging service (not connected yet).</p>`;
  }
  const table = (head, rows) => `<div class="bd-table-wrap"><table class="bd-table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

  // ---------- Businesses ----------
  function businesses(preset) {
    if (preset) S.filter = preset;
    const pkgOf = (b) => { const s = S.subs.filter((x) => x.business_id === b.id && ["active", "complimentary"].includes(x.status) && x.starts_on <= today() && x.ends_on >= today()); return s.length ? s.map((x) => x.package_slug).join(", ") : "free"; };
    const F = { all: () => true, pending: (b) => b.status === "pending", approved: (b) => b.status === "approved", draft: (b) => b.status === "draft", rejected: (b) => b.status === "rejected", suspended: (b) => b.status === "suspended", verified: (b) => b.verified, claimable: (b) => b.claimable, deletion: (b) => !!b.deletion_requested_at };
    const q = S.q.toLowerCase();
    const list = S.biz.filter(F[S.filter] || F.all).filter((b) => !q || (b.name + " " + (b.email || "") + " " + (b.phone || "")).toLowerCase().includes(q));
    V().innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <select id="bd-f">${Object.keys(F).map((k) => `<option value="${k}"${S.filter === k ? " selected" : ""}>${k === "deletion" ? "deletion requested" : k}</option>`).join("")}</select>
        <input id="bd-q" placeholder="Search name, email, phone" value="${esc(S.q)}" style="padding:8px;border:1px solid var(--line);border-radius:8px">
        <button class="bd-btn bd-btn-ghost bd-btn-sm" type="button" id="bd-exp">Export CSV</button></div>
      ${list.length ? table(["Business", "Status", "Package", "Location", "Owner", "Actions"], list.map((b) => {
        const loc = (b.business_locations || [])[0] || {};
        return [`<b>${esc(b.name)}</b><br><small>${esc(catName(b.category_id))}${b.verified ? " · ✔ verified" : ""}${b.claimable ? " · claimable" : ""}${b.deletion_requested_at ? " · <b>deletion requested</b>" : ""}</small>${b.source_note ? `<br><small>Source: ${esc(b.source_note)}</small>` : ""}`,
          pill(b.status) + (b.status_note ? `<br><small>${esc(b.status_note)}</small>` : ""), esc(pkgOf(b)), esc([loc.town, D.countyName(loc.county)].filter(Boolean).join(", ")),
          (b.business_owners || []).length ? `${b.business_owners.length} manager(s)` : "<small>none</small>",
          `<span style="display:flex;flex-wrap:wrap;gap:4px">
            <a class="bd-btn bd-btn-sm bd-btn-ghost" href="/business-directory/listing.html?preview=${esc(b.id)}" target="_blank" rel="noopener">Preview</a>
            <a class="bd-btn bd-btn-sm bd-btn-ghost" href="/business-directory/register.html?id=${esc(b.id)}">Edit</a>
            ${b.status !== "approved" ? `<button class="bd-btn bd-btn-sm" data-st="approved" data-id="${esc(b.id)}">Approve</button>` : ""}
            ${["pending", "approved"].includes(b.status) ? `<button class="bd-btn bd-btn-sm bd-btn-ghost" data-st="rejected" data-id="${esc(b.id)}">Reject</button>` : ""}
            ${b.status !== "suspended" ? `<button class="bd-btn bd-btn-sm bd-btn-ghost" data-st="suspended" data-id="${esc(b.id)}">Suspend</button>` : ""}
            <button class="bd-btn bd-btn-sm bd-btn-ghost" data-more="${esc(b.id)}">More…</button></span>`];
      })) : '<p class="bd-muted">No businesses in this view.</p>'}`;
    $("#bd-f").addEventListener("change", (e) => { S.filter = e.target.value; businesses(); });
    $("#bd-q").addEventListener("input", (e) => { S.q = e.target.value; clearTimeout(S.t); S.t = setTimeout(() => { businesses(); $("#bd-q").focus(); }, 300); });
    $("#bd-exp").addEventListener("click", () => csv(list.map((b) => ({ id: b.id, name: b.name, slug: b.slug, status: b.status, category: catName(b.category_id), verified: b.verified, phone: b.phone, whatsapp: b.whatsapp, email: b.email, website: b.website, county: ((b.business_locations || [])[0] || {}).county, town: ((b.business_locations || [])[0] || {}).town, created_at: b.created_at, rating_avg: b.rating_avg, rating_count: b.rating_count })), `directory-businesses-${today()}.csv`));
    $$("[data-st]").forEach((x) => x.addEventListener("click", async () => {
      let note = null;
      if (x.dataset.st !== "approved") { note = prompt(x.dataset.st === "suspended" ? "Reason for suspension (shown to the owner):" : "What should the owner change? (shown to them)"); if (note === null) return; }
      if (await run(db.from("businesses").update({ status: x.dataset.st, status_note: note }).eq("id", x.dataset.id), "Updated.")) refresh();
    }));
    $$("[data-more]").forEach((x) => x.addEventListener("click", () => more(x.dataset.more)));
  }
  function more(id) {
    const b = S.biz.find((x) => x.id === id);
    const d = document.createElement("dialog"); d.className = "bd-dialog";
    d.innerHTML = `<div class="bd-dialog-inner"><button class="bd-x" type="button">×</button><h2>${esc(b.name)}</h2>
      <form class="bd-form">
        <label class="bd-check"><input type="checkbox" name="verified"${b.verified ? " checked" : ""}> Verified (only after checking evidence; see the Verification tab)</label>
        <label class="bd-check"><input type="checkbox" name="claimable"${b.claimable ? " checked" : ""}> Claimable (added by IMMA Media; the real owner may claim it)</label>
        <label>Featured until (admin-managed placement)<input type="date" name="featured_until" value="${esc(b.featured_until || "")}"></label>
        <label>Source of information (for listings added by IMMA Media)<input name="source_note" maxlength="300" value="${esc(b.source_note || "")}"></label>
        <label>Add a manager by user ID<input name="owner" placeholder="Supabase user id (uuid)"></label>
        <button class="bd-btn" type="submit">Save</button>
        <hr><p class="bd-fine">Grant a complimentary package (no payment):</p>
        <div class="bd-row3"><select name="cpkg">${S.pk.filter((p) => p.price_monthly_kes > 0).map((p) => `<option value="${esc(p.slug)}">${esc(p.name)}</option>`).join("")}</select><input type="date" name="cend" value="${addDays(today(), 30)}"><button class="bd-btn bd-btn-ghost" type="button" data-comp>Grant</button></div>
        <hr><button class="bd-btn bd-btn-ghost" type="button" data-del>Delete business permanently…</button>
      </form></div>`;
    document.body.appendChild(d); d.showModal();
    d.querySelector(".bd-x").addEventListener("click", () => d.close()); d.addEventListener("close", () => d.remove());
    $("form", d).addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target;
      const r = await run(db.from("businesses").update({ verified: f.verified.checked, claimable: f.claimable.checked, featured_until: f.featured_until.value || null, source_note: f.source_note.value || null }).eq("id", id), "Saved.");
      if (r && f.owner.value.trim()) await run(db.from("business_owners").insert({ business_id: id, user_id: f.owner.value.trim(), role: "manager" }), "Manager added.");
      d.close(); refresh();
    });
    $("[data-comp]", d).addEventListener("click", async () => {
      const f = $("form", d);
      if (await run(db.from("business_subscriptions").insert({ business_id: id, package_slug: f.cpkg.value, billing: "monthly", status: "complimentary", starts_on: today(), ends_on: f.cend.value, amount_kes: 0, note: "Complimentary (granted by admin)" }), "Complimentary package granted.")) { d.close(); refresh(); }
    });
    $("[data-del]", d).addEventListener("click", async () => {
      if (prompt(`This permanently deletes "${b.name}", its photos, products, reviews and statistics. Invoices are kept. Type DELETE to confirm.`) !== "DELETE") return;
      for (const folder of ["logo", "cover", "gallery", "products"]) { const l = await db.storage.from("business-media").list(`${id}/${folder}`, { limit: 1000 }); if (l.data && l.data.length) await db.storage.from("business-media").remove(l.data.map((x) => `${id}/${folder}/${x.name}`)); }
      if (await run(db.from("businesses").delete().eq("id", id), "Deleted.")) { d.close(); refresh(); }
    });
  }

  // ---------- Verification & claims (private documents via short-lived links) ----------
  const docLink = (path) => path ? `<button class="bd-link" type="button" data-doc="${esc(path)}">Open document</button>` : "<small>no file</small>";
  function wireDocs() {
    $$("[data-doc]").forEach((x) => x.addEventListener("click", async () => {
      const { data, error } = await db.storage.from("business-docs").createSignedUrl(x.dataset.doc, 120);
      if (error) return toast(friendly(error), true);
      window.open(data.signedUrl, "_blank", "noopener");
    }));
  }
  function verified() {
    V().innerHTML = `<p class="bd-fine">${esc(D.VERIFIED_NOTE)} Approve only when the evidence matches the business name and the people managing it. Documents open through a link that expires after two minutes.</p>
      ${S.vers.length ? table(["Business", "Evidence", "Notes", "Status", "Decision"], S.vers.map((v) => [esc(bizName(v.business_id)), esc(v.evidence_type.replace(/_/g, " ")) + "<br>" + docLink(v.document_path), esc(v.notes || ""), pill(v.status) + (v.admin_note ? `<br><small>${esc(v.admin_note)}</small>` : ""),
        v.status === "pending" ? `<button class="bd-btn bd-btn-sm" data-ver="approved" data-id="${esc(v.id)}">Approve & verify</button> <button class="bd-btn bd-btn-sm bd-btn-ghost" data-ver="rejected" data-id="${esc(v.id)}">Reject</button>` : ""])) : '<p class="bd-muted">No verification requests.</p>'}`;
    wireDocs();
    $$("[data-ver]").forEach((x) => x.addEventListener("click", async () => { const note = prompt("Note for the owner (optional):") ; if (note === null) return; if (await run(db.from("business_verifications").update({ status: x.dataset.ver, admin_note: note || null }).eq("id", x.dataset.id), "Saved.")) refresh(); }));
  }
  function claims() {
    V().innerHTML = S.claims.length ? table(["Business", "Claimant", "Proof", "Message", "Status", "Decision"], S.claims.map((c) => [esc(bizName(c.business_id)), `<b>${esc(c.claimant_name)}</b><br>${esc(c.claimant_role || "")}<br>${esc(c.phone || "")}`, docLink(c.evidence_path), esc(c.message || ""), pill(c.status),
      c.status === "pending" ? `<button class="bd-btn bd-btn-sm" data-cl="approved" data-id="${esc(c.id)}">Approve (give access)</button> <button class="bd-btn bd-btn-sm bd-btn-ghost" data-cl="rejected" data-id="${esc(c.id)}">Reject</button>` : esc(c.admin_note || "")])) : '<p class="bd-muted">No ownership claims.</p>';
    wireDocs();
    $$("[data-cl]").forEach((x) => x.addEventListener("click", async () => { const note = prompt("Note (optional):"); if (note === null) return; if (await run(db.from("business_claims").update({ status: x.dataset.cl, admin_note: note || null }).eq("id", x.dataset.id), "Saved.")) refresh(); }));
  }

  // ---------- Categories ----------
  function categories() {
    const top = S.cats.filter((c) => !c.parent_id);
    V().innerHTML = `<form class="bd-form" id="bd-newcat" style="max-width:640px"><div class="bd-row3"><label>Name<input name="name" required maxlength="80"></label><label>Icon (emoji)<input name="icon" maxlength="4"></label>
        <label>Parent<select name="parent"><option value="">— main category —</option>${top.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label></div><button class="bd-btn bd-btn-sm" type="submit">Add category</button></form>
      ${table(["Order", "Category", "Address", "Subcategories", "Active", ""], top.map((c, i) => [
        `<button class="bd-link" data-mv="-1" data-id="${c.id}" ${i === 0 ? "disabled" : ""}>▲</button> <button class="bd-link" data-mv="1" data-id="${c.id}" ${i === top.length - 1 ? "disabled" : ""}>▼</button>`,
        `<input value="${esc(c.icon || "")}" data-ci="${c.id}" style="width:3em"> <input value="${esc(c.name)}" data-cn="${c.id}" style="min-width:14em">`, `/business-directory/${esc(c.slug)}/`,
        S.cats.filter((s) => s.parent_id === c.id).map((s) => `<span class="bd-badge">${esc(s.name)} <button class="bd-link" data-delcat="${s.id}" aria-label="Remove ${esc(s.name)}">×</button></span>`).join(" "),
        `<input type="checkbox" data-ca="${c.id}"${c.active ? " checked" : ""}>`, `<button class="bd-link" data-delcat="${c.id}">Remove</button>`]))}
      <p class="bd-fine">Category addresses are permanent once used. Removing a category leaves its businesses without a category until you choose a new one.</p>`;
    $("#bd-newcat").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target;
      const parent = f.parent.value || null, pslug = parent ? (S.cats.find((c) => c.id === parent) || {}).slug + "-" : "";
      if (await run(db.from("business_categories").insert({ name: f.name.value.trim(), icon: f.icon.value || null, parent_id: parent, slug: pslug + D.slugify(f.name.value), sort_order: (S.cats.length + 1) * 10 }), "Category added.")) refresh();
    });
    $$("[data-cn]").forEach((x) => x.addEventListener("change", () => run(db.from("business_categories").update({ name: x.value }).eq("id", x.dataset.cn), "Renamed.")));
    $$("[data-ci]").forEach((x) => x.addEventListener("change", () => run(db.from("business_categories").update({ icon: x.value }).eq("id", x.dataset.ci), "Icon saved.")));
    $$("[data-ca]").forEach((x) => x.addEventListener("change", () => run(db.from("business_categories").update({ active: x.checked }).eq("id", x.dataset.ca), "Saved.")));
    $$("[data-delcat]").forEach((x) => x.addEventListener("click", async () => { if (!confirm("Remove this category?")) return; if (await run(db.from("business_categories").delete().eq("id", x.dataset.delcat), "Removed.")) refresh(); }));
    $$("[data-mv]").forEach((x) => x.addEventListener("click", async () => {
      const i = top.findIndex((c) => c.id === x.dataset.id), j = i + Number(x.dataset.mv);
      const a = top[i], b = top[j]; if (!b) return;
      await db.from("business_categories").update({ sort_order: b.sort_order }).eq("id", a.id);
      await db.from("business_categories").update({ sort_order: a.sort_order === b.sort_order ? a.sort_order + 1 : a.sort_order }).eq("id", b.id);
      refresh();
    }));
  }

  function featured() {
    const live = S.biz.filter((b) => b.status === "approved");
    const feat = live.filter((b) => b.featured_until && b.featured_until >= today());
    const paidFeat = S.subs.filter((s) => ["active", "complimentary"].includes(s.status) && s.starts_on <= today() && s.ends_on >= today() && ["premium", "elite"].includes(s.package_slug));
    V().innerHTML = `<p class="bd-fine">Premium and Elite listings are featured automatically (Elite also on the directory homepage). You can also feature any approved listing until a date, under <b>All businesses → More…</b>. All featured placements are labelled for readers.</p>
      <h3>Featured by package</h3>${paidFeat.length ? table(["Business", "Package", "Until"], paidFeat.map((s) => [esc(bizName(s.business_id)), esc(s.package_slug), esc(D.date(s.ends_on))])) : '<p class="bd-muted">None.</p>'}
      <h3>Featured by IMMA Media</h3>${feat.length ? table(["Business", "Until", ""], feat.map((b) => [esc(b.name), esc(D.date(b.featured_until)), `<button class="bd-link" data-unfeat="${b.id}">Stop</button>`])) : '<p class="bd-muted">None.</p>'}`;
    $$("[data-unfeat]").forEach((x) => x.addEventListener("click", async () => { if (await run(db.from("businesses").update({ featured_until: null }).eq("id", x.dataset.unfeat), "Stopped.")) refresh(); }));
  }

  // ---------- Packages & discount codes ----------
  function packages() {
    const flags = [["allow_links", "Website & social"], ["allow_hours", "Opening hours"], ["allow_catalogue", "Catalogue"], ["allow_map", "Map"], ["allow_offers", "Offers"], ["allow_video", "Video"], ["featured_category", "Featured in category"], ["featured_home", "Featured on homepage"], ["priority_search", "Sponsored search row"], ["premium_design", "Premium design"], ["highlight", "Highlight as popular"], ["active", "Active"]];
    V().innerHTML = S.pk.map((p) => `<form class="bd-form bd-item" data-pk="${esc(p.slug)}" style="margin-bottom:12px"><h3 style="margin:0">${esc(p.name)} <small>(${esc(p.slug)})</small></h3>
        <div class="bd-row3"><label>Name<input name="name" value="${esc(p.name)}"></label><label>Monthly price (KSh)<input name="price_monthly_kes" type="number" min="0" value="${Number(p.price_monthly_kes)}"></label><label>Annual discount %<input name="annual_discount_pct" type="number" min="0" max="90" value="${Number(p.annual_discount_pct)}"></label></div>
        <div class="bd-row3"><label>Photos shown<input name="max_photos" type="number" min="0" value="${p.max_photos}"></label><label>Analytics<select name="analytics_level">${["none", "basic", "detailed"].map((x) => `<option${p.analytics_level === x ? " selected" : ""}>${x}</option>`).join("")}</select></label><label>Sort<input name="sort_order" type="number" value="${p.sort_order}"></label></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px 16px">${flags.map(([k, t]) => `<label class="bd-check"><input type="checkbox" name="${k}"${p[k] ? " checked" : ""}> ${t}</label>`).join("")}</div>
        <label>Benefits (one per line)<textarea name="benefits" rows="5">${esc((p.benefits || []).join("\n"))}</textarea></label>
        <button class="bd-btn bd-btn-sm" type="submit">Save ${esc(p.name)}</button></form>`).join("") + `
      <h2>Discount and founding-business codes</h2>
      <form class="bd-form" id="bd-code"><div class="bd-row3"><label>Code<input name="code" required pattern="[A-Za-z0-9-]{3,30}" style="text-transform:uppercase"></label><label>% off<input name="pct" type="number" min="0" max="100"></label><label>KSh off<input name="amt" type="number" min="0"></label></div>
        <div class="bd-row3"><label>Valid from<input name="from" type="date"></label><label>Valid to<input name="to" type="date"></label><label>Max uses<input name="max" type="number" min="1"></label></div>
        <div class="bd-row3"><label>Billing<select name="billing"><option value="">Both</option><option>monthly</option><option>annual</option></select></label><label>Description<input name="desc" maxlength="120"></label><label class="bd-check"><input type="checkbox" name="founding"> Founding-business offer</label></div>
        <button class="bd-btn bd-btn-sm" type="submit">Create code</button></form>
      ${S.codes.length ? table(["Code", "Discount", "Valid", "Used", "Active"], S.codes.map((c) => [`<b>${esc(c.code)}</b>${c.founding ? " · founding" : ""}<br><small>${esc(c.description || "")}</small>`, `${c.percent_off ? Number(c.percent_off) + "%" : ""} ${c.amount_off_kes ? kes(c.amount_off_kes) : ""}`, `${esc(c.valid_from || "…")} – ${esc(c.valid_to || "…")}`, `${c.used_count}${c.max_uses ? " / " + c.max_uses : ""}`, `<input type="checkbox" data-code="${esc(c.code)}"${c.active ? " checked" : ""}>`])) : ""}`;
    $$("[data-pk]").forEach((f) => f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const row = { name: f.name.value, price_monthly_kes: Number(f.price_monthly_kes.value), annual_discount_pct: Number(f.annual_discount_pct.value), max_photos: Number(f.max_photos.value), analytics_level: f.analytics_level.value, sort_order: Number(f.sort_order.value), benefits: f.benefits.value.split("\n").map((x) => x.trim()).filter(Boolean), updated_at: new Date().toISOString() };
      flags.forEach(([k]) => (row[k] = f[k].checked));
      if (await run(db.from("business_packages").update(row).eq("slug", f.dataset.pk), "Package saved.")) refresh();
    }));
    $("#bd-code").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target;
      if (!f.pct.value && !f.amt.value) return toast("Give a % or KSh discount.", true);
      if (await run(db.from("business_discount_codes").insert({ code: f.code.value.toUpperCase(), percent_off: f.pct.value || null, amount_off_kes: f.amt.value || null, valid_from: f.from.value || null, valid_to: f.to.value || null, max_uses: f.max.value || null, billing: f.billing.value || null, description: f.desc.value || null, founding: f.founding.checked }), "Code created.")) refresh();
    });
    $$("[data-code]").forEach((x) => x.addEventListener("change", () => run(db.from("business_discount_codes").update({ active: x.checked }).eq("code", x.dataset.code), "Saved.")));
  }

  // ---------- Payments & invoices ----------
  function payments() {
    const pend = S.pays.filter((p) => p.status === "pending_verification");
    const awaiting = S.subs.filter((s) => s.status === "pending_payment");
    V().innerHTML = `<h2>Payments to verify</h2>
      ${pend.length ? table(["Business", "Method", "Reference", "Amount", "Reported", ""], pend.map((p) => [esc(bizName(p.business_id)), esc(p.method.replace(/_/g, " ")), `<b>${esc(p.reference)}</b>${p.payer_phone ? "<br>" + esc(p.payer_phone) : ""}`, kes(p.amount_kes), esc(D.date(p.created_at)),
        `<button class="bd-btn bd-btn-sm" data-pay="confirmed" data-id="${p.id}">Confirm</button> <button class="bd-btn bd-btn-sm bd-btn-ghost" data-pay="rejected" data-id="${p.id}">Reject</button>`])) : '<p class="bd-muted">Nothing to verify. Check each reference against your M-Pesa or bank statement before confirming.</p>'}
      <h2>Awaiting payment: record a manual payment</h2>
      ${awaiting.length ? table(["Business", "Package", "Amount", "Invoice", "Record"], awaiting.map((s) => { const inv = S.inv.find((i) => i.subscription_id === s.id) || {}; return [esc(bizName(s.business_id)), `${esc(s.package_slug)} (${esc(s.billing)})`, kes(s.amount_kes), inv.id ? `<a href="/business-directory/invoice.html?id=${inv.id}" target="_blank" rel="noopener">${esc(inv.number)}</a>` : "",
        `<form data-rec="${s.id}" style="display:flex;gap:4px;flex-wrap:wrap"><select name="m"><option value="mpesa_manual">M-Pesa</option><option value="bank_transfer">Bank</option><option value="cash">Cash</option><option value="other">Other</option></select><input name="ref" placeholder="Reference" required minlength="4" style="width:9em"><input name="amt" type="number" value="${Number(s.amount_kes)}" style="width:7em"><button class="bd-btn bd-btn-sm">Record & confirm</button></form>`]; })) : '<p class="bd-muted">No unpaid subscriptions.</p>'}
      <h2>Invoices</h2><p><button class="bd-btn bd-btn-ghost bd-btn-sm" id="bd-inv-csv">Export CSV</button></p>
      ${S.inv.length ? table(["Number", "Business", "Amount", "Status", "Issued", "Paid"], S.inv.map((i) => [`<a href="/business-directory/invoice.html?id=${i.id}" target="_blank" rel="noopener">${esc(i.number)}</a>`, esc(bizName(i.business_id)), kes(i.amount_kes), pill(i.status), esc(D.date(i.issued_at)), esc(D.date(i.paid_at))])) : '<p class="bd-muted">No invoices yet.</p>'}
      <p class="bd-fine">Card payments and M-Pesa STK Push need a payment provider connected through a Supabase Edge Function with server-side keys. Until then, payments are checked by hand.</p>`;
    $$("[data-pay]").forEach((x) => x.addEventListener("click", async () => {
      let note = null; if (x.dataset.pay === "rejected") { note = prompt("Why? (shown to the owner)"); if (note === null) return; }
      if (await run(db.from("business_payments").update({ status: x.dataset.pay, note }).eq("id", x.dataset.id), "Saved.")) refresh();
    }));
    $$("[data-rec]").forEach((f) => f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (await run(db.from("business_payments").insert({ subscription_id: f.dataset.rec, method: f.m.value, reference: f.ref.value, amount_kes: Number(f.amt.value), status: "confirmed" }), "Payment recorded; package activated.")) refresh();
    }));
    $("#bd-inv-csv").addEventListener("click", () => csv(S.inv.map((i) => ({ number: i.number, business: bizName(i.business_id), description: i.description, list_price: i.list_price_kes, discount: i.discount_kes, amount: i.amount_kes, status: i.status, issued: i.issued_at, paid: i.paid_at, receipt: i.receipt_number })), `directory-invoices-${today()}.csv`));
  }

  // ---------- Reviews, reports, enquiries, promotions ----------
  function reviews() {
    const order = { pending: 0, approved: 1, hidden: 2, rejected: 3 };
    const list = S.reviews.slice().sort((a, b) => order[a.status] - order[b.status]);
    V().innerHTML = `<p class="bd-fine">Approve genuine reviews, positive or negative. Reject fake, paid, abusive or off-topic reviews and anything sharing personal information. Never remove a review because a business pays or asks.</p>
      ${list.length ? table(["Business", "Review", "By", "Status", ""], list.map((r) => [esc(bizName(r.business_id)), `${D.stars(r.rating)} <b>${esc(r.title || "")}</b><br>${esc(r.body)}`, `${esc(r.reviewer_name || "")}<br><small>${esc(D.date(r.created_at))}</small>`, pill(r.status),
        `${r.status !== "approved" ? `<button class="bd-btn bd-btn-sm" data-rv="approved" data-id="${r.id}">Approve</button>` : ""} ${r.status !== "rejected" ? `<button class="bd-btn bd-btn-sm bd-btn-ghost" data-rv="rejected" data-id="${r.id}">Reject</button>` : ""} ${r.status === "approved" ? `<button class="bd-btn bd-btn-sm bd-btn-ghost" data-rv="hidden" data-id="${r.id}">Hide</button>` : ""}`])) : '<p class="bd-muted">No reviews yet.</p>'}`;
    $$("[data-rv]").forEach((x) => x.addEventListener("click", async () => {
      let note = null; if (x.dataset.rv !== "approved") { note = prompt("Reason (kept in the audit log):"); if (note === null) return; }
      if (await run(db.from("business_reviews").update({ status: x.dataset.rv, moderation_note: note }).eq("id", x.dataset.id), "Saved.")) refresh();
    }));
  }
  function reports() {
    V().innerHTML = S.reports.length ? table(["About", "Reason", "Details", "Contact", "Status", ""], S.reports.map((r) => [r.business_id ? esc(bizName(r.business_id)) : "Review " + esc((S.reviews.find((x) => x.id === r.review_id) || {}).title || ""), esc(r.reason.replace(/_/g, " ")), esc(r.details || ""), esc(r.contact || ""), pill(r.status) + (r.admin_note ? `<br><small>${esc(r.admin_note)}</small>` : ""),
      r.status === "open" ? `<button class="bd-btn bd-btn-sm" data-rp="resolved" data-id="${r.id}">Resolved</button> <button class="bd-btn bd-btn-sm bd-btn-ghost" data-rp="dismissed" data-id="${r.id}">Dismiss</button>` : ""])) : '<p class="bd-muted">No reports.</p>';
    $$("[data-rp]").forEach((x) => x.addEventListener("click", async () => { const note = prompt("What did you do? (optional)"); if (note === null) return; if (await run(db.from("business_reports").update({ status: x.dataset.rp, admin_note: note || null }).eq("id", x.dataset.id), "Saved.")) refresh(); }));
  }
  function enquiries() {
    V().innerHTML = `<p class="bd-fine">Enquiries go to the business; this list is for monitoring abuse and volumes. Use personal details only for that purpose.</p>` + (S.enq.length ? table(["Received", "Business", "From", "Message", "Status"], S.enq.map((q) => [esc(D.date(q.created_at)), esc(bizName(q.business_id)), esc(q.name), esc(q.message.slice(0, 200)), pill(q.status)])) : '<p class="bd-muted">No enquiries yet.</p>');
  }
  function promotions() {
    V().innerHTML = S.promos.length ? table(["Business", "Offer", "Dates", "Status", ""], S.promos.map((p) => [esc(bizName(p.business_id)), `<b>${esc(p.title)}</b><br>${esc(p.description || "")}`, `${esc(D.date(p.starts_on))} – ${esc(D.date(p.ends_on))}`, pill(!p.active ? "hidden" : p.ends_on < today() ? "expired" : "active"), p.active ? `<button class="bd-link" data-hidepromo="${p.id}">Hide (misleading)</button>` : ""])) : '<p class="bd-muted">No promotions.</p>';
    $$("[data-hidepromo]").forEach((x) => x.addEventListener("click", async () => { if (await run(db.from("business_promotions").update({ active: false }).eq("id", x.dataset.hidepromo), "Hidden.")) refresh(); }));
  }
  function revenue() {
    const months = {};
    S.pays.filter((p) => p.status === "confirmed").forEach((p) => { const m = (p.verified_at || p.created_at).slice(0, 7); months[m] = (months[m] || 0) + Number(p.amount_kes); });
    const byPkg = {}; S.subs.filter((s) => s.status === "active").forEach((s) => (byPkg[s.package_slug] = (byPkg[s.package_slug] || 0) + 1));
    V().innerHTML = `<div class="bd-kpis"><div class="bd-kpi"><b>${kes(S.kpi.mrr || 0)}</b><span>Monthly recurring revenue</span></div><div class="bd-kpi"><b>${kes(S.kpi.revenue || 0)}</b><span>Total confirmed payments</span></div>${Object.entries(byPkg).map(([k, n]) => `<div class="bd-kpi"><b>${n}</b><span>Active ${esc(k)}</span></div>`).join("")}</div>
      <div class="bd-chart"><canvas id="bd-rev"></canvas></div>
      ${Object.keys(months).length ? table(["Month", "Confirmed payments"], Object.entries(months).sort().reverse().map(([m, v]) => [esc(m), kes(v)])) : '<p class="bd-muted">No confirmed payments yet.</p>'}
      <p><button class="bd-btn bd-btn-ghost bd-btn-sm" id="bd-rev-csv">Export payments CSV</button></p>`;
    if (window.Chart && Object.keys(months).length) new Chart($("#bd-rev"), { type: "bar", data: { labels: Object.keys(months).sort(), datasets: [{ label: "KSh", data: Object.keys(months).sort().map((m) => months[m]), backgroundColor: "#04163a" }] }, options: { responsive: true, maintainAspectRatio: false } });
    $("#bd-rev-csv").addEventListener("click", () => csv(S.pays.map((p) => ({ date: p.created_at, business: bizName(p.business_id), method: p.method, reference: p.reference, amount: p.amount_kes, status: p.status, verified_at: p.verified_at })), `directory-payments-${today()}.csv`));
  }

  // ---------- CSV import (authorised listings only) ----------
  function importCsv() {
    V().innerHTML = `<p>Import listings that the businesses themselves supplied, or that come from a source whose licence allows reuse. <b>Do not import data copied from Google Maps, other directories or social media.</b></p>
      <p class="bd-fine">Columns: <code>name, category, county, town, neighbourhood, phone, whatsapp, email, website, description</code>. <code>category</code> is a category address such as <code>bakeries</code>; <code>county</code> is like <code>nairobi</code> or <code>homa-bay</code>. Imported listings are created as <b>drafts</b>, marked claimable, so you can check each one before approving.</p>
      <form class="bd-form" id="bd-imp" style="max-width:640px"><label>CSV file<input type="file" name="f" accept=".csv,text/csv" required></label>
        <label>Where did this information come from?<input name="src" required maxlength="300" placeholder="e.g. Forms completed by the businesses at the Thika SME fair, 20 Nov 2026"></label>
        <label class="bd-check"><input type="checkbox" required> I confirm the businesses supplied this information or the source permits its reuse, and it contains no private home addresses.</label>
        <button class="bd-btn" type="submit">Import</button></form><pre id="bd-imp-out" class="bd-fine" style="white-space:pre-wrap"></pre>`;
    $("#bd-imp").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = e.target, out = $("#bd-imp-out");
      const text = await f.f.files[0].text();
      const rows = parseCsv(text); const head = rows.shift().map((h) => h.trim().toLowerCase());
      let ok = 0; const errs = [];
      for (const [n, r] of rows.entries()) {
        const o = Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()]));
        if (!o.name) continue;
        const cat = S.cats.find((c) => c.slug === o.category);
        if (!D.COUNTIES.find((c) => c[0] === o.county)) { errs.push(`Row ${n + 2} (${o.name}): unknown county "${o.county}"`); continue; }
        const b = await db.from("businesses").insert({ name: o.name, category_id: cat ? cat.id : null, description: o.description || null, phone: o.phone || null, whatsapp: o.whatsapp || null, email: o.email || null, website: o.website || null, status: "draft", claimable: true, source_note: f.src.value }).select().single();
        if (b.error) { errs.push(`Row ${n + 2} (${o.name}): ${friendly(b.error)}`); continue; }
        const l = await db.from("business_locations").insert({ business_id: b.data.id, county: o.county, town: o.town || D.countyName(o.county), neighbourhood: o.neighbourhood || null });
        if (l.error) errs.push(`Row ${n + 2} (${o.name}) location: ${friendly(l.error)}`);
        ok++;
      }
      out.textContent = `Imported ${ok} draft listing(s).${errs.length ? "\n\nProblems:\n" + errs.join("\n") : ""}`;
      await loadAll();
    });
  }
  function parseCsv(t) {
    const rows = []; let row = [], cell = "", q = false;
    t = t.replace(/^﻿/, "");
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true; else if (ch === ",") { row.push(cell); cell = ""; } else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }

  function settings() {
    V().innerHTML = `<h2>Payment details</h2><p>The M-Pesa Paybill/Till, bank details and payment instructions shown on directory invoices are shared with advertising. Edit them in <a href="/ads-admin.html#settings">Advertising admin → Settings</a>.</p>
      <h2>Publishing pages to Google</h2><p>Approved listings appear on the site straight away. Their search-friendly pages (business profiles plus category, county and town pages) and the sitemap are built by <code>node tools/build_directory.js</code>, then committed and pushed. Run it after approving listings.</p>
      <h2>Expiry</h2><p>Paid packages that pass their end date fall back to Free automatically; this screen also marks them expired each time it opens.</p>
      <h2>Not connected yet</h2><ul><li>Card payments and M-Pesa STK Push (needs a payment provider and a Supabase Edge Function holding the keys)</li><li>Email/SMS renewal reminders and enquiry alerts (needs a messaging service)</li></ul>`;
  }
  function audit() {
    V().innerHTML = S.audit.length ? table(["When", "Action", "What", "Details"], S.audit.map((a) => [esc(D.date(a.created_at)) + "<br><small>" + esc(new Date(a.created_at).toLocaleTimeString("en-GB")) + "</small>", esc(a.action), esc(a.entity) + "<br><small>" + esc(a.entity === "business" ? bizName(a.entity_id) : a.entity_id || "") + "</small>", `<small>${esc(JSON.stringify(a.details || {}).slice(0, 240))}</small>`])) : '<p class="bd-muted">No activity yet.</p>';
  }
})();
