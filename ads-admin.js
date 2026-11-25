// IMMA News — Advertising Management (admins only).
// Access is enforced by Supabase row-level security (profiles.role = 'admin');
// this page only hides itself from everyone else.
(() => {
  const A = window.IMMA_AUTH, U = window.ADS_UI;
  const { esc, kes, date, badge } = U;
  const $ = (s) => document.querySelector(s);
  const panel = $("#panel"), dlg = $("#dlg");
  if (!A || !A.configured) { $("#loading").textContent = "Supabase is not configured."; return; }
  const db = A.client;
  const S = { user: null, view: "overview", chart: null, charts: [], placements: [], packages: [], advertisers: [], campaigns: [], payments: [], invoices: [], enquiries: [], settings: [], codes: [] };
  const placement = (k) => S.placements.find((p) => p.key === k) || { name: k };
  const adv = (id) => S.advertisers.find((a) => a.id === id);
  const advName = (c) => c.is_house ? "IMMA Media (house)" : (adv(c.advertiser_id) || {}).business_name || "—";
  const categories = () => [...new Set([...(typeof NEWS !== "undefined" ? NEWS : []).map((n) => n.category), "Public Services", "Health", "Travel", "Education"])].sort();
  const toast = (msg, kind) => { const d = document.createElement("div"); d.className = "notice " + (kind || "ok"); d.textContent = msg; d.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;max-width:420px;box-shadow:0 10px 30px rgba(0,0,0,.2)"; document.body.appendChild(d); setTimeout(() => d.remove(), 4500); };
  const fail = (e) => toast(U.friendlyError(e), "bad");

  A.onChange(async (user) => {
    S.user = user;
    if (!user) { location.replace("signin.html?next=ads-admin.html"); return; }
    const { data: isAdmin, error } = await db.rpc("is_admin");
    $("#loading").hidden = true;
    if (error || !isAdmin) {
      $("#denied").hidden = false;
      $("#denied-msg").innerHTML = error
        ? "The advertising database is not set up yet. Run <code>supabase/advertising.sql</code> in the Supabase SQL Editor."
        : "This page is for IMMA Media administrators. Ask an administrator to set your role to <b>admin</b> in the Supabase <i>profiles</i> table.";
      return;
    }
    $("#dash").hidden = false;
    try {
      const r = await db.rpc("ad_run_schedule");
      $("#sched").textContent = r.data ? `Schedule checked: ${r.data.expired} campaign(s) expired, ${r.data.reminders} reminder(s).` : "";
    } catch (e) {}
    await loadAll();
    go("overview");
  });

  async function loadAll() {
    const q = await Promise.all([
      db.from("ad_placements").select("*").order("sort_order"),
      db.from("ad_packages").select("*").order("sort_order"),
      db.from("advertisers").select("*").order("created_at", { ascending: false }),
      db.from("ad_campaigns").select("*, ad_creatives(*)").order("created_at", { ascending: false }),
      db.from("ad_payments").select("*").order("created_at", { ascending: false }),
      db.from("ad_invoices").select("*").order("issued_at", { ascending: false }),
      db.from("ad_enquiries").select("*").order("created_at", { ascending: false }),
      db.from("ad_settings").select("*").order("key"),
      db.from("ad_discount_codes").select("*").order("created_at", { ascending: false })
    ]);
    const bad = q.find((r) => r.error);
    if (bad) fail(bad.error);
    [S.placements, S.packages, S.advertisers, S.campaigns, S.payments, S.invoices, S.enquiries, S.settings, S.codes] = q.map((r) => r.data || []);
    $("#c-appr").textContent = S.campaigns.filter((c) => c.status === "submitted").length || "";
    $("#c-pay").textContent = S.payments.filter((p) => p.status === "pending_verification").length || "";
    $("#c-enq").textContent = S.enquiries.filter((e) => e.status === "new").length || "";
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (b) go(b.dataset.go, b.dataset.arg);
    if (e.target.closest("[data-close]")) dlg.close();
    const o = e.target.closest("[data-camp]");
    if (o) { e.preventDefault(); openCampaign(o.dataset.camp); }
  });
  function go(view, arg) {
    S.view = view;
    document.querySelectorAll(".dash-nav button").forEach((b) => b.classList.toggle("on", b.dataset.go === view));
    S.charts.forEach((c) => c.destroy()); S.charts = [];
    const fn = { overview, approvals, campaigns, sponsored, advertisers, payments, revenue, analytics, placements, packages, discounts, enquiries, audit, settings, create }[view] || overview;
    fn(arg);
  }
  async function refresh(view) { await loadAll(); go(view || S.view); }
  const table = (head, rows, empty) => rows.length
    ? `<div class="table-wrap"><table class="dtable"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
    : `<p class="empty-state">${empty || "Nothing here yet."}</p>`;
  const isLive = (c) => U.displayStatus(c) === "live";
  const confirmedPays = () => S.payments.filter((p) => p.status === "confirmed");
  const monthKey = (d) => String(d).slice(0, 7);
  function chart(canvas, cfg) { if (!window.Chart || !canvas) return; S.charts.push(new Chart(canvas, cfg)); }

  // ---------- Overview ----------
  async function overview() {
    const t = U.today(), m = t.slice(0, 7);
    const revenue = confirmedPays().reduce((n, p) => n + Number(p.amount_kes), 0);
    const monthRev = confirmedPays().filter((p) => monthKey(p.verified_at || p.created_at) === m).reduce((n, p) => n + Number(p.amount_kes), 0);
    const active = S.campaigns.filter(isLive);
    const pending = S.campaigns.filter((c) => c.status === "submitted");
    const expiring = S.campaigns.filter((c) => c.status === "approved" && c.end_date >= t && c.end_date <= U.addDays(t, 7));
    const outstanding = S.invoices.filter((i) => i.status === "unpaid").reduce((n, i) => n + Number(i.amount_kes), 0);
    const util = S.placements.filter((p) => p.is_active).map((p) => {
      const n = S.campaigns.filter((c) => c.placement_key === p.key && !c.is_house && isLive(c)).length;
      return { p, n, pct: Math.round(100 * n / p.max_concurrent) };
    });
    const totalSlots = util.reduce((n, u) => n + u.p.max_concurrent, 0), used = util.reduce((n, u) => n + Math.min(u.n, u.p.max_concurrent), 0);
    panel.innerHTML = `
      <div class="kpis">
        <div class="kpi gold"><small>Total ad revenue</small><b>${esc(kes(revenue))}</b></div>
        <div class="kpi"><small>Revenue this month</small><b>${esc(kes(monthRev))}</b></div>
        <div class="kpi"><small>Active campaigns</small><b>${active.length}</b></div>
        <div class="kpi"><small>Pending adverts</small><b>${pending.length}</b></div>
        <div class="kpi"><small>Expiring in 7 days</small><b>${expiring.length}</b></div>
        <div class="kpi"><small>Outstanding payments</small><b>${esc(kes(outstanding))}</b></div>
        <div class="kpi"><small>Views (30 days)</small><b id="o-imp">…</b></div>
        <div class="kpi"><small>Clicks (30 days)</small><b id="o-clk">…</b></div>
        <div class="kpi"><small>Average CTR</small><b id="o-ctr">…</b></div>
        <div class="kpi"><small>Inventory used</small><b>${totalSlots ? Math.round(100 * used / totalSlots) : 0}%</b></div>
      </div>
      <div class="card"><h2>Revenue by month (confirmed payments)</h2><div class="chart-box"><canvas id="o-rev"></canvas></div></div>
      <div class="card"><h2>Inventory utilisation (live paid adverts)</h2>
        ${table(["Placement", "Live", "Capacity", "Used"], util.map((u) => `<tr><td>${esc(u.p.name)}</td><td>${u.n}</td><td>${u.p.max_concurrent}</td><td><div style="background:var(--soft);border-radius:99px;height:10px;width:140px"><div style="background:var(--accent);height:10px;border-radius:99px;width:${Math.min(100, u.pct)}%"></div></div> ${u.pct}%</td></tr>`))}</div>
      <div class="card"><h2>Expiring soon</h2>
        ${table(["Campaign", "Advertiser", "Ends"], expiring.map((c) => `<tr class="clickable" data-camp="${c.id}"><td>${esc(c.name)}</td><td>${esc(advName(c))}</td><td>${esc(date(c.end_date))}</td></tr>`), "No campaigns end in the next 7 days.")}</div>
      <div class="card"><h2>Admin notifications</h2><div id="o-notes" class="muted">Loading…</div></div>`;
    // revenue chart (last 12 months)
    const months = []; const d0 = new Date(t + "T00:00:00Z"); for (let i = 11; i >= 0; i--) { const d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() - i, 1)); months.push(d.toISOString().slice(0, 7)); }
    chart($("#o-rev"), { type: "bar", data: { labels: months.map((x) => new Date(x + "-01T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "2-digit" })),
      datasets: [{ label: "KSh", data: months.map((x) => confirmedPays().filter((p) => monthKey(p.verified_at || p.created_at) === x).reduce((n, p) => n + Number(p.amount_kes), 0)), backgroundColor: "#f5b003" }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
    const { data: rows } = await db.rpc("ad_stats", { p_from: U.addDays(t, -29), p_to: t, p_campaign: null });
    const tot = (rows || []).reduce((a, r) => ({ i: a.i + Number(r.impressions), c: a.c + Number(r.clicks) }), { i: 0, c: 0 });
    if (S.view !== "overview") return;
    $("#o-imp").textContent = U.num(tot.i); $("#o-clk").textContent = U.num(tot.c); $("#o-ctr").textContent = U.pct(tot.c, tot.i);
    const { data: notes } = await db.from("ad_notifications").select("*").eq("audience", "admin").order("created_at", { ascending: false }).limit(12);
    const box = $("#o-notes"); if (!box) return;
    box.innerHTML = (notes || []).map((n) => `<div class="notif"><b>${esc(n.title)}</b><span>${esc(n.body || "")}</span><time>${esc(U.dateTime(n.created_at))}</time></div>`).join("") || "No notifications.";
  }

  // ---------- Approvals ----------
  function approvals() {
    const list = S.campaigns.filter((c) => c.status === "submitted");
    panel.innerHTML = `<div class="card"><h2>Pending approvals</h2>
      <p class="muted small">Check the artwork, the link and the content rules. Approving also approves the artwork. The advert goes live on its start date once payment is confirmed (or if you mark it complimentary).</p>
      ${list.map((c) => {
        const cr = (c.ad_creatives || [])[0] || {}; const p = placement(c.placement_key);
        return `<div class="card" style="margin-top:14px">
          <div class="card-head"><h3>${esc(c.name)} <span class="muted small">· ${esc(advName(c))}</span></h3>${badge(c.payment_status)}</div>
          <p class="small">${esc(p.name)}${c.categories ? " · " + esc(c.categories.join(", ")) : ""} · ${esc(date(c.start_date))} – ${esc(date(c.end_date))} · <b>${esc(kes(c.total_kes))}</b>${c.discount_code ? " (code " + esc(c.discount_code) + ")" : ""}</p>
          ${c.kind === "sponsored"
            ? `<div class="preview-box"><h3>${esc(cr.headline || "")}</h3><div class="small" style="white-space:pre-wrap;max-height:220px;overflow:auto">${esc(cr.body || "")}</div>${cr.image_path ? `<img class="thumb" src="${esc(U.publicUrl(cr.image_path))}" alt="">` : ""}</div>`
            : `<div class="preview-wrap"><div class="preview-box"><small>Desktop</small>${U.slotPreview(p, U.publicUrl(cr.image_path), false, cr.alt_text)}</div><div class="preview-box"><small>Phone</small>${U.slotPreview(p, U.publicUrl(cr.mobile_image_path || cr.image_path), true)}</div></div>`}
          <p class="small">Link: ${cr.destination_url ? `<a href="${esc(cr.destination_url)}" target="_blank" rel="noopener nofollow"><u>${esc(cr.destination_url)}</u></a> <span class="muted">(open carefully — check it is safe)</span>` : "none"}</p>
          <div class="cta-buttons"><button class="btn-gold btn-sm" data-approve="${c.id}">Approve</button><button class="btn-danger" data-reject="${c.id}">Reject…</button><button class="btn-outline btn-sm" data-camp="${c.id}">Details</button></div>
        </div>`; }).join("") || `<p class="empty-state">No adverts waiting for approval.</p>`}</div>`;
    panel.querySelectorAll("[data-approve]").forEach((b) => b.addEventListener("click", () => approve(b.dataset.approve)));
    panel.querySelectorAll("[data-reject]").forEach((b) => b.addEventListener("click", () => reject(b.dataset.reject)));
  }
  async function approve(id) {
    const c = S.campaigns.find((x) => x.id === id);
    const r1 = await db.from("ad_creatives").update({ status: "approved" }).eq("campaign_id", id);
    if (r1.error) return fail(r1.error);
    const r2 = await db.from("ad_campaigns").update({ status: "approved", rejection_reason: null }).eq("id", id);
    if (r2.error) { await db.from("ad_creatives").update({ status: "pending" }).eq("campaign_id", id); return fail(r2.error); }
    toast(`Approved "${c.name}".`);
    refresh();
  }
  async function reject(id) {
    const reason = prompt("Why is this advert being rejected? The advertiser will see this note.");
    if (reason == null) return;
    const r1 = await db.from("ad_campaigns").update({ status: "rejected", rejection_reason: reason.trim() || null }).eq("id", id);
    if (r1.error) return fail(r1.error);
    await db.from("ad_creatives").update({ status: "rejected", review_note: reason.trim() || null }).eq("campaign_id", id);
    toast("Rejected. The advertiser has been notified.");
    refresh();
  }

  // ---------- Campaigns ----------
  let campFilter = "all";
  function campaigns() {
    const f = {
      all: () => true, live: isLive, scheduled: (c) => U.displayStatus(c) === "scheduled", unpaid: (c) => c.status === "approved" && ["unpaid", "pending_verification"].includes(c.payment_status),
      submitted: (c) => c.status === "submitted", paused: (c) => c.status === "paused", ended: (c) => ["expired", "terminated", "rejected"].includes(c.status), house: (c) => c.is_house, draft: (c) => c.status === "draft"
    };
    const list = S.campaigns.filter(f[campFilter]);
    panel.innerHTML = `<div class="card"><div class="card-head"><h2>Campaigns</h2><div class="cta-buttons"><button class="btn-outline btn-sm" id="csv-camp">Export CSV</button><button class="btn-gold btn-sm" data-go="create">+ Create advert</button></div></div>
      <div class="tabs">${Object.keys(f).map((k) => `<button data-f="${k}" class="${k === campFilter ? "on" : ""}">${k[0].toUpperCase() + k.slice(1)} (${S.campaigns.filter(f[k]).length})</button>`).join("")}</div>
      ${table(["Campaign", "Advertiser", "Placement", "Dates", "Total", "Status", "Payment", "Priority / weight"], list.map((c) => `<tr class="clickable" data-camp="${c.id}">
        <td><b>${esc(c.name)}</b>${c.complimentary ? " <span class='badge waived'>Free</span>" : ""}</td><td>${esc(advName(c))}</td><td>${esc(placement(c.placement_key).name)}</td>
        <td>${esc(date(c.start_date))} – ${esc(date(c.end_date))}</td><td>${esc(kes(c.total_kes))}</td><td>${badge(U.displayStatus(c))}</td><td>${badge(c.payment_status)}</td><td>${c.priority} / ${c.weight}</td></tr>`))}</div>`;
    panel.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => { campFilter = b.dataset.f; campaigns(); }));
    $("#csv-camp").addEventListener("click", () => U.csv(list.map((c) => ({ id: c.id, name: c.name, advertiser: advName(c), placement: c.placement_key, categories: (c.categories || []).join("; "),
      start: c.start_date, end: c.end_date, months: c.months, list_price_kes: c.list_price_kes, discount_kes: c.discount_kes, total_kes: c.total_kes, status: c.status, payment: c.payment_status,
      complimentary: c.complimentary, house: c.is_house, priority: c.priority, weight: c.weight, created: c.created_at })), `imma-campaigns-${U.today()}.csv`));
  }

  function sponsored() {
    const list = S.campaigns.filter((c) => c.kind === "sponsored");
    panel.innerHTML = `<div class="card"><h2>Sponsored articles</h2><p class="muted small">Sponsored articles appear in the homepage feed labelled "Sponsored Content", for 30 days from their start date, once approved and paid (or included in a paid package).</p>
      ${table(["Headline", "Advertiser", "Starts", "Status", "Payment"], list.map((c) => { const cr = (c.ad_creatives || [])[0] || {};
        return `<tr class="clickable" data-camp="${c.id}"><td><b>${esc(cr.headline || c.name)}</b></td><td>${esc(advName(c))}</td><td>${esc(date(c.start_date))}</td><td>${badge(U.displayStatus(c))}</td><td>${badge(c.payment_status)}</td></tr>`; }))}</div>`;
  }

  async function openCampaign(id) {
    const c = S.campaigns.find((x) => x.id === id); if (!c) return;
    const cr = (c.ad_creatives || [])[0] || {}; const p = placement(c.placement_key); const inv = S.invoices.find((i) => i.campaign_id === id);
    const pays = S.payments.filter((x) => x.campaign_id === id);
    $("#dlg-title").textContent = c.name;
    $("#dlg-body").innerHTML = `
      <div>${badge(U.displayStatus(c))} ${badge(c.payment_status)} ${c.complimentary ? badge("waived") : ""}</div>
      <dl class="kv"><dt>Advertiser</dt><dd>${esc(advName(c))}</dd><dt>Created</dt><dd>${esc(U.dateTime(c.created_at))}</dd>
        ${c.approved_at ? `<dt>Approved</dt><dd>${esc(U.dateTime(c.approved_at))}</dd>` : ""}${inv ? `<dt>Invoice</dt><dd><a href="invoice.html?id=${inv.id}" target="_blank"><u>${esc(inv.number)}</u></a> ${badge(inv.status)}</dd>` : ""}
        ${c.rejection_reason ? `<dt>Rejection note</dt><dd>${esc(c.rejection_reason)}</dd>` : ""}<dt>Link</dt><dd>${esc(cr.destination_url || "—")}</dd></dl>
      ${c.kind === "sponsored" ? `<div class="preview-box"><h3>${esc(cr.headline || "")}</h3><div class="small" style="white-space:pre-wrap;max-height:200px;overflow:auto">${esc(cr.body || "")}</div></div>`
        : `<div class="preview-box">${U.slotPreview(p, U.publicUrl(cr.image_path), false, cr.alt_text)}</div>`}
      <form class="cform" id="ce-form">
        <div class="form-grid">
          <div class="field"><label>Placement</label><select name="placement_key">${S.placements.map((x) => `<option value="${x.key}" ${x.key === c.placement_key ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
          <div class="field"><label>Start date</label><input type="date" name="start_date" value="${c.start_date}"></div>
          <div class="field"><label>Months</label><input type="number" name="months" min="1" max="12" value="${c.months}"></div>
          <div class="field"><label>Total price (KSh)</label><input type="number" name="total_kes" min="0" step="1" value="${Number(c.total_kes || 0)}"></div>
          <div class="field"><label>Priority (higher shows first)</label><input type="number" name="priority" min="-10" max="100" value="${c.priority}"></div>
          <div class="field"><label>Rotation weight (1–100)</label><input type="number" name="weight" min="1" max="100" value="${c.weight}"></div>
          <div class="field full"><label>Sections (category banner only, comma-separated; empty = all)</label><input name="categories" value="${esc((c.categories || []).join(", "))}" placeholder="${esc(categories().join(", "))}"></div>
          <label class="check full"><input type="checkbox" name="complimentary" ${c.complimentary ? "checked" : ""}> Complimentary (no payment needed)</label>
        </div>
        <button class="btn-outline btn-sm" type="submit">Save changes</button>
      </form>
      <div class="cta-buttons">
        ${["submitted", "rejected", "paused", "draft"].includes(c.status) ? `<button class="btn-gold btn-sm" data-st="approved">${c.status === "paused" ? "Resume" : "Approve"}</button>` : ""}
        ${c.status === "approved" ? `<button class="btn-outline btn-sm" data-st="paused">Pause</button>` : ""}
        ${c.status === "submitted" ? `<button class="btn-danger" data-st="rejected">Reject…</button>` : ""}
        ${["approved", "paused"].includes(c.status) ? `<button class="btn-danger" data-st="terminated">Terminate</button>` : ""}
        ${c.payment_status !== "paid" && c.total_kes > 0 ? `<button class="btn-outline btn-sm" data-pay>Record payment</button>` : ""}
      </div>
      ${pays.length ? table(["Date", "Method", "Reference", "Amount", "Status"], pays.map((x) => `<tr><td>${esc(date(x.created_at))}</td><td>${esc(x.method)}</td><td>${esc(x.reference)}</td><td>${esc(kes(x.amount_kes))}</td><td>${badge(x.status)}</td></tr>`)) : ""}
      <div id="ce-stats" class="muted small">Loading performance…</div>`;
    if (!dlg.open) dlg.showModal();
    $("#ce-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      const cats = String(d.categories || "").split(",").map((s) => s.trim()).filter(Boolean);
      const row = { placement_key: d.placement_key, start_date: d.start_date, months: Number(d.months), total_kes: Number(d.total_kes), priority: Number(d.priority),
        weight: Number(d.weight), categories: cats.length ? cats : null, complimentary: !!d.complimentary };
      if (!row.complimentary && c.complimentary && c.payment_status === "waived" && row.total_kes > 0) row.payment_status = "unpaid";
      const r = await db.from("ad_campaigns").update(row).eq("id", id);
      if (r.error) return fail(r.error);
      toast("Saved."); await loadAll(); openCampaign(id); go(S.view);
    });
    $("#dlg-body").querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", async () => {
      const st = b.dataset.st;
      if (st === "rejected") { dlg.close(); return reject(id); }
      if (st === "terminated" && !confirm("Terminate this campaign? It will stop showing immediately.")) return;
      if (st === "approved") { const r0 = await db.from("ad_creatives").update({ status: "approved" }).eq("campaign_id", id); if (r0.error) return fail(r0.error); }
      const r = await db.from("ad_campaigns").update({ status: st }).eq("id", id);
      if (r.error) return fail(r.error);
      toast("Updated."); await loadAll(); openCampaign(id); go(S.view);
    }));
    const pb = $("#dlg-body [data-pay]"); if (pb) pb.addEventListener("click", () => recordPayment(c));
    const { data: rows } = await db.rpc("ad_stats", { p_from: c.start_date, p_to: U.today(), p_campaign: id });
    const t = (rows || []).reduce((a, r) => ({ i: a.i + Number(r.impressions), c: a.c + Number(r.clicks) }), { i: 0, c: 0 });
    const box = $("#ce-stats"); if (box) box.innerHTML = `Views <b>${U.num(t.i)}</b> · Clicks <b>${U.num(t.c)}</b> · CTR <b>${U.pct(t.c, t.i)}</b>`;
  }

  function recordPayment(c) {
    $("#dlg-title").textContent = "Record payment — " + c.name;
    $("#dlg-body").innerHTML = `<form class="cform" id="rp-form"><div class="form-grid">
      <div class="field"><label>Method</label><select name="method"><option value="mpesa_manual">M-Pesa</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="other">Other</option></select></div>
      <div class="field"><label>Reference *</label><input name="reference" required maxlength="60" style="text-transform:uppercase"></div>
      <div class="field"><label>Amount (KSh) *</label><input name="amount_kes" type="number" min="1" value="${Number(c.total_kes)}"></div>
      <div class="field"><label>Note</label><input name="note" maxlength="200"></div></div>
      <p class="small muted">Recording a payment here marks it confirmed. Only do this after checking your M-Pesa or bank statement.</p>
      <button class="btn-gold" type="submit">Record confirmed payment</button></form>`;
    if (!dlg.open) dlg.showModal();
    $("#rp-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      const r = await db.from("ad_payments").insert({ campaign_id: c.id, method: d.method, reference: d.reference, amount_kes: Number(d.amount_kes), note: d.note || null, status: "confirmed" });
      if (r.error) return fail(r.error);
      dlg.close(); toast("Payment recorded."); refresh();
    });
  }

  // ---------- Create advert (manual / house / complimentary) ----------
  function create() {
    panel.innerHTML = `<form class="card cform" id="cr-form" novalidate><h2>Create an advert</h2>
      <p class="muted small">For businesses that book by phone, for complimentary adverts, or for IMMA Media's own promotions (house adverts do not use up advertiser inventory).</p>
      <div class="form-grid">
        <div class="field"><label>Advertiser</label><select name="advertiser"><option value="house">IMMA Media — house promotion</option>${S.advertisers.map((a) => `<option value="${a.id}">${esc(a.business_name)}</option>`).join("")}</select></div>
        <div class="field"><label>Campaign name *</label><input name="name" required maxlength="120"></div>
        <div class="field"><label>Placement</label><select name="placement_key" id="cr-pl">${S.placements.map((p) => `<option value="${p.key}">${esc(p.name)}${p.width ? ` (${p.width}×${p.height})` : ""}</option>`).join("")}</select></div>
        <div class="field"><label>Start date</label><input type="date" name="start_date" value="${U.today()}"></div>
        <div class="field"><label>Months</label><input type="number" name="months" min="1" max="12" value="1"></div>
        <div class="field"><label>Price (KSh, empty = list price)</label><input type="number" name="total_kes" min="0"></div>
        <div class="field"><label>Priority</label><input type="number" name="priority" value="0"></div>
        <div class="field"><label>Weight</label><input type="number" name="weight" min="1" max="100" value="1"></div>
        <div class="field full"><label>Sections (comma-separated, empty = all)</label><input name="categories" placeholder="${esc(categories().join(", "))}"></div>
        <label class="check"><input type="checkbox" name="complimentary"> Complimentary (no payment)</label>
        <label class="check"><input type="checkbox" name="approve" checked> Approve now</label>
        <div class="field"><label>Image (display adverts)</label><input type="file" name="img" accept="image/jpeg,image/png,image/webp,image/gif"></div>
        <div class="field"><label>Phone image (optional)</label><input type="file" name="mimg" accept="image/jpeg,image/png,image/webp,image/gif"></div>
        <div class="field"><label>Link</label><input name="url" type="url" placeholder="https://"></div>
        <div class="field"><label>Image description</label><input name="alt" maxlength="200"></div>
        <div class="field full"><label>Sponsored article headline</label><input name="headline" maxlength="140"></div>
        <div class="field full"><label>Sponsored article text</label><textarea name="body" rows="6" maxlength="12000"></textarea></div>
      </div>
      <div class="form-status" id="cr-status" hidden></div>
      <button class="btn-gold" type="submit">Create advert</button></form>`;
    $("#cr-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, d = Object.fromEntries(new FormData(f)), st = $("#cr-status");
      const show = (k, m) => { st.className = "form-status " + k; st.textContent = m; st.hidden = false; };
      const house = d.advertiser === "house", sponsoredKind = d.placement_key === "sponsored_article";
      const img = f.img.files[0], mimg = f.mimg.files[0];
      if (!d.name.trim()) return show("error", "Add a campaign name.");
      if (!sponsoredKind && !img) return show("error", "Upload the advert image.");
      if (sponsoredKind && (!d.headline.trim() || !d.body.trim())) return show("error", "Add the sponsored article headline and text.");
      for (const fl of [img, mimg]) { if (fl) { const chk = await U.checkImage(fl); if (!chk.ok) return show("error", chk.msg); } }
      show("info", "Creating…");
      const cats = String(d.categories || "").split(",").map((s) => s.trim()).filter(Boolean);
      const row = { name: d.name.trim(), advertiser_id: house ? null : d.advertiser, is_house: house, placement_key: d.placement_key, start_date: d.start_date,
        months: Number(d.months) || 1, priority: Number(d.priority) || 0, weight: Number(d.weight) || 1, categories: cats.length ? cats : null,
        complimentary: !!d.complimentary || house, total_kes: d.total_kes === "" ? null : Number(d.total_kes), status: "draft" };
      const r = await db.from("ad_campaigns").insert(row).select().single();
      if (r.error) return show("error", U.friendlyError(r.error));
      const id = r.data.id;
      try {
        const up = async (file, nm) => { const ext = file.name.split(".").pop().toLowerCase(); const path = `${S.user.id}/admin/${id}/${nm}-${Date.now()}.${ext}`;
          const u = await db.storage.from("ad-creatives").upload(path, file, { contentType: file.type, cacheControl: "31536000" }); if (u.error) throw u.error; return path; };
        const cre = { campaign_id: id, destination_url: d.url || null, alt_text: d.alt || null, headline: sponsoredKind ? d.headline.trim() : null, body: sponsoredKind ? d.body.trim() : null,
          image_path: img ? await up(img, sponsoredKind ? "article" : "desktop") : null, mobile_image_path: mimg ? await up(mimg, "mobile") : null, status: d.approve ? "approved" : "pending" };
        const r2 = await db.from("ad_creatives").insert(cre); if (r2.error) throw r2.error;
        if (d.approve) { const r3 = await db.from("ad_campaigns").update({ status: "approved" }).eq("id", id); if (r3.error) throw r3.error; }
        toast("Advert created."); await loadAll(); go("campaigns"); openCampaign(id);
      } catch (err) { show("error", U.friendlyError(err) + " (The campaign was saved as a draft — open it from Campaigns.)"); await loadAll(); }
    });
  }

  // ---------- Advertisers ----------
  function advertisers() {
    panel.innerHTML = `<div class="card"><div class="card-head"><h2>Advertisers</h2><div class="cta-buttons"><button class="btn-outline btn-sm" id="csv-adv">Export CSV</button><button class="btn-gold btn-sm" id="new-adv">+ Add advertiser</button></div></div>
      ${table(["Business", "Contact", "Phone", "Category", "Campaigns", "Status"], S.advertisers.map((a) => `<tr class="clickable" data-adv="${a.id}"><td><b>${esc(a.business_name)}</b></td><td>${esc(a.contact_name)}<br><small>${esc(a.email)}</small></td>
        <td>${esc(a.phone)}</td><td>${esc(a.category || "")}</td><td>${S.campaigns.filter((c) => c.advertiser_id === a.id).length}</td><td>${a.is_blocked ? badge("blocked") : badge("approved").replace("Approved", "Active")}</td></tr>`))}</div>`;
    panel.querySelectorAll("[data-adv]").forEach((r) => r.addEventListener("click", () => editAdvertiser(r.dataset.adv)));
    $("#new-adv").addEventListener("click", () => editAdvertiser(null));
    $("#csv-adv").addEventListener("click", () => U.csv(S.advertisers.map(({ id, business_name, contact_name, email, phone, website, category, billing_name, kra_pin, is_blocked, created_at }) =>
      ({ id, business_name, contact_name, email, phone, website, category, billing_name, kra_pin, is_blocked, created_at })), `imma-advertisers-${U.today()}.csv`));
  }
  function editAdvertiser(id) {
    const a = id ? adv(id) : { business_name: "", contact_name: "", email: "", phone: "" };
    $("#dlg-title").textContent = id ? a.business_name : "Add advertiser";
    const f = (k, l, t) => `<div class="field"><label>${l}</label><input name="${k}" type="${t || "text"}" value="${esc(a[k] || "")}"></div>`;
    $("#dlg-body").innerHTML = `<form class="cform" id="adv-form"><div class="form-grid">
      ${f("business_name", "Business name *")}${f("contact_name", "Contact *")}${f("email", "Email *", "email")}${f("phone", "Phone *", "tel")}${f("website", "Website", "url")}${f("category", "Category")}
      ${f("billing_name", "Billing name")}${f("kra_pin", "KRA PIN")}
      <div class="field full"><label>Billing address</label><textarea name="billing_address" rows="2">${esc(a.billing_address || "")}</textarea></div>
      <div class="field full"><label>Admin notes (private)</label><textarea name="admin_notes" rows="2">${esc(a.admin_notes || "")}</textarea></div>
      ${id ? `<label class="check"><input type="checkbox" name="is_blocked" ${a.is_blocked ? "checked" : ""}> Blocked (adverts stop showing)</label>
      <div class="field"><label>Block reason</label><input name="blocked_reason" value="${esc(a.blocked_reason || "")}"></div>` : ""}
      </div><button class="btn-gold" type="submit">Save</button></form>
      ${id ? `<p class="small muted">Account created ${esc(U.dateTime(a.created_at))}${a.user_id ? " by the advertiser (signed in with Google)" : " by an administrator"}. Terms accepted: ${esc(U.dateTime(a.terms_accepted_at))}.</p>` : ""}`;
    if (!dlg.open) dlg.showModal();
    $("#adv-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      const row = {}; ["business_name", "contact_name", "email", "phone", "website", "category", "billing_name", "kra_pin", "billing_address", "admin_notes", "blocked_reason"].forEach((k) => { if (k in d) row[k] = String(d[k]).trim() || null; });
      if (id) row.is_blocked = !!d.is_blocked; else row.terms_accepted_at = null;
      const r = id ? await db.from("advertisers").update(row).eq("id", id) : await db.from("advertisers").insert(row);
      if (r.error) return fail(r.error);
      dlg.close(); toast("Saved."); refresh("advertisers");
    });
  }

  // ---------- Payments & invoices ----------
  function payments() {
    const pend = S.payments.filter((p) => p.status === "pending_verification");
    const camp = (id) => S.campaigns.find((c) => c.id === id) || {};
    panel.innerHTML = `
      <div class="card"><h2>Payments to verify</h2><p class="muted small">Check each reference against your M-Pesa or bank statement before confirming. A campaign is marked paid once confirmed payments cover its total.</p>
        ${table(["Reported", "Campaign", "Advertiser", "Method", "Reference", "Amount", "Due", ""], pend.map((p) => { const c = camp(p.campaign_id);
          return `<tr><td>${esc(U.dateTime(p.created_at))}</td><td>${esc(c.name || "")}</td><td>${esc(advName(c))}</td><td>${p.method === "mpesa_manual" ? "M-Pesa" : "Bank"}</td><td><b>${esc(p.reference)}</b>${p.payer_phone ? "<br><small>" + esc(p.payer_phone) + "</small>" : ""}</td><td>${esc(kes(p.amount_kes))}</td><td>${esc(kes(c.total_kes))}</td>
          <td class="row-actions"><button class="btn-gold btn-sm" data-ok="${p.id}">Confirm</button><button class="btn-danger" data-no="${p.id}">Reject</button></td></tr>`; }), "No payments waiting.")}</div>
      <div class="card"><div class="card-head"><h2>Invoices</h2><button class="btn-outline btn-sm" id="csv-inv">Export CSV</button></div>
        ${table(["Number", "Campaign", "Advertiser", "Issued", "Amount", "Status", ""], S.invoices.map((i) => { const c = camp(i.campaign_id);
          return `<tr><td><a href="invoice.html?id=${i.id}" target="_blank"><u>${esc(i.number)}</u></a></td><td>${esc(c.name || "")}</td><td>${esc(advName(c))}</td><td>${esc(date(i.issued_at))}</td><td>${esc(kes(i.amount_kes))}</td><td>${badge(i.status)}</td>
          <td class="row-actions">${i.status === "unpaid" ? `<button class="btn-outline btn-sm" data-rec="${i.campaign_id}">Record payment</button><button class="btn-danger" data-void="${i.id}">Void</button>` : ""}</td></tr>`; }), "No invoices yet.")}</div>
      <div class="card"><h2>All payments</h2>${table(["Date", "Campaign", "Method", "Reference", "Amount", "Status"], S.payments.map((p) => `<tr><td>${esc(date(p.created_at))}</td><td>${esc(camp(p.campaign_id).name || "")}</td><td>${esc(p.method)}</td><td>${esc(p.reference)}</td><td>${esc(kes(p.amount_kes))}</td><td>${badge(p.status)}</td></tr>`))}</div>`;
    panel.querySelectorAll("[data-ok]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Confirm this payment? Only do this after checking your statement.")) return;
      const r = await db.from("ad_payments").update({ status: "confirmed" }).eq("id", b.dataset.ok); if (r.error) return fail(r.error); toast("Payment confirmed."); refresh();
    }));
    panel.querySelectorAll("[data-no]").forEach((b) => b.addEventListener("click", async () => {
      const note = prompt("Why can't this payment be verified? (shown to the advertiser)"); if (note == null) return;
      const r = await db.from("ad_payments").update({ status: "rejected", note: note || null }).eq("id", b.dataset.no); if (r.error) return fail(r.error); toast("Payment rejected."); refresh();
    }));
    panel.querySelectorAll("[data-rec]").forEach((b) => b.addEventListener("click", () => recordPayment(S.campaigns.find((c) => c.id === b.dataset.rec))));
    panel.querySelectorAll("[data-void]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Void this invoice?")) return;
      const r = await db.from("ad_invoices").update({ status: "void" }).eq("id", b.dataset.void); if (r.error) return fail(r.error);
      toast("Invoice voided."); refresh();
    }));
    $("#csv-inv").addEventListener("click", () => U.csv(S.invoices.map((i) => ({ number: i.number, campaign: (camp(i.campaign_id).name || ""), advertiser: advName(camp(i.campaign_id)), issued: i.issued_at, amount_kes: i.amount_kes, status: i.status, paid_at: i.paid_at, receipt: i.receipt_number })), `imma-invoices-${U.today()}.csv`));
  }

  // ---------- Revenue ----------
  function revenue() {
    const pays = confirmedPays();
    const byMonth = {}; const byPl = {};
    pays.forEach((p) => { const m = monthKey(p.verified_at || p.created_at); byMonth[m] = (byMonth[m] || 0) + Number(p.amount_kes);
      const c = S.campaigns.find((x) => x.id === p.campaign_id); const k = c ? placement(c.placement_key).name : "—"; byPl[k] = (byPl[k] || 0) + Number(p.amount_kes); });
    const months = Object.keys(byMonth).sort();
    panel.innerHTML = `
      <div class="kpis"><div class="kpi gold"><small>Total confirmed</small><b>${esc(kes(pays.reduce((n, p) => n + Number(p.amount_kes), 0)))}</b></div>
        <div class="kpi"><small>Outstanding invoices</small><b>${esc(kes(S.invoices.filter((i) => i.status === "unpaid").reduce((n, i) => n + Number(i.amount_kes), 0)))}</b></div>
        <div class="kpi"><small>Complimentary campaigns</small><b>${S.campaigns.filter((c) => c.complimentary && !c.is_house).length}</b></div></div>
      <div class="card"><div class="card-head"><h2>Revenue by month</h2><button class="btn-outline btn-sm" id="csv-rev">Export CSV</button></div>
        <div class="chart-box"><canvas id="rv-chart"></canvas></div>
        ${table(["Month", "Revenue"], months.reverse().map((m) => `<tr><td>${esc(m)}</td><td>${esc(kes(byMonth[m]))}</td></tr>`), "No confirmed payments yet.")}</div>
      <div class="card"><h2>Revenue by placement</h2>${table(["Placement", "Revenue"], Object.entries(byPl).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(kes(v))}</td></tr>`))}</div>`;
    const asc = Object.keys(byMonth).sort();
    chart($("#rv-chart"), { type: "bar", data: { labels: asc, datasets: [{ label: "KSh", data: asc.map((m) => byMonth[m]), backgroundColor: "#0b4fa8" }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } } } });
    $("#csv-rev").addEventListener("click", () => U.csv(pays.map((p) => { const c = S.campaigns.find((x) => x.id === p.campaign_id) || {};
      return { confirmed: p.verified_at, campaign: c.name, advertiser: advName(c), placement: c.placement_key, method: p.method, reference: p.reference, amount_kes: p.amount_kes }; }), `imma-revenue-${U.today()}.csv`));
  }

  // ---------- Analytics ----------
  async function analytics() {
    panel.innerHTML = `<div class="card"><h2>Advert analytics</h2><div class="toolbar">
        <div class="field"><label>From</label><input type="date" id="a-from" value="${U.addDays(U.today(), -29)}"></div>
        <div class="field"><label>To</label><input type="date" id="a-to" value="${U.today()}"></div>
        <div class="field"><label>Campaign</label><select id="a-camp"><option value="">All</option>${S.campaigns.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
        <button class="btn-outline btn-sm" id="a-csv">Export CSV</button></div></div>
      <div class="kpis" id="a-kpis"></div>
      <div class="card"><h2>Daily</h2><div class="chart-box"><canvas id="a-chart"></canvas></div></div>
      <div class="card"><h2>By placement</h2><div id="a-pl"></div></div>
      <div class="card"><h2>By campaign</h2><div id="a-cp"></div></div>
      <p class="small muted">First-party counts. Views need ≥50% visibility for 1 second; bots, repeat views within 30 minutes and repeat clicks are excluded.</p>`;
    let rows = [];
    const run = async () => {
      const from = $("#a-from").value, to = $("#a-to").value;
      const r = await db.rpc("ad_stats", { p_from: from, p_to: to, p_campaign: $("#a-camp").value || null });
      if (r.error) return fail(r.error);
      rows = r.data || [];
      const sum = (f) => rows.filter(f).reduce((a, x) => ({ i: a.i + Number(x.impressions), c: a.c + Number(x.clicks) }), { i: 0, c: 0 });
      const t = sum(() => true), dk = sum((x) => x.device === "desktop"), mb = sum((x) => x.device === "mobile");
      $("#a-kpis").innerHTML = `<div class="kpi gold"><small>Views</small><b>${U.num(t.i)}</b></div><div class="kpi"><small>Clicks</small><b>${U.num(t.c)}</b></div><div class="kpi"><small>CTR</small><b>${U.pct(t.c, t.i)}</b></div>
        <div class="kpi"><small>Desktop CTR</small><b>${U.pct(dk.c, dk.i)}</b></div><div class="kpi"><small>Phone CTR</small><b>${U.pct(mb.c, mb.i)}</b></div>`;
      const days = []; for (let d = from; d <= to; d = U.addDays(d, 1)) days.push(d);
      S.charts.forEach((c) => c.destroy()); S.charts = [];
      chart($("#a-chart"), { type: "line", data: { labels: days, datasets: [
        { label: "Desktop views", data: days.map((d) => sum((x) => x.day === d && x.device === "desktop").i), borderColor: "#0b4fa8", tension: .3 },
        { label: "Phone views", data: days.map((d) => sum((x) => x.day === d && x.device === "mobile").i), borderColor: "#1e7bff", borderDash: [5, 4], tension: .3 },
        { label: "Clicks", data: days.map((d) => sum((x) => x.day === d).c), borderColor: "#f5b003", tension: .3, yAxisID: "y1" }] },
        options: { maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, scales: { y: { beginAtZero: true }, y1: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false } } } } });
      const group = (key, label) => { const g = {}; rows.forEach((x) => { const k = x[key]; g[k] = g[k] || { i: 0, c: 0 }; g[k].i += Number(x.impressions); g[k].c += Number(x.clicks); });
        return table([label, "Views", "Clicks", "CTR"], Object.entries(g).sort((a, b) => b[1].i - a[1].i).map(([k, v]) => `<tr><td>${esc(key === "campaign_id" ? (S.campaigns.find((c) => c.id === k) || {}).name : placement(k).name)}</td><td>${U.num(v.i)}</td><td>${U.num(v.c)}</td><td>${U.pct(v.c, v.i)}</td></tr>`), "No data for these dates."); };
      $("#a-pl").innerHTML = group("placement_key", "Placement");
      $("#a-cp").innerHTML = group("campaign_id", "Campaign");
    };
    ["#a-from", "#a-to", "#a-camp"].forEach((s) => $(s).addEventListener("change", run));
    $("#a-csv").addEventListener("click", () => U.csv(rows.map((r) => ({ ...r, campaign: (S.campaigns.find((c) => c.id === r.campaign_id) || {}).name })), `imma-ad-analytics-${U.today()}.csv`));
    run();
  }

  // ---------- Placements ----------
  function placements() {
    panel.innerHTML = `<div class="card"><h2>Placements &amp; prices</h2><p class="muted small">"Capacity" is how many adverts rotate in a space at once; bookings beyond it are refused. "Promo when empty" shows the IMMA "Your brand belongs here" banner in unsold spaces.</p>
      ${table(["Placement", "Size", "Price (KSh)", "Unit", "Capacity", "Promo when empty", "On sale", ""], S.placements.map((p) => `<tr data-pl="${p.key}">
        <td><input data-k="name" value="${esc(p.name)}" style="width:190px"></td><td>${p.width ? p.width + "×" + p.height : "Article"}</td>
        <td><input data-k="price_kes" type="number" min="0" value="${Number(p.price_kes)}" style="width:100px"></td><td>${esc(p.price_unit)}</td>
        <td><input data-k="max_concurrent" type="number" min="1" max="20" value="${p.max_concurrent}" style="width:60px"></td>
        <td><input data-k="house_when_vacant" type="checkbox" ${p.house_when_vacant ? "checked" : ""}></td><td><input data-k="is_active" type="checkbox" ${p.is_active ? "checked" : ""}></td>
        <td><button class="btn-outline btn-sm" data-save-pl="${p.key}">Save</button></td></tr>`))}</div>`;
    panel.querySelectorAll("[data-save-pl]").forEach((b) => b.addEventListener("click", async () => {
      const tr = b.closest("tr"), row = {};
      tr.querySelectorAll("[data-k]").forEach((i) => { row[i.dataset.k] = i.type === "checkbox" ? i.checked : i.type === "number" ? Number(i.value) : i.value; });
      const r = await db.from("ad_placements").update(row).eq("key", b.dataset.savePl); if (r.error) return fail(r.error);
      toast("Placement saved."); refresh("placements");
    }));
  }

  // ---------- Packages ----------
  function packages() {
    panel.innerHTML = `<div class="card"><div class="card-head"><h2>Packages</h2><button class="btn-gold btn-sm" id="pk-new">+ New package</button></div>
      ${S.packages.map((p) => pkgForm(p)).join("")}</div>`;
    $("#pk-new").addEventListener("click", () => { panel.querySelector(".card").insertAdjacentHTML("beforeend", pkgForm({ slug: "", name: "", price_kes: 0, duration_months: 1, placement_keys: [], sponsored_articles: 0, benefits: [], is_available: false, sort_order: S.packages.length + 1 })); bindPkg(); });
    bindPkg();
  }
  function pkgForm(p) {
    return `<form class="card cform" data-pkg="${p.id || ""}" style="margin-top:12px"><div class="form-grid">
      <div class="field"><label>Name</label><input name="name" value="${esc(p.name)}" required></div>
      <div class="field"><label>Short code (slug)</label><input name="slug" value="${esc(p.slug)}" required pattern="[a-z0-9-]+"></div>
      <div class="field"><label>Price (KSh)</label><input name="price_kes" type="number" min="0" value="${Number(p.price_kes)}"></div>
      <div class="field"><label>Duration (months)</label><input name="duration_months" type="number" min="1" max="12" value="${p.duration_months}"></div>
      <div class="field"><label>Included sponsored articles</label><input name="sponsored_articles" type="number" min="0" value="${p.sponsored_articles}"></div>
      <div class="field"><label>Order</label><input name="sort_order" type="number" value="${p.sort_order}"></div>
      <div class="field full"><label>Placements the advertiser can choose</label><div class="toolbar">${S.placements.filter((x) => x.key !== "sponsored_article").map((x) => `<label class="check"><input type="checkbox" name="pl" value="${x.key}" ${(p.placement_keys || []).includes(x.key) ? "checked" : ""}> ${esc(x.name)}</label>`).join("")}</div></div>
      <div class="field full"><label>Benefits (one per line)</label><textarea name="benefits" rows="4">${esc((p.benefits || []).join("\n"))}</textarea></div>
      <label class="check"><input type="checkbox" name="is_available" ${p.is_available ? "checked" : ""}> Available to buy</label>
      <label class="check"><input type="checkbox" name="highlight" ${p.highlight ? "checked" : ""}> Show as "Recommended"</label>
      </div><button class="btn-outline btn-sm" type="submit">Save ${esc(p.name || "package")}</button></form>`;
  }
  function bindPkg() {
    panel.querySelectorAll("form[data-pkg]").forEach((f) => { if (f.dataset.bound) return; f.dataset.bound = 1; f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(f), id = f.dataset.pkg;
      const row = { name: fd.get("name").trim(), slug: fd.get("slug").trim().toLowerCase(), price_kes: Number(fd.get("price_kes")), duration_months: Number(fd.get("duration_months")),
        sponsored_articles: Number(fd.get("sponsored_articles")), sort_order: Number(fd.get("sort_order")), placement_keys: fd.getAll("pl"),
        benefits: String(fd.get("benefits")).split("\n").map((s) => s.trim()).filter(Boolean), is_available: !!fd.get("is_available"), highlight: !!fd.get("highlight") };
      if (!row.placement_keys.length) return toast("Choose at least one placement.", "bad");
      const r = id ? await db.from("ad_packages").update(row).eq("id", id) : await db.from("ad_packages").insert(row);
      if (r.error) return fail(r.error); toast("Package saved."); refresh("packages");
    }); });
  }

  // ---------- Discount codes ----------
  function discounts() {
    panel.innerHTML = `<form class="card cform" id="dc-form"><h2>New discount code</h2><div class="form-grid">
        <div class="field"><label>Code *</label><input name="code" required maxlength="30" style="text-transform:uppercase"></div>
        <div class="field"><label>Description</label><input name="description" maxlength="120"></div>
        <div class="field"><label>Percent off</label><input name="percent_off" type="number" min="1" max="100"></div>
        <div class="field"><label>or KSh off</label><input name="amount_off" type="number" min="1"></div>
        <div class="field"><label>Valid from</label><input name="valid_from" type="date"></div>
        <div class="field"><label>Valid to</label><input name="valid_to" type="date"></div>
        <div class="field"><label>Maximum uses</label><input name="max_uses" type="number" min="1"></div></div>
        <button class="btn-gold btn-sm" type="submit">Create code</button></form>
      <div class="card"><h2>Codes</h2>${table(["Code", "Discount", "Valid", "Used", "Active", ""], S.codes.map((d) => `<tr><td><b>${esc(d.code)}</b><br><small>${esc(d.description || "")}</small></td>
        <td>${d.percent_off ? Number(d.percent_off) + "%" : esc(kes(d.amount_off))}</td><td>${esc(d.valid_from ? date(d.valid_from) : "—")} – ${esc(d.valid_to ? date(d.valid_to) : "—")}</td>
        <td>${d.times_used}${d.max_uses ? " / " + d.max_uses : ""}</td><td>${d.is_active ? badge("live") : badge("paused")}</td>
        <td><button class="btn-outline btn-sm" data-toggle="${d.id}" data-on="${d.is_active}">${d.is_active ? "Deactivate" : "Activate"}</button></td></tr>`))}</div>`;
    $("#dc-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      if (!!d.percent_off === !!d.amount_off) return toast("Enter either a percentage or an amount, not both.", "bad");
      const row = { code: d.code.trim().toUpperCase(), description: d.description || null, percent_off: d.percent_off ? Number(d.percent_off) : null, amount_off: d.amount_off ? Number(d.amount_off) : null,
        valid_from: d.valid_from || null, valid_to: d.valid_to || null, max_uses: d.max_uses ? Number(d.max_uses) : null };
      const r = await db.from("ad_discount_codes").insert(row); if (r.error) return fail(r.error); toast("Code created."); refresh("discounts");
    });
    panel.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", async () => {
      const r = await db.from("ad_discount_codes").update({ is_active: b.dataset.on !== "true" }).eq("id", b.dataset.toggle); if (r.error) return fail(r.error); refresh("discounts");
    }));
  }

  // ---------- Enquiries ----------
  function enquiries() {
    panel.innerHTML = `<div class="card"><div class="card-head"><h2>Advertising enquiries</h2><button class="btn-outline btn-sm" id="csv-enq">Export CSV</button></div>
      ${table(["Received", "From", "Contact", "Interest / budget", "Message", "Status"], S.enquiries.map((q) => `<tr><td>${esc(U.dateTime(q.created_at))}</td><td><b>${esc(q.name)}</b><br><small>${esc(q.business_name || "")}</small></td>
        <td>${q.phone ? `<a href="https://wa.me/${esc(q.phone.replace(/\D/g, "").replace(/^0/, "254"))}" target="_blank" rel="noopener"><u>${esc(q.phone)}</u></a><br>` : ""}${q.email ? `<a href="mailto:${esc(q.email)}"><u>${esc(q.email)}</u></a>` : ""}</td>
        <td>${esc(q.interest || "—")}<br><small>${esc(q.budget || "")}</small></td><td style="max-width:320px;white-space:pre-wrap">${esc(q.message)}</td>
        <td><select data-enq="${q.id}">${["new", "contacted", "closed"].map((s) => `<option ${s === q.status ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`), "No enquiries yet.")}</div>`;
    panel.querySelectorAll("[data-enq]").forEach((s) => s.addEventListener("change", async () => {
      const r = await db.from("ad_enquiries").update({ status: s.value }).eq("id", s.dataset.enq); if (r.error) return fail(r.error); toast("Updated."); loadAll();
    }));
    $("#csv-enq").addEventListener("click", () => U.csv(S.enquiries.map(({ ip_hash, ...r }) => r), `imma-ad-enquiries-${U.today()}.csv`));
  }

  // ---------- Audit ----------
  async function audit() {
    const { data, error } = await db.from("ad_audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) return fail(error);
    panel.innerHTML = `<div class="card"><h2>Audit log</h2><p class="muted small">Approvals, rejections, payment decisions, blocks and campaign changes made by administrators.</p>
      ${table(["When", "Action", "Item", "Details"], (data || []).map((l) => `<tr><td>${esc(U.dateTime(l.created_at))}</td><td>${esc(l.action)}</td><td>${esc(l.entity)}</td><td><small>${esc(JSON.stringify(l.details || {}))}</small></td></tr>`))}</div>`;
  }

  // ---------- Settings ----------
  function settings() {
    panel.innerHTML = `<form class="card cform" id="set-form"><h2>Settings</h2>
      ${S.settings.map((s) => `<div class="field"><label>${esc(s.label || s.key)}</label>${s.value.length > 60 || /instructions|details|footer/.test(s.key) ? `<textarea name="${esc(s.key)}" rows="3">${esc(s.value)}</textarea>` : `<input name="${esc(s.key)}" value="${esc(s.value)}">`}</div>`).join("")}
      <p class="small muted">These are shown publicly to advertisers (payment details, invoice text). Never put passwords or API keys here.</p>
      <button class="btn-gold" type="submit">Save settings</button></form>
      <div class="card"><h2>Automatic payments</h2><p class="muted">M-Pesa STK Push and card payments need a secure server function (for example a Supabase Edge Function) holding your Safaricom Daraja or card-provider keys. They are not switched on, so payments are verified manually. See <code>ADVERTISING-SETUP.md</code>.</p></div>`;
    $("#set-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      for (const [key, value] of Object.entries(d)) {
        const cur = S.settings.find((s) => s.key === key);
        if (cur && cur.value === value) continue;
        const r = await db.from("ad_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key); if (r.error) return fail(r.error);
      }
      toast("Settings saved."); refresh("settings");
    });
  }
})();
