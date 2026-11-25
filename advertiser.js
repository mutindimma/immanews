// IMMA News — advertiser self-service dashboard.
// All prices, availability and permissions are enforced in Supabase (supabase/advertising.sql);
// this page only shows estimates and sends the advertiser's choices.
(() => {
  const A = window.IMMA_AUTH, U = window.ADS_UI;
  const { esc, kes, date, badge } = U;
  const $ = (s) => document.querySelector(s);
  const panel = $("#panel");
  if (!A || !A.configured) { $("#loading").textContent = "Advertiser accounts are not available right now."; return; }
  const db = A.client;

  const S = { user: null, me: null, placements: [], packages: [], settings: {}, campaigns: [], notes: [], view: "overview", chart: null, editing: null, prefill: null };
  const params = new URLSearchParams(location.search);
  const placement = (k) => S.placements.find((p) => p.key === k);
  const pkgById = (id) => S.packages.find((p) => p.id === id);
  const categories = () => [...new Set([...(typeof NEWS !== "undefined" ? NEWS : []).map((n) => n.category), "Public Services", "Health", "Travel", "Education"])].sort();

  // ---------- Loading ----------
  async function loadRefs() {
    const [pl, pk, st] = await Promise.all([
      db.from("ad_placements").select("*").order("sort_order"),
      db.from("ad_packages").select("*").order("sort_order"),
      db.from("ad_settings").select("key,value")
    ]);
    if (pl.error) throw pl.error;
    S.placements = pl.data || []; S.packages = pk.data || [];
    S.settings = Object.fromEntries((st.data || []).map((r) => [r.key, r.value]));
  }
  async function loadMine() {
    const { data: me, error } = await db.from("advertisers").select("*").eq("user_id", S.user.id).maybeSingle();
    if (error) throw error;
    S.me = me;
    if (!me) return;
    const [c, n] = await Promise.all([
      db.from("ad_campaigns").select("*, ad_creatives(*), ad_invoices(*), ad_payments(*)").order("created_at", { ascending: false }),
      db.from("ad_notifications").select("*").eq("user_id", S.user.id).order("created_at", { ascending: false }).limit(100)
    ]);
    S.campaigns = c.data || []; S.notes = n.data || [];
    counts();
  }
  function counts() {
    const pending = S.campaigns.filter((c) => ["draft", "submitted", "rejected"].includes(c.status)).length;
    const due = S.campaigns.filter((c) => c.status === "approved" && c.payment_status === "unpaid" && c.total_kes > 0).length;
    $("#n-camp").textContent = pending || "";
    $("#n-due").textContent = due || "";
    $("#n-notes").textContent = S.notes.filter((n) => !n.is_read).length || "";
  }

  A.onChange(async (user) => {
    S.user = user;
    if (!user) {
      $("#loading").hidden = true; $("#signed-out").hidden = false;
      $("#signin-link").href = "signin.html?next=" + encodeURIComponent("advertiser.html" + location.search);
      return;
    }
    try {
      await loadRefs();
      await loadMine();
    } catch (e) {
      $("#loading").textContent = "We couldn't load the advertiser dashboard: " + U.friendlyError(e);
      return;
    }
    $("#loading").hidden = true;
    if (!S.me) { showRegister(); return; }
    showDash();
  });

  // ---------- Registration ----------
  function showRegister() {
    $("#register").hidden = false;
    const m = S.user.user_metadata || {};
    $("#r-contact").value = m.full_name || m.name || "";
    $("#r-email").value = S.user.email || "";
  }
  async function uploadFile(file, folder, name) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${S.user.id}/${folder}/${name}-${Date.now()}.${ext}`;
    const { error } = await db.storage.from("ad-creatives").upload(path, file, { contentType: file.type, upsert: false, cacheControl: "31536000" });
    if (error) throw error;
    return path;
  }
  function formStatus(el, kind, html) { el.className = "form-status " + kind; el.innerHTML = html; el.hidden = false; }

  $("#reg-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, st = $("#reg-status");
    const d = Object.fromEntries(new FormData(f));
    const need = ["business_name", "category", "contact_name", "phone", "email"].filter((k) => !String(d[k] || "").trim());
    if (need.length || !$("#r-terms").checked) {
      formStatus(st, "error", "Please fill in the fields marked * and accept the advertising terms."); return;
    }
    if (d.website && !/^https?:\/\//i.test(d.website)) { formStatus(st, "error", "Your website address should start with https://"); return; }
    const btn = f.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      let logo_path = null;
      const logo = $("#r-logo").files[0];
      if (logo) {
        const chk = await U.checkImage(logo);
        if (!chk.ok) throw new Error(chk.msg);
        logo_path = await uploadFile(logo, "profile", "logo");
      }
      const row = {
        user_id: S.user.id, business_name: d.business_name.trim(), category: d.category, contact_name: d.contact_name.trim(),
        phone: d.phone.trim(), email: d.email.trim(), website: d.website.trim() || null, billing_name: d.billing_name.trim() || null,
        billing_address: d.billing_address.trim() || null, kra_pin: d.kra_pin.trim() || null, logo_path, terms_accepted_at: new Date().toISOString()
      };
      const { error } = await db.from("advertisers").insert(row);
      if (error) throw error;
      await loadMine();
      $("#register").hidden = true;
      showDash();
    } catch (err) {
      formStatus(st, "error", esc(U.friendlyError(err)));
    }
    btn.disabled = false;
  });

  // ---------- Dashboard shell ----------
  function showDash() {
    $("#dash").hidden = false;
    $("#biz-name").textContent = S.me.business_name;
    $("#biz-sub").textContent = `${S.me.contact_name} · ${S.me.email} · ${S.me.phone}`;
    if (S.me.is_blocked) {
      $("#blocked-note").hidden = false;
      $("#blocked-note").textContent = "This advertiser account has been suspended" + (S.me.blocked_reason ? ": " + S.me.blocked_reason : ".") + " Please contact IMMA Media on +254 785 887 830.";
    }
    const pk = params.get("package");
    if (pk) { const p = S.packages.find((x) => x.slug === pk); if (p) S.prefill = { package_id: p.id }; go("book"); }
    else go(params.get("view") || "overview");
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (b) { if (b.dataset.go === "book") { S.editing = null; S.prefill = null; } go(b.dataset.go); }
    if (e.target.closest("[data-close]")) $("#dlg").close();
  });
  function go(view) {
    S.view = view;
    document.querySelectorAll(".dash-nav button").forEach((b) => b.classList.toggle("on", b.dataset.go === view));
    if (S.chart) { S.chart.destroy(); S.chart = null; }
    ({ overview, book, campaigns, billing, stats, notes, profile }[view] || overview)();
    if (window.innerWidth < 900) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- Overview ----------
  async function overview() {
    const live = S.campaigns.filter((c) => U.displayStatus(c) === "live");
    const waiting = S.campaigns.filter((c) => c.status === "submitted");
    const unpaid = S.campaigns.filter((c) => c.status === "approved" && ["unpaid", "pending_verification"].includes(c.payment_status) && c.total_kes > 0);
    const rejected = S.campaigns.filter((c) => c.status === "rejected");
    panel.innerHTML = `
      ${!S.campaigns.length ? `<div class="card"><h2>Welcome, ${esc(S.me.contact_name.split(" ")[0])}</h2>
        <p class="muted">You have no campaigns yet. Choose a package or a single placement to get started. You will be able to preview your advert before sending it to us.</p>
        <button class="btn-gold" type="button" data-go="book">Book your first campaign</button></div>` : ""}
      ${unpaid.map((c) => `<div class="notice warn"><b>${esc(c.name)}</b> is approved. ${c.payment_status === "pending_verification" ? "We are checking your payment." : `Please pay ${esc(kes(c.total_kes))} so it can go live. <a href="#" data-open="${c.id}"><u>Pay now</u></a>`}</div>`).join("")}
      ${rejected.map((c) => `<div class="notice bad"><b>${esc(c.name)}</b> needs changes${c.rejection_reason ? ": " + esc(c.rejection_reason) : "."} <a href="#" data-open="${c.id}"><u>Review</u></a></div>`).join("")}
      <div class="kpis">
        <div class="kpi gold"><small>Live now</small><b>${live.length}</b></div>
        <div class="kpi"><small>Awaiting review</small><b>${waiting.length}</b></div>
        <div class="kpi"><small>Views (30 days)</small><b id="k-imp">…</b></div>
        <div class="kpi"><small>Clicks (30 days)</small><b id="k-clk">…</b></div>
        <div class="kpi"><small>Click-through rate</small><b id="k-ctr">…</b></div>
      </div>
      <div class="card"><div class="card-head"><h2>Recent updates</h2><button class="btn-outline btn-sm" type="button" data-go="notes">All notifications</button></div>
        ${S.notes.slice(0, 5).map(noteHtml).join("") || `<p class="muted">No notifications yet.</p>`}</div>`;
    const t = await statsTotals(U.addDays(U.today(), -29), U.today());
    if (S.view !== "overview") return;
    $("#k-imp").textContent = U.num(t.i); $("#k-clk").textContent = U.num(t.c); $("#k-ctr").textContent = U.pct(t.c, t.i);
  }
  async function statsRows(from, to, campaign) {
    const { data, error } = await db.rpc("ad_stats", { p_from: from, p_to: to, p_campaign: campaign || null });
    if (error) throw error;
    return data || [];
  }
  async function statsTotals(from, to, campaign) {
    try {
      const rows = await statsRows(from, to, campaign);
      return rows.reduce((t, r) => ({ i: t.i + Number(r.impressions), c: t.c + Number(r.clicks) }), { i: 0, c: 0 });
    } catch (e) { return { i: 0, c: 0 }; }
  }
  const noteHtml = (n) => `<div class="notif${n.is_read ? "" : " unread"}"><b>${esc(n.title)}</b><span class="muted">${esc(n.body || "")}</span><time>${esc(U.dateTime(n.created_at))}</time></div>`;

  // ---------- Booking ----------
  function book() {
    if (S.me.is_blocked) { panel.innerHTML = `<div class="card"><p>Booking is not available while the account is suspended.</p></div>`; return; }
    const ed = S.editing, pre = S.prefill || {};
    const cr = ed && ed.ad_creatives && ed.ad_creatives[0];
    const v = {
      package_id: ed ? ed.package_id : pre.package_id || "",
      placement_key: ed ? ed.placement_key : pre.placement_key || "",
      start_date: ed ? ed.start_date : pre.start_date || U.addDays(U.today(), 2),
      months: ed ? ed.months : pre.months || 1,
      name: ed ? ed.name : pre.name || "",
      categories: ed ? ed.categories || [] : pre.categories || [],
      discount_code: ed ? ed.discount_code || "" : "",
      parent_id: ed ? ed.parent_id : pre.parent_id || null,
      renewed_from: ed ? ed.renewed_from : pre.renewed_from || null,
      cr: cr || pre.creative || {}
    };
    const parent = v.parent_id && S.campaigns.find((c) => c.id === v.parent_id);
    panel.innerHTML = `
      <form class="card cform" id="book-form" novalidate>
        <div class="card-head"><h2>${ed ? "Edit campaign" : v.renewed_from ? "Renew campaign" : parent ? "Sponsored article included in your package" : "Book a campaign"}</h2>
          ${ed ? badge(ed.status) : ""}</div>
        ${ed && ed.rejection_reason ? `<div class="notice bad">IMMA Media's note: ${esc(ed.rejection_reason)}</div>` : ""}
        ${parent ? `<div class="notice ok">This article is included in "${esc(parent.name)}" at no extra cost. It will appear once that campaign is paid.</div>` : ""}
        <div class="form-grid">
          <div class="field full"><label for="b-name">Campaign name *</label><input id="b-name" maxlength="120" required value="${esc(v.name)}" placeholder="e.g. December sale"></div>
          <div class="field" ${parent ? "hidden" : ""}><label for="b-pkg">Package</label>
            <select id="b-pkg"><option value="">No package — single placement</option>
              ${S.packages.filter((p) => p.is_available || p.id === v.package_id).map((p) => `<option value="${p.id}" ${p.id === v.package_id ? "selected" : ""}>${esc(p.name)} — ${esc(kes(p.price_kes))} / ${p.duration_months > 1 ? p.duration_months + " months" : "month"}</option>`).join("")}
            </select></div>
          <div class="field" ${parent ? "hidden" : ""}><label for="b-pl">Placement *</label><select id="b-pl"></select></div>
          <div class="field full" id="b-cats-wrap" hidden><label>Sections where the banner appears *</label>
            <div class="toolbar" id="b-cats">${categories().map((c) => `<label class="check"><input type="checkbox" value="${esc(c)}" ${v.categories.includes(c) ? "checked" : ""}> ${esc(c)}</label>`).join("")}</div></div>
          <div class="field"><label for="b-start">Start date *</label><input id="b-start" type="date" min="${U.today()}" value="${esc(v.start_date)}" required></div>
          <div class="field" id="b-months-wrap"><label for="b-months">Duration</label>
            <select id="b-months">${[1, 2, 3, 6, 12].map((m) => `<option value="${m}" ${m === Number(v.months) ? "selected" : ""}>${m} month${m > 1 ? "s" : ""}</option>`).join("")}</select></div>
          <div class="field" ${parent ? "hidden" : ""}><label for="b-code">Discount code</label><input id="b-code" maxlength="30" value="${esc(v.discount_code)}" style="text-transform:uppercase"></div>
        </div>
        <div class="notice" id="b-summary">Choose a placement to see the price and availability.</div>

        <h3 id="art-title">Your advert</h3>
        <div class="form-grid" id="art-display">
          <div class="field"><label for="b-img">Advert image *</label><input id="b-img" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><p class="form-hint" id="b-img-hint">${v.cr.image_path ? "Current image kept unless you choose a new one." : ""}</p></div>
          <div class="field" id="b-mimg-wrap"><label for="b-mimg">Phone version (optional)</label><input id="b-mimg" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><p class="form-hint" id="b-mimg-hint"></p></div>
          <div class="field"><label for="b-url">Link (your website) *</label><input id="b-url" type="url" maxlength="500" placeholder="https://" value="${esc(v.cr.destination_url || "")}"></div>
          <div class="field"><label for="b-alt">Short description of the image</label><input id="b-alt" maxlength="200" value="${esc(v.cr.alt_text || "")}" placeholder="e.g. Acme Bakery – fresh bread daily"></div>
        </div>
        <div class="form-grid" id="art-sponsored" hidden>
          <div class="field full"><label for="b-head">Headline *</label><input id="b-head" maxlength="140" value="${esc(v.cr.headline || "")}"></div>
          <div class="field full"><label for="b-body">Article text * <span class="muted small">(leave a blank line between paragraphs, up to about 1,500 words)</span></label><textarea id="b-body" rows="10" maxlength="12000">${esc(v.cr.body || "")}</textarea></div>
          <div class="field"><label for="b-simg">Main image (optional)</label><input id="b-simg" type="file" accept="image/jpeg,image/png,image/webp"></div>
          <div class="field"><label for="b-surl">Link to your website (optional)</label><input id="b-surl" type="url" maxlength="500" placeholder="https://" value="${esc(v.cr.destination_url || "")}"></div>
        </div>

        <div class="preview-wrap" id="b-preview">
          <div class="preview-box"><small>Desktop preview</small><div id="pv-desk"></div></div>
          <div class="preview-box"><small>Phone preview</small><div class="phone-frame"><div id="pv-mob"></div></div></div>
        </div>
        <p class="small muted">Adverts are reviewed by IMMA Media before they appear. We do not accept misleading health claims, financial schemes promising guaranteed returns, illegal products or adverts that look like news. See the <a href="advertising-terms.html" target="_blank"><u>advertising terms</u></a>.</p>
        <div class="form-status" id="b-status" role="status" aria-live="polite" hidden></div>
        <div class="cta-buttons">
          <button class="btn-gold" type="submit" data-submit="1">Submit for approval</button>
          <button class="btn-outline" type="submit" data-submit="0">Save as draft</button>
        </div>
      </form>`;

    const f = $("#book-form");
    const files = { img: null, mimg: null, simg: null };
    const urls = { img: v.cr.image_path ? U.publicUrl(v.cr.image_path) : "", mimg: v.cr.mobile_image_path ? U.publicUrl(v.cr.mobile_image_path) : "", simg: v.cr.image_path ? U.publicUrl(v.cr.image_path) : "" };

    function fillPlacements() {
      const pk = pkgById($("#b-pkg").value);
      const keys = parent ? ["sponsored_article"] : pk ? pk.placement_keys : S.placements.filter((p) => p.is_active).map((p) => p.key);
      const cur = $("#b-pl").value || v.placement_key;
      $("#b-pl").innerHTML = keys.map((k) => placement(k)).filter(Boolean).map((p) =>
        `<option value="${p.key}" ${p.key === cur ? "selected" : ""}>${esc(p.name)}${p.width ? ` (${p.width}×${p.height})` : ""}${pk ? "" : " — " + esc(kes(p.price_kes)) + (p.price_unit === "article" ? " per article" : "/month")}</option>`).join("");
    }
    let checkTimer = null;
    function refresh() {
      const p = placement($("#b-pl").value);
      if (!p) return;
      const sponsored = p.key === "sponsored_article";
      const pk = pkgById($("#b-pkg").value);
      $("#b-cats-wrap").hidden = p.key !== "category_banner";
      $("#b-months-wrap").hidden = sponsored;
      $("#art-display").hidden = sponsored; $("#art-sponsored").hidden = !sponsored;
      $("#b-mimg-wrap").hidden = !(p.mobile_width && p.width > 400);
      $("#b-preview").hidden = sponsored;
      $("#art-title").textContent = sponsored ? "Your sponsored article" : "Your advert";
      const months = sponsored ? 1 : Number($("#b-months").value);
      const start = $("#b-start").value;
      const end = start ? U.endDate(start, months, sponsored ? "sponsored" : "display") : null;
      let est = parent ? 0 : pk ? pk.price_kes * Math.max(1, Math.floor(Math.max(months, pk.duration_months) / pk.duration_months)) : p.price_kes * (sponsored ? 1 : months);
      $("#b-summary").innerHTML = `<b>${esc(p.name)}</b>${start ? ` · ${esc(date(start))} to ${esc(date(end))}` : ""} · Estimated price <b>${esc(kes(est))}</b>${$("#b-code").value.trim() ? " before discount" : ""}. <span id="b-avail" class="muted">Checking availability…</span>`;
      // Preview
      if (!sponsored) {
        $("#pv-desk").innerHTML = U.slotPreview(p, urls.img, false, $("#b-alt").value);
        $("#pv-mob").innerHTML = U.slotPreview(p.key === "top_leaderboard" ? (placement("mobile_banner") || p) : p, urls.mimg || urls.img, true, $("#b-alt").value);
      }
      clearTimeout(checkTimer);
      checkTimer = setTimeout(async () => {
        if (!start) return;
        const cats = p.key === "category_banner" ? [...document.querySelectorAll("#b-cats input:checked")].map((i) => i.value) : null;
        const { data, error } = await db.rpc("ad_check_availability", { p_placement: p.key, p_start: start, p_months: months, p_categories: cats && cats.length ? cats : null });
        const el = $("#b-avail"); if (!el) return;
        if (error) { el.textContent = ""; return; }
        el.className = data.available ? "" : "";
        el.innerHTML = data.available ? `<span style="color:var(--up)">✓ Available (${data.capacity - data.taken} of ${data.capacity} rotation spaces free)</span>` : `<span style="color:var(--down)">✕ ${esc(data.reason)}</span>`;
      }, 350);
    }
    async function pickFile(input, key, hintEl, p, mobile) {
      const file = input.files[0];
      files[key] = null;
      if (!file) return refresh();
      const w = mobile ? (p.mobile_width || 320) : p.width, h = mobile ? (p.mobile_height || 100) : p.height;
      const chk = await U.checkImage(file, key === "simg" ? null : w, key === "simg" ? null : h);
      if (!chk.ok) { input.value = ""; if (hintEl) hintEl.textContent = chk.msg; return; }
      files[key] = file;
      urls[key] = URL.createObjectURL(file);
      if (hintEl) hintEl.textContent = chk.warn || `✓ ${chk.w} × ${chk.h} px`;
      refresh();
    }
    fillPlacements(); refresh();
    $("#b-pkg").addEventListener("change", () => { fillPlacements(); refresh(); });
    ["#b-pl", "#b-start", "#b-months", "#b-code"].forEach((s) => $(s).addEventListener("change", refresh));
    $("#b-cats").addEventListener("change", refresh);
    $("#b-alt").addEventListener("input", refresh);
    $("#b-img").addEventListener("change", (e) => pickFile(e.target, "img", $("#b-img-hint"), placement($("#b-pl").value), false));
    $("#b-mimg").addEventListener("change", (e) => pickFile(e.target, "mimg", $("#b-mimg-hint"), placement($("#b-pl").value), true));
    $("#b-simg").addEventListener("change", (e) => pickFile(e.target, "simg", null, placement($("#b-pl").value), false));

    let submitWanted = true;
    f.querySelectorAll("[data-submit]").forEach((b) => b.addEventListener("click", () => { submitWanted = b.dataset.submit === "1"; }));
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const st = $("#b-status");
      const p = placement($("#b-pl").value);
      const sponsored = p && p.key === "sponsored_article";
      const name = $("#b-name").value.trim();
      const cats = p && p.key === "category_banner" ? [...document.querySelectorAll("#b-cats input:checked")].map((i) => i.value) : null;
      const url = (sponsored ? $("#b-surl") : $("#b-url")).value.trim();
      const errs = [];
      if (name.length < 2) errs.push("a campaign name");
      if (!p) errs.push("a placement");
      if (!$("#b-start").value) errs.push("a start date");
      if (cats && !cats.length) errs.push("at least one section");
      if (sponsored) {
        if (!$("#b-head").value.trim()) errs.push("a headline");
        if ($("#b-body").value.trim().length < 200) errs.push("article text (at least a few paragraphs)");
      } else {
        if (!files.img && !v.cr.image_path) errs.push("an advert image");
        if (!/^https?:\/\/[^\s<>"]+\.[^\s<>"]+/i.test(url)) errs.push("a link starting with https://");
      }
      if (sponsored && url && !/^https?:\/\/[^\s<>"]+\.[^\s<>"]+/i.test(url)) errs.push("a valid website link");
      if (errs.length) { formStatus(st, "error", "Please add " + errs.join(", ") + "."); return; }

      const btns = f.querySelectorAll("button"); btns.forEach((b) => (b.disabled = true));
      formStatus(st, "info", "Saving…");
      try {
        const row = {
          name, placement_key: p.key, package_id: parent ? null : $("#b-pkg").value || null, parent_id: v.parent_id || null,
          renewed_from: v.renewed_from || null, categories: cats && cats.length ? cats : null, start_date: $("#b-start").value,
          months: sponsored ? 1 : Number($("#b-months").value), discount_code: parent ? null : $("#b-code").value.trim() || null, status: "draft"
        };
        let camp = ed;
        if (ed) {
          const r = await db.from("ad_campaigns").update(row).eq("id", ed.id).select().single();
          if (r.error) throw r.error; camp = r.data;
        } else {
          const r = await db.from("ad_campaigns").insert({ ...row, advertiser_id: S.me.id }).select().single();
          if (r.error) throw r.error; camp = r.data;
        }
        // Artwork
        const cre = {
          campaign_id: camp.id,
          destination_url: url || null,
          alt_text: sponsored ? null : $("#b-alt").value.trim() || null,
          headline: sponsored ? $("#b-head").value.trim() : null,
          body: sponsored ? $("#b-body").value.trim() : null,
          image_path: v.cr.image_path || null,
          mobile_image_path: v.cr.mobile_image_path || null
        };
        if (sponsored && files.simg) cre.image_path = await uploadFile(files.simg, camp.id, "article");
        if (!sponsored && files.img) cre.image_path = await uploadFile(files.img, camp.id, "desktop");
        if (!sponsored && files.mimg) cre.mobile_image_path = await uploadFile(files.mimg, camp.id, "mobile");
        const existing = cr && ed ? cr.id : null;
        const r2 = existing ? await db.from("ad_creatives").update(cre).eq("id", existing) : await db.from("ad_creatives").insert(cre);
        if (r2.error) throw r2.error;
        if (submitWanted) {
          const r3 = await db.from("ad_campaigns").update({ status: "submitted" }).eq("id", camp.id);
          if (r3.error) { await loadMine(); S.editing = S.campaigns.find((c) => c.id === camp.id) || null; throw r3.error; }
        }
        S.editing = null; S.prefill = null;
        await loadMine();
        go("campaigns");
        openCampaign(camp.id, submitWanted ? "Sent to IMMA Media for review. We'll notify you here when it is approved." : "Saved as a draft. Submit it when you're ready.");
      } catch (err) {
        formStatus(st, "error", esc(U.friendlyError(err)));
        btns.forEach((b) => (b.disabled = false));
      }
    });
  }

  // ---------- Campaign list ----------
  let campTab = "all";
  function campaigns() {
    const groups = {
      all: () => true,
      live: (c) => ["live", "scheduled"].includes(U.displayStatus(c)),
      pending: (c) => ["draft", "submitted"].includes(c.status) || U.displayStatus(c) === "unpaid",
      rejected: (c) => c.status === "rejected",
      ended: (c) => ["expired", "terminated", "paused"].includes(U.displayStatus(c))
    };
    const names = { all: "All", live: "Live & scheduled", pending: "Pending", rejected: "Needs changes", ended: "Completed & ended" };
    const list = S.campaigns.filter(groups[campTab]);
    panel.innerHTML = `
      <div class="card">
        <div class="card-head"><h2>My campaigns</h2><button class="btn-gold btn-sm" type="button" data-go="book">+ New campaign</button></div>
        <div class="tabs">${Object.keys(groups).map((k) => `<button type="button" data-tab="${k}" class="${k === campTab ? "on" : ""}">${names[k]} (${S.campaigns.filter(groups[k]).length})</button>`).join("")}</div>
        ${list.length ? `<div class="table-wrap"><table class="dtable"><thead><tr><th>Campaign</th><th>Placement</th><th>Dates</th><th>Price</th><th>Status</th><th>Payment</th></tr></thead><tbody>
          ${list.map((c) => `<tr class="clickable" data-open="${c.id}"><td><b>${esc(c.name)}</b></td><td>${esc((placement(c.placement_key) || {}).name || c.placement_key)}</td>
            <td>${esc(date(c.start_date))} – ${esc(date(c.end_date))}</td><td>${esc(kes(c.total_kes))}</td><td>${badge(U.displayStatus(c))}</td><td>${badge(c.payment_status)}</td></tr>`).join("")}
        </tbody></table></div>` : `<p class="empty-state">Nothing here yet.</p>`}
      </div>`;
    panel.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { campTab = b.dataset.tab; campaigns(); }));
  }
  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-open]");
    if (r) { e.preventDefault(); openCampaign(r.dataset.open); }
  });

  // ---------- Campaign detail ----------
  async function openCampaign(id, message) {
    const c = S.campaigns.find((x) => x.id === id);
    if (!c) return;
    const p = placement(c.placement_key) || {};
    const cr = (c.ad_creatives || [])[0] || {};
    const inv = (c.ad_invoices || [])[0];
    const pays = c.ad_payments || [];
    const pk = c.package_id ? pkgById(c.package_id) : null;
    const usedArticles = S.campaigns.filter((x) => x.parent_id === c.id).length;
    const articlesLeft = pk ? Math.max(0, pk.sponsored_articles - usedArticles) : 0;
    const ds = U.displayStatus(c);
    const canPay = c.status === "approved" && c.payment_status === "unpaid" && c.total_kes > 0;
    const canEdit = ["draft", "rejected"].includes(c.status);
    const canRenew = ["approved", "expired"].includes(c.status) && c.kind === "display";
    const set = S.settings;
    $("#dlg-title").textContent = c.name;
    $("#dlg-body").innerHTML = `
      ${message ? `<div class="notice ok">${esc(message)}</div>` : ""}
      <div>${badge(ds)} ${badge(c.payment_status)}</div>
      ${c.rejection_reason && c.status === "rejected" ? `<div class="notice bad">IMMA Media's note: ${esc(c.rejection_reason)}</div>` : ""}
      ${cr.review_note ? `<div class="notice">Note on your artwork: ${esc(cr.review_note)}</div>` : ""}
      <dl class="kv">
        <dt>Placement</dt><dd>${esc(p.name || c.placement_key)}${c.categories ? " · " + esc(c.categories.join(", ")) : ""}</dd>
        ${pk ? `<dt>Package</dt><dd>${esc(pk.name)}</dd>` : ""}
        <dt>Runs</dt><dd>${esc(date(c.start_date))} – ${esc(date(c.end_date))}</dd>
        <dt>Price</dt><dd>${esc(kes(c.list_price_kes))}${Number(c.discount_kes) ? ` − ${esc(kes(c.discount_kes))} discount (${esc(c.discount_code)})` : ""} = <b>${esc(kes(c.total_kes))}</b></dd>
        ${cr.destination_url ? `<dt>Link</dt><dd>${esc(cr.destination_url)}</dd>` : ""}
        ${inv ? `<dt>Invoice</dt><dd><a href="invoice.html?id=${inv.id}" target="_blank"><u>${esc(inv.number)}</u></a> ${badge(inv.status)}${inv.receipt_number ? ` · <a href="invoice.html?id=${inv.id}&receipt=1" target="_blank"><u>Receipt ${esc(inv.receipt_number)}</u></a>` : ""}</dd>` : ""}
      </dl>
      ${c.kind === "sponsored"
        ? `<div class="preview-box"><small>Sponsored article</small><span class="label label--sponsored">Sponsored Content</span><h3 style="margin:8px 0">${esc(cr.headline || "")}</h3><p class="muted small">${esc((cr.body || "").slice(0, 400))}${(cr.body || "").length > 400 ? "…" : ""}</p></div>`
        : `<div class="preview-wrap"><div class="preview-box"><small>Desktop</small>${U.slotPreview(p, U.publicUrl(cr.image_path), false, cr.alt_text)}</div>
           <div class="preview-box"><small>Phone</small><div class="phone-frame">${U.slotPreview(c.placement_key === "top_leaderboard" ? (placement("mobile_banner") || p) : p, U.publicUrl(cr.mobile_image_path || cr.image_path), true, cr.alt_text)}</div></div></div>`}
      <div class="card" id="c-stats"><h3>Performance</h3><p class="muted small">Loading…</p></div>
      ${canPay ? payForm(c, set) : ""}
      ${pays.length ? `<div><h3>Payments reported</h3><table class="dtable"><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead><tbody>
        ${pays.map((x) => `<tr><td>${esc(date(x.created_at))}</td><td>${x.method === "mpesa_manual" ? "M-Pesa" : x.method === "bank_transfer" ? "Bank transfer" : esc(x.method)}</td><td>${esc(x.reference)}</td><td>${esc(kes(x.amount_kes))}</td><td>${badge(x.status)}${x.note ? `<br><small>${esc(x.note)}</small>` : ""}</td></tr>`).join("")}</tbody></table></div>` : ""}
      <div class="cta-buttons">
        ${canEdit ? `<button class="btn-gold btn-sm" type="button" data-act="edit">Edit${c.status === "rejected" ? " and resubmit" : ""}</button>` : ""}
        ${c.status === "draft" ? `<button class="btn-outline btn-sm" type="button" data-act="submit">Submit for approval</button><button class="btn-danger" type="button" data-act="delete">Delete draft</button>` : ""}
        ${canRenew ? `<button class="btn-outline btn-sm" type="button" data-act="renew">Renew</button>` : ""}
        ${articlesLeft && !["rejected", "terminated", "draft"].includes(c.status) ? `<button class="btn-outline btn-sm" type="button" data-act="article">Write included sponsored article (${articlesLeft} left)</button>` : ""}
      </div>`;
    const dlg = $("#dlg");
    if (!dlg.open) dlg.showModal();

    const t = await statsTotals(c.start_date, U.today() < c.end_date ? U.today() : c.end_date, c.id);
    const box = $("#c-stats");
    if (box) box.innerHTML = `<h3>Performance</h3><div class="kpis"><div class="kpi"><small>Views</small><b>${U.num(t.i)}</b></div><div class="kpi"><small>Clicks</small><b>${U.num(t.c)}</b></div><div class="kpi"><small>CTR</small><b>${U.pct(t.c, t.i)}</b></div></div>
      <p class="small muted">Views are counted when at least half of the advert is on screen for one second. Bots and repeat views are filtered out.</p>`;

    $("#dlg-body").querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", async () => {
      const act = b.dataset.act;
      if (act === "edit") { dlg.close(); S.editing = c; S.prefill = null; S.view = "book"; document.querySelectorAll(".dash-nav button").forEach((x) => x.classList.toggle("on", x.dataset.go === "book")); book(); return; }
      if (act === "renew") {
        dlg.close();
        S.editing = null;
        const next = U.addDays(c.end_date, 1);
        S.prefill = { package_id: c.package_id, placement_key: c.placement_key, months: c.months, name: c.name + " (renewal)", categories: c.categories || [],
          start_date: next > U.today() ? next : U.today(), renewed_from: c.id, creative: { image_path: cr.image_path, mobile_image_path: cr.mobile_image_path, destination_url: cr.destination_url, alt_text: cr.alt_text } };
        S.view = "book"; book(); return;
      }
      if (act === "article") {
        dlg.close(); S.editing = null;
        S.prefill = { parent_id: c.id, placement_key: "sponsored_article", name: c.name + " — sponsored article", start_date: c.start_date > U.today() ? c.start_date : U.today() };
        S.view = "book"; book(); return;
      }
      b.disabled = true;
      try {
        if (act === "submit") { const r = await db.from("ad_campaigns").update({ status: "submitted" }).eq("id", c.id); if (r.error) throw r.error; }
        if (act === "delete") { if (!confirm("Delete this draft?")) { b.disabled = false; return; } const r = await db.from("ad_campaigns").delete().eq("id", c.id); if (r.error) throw r.error; dlg.close(); }
        await loadMine();
        if (act === "submit") openCampaign(c.id, "Sent to IMMA Media for review.");
        go(S.view === "overview" ? "overview" : "campaigns");
      } catch (err) { alert(U.friendlyError(err)); b.disabled = false; }
    }));
    const pf = $("#pay-form");
    if (pf) pf.addEventListener("submit", async (e) => {
      e.preventDefault();
      const st = $("#pay-status");
      const ref = $("#p-ref").value.trim(), amt = Number($("#p-amt").value);
      if (ref.length < 4 || !(amt > 0)) { formStatus(st, "error", "Please enter the payment reference and the amount you paid."); return; }
      const btn = pf.querySelector("button"); btn.disabled = true;
      const { error } = await db.from("ad_payments").insert({ campaign_id: c.id, method: $("#p-method").value, reference: ref, amount_kes: amt, payer_phone: $("#p-phone").value.trim() || null });
      if (error) { formStatus(st, "error", esc(U.friendlyError(error))); btn.disabled = false; return; }
      await loadMine();
      openCampaign(c.id, "Thank you. We will check your payment and confirm it here.");
    });
  }
  function payForm(c, set) {
    return `<form class="card cform" id="pay-form" novalidate>
      <h3>Pay for this campaign</h3>
      <div class="notice">${esc(set.payment_instructions || "Contact IMMA Media for payment details.")}</div>
      ${set.mpesa_paybill ? `<p><b>M-Pesa:</b> Paybill/Till <b>${esc(set.mpesa_paybill)}</b>${set.mpesa_account ? `, account <b>${esc(set.mpesa_account)}</b>` : ""}</p>` : ""}
      ${set.bank_details ? `<p><b>Bank transfer:</b> ${esc(set.bank_details)}</p>` : ""}
      <p class="small muted">Amount due: <b>${esc(kes(c.total_kes))}</b>. Your advert goes live only after we confirm the payment. Card and automatic M-Pesa payments are not available yet.</p>
      <div class="form-grid">
        <div class="field"><label for="p-method">How did you pay?</label><select id="p-method"><option value="mpesa_manual">M-Pesa</option><option value="bank_transfer">Bank transfer</option></select></div>
        <div class="field"><label for="p-ref">M-Pesa code or bank reference *</label><input id="p-ref" maxlength="60" style="text-transform:uppercase" placeholder="e.g. SKL4ABC123"></div>
        <div class="field"><label for="p-amt">Amount paid (KSh) *</label><input id="p-amt" type="number" min="1" step="1" value="${Number(c.total_kes)}"></div>
        <div class="field"><label for="p-phone">Phone number used</label><input id="p-phone" type="tel" maxlength="20" value="${esc(S.me.phone)}"></div>
      </div>
      <div class="form-status" id="pay-status" hidden></div>
      <button class="btn-gold" type="submit">I have paid — send for verification</button>
    </form>`;
  }

  // ---------- Billing ----------
  function billing() {
    const invs = S.campaigns.flatMap((c) => (c.ad_invoices || []).map((i) => ({ ...i, camp: c })));
    const pays = S.campaigns.flatMap((c) => (c.ad_payments || []).map((p) => ({ ...p, camp: c })));
    const due = invs.filter((i) => i.status === "unpaid").reduce((n, i) => n + Number(i.amount_kes), 0);
    panel.innerHTML = `
      <div class="kpis"><div class="kpi gold"><small>Outstanding</small><b>${esc(kes(due))}</b></div>
        <div class="kpi"><small>Paid to date</small><b>${esc(kes(invs.filter((i) => i.status === "paid").reduce((n, i) => n + Number(i.amount_kes), 0)))}</b></div></div>
      <div class="card"><h2>Invoices and receipts</h2>
        ${invs.length ? `<div class="table-wrap"><table class="dtable"><thead><tr><th>Number</th><th>Campaign</th><th>Issued</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
          ${invs.map((i) => `<tr><td>${esc(i.number)}</td><td>${esc(i.camp.name)}</td><td>${esc(date(i.issued_at))}</td><td>${esc(kes(i.amount_kes))}</td><td>${badge(i.status)}</td>
            <td class="row-actions"><a class="btn-outline btn-sm" href="invoice.html?id=${i.id}" target="_blank">Invoice</a>${i.receipt_number ? `<a class="btn-outline btn-sm" href="invoice.html?id=${i.id}&receipt=1" target="_blank">Receipt</a>` : ""}${i.status === "unpaid" ? `<button class="btn-gold btn-sm" type="button" data-open="${i.camp.id}">Pay</button>` : ""}</td></tr>`).join("")}
        </tbody></table></div>` : `<p class="empty-state">Invoices appear here when you submit a campaign.</p>`}</div>
      <div class="card"><h2>Payments you reported</h2>
        ${pays.length ? `<div class="table-wrap"><table class="dtable"><thead><tr><th>Date</th><th>Campaign</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead><tbody>
          ${pays.map((p) => `<tr><td>${esc(date(p.created_at))}</td><td>${esc(p.camp.name)}</td><td>${esc(p.reference)}</td><td>${esc(kes(p.amount_kes))}</td><td>${badge(p.status)}</td></tr>`).join("")}
        </tbody></table></div>` : `<p class="empty-state">No payments yet.</p>`}</div>`;
  }

  // ---------- Statistics ----------
  async function stats() {
    const from = U.addDays(U.today(), -29), to = U.today();
    panel.innerHTML = `
      <div class="card"><div class="card-head"><h2>Performance</h2></div>
        <div class="toolbar">
          <div class="field"><label for="s-from">From</label><input type="date" id="s-from" value="${from}"></div>
          <div class="field"><label for="s-to">To</label><input type="date" id="s-to" value="${to}"></div>
          <div class="field"><label for="s-camp">Campaign</label><select id="s-camp"><option value="">All campaigns</option>${S.campaigns.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
          <div class="field"><label for="s-range">Quick range</label><select id="s-range"><option value="">Custom</option><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select></div>
        </div>
      </div>
      <div class="kpis" id="s-kpis"></div>
      <div class="card"><h2>Daily views and clicks</h2><div class="chart-box"><canvas id="s-chart"></canvas></div></div>
      <div class="card"><h2>By campaign and device</h2><div id="s-table"></div></div>
      <p class="small muted">Figures are first-party counts from IMMA News. A view is counted when at least half of the advert is visible for one second; bots, repeated views (within 30 minutes) and repeated clicks are filtered out.</p>`;
    const run = async () => {
      let rows = [];
      try { rows = await statsRows($("#s-from").value, $("#s-to").value, $("#s-camp").value); } catch (e) { $("#s-table").innerHTML = `<p class="notice bad">${esc(U.friendlyError(e))}</p>`; return; }
      renderStats(rows, $("#s-from").value, $("#s-to").value, S.campaigns);
    };
    $("#s-range").addEventListener("change", (e) => { if (!e.target.value) return; $("#s-from").value = U.addDays(U.today(), 1 - Number(e.target.value)); $("#s-to").value = U.today(); run(); });
    ["#s-from", "#s-to", "#s-camp"].forEach((s) => $(s).addEventListener("change", () => { $("#s-range").value = ""; run(); }));
    run();
  }
  function renderStats(rows, from, to, camps) {
    const tot = rows.reduce((t, r) => ({ i: t.i + Number(r.impressions), c: t.c + Number(r.clicks) }), { i: 0, c: 0 });
    const dev = (d) => rows.filter((r) => r.device === d).reduce((t, r) => ({ i: t.i + Number(r.impressions), c: t.c + Number(r.clicks) }), { i: 0, c: 0 });
    const dk = dev("desktop"), mb = dev("mobile");
    $("#s-kpis").innerHTML = `<div class="kpi gold"><small>Views</small><b>${U.num(tot.i)}</b></div><div class="kpi"><small>Clicks</small><b>${U.num(tot.c)}</b></div>
      <div class="kpi"><small>Click-through rate</small><b>${U.pct(tot.c, tot.i)}</b></div><div class="kpi"><small>Desktop / phone views</small><b>${U.num(dk.i)} / ${U.num(mb.i)}</b></div>`;
    const days = []; for (let d = from; d <= to; d = U.addDays(d, 1)) days.push(d);
    const by = (k) => days.map((d) => rows.filter((r) => r.day === d).reduce((n, r) => n + Number(r[k]), 0));
    if (S.chart) S.chart.destroy();
    if (window.Chart) {
      S.chart = new Chart($("#s-chart"), {
        type: "line",
        data: { labels: days.map((d) => U.date(d).replace(/ \d{4}$/, "")), datasets: [
          { label: "Views", data: by("impressions"), borderColor: "#0b4fa8", backgroundColor: "rgba(11,79,168,.12)", fill: true, tension: .3, yAxisID: "y" },
          { label: "Clicks", data: by("clicks"), borderColor: "#f5b003", backgroundColor: "#f5b003", tension: .3, yAxisID: "y1" }] },
        options: { maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
          scales: { y: { beginAtZero: true, title: { display: true, text: "Views" }, ticks: { precision: 0 } }, y1: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "Clicks" }, ticks: { precision: 0 } } } }
      });
    }
    const keyed = {};
    rows.forEach((r) => { const k = r.campaign_id + "|" + r.device; keyed[k] = keyed[k] || { c: r.campaign_id, d: r.device, i: 0, k: 0 }; keyed[k].i += Number(r.impressions); keyed[k].k += Number(r.clicks); });
    const list = Object.values(keyed);
    $("#s-table").innerHTML = list.length ? `<div class="table-wrap"><table class="dtable"><thead><tr><th>Campaign</th><th>Device</th><th>Views</th><th>Clicks</th><th>CTR</th></tr></thead><tbody>
      ${list.map((x) => `<tr><td>${esc((camps.find((c) => c.id === x.c) || {}).name || "—")}</td><td>${x.d === "mobile" ? "Phone" : "Desktop"}</td><td>${U.num(x.i)}</td><td>${U.num(x.k)}</td><td>${U.pct(x.k, x.i)}</td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty-state">No views recorded for these dates yet.</p>`;
  }
  window.IMMA_RENDER_STATS = renderStats;   // reused by the admin dashboard

  // ---------- Notifications ----------
  async function notes() {
    panel.innerHTML = `<div class="card"><div class="card-head"><h2>Notifications</h2>${S.notes.some((n) => !n.is_read) ? `<button class="btn-outline btn-sm" type="button" id="mark-read">Mark all as read</button>` : ""}</div>
      ${S.notes.map(noteHtml).join("") || `<p class="empty-state">No notifications yet.</p>`}
      <p class="small muted">Email notifications are not switched on yet; updates appear here.</p></div>`;
    const b = $("#mark-read");
    if (b) b.addEventListener("click", async () => {
      await db.from("ad_notifications").update({ is_read: true }).eq("user_id", S.user.id).eq("is_read", false);
      await loadMine(); notes();
    });
  }

  // ---------- Profile ----------
  function profile() {
    const m = S.me;
    panel.innerHTML = `
      <form class="card cform" id="prof-form" novalidate>
        <h2>Business profile</h2>
        <div class="form-grid">
          <div class="field"><label>Business name</label><input name="business_name" maxlength="120" value="${esc(m.business_name)}"></div>
          <div class="field"><label>Business category</label><input name="category" maxlength="60" value="${esc(m.category || "")}"></div>
          <div class="field"><label>Contact person</label><input name="contact_name" maxlength="120" value="${esc(m.contact_name)}"></div>
          <div class="field"><label>Phone</label><input name="phone" type="tel" maxlength="20" value="${esc(m.phone)}"></div>
          <div class="field"><label>Email</label><input name="email" type="email" maxlength="160" value="${esc(m.email)}"></div>
          <div class="field"><label>Website</label><input name="website" type="url" maxlength="200" value="${esc(m.website || "")}"></div>
          <div class="field"><label>Billing name</label><input name="billing_name" maxlength="160" value="${esc(m.billing_name || "")}"></div>
          <div class="field"><label>KRA PIN</label><input name="kra_pin" maxlength="20" value="${esc(m.kra_pin || "")}"></div>
          <div class="field full"><label>Billing address</label><textarea name="billing_address" rows="2" maxlength="400">${esc(m.billing_address || "")}</textarea></div>
          <div class="field full"><label>Company logo</label>${m.logo_path ? `<img class="thumb" src="${esc(U.publicUrl(m.logo_path))}" alt="Current logo"> ` : ""}<input type="file" id="pf-logo" accept="image/jpeg,image/png,image/webp"></div>
        </div>
        <p class="small muted">Terms accepted on ${esc(U.dateTime(m.terms_accepted_at))}.</p>
        <div class="form-status" id="pf-status" hidden></div>
        <button class="btn-gold" type="submit">Save changes</button>
      </form>`;
    $("#prof-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      const st = $("#pf-status");
      if (d.website && !/^https?:\/\//i.test(d.website)) { formStatus(st, "error", "Your website address should start with https://"); return; }
      const row = {};
      ["business_name", "category", "contact_name", "phone", "email", "website", "billing_name", "kra_pin", "billing_address"].forEach((k) => { row[k] = String(d[k] || "").trim() || null; });
      try {
        const logo = $("#pf-logo").files[0];
        if (logo) { const chk = await U.checkImage(logo); if (!chk.ok) throw new Error(chk.msg); row.logo_path = await uploadFile(logo, "profile", "logo"); }
        const { error } = await db.from("advertisers").update(row).eq("id", m.id);
        if (error) throw error;
        await loadMine(); showDash(); go("profile");
        formStatus($("#pf-status"), "success", "Saved.");
      } catch (err) { formStatus(st, "error", esc(U.friendlyError(err))); }
    });
  }
})();
