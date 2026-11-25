// Advertise With Us page: placements, specs and packages (live from Supabase,
// with built-in defaults if the database cannot be reached) and the enquiry form.
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const kes = (n) => "KSh " + Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 });
  const client = window.IMMA_AUTH && window.IMMA_AUTH.client;

  const DEFAULT_PLACEMENTS = [
    { key: "top_leaderboard", name: "Top leaderboard", description: "Across the top of the homepage, under the menu.", width: 970, height: 90, mobile_width: 320, mobile_height: 100, price_kes: 30000, price_unit: "month", is_active: true },
    { key: "home_premium", name: "Homepage premium banner", description: "Large banner between the top stories and Latest Stories.", width: 970, height: 250, mobile_width: 320, mobile_height: 100, price_kes: 50000, price_unit: "month", is_active: true },
    { key: "sidebar", name: "Sidebar advertisement", description: "Box in the right-hand column, next to the news.", width: 300, height: 250, price_kes: 15000, price_unit: "month", is_active: true },
    { key: "sidebar_large", name: "Large sidebar advertisement", description: "Tall unit lower in the right-hand column.", width: 300, height: 600, price_kes: 25000, price_unit: "month", is_active: true },
    { key: "in_article", name: "In-article advertisement", description: "Inside stories, after the opening paragraphs.", width: 728, height: 90, mobile_width: 320, mobile_height: 100, price_kes: 10000, price_unit: "month", is_active: true },
    { key: "category_banner", name: "Category page banner", description: "At the top of a news section such as Sports or Kenya.", width: 728, height: 90, mobile_width: 320, mobile_height: 100, price_kes: 15000, price_unit: "month", is_active: true },
    { key: "footer_banner", name: "Footer banner", description: "Above the footer on every page.", width: 728, height: 90, mobile_width: 320, mobile_height: 100, price_kes: 5000, price_unit: "month", is_active: true },
    { key: "mobile_banner", name: "Mobile banner", description: "Shown at the top of the page on phones.", width: 320, height: 100, price_kes: 10000, price_unit: "month", is_active: true },
    { key: "sponsored_article", name: "Sponsored article", description: "A story in the news feed, clearly labelled Sponsored Content.", width: 0, height: 0, price_kes: 10000, price_unit: "article", is_active: true }
  ];
  const DEFAULT_PACKAGES = [
    { slug: "starter", name: "Starter", price_kes: 5000, duration_months: 1, benefits: ["Footer banner advertisement", "Basic performance reporting (views and clicks)"], is_available: true },
    { slug: "business", name: "Business", price_kes: 15000, duration_months: 1, benefits: ["Sidebar or category page advertisement", "One sponsored article", "Advertisement performance reporting"], is_available: true },
    { slug: "premium", name: "Premium", price_kes: 30000, duration_months: 1, benefits: ["Homepage leaderboard advertisement", "Two sponsored articles", "Priority advertisement placement", "Detailed performance reporting"], highlight: true, is_available: true },
    { slug: "corporate", name: "Corporate", price_kes: 60000, duration_months: 1, benefits: ["Premium homepage advertisement", "Category sponsorship", "Four sponsored articles", "Priority placement", "Custom campaign reporting"], is_available: true }
  ];

  const size = (p) => p.width ? `${p.width} × ${p.height} px` : "Native article";
  const msize = (p) => p.mobile_width ? `${p.mobile_width} × ${p.mobile_height} px` : p.width ? (p.width <= 320 ? size(p) : "Scaled to fit") : "Article format";
  const price = (p) => kes(p.price_kes) + (p.price_unit === "article" ? " per article" : " / month");

  function renderPlacements(list) {
    list = list.filter((p) => p.is_active);
    $("#placement-list").innerHTML = list.map((p, i) => `
      <button type="button" class="pl-card${i === 0 ? " on" : ""}" data-key="${esc(p.key)}" role="listitem">
        <span class="pl-name">${esc(p.name)}</span>
        <span class="pl-size">${esc(size(p))}</span>
        <span class="pl-desc">${esc(p.description || "")}</span>
        <span class="pl-price">${esc(price(p))}</span>
      </button>`).join("");
    $("#spec-table tbody").innerHTML = list.map((p) => `
      <tr><td><b>${esc(p.name)}</b></td><td>${esc(size(p))}</td><td>${esc(msize(p))}</td><td>${esc(price(p))}</td></tr>`).join("");
    highlight(list[0] && list[0].key);
  }
  function highlight(key) {
    document.querySelectorAll(".pl-card").forEach((b) => b.classList.toggle("on", b.dataset.key === key));
    document.querySelectorAll(".mock-zone, .mock-story[data-zone]").forEach((z) => z.classList.toggle("on", z.dataset.zone === key));
  }
  $("#placement-list").addEventListener("click", (e) => { const b = e.target.closest(".pl-card"); if (b) highlight(b.dataset.key); });
  $("#placement-list").addEventListener("mouseover", (e) => { const b = e.target.closest(".pl-card"); if (b) highlight(b.dataset.key); });

  function renderPackages(list) {
    $("#pkg-grid").innerHTML = list.filter((p) => p.is_available).map((p) => `
      <article class="pkg${p.highlight ? " pkg--hl" : ""}">
        ${p.highlight ? `<span class="pkg-badge">Recommended</span>` : ""}
        <h3>${esc(p.name)}</h3>
        <p class="pkg-price"><b>${esc(kes(p.price_kes))}</b><span>/ ${p.duration_months > 1 ? p.duration_months + " months" : "month"}</span></p>
        <ul>${(p.benefits || []).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
        <a class="${p.highlight ? "btn-gold" : "btn-outline"}" href="advertiser.html?package=${encodeURIComponent(p.slug)}">Choose ${esc(p.name)}</a>
      </article>`).join("");
  }

  async function load() {
    renderPlacements(DEFAULT_PLACEMENTS);
    renderPackages(DEFAULT_PACKAGES);
    if (!client) return;
    try {
      const [pl, pk] = await Promise.all([
        client.from("ad_placements").select("*").order("sort_order"),
        client.from("ad_packages").select("*").order("sort_order")
      ]);
      if (!pl.error && pl.data && pl.data.length) renderPlacements(pl.data);
      if (!pk.error && pk.data && pk.data.length) renderPackages(pk.data);
    } catch (e) { /* keep defaults */ }
  }
  load();

  // ---------- Enquiry form ----------
  const form = $("#enquiry-form");
  const status = $("#eq-status");
  const show = (kind, html) => { status.className = "form-status " + kind; status.innerHTML = html; status.hidden = false; };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (d.website) return;   // spam trap
    const name = (d.name || "").trim(), msg = (d.message || "").trim(), phone = (d.phone || "").trim(), email = (d.email || "").trim();
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    const bad = [];
    if (name.length < 2) bad.push("eq-name");
    if (msg.length < 5) bad.push("eq-msg");
    if (!phone && !email) bad.push("eq-phone", "eq-email");
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) bad.push("eq-email");
    if (phone && !/^[+\d][\d\s-]{6,19}$/.test(phone)) bad.push("eq-phone");
    if (bad.length) {
      bad.forEach((id) => $("#" + id).setAttribute("aria-invalid", "true"));
      show("error", "Please add your name, a short message, and a phone number or email so we can reply.");
      $("#" + bad[0]).focus();
      return;
    }
    const row = { name, message: msg, phone: phone || null, email: email || null,
      business_name: (d.business_name || "").trim() || null, interest: d.interest || null, budget: d.budget || null };
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    const wa = "https://wa.me/254785887830?text=" + encodeURIComponent(
      `IMMA News advertising enquiry\n\nName: ${name}\nBusiness: ${row.business_name || "-"}\nInterested in: ${row.interest || "-"}\nBudget: ${row.budget || "-"}\n\n${msg}`);
    try {
      if (!client) throw new Error("offline");
      const { error } = await client.from("ad_enquiries").insert(row);
      if (error) throw error;
      form.reset();
      show("success", `Thank you, ${esc(name.split(" ")[0])}. Your enquiry has reached the IMMA Media team and we will get back to you. For a faster reply, <a href="${wa}" target="_blank" rel="noopener">send it on WhatsApp too</a>.`);
    } catch (err) {
      show("info", `We couldn't send that online just now. <a href="${wa}" target="_blank" rel="noopener">Send your enquiry on WhatsApp</a> instead, or call +254 785 887 830.`);
    }
    btn.disabled = false;
  });
})();
