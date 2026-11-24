// IMMA Media accounts — shared by every page.
// Uses Supabase with Google sign-in. Exposes window.IMMA_AUTH.
(() => {
  const cfg = typeof SUPABASE !== "undefined" ? SUPABASE : {};
  const configured = !!(cfg.url && cfg.anonKey && window.supabase);
  const client = configured
    ? window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, detectSessionInUrl: true } })
    : null;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const storyKey = (s) => (s.date + "-" + s.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);

  let user = null;
  let saved = new Set();
  const listeners = [];

  function displayName(u) {
    const m = (u && u.user_metadata) || {};
    return m.full_name || m.name || (u && u.email) || "My account";
  }

  // Header link: "Sign in" when signed out, avatar + first name when signed in
  function renderHeader() {
    document.querySelectorAll("[data-auth-link]").forEach((a) => {
      if (user) {
        const m = user.user_metadata || {};
        const first = displayName(user).split(" ")[0];
        a.href = "account.html";
        a.classList.add("is-signed-in");
        a.innerHTML = (m.avatar_url ? `<img src="${esc(m.avatar_url)}" alt="" referrerpolicy="no-referrer">` : "") + `<span>${esc(first)}</span>`;
        a.setAttribute("aria-label", "My account");
      } else {
        a.href = "signin.html";
        a.classList.remove("is-signed-in");
        a.textContent = "Sign in";
        a.removeAttribute("aria-label");
      }
    });
  }

  async function loadSaved() {
    saved = new Set();
    if (!client || !user) return;
    const { data, error } = await client.from("saved_stories").select("story_key");
    if (!error && data) data.forEach((r) => saved.add(r.story_key));
  }

  async function setUser(u) {
    user = u || null;
    renderHeader();
    await loadSaved();
    listeners.forEach((fn) => { try { fn(user); } catch (e) { console.error(e); } });
  }

  async function signInWithGoogle(returnTo) {
    if (!client) throw new Error("Accounts are not set up yet.");
    const target = new URL(returnTo || "account.html", location.href).href;
    const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: target } });
    if (error) throw error;
  }

  async function signOut() {
    if (client) await client.auth.signOut();
    await setUser(null);
  }

  async function toggleSave(story) {
    if (!user) { location.href = "signin.html?next=" + encodeURIComponent(location.pathname.split("/").pop() || "index.html"); return null; }
    const key = storyKey(story);
    if (saved.has(key)) {
      const { error } = await client.from("saved_stories").delete().eq("user_id", user.id).eq("story_key", key);
      if (error) throw error;
      saved.delete(key);
      return false;
    }
    const { error } = await client.from("saved_stories").insert({ user_id: user.id, story_key: key });
    if (error) throw error;
    saved.add(key);
    return true;
  }

  // Adds a "Save story" button to the open article (called by script.js)
  function decorateReader(story, container) {
    if (!container) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "save-btn";
    const paint = () => {
      const on = user && saved.has(storyKey(story));
      btn.classList.toggle("on", !!on);
      btn.innerHTML = on ? "★ Saved" : (user ? "☆ Save story" : "☆ Sign in to save");
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    };
    paint();
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try { await toggleSave(story); } catch (e) { btn.textContent = "Couldn't save — try again"; console.error(e); }
      btn.disabled = false;
      paint();
    });
    if (!configured) return;   // hide the button until accounts are set up
    container.prepend(btn);
  }

  window.IMMA_AUTH = {
    configured, client, storyKey, displayName, signInWithGoogle, signOut, toggleSave, decorateReader,
    get user() { return user; },
    get saved() { return saved; },
    onChange(fn) { listeners.push(fn); if (ready) fn(user); }
  };

  let ready = false;
  renderHeader();
  if (client) {
    client.auth.getSession().then(({ data }) => setUser(data.session && data.session.user)).then(() => { ready = true; });
    client.auth.onAuthStateChange((_event, session) => { if ((session && session.user && session.user.id) !== (user && user.id)) setUser(session && session.user); });
  } else {
    ready = true;
  }
})();
