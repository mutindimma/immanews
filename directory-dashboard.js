// IMMA Business Directory — business owner dashboard (/business-directory/dashboard.html)
(() => {
  const D = window.IMMA_DIR, A = window.IMMA_AUTH;
  const { esc, kes } = D;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const db = A && A.client;
  const root = $("#bd-dash");
  const params = new URLSearchParams(location.search);
  const S = { list: [], biz: null, tab: params.get("tab") || "overview", pkg: "free", packages: [], settings: {}, chart: null };
  const friendly = (e) => { const m = String((e && (e.message || e.details)) || e || "Something went wrong."); return /row-level|permission/i.test(m) ? "You don't have permission to do that." : /business_payments_ref/i.test(m) ? "That payment reference has already been used." : m.replace(/^.*?ERROR:\s*/, ""); };
  const toast = (msg, bad) => { const d = document.createElement("div"); d.className = "bd-status " + (bad ? "bad" : "ok"); d.textContent = msg; d.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;max-width:420px;box-shadow:0 10px 30px rgba(0,0,0,.2)"; document.body.appendChild(d); setTimeout(() => d.remove(), 5000); };
  const pill = (s) => `<span class="bd-pill ${esc(s)}">${esc(String(s).replace(/_/g, " "))}</span>`;
  const today = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

  if (!db) { root.innerHTML = '<p class="bd-empty">The directory is not available right now.</p>'; return; }

  A.onChange(async (user) => {
    if (!user) { root.innerHTML = `<div class="bd-empty"><h3>Sign in to manage your businesses</h3><p><a class="bd-btn" href="/signin.html?next=${encodeURIComponent("/business-directory/dashboard.html")}">Sign in with Google</a></p></div>`; return; }
    const [own, pk, st] = await Promise.all([
      db.from("business_owners").select("business_id, role, businesses(*)").eq("user_id", user.id),
      db.from("business_packages").select("*").order("sort_order"),
      db.from("ad_settings").select("key,value")
    ]);
    S.list = (own.data || []).map((r) => Object.assign({ role: r.role }, r.businesses)).filter((b) => b && b.id).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    S.packages = pk.data || [];
    (st.data || []).forEach((r) => (S.settings[r.key] = r.value));
    const want = params.get("b");
    if (want && S.list.find((b) => b.id === want)) return open(want);
    home();
  });

  // ---------- All my businesses + saved businesses ----------
  async function home() {
    S.biz = null;
    const { data: favs } = await db.from("business_favourites").select("business_id, created_at").order("created_at", { ascending: false });
    let saved = [];
    if (favs && favs.length) { const r = await db.from("dir_businesses").select("*").in("id", favs.map((f) => f.business_id)); saved = r.data || []; }
    const { data: claims } = await db.from("business_claims").select("id,status,created_at,admin_note,business_id").order("created_at", { ascending: false });
    root.innerHTML = `
      <div class="bd-sec-head"><div><h1 style="margin:0">My businesses</h1><p>Manage your IMMA Business Directory listings.</p></div><a class="bd-btn bd-btn-gold" href="/business-directory/register.html">+ Add a business</a></div>
      ${S.list.length ? `<div class="bd-mybiz">${S.list.map((b) => `<div class="bd-mybiz-row">
          <span class="bd-logo">${b.logo_path ? `<img src="${esc(D.media(b.logo_path))}" alt="">` : `<span class="bd-mono">${esc(b.name.charAt(0))}</span>`}</span>
          <div class="grow"><h3>${esc(b.name)}</h3><p class="bd-fine" style="margin:2px 0 0">${pill(b.status)} ${b.verified ? '<span class="bd-badge bd-verified">Verified</span>' : ""} ${b.status_note && ["rejected", "suspended"].includes(b.status) ? "· " + esc(b.status_note) : ""}</p></div>
          <button class="bd-btn bd-btn-sm" type="button" data-open="${esc(b.id)}">Manage</button></div>`).join("")}</div>`
        : `<div class="bd-empty"><h3>You haven't listed a business yet</h3><p>Listing is free. Add your business in a few minutes.</p><p><a class="bd-btn" href="/business-directory/register.html">List your business</a></p></div>`}
      ${(claims || []).length ? `<h2 style="margin-top:28px">Your ownership claims</h2><table class="bd-table"><thead><tr><th>Sent</th><th>Status</th><th>Note</th></tr></thead><tbody>${claims.map((c) => `<tr><td>${esc(D.date(c.created_at))}</td><td>${pill(c.status)}</td><td>${esc(c.admin_note || "")}</td></tr>`).join("")}</tbody></table>` : ""}
      <h2 style="margin-top:28px">Saved businesses</h2>
      ${saved.length ? `<div class="bd-grid">${saved.map((b) => D.card(b)).join("")}</div>` : '<p class="bd-muted">Businesses you save on the directory appear here.</p>'}`;
    $$("[data-open]").forEach((x) => x.addEventListener("click", () => open(x.dataset.open)));
  }

  // ---------- One business ----------
  async function open(id) {
    S.biz = S.list.find((b) => b.id === id);
    const { data: p } = await db.rpc("biz_package", { p_business: id });
    S.pkg = p || "free";
    history.replaceState(null, "", "?b=" + id + (S.tab !== "overview" ? "&tab=" + S.tab : ""));
    paint();
  }
  const pkgInfo = () => S.packages.find((p) => p.slug === S.pkg) || { name: "Free", analytics_level: "none", allow_offers: false };
  function paint() {
    const b = S.biz, pk = pkgInfo();
    const tabs = [["overview", "Performance"], ["edit", "Edit listing"], ["promotions", "Promotions"], ["reviews", "Reviews"], ["enquiries", "Enquiries"], ["billing", "Package & billing"], ["verify", "Verification"], ["privacy", "Privacy & listing"]];
    root.innerHTML = `
      <p><button class="bd-link" type="button" data-home>← All my businesses</button></p>
      <div class="bd-sec-head"><div><h1 style="margin:0">${esc(b.name)}</h1><p>${pill(b.status)} · Package: <b>${esc(pk.name)}</b> ${b.verified ? '· <span class="bd-badge bd-verified">Verified</span>' : ""}</p></div>
        <span style="display:flex;gap:8px;flex-wrap:wrap">${b.status === "approved" ? `<a class="bd-btn bd-btn-ghost" href="/business-directory/${esc(b.slug)}/" target="_blank" rel="noopener">View live ↗</a>` : `<a class="bd-btn bd-btn-ghost" href="/business-directory/listing.html?preview=${esc(b.id)}" target="_blank" rel="noopener">Preview ↗</a>`}
        <a class="bd-btn" href="/business-directory/register.html?id=${esc(b.id)}">Edit details</a></span></div>
      ${b.status === "rejected" ? `<p class="bd-notice"><b>Changes needed:</b> ${esc(b.status_note || "Please contact IMMA Media.")} Edit your listing and submit it again.</p>` : ""}
      ${b.status === "suspended" ? `<p class="bd-notice"><b>This listing is suspended.</b> ${esc(b.status_note || "")} Contact IMMA Media to resolve it.</p>` : ""}
      ${b.status === "draft" ? `<p class="bd-notice">This listing is a draft and is not public. <a href="/business-directory/register.html?id=${esc(b.id)}">Finish and submit it</a>.</p>` : ""}
      ${b.status === "pending" ? `<p class="bd-notice">Waiting for approval by IMMA Media. You can keep editing.</p>` : ""}
      <div id="bd-renew"></div>
      <nav class="bd-tabs" aria-label="Business sections">${tabs.map(([k, t]) => `<button type="button" data-tab="${k}" class="${S.tab === k ? "on" : ""}">${t}</button>`).join("")}</nav>
      <div id="bd-tab"></div>`;
    $("[data-home]").addEventListener("click", () => { history.replaceState(null, "", location.pathname); home(); });
    $$("[data-tab]").forEach((x) => x.addEventListener("click", () => { S.tab = x.dataset.tab; history.replaceState(null, "", "?b=" + b.id + "&tab=" + S.tab); paint(); }));
    renewBanner();
    ({ overview, edit: () => (location.href = "/business-directory/register.html?id=" + b.id), promotions, reviews, enquiries, billing, verify, privacy }[S.tab] || overview)();
  }

  async function renewBanner() {
    const { data } = await db.from("business_subscriptions").select("package_slug,status,ends_on").eq("business_id", S.biz.id).in("status", ["active", "complimentary"]).order("ends_on", { ascending: false }).limit(1);
    const s = (data || [])[0];
    if (s && s.ends_on <= addDays(today(), 14)) {
      $("#bd-renew").innerHTML = `<p class="bd-notice"><b>Your ${esc(s.package_slug)} package ${s.ends_on < today() ? "has expired" : "ends on " + esc(D.date(s.ends_on))}.</b> Renew to keep your paid features; otherwise the listing moves to Free automatically (nothing is deleted). <button class="bd-link" type="button" data-renew>Renew now</button></p>`;
      $("[data-renew]").addEventListener("click", () => { S.tab = "billing"; paint(); });
    }
  }

  // Performance: counts recorded by the site (no estimates)
  async function overview() {
    const el = $("#bd-tab"), pk = pkgInfo();
    const days = pk.analytics_level === "detailed" ? 90 : 30;
    const from = addDays(today(), -days + 1);
    const { data, error } = await db.rpc("biz_stats", { p_business: S.biz.id, p_from: from, p_to: today() });
    if (error) { el.innerHTML = `<p class="bd-status bad">${esc(friendly(error))}</p>`; return; }
    const tot = {}; (data || []).forEach((r) => (tot[r.event] = (tot[r.event] || 0) + Number(r.total)));
    const { count: enq } = await db.from("business_enquiries").select("id", { count: "exact", head: true }).eq("business_id", S.biz.id).gte("created_at", from);
    const k = (n, t) => `<div class="bd-kpi"><b>${Number(n || 0).toLocaleString("en-KE")}</b><span>${t}</span></div>`;
    const basic = [k(tot.view, "Profile views"), k(tot.phone, "Phone taps"), k((tot.whatsapp || 0) + (tot.product_whatsapp || 0), "WhatsApp taps"), k(tot.website, "Website visits"), k(enq, "Enquiries")];
    if (pk.analytics_level === "none") {
      el.innerHTML = `<div class="bd-kpis">${k(tot.view, "Profile views (last 30 days)")}${k(enq, "Enquiries (last 30 days)")}</div>
        <p class="bd-notice">Detailed counts of phone, WhatsApp and website taps, with charts, come with Standard (basic) and Premium or Elite (detailed). <button class="bd-link" type="button" data-up>See packages</button></p>`;
      $("[data-up]").addEventListener("click", () => { S.tab = "billing"; paint(); });
      return;
    }
    el.innerHTML = `<p class="bd-fine">Last ${days} days. Counted once per visitor per day; your own visits are not counted.</p>
      <div class="bd-kpis">${basic.join("")}${pk.analytics_level === "detailed" ? k(tot.directions, "Directions requests") + k(tot.share, "Shares") + k(tot.search_impression, "Featured / sponsored impressions") + k(tot.email, "Email taps") : ""}</div>
      <div class="bd-chart"><canvas id="bd-chart" aria-label="Daily profile views and contact taps"></canvas></div>
      ${pk.analytics_level === "detailed" ? '<p style="margin-top:12px"><button class="bd-btn bd-btn-ghost bd-btn-sm" type="button" data-csv>Download monthly report (CSV)</button></p>' : ""}`;
    const labels = []; for (let d = from; d <= today(); d = addDays(d, 1)) labels.push(d);
    const series = (evs) => labels.map((d) => (data || []).filter((r) => r.day === d && evs.includes(r.event)).reduce((s, r) => s + Number(r.total), 0));
    if (window.Chart) {
      if (S.chart) S.chart.destroy();
      S.chart = new Chart($("#bd-chart"), { type: "line", data: { labels: labels.map((d) => d.slice(5)), datasets: [
        { label: "Profile views", data: series(["view"]), borderColor: "#04163a", backgroundColor: "rgba(4,22,58,.08)", fill: true, tension: .3 },
        { label: "Phone, WhatsApp & website", data: series(["phone", "whatsapp", "product_whatsapp", "website", "email"]), borderColor: "#e0a100", tension: .3 }
      ] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    }
    const csv = $("[data-csv]");
    if (csv) csv.addEventListener("click", () => {
      const rows = [["day", "event", "total"], ...(data || []).map((r) => [r.day, r.event, r.total])];
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
      a.download = `${S.biz.slug}-report-${today()}.csv`; a.click();
    });
  }

  async function promotions() {
    const el = $("#bd-tab"), pk = pkgInfo();
    const { data } = await db.from("business_promotions").select("*").eq("business_id", S.biz.id).order("ends_on", { ascending: false });
    el.innerHTML = `${pk.allow_offers ? "" : '<p class="bd-notice">Promotions are shown publicly on Premium and Elite. You can prepare them now; they appear when you upgrade.</p>'}
      <form class="bd-form bd-fieldset" id="bd-promo-form" style="border:1px solid var(--line);border-radius:12px;padding:14px">
        <h3 style="margin:0">New promotion</h3>
        <label>Title *<input name="title" required minlength="3" maxlength="100" placeholder="e.g. 10% off birthday cakes this month"></label>
        <label>Details<textarea name="description" maxlength="600" rows="2"></textarea></label>
        <div class="bd-row"><label>Starts<input name="starts_on" type="date" value="${today()}" required></label><label>Ends *<input name="ends_on" type="date" required value="${addDays(today(), 30)}"></label></div>
        <p class="bd-fine">Offers must be genuine: no misleading prices or claims.</p>
        <button class="bd-btn" type="submit">Add promotion</button></form>
      <h3>Your promotions</h3>
      ${(data || []).length ? `<table class="bd-table"><thead><tr><th>Title</th><th>Dates</th><th>Status</th><th></th></tr></thead><tbody>${data.map((p) => `<tr><td><b>${esc(p.title)}</b><br><small>${esc(p.description || "")}</small></td><td>${esc(D.date(p.starts_on))} – ${esc(D.date(p.ends_on))}</td><td>${pill(!p.active ? "hidden" : p.ends_on < today() ? "expired" : "active")}</td>
        <td><button class="bd-link" type="button" data-toggle="${esc(p.id)}" data-on="${p.active}">${p.active ? "Hide" : "Show"}</button> · <button class="bd-link" type="button" data-del="${esc(p.id)}">Delete</button></td></tr>`).join("")}</tbody></table>` : '<p class="bd-muted">No promotions yet.</p>'}`;
    $("#bd-promo-form").addEventListener("submit", async (e) => {
      e.preventDefault(); const f = new FormData(e.target);
      if (f.get("ends_on") < f.get("starts_on")) return toast("The end date must be after the start date.", true);
      const { error } = await db.from("business_promotions").insert({ business_id: S.biz.id, title: f.get("title"), description: f.get("description") || null, starts_on: f.get("starts_on"), ends_on: f.get("ends_on") });
      if (error) return toast(friendly(error), true); toast("Promotion added."); promotions();
    });
    $$("[data-toggle]", el).forEach((x) => x.addEventListener("click", async () => { const { error } = await db.from("business_promotions").update({ active: x.dataset.on !== "true" }).eq("id", x.dataset.toggle); if (error) toast(friendly(error), true); promotions(); }));
    $$("[data-del]", el).forEach((x) => x.addEventListener("click", async () => { if (!confirm("Delete this promotion?")) return; const { error } = await db.from("business_promotions").delete().eq("id", x.dataset.del); if (error) toast(friendly(error), true); promotions(); }));
  }

  async function reviews() {
    const el = $("#bd-tab");
    const { data } = await db.from("business_reviews").select("*, business_review_replies(*)").eq("business_id", S.biz.id).order("created_at", { ascending: false });
    el.innerHTML = `<p class="bd-fine">Reviews are checked by IMMA Media before they appear. You can reply publicly. Reviews cannot be removed for being negative; report a review only if it breaks the <a href="/business-directory/terms.html#reviews">review rules</a>.</p>
      ${(data || []).length ? data.map((r) => { const rp = (r.business_review_replies || [])[0]; return `<div class="bd-review">
        <p class="bd-review-head">${D.stars(r.rating)} <b>${esc(r.title || "")}</b> ${pill(r.status)}</p><p>${esc(r.body)}</p>
        <p class="bd-fine">${esc(r.reviewer_name || "")} · ${esc(D.date(r.created_at))}</p>
        <form class="bd-form" data-reply="${esc(r.id)}"><label>Your public reply<textarea name="body" maxlength="1500" rows="2">${esc(rp ? rp.body : "")}</textarea></label>
          <span><button class="bd-btn bd-btn-sm" type="submit">${rp ? "Update reply" : "Reply"}</button> <button class="bd-link" type="button" data-report-review="${esc(r.id)}">Report this review</button></span></form></div>`; }).join("")
      : '<p class="bd-muted">No reviews yet.</p>'}`;
    $$("[data-reply]", el).forEach((f) => f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const body = f.elements.body.value.trim(); if (body.length < 2) return toast("Write a reply first.", true);
      const { error } = await db.from("business_review_replies").upsert({ review_id: f.dataset.reply, business_id: S.biz.id, body }, { onConflict: "review_id" });
      if (error) return toast(friendly(error), true); toast("Reply saved.");
    }));
    $$("[data-report-review]", el).forEach((x) => x.addEventListener("click", async () => {
      const details = prompt("Why does this review break the rules? (for example: not a real customer, offensive, shares personal information)");
      if (!details) return;
      const { error } = await db.from("business_reports").insert({ review_id: x.dataset.reportReview, reason: "fake_review", details, status: "open" });
      toast(error ? friendly(error) : "Reported. IMMA Media will check it.", !!error);
    }));
  }

  async function enquiries() {
    const el = $("#bd-tab");
    const { data } = await db.from("business_enquiries").select("*").eq("business_id", S.biz.id).order("created_at", { ascending: false }).limit(200);
    el.innerHTML = (data || []).length ? `<div class="bd-table-wrap"><table class="bd-table"><thead><tr><th>Received</th><th>From</th><th>Message</th><th>Status</th></tr></thead><tbody>${data.map((q) => `<tr>
        <td>${esc(D.date(q.created_at))}</td><td><b>${esc(q.name)}</b><br>${q.phone ? `<a href="${esc(D.tel(q.phone))}">${esc(q.phone)}</a> · <a href="${esc(D.wa(q.phone, `Hello ${q.name}, thank you for your enquiry to ${S.biz.name}.`))}" target="_blank" rel="noopener">WhatsApp</a><br>` : ""}${q.email ? `<a href="mailto:${esc(q.email)}">${esc(q.email)}</a>` : ""}</td>
        <td style="white-space:pre-wrap">${esc(q.message)}</td>
        <td><select data-enq="${esc(q.id)}">${["new", "read", "replied", "closed", "spam"].map((s) => `<option${q.status === s ? " selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>
        <p class="bd-fine">Use customers' details only to answer their enquiry (Kenya Data Protection Act, 2019).</p>`
      : '<p class="bd-muted">No enquiries yet. Customers can message you from your listing.</p>';
    $$("[data-enq]", el).forEach((s) => s.addEventListener("change", async () => { const { error } = await db.from("business_enquiries").update({ status: s.value }).eq("id", s.dataset.enq); if (error) toast(friendly(error), true); }));
  }

  // Package & billing: choose / renew / upgrade, invoices, report a payment
  async function billing() {
    const el = $("#bd-tab"), b = S.biz;
    const [subs, inv, pays] = await Promise.all([
      db.from("business_subscriptions").select("*").eq("business_id", b.id).order("created_at", { ascending: false }),
      db.from("business_invoices").select("*").eq("business_id", b.id).order("issued_at", { ascending: false }),
      db.from("business_payments").select("*").eq("business_id", b.id).order("created_at", { ascending: false })
    ]);
    const pending = (subs.data || []).find((s) => s.status === "pending_payment");
    const pendInv = pending && (inv.data || []).find((i) => i.subscription_id === pending.id);
    const st = S.settings;
    el.innerHTML = `
      ${pending && pendInv ? `<div class="bd-panel bd-notice"><h3 style="margin-top:0">Payment due: ${kes(pendInv.amount_kes)} for ${esc(pending.package_slug)} (${esc(pending.billing)})</h3>
        <p>Invoice <a href="/business-directory/invoice.html?id=${esc(pendInv.id)}" target="_blank" rel="noopener">${esc(pendInv.number)}</a>. Quote it as the account / reference when you pay.</p>
        ${st.mpesa_paybill ? `<p><b>M-Pesa:</b> Paybill / Till <b>${esc(st.mpesa_paybill)}</b>${st.mpesa_account ? `, account <b>${esc(st.mpesa_account)}</b>` : `, account <b>${esc(pendInv.number)}</b>`}</p>` : ""}
        ${st.bank_details ? `<p><b>Bank transfer:</b> ${esc(st.bank_details)}</p>` : ""}
        <p>${esc(st.payment_instructions || "IMMA Media will send you payment details by WhatsApp or phone.")}</p>
        <form class="bd-form" id="bd-pay"><div class="bd-row3">
          <label>Paid by<select name="method"><option value="mpesa_manual">M-Pesa</option><option value="bank_transfer">Bank transfer</option></select></label>
          <label>Confirmation code *<input name="reference" required minlength="4" maxlength="60" placeholder="e.g. SFK1ABC2DE" style="text-transform:uppercase"></label>
          <label>Amount (KSh) *<input name="amount" type="number" min="1" step="1" required value="${Number(pendInv.amount_kes)}"></label></div>
          <label>Phone used to pay<input name="payer_phone" type="tel" maxlength="16"></label>
          <button class="bd-btn" type="submit">Send payment for checking</button>
          <p class="bd-fine">IMMA Media checks every payment by hand before features start. Card and automatic M-Pesa (STK Push) payments are not available yet.</p></form></div>` : ""}
      <h3>Choose a package</h3>
      <div class="bd-billing" role="group"><button type="button" data-bill="monthly" class="on">Monthly</button><button type="button" data-bill="annual">Annual</button></div>
      <div class="bd-packages" id="bd-pk" style="margin-top:12px"></div>
      <div class="bd-row" style="margin-top:10px"><label class="bd-form" style="display:grid;gap:4px;font-weight:700">Discount code<input id="bd-code" maxlength="30" style="text-transform:uppercase;padding:10px;border:1px solid var(--line);border-radius:10px"></label></div>
      <p class="bd-fine">Upgrading starts the new package as soon as payment is confirmed. To move to Free, simply don't renew: your listing moves to Free when the paid period ends and nothing is deleted.</p>
      <h3>Subscriptions</h3>
      ${(subs.data || []).length ? `<div class="bd-table-wrap"><table class="bd-table"><thead><tr><th>Package</th><th>Billing</th><th>Status</th><th>Period</th><th>Amount</th></tr></thead><tbody>${subs.data.map((s) => `<tr><td>${esc(s.package_slug)}</td><td>${esc(s.billing)}</td><td>${pill(s.status)}</td><td>${s.starts_on ? esc(D.date(s.starts_on)) + " – " + esc(D.date(s.ends_on)) : "—"}</td><td>${kes(s.amount_kes)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="bd-muted">You are on the Free package.</p>'}
      <h3>Invoices & receipts</h3>
      ${(inv.data || []).length ? `<div class="bd-table-wrap"><table class="bd-table"><thead><tr><th>Number</th><th>Issued</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${inv.data.map((i) => `<tr><td>${esc(i.number)}</td><td>${esc(D.date(i.issued_at))}</td><td>${kes(i.amount_kes)}</td><td>${pill(i.status)}</td><td><a href="/business-directory/invoice.html?id=${esc(i.id)}" target="_blank" rel="noopener">${i.status === "paid" ? "Receipt" : "Invoice"} ↗</a></td></tr>`).join("")}</tbody></table></div>` : '<p class="bd-muted">No invoices yet.</p>'}
      ${(pays.data || []).length ? `<h3>Payments reported</h3><table class="bd-table"><thead><tr><th>Date</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead><tbody>${pays.data.map((p) => `<tr><td>${esc(D.date(p.created_at))}</td><td>${esc(p.reference)}</td><td>${kes(p.amount_kes)}</td><td>${pill(p.status)}${p.note ? `<br><small>${esc(p.note)}</small>` : ""}</td></tr>`).join("")}</tbody></table>` : ""}`;
    let bill = "monthly";
    const drawPk = () => {
      $("#bd-pk").innerHTML = S.packages.filter((p) => p.active && p.price_monthly_kes > 0).map((p) => `<div class="bd-pack${p.slug === S.pkg ? " selected" : ""}"><h3>${esc(p.name)}${p.slug === S.pkg ? " (current)" : ""}</h3>
        <p class="bd-amount">${bill === "annual" ? kes(Math.round(p.price_monthly_kes * 12 * (1 - p.annual_discount_pct / 100))) + " <small>/ year</small>" : kes(p.price_monthly_kes) + " <small>/ month</small>"}</p>
        <ul>${(p.benefits || []).slice(0, 5).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <button class="bd-btn bd-btn-sm" type="button" data-choose="${esc(p.slug)}">${p.slug === S.pkg ? "Renew" : "Choose"} ${esc(p.name)}</button></div>`).join("");
      $$("[data-choose]").forEach((x) => x.addEventListener("click", async () => {
        if (b.status === "draft") return toast("Please submit your listing first.", true);
        if (!confirm(`Create an invoice for ${x.dataset.choose} (${bill})? Any unpaid invoice will be replaced.`)) return;
        const { error } = await db.rpc("biz_start_subscription", { p_business: b.id, p_package: x.dataset.choose, p_billing: bill, p_code: ($("#bd-code").value || "").trim() || null });
        if (error) return toast(friendly(error), true);
        toast("Invoice created. Payment details are shown at the top."); billing();
      }));
    };
    $$("[data-bill]", el).forEach((x) => x.addEventListener("click", () => { bill = x.dataset.bill; $$("[data-bill]", el).forEach((y) => y.classList.toggle("on", y === x)); drawPk(); }));
    drawPk();
    const pay = $("#bd-pay");
    if (pay) pay.addEventListener("submit", async (e) => {
      e.preventDefault(); const f = new FormData(pay);
      const { error } = await db.from("business_payments").insert({ subscription_id: pending.id, method: f.get("method"), reference: String(f.get("reference")).trim(), amount_kes: Number(f.get("amount")), payer_phone: f.get("payer_phone") || null });
      if (error) return toast(friendly(error), true);
      toast("Thank you. We'll confirm your payment shortly."); billing();
    });
  }

  async function verify() {
    const el = $("#bd-tab");
    const { data } = await db.from("business_verifications").select("*").eq("business_id", S.biz.id).order("created_at", { ascending: false });
    el.innerHTML = `<p>${esc(D.VERIFIED_NOTE)}</p><p class="bd-fine">Verification is optional and free. It is never granted just because you bought a package. Documents are stored privately and are seen only by IMMA Media administrators; they are never published.</p>
      ${S.biz.verified ? '<p class="bd-status ok">Your business is verified.</p>' : `
      <form class="bd-form" id="bd-ver"><label>Evidence type<select name="evidence_type">
        <option value="registration_certificate">Business registration certificate</option><option value="business_permit">County business permit</option>
        <option value="professional_licence">Professional licence</option><option value="ownership_confirmation">Proof of ownership (e.g. lease, letter)</option>
        <option value="contact_confirmation">Confirm contact details only</option><option value="other">Other</option></select></label>
        <label>Document (PDF or image, up to 5 MB)<input type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp"></label>
        <label>Notes<textarea name="notes" maxlength="1000" rows="2"></textarea></label>
        <button class="bd-btn" type="submit">Request verification</button></form>`}
      ${(data || []).length ? `<h3>Requests</h3><table class="bd-table"><thead><tr><th>Sent</th><th>Type</th><th>Status</th><th>Note</th></tr></thead><tbody>${data.map((v) => `<tr><td>${esc(D.date(v.created_at))}</td><td>${esc(v.evidence_type.replace(/_/g, " "))}</td><td>${pill(v.status)}</td><td>${esc(v.admin_note || "")}</td></tr>`).join("")}</tbody></table>` : ""}`;
    const f = $("#bd-ver");
    if (f) f.addEventListener("submit", async (e) => {
      e.preventDefault(); const fd = new FormData(f), file = fd.get("file");
      let path = null;
      if (file && file.size) {
        if (file.size > 5 * 1024 * 1024) return toast("The file is larger than 5 MB.", true);
        path = `${A.user.id}/verification/${S.biz.id}-${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_").slice(-60)}`;
        const up = await db.storage.from("business-docs").upload(path, file, { contentType: file.type });
        if (up.error) return toast(friendly(up.error), true);
      } else if (fd.get("evidence_type") !== "contact_confirmation") return toast("Please attach the document.", true);
      const { error } = await db.from("business_verifications").insert({ business_id: S.biz.id, evidence_type: fd.get("evidence_type"), document_path: path, notes: fd.get("notes") || null });
      if (error) return toast(friendly(error), true); toast("Verification requested."); verify();
    });
  }

  function privacy() {
    const el = $("#bd-tab"), b = S.biz;
    el.innerHTML = `<h3>Your information</h3>
      <p>You control what your listing shows. Your street address and map pin appear only if you allowed it in <a href="/business-directory/register.html?id=${esc(b.id)}">Location &amp; contact</a>. Read how we handle data in our <a href="/privacy.html">Privacy Policy</a>.</p>
      <div class="bd-actions">
        ${b.status === "approved" ? '<button class="bd-btn bd-btn-ghost" type="button" data-unpublish>Take listing offline (back to draft)</button>' : ""}
        ${["draft", "rejected"].includes(b.status) ? '<button class="bd-btn bd-btn-ghost" type="button" data-delete>Delete this draft permanently</button>' : `<button class="bd-btn bd-btn-ghost" type="button" data-request-delete ${b.deletion_requested_at ? "disabled" : ""}>${b.deletion_requested_at ? "Deletion requested on " + esc(D.date(b.deletion_requested_at)) : "Request deletion of this listing"}</button>`}
      </div>
      <p class="bd-fine">Deleting removes the listing, its photos, products, reviews and statistics. Invoices and payment records are kept as accounting records required by law.</p>`;
    const un = $("[data-unpublish]", el);
    if (un) un.addEventListener("click", async () => { if (!confirm("Take the listing offline? You can submit it again later; it will need approval.")) return; const r = await db.from("businesses").update({ status: "draft" }).eq("id", b.id).select().single(); if (r.error) return toast(friendly(r.error), true); S.biz = Object.assign(S.biz, r.data); paint(); });
    const del = $("[data-delete]", el);
    if (del) del.addEventListener("click", async () => {
      if (!confirm(`Permanently delete "${b.name}"? This cannot be undone.`)) return;
      // photos first (storage access depends on still managing the business), then the listing
      for (const folder of ["logo", "cover", "gallery", "products"]) { const l = await db.storage.from("business-media").list(`${b.id}/${folder}`, { limit: 1000 }); if (l.data && l.data.length) await db.storage.from("business-media").remove(l.data.map((x) => `${b.id}/${folder}/${x.name}`)); }
      const r = await db.from("businesses").delete().eq("id", b.id);
      if (r.error) return toast(friendly(r.error), true);
      S.list = S.list.filter((x) => x.id !== b.id); toast("Deleted."); home();
    });
    const rq = $("[data-request-delete]", el);
    if (rq) rq.addEventListener("click", async () => { if (!confirm("Ask IMMA Media to delete this listing? We will confirm with you first.")) return; const r = await db.from("businesses").update({ deletion_requested_at: new Date().toISOString() }).eq("id", b.id).select().single(); if (r.error) return toast(friendly(r.error), true); S.biz = Object.assign(S.biz, r.data); toast("Deletion requested."); privacy(); });
  }
})();
