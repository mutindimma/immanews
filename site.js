// Shared bits for every page: year, contact details, social links,
// and the category bar on inner pages (About, Contact).
(() => {
  const $$ = (s) => document.querySelectorAll(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const C = typeof CONTACT !== "undefined" ? CONTACT : {};

  $$("#year").forEach((el) => (el.textContent = new Date().getFullYear()));

  // Contact details: <a data-contact="phone|whatsapp|email"> and <span data-contact="location">
  $$("[data-contact]").forEach((el) => {
    const kind = el.dataset.contact;
    const row = el.closest("[data-contact-row]");
    if (kind === "phone" && C.phone) { el.textContent = C.phone; el.href = "tel:" + C.phone.replace(/\s/g, ""); }
    else if (kind === "whatsapp" && C.whatsapp) { el.href = "https://wa.me/" + C.whatsapp; }
    else if (kind === "email" && C.email) { el.textContent = C.email; el.href = "mailto:" + C.email; }
    else if (kind === "location" && C.location) { el.textContent = C.location; }
    else if (row) { row.hidden = true; }
  });

  // Social links — only the ones that have been filled in
  const NAMES = { facebook: "Facebook", x: "X (Twitter)", instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok", linkedin: "LinkedIn" };
  const social = Object.entries(C.social || {}).filter(([, url]) => url);
  $$("[data-social]").forEach((box) => {
    if (!social.length) { (box.closest("[data-social-row]") || box).hidden = true; return; }
    box.innerHTML = social.map(([k, url]) =>
      `<a href="${esc(url)}" target="_blank" rel="noopener">${NAMES[k] || esc(k)}</a>`).join("");
  });

  // Category bar on inner pages: links back to the homepage filtered by category
  const bar = document.querySelector("#filters[data-links]");
  if (bar && typeof NEWS !== "undefined") {
    const cats = ["Home", ...new Set(NEWS.map((n) => n.category))];
    bar.innerHTML = cats.map((c) =>
      `<a class="chip" href="index.html${c === "Home" ? "" : "?c=" + encodeURIComponent(c)}">${esc(c)}</a>`).join("");
  }
})();
