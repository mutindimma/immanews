const $ = (s) => document.querySelector(s);
const fmt = (d) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const idx = (s) => NEWS.indexOf(s);
const pic = (s) => esc(s.image || "images/placeholder.svg");

$("#year").textContent = new Date().getFullYear();

const stories = [...NEWS].sort((a, b) => b.date.localeCompare(a.date));
const featured = stories.find((s) => s.featured) || stories[0];

// Top stories: hero + 3 side headlines
const sideHeads = stories.filter((s) => s !== featured).slice(0, 3);
$("#top-stories").classList.toggle("solo", sideHeads.length === 0);
$("#top-stories").innerHTML = `
  <article class="hero" data-i="${idx(featured)}">
    <img src="${pic(featured)}" alt="">
    <div class="hero-text">
      <span class="label">${esc(featured.category)}</span>
      <h1>${esc(featured.title)}</h1>
      <p>${esc(featured.summary)}</p>
    </div>
  </article>
  <div class="side-heads">
    ${sideHeads.map((s) => `
      <article class="side-head" data-i="${idx(s)}">
        <img src="${pic(s)}" alt="" loading="lazy">
        <div><span class="label">${esc(s.category)}</span><h3>${esc(s.title)}</h3></div>
      </article>`).join("")}
  </div>`;

// Trending (titles of latest stories)
$("#trending").innerHTML = stories.slice(0, 8).map((s) => `<li data-i="${idx(s)}">${esc(s.title)}</li>`).join("");

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
    <article class="item" data-i="${idx(s)}" tabindex="0">
      <img src="${pic(s)}" alt="" loading="lazy">
      <div>
        <span class="label">${esc(s.category)}</span>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.summary)}</p>
        <span class="source">IMMA Media · ${fmt(s.date)}</span>
      </div>
    </article>`).join("");
  $("#empty").textContent = q || active !== "Home" ? "No stories match your search." : "More stories coming soon.";
  $("#empty").hidden = list.length > 0;
}
render();

// Mobile menu toggle jumps to categories
$(".menu-toggle").addEventListener("click", () => $("#catbar").scrollIntoView({ behavior: "smooth" }));

// Article reader
const reader = $("#reader");
const link = (name, url) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>` : esc(name);

// Paragraphs; a short "Heading: text" opener is shown in bold.
// Extra photos are spaced evenly through the article.
function paragraphs(body, extras = []) {
  const parts = body.split(/\n\s*\n/).map((p) => {
    const m = p.match(/^([A-Z][^:.\n]{2,70}):\s+([\s\S]+)$/);
    return m ? `<p><strong>${esc(m[1])}:</strong> ${esc(m[2])}</p>` : `<p>${esc(p)}</p>`;
  });
  extras.forEach((x, j) => {
    const at = Math.round(((j + 1) * parts.length) / (extras.length + 1));
    parts[at - 1] += `
      <figure class="extra">
        <img src="${esc(x.image)}" alt="" loading="lazy">
        ${x.caption ? `<figcaption>${esc(x.caption)}</figcaption>` : ""}
      </figure>`;
  });
  return parts.join("");
}

// News stories: "Based on reporting by X". Guides: "Sources: A, B".
function credit(s) {
  if (s.sources && s.sources.length)
    return `<p class="credit">Sources: ${s.sources.map((x) => link(x.name, x.url)).join(", ")}. Written for IMMA Media.</p>`;
  if (s.source)
    return `<p class="credit">Based on reporting by ${link(s.source, s.sourceUrl)}. Written for IMMA Media.</p>`;
  return "";
}

function openStory(i) {
  const s = NEWS[i];
  $("#reader-body").innerHTML = `
    <img src="${pic(s)}" alt="">
    ${s.caption ? `<p class="caption">${esc(s.caption)}</p>` : ""}
    <div class="reader-text">
      <span class="label">${esc(s.category)}</span>
      <h2>${esc(s.title)}</h2>
      <p class="source">IMMA Media · ${fmt(s.date)}</p>
      <p class="lead">${esc(s.summary)}</p>
      ${s.format === "markdown" && window.marked ? marked.parse(s.body) : paragraphs(s.body, s.extraImages)}
      ${credit(s)}
    </div>`;
  reader.querySelectorAll(".reader-text a").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
  if (window.IMMA_AUTH) window.IMMA_AUTH.decorateReader(s, reader.querySelector(".reader-text"));
  reader.showModal();
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-i]");
  if (el) openStory(el.dataset.i);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches(".item")) openStory(e.target.dataset.i);
});
reader.querySelector(".close").addEventListener("click", () => reader.close());
reader.addEventListener("click", (e) => { if (e.target === reader) reader.close(); });

// Links from other pages: index.html?c=Sports (category) or index.html?q=passport (search)
(() => {
  const params = new URLSearchParams(location.search);
  const c = params.get("c"), q = params.get("q"), story = params.get("story");
  if (story && window.IMMA_AUTH) {
    const i = NEWS.findIndex((s) => window.IMMA_AUTH.storyKey(s) === story);
    if (i >= 0) openStory(i);
  }
  if (q) {
    $("#search").value = q;
    render();
    $("#news").scrollIntoView({ block: "start" });
  } else if (c && cats.includes(c)) {
    document.querySelector(`.chip[data-c="${CSS.escape(c)}"]`).click();
  }
})();
