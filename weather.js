// Live weather panel — uses OpenWeatherMap when a key is set in config.js,
// otherwise Open-Meteo (free, no key). Both give the same result shape:
// { temp, desc, icon, days: [{ day, icon, max }] }
(() => {
  const W = typeof WEATHER !== "undefined" ? WEATHER : { city: "Nairobi", lat: -1.2864, lon: 36.8172, units: "metric" };
  const imperial = W.units === "imperial";
  const dayName = (d) => d.toLocaleDateString(undefined, { weekday: "short" });

  // ---- OpenWeatherMap ----
  const owmIcon = (main, night) => ({
    Clear: night ? "🌙" : "☀️", Clouds: "⛅", Rain: "🌧️", Drizzle: "🌦️",
    Thunderstorm: "⛈️", Snow: "❄️"
  }[main] || "🌫️");

  async function fromOpenWeather() {
    const q = `lat=${W.lat}&lon=${W.lon}&units=${W.units}&appid=${encodeURIComponent(W.openWeatherKey)}`;
    const [now, fc] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?${q}`).then(ok),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?${q}`).then(ok)
    ]);
    const tz = fc.city.timezone; // seconds offset from UTC
    const byDay = {};
    for (const e of fc.list) {
      const local = new Date((e.dt + tz) * 1000);
      const key = local.toISOString().slice(0, 10);
      const d = byDay[key] ||= { date: local, max: -Infinity, mid: e };
      d.max = Math.max(d.max, e.main.temp_max);
      if (Math.abs(local.getUTCHours() - 12) < Math.abs(new Date((d.mid.dt + tz) * 1000).getUTCHours() - 12)) d.mid = e;
    }
    const today = new Date((Date.now() / 1000 + tz) * 1000).toISOString().slice(0, 10);
    const days = Object.entries(byDay).filter(([k]) => k > today).slice(0, 5).map(([, d]) => ({
      day: d.date.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }),
      icon: owmIcon(d.mid.weather[0].main, false),
      max: d.max
    }));
    const w = now.weather[0];
    return { temp: now.main.temp, desc: w.description, icon: owmIcon(w.main, w.icon.endsWith("n")), days, source: "OpenWeatherMap", link: "https://openweathermap.org/" };
  }

  // ---- Open-Meteo ----
  function wmo(code, night) {
    if (code === 0) return [night ? "🌙" : "☀️", "Clear sky"];
    if (code <= 2) return ["⛅", "Partly cloudy"];
    if (code === 3) return ["☁️", "Overcast"];
    if (code <= 48) return ["🌫️", "Fog"];
    if (code <= 57) return ["🌦️", "Drizzle"];
    if (code <= 67) return ["🌧️", "Rain"];
    if (code <= 77) return ["❄️", "Snow"];
    if (code <= 82) return ["🌦️", "Rain showers"];
    if (code <= 86) return ["❄️", "Snow showers"];
    return ["⛈️", "Thunderstorm"];
  }

  async function fromOpenMeteo() {
    const unit = imperial ? "&temperature_unit=fahrenheit" : "";
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${W.lat}&longitude=${W.lon}` +
      `&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max&timezone=auto&forecast_days=6${unit}`).then(ok);
    const [icon, desc] = wmo(r.current.weather_code, r.current.is_day === 0);
    const days = r.daily.time.slice(1, 6).map((t, i) => ({
      day: dayName(new Date(t + "T12:00:00")),
      icon: wmo(r.daily.weather_code[i + 1])[0],
      max: r.daily.temperature_2m_max[i + 1]
    }));
    return { temp: r.current.temperature_2m, desc, icon, days, source: "Open-Meteo", link: "https://open-meteo.com/" };
  }

  function ok(res) { if (!res.ok) throw new Error(res.status); return res.json(); }

  // ---- Render ----
  const panel = document.querySelector("#weather");
  if (!panel) return;
  const deg = (t) => `${Math.round(t)}°`;

  async function load() {
    try {
      const w = W.openWeatherKey ? await fromOpenWeather().catch((e) => {
        console.warn("OpenWeatherMap failed, using Open-Meteo:", e.message);
        return fromOpenMeteo();
      }) : await fromOpenMeteo();
      panel.querySelector(".wx-icon").textContent = w.icon;
      panel.querySelector(".wx-temp").textContent = deg(w.temp);
      panel.querySelector(".wx-desc").textContent = `${W.city} · ${w.desc[0].toUpperCase()}${w.desc.slice(1)}`;
      panel.querySelector(".forecast").innerHTML = w.days.map((d) =>
        `<li><span>${d.day}</span>${d.icon}<b>${deg(d.max)}</b></li>`).join("");
      const src = panel.querySelector(".wx-source");
      src.textContent = w.source;
      src.href = w.link;
      panel.classList.remove("loading");
    } catch (e) {
      panel.querySelector(".wx-desc").textContent = `${W.city} · Weather unavailable right now`;
      panel.querySelector(".wx-temp").textContent = "—";
      panel.classList.remove("loading");
    }
  }
  load();
  setInterval(load, 30 * 60 * 1000); // refresh every 30 minutes
})();
