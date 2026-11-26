// IMMA News — reading tools on story pages: progress bar, text size, listen (read aloud),
// print, and an anonymous view count for "Most read".
(() => {
  const art = document.querySelector("[data-story-key]");
  const body = document.querySelector("[data-story-body]");
  if (!art || !body) return;
  const html = document.documentElement;

  // Reading progress
  const bar = document.querySelector(".read-progress");
  if (bar) {
    let ticking = false;
    const update = () => {
      const r = art.getBoundingClientRect(), total = r.height - innerHeight;
      bar.style.width = Math.max(0, Math.min(1, total > 0 ? -r.top / total : 1)) * 100 + "%";
      ticking = false;
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // Text size (remembered on this device)
  const SIZES = ["text-sm", "", "text-lg", "text-xl"];
  let size = 1;
  try { size = Math.max(0, Math.min(3, Number(localStorage.getItem("imma_text") ?? 1))); } catch (e) {}
  const applySize = () => { SIZES.forEach((c) => c && html.classList.remove(c)); if (SIZES[size]) html.classList.add(SIZES[size]); };
  applySize();
  document.querySelectorAll("[data-text]").forEach((b) => b.addEventListener("click", () => {
    size = Math.max(0, Math.min(3, size + Number(b.dataset.text)));
    applySize();
    try { localStorage.setItem("imma_text", String(size)); } catch (e) {}
  }));

  // Print
  const pr = document.querySelector("[data-print]");
  if (pr) pr.addEventListener("click", () => print());

  // Listen: the browser's own speech, so nothing is sent anywhere
  const listen = document.querySelector("[data-listen]");
  if (listen && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
    listen.hidden = false;
    let playing = false;
    const stop = () => { speechSynthesis.cancel(); playing = false; listen.textContent = "Listen"; listen.setAttribute("aria-pressed", "false"); };
    listen.addEventListener("click", () => {
      if (playing) return stop();
      const text = [document.querySelector(".bf-head h1"), document.querySelector(".bf-dek"), ...body.querySelectorAll("p, h2, h3, li")]
        .filter(Boolean).map((el) => el.textContent.trim()).filter(Boolean).join(". \n");
      // Speak in chunks: some browsers stop long utterances
      const chunks = text.match(/[\s\S]{1,1800}(?:\.\s|$)/g) || [text];
      const voice = speechSynthesis.getVoices().find((v) => /en-(KE|GB)/i.test(v.lang)) || null;
      chunks.forEach((c, i) => {
        const u = new SpeechSynthesisUtterance(c);
        u.lang = voice ? voice.lang : "en-GB"; if (voice) u.voice = voice; u.rate = 1;
        if (i === chunks.length - 1) u.onend = stop;
        speechSynthesis.speak(u);
      });
      playing = true; listen.textContent = "Stop"; listen.setAttribute("aria-pressed", "true");
    });
    addEventListener("pagehide", () => speechSynthesis.cancel());
  }

  // Anonymous readership count for "Most read" (respects the reader's Cookie Settings choice)
  try {
    const prefs = JSON.parse(localStorage.getItem("imma_prefs_v1") || "null") || {};
    const cfg = typeof SUPABASE !== "undefined" ? SUPABASE : null;
    if (prefs.adMeasure !== false && cfg && cfg.url) {
      let s = sessionStorage.getItem("imma_bd_s");
      if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem("imma_bd_s", s); }
      setTimeout(() => {   // count readers who stay, not instant bounces
        fetch(`${cfg.url}/rest/v1/rpc/track_story_view`, { method: "POST", keepalive: true,
          headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey, "Content-Type": "application/json" },
          body: JSON.stringify({ p_key: art.dataset.storyKey, p_session: s }) }).catch(() => {});
      }, 8000);
    }
  } catch (e) {}
})();
