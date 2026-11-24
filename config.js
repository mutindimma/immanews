// ============================================================
//  IMMA MEDIA — SITE SETTINGS
// ============================================================
const WEATHER = {
  // City shown in the Weather panel
  city: "Nairobi",
  lat: -1.2864,
  lon: 36.8172,

  // OpenWeatherMap API key.
  // 1. Create a free account at https://openweathermap.org/api
  // 2. Copy your key from "My API keys" and paste it between the quotes.
  // Leave it empty to use Open-Meteo instead (free, no key needed).
  // Note: anyone can see this key in the page code, so only use a free-plan key.
  openWeatherKey: "",

  units: "metric" // "metric" for °C, "imperial" for °F
};

// ============================================================
//  CONTACT DETAILS — used on the Contact page and site footer
// ============================================================
const CONTACT = {
  phone: "+254 785 887 830",
  whatsapp: "254785887830",          // country code + number, no "+" or spaces
  location: "Nairobi, Kenya",

  // Official email. Leave empty to hide it until you have one.
  email: "",

  // Form service address (e.g. from https://formspree.io → "https://formspree.io/f/xxxxxxx").
  // While this is empty, the contact form opens WhatsApp with the message ready to send.
  formEndpoint: "",

  // Social media — paste full links. Empty ones are not shown.
  social: {
    facebook: "",
    x: "",
    instagram: "",
    youtube: "",
    tiktok: "",
    linkedin: ""
  }
};

// ============================================================
//  ACCOUNTS (Supabase) — see SUPABASE-SETUP.md
//  Paste your project's URL and its *publishable* (anon) key.
//  These two are meant to be public. NEVER paste the
//  "service_role" / "secret" key here.
//  While empty, the Sign in page shows "coming soon".
// ============================================================
const SUPABASE = {
  url: "https://gbajbqczpwdxghgpgsoo.supabase.co",
  anonKey: "sb_publishable_CeBFBTA7vT-pEXsEQ5rRYw_8Nzk92qI"   // publishable key — safe to be public
};
