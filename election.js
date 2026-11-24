// Kenya Elections 2027 countdown (sidebar card + site banner).
// Counts whole days in Kenya time (EAT, UTC+3) and updates itself at midnight.
// Election date: Tuesday 10 August 2027, as gazetted by the IEBC.
(() => {
  const ELECTION = { y: 2027, m: 8, d: 10 };
  const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

  function daysToGo() {
    const nowEAT = new Date(Date.now() + EAT_OFFSET_MS);            // shift so UTC fields = Kenya time
    const today = Date.UTC(nowEAT.getUTCFullYear(), nowEAT.getUTCMonth(), nowEAT.getUTCDate());
    const target = Date.UTC(ELECTION.y, ELECTION.m - 1, ELECTION.d);
    return Math.round((target - today) / 86400000);
  }

  function update() {
    const days = daysToGo();
    const num = days > 0 ? days.toLocaleString() : days === 0 ? "Today" : "✓";
    const label = days > 1 ? "days to go" : days === 1 ? "day to go" : days === 0 ? "Election Day" : "Kenya has voted";
    document.querySelectorAll("[data-election-days]").forEach((el) => (el.textContent = num));
    document.querySelectorAll("[data-election-label]").forEach((el) => (el.textContent = label));
    document.querySelectorAll("[data-election-card]").forEach((el) => el.classList.toggle("is-today", days === 0));
    const banner = document.querySelector("#election-banner");
    if (banner) banner.hidden = days < 0;   // hide the banner once the election has passed
  }

  function scheduleMidnight() {
    const nowEAT = new Date(Date.now() + EAT_OFFSET_MS);
    const nextMidnight = Date.UTC(nowEAT.getUTCFullYear(), nowEAT.getUTCMonth(), nowEAT.getUTCDate() + 1);
    setTimeout(() => { update(); scheduleMidnight(); }, nextMidnight - nowEAT.getTime() + 1000);
  }

  update();
  scheduleMidnight();
})();
