// IMMA News — Footer & newsletter settings (inside Advertising Management, admins only).
// Saves to the Supabase table site_settings (key "footer"). Row-level security only lets
// administrators (profiles.role = 'admin') write it; everyone can read it.
(() => {
  const A = window.IMMA_AUTH, F = window.IMMA_FOOTER;
  const $ = (s, r) => (r || document).querySelector(s);
  const navBtn = $("[data-footer-admin]"), panel = $("#panel");
  if (!A || !A.configured || !F || !navBtn || !panel) return;
  const db = A.client;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const toast = (msg, kind) => { const d = document.createElement("div"); d.className = "notice " + (kind || "ok"); d.setAttribute("role", "status"); d.textContent = msg; d.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;max-width:420px;box-shadow:0 10px 30px rgba(0,0,0,.2)"; document.body.appendChild(d); setTimeout(() => d.remove(), 4500); };
  const EMAIL = /^[^\s@<>"']{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
  const SHOW = { always: "Always show", auto: "Only when the category has stories", hidden: "Hidden" };
  const LOGOS = ["/images/imma-news-logo-reverse.png", "/images/imma-news-emblem.png", "/images/imma-news-logo.png"];
  const OWNER_LOGOS = ["/images/imma-media-logo-reverse.png", "/images/imma-media-logo.png"];

  let S = null, savedJson = "", meta = null, resetArmed = false;

  // ---------- navigation ----------
  navBtn.addEventListener("click", open);
  document.addEventListener("click", (e) => { if (e.target.closest("[data-go]")) navBtn.classList.remove("on"); }, true);
  // Open directly with ads-admin.html#footer
  if (location.hash === "#footer") {
    const wait = setInterval(() => { if (!$("#dash").hidden && panel.children.length) { clearInterval(wait); open(); } }, 200);
    setTimeout(() => clearInterval(wait), 20000);
  }

  async function open() {
    document.querySelectorAll(".dash-nav button").forEach((b) => b.classList.remove("on"));
    navBtn.classList.add("on");
    if (location.hash !== "#footer") history.replaceState(null, "", "#footer");
    panel.innerHTML = '<div class="card"><p class="muted">Loading footer settings…</p></div>';
    const r = await db.from("site_settings").select("value, updated_at").eq("key", "footer").maybeSingle();
    if (r.error) {
      panel.innerHTML = `<div class="card"><h2>Footer &amp; newsletter</h2><p class="notice bad">The footer tables are not set up yet. Run <code>supabase/footer.sql</code> in the Supabase SQL Editor, then reload this page.</p></div>`;
      return;
    }
    meta = r.data;
    S = F.sanitize(r.data ? r.data.value : null);
    savedJson = JSON.stringify(S);
    draw();
    loadSubscribers();
  }

  // ---------- form building blocks ----------
  const field = (path, label, value, opts = {}) => {
    const id = "fs-" + path.replace(/\W/g, "-");
    const input = opts.area
      ? `<textarea id="${id}" data-path="${path}" rows="${opts.rows || 3}" maxlength="${opts.max || 400}">${esc(value)}</textarea>`
      : `<input id="${id}" data-path="${path}" type="${opts.type || "text"}" value="${esc(value)}" maxlength="${opts.max || 300}"${opts.list ? ` list="${opts.list}"` : ""}${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ""}>`;
    return `<div class="field"><label for="${id}">${label}</label>${input}${opts.hint ? `<p class="small muted">${opts.hint}</p>` : ""}</div>`;
  };
  const check = (path, label, value) => `<label class="fs-check"><input type="checkbox" data-path="${path}"${value ? " checked" : ""}> ${label}</label>`;
  const card = (title, body, sub) => `<section class="card fs-card"><h2>${title}</h2>${sub ? `<p class="small muted">${sub}</p>` : ""}${body}</section>`;

  function linkRows(list, base) {
    return `<ol class="fs-links">${list.map((l, j) => `<li class="fs-link">
      <input aria-label="Link text" data-path="${base}.${j}.label" value="${esc(l.label)}" maxlength="60">
      <input aria-label="Link address" data-path="${base}.${j}.href" value="${esc(l.href)}" maxlength="300" placeholder="/page.html or https://…">
      <select aria-label="Visibility" data-path="${base}.${j}.show">${Object.entries(SHOW).map(([k, v]) => `<option value="${k}"${l.show === k ? " selected" : ""}>${v}</option>`).join("")}</select>
      <span class="fs-row-btns">
        <button type="button" class="fs-icon" data-act="up" data-list="${base}" data-i="${j}" aria-label="Move ${esc(l.label)} up"${j === 0 ? " disabled" : ""}>↑</button>
        <button type="button" class="fs-icon" data-act="down" data-list="${base}" data-i="${j}" aria-label="Move ${esc(l.label)} down"${j === list.length - 1 ? " disabled" : ""}>↓</button>
        <button type="button" class="fs-icon fs-del" data-act="del" data-list="${base}" data-i="${j}" aria-label="Delete ${esc(l.label)}">✕</button>
      </span></li>`).join("")}</ol>
      <button type="button" class="btn-outline fs-small-btn" data-act="add" data-list="${base}">+ Add link</button>`;
  }

  function draw() {
    const c = S.contact, n = S.newsletter, t = S.cta, o = S.owner;
    panel.innerHTML = `
      <div class="dash-head fs-head"><div><p class="kicker dark">Site</p><h2 class="fs-title">Footer &amp; newsletter</h2>
        <p class="dash-sub">${meta && meta.updated_at ? "Last saved " + new Date(meta.updated_at).toLocaleString("en-GB") : "Using the built-in defaults (nothing saved yet)."}</p></div></div>

      <section class="card fs-card" id="fs-subs"><h2>Newsletter subscribers</h2><p class="muted">Loading…</p></section>

      ${card("Brand", `
        ${field("logo", "Footer logo (image path)", S.logo, { list: "fs-logos", hint: "Use the light “reverse” logo on the dark footer. Upload new images to the site’s <code>images</code> folder first." })}
        <datalist id="fs-logos">${LOGOS.map((l) => `<option value="${l}">`).join("")}</datalist>
        <p class="fs-logo-prev"><img src="${esc(F.safeHref(S.logo))}" alt="Logo preview" style="background:${esc(S.colors.bg)}"></p>
        ${field("tagline", "Tagline", S.tagline, { max: 80 })}
        ${field("description", "Brand description", S.description, { area: true, max: 400 })}`)}

      ${card("Contact details", `
        <div class="field-row">${field("contact.location", "Location", c.location, { max: 80 })}${field("contact.phone", "Telephone", c.phone, { max: 30, type: "tel" })}</div>
        <div class="field-row">${field("contact.whatsapp", "WhatsApp number (country code, digits only)", c.whatsapp, { max: 20, placeholder: "254785887830" })}${field("contact.whatsappMessage", "WhatsApp pre-filled message", c.whatsappMessage, { max: 200 })}</div>
        <h3>Email addresses</h3>
        <p class="small muted">An address is shown only after you tick <b>Verified</b>. Tick it only once the mailbox exists and you have received a test email in it.</p>
        ${Object.entries(F.EMAIL_LABELS).map(([k, label]) => `<div class="fs-email">${field(`contact.emails.${k}.address`, label, c.emails[k].address, { type: "email", max: 254, placeholder: "name@immanews.com" })}${check(`contact.emails.${k}.verified`, "Verified — show on the site", c.emails[k].verified)}</div>`).join("")}`)}

      ${card("Social media", Object.entries(F.SOCIAL).map(([k, v]) => field(`social.${k}`, v.name, S.social[k], { type: "url", placeholder: `https://${v.hosts[0]}/…` })).join(""),
        "Only accounts you fill in are shown. Paste the full https link to the official IMMA News account; links to other websites are refused.")}

      ${card("Newsletter box", `
        ${check("newsletter.enabled", "Show the newsletter sign-up box", n.enabled)}
        ${field("newsletter.eyebrow", "Small heading", n.eyebrow, { max: 60 })}
        ${field("newsletter.headline", "Headline", n.headline, { max: 80 })}
        ${field("newsletter.description", "Description", n.description, { area: true, rows: 2, max: 200 })}
        ${field("newsletter.supporting", "Supporting text", n.supporting, { max: 120 })}
        <p class="notice warn small">Email delivery is not connected yet. Sign-ups are stored securely in Supabase (table <code>newsletter_subscribers</code>), but no emails are sent until an email service is set up. See <code>FOOTER-GUIDE.md</code>.</p>`)}

      ${card("Advertising call-to-action", `
        ${check("cta.enabled", "Show the advertising banner above the footer", t.enabled)}
        ${field("cta.eyebrow", "Small heading", t.eyebrow, { max: 60 })}
        ${field("cta.headline", "Headline", t.headline, { max: 90 })}
        ${field("cta.description", "Description", t.description, { area: true, rows: 2, max: 200 })}
        <div class="field-row">${field("cta.primaryLabel", "Main button text", t.primaryLabel, { max: 40 })}${field("cta.primaryHref", "Main button link", t.primaryHref)}</div>
        <div class="field-row">${field("cta.secondaryLabel", "Second button text", t.secondaryLabel, { max: 40 })}${field("cta.secondaryHref", "Second button link (leave empty to hide)", t.secondaryHref)}</div>`)}

      ${card("Footer navigation", `
        ${S.columns.map((col, i) => `<div class="fs-col">
          <div class="fs-col-head">${field(`columns.${i}.title`, `Column ${i + 1} title`, col.title, { max: 40 })}
            <span class="fs-row-btns">
              <button type="button" class="fs-icon" data-act="up" data-list="columns" data-i="${i}" aria-label="Move column ${i + 1} left"${i === 0 ? " disabled" : ""}>←</button>
              <button type="button" class="fs-icon" data-act="down" data-list="columns" data-i="${i}" aria-label="Move column ${i + 1} right"${i === S.columns.length - 1 ? " disabled" : ""}>→</button>
              <button type="button" class="fs-icon fs-del" data-act="del" data-list="columns" data-i="${i}" aria-label="Delete column ${i + 1}">✕</button>
            </span></div>
          ${linkRows(col.links, `columns.${i}.links`)}</div>`).join("")}
        ${S.columns.length < 6 ? `<button type="button" class="btn-outline fs-small-btn" data-act="add-col">+ Add column</button>` : ""}`,
        "Links can point to a page on this site (<code>/faq.html</code>, <code>/index.html?c=Sports</code>) or a full https address. “Only when the category has stories” hides a news-category link until that category has a story, so readers never land on an empty page.")}

      ${card("Bottom bar links", linkRows(S.legal, "legal"), "Cookie Settings and Back to top are always shown.")}

      ${card("IMMA Media ownership &amp; copyright", `
        <div class="field-row">${field("owner.label", "Label above the logo", o.label, { max: 40 })}${field("owner.logo", "IMMA Media logo (image path)", o.logo, { list: "fs-ologos" })}</div>
        <datalist id="fs-ologos">${OWNER_LOGOS.map((l) => `<option value="${l}">`).join("")}</datalist>
        ${field("owner.pillars", "Line under the logo", o.pillars, { max: 80 })}
        ${field("owner.statement", "Ownership statement", o.statement, { max: 160 })}
        ${field("owner.proud", "Tagline next to the Kenyan flag", o.proud, { max: 80 })}
        ${field("owner.copyright", "Copyright line", o.copyright, { max: 160, hint: "<code>{year}</code> is replaced with the current year automatically." })}`)}

      ${card("Colours", `<div class="fs-colors">${[["bg", "Background"], ["gold", "Gold accents"], ["text", "Main text"], ["muted", "Secondary text"], ["line", "Borders and dividers"]].map(([k, label]) =>
          `<div class="field"><label for="fs-c-${k}">${label}</label><span class="fs-color"><input type="color" id="fs-c-${k}" data-path="colors.${k}" value="${esc(S.colors[k])}"><code>${esc(S.colors[k])}</code></span></div>`).join("")}</div>
        <p class="small" id="fs-contrast"></p>`, "Text must stay readable: the page will not save colours that fail the WCAG AA contrast check against the background.")}

      <section class="card fs-card"><h2>Preview</h2><p class="small muted">How the footer will look with your unsaved changes (links are disabled here).</p><div class="fs-preview" id="fs-preview" inert></div></section>

      <div class="fs-savebar" role="region" aria-label="Save footer settings">
        <span id="fs-dirty" class="small muted"></span>
        <button type="button" class="btn-outline" data-act="reset">Reset to defaults</button>
        <button type="button" class="btn-gold" data-act="save">Save footer</button>
      </div>
      <div id="fs-errors" class="notice bad" hidden tabindex="-1"></div>`;
    preview();
  }

  // ---------- state updates ----------
  const getAt = (path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), S);
  function setAt(path, v) {
    const keys = path.split("."), last = keys.pop();
    const obj = keys.reduce((o, k) => o[k], S);
    obj[last] = v;
  }
  panel.addEventListener("input", (e) => {
    const el = e.target.closest("[data-path]");
    if (!el || !S) return;
    setAt(el.dataset.path, el.type === "checkbox" ? el.checked : el.value);
    if (el.type === "color") el.nextElementSibling.textContent = el.value.toUpperCase();
    if (el.dataset.path === "logo") $(".fs-logo-prev img").src = F.safeHref(el.value) || "";
    preview();
  });
  panel.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b || !S) return;
    const act = b.dataset.act;
    if (act === "save") return save();
    if (act === "reset") {
      if (!resetArmed) { resetArmed = true; b.textContent = "Click again to reset everything"; setTimeout(() => { resetArmed = false; if (b.isConnected) b.textContent = "Reset to defaults"; }, 5000); return; }
      resetArmed = false; S = clone(F.DEFAULTS); draw(); loadSubscribers(); toast("Defaults loaded. Click Save footer to apply them.", "ok"); return;
    }
    if (act === "add-col") { S.columns.push({ title: "New column", links: [] }); draw(); loadSubscribers(); return; }
    if (act === "csv") return exportCsv();
    const list = getAt(b.dataset.list), i = Number(b.dataset.i);
    if (!Array.isArray(list)) return;
    if (act === "add") list.push({ label: "New link", href: "/", show: "hidden" });
    if (act === "del") list.splice(i, 1);
    if (act === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
    if (act === "down" && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
    const y = window.scrollY; draw(); loadSubscribers(); window.scrollTo(0, y);
  });
  window.addEventListener("beforeunload", (e) => { if (S && JSON.stringify(S) !== savedJson) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- contrast ----------
  function lum(hex) {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function contrastProblems() {
    const c = S.colors, out = [];
    for (const [k, label] of [["text", "Main text"], ["muted", "Secondary text"], ["gold", "Gold accents"]]) {
      const r = ratio(c[k], c.bg);
      if (r < 4.5) out.push(`${label} on the background has a contrast of ${r.toFixed(1)}:1 (needs at least 4.5:1).`);
    }
    return out;
  }

  function preview() {
    const box = $("#fs-preview");
    if (!box) return;
    box.innerHTML = F.render(S).replace(/ data-site-footer/g, "").replace(/ data-newsletter/g, "").replace(/ id="/g, ' id="pv-');
    const probs = contrastProblems(), c = $("#fs-contrast");
    if (c) {
      c.className = "small " + (probs.length ? "fs-bad" : "fs-good");
      c.textContent = probs.length ? probs.join(" ") : `Contrast OK — main text ${ratio(S.colors.text, S.colors.bg).toFixed(1)}:1, secondary ${ratio(S.colors.muted, S.colors.bg).toFixed(1)}:1, gold ${ratio(S.colors.gold, S.colors.bg).toFixed(1)}:1.`;
    }
    const d = $("#fs-dirty");
    if (d) d.textContent = JSON.stringify(S) !== savedJson ? "Unsaved changes" : "All changes saved";
  }

  // ---------- validation + save ----------
  function validate() {
    const errs = [];
    const linkErr = (l, where) => {
      if (!l.label.trim()) errs.push(`${where}: a link has no text.`);
      if (!F.safeHref(l.href)) errs.push(`${where}: “${l.label}” has an invalid address (use /page.html or https://…).`);
    };
    if (!F.safeHref(S.logo)) errs.push("Brand: the logo path is not valid.");
    if (!F.safeHref(S.owner.logo)) errs.push("Ownership: the IMMA Media logo path is not valid.");
    if (S.contact.whatsapp && !/^\d{9,15}$/.test(S.contact.whatsapp)) errs.push("Contact: the WhatsApp number must be 9–15 digits, starting with the country code (254…).");
    if (S.contact.phone && !/^\+?[\d ()-]{7,20}$/.test(S.contact.phone)) errs.push("Contact: the telephone number is not valid.");
    for (const [k, label] of Object.entries(F.EMAIL_LABELS)) {
      const e = S.contact.emails[k];
      if (e.address && !EMAIL.test(e.address)) errs.push(`Contact: the ${label.toLowerCase()} email address is not valid.`);
      if (e.verified && !e.address) errs.push(`Contact: ${label.toLowerCase()} is ticked as verified but has no address.`);
    }
    for (const [k, v] of Object.entries(F.SOCIAL)) {
      if (S.social[k] && !F.socialOk(k, S.social[k])) errs.push(`Social media: the ${v.name} link must be an https link on ${v.hosts.join(" or ")}.`);
    }
    if (!F.safeHref(S.cta.primaryHref)) errs.push("Advertising call-to-action: the main button link is not valid.");
    if (S.cta.secondaryHref && !F.safeHref(S.cta.secondaryHref)) errs.push("Advertising call-to-action: the second button link is not valid.");
    S.columns.forEach((col, i) => {
      if (!col.title.trim()) errs.push(`Navigation: column ${i + 1} has no title.`);
      col.links.forEach((l) => linkErr(l, col.title || `Column ${i + 1}`));
    });
    S.legal.forEach((l) => linkErr(l, "Bottom bar"));
    if (!S.owner.copyright.trim()) errs.push("Ownership: the copyright line is empty.");
    return errs.concat(contrastProblems());
  }

  async function save() {
    const box = $("#fs-errors"), errs = validate();
    if (errs.length) {
      box.hidden = false;
      box.innerHTML = `<b>Please fix ${errs.length === 1 ? "this" : "these"} before saving:</b><ul>${errs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
      box.focus();
      return;
    }
    box.hidden = true;
    const value = F.sanitize(S);
    const r = await db.from("site_settings").upsert({ key: "footer", value }, { onConflict: "key" }).select("value, updated_at").single();
    if (r.error) { toast(/permission|policy|row-level/i.test(r.error.message) ? "Only administrators can change the footer." : "Could not save: " + r.error.message, "bad"); return; }
    meta = r.data; S = F.sanitize(r.data.value); savedJson = JSON.stringify(S);
    try { localStorage.removeItem("imma_footer_v1"); } catch (e) {}
    draw(); loadSubscribers();
    toast("Footer saved. It is live on every page now.");
  }

  // ---------- subscribers ----------
  async function loadSubscribers() {
    const box = $("#fs-subs");
    if (!box) return;
    const [a, b, list] = await Promise.all([
      db.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed"),
      db.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "unsubscribed"),
      db.from("newsletter_subscribers").select("email, status, created_at, source").order("created_at", { ascending: false }).limit(10)
    ]);
    if (!$("#fs-subs")) return;
    if (a.error) { box.innerHTML = `<h2>Newsletter subscribers</h2><p class="notice bad">Could not load subscribers: ${esc(a.error.message)}</p>`; return; }
    const rows = list.data || [];
    box.innerHTML = `<h2>Newsletter subscribers</h2>
      <div class="fs-stats"><div><b>${a.count || 0}</b><span>subscribed</span></div><div><b>${b.count || 0}</b><span>unsubscribed</span></div></div>
      <p class="notice warn small"><b>Not sending yet:</b> no email delivery service is connected, so subscribers are stored but no newsletter is sent. Each subscriber gave consent (the wording and time are stored with their address).</p>
      ${rows.length ? `<div class="table-wrap"><table class="dtable"><thead><tr><th>Email</th><th>Status</th><th>Signed up</th><th>Page</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.email)}</td><td>${esc(r.status)}</td><td>${new Date(r.created_at).toLocaleDateString("en-GB")}</td><td>${esc(r.source || "")}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty-state">No subscribers yet.</p>`}
      <button type="button" class="btn-outline fs-small-btn" data-act="csv"${rows.length ? "" : " disabled"}>Download all as CSV</button>`;
  }
  async function exportCsv() {
    const r = await db.from("newsletter_subscribers").select("email, status, consent_at, consent_text, source, created_at, unsubscribed_at").order("created_at");
    if (r.error) return toast(r.error.message, "bad");
    const cols = ["email", "status", "consent_at", "consent_text", "source", "created_at", "unsubscribed_at"];
    const cell = (v) => { let s = String(v == null ? "" : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const csv = [cols.join(","), ...r.data.map((x) => cols.map((c) => cell(x[c])).join(","))].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = `imma-newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
})();
