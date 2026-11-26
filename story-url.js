// Story addresses, shared by the browser (index.html, account.html) and by
// tools/build_articles.js, so every link to a story points at the same page.
//
//   /news/<section>/<headline-slug>/      e.g. /news/kenya/kws-begins-rhino-by-rhino-count-at-ol-pejeta/
//
// A story can set `slug: "..."` in news.js to choose its own address. Once a story is
// published, do not change its title-based slug: add `slug` with the old value instead.
(function (root) {
  "use strict";
  function slugify(text, max) {
    let s = String(text || "")
      .normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/['’‘`]/g, "").replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (max && s.length > max) {
      s = s.slice(0, max + 1);
      const cut = s.lastIndexOf("-");
      s = (cut > 20 ? s.slice(0, cut) : s.slice(0, max)).replace(/-+$/, "");
    }
    return s;
  }
  // Section names in addresses (short, stable, the words Kenyans search with)
  const SECTIONS = { "International": "world", "History & Heritage": "history" };
  const section = (category) => SECTIONS[category] || slugify(category) || "news";
  function storyPath(s) {
    if (s.url) return s.url;   // series editions and other stories with their own page
    return "/news/" + section(s.category) + "/" + (s.slug || slugify(s.title, 64)) + "/";
  }
  // Photos from Unsplash and Pexels can be resized and cropped by their own servers, so pages
  // download a picture the size it is shown at (much faster on phones) instead of a 1600px original.
  // Photos stored on immanews.com come in four widths: /images/stories/<name>-480|800|1200|1600.webp
  const LOCAL = /^\/?images\/stories\/(.+)-(480|800|1200|1600)\.webp$/;
  const WIDTHS = [480, 800, 1200, 1600];
  function isLocalSet(u) { return LOCAL.test(String(u || "")); }
  function resizable(u) { return /^https:\/\/images\.(unsplash|pexels)\.com\//i.test(String(u || "")) || isLocalSet(u); }
  function imageUrl(u, w, h) {
    if (!resizable(u)) return u;
    if (isLocalSet(u)) {
      const name = LOCAL.exec(String(u))[1];
      return `/images/stories/${name}-${WIDTHS.find((x) => x >= w) || 1600}.webp`;   // local copies keep their own shape (pages crop with CSS)
    }
    const url = new URL(u);
    const q = url.searchParams;
    q.set("w", String(w));
    if (h) { q.set("h", String(h)); q.set("fit", "crop"); }
    if (/unsplash/.test(url.hostname)) { q.set("auto", "format"); q.set("q", "75"); }
    else { q.set("auto", "compress"); q.set("cs", "tinysrgb"); }
    return url.href;
  }
  const api = { slugify, section, storyPath, resizable, imageUrl, isLocalSet };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.IMMA_URL = api;
})(typeof window !== "undefined" ? window : this);
