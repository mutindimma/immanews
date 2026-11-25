const $ = (s) => document.querySelector(s);
const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const idx = (s) => NEWS.indexOf(s);
const U = window.IMMA_URL;
const href = (s) => esc(U.storyPath(s));
// Pictures sized for where they are shown (Unsplash/Pexels resize on their side)
const pic = (s, w = 480, h = 300) => esc(s.image ? U.imageUrl(s.image, w, h) : "images/placeholder.svg");
const set = (s, sizes) => s.image && U.resizable(s.image) ? ` srcset="${sizes.map(([w, h]) => esc(U.imageUrl(s.image, w, h)) + " " + w + "w").join(", ")}"` : "";

document.querySelectorAll("#year, [data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

const stories = [...NEWS].sort((a, b) => b.date.localeCompare(a.date));
const featured = stories.find((s) => s.featured) || stories[0];

// Top stories: hero + 3 side headlines
const sideHeads = stories.filter((s) => s !== featured).slice(0, 3);
$("#top-stories").classList.toggle("solo", sideHeads.length === 0);
$("#top-stories").innerHTML = `
  <article class="hero" data-i="${idx(featured)}">
    <img src="${pic(featured, 1200, 675)}"${set(featured, [[800, 450], [1200, 675], [1600, 900]])} sizes="(max-width: 900px) 100vw, 720px" alt="" width="1200" height="675" fetchpriority="high" decoding="async">
    <div class="hero-text">
      <span class="label">${esc(featured.category)}</span>
      <h1><a href="${href(featured)}">${esc(featured.title)}</a></h1>
      <p>${esc(featured.summary)}</p>
    </div>
  </article>
  <div class="side-heads">
    ${sideHeads.map((s) => `
      <article class="side-head" data-i="${idx(s)}">
        <img src="${pic(s, 220, 160)}"${set(s, [[220, 160], [440, 320]])} sizes="110px" alt="" width="110" height="80" loading="lazy" decoding="async">
        <div><span class="label">${esc(s.category)}</span><h3><a href="${href(s)}">${esc(s.title)}</a></h3></div>
      </article>`).join("")}
  </div>`;

// Trending (titles of latest stories)
$("#trending").innerHTML = stories.slice(0, 8).map((s) => `<li data-i="${idx(s)}"><a href="${href(s)}">${esc(s.title)}</a></li>`).join("");

// Category bar
let active = "Home";
const cats = ["Home", ...new Set(NEWS.map((n) => n.category))];
$("#filters").innerHTML = cats.map((c) => `<button class="chip${c === active ? " on" : ""}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
$("#filters").addEventListener("click", (e) => {
  const c = e.target.dataset.c;
  if (!c) return;
  active = c;
  document.querySelectorAll(".chip").forEach((b) => b.classList.toggle("on", b.dataset.c === c));
  $("#top-stories").hidden = c !== "Home";
  render();
  $("#news").scrollIntoView({ behavior: "smooth", block: "start" });
});

// Search
$("#search").addEventListener("input", render);
$("#search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  render();
  $("#news").scrollIntoView({ behavior: "smooth" });
});

// Stream
function render() {
  const q = $("#search").value.trim().toLowerCase();
  const onTop = [featured, ...sideHeads];
  const list = stories.filter((s) =>
    (active === "Home" ? (q || !onTop.includes(s)) : s.category === active) &&
    (!q || (s.title + " " + s.summary + " " + s.category).toLowerCase().includes(q)));
  $("#stream-label").textContent = q ? `· results for “${$("#search").value.trim()}”` : active !== "Home" ? `· ${active}` : "";
  $("#news-grid").innerHTML = list.map((s) => `
    <article class="item" data-i="${idx(s)}">
      <img src="${pic(s)}"${set(s, [[240, 150], [480, 300]])} sizes="(max-width: 700px) 110px, 220px" alt="" width="220" height="138" loading="lazy" decoding="async">
      <div>
        <span class="label">${esc(s.category)}</span>
        <h3><a href="${href(s)}">${esc(s.title)}</a></h3>
        <p>${esc(s.summary)}</p>
        <span class="source">IMMA News · ${fmt(s.date)}</span>
      </div>
    </article>`).join("");
  $("#empty").textContent = q || active !== "Home" ? "No stories match your search." : "More stories coming soon.";
  $("#empty").hidden = list.length > 0;
}
render();

// Mobile menu toggle jumps to categories
$(".menu-toggle").addEventListener("click", () => $("#catbar").scrollIntoView({ behavior: "smooth" }));

// Every story has its own page (built by tools/build_articles.js); cards open it.
function openStory(i) { location.href = U.storyPath(NEWS[i]); }
document.addEventListener("click", (e) => {
  if (e.target.closest("a")) return;   // real links work on their own (and with ctrl/middle click)
  const el = e.target.closest("[data-i]");
  if (el) openStory(el.dataset.i);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches(".item")) openStory(e.target.dataset.i);
});
// The pop-up reader is still used for sponsored content (ads.js)
const reader = $("#reader");
if (reader) {
  reader.querySelector(".close").addEventListener("click", () => reader.close());
  reader.addEventListener("click", (e) => { if (e.target === reader) reader.close(); });
}

// Links from other pages: index.html?c=Sports (category) or index.html?q=passport (search)
(() => {
  const params = new URLSearchParams(location.search);
  const c = params.get("c"), q = params.get("q"), story = params.get("story");
  if (story && window.IMMA_AUTH) {
    const i = NEWS.findIndex((s) => window.IMMA_AUTH.storyKey(s) === story);
    if (i >= 0) { location.replace(U.storyPath(NEWS[i])); return; }   // old ?story= links
  }
  if (q) {
    $("#search").value = q;
    render();
    $("#news").scrollIntoView({ block: "start" });
  } else if (c && cats.includes(c)) {
    document.querySelector(`.chip[data-c="${CSS.escape(c)}"]`).click();
  }
})();
