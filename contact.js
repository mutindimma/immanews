// Contact form: validation, spam protection, and honest sending.
//  - If CONTACT.formEndpoint is set (e.g. Formspree), the message is posted there and
//    "sent" is only shown when the service confirms it.
//  - Otherwise, WhatsApp opens with the message ready — the visitor presses send there.
(() => {
  const form = document.querySelector("#contact-page-form");
  if (!form) return;
  const C = typeof CONTACT !== "undefined" ? CONTACT : {};
  const status = form.querySelector("#cf-status");
  const submit = form.querySelector("#cf-submit");
  const hint = form.querySelector("#cf-hint");
  const startedAt = Date.now();
  const TYPES = Object.fromEntries([...form.elements.type.options].filter((o) => o.value).map((o) => [o.value, o.text]));

  // Pre-select enquiry type from the link, e.g. contact.html?type=tip
  const pre = new URLSearchParams(location.search).get("type");
  if (pre && TYPES[pre]) form.elements.type.value = pre;

  const useService = !!C.formEndpoint;
  if (!useService && C.whatsapp) {
    submit.textContent = "Send via WhatsApp";
    hint.textContent = "This opens WhatsApp with your message ready — just press send there.";
  }

  // ---- Validation ----
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const checks = {
    name: (f) => f.name.value.trim().length > 0,
    email: (f) => emailOk(f.email.value.trim()),
    type: (f) => !!f.type.value,
    message: (f) => f.message.value.trim().length >= 10
  };
  function validate() {
    let first = null;
    for (const [field, ok] of Object.entries(checks)) {
      const el = form.elements[field];
      const good = ok(form.elements);
      el.setAttribute("aria-invalid", good ? "false" : "true");
      el.closest(".field").querySelector(".err").hidden = good;
      if (!good && !first) first = el;
    }
    if (first) first.focus();
    return !first;
  }
  Object.keys(checks).forEach((field) => form.elements[field].addEventListener("input", () => {
    if (form.elements[field].getAttribute("aria-invalid") === "true" && checks[field](form.elements)) {
      form.elements[field].setAttribute("aria-invalid", "false");
      form.elements[field].closest(".field").querySelector(".err").hidden = true;
    }
  }));

  function show(kind, html) {
    status.hidden = false;
    status.className = "form-status " + kind;
    status.innerHTML = html;
  }
  const waLink = (text) => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(text)}`;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.hidden = true;
    if (!validate()) return;

    // Spam protection: hidden honeypot field, and forms submitted impossibly fast
    if (form.elements.website.value || Date.now() - startedAt < 3000) {
      show("error", "Sorry, we couldn't send that. Please wait a moment and try again.");
      return;
    }

    const data = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      type: TYPES[form.elements.type.value],
      message: form.elements.message.value.trim()
    };
    const text = `IMMA Media enquiry — ${data.type}\n\nName: ${data.name}\nEmail: ${data.email}\n\n${data.message}`;

    if (!useService) {
      if (!C.whatsapp) { show("error", "Online sending isn't set up yet. Please call us instead."); return; }
      window.open(waLink(text), "_blank", "noopener");
      show("info", "WhatsApp has opened with your message. <b>Press send in WhatsApp</b> to deliver it. " +
        `If nothing opened, <a href="${waLink(text)}" target="_blank" rel="noopener">tap here</a>.`);
      return;
    }

    submit.disabled = true;
    submit.textContent = "Sending…";
    try {
      const res = await fetch(C.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...data, _subject: `IMMA Media: ${data.type}` })
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      show("success", "Thank you — your message has been sent. We'll get back to you as soon as we can.");
    } catch {
      show("error", "Sorry, your message couldn't be sent right now." +
        (C.whatsapp ? ` You can <a href="${waLink(text)}" target="_blank" rel="noopener">send it on WhatsApp instead</a>.` : " Please try again later."));
    } finally {
      submit.disabled = false;
      submit.textContent = "Send message";
    }
  });
})();
