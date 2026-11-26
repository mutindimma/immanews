// Live Markets panel — free sources, no API keys needed.
//   Currencies (KES rates + daily change): fawazahmed0 currency-api (daily rates)
//   Gold price (live, USD per ounce):      gold-api.com
//   Bitcoin price + 24h change:            CoinGecko
// Each row loads on its own, so one source failing doesn't blank the panel.
(() => {
  const list = document.querySelector("#markets-list");
  if (!list) return;

  const ROWS = [
    { id: "usdkes", name: "USD / KES" },
    { id: "eurkes", name: "EUR / KES" },
    { id: "gbpkes", name: "GBP / KES" },
    { id: "gold",   name: "Gold (oz)" },
    { id: "btc",    name: "Bitcoin" }
  ];
  list.innerHTML = ROWS.map((r) =>
    `<li data-m="${r.id}"><span>${r.name}</span><b>…</b><em></em></li>`).join("");

  const num = (v, d = 2) => v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  function setRow(id, value, change) {
    const li = list.querySelector(`[data-m="${id}"]`);
    li.querySelector("b").textContent = value;
    const em = li.querySelector("em");
    if (change == null || !isFinite(change)) { em.textContent = ""; em.className = ""; return; }
    if (Math.abs(change) < 0.005) { em.textContent = "0.00%"; em.className = ""; return; }
    em.textContent = `${change > 0 ? "+" : "−"}${num(Math.abs(change))}%`;
    em.className = change > 0 ? "up" : "down";
  }
  const failRow = (id) => setRow(id, "—", null);
  const pct = (now, before) => ((now - before) / before) * 100;
  const getJSON = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });

  // ---- Currencies (USD base; KES crosses worked out from it) ----
  async function fxOn(date) {
    const tag = date || "latest";
    try {
      return await getJSON(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${tag}/v1/currencies/usd.min.json`);
    } catch {
      const host = date ? `${date}.currency-api.pages.dev` : "latest.currency-api.pages.dev";
      return getJSON(`https://${host}/v1/currencies/usd.min.json`);
    }
  }
  async function loadFx() {
    try {
      const now = await fxOn();
      const prevDate = new Date(now.date + "T00:00:00Z");
      prevDate.setUTCDate(prevDate.getUTCDate() - 1);
      const prev = await fxOn(prevDate.toISOString().slice(0, 10)).catch(() => null);
      const kesPer = (j, cur) => cur === "usd" ? j.usd.kes : j.usd.kes / j.usd[cur];
      for (const [id, cur] of [["usdkes", "usd"], ["eurkes", "eur"], ["gbpkes", "gbp"]]) {
        const v = kesPer(now, cur);
        setRow(id, num(v), prev ? pct(v, kesPer(prev, cur)) : null);
      }
    } catch { ["usdkes", "eurkes", "gbpkes"].forEach(failRow); }
  }

  // ---- Gold ----
  async function loadGold() {
    try {
      const g = await getJSON("https://api.gold-api.com/price/XAU");
      setRow("gold", "$" + num(g.price), null);
    } catch { failRow("gold"); }
  }

  // ---- Bitcoin ----
  async function loadBtc() {
    try {
      const c = await getJSON("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true");
      setRow("btc", "$" + num(c.bitcoin.usd, 0), c.bitcoin.usd_24h_change);
    } catch { failRow("btc"); }
  }

  async function loadAll() {
    await Promise.all([loadFx(), loadGold(), loadBtc()]);
    const t = document.querySelector("#markets-updated");
    const time = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(11, 16);   // Nairobi time
    const ok = [...list.querySelectorAll("b")].some((b) => b.textContent !== "—" && b.textContent !== "…");
    // the source names are shown with the time, so readers know where each price comes from
    if (t) t.innerHTML = ok ? `Updated ${time} EAT · Sources: <a href="https://github.com/fawazahmed0/exchange-api" target="_blank" rel="noopener">currency-api</a> (daily rates), <a href="https://gold-api.com/" target="_blank" rel="noopener">gold-api</a>, <a href="https://www.coingecko.com/" target="_blank" rel="noopener">CoinGecko</a>` : "Market data is unavailable right now.";
  }
  loadAll();
  setInterval(loadAll, 5 * 60 * 1000); // refresh every 5 minutes
})();
