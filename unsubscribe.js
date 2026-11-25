// Newsletter unsubscribe: by link token (?t=…) or by email address.
(() => {
  const N = window.IMMA_NEWSLETTER;
  const form = document.getElementById("unsub-form"), status = document.getElementById("unsub-status");
  if (!form || !N) return;
  const say = (msg, ok) => { status.hidden = false; status.textContent = msg; status.className = "form-status " + (ok ? "success" : "error"); };
  const DONE = "You have been unsubscribed. If that address was on our list, you will not receive the newsletter any more.";

  const token = new URLSearchParams(location.search).get("t");
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    say("Unsubscribing…", true);
    N.rpc("newsletter_unsubscribe", { p_token: token })
      .then(() => { say(DONE, true); history.replaceState(null, "", location.pathname); })
      .catch((e) => say(N.MESSAGES[e.message] || N.MESSAGES.unavailable, false));
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.elements.email.value.trim().toLowerCase();
    if (!N.EMAIL.test(email)) { form.elements.email.setAttribute("aria-invalid", "true"); form.elements.email.focus(); return say(N.MESSAGES.invalid_email, false); }
    form.elements.email.removeAttribute("aria-invalid");
    const btn = form.querySelector("button");
    btn.disabled = true; btn.textContent = "Unsubscribing…";
    try { await N.rpc("newsletter_unsubscribe", { p_email: email }); say(DONE, true); form.reset(); }
    catch (err) { say(N.MESSAGES[err.message] || N.MESSAGES.unavailable, false); }
    finally { btn.disabled = false; btn.textContent = "Unsubscribe"; }
  });
})();
