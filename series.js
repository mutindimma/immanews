// "Before They Became Famous": Copy-link buttons and the homepage feature.
(() => {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Copy link buttons on article pages
  document.querySelectorAll("[data-copy-link]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const url = btn.dataset.copyLink;
      try { await navigator.clipboard.writeText(url); btn.textContent = "Link copied ✓"; }
      catch { window.prompt("Copy this link:", url); }
      setTimeout(() => (btn.textContent = "Copy link"), 2500);
    });
  });

  // Homepage feature: always shows the latest edition in series-feed.js
  const box = document.getElementById("bf-home");
  const feed = window.SERIES_FEED || [];
  const info = window.SERIES_INFO;
  if (!box || !feed.length || !info) return;
  const ed = feed[0];
  box.innerHTML = `
    <a class="bf-home-img" href="${esc(ed.url)}">
      <img src="${esc(ed.image)}" alt="Portrait for ${esc(ed.title)}" loading="lazy">
    </a>
    <div class="bf-home-text">
      <p class="bf-home-badge">${esc(info.name)}${ed.draft ? ' <span class="bf-home-draft">Draft preview</span>' : ""}</p>
      <p class="bf-home-ed">Edition ${esc(ed.edition)} · History &amp; Heritage</p>
      <h2><a href="${esc(ed.url)}">${esc(ed.title)}</a></h2>
      <p class="bf-home-excerpt">${esc(ed.summary)}</p>
      <p class="bf-home-links">
        <a class="bf-home-read" href="${esc(ed.url)}">Read article</a>
        <a class="bf-home-all" href="${esc(info.url)}">View all editions →</a>
      </p>
      <p class="bf-home-credit">Photo: ${esc(ed.credit)}</p>
    </div>`;
  box.hidden = false;
})();
