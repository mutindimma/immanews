// IMMA Business Directory — self-service registration (and editing) wizard.
// register.html            start a new listing
// register.html?id=<uuid>  continue / edit an existing one (owners and admins)
(() => {
  const D = window.IMMA_DIR, A = window.IMMA_AUTH;
  const { esc } = D;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const db = A && A.client;
  const params = new URLSearchParams(location.search);
  const STEPS = ["Account", "Business", "Location & contact", "Photos", "Products & services", "Package", "Preview & submit"];
  const SOCIALS = ["facebook", "instagram", "tiktok", "x", "linkedin", "youtube"];
  const S = { step: 0, biz: null, loc: null, hours: [], images: [], products: [], services: [], cats: [], packages: [], mine: [], pkg: params.get("package") || "free", billing: params.get("billing") === "annual" ? "annual" : "monthly", quote: null, admin: false, dirty: false };
  const friendly = (e) => {
    const m = String((e && (e.message || e.details)) || e || "Something went wrong.");
    if (/row-level security|permission denied/i.test(m)) return "You don't have permission to change this listing.";
    if (/businesses_email_check|email/i.test(m) && /check/i.test(m)) return "Please check the email address.";
    if (/phone_check|whatsapp_check/i.test(m)) return "Please check the phone numbers (for example 0712 345 678).";
    if (/website_check/i.test(m)) return "The website must start with https:// or http://";
    if (/video_url_check/i.test(m)) return "Videos must be YouTube or Vimeo links.";
    return m.replace(/^.*?ERROR:\s*/, "");
  };
  const status = (msg, kind) => { const s = $("#bd-status"); if (!s) return; s.hidden = !msg; s.className = "bd-status " + (kind || ""); s.textContent = msg || ""; };

  if (!db) { $("#bd-step").innerHTML = '<p class="bd-empty">The directory is not available right now.</p>'; return; }

  A.onChange(async (user) => {
    if (!user) { S.step = 0; render(); return; }
    const [{ data: cats }, { data: pk }, { data: adm }] = await Promise.all([
      db.from("business_categories").select("id,slug,name,parent_id,sort_order").eq("active", true).order("sort_order"),
      db.from("business_packages").select("*").eq("active", true).order("sort_order"),
      db.rpc("is_admin")
    ]);
    S.cats = cats || []; S.packages = pk || []; S.admin = !!adm;
    const { data: mine } = await db.from("businesses").select("id,name,status,updated_at").order("updated_at", { ascending: false });
    S.mine = mine || [];
    if (params.get("id")) { await load(params.get("id")); S.step = 1; }
    render();
  });

  async function load(id) {
    const { data: b, error } = await db.from("businesses").select("*").eq("id", id).maybeSingle();
    if (error || !b) { status("That listing was not found, or you don't manage it.", "bad"); return; }
    S.biz = b;
    const [loc, hrs, img, prod, svc, sub] = await Promise.all([
      db.from("business_locations").select("*").eq("business_id", id).order("is_primary", { ascending: false }).limit(1),
      db.from("business_hours").select("*").eq("business_id", id).order("weekday"),
      db.from("business_images").select("*").eq("business_id", id).order("sort_order"),
      db.from("business_products").select("*").eq("business_id", id).order("sort_order"),
      db.from("business_services").select("*").eq("business_id", id).order("sort_order"),
      db.from("business_subscriptions").select("package_slug,billing,status").eq("business_id", id).order("created_at", { ascending: false }).limit(1)
    ]);
    S.loc = (loc.data || [])[0] || null; S.hours = hrs.data || []; S.images = img.data || [];
    S.products = prod.data || []; S.services = svc.data || [];
    const last = (sub.data || [])[0];
    if (last && !params.get("package")) { S.pkg = last.package_slug; S.billing = last.billing; }
  }

  // ---------- Rendering ----------
  function progress() {
    $("#bd-progress").innerHTML = STEPS.map((s, i) => `<li class="${i < S.step ? "done" : ""}${i === S.step ? " on" : ""}">${i > 0 && S.biz && i !== S.step ? `<button type="button" data-goto="${i}">${esc(s)}</button>` : esc(s)}</li>`).join("");
  }
  function shell(title, lead, inner, opts = {}) {
    return `<section class="bd-step"><h2>${esc(title)}</h2>${lead ? `<p class="bd-help-lead">${lead}</p>` : ""}
      <form class="bd-form" id="bd-form" novalidate>${inner}</form>
      <p class="bd-status" id="bd-status" role="status" hidden></p>
      <div class="bd-nav">
        ${S.step > 1 ? '<button type="button" class="bd-btn bd-btn-ghost" data-back>← Back</button>' : "<span></span>"}
        <span style="display:flex;gap:8px;flex-wrap:wrap">
          ${S.biz && !opts.noDraft ? '<button type="button" class="bd-btn bd-btn-ghost" data-draft>Save draft</button>' : ""}
          ${opts.next === false ? "" : `<button type="button" class="bd-btn" data-next>${esc(opts.next || "Save and continue →")}</button>`}
        </span>
      </div>
      ${S.biz ? `<p class="bd-save-state">Draft saved automatically when you continue. Listing status: <b>${esc(S.biz.status)}</b>. <a href="/business-directory/dashboard.html">My businesses</a></p>` : ""}
    </section>`;
  }
  const v = (b, k) => esc(b && b[k] != null ? b[k] : "");

  function render() {
    progress();
    const el = $("#bd-step");
    const b = S.biz || {};
    if (S.step === 0) {
      if (!A.user) {
        el.innerHTML = `<section class="bd-step"><h2>Create your free account</h2><p class="bd-help-lead">Sign in with Google to start. One account can manage several businesses, and you can save your listing as a draft and finish later.</p>
          <p><a class="bd-btn bd-btn-gold" href="/signin.html?next=${encodeURIComponent("/business-directory/register.html" + location.search)}">Sign in with Google to continue</a></p>
          <p class="bd-fine">By listing a business you agree to the <a href="/business-directory/terms.html">directory terms</a>. We publish only what you choose to show.</p></section>`;
        return;
      }
      el.innerHTML = `<section class="bd-step"><h2>Welcome, ${esc(A.displayName(A.user).split(" ")[0])}</h2>
        <p class="bd-help-lead">You're signed in as ${esc(A.user.email || "")}. Start a new listing${S.mine.length ? ", or continue one you've already started" : ""}.</p>
        ${S.mine.length ? `<div class="bd-mybiz">${S.mine.map((m) => `<div class="bd-mybiz-row"><div class="grow"><h3>${esc(m.name)}</h3><span class="bd-pill ${esc(m.status)}">${esc(m.status)}</span></div><a class="bd-btn bd-btn-ghost bd-btn-sm" href="?id=${esc(m.id)}">Continue editing</a></div>`).join("")}</div>` : ""}
        <p style="margin-top:18px"><button class="bd-btn bd-btn-gold" type="button" data-new>Start a new listing →</button></p></section>`;
      $("[data-new]", el).addEventListener("click", () => { S.biz = null; S.loc = null; S.hours = []; S.images = []; S.products = []; S.services = []; S.step = 1; render(); });
      return;
    }
    const top = S.cats.filter((c) => !c.parent_id);
    const subs = S.cats.filter((c) => c.parent_id && c.parent_id === b.category_id);
    if (S.step === 1) {
      el.innerHTML = shell("About your business", "Tell customers who you are. Fields marked * are required.", `
        <label>Business name *<input name="name" required maxlength="100" value="${v(b, "name")}" autocomplete="organization"></label>
        <label>Short tagline<input name="tagline" maxlength="140" value="${v(b, "tagline")}" placeholder="e.g. Fresh celebration cakes, made to order"><span class="bd-help">One line shown under your name.</span></label>
        <div class="bd-row">
          <label>Category *<select name="category_id" required><option value="">Choose a category</option>${top.map((c) => `<option value="${c.id}"${c.id === b.category_id ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
          <label>Price range<select name="price_range"><option value="">Not shown</option>${["Budget", "Moderate", "Upmarket", "Premium"].map((t, i) => `<option value="${i + 1}"${b.price_range === i + 1 ? " selected" : ""}>${t}</option>`).join("")}</select></label>
        </div>
        <fieldset class="bd-fieldset" id="bd-subs" ${subs.length ? "" : "hidden"}><legend>Subcategories (optional)</legend><div style="display:flex;flex-wrap:wrap;gap:6px 16px">${subs.map((c) => `<label class="bd-check"><input type="checkbox" name="sub" value="${c.id}"${(b.subcategory_ids || []).includes(c.id) ? " checked" : ""}> ${esc(c.name)}</label>`).join("")}</div></fieldset>
        <label>Description *<textarea name="description" required minlength="40" maxlength="4000" rows="6">${v(b, "description")}</textarea><span class="bd-help">At least 40 characters. What you offer, who you serve and what makes you different.</span></label>
        <label>Keywords<input name="keywords" maxlength="300" value="${esc((b.keywords || []).join(", "))}" placeholder="e.g. birthday cakes, wedding cakes, cupcakes"><span class="bd-help">Separate with commas. Helps people find you in search.</span></label>
        <label>Product categories<input name="product_categories" maxlength="400" value="${esc((b.product_categories || []).join(", "))}" placeholder="e.g. Cakes, Cookies, Custom orders"><span class="bd-help">Used to group your catalogue.</span></label>
        <fieldset class="bd-fieldset"><legend>How customers reach you</legend>
          <label class="bd-check"><input type="checkbox" name="has_premises"${b.has_premises !== false ? " checked" : ""}> We have premises customers can visit</label>
          <label class="bd-check"><input type="checkbox" name="is_online"${b.is_online ? " checked" : ""}> We sell or serve online</label>
          <label class="bd-check"><input type="checkbox" name="delivery"${b.delivery ? " checked" : ""}> We deliver</label>
        </fieldset>`);
      $("[name=category_id]", el).addEventListener("change", (e) => {
        const list = S.cats.filter((c) => c.parent_id === e.target.value);
        const fs = $("#bd-subs"); fs.hidden = !list.length;
        fs.querySelector("div").innerHTML = list.map((c) => `<label class="bd-check"><input type="checkbox" name="sub" value="${c.id}"> ${esc(c.name)}</label>`).join("");
      });
    }
    if (S.step === 2) {
      const l = S.loc || {};
      const hrs = (d) => S.hours.find((h) => h.weekday === d) || {};
      el.innerHTML = shell("Location & contact", "Customers see your county and town. Your street address is shown only if you tick the box below.", `
        <div class="bd-row3">
          <label>County *<select name="county" required><option value="">Choose…</option>${D.COUNTIES.slice().sort((a, c) => a[1].localeCompare(c[1])).map(([s, n]) => `<option value="${s}"${l.county === s ? " selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
          <label>Town *<input name="town" required maxlength="60" value="${v(l, "town")}" placeholder="e.g. Thika"></label>
          <label>Neighbourhood<input name="neighbourhood" maxlength="80" value="${v(l, "neighbourhood")}" placeholder="e.g. Section 9"></label>
        </div>
        <fieldset class="bd-fieldset"><legend>Address (optional)</legend>
          <label>Street address or building<input name="address_line" maxlength="200" value="${v(l, "address_line")}"></label>
          <label>Landmark<input name="landmark" maxlength="120" value="${v(l, "landmark")}" placeholder="e.g. Opposite the Post Office"></label>
          <label class="bd-check"><input type="checkbox" name="show_address"${l.show_address ? " checked" : ""}> <span><b>Show this address and a map pin publicly.</b> Leave unticked if this is a home address. Home-based and online businesses can be listed without a public address.</span></label>
          <div class="bd-row"><label>Map latitude<input name="latitude" inputmode="decimal" value="${v(l, "latitude")}"></label><label>Map longitude<input name="longitude" inputmode="decimal" value="${v(l, "longitude")}"></label></div>
          <p><button type="button" class="bd-btn bd-btn-ghost bd-btn-sm" data-geo>Use my current location</button> <span class="bd-help">Only use this when you are at the business. The pin is shown only if you tick the box above and your package includes a map.</span></p>
        </fieldset>
        <div class="bd-row">
          <label>Phone<input name="phone" type="tel" maxlength="16" value="${v(b, "phone")}" placeholder="0712 345 678" autocomplete="tel"></label>
          <label>WhatsApp<input name="whatsapp" type="tel" maxlength="16" value="${v(b, "whatsapp")}" placeholder="0712 345 678"></label>
        </div>
        <div class="bd-row">
          <label>Business email<input name="email" type="email" maxlength="120" value="${v(b, "email")}"></label>
          <label>Website<input name="website" type="url" maxlength="200" value="${v(b, "website")}" placeholder="https://"><span class="bd-help">Shown on Standard and above.</span></label>
        </div>
        <p class="bd-fine">Only enter contact details the business is happy to publish. Do not enter someone else's personal number without their permission.</p>
        <fieldset class="bd-fieldset"><legend>Social media (Standard and above)</legend><div class="bd-row">${SOCIALS.map((k) => `<label>${D.SOCIAL_NAMES[k]}<input name="s_${k}" type="url" maxlength="200" value="${esc((b.socials || {})[k] || "")}" placeholder="https://"></label>`).join("")}</div></fieldset>
        <label>Promotional video (Premium and Elite)<input name="video_url" type="url" maxlength="200" value="${v(b, "video_url")}" placeholder="https://www.youtube.com/watch?v=…"></label>
        <fieldset class="bd-fieldset"><legend>Opening hours (Standard and above)</legend>
          ${[1, 2, 3, 4, 5, 6, 0].map((d) => { const h = hrs(d); return `<div class="bd-hours-edit" data-day="${d}"><b>${D.DAYS[d]}</b>
            <input type="time" name="o${d}" value="${esc((h.opens || "").slice(0, 5))}" aria-label="${D.DAYS[d]} opens"><input type="time" name="c${d}" value="${esc((h.closes || "").slice(0, 5))}" aria-label="${D.DAYS[d]} closes">
            <label class="bd-check"><input type="checkbox" name="x${d}"${h.closed ? " checked" : ""}> Closed</label></div>`; }).join("")}
          <p><button type="button" class="bd-btn bd-btn-ghost bd-btn-sm" data-copy-hours>Copy Monday to all weekdays</button></p>
          <label>Hours note<input name="hours_note" maxlength="160" value="${v(b, "hours_note")}" placeholder="e.g. Orders by appointment on Sundays"></label>
        </fieldset>`);
      $("[data-geo]", el).addEventListener("click", () => {
        if (!navigator.geolocation) return status("Your browser cannot share its location.", "bad");
        navigator.geolocation.getCurrentPosition((p) => { $("[name=latitude]").value = p.coords.latitude.toFixed(6); $("[name=longitude]").value = p.coords.longitude.toFixed(6); },
          () => status("Location permission was not given.", "bad"), { enableHighAccuracy: true, timeout: 15000 });
      });
      $("[data-copy-hours]", el).addEventListener("click", () => {
        [2, 3, 4, 5].forEach((d) => { $(`[name=o${d}]`).value = $("[name=o1]").value; $(`[name=c${d}]`).value = $("[name=c1]").value; $(`[name=x${d}]`).checked = $("[name=x1]").checked; });
      });
    }
    if (S.step === 3) {
      const thumb = (i) => `<div class="bd-thumb"><img src="${esc(D.media(i.path))}" alt=""><button type="button" data-del-img="${esc(i.id)}" aria-label="Remove photo">×</button></div>`;
      el.innerHTML = shell("Photos", "JPEG, PNG or WebP, up to 3 MB each. Use your own photos, or photos you have permission to use.", `
        <div class="bd-row">
          <fieldset class="bd-fieldset"><legend>Logo (all packages)</legend>${b.logo_path ? `<div class="bd-thumbs"><div class="bd-thumb"><img src="${esc(D.media(b.logo_path))}" alt="Logo"><button type="button" data-del-field="logo_path" aria-label="Remove logo">×</button></div></div>` : ""}<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="logo"></fieldset>
          <fieldset class="bd-fieldset"><legend>Cover photo (Standard and above)</legend>${b.cover_path ? `<div class="bd-thumbs"><div class="bd-thumb"><img src="${esc(D.media(b.cover_path))}" alt="Cover"><button type="button" data-del-field="cover_path" aria-label="Remove cover">×</button></div></div>` : ""}<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="cover"><span class="bd-help">Wide photo, at least 1200 × 400 px.</span></fieldset>
        </div>
        <fieldset class="bd-fieldset"><legend>Gallery: ${S.images.length} photo(s)</legend>
          <p class="bd-help">Standard shows up to 10, Premium 30 and Elite 60. Extra photos are kept but hidden until you upgrade.</p>
          <div class="bd-thumbs">${S.images.map(thumb).join("")}</div>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple data-upload="gallery">
        </fieldset>
        <label class="bd-check"><input type="checkbox" name="photo_ok" required checked> I own these photos or have permission to publish them, and they do not show people who have not agreed.</label>`);
    }
    if (S.step === 4) {
      const prod = (p, i) => `<div class="bd-item" data-prod="${i}">
        <div class="bd-item-head"><b>${esc(p.name || "New product")}</b><button type="button" class="bd-link" data-del-prod="${i}">Remove</button></div>
        <div class="bd-row"><label>Name *<input data-k="name" maxlength="100" value="${esc(p.name || "")}"></label>
          <label>Group<input data-k="product_category" maxlength="60" list="bd-pcats" value="${esc(p.product_category || "")}"></label></div>
        <label>Description<textarea data-k="description" maxlength="600" rows="2">${esc(p.description || "")}</textarea></label>
        <div class="bd-row3"><label>Price (KSh)<input data-k="price_kes" type="number" min="0" step="1" value="${p.price_kes ?? ""}"></label>
          <label>Offer price (KSh)<input data-k="promo_price_kes" type="number" min="0" step="1" value="${p.promo_price_kes ?? ""}"><span class="bd-help">Premium and Elite.</span></label>
          <label>Availability<select data-k="availability">${[["available", "Available"], ["on_order", "Made to order"], ["out_of_stock", "Out of stock"]].map(([k, t]) => `<option value="${k}"${p.availability === k ? " selected" : ""}>${t}</option>`).join("")}</select></label></div>
        <label>Photo ${p.image_path ? `<img src="${esc(D.media(p.image_path))}" alt="" style="width:90px;height:68px;object-fit:cover;border-radius:6px">` : ""}<input type="file" accept="image/jpeg,image/png,image/webp" data-prod-img="${i}"></label>
      </div>`;
      const svc = (s, i) => `<div class="bd-item" data-svc="${i}">
        <div class="bd-item-head"><b>${esc(s.name || "New service")}</b><button type="button" class="bd-link" data-del-svc="${i}">Remove</button></div>
        <div class="bd-row"><label>Name *<input data-k="name" maxlength="100" value="${esc(s.name || "")}"></label><label>Price from (KSh)<input data-k="price_from_kes" type="number" min="0" value="${s.price_from_kes ?? ""}"></label></div>
        <div class="bd-row"><label>Description<input data-k="description" maxlength="600" value="${esc(s.description || "")}"></label><label>Price note<input data-k="price_note" maxlength="80" value="${esc(s.price_note || "")}" placeholder="e.g. per hour"></label></div>
      </div>`;
      el.innerHTML = shell("Products & services", "Shown on Standard and above. Customers can order products directly on WhatsApp. Leave prices empty if you prefer customers to ask.", `
        <datalist id="bd-pcats">${(b.product_categories || []).map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
        <h3 style="margin:0">Products</h3><div class="bd-list-edit">${S.products.map(prod).join("") || '<p class="bd-muted">No products yet.</p>'}</div>
        <p><button type="button" class="bd-btn bd-btn-ghost bd-btn-sm" data-add-prod>+ Add a product</button></p>
        <h3 style="margin:10px 0 0">Services</h3><div class="bd-list-edit">${S.services.map(svc).join("") || '<p class="bd-muted">No services yet.</p>'}</div>
        <p><button type="button" class="bd-btn bd-btn-ghost bd-btn-sm" data-add-svc>+ Add a service</button></p>`);
    }
    if (S.step === 5) {
      el.innerHTML = shell("Choose a package", "Start free, or choose a paid package for more visibility. You pay only after you submit; your listing stays on Free until payment is confirmed.", `
        <div class="bd-billing" role="group" aria-label="Billing period"><button type="button" data-bill="monthly" class="${S.billing === "monthly" ? "on" : ""}">Monthly</button><button type="button" data-bill="annual" class="${S.billing === "annual" ? "on" : ""}">Annual</button></div>
        <div class="bd-packages">${S.packages.map((p) => {
          const price = p.price_monthly_kes <= 0 ? "KSh 0" : S.billing === "annual" ? D.kes(Math.round(p.price_monthly_kes * 12 * (1 - p.annual_discount_pct / 100))) + " <small>/ year</small>" : D.kes(p.price_monthly_kes) + " <small>/ month</small>";
          return `<label class="bd-pack${p.highlight ? " hl" : ""}${S.pkg === p.slug ? " selected" : ""}" style="cursor:pointer">${p.highlight ? '<span class="bd-pop">Most popular</span>' : ""}
            <span style="display:flex;gap:8px;align-items:center"><input type="radio" name="pkg" value="${esc(p.slug)}"${S.pkg === p.slug ? " checked" : ""}> <b style="font-size:1.15rem">${esc(p.name)}</b></span>
            <span class="bd-amount">${price}</span><ul>${(p.benefits || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul></label>`;
        }).join("")}</div>
        <div class="bd-row"><label>Discount or founding-business code<input name="code" maxlength="30" style="text-transform:uppercase"></label><span style="align-self:end"><button type="button" class="bd-btn bd-btn-ghost" data-quote>Check price</button></span></div>
        <p id="bd-quote" class="bd-fine"></p>
        <p class="bd-fine">A paid package never gives a verified badge or affects reviews. Featured and priority placements are labelled for readers.</p>`);
      $$("[data-bill]", el).forEach((x) => x.addEventListener("click", () => { S.billing = x.dataset.bill; collect5(); render(); }));
      $$("[name=pkg]", el).forEach((x) => x.addEventListener("change", () => { S.pkg = x.value; $$(".bd-pack", el).forEach((p) => p.classList.toggle("selected", p.contains(x))); }));
      $("[data-quote]", el).addEventListener("click", quote);
    }
    if (S.step === 6) {
      const pk = S.packages.find((p) => p.slug === S.pkg) || { name: "Free", price_monthly_kes: 0 };
      const checks = [
        [!!b.name, "Business name"], [!!b.category_id, "Category"], [(b.description || "").length >= 40, "Description (40+ characters)"],
        [!!(S.loc && S.loc.county && S.loc.town), "County and town"], [!!(b.phone || b.whatsapp || b.email), "At least one way to contact you"], [!!b.logo_path, "Logo (recommended)"]
      ];
      el.innerHTML = shell("Preview & submit", "Check how your listing looks, then submit it for a quick review by IMMA Media.", `
        <ul style="list-style:none;padding:0;margin:0">${checks.map(([ok, t]) => `<li>${ok ? "✅" : t.includes("recommended") ? "➖" : "❌"} ${esc(t)}</li>`).join("")}</ul>
        <p><a class="bd-btn bd-btn-ghost" href="/business-directory/listing.html?preview=${esc(b.id)}" target="_blank" rel="noopener">Open preview ↗</a></p>
        <p>Package: <b>${esc(pk.name)}</b>${pk.price_monthly_kes > 0 ? ` (${esc(S.billing)})` : ""}. ${pk.price_monthly_kes > 0 ? "After you submit, you'll get an invoice with M-Pesa and bank payment details. Paid features start when we confirm your payment." : ""}</p>
        <label class="bd-check"><input type="checkbox" name="terms" required${b.terms_accepted_at ? " checked" : ""}> <span>I have read and agree to the <a href="/business-directory/terms.html" target="_blank" rel="noopener">IMMA Business Directory terms</a>. The information is accurate, I am authorised to list this business, it does not sell illegal products, and I have permission to publish these contact details and photos.</span></label>`,
        { next: b.status === "approved" ? "Save changes" : b.status === "pending" ? "Update submission" : "Submit for approval", noDraft: false });
    }
    wireCommon();
  }

  function wireCommon() {
    const el = $("#bd-step");
    $$("[data-goto]").forEach((x) => x.addEventListener("click", async () => { if (await save(false)) { S.step = Number(x.dataset.goto); render(); } }));
    const back = $("[data-back]", el); if (back) back.addEventListener("click", async () => { if (await save(false)) { S.step--; render(); } });
    const next = $("[data-next]", el); if (next) next.addEventListener("click", async () => { next.disabled = true; const ok = await save(true); next.disabled = false; if (ok && S.step < 6) { S.step++; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } });
    const draft = $("[data-draft]", el); if (draft) draft.addEventListener("click", async () => { if (await save(false)) status("Draft saved.", "ok"); });
    // photos
    $$("[data-upload]", el).forEach((inp) => inp.addEventListener("change", () => upload(inp)));
    $$("[data-del-img]", el).forEach((x) => x.addEventListener("click", () => delImage(x.dataset.delImg)));
    $$("[data-del-field]", el).forEach((x) => x.addEventListener("click", async () => { const r = await db.from("businesses").update({ [x.dataset.delField]: null }).eq("id", S.biz.id).select().single(); if (r.error) return status(friendly(r.error), "bad"); S.biz = r.data; render(); }));
    // products & services
    const addP = $("[data-add-prod]", el); if (addP) addP.addEventListener("click", () => { collect4(); S.products.push({ availability: "available" }); render(); });
    const addS = $("[data-add-svc]", el); if (addS) addS.addEventListener("click", () => { collect4(); S.services.push({}); render(); });
    $$("[data-del-prod]", el).forEach((x) => x.addEventListener("click", async () => { collect4(); const p = S.products.splice(Number(x.dataset.delProd), 1)[0]; if (p && p.id) await db.from("business_products").delete().eq("id", p.id); render(); }));
    $$("[data-del-svc]", el).forEach((x) => x.addEventListener("click", async () => { collect4(); const s = S.services.splice(Number(x.dataset.delSvc), 1)[0]; if (s && s.id) await db.from("business_services").delete().eq("id", s.id); render(); }));
    $$("[data-prod-img]", el).forEach((inp) => inp.addEventListener("change", () => uploadProduct(inp)));
    $$("input, select, textarea", el).forEach((x) => x.addEventListener("input", () => (S.dirty = true)));
  }

  // ---------- Validation and saving ----------
  function invalid(name, msg) {
    const f = $(`#bd-form [name="${name}"]`);
    if (f) { f.setAttribute("aria-invalid", "true"); const s = document.createElement("span"); s.className = "bd-err"; s.textContent = msg; f.insertAdjacentElement("afterend", s); f.focus(); }
    status(msg, "bad");
    return false;
  }
  const clearErrors = () => { $$("#bd-form .bd-err").forEach((x) => x.remove()); $$("#bd-form [aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid")); status(""); };
  const list = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 30);
  const phoneOk = (p) => !p || /^\+?[0-9 ]{9,16}$/.test(p);

  async function save(strict) {
    clearErrors();
    const f = $("#bd-form");
    if (!f) return true;
    const g = (n) => (f.elements[n] ? String(f.elements[n].value || "").trim() : "");
    try {
      if (S.step === 1) {
        if (!g("name") || g("name").length < 2) return invalid("name", "Please enter the business name.");
        if (strict && !g("category_id")) return invalid("category_id", "Please choose a category.");
        if (strict && g("description").length < 40) return invalid("description", "Please write at least 40 characters.");
        const row = { name: g("name"), tagline: g("tagline") || null, category_id: g("category_id") || null, price_range: g("price_range") ? Number(g("price_range")) : null,
          subcategory_ids: $$("[name=sub]:checked", f).map((x) => x.value), description: g("description") || null, keywords: list(g("keywords")), product_categories: list(g("product_categories")),
          has_premises: f.elements.has_premises.checked, is_online: f.elements.is_online.checked, delivery: f.elements.delivery.checked };
        const r = S.biz ? await db.from("businesses").update(row).eq("id", S.biz.id).select().single() : await db.from("businesses").insert(Object.assign(row, { status: "draft" })).select().single();
        if (r.error) throw r.error;
        S.biz = r.data;
        if (!params.get("id")) history.replaceState(null, "", "?id=" + S.biz.id);
      }
      if (S.step === 2) {
        if (strict && !g("county")) return invalid("county", "Please choose a county.");
        if (strict && g("town").length < 2) return invalid("town", "Please enter the town.");
        for (const n of ["phone", "whatsapp"]) if (!phoneOk(g(n))) return invalid(n, "Please use a phone number like 0712 345 678 or +254 712 345 678.");
        if (g("email") && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g("email"))) return invalid("email", "Please check the email address.");
        if (g("website") && !/^https?:\/\//.test(g("website"))) return invalid("website", "The website must start with https://");
        if (strict && !g("phone") && !g("whatsapp") && !g("email")) return invalid("phone", "Please add at least one way for customers to contact you.");
        const socials = {};
        for (const k of SOCIALS) { const u = g("s_" + k); if (u) { if (!D.socialOk(k, u)) return invalid("s_" + k, `That doesn't look like a ${D.SOCIAL_NAMES[k]} link (it must start with https://).`); socials[k] = u; } }
        if (g("video_url") && !D.videoEmbed(g("video_url"))) return invalid("video_url", "Please use a YouTube or Vimeo link.");
        const lat = g("latitude") ? Number(g("latitude")) : null, lng = g("longitude") ? Number(g("longitude")) : null;
        if ((lat != null && (isNaN(lat) || lat < -5 || lat > 5.5)) || (lng != null && (isNaN(lng) || lng < 33.5 || lng > 42.5))) return invalid("latitude", "That map position is outside Kenya.");
        const r = await db.from("businesses").update({ phone: g("phone") || null, whatsapp: g("whatsapp") || null, email: g("email") || null, website: g("website") || null, socials, video_url: g("video_url") || null, hours_note: g("hours_note") || null }).eq("id", S.biz.id).select().single();
        if (r.error) throw r.error;
        S.biz = r.data;
        if (g("county") && g("town")) {
          const loc = { business_id: S.biz.id, county: g("county"), town: g("town"), neighbourhood: g("neighbourhood") || null, address_line: g("address_line") || null, landmark: g("landmark") || null,
            show_address: f.elements.show_address.checked, latitude: lat, longitude: lng, is_primary: true };
          const lr = S.loc ? await db.from("business_locations").update(loc).eq("id", S.loc.id).select().single() : await db.from("business_locations").insert(loc).select().single();
          if (lr.error) throw lr.error;
          S.loc = lr.data;
        }
        const hours = [];
        for (const d of [0, 1, 2, 3, 4, 5, 6]) {
          const o = g("o" + d), c = g("c" + d), x = f.elements["x" + d].checked;
          if (x) hours.push({ business_id: S.biz.id, weekday: d, closed: true });
          else if (o && c) hours.push({ business_id: S.biz.id, weekday: d, opens: o, closes: c, closed: false });
          else if (o || c) return invalid("o" + d, `Please give both opening and closing times for ${D.DAYS[d]}, or tick Closed.`);
        }
        const del = await db.from("business_hours").delete().eq("business_id", S.biz.id);
        if (del.error) throw del.error;
        if (hours.length) { const hr = await db.from("business_hours").insert(hours).select(); if (hr.error) throw hr.error; S.hours = hr.data; } else S.hours = [];
      }
      if (S.step === 3 && strict && !f.elements.photo_ok.checked) return invalid("photo_ok", "Please confirm you may publish these photos.");
      if (S.step === 4) {
        collect4();
        for (const [i, p] of S.products.entries()) {
          if (!p.name) { status(`Product ${i + 1} needs a name (or remove it).`, "bad"); return false; }
          const row = { business_id: S.biz.id, name: p.name, description: p.description || null, product_category: p.product_category || null, price_kes: p.price_kes === "" || p.price_kes == null ? null : Number(p.price_kes),
            promo_price_kes: p.promo_price_kes === "" || p.promo_price_kes == null ? null : Number(p.promo_price_kes), availability: p.availability || "available", image_path: p.image_path || null, sort_order: i * 10 };
          const r = p.id ? await db.from("business_products").update(row).eq("id", p.id).select().single() : await db.from("business_products").insert(row).select().single();
          if (r.error) throw r.error;
          S.products[i] = r.data;
        }
        for (const [i, s] of S.services.entries()) {
          if (!s.name) { status(`Service ${i + 1} needs a name (or remove it).`, "bad"); return false; }
          const row = { business_id: S.biz.id, name: s.name, description: s.description || null, price_from_kes: s.price_from_kes === "" || s.price_from_kes == null ? null : Number(s.price_from_kes), price_note: s.price_note || null, sort_order: i * 10 };
          const r = s.id ? await db.from("business_services").update(row).eq("id", s.id).select().single() : await db.from("business_services").insert(row).select().single();
          if (r.error) throw r.error;
          S.services[i] = r.data;
        }
      }
      if (S.step === 5) { collect5(); if (strict && S.pkg !== "free") { const q = await quote(); if (!q) return false; } }
      if (S.step === 6 && strict) return submit();
      S.dirty = false;
      return true;
    } catch (e) { status(friendly(e), "bad"); return false; }
  }
  function collect4() {
    $$("[data-prod]").forEach((el) => { const p = S.products[Number(el.dataset.prod)]; $$("[data-k]", el).forEach((i) => (p[i.dataset.k] = i.value)); });
    $$("[data-svc]").forEach((el) => { const s = S.services[Number(el.dataset.svc)]; $$("[data-k]", el).forEach((i) => (s[i.dataset.k] = i.value)); });
  }
  function collect5() { const c = $("[name=pkg]:checked"); if (c) S.pkg = c.value; }
  async function quote() {
    collect5();
    const out = $("#bd-quote");
    if (S.pkg === "free") { out.textContent = "Free: no payment needed."; return { amount: 0 }; }
    const code = ($("[name=code]") || {}).value || null;
    const { data, error } = await db.rpc("biz_quote", { p_package: S.pkg, p_billing: S.billing, p_code: code });
    if (error) { out.innerHTML = `<span class="bd-err">${esc(friendly(error))}</span>`; return null; }
    S.quote = data;
    out.innerHTML = `${esc(data.name)} (${esc(data.billing)}): ${D.kes(data.list_price)}${data.discount > 0 ? ` − ${D.kes(data.discount)} discount = <b>${D.kes(data.amount)}</b>` : ""}`;
    return data;
  }

  async function submit() {
    const f = $("#bd-form");
    if (!f.elements.terms.checked) return invalid("terms", "Please accept the directory terms to submit.");
    const b = S.biz;
    if (!b.category_id || (b.description || "").length < 40) { status("Please complete the Business step first (category and description).", "bad"); S.step = 1; render(); return false; }
    if (!S.loc) { status("Please add your county and town.", "bad"); S.step = 2; render(); return false; }
    if (!b.phone && !b.whatsapp && !b.email) { status("Please add at least one way for customers to contact you.", "bad"); S.step = 2; render(); return false; }
    const upd = { terms_accepted_at: b.terms_accepted_at || new Date().toISOString() };
    if (b.status === "draft" || b.status === "rejected") upd.status = "pending";
    const r = await db.from("businesses").update(upd).eq("id", b.id).select().single();
    if (r.error) { status(friendly(r.error), "bad"); return false; }
    S.biz = r.data;
    let sub = null;
    if (S.pkg !== "free") {
      const { data: active } = await db.from("business_subscriptions").select("id,package_slug,status,ends_on").eq("business_id", b.id).in("status", ["active", "complimentary", "pending_payment"]);
      const already = (active || []).find((x) => x.package_slug === S.pkg && x.status !== "pending_payment");
      if (!already) {
        const code = S.quote && S.quote.code;
        const q = await db.rpc("biz_start_subscription", { p_business: b.id, p_package: S.pkg, p_billing: S.billing, p_code: code || null });
        if (q.error) { status(friendly(q.error), "bad"); return false; }
        sub = q.data;
      }
    }
    $("#bd-step").innerHTML = `<section class="bd-step"><h2>${S.biz.status === "approved" ? "Changes saved" : "Submitted for approval"}</h2>
      <p class="bd-help-lead">${S.biz.status === "approved" ? "Your live listing has been updated." : "Thank you. IMMA Media will check your listing, usually within two working days. We may contact you to confirm details."}</p>
      ${sub ? `<div class="bd-notice"><b>Invoice ${esc(sub.invoice.number)}: ${D.kes(sub.invoice.amount_kes)}</b><br>Your ${esc(S.pkg)} features start once we confirm your payment. Pay and enter your M-Pesa or bank reference from your dashboard.</div>` : ""}
      <p><a class="bd-btn" href="/business-directory/dashboard.html?b=${esc(S.biz.id)}">Go to my dashboard</a> <a class="bd-btn bd-btn-ghost" href="/business-directory/listing.html?preview=${esc(S.biz.id)}">Preview listing</a></p></section>`;
    $("#bd-progress").innerHTML = STEPS.map((s) => `<li class="done">${esc(s)}</li>`).join("");
    return false;
  }

  // ---------- Uploads (business-media/<business id>/...) ----------
  async function put(file, folder) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Please use a JPEG, PNG or WebP image.");
    if (file.size > 3 * 1024 * 1024) throw new Error(`${file.name} is larger than 3 MB. Please make it smaller.`);
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
    const path = `${S.biz.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await db.storage.from("business-media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (error) throw error;
    return path;
  }
  async function upload(inp) {
    if (!S.biz) return status("Please save the Business step first.", "bad");
    status("Uploading…");
    try {
      const kind = inp.dataset.upload;
      if (kind === "gallery") {
        for (const file of inp.files) {
          const path = await put(file, "gallery");
          const r = await db.from("business_images").insert({ business_id: S.biz.id, path, sort_order: (S.images.length + 1) * 10 }).select().single();
          if (r.error) throw r.error;
          S.images.push(r.data);
        }
      } else {
        const path = await put(inp.files[0], kind);
        const r = await db.from("businesses").update({ [kind + "_path"]: path }).eq("id", S.biz.id).select().single();
        if (r.error) throw r.error;
        S.biz = r.data;
      }
      render(); status("Uploaded.", "ok");
    } catch (e) { status(friendly(e), "bad"); }
  }
  async function delImage(id) {
    const img = S.images.find((i) => i.id === id);
    const r = await db.from("business_images").delete().eq("id", id);
    if (r.error) return status(friendly(r.error), "bad");
    if (img) db.storage.from("business-media").remove([img.path]);
    S.images = S.images.filter((i) => i.id !== id); render();
  }
  async function uploadProduct(inp) {
    collect4();
    try { status("Uploading…"); S.products[Number(inp.dataset.prodImg)].image_path = await put(inp.files[0], "products"); render(); status("Photo added. Remember to save.", "ok"); }
    catch (e) { status(friendly(e), "bad"); }
  }
  window.addEventListener("beforeunload", (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });
})();
