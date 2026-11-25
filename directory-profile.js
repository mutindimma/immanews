// IMMA Business Directory — business profile behaviour.
// On built profile pages (/business-directory/<slug>/) it adds saving, sharing, reviews,
// enquiries, reports, claims and visit counting. On listing.html it also renders the
// profile itself: ?s=<slug> (a listing approved after the last build) or ?preview=<id>
// (owners and administrators previewing a draft).
(() => {
  const D = window.IMMA_DIR, A = window.IMMA_AUTH;
  const { esc } = D;
  const db = A && A.client;
  const $ = (s, r = document) => r.querySelector(s);
  const toast = (msg, bad) => { const d = document.createElement("div"); d.className = "bd-status " + (bad ? "bad" : "ok"); d.textContent = msg; d.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;max-width:420px;box-shadow:0 10px 30px rgba(0,0,0,.2)"; document.body.appendChild(d); setTimeout(() => d.remove(), 5000); };
  const friendly = (e) => String((e && (e.message || e.details)) || e || "Something went wrong.").replace(/^.*?ERROR:\s*/, "");
  const session = (() => { try { let s = sessionStorage.getItem("imma_bd_s"); if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("imma_bd_s", s); } return s; } catch (e) { return null; } })();
  const measure = () => { try { return (JSON.parse(localStorage.getItem("imma_prefs_v1")) || {}).adMeasure !== false; } catch (e) { return true; } };
  let BIZ = null, PREVIEW = false;

  const track = (ev) => { if (db && BIZ && !PREVIEW && measure()) db.rpc("biz_track", { p_business: BIZ.id, p_event: ev, p_session: session, p_source: document.referrer ? new URL(document.referrer).hostname.slice(0, 60) : "direct" }).then(() => {}, () => {}); };

  function dialog(title, body) {
    const d = document.createElement("dialog");
    d.className = "bd-dialog";
    d.innerHTML = `<div class="bd-dialog-inner"><button class="bd-x" type="button" aria-label="Close">×</button><h2>${esc(title)}</h2>${body}</div>`;
    document.body.appendChild(d);
    d.querySelector(".bd-x").addEventListener("click", () => d.close());
    d.addEventListener("close", () => d.remove());
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
    d.showModal();
    return d;
  }
  const needSignIn = (why) => dialog("Please sign in", `<p>${esc(why)}</p><p><a class="bd-btn" href="/signin.html?next=${encodeURIComponent(location.pathname + location.search)}">Sign in with Google</a></p>`);

  // ---------- Loaders for listing.html ----------
  const EXTRA = (id) => Promise.all([
    db.from("dir_images").select("*").eq("business_id", id).order("sort_order"),
    db.from("dir_products").select("*").eq("business_id", id).order("sort_order"),
    db.from("dir_services").select("*").eq("business_id", id).order("sort_order"),
    db.from("dir_promotions").select("*").eq("business_id", id),
    db.from("dir_reviews").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(50)
  ]).then(([i, p, s, pr, r]) => ({ images: i.data || [], products: p.data || [], services: s.data || [], promotions: pr.data || [], reviews: r.data || [] }));

  async function loadPublic(slug) {
    const { data } = await db.from("dir_businesses").select("*").eq("slug", slug).maybeSingle();
    if (!data) return null;
    return { b: data, x: await EXTRA(data.id) };
  }
  // Draft preview: reads the owner's own rows (row-level security allows only owners and admins)
  async function loadPreview(id) {
    const { data: b, error } = await db.from("businesses").select("*, business_categories(slug,name)").eq("id", id).maybeSingle();
    if (error || !b) return null;
    const [loc, hrs, img, prod, svc, promo] = await Promise.all([
      db.from("business_locations").select("*").eq("business_id", id).order("is_primary", { ascending: false }).limit(1),
      db.from("business_hours").select("*").eq("business_id", id).order("weekday"),
      db.from("business_images").select("*").eq("business_id", id).order("sort_order"),
      db.from("business_products").select("*").eq("business_id", id).eq("active", true).order("sort_order"),
      db.from("business_services").select("*").eq("business_id", id).order("sort_order"),
      db.from("business_promotions").select("*").eq("business_id", id).eq("active", true)
    ]);
    const l = (loc.data || [])[0] || {};
    const view = Object.assign({}, b, {
      category_slug: b.business_categories && b.business_categories.slug, category_name: b.business_categories && b.business_categories.name,
      county: l.county, town: l.town, neighbourhood: l.neighbourhood,
      address_line: l.show_address ? l.address_line : null, landmark: l.show_address ? l.landmark : null,
      latitude: l.show_address ? l.latitude : null, longitude: l.show_address ? l.longitude : null, allow_map: true,
      hours: (hrs.data || []).map((h) => ({ d: h.weekday, o: (h.opens || "").slice(0, 5), c: (h.closes || "").slice(0, 5), x: h.closed }))
    });
    return { b: view, x: { images: img.data || [], products: prod.data || [], services: svc.data || [], promotions: promo.data || [], reviews: [] } };
  }

  async function renderListing() {
    const root = $("#bd-root");
    if (!root) return false;
    const p = new URLSearchParams(location.search);
    const slug = p.get("s"), pid = p.get("preview");
    if (!db) { root.innerHTML = '<div class="wrap bd-empty"><p>The directory is not available right now.</p></div>'; return true; }
    let r = null;
    if (pid) {
      PREVIEW = true;
      await new Promise((res) => A.onChange((u) => res(u)));
      if (!A.user) { location.replace("/signin.html?next=" + encodeURIComponent(location.pathname + location.search)); return true; }
      r = await loadPreview(pid);
    } else if (slug) r = await loadPublic(slug);
    if (!r) {
      root.innerHTML = `<div class="wrap" style="padding:40px 0"><div class="bd-empty"><h3>Business not found</h3><p>This listing may be waiting for approval or may have been removed.</p><p><a class="bd-btn" href="/business-directory/">Search the directory</a></p></div></div>`;
      return true;
    }
    root.innerHTML = (PREVIEW ? `<p class="wrap bd-notice" style="margin-top:14px"><b>Preview.</b> This is how your listing will look. What the public sees depends on your package (for example, photos need Standard or above) and on approval by IMMA Media. <a href="/business-directory/register.html?id=${esc(r.b.id)}">Back to editing</a></p>` : "") + D.profile(r.b, r.x);
    document.title = `${r.b.name}${r.b.town ? " · " + r.b.town : ""} · IMMA Business Directory`;
    if (!PREVIEW) {
      const c = document.createElement("link"); c.rel = "canonical"; c.href = D.SITE + D.profileUrl(r.b); document.head.appendChild(c);
    }
    return true;
  }

  // ---------- Behaviour ----------
  function wire() {
    const el = $(".bd-profile[data-biz]");
    if (!el) return;
    BIZ = { id: el.dataset.biz, slug: el.dataset.slug, name: ($("h1", el) || {}).textContent };
    if (PREVIEW) { el.querySelectorAll("form, [data-write-review], [data-save], [data-report], [data-claim]").forEach((x) => x.setAttribute("disabled", "")); return; }
    track("view");
    el.addEventListener("click", (e) => { const t = e.target.closest("[data-track]"); if (t) track(t.dataset.track); });

    // Share
    $("[data-share]", el).addEventListener("click", async () => {
      const url = D.SITE + "/business-directory/" + BIZ.slug + "/";
      track("share");
      if (navigator.share) { try { await navigator.share({ title: BIZ.name, text: `${BIZ.name} on the IMMA Business Directory`, url }); return; } catch (e) { if (e.name === "AbortError") return; } }
      dialog("Share this business", `<p class="bd-actions">
        <a class="bd-btn bd-btn-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(BIZ.name + " " + url)}">WhatsApp</a>
        <a class="bd-btn bd-btn-ghost" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a>
        <a class="bd-btn bd-btn-ghost" target="_blank" rel="noopener" href="https://x.com/intent/post?url=${encodeURIComponent(url)}">X</a>
        <button class="bd-btn bd-btn-ghost" type="button" data-copy>Copy link</button></p>`)
        .querySelector("[data-copy]").addEventListener("click", (e) => { navigator.clipboard.writeText(url).then(() => (e.target.textContent = "Copied")); });
    });

    // Save (favourites)
    const save = $("[data-save]", el);
    const paintSave = async () => {
      if (!A.user) { save.textContent = "☆ Save"; save.setAttribute("aria-pressed", "false"); return; }
      const { data } = await db.from("business_favourites").select("business_id").eq("business_id", BIZ.id).maybeSingle();
      save.textContent = data ? "★ Saved" : "☆ Save"; save.setAttribute("aria-pressed", data ? "true" : "false");
    };
    A.onChange(paintSave);
    save.addEventListener("click", async () => {
      if (!A.user) return needSignIn("Sign in to save businesses to your account.");
      const on = save.getAttribute("aria-pressed") === "true";
      const r = on ? await db.from("business_favourites").delete().eq("business_id", BIZ.id).eq("user_id", A.user.id)
                   : await db.from("business_favourites").insert({ business_id: BIZ.id, user_id: A.user.id });
      if (r.error) toast(friendly(r.error), true); else paintSave();
    });

    // Report incorrect information / a review
    const report = (reviewId) => {
      const d = dialog(reviewId ? "Report this review" : "Report incorrect information", `<form class="bd-form">
        <label>What is wrong?<select name="reason" required>
          ${reviewId ? '<option value="fake_review">Fake or paid review</option><option value="inappropriate">Offensive or inappropriate</option><option value="personal_information">Shares personal information</option><option value="spam">Spam</option>'
            : '<option value="incorrect_information">Incorrect information</option><option value="closed">Business has closed</option><option value="fraud">Fraud or scam</option><option value="illegal">Illegal products or services</option><option value="personal_information">Publishes my personal details</option><option value="inappropriate">Inappropriate content</option>'}
          <option value="other">Something else</option></select></label>
        <label>Details<textarea name="details" maxlength="1500" rows="4" required></textarea></label>
        <label>Your phone or email (optional, so we can follow up)<input name="contact" maxlength="120"></label>
        <button class="bd-btn" type="submit">Send report</button><p class="bd-status" role="status" hidden></p></form>`);
      $("form", d).addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = new FormData(e.target), st = $(".bd-status", d);
        const { error } = await db.from("business_reports").insert({ business_id: reviewId ? null : BIZ.id, review_id: reviewId || null, reason: f.get("reason"), details: f.get("details"), contact: f.get("contact") || null, status: "open" });
        st.hidden = false; st.className = "bd-status " + (error ? "bad" : "ok");
        st.textContent = error ? friendly(error) : "Thank you. IMMA Media will look into it.";
        if (!error) setTimeout(() => d.close(), 1800);
      });
    };
    $("[data-report]", el).addEventListener("click", () => report(null));
    el.addEventListener("click", (e) => { const b = e.target.closest("[data-report-review]"); if (b) report(b.dataset.reportReview); });

    // Write a review
    $("[data-write-review]", el).addEventListener("click", () => {
      if (!A.user) return needSignIn("Reviews come from signed-in readers, so we can stop fake reviews.");
      const d = dialog(`Review ${BIZ.name}`, `<form class="bd-form">
        <fieldset class="bd-fieldset"><legend>Your rating</legend><div style="display:flex;gap:10px;flex-wrap:wrap">${[5, 4, 3, 2, 1].map((n) => `<label class="bd-check"><input type="radio" name="rating" value="${n}" required> ${"★".repeat(n)}</label>`).join("")}</div></fieldset>
        <label>Title (optional)<input name="title" maxlength="100"></label>
        <label>Your review<textarea name="body" minlength="20" maxlength="2000" rows="5" required></textarea><span class="bd-help">At least 20 characters. Describe your own experience.</span></label>
        <label>Name shown<input name="reviewer_name" maxlength="40" value="${esc(D.esc((A.displayName(A.user) || "").split(" ")[0]))}"></label>
        <label class="bd-check"><input type="checkbox" required> This is my honest experience, and I have no connection to the business and was not paid or rewarded for this review.</label>
        <button class="bd-btn" type="submit">Submit review</button><p class="bd-status" role="status" hidden></p></form>`);
      $("form", d).addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = new FormData(e.target), st = $(".bd-status", d);
        const { error } = await db.from("business_reviews").insert({ business_id: BIZ.id, user_id: A.user.id, rating: Number(f.get("rating")), title: f.get("title") || null, body: f.get("body"), reviewer_name: f.get("reviewer_name") || null });
        st.hidden = false; st.className = "bd-status " + (error ? "bad" : "ok");
        st.textContent = error ? (/duplicate/.test(error.message) ? "You have already reviewed this business. You can edit it from your account." : friendly(error)) : "Thank you. Your review will appear once it has been checked.";
        if (!error) e.target.querySelector("button").disabled = true;
      });
    });

    // Enquiry
    const form = $("[data-enquiry]", el);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(form), st = $(".bd-status", form);
      const phone = (f.get("phone") || "").trim(), email = (f.get("email") || "").trim();
      st.hidden = false;
      if (!phone && !email) { st.className = "bd-status bad"; st.textContent = "Please give a phone number or an email so the business can reply."; return; }
      if (phone && !/^\+?[0-9 ]{9,16}$/.test(phone)) { st.className = "bd-status bad"; st.textContent = "Please check the phone number (for example 0712 345 678)."; return; }
      form.querySelector("button").disabled = true;
      const { error } = await db.from("business_enquiries").insert({ business_id: BIZ.id, name: f.get("name"), phone: phone || null, email: email || null, message: f.get("message"), status: "new" });
      form.querySelector("button").disabled = false;
      st.className = "bd-status " + (error ? "bad" : "ok");
      st.textContent = error ? friendly(error) : `Sent. ${BIZ.name} will reply to you directly.`;
      if (!error) { form.reset(); track("enquiry"); }
    });

    // Claim this business
    const claim = $("[data-claim]", el);
    if (claim) claim.addEventListener("click", () => {
      if (!A.user) return needSignIn("Sign in first, then send proof that you own or manage this business.");
      const d = dialog(`Claim ${BIZ.name}`, `<form class="bd-form">
        <p class="bd-fine">We will give you access to manage this listing after we check your proof of ownership. Documents are stored privately and only IMMA Media administrators can see them.</p>
        <label>Your full name<input name="claimant_name" required maxlength="100" value="${esc(A.displayName(A.user))}"></label>
        <label>Your role<input name="claimant_role" maxlength="80" placeholder="Owner, director, manager…"></label>
        <label>Phone<input name="phone" type="tel" maxlength="16"></label>
        <label>Proof (business registration certificate, permit or similar; PDF or image, up to 5 MB)<input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required></label>
        <label>Message<textarea name="message" maxlength="1500" rows="3"></textarea></label>
        <button class="bd-btn" type="submit">Send claim</button><p class="bd-status" role="status" hidden></p></form>`);
      $("form", d).addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = new FormData(e.target), st = $(".bd-status", d), file = f.get("file");
        st.hidden = false; st.className = "bd-status";
        if (!file || file.size > 5 * 1024 * 1024) { st.className = "bd-status bad"; st.textContent = "Please attach a file up to 5 MB."; return; }
        st.textContent = "Uploading…";
        const path = `${A.user.id}/claims/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_").slice(-60)}`;
        const up = await db.storage.from("business-docs").upload(path, file, { contentType: file.type });
        if (up.error) { st.className = "bd-status bad"; st.textContent = friendly(up.error); return; }
        const { error } = await db.from("business_claims").insert({ business_id: BIZ.id, user_id: A.user.id, claimant_name: f.get("claimant_name"), claimant_role: f.get("claimant_role") || null, phone: f.get("phone") || null, message: f.get("message") || null, evidence_path: path });
        st.className = "bd-status " + (error ? "bad" : "ok");
        st.textContent = error ? friendly(error) : "Claim sent. We will contact you after checking your documents.";
      });
    });

    // Fresh reviews (the built page may be a little behind)
    db.from("dir_reviews").select("*").eq("business_id", BIZ.id).order("created_at", { ascending: false }).limit(50).then(({ data }) => {
      if (data && data.length) $("[data-reviews]", el).innerHTML = data.map(D.reviewHtml).join("");
    });
  }

  (async () => {
    if ($("#bd-root")) await renderListing();
    wire();
  })();
})();
