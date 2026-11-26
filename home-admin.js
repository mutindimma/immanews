// IMMA News — Homepage & design settings (inside Advertising Management, admins only).
// Saves to site_settings keys "homepage" and "theme". Row-level security only lets
// administrators write them; the public site reads them.
(() => {
  const A = window.IMMA_AUTH;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const navBtn = $("[data-home-admin]"), panel = $("#panel");
  if (!A || !A.configured || !navBtn || !panel || typeof NEWS === "undefined") return;
  const db = A.client;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = (msg, kind) => { const d = document.createElement("div"); d.className = "notice " + (kind || "ok"); d.setAttribute("role", "status"); d.textContent = msg; d.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;max-width:420px;box-shadow:0 10px 30px rgba(0,0,0,.2)"; document.body.appendChild(d); setTimeout(() => d.remove(), 4500); };
  const SECTIONS = {
    latest: "Latest news", kenya: "Kenya", world: "International", business: "Business & Economy", sports: "Sports",
    "morning-brief": "The IMMA Morning Brief", "kenya-explained": "Kenya Explained", btbf: "Before They Became Famous", living: "IMMA Living",
    "made-in-kenya": "Made in Kenya", "weekend-edition": "The Weekend Edition", resources: "Kenya Citizen Resource Centre", directory: "Business directory", newsletter: "Newsletter sign-up"
  };
  const DEFAULT_ORDER = ["latest", "kenya", "world", "business", "sports", "morning-brief", "kenya-explained", "btbf", "living", "made-in-kenya", "weekend-edition", "resources", "directory", "newsletter"];
  const LABELS = { "": "Automatic (news, or guide for Health/Travel)", news: "News", analysis: "Analysis", opinion: "Opinion", explainer: "Explainer", guide: "Guide", sponsored: "Sponsored" };
  const FONTS = { "": "Playfair Display (default)", "Libre Baskerville": "Libre Baskerville" };
  const stories = NEWS.filter((s) => !s.url).slice().sort((a, b) => b.date.localeCompare(a.date)).map((s) => ({ key: A.storyKey(s), title: s.title, date: s.date, category: s.category }));
  let H = {}, T = {};

  // WCAG contrast check for colours chosen by administrators
  const lum = (hex) => { const c = hex.replace("#", "").match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };

  navBtn.addEventListener("click", open);
  document.addEventListener("click", (e) => { if (e.target.closest("[data-go], [data-footer-admin]")) navBtn.classList.remove("on"); }, true);
  if (location.hash === "#homepage") {
    const wait = setInterval(() => { if (!$("#dash").hidden && panel.children.length) { clearInterval(wait); open(); } }, 200);
    setTimeout(() => clearInterval(wait), 20000);
  }

  async function open() {
    $$(".dash-nav button").forEach((b) => b.classList.remove("on"));
    navBtn.classList.add("on");
    if (location.hash !== "#homepage") history.replaceState(null, "", "#homepage");
    panel.innerHTML = '<div class="card"><p class="muted">Loading homepage settings…</p></div>';
    const r = await db.from("site_settings").select("key, value").in("key", ["homepage", "theme"]);
    if (r.error) { panel.innerHTML = `<div class="card"><p class="notice bad">${esc(r.error.message)}</p></div>`; return; }
    H = ((r.data || []).find((x) => x.key === "homepage") || {}).value || {};
    T = ((r.data || []).find((x) => x.key === "theme") || {}).value || {};
    draw();
  }

  function draw() {
    const saved = (H.order || []).filter((k) => SECTIONS[k]);
    const order = saved.length ? saved.concat(DEFAULT_ORDER.filter((k) => !saved.includes(k))) : DEFAULT_ORDER.slice();
    const hidden = new Set(H.hidden || []);
    const opt = (sel) => stories.map((s) => `<option value="${esc(s.key)}"${sel === s.key ? " selected" : ""}>${esc(s.date)} · ${esc(s.title)}</option>`).join("");
    const b = H.breaking || {};
    panel.innerHTML = `
      <div class="card">
        <h2>Homepage &amp; design</h2>
        <p class="muted">Changes go live on the homepage straight away for all readers. The homepage is also written as plain HTML when the site is built, so search engines always see the latest stories.</p>
      </div>
      <style>#ha-form label{display:grid;gap:4px;margin:10px 0;font-weight:600}#ha-form input:not([type=checkbox]):not([type=color]),#ha-form select{width:100%;max-width:640px;padding:9px;border:1px solid var(--line);border-radius:2px;font:inherit;font-weight:400}#ha-order label{display:inline-flex!important;margin:0}#ha-order button{padding:2px 8px;margin-left:4px}</style>
      <form class="card" id="ha-form">
        <h3>Lead and featured stories</h3>
        <label>Lead story<select name="lead"><option value="">Automatic (story marked featured, otherwise the newest)</option>${opt(H.lead)}</select></label>
        ${[0, 1, 2].map((i) => `<label>Featured story ${i + 1}<select name="f${i}"><option value="">Automatic (newest)</option>${opt((H.featured || [])[i])}</select></label>`).join("")}

        <h3 style="margin-top:22px">Breaking news bar</h3>
        <p class="muted">Use only for genuine, verified breaking news. Leave empty to hide the bar.</p>
        <label>Text<input name="b_text" maxlength="160" value="${esc(b.text || "")}"></label>
        <label>Link (a page on immanews.com, or https://)<input name="b_url" maxlength="300" value="${esc(b.url || "")}" placeholder="/news/kenya/…"></label>
        <label>Hide automatically after<input name="b_until" type="datetime-local" value="${esc(b.until ? b.until.slice(0, 16) : "")}"></label>

        <h3 style="margin-top:22px">Section order and visibility</h3>
        <p class="muted">Sections with no published stories stay hidden automatically.</p>
        <ol id="ha-order" style="padding-left:20px">${order.map((k, i) => `<li data-k="${k}" style="margin:6px 0">
          <label style="display:inline-flex;gap:8px;align-items:center"><input type="checkbox" data-show${hidden.has(k) ? "" : " checked"}> ${esc(SECTIONS[k])}</label>
          <button type="button" class="btn-outline" data-up ${i === 0 ? "disabled" : ""} aria-label="Move up">▲</button><button type="button" class="btn-outline" data-down ${i === order.length - 1 ? "disabled" : ""} aria-label="Move down">▼</button></li>`).join("")}</ol>

        <h3 style="margin-top:22px">Editorial labels</h3>
        <p class="muted">Readers see these labels on stories, so news, analysis, opinion and paid content are clearly different.</p>
        <div style="display:grid;gap:6px">${stories.map((s) => `<label style="display:grid;grid-template-columns:1fr 220px;gap:8px;align-items:center;font-weight:400"><span>${esc(s.title)}</span>
          <select data-label="${esc(s.key)}">${Object.entries(LABELS).map(([k, t]) => `<option value="${k}"${((H.labels || {})[s.key] || "") === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>`).join("")}</div>

        <h3 style="margin-top:22px">Advertising density on the homepage</h3>
        <label><select name="ads">
          <option value="standard"${(H.adDensity || "standard") === "standard" ? " selected" : ""}>Standard: top banner, sidebar and footer banner</option>
          <option value="light"${H.adDensity === "light" ? " selected" : ""}>Light: top and footer banners only</option>
          <option value="minimal"${H.adDensity === "minimal" ? " selected" : ""}>Minimal: footer banner only</option></select></label>

        <h3 style="margin-top:22px">Theme</h3>
        <p class="muted">Colours must pass the WCAG AA contrast check (4.5:1) to be saved. Leave as they are to keep the IMMA News palette.</p>
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          <label>Midnight navy<input type="color" name="navy" value="${esc(T.navy || "#0B192C")}"></label>
          <label>Champagne gold<input type="color" name="gold" value="${esc(T.gold || "#C5A059")}"></label>
          <label>Headline font<select name="font">${Object.entries(FONTS).map(([k, t]) => `<option value="${esc(k)}"${(T.headFont || "") === k ? " selected" : ""}>${t}</option>`).join("")}</select></label>
        </div>
        <p id="ha-contrast" class="muted"></p>
        <p style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button class="btn-gold" type="submit">Save homepage &amp; design</button>
          <button class="btn-outline" type="button" id="ha-reset">Reset to automatic</button> <a class="btn-outline" href="/" target="_blank" rel="noopener">View homepage ↗</a></p>
      </form>`;
    const f = $("#ha-form");
    const check = () => {
      const n = f.navy.value, g = f.gold.value, c1 = contrast(n, "#FFFFFF"), c2 = contrast(g, n);
      $("#ha-contrast").textContent = `White text on navy: ${c1.toFixed(1)}:1 ${c1 >= 4.5 ? "✓" : "✗"} · Gold on navy: ${c2.toFixed(1)}:1 ${c2 >= 4.5 ? "✓" : "✗ (needs 4.5)"}`;
      return c1 >= 4.5 && c2 >= 4.5;
    };
    f.navy.addEventListener("input", check); f.gold.addEventListener("input", check); check();
    $$("#ha-order [data-up], #ha-order [data-down]").forEach((btn) => btn.addEventListener("click", () => {
      const li = btn.closest("li");
      if (btn.hasAttribute("data-up") && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
      if (btn.hasAttribute("data-down") && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
      $$("#ha-order li").forEach((x, i, all) => { x.querySelector("[data-up]").disabled = i === 0; x.querySelector("[data-down]").disabled = i === all.length - 1; });
    }));
    $("#ha-reset").addEventListener("click", async () => {
      if (!confirm("Reset the homepage to automatic (newest stories, default order, no breaking news, standard adverts) and the default theme?")) return;
      await save({}, {});
    });
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!check()) return toast("Those colours do not have enough contrast. Please choose others.", "bad");
      const url = f.b_url.value.trim();
      if (url && !/^(https:\/\/|\/)/.test(url)) return toast("The breaking-news link must start with / or https://", "bad");
      const order = $$("#ha-order li").map((li) => li.dataset.k);
      const homepage = {
        lead: f.lead.value || null,
        featured: [f.f0.value, f.f1.value, f.f2.value].filter(Boolean),
        order: order.join() === DEFAULT_ORDER.join() ? [] : order,
        hidden: $$("#ha-order li").filter((li) => !li.querySelector("[data-show]").checked).map((li) => li.dataset.k),
        labels: Object.fromEntries($$("[data-label]").filter((s) => s.value).map((s) => [s.dataset.label, s.value])),
        breaking: f.b_text.value.trim() ? { text: f.b_text.value.trim(), url: url || null, until: f.b_until.value ? new Date(f.b_until.value).toISOString() : null } : null,
        adDensity: f.ads.value
      };
      if (!homepage.lead) delete homepage.lead;
      const theme = {};
      if (f.navy.value.toUpperCase() !== "#0B192C") theme.navy = f.navy.value;
      if (f.gold.value.toUpperCase() !== "#C5A059") theme.gold = f.gold.value;
      if (f.font.value) theme.headFont = f.font.value;
      await save(homepage, theme);
    });
  }

  async function save(homepage, theme) {
    const by = A.user && A.user.id;
    const r = await db.from("site_settings").upsert([
      { key: "homepage", value: homepage, updated_at: new Date().toISOString(), updated_by: by },
      { key: "theme", value: theme, updated_at: new Date().toISOString(), updated_by: by }
    ], { onConflict: "key" });
    if (r.error) return toast(/row-level|permission/i.test(r.error.message) ? "Only administrators can change these settings." : r.error.message, "bad");
    try { localStorage.removeItem("imma_home_v1"); localStorage.removeItem("imma_theme_v1"); } catch (e) {}
    H = homepage; T = theme;
    toast("Saved. The homepage now uses these settings.");
    draw();
  }
})();
