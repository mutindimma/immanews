// IMMA News — the shared masthead (utility bar, logo, tagline, section navigation).
// One source for every public page: tools/build_footer.js bakes render() into each page
// between SITE-HEADER markers; in the browser this file adds the live date, Nairobi weather,
// the election countdown, dark mode and the mobile menu.
(function (root) {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ELECTION = Date.UTC(2027, 7, 10);   // Tuesday 10 August 2027 (IEBC)
  const nairobi = (d = new Date()) => new Date(d.getTime() + 3 * 3600 * 1000);
  const longDate = (d = new Date()) => nairobi(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const daysToElection = (d = new Date()) => { const n = nairobi(d); return Math.round((ELECTION - Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) / 86400000); };

  const I = {
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
  };

  // Sections shown in the navigation. Category sections appear only when they have stories
  // (the build passes the list); the rest always exist.
  function navItems(sections) {
    const s = sections || [];
    const items = [["Home", "/"]];
    const order = [["Kenya", "kenya"], ["Nairobi", "nairobi"], ["Politics", "politics"], ["World", "world"], ["Business", "business"], ["Sports", "sports"], ["Health", "health"], ["Travel", "travel"], ["Lifestyle", "lifestyle"], ["Opinion", "opinion"]];
    order.forEach(([name, slug]) => { if (s.includes(slug)) items.push([name, `/news/${slug}/`]); });
    items.push(["History & Heritage", "/history/before-they-became-famous/"], ["Resource Centre", "/resources.html"], ["Business Directory", "/business-directory/"]);
    return items;
  }

  function render(opts = {}) {
    const days = daysToElection(opts.now);
    const nav = navItems(opts.sections);
    return `<div class="ut-bar">
    <div class="wrap ut-inner">
      <span class="ut-date" data-today>${esc(longDate(opts.now))}</span>
      <span class="ut-weather" data-weather-mini hidden></span>
      <a class="ut-election" href="https://www.iebc.or.ke/" target="_blank" rel="noopener" title="Kenya General Election: Tuesday 10 August 2027 (IEBC)"><span class="ut-flag" aria-hidden="true"><i></i><i></i><i></i></span>Elections 2027 <b data-election-days>${days > 0 ? days : ""}</b> <span data-election-label>${days > 1 ? "days to go" : ""}</span></a>
      <span class="ut-links">
        <a href="/advertise.html">Advertise</a>
        <a href="#sf-newsletter" data-newsletter-link>Newsletter</a>
        <a href="/signin.html" data-auth-link>Sign in</a>
        <button type="button" class="ut-theme" data-theme-toggle aria-label="Switch to dark mode" title="Dark mode">${I.moon}</button>
      </span>
    </div>
  </div>
  <header class="masthead" id="top">
    <div class="wrap mh-inner">
      <div class="mh-left">
        <button type="button" class="mh-menu" data-menu aria-expanded="false" aria-controls="site-nav">${I.menu}<span>Sections</span></button>
        <form class="mh-search" action="/index.html" method="get" role="search">
          <label class="sr-only" for="mh-q">Search IMMA News</label>
          <input id="mh-q" type="search" name="q" placeholder="Search" autocomplete="off">
          <button type="submit" aria-label="Search">${I.search}</button>
        </form>
      </div>
      <a class="mh-logo" href="/" aria-label="IMMA News home">
        <img class="logo-light" src="/images/imma-news-masthead.webp" alt="IMMA News" width="219" height="160">
        <img class="logo-dark" src="/images/imma-news-masthead-reverse.webp" alt="" width="219" height="160">
      </a>
      <div class="mh-right">
        <p class="mh-tagline">Kenya <span>•</span> Africa <span>•</span> The World</p>
        <a class="mh-subscribe" href="#sf-newsletter" data-newsletter-link>Subscribe</a>
      </div>
    </div>
    <nav class="mh-nav" id="site-nav" aria-label="Sections">
      <ul class="wrap">${nav.map(([n, u]) => `<li><a href="${u}"${opts.active === u ? ' aria-current="page"' : ""}>${esc(n)}</a></li>`).join("")}</ul>
    </nav>
  </header>`;
  }

  // Runs in <head> before the page paints, so dark mode does not flash
  const THEME_BOOT = "(function(){try{var t=localStorage.getItem('imma_theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();";

  const api = { render, navItems, longDate, daysToElection, THEME_BOOT };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.IMMA_HEADER = api;

  // ---------- Browser behaviour ----------
  const ready = (fn) => (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn());
  ready(() => {
    const small = matchMedia("(max-width: 560px)").matches;
    const shortDate = nairobi().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    document.querySelectorAll("[data-today]").forEach((el) => (el.textContent = small && el.closest(".ut-bar") ? shortDate : longDate()));
    const days = daysToElection();
    document.querySelectorAll("[data-election-days]").forEach((el) => (el.textContent = days > 0 ? days.toLocaleString("en-KE") : days === 0 ? "Today" : ""));
    document.querySelectorAll("[data-election-label]").forEach((el) => (el.textContent = days > 1 ? "days to go" : days === 1 ? "day to go" : days === 0 ? "Election Day" : "Kenya has voted"));

    // Dark mode: the reader's explicit choice wins over the device setting
    const html = document.documentElement;
    const isDark = () => html.getAttribute("data-theme") === "dark" || (!html.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    const paintToggle = () => document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      b.innerHTML = isDark() ? I.sun : I.moon;
      b.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode");
      b.title = isDark() ? "Light mode" : "Dark mode";
    });
    paintToggle();
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => b.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      html.setAttribute("data-theme", next);
      try { localStorage.setItem("imma_theme", next); } catch (e) {}
      paintToggle();
    }));

    // Mobile section menu
    const menu = document.querySelector("[data-menu]"), nav = document.getElementById("site-nav");
    if (menu && nav) {
      menu.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        menu.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); menu.focus(); } });
    }
    // Current section
    const here = location.pathname.replace(/index\.html$/, "");
    document.querySelectorAll(".mh-nav a").forEach((a) => {
      const u = a.getAttribute("href");
      if (u === here || (u !== "/" && here.startsWith(u))) a.setAttribute("aria-current", "page");
    });

    // Newsletter links go to the footer sign-up (on every page)
    document.querySelectorAll("[data-newsletter-link]").forEach((a) => a.addEventListener("click", (e) => {
      const f = document.getElementById("sf-email") || document.querySelector(".sf-news input[type=email]");
      if (!f) { a.href = "/#sf-newsletter"; return; }
      e.preventDefault(); f.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => f.focus({ preventScroll: true }), 400);
    }));
    // Search box keeps the current query
    const q = new URLSearchParams(location.search).get("q");
    if (q) document.querySelectorAll(".mh-search input").forEach((i) => (i.value = q));

    // Theme chosen by administrators (colours and headline font), cached for an hour
    const applyTheme = (t) => {
      if (!t) return;
      const st = html.style;
      if (/^#[0-9a-f]{6}$/i.test(t.navy || "")) st.setProperty("--navy", t.navy); else st.removeProperty("--navy");
      if (/^#[0-9a-f]{6}$/i.test(t.gold || "")) st.setProperty("--gold", t.gold); else st.removeProperty("--gold");
      if (t.headFont === "Libre Baskerville") {
        if (!document.getElementById("imma-head-font")) {
          const l = document.createElement("link"); l.id = "imma-head-font"; l.rel = "stylesheet";
          l.href = "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap";
          document.head.appendChild(l);
        }
        st.setProperty("--font-head", '"Libre Baskerville", Georgia, "Times New Roman", serif');
      } else st.removeProperty("--font-head");
    };
    let theme = null;
    try { theme = JSON.parse(localStorage.getItem("imma_theme_v1") || "null"); } catch (e) {}
    if (theme) applyTheme(theme.value);
    const cfg = typeof SUPABASE !== "undefined" ? SUPABASE : null;
    if (cfg && cfg.url && (!theme || Date.now() - theme.at > 3600000)) {
      fetch(`${cfg.url}/rest/v1/site_settings?key=eq.theme&select=value`, { headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((rows) => { const v = (rows[0] && rows[0].value) || {}; applyTheme(v); try { localStorage.setItem("imma_theme_v1", JSON.stringify({ value: v, at: Date.now() })); } catch (e) {} })
        .catch(() => {});
    }

    // Nairobi weather (Open-Meteo, free, no key). Cached for 30 minutes; nothing shown if it fails.
    const box = document.querySelector("[data-weather-mini]");
    if (box) {
      const show = (w) => { box.textContent = `Nairobi ${Math.round(w.t)}°C${w.d ? " · " + w.d : ""}`; box.hidden = false; };
      const CODES = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy", 45: "Fog", 48: "Fog", 51: "Drizzle", 53: "Drizzle", 55: "Drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 80: "Showers", 81: "Showers", 82: "Heavy showers", 95: "Thunderstorms", 96: "Thunderstorms", 99: "Thunderstorms" };
      let cached = null;
      try { cached = JSON.parse(sessionStorage.getItem("imma_wx_mini") || "null"); } catch (e) {}
      if (cached && Date.now() - cached.at < 30 * 60000) show(cached);
      else fetch("https://api.open-meteo.com/v1/forecast?latitude=-1.2864&longitude=36.8172&current=temperature_2m,weather_code&timezone=Africa%2FNairobi")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j) => { const w = { t: j.current.temperature_2m, d: CODES[j.current.weather_code] || "", at: Date.now() }; show(w); try { sessionStorage.setItem("imma_wx_mini", JSON.stringify(w)); } catch (e) {} })
        .catch(() => {});
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
