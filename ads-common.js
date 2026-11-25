// Shared helpers for the advertiser dashboard, admin dashboard and invoices.
window.ADS_UI = (() => {
  const cfg = typeof SUPABASE !== "undefined" ? SUPABASE : {};
  const BUCKET = (cfg.url || "") + "/storage/v1/object/public/ad-creatives/";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const kes = (n) => n == null ? "—" : "KSh " + Number(n).toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const date = (d) => d ? new Date(String(d).length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const dateTime = (d) => d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const today = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);   // Nairobi date
  const addDays = (d, n) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const endDate = (start, months, kind) => {
    if (kind === "sponsored") return addDays(start, 29);
    const x = new Date(start + "T00:00:00Z"); x.setUTCMonth(x.getUTCMonth() + Number(months || 1)); x.setUTCDate(x.getUTCDate() - 1);
    return x.toISOString().slice(0, 10);
  };
  const pct = (a, b) => b ? (100 * a / b).toFixed(2) + "%" : "—";
  const num = (n) => Number(n || 0).toLocaleString("en-KE");

  const LABELS = {
    draft: "Draft", submitted: "Awaiting review", approved: "Approved", rejected: "Needs changes", paused: "Paused",
    terminated: "Ended", expired: "Completed", unpaid: "Unpaid", pending_verification: "Payment being checked",
    paid: "Paid", waived: "No payment needed", confirmed: "Confirmed", pending: "Pending", new: "New",
    contacted: "Contacted", closed: "Closed", void: "Void", live: "Live", scheduled: "Scheduled"
  };
  const badge = (s) => `<span class="badge ${esc(s)}">${esc(LABELS[s] || s)}</span>`;

  // What the advertiser should see: live / scheduled / waiting for payment, etc.
  function displayStatus(c) {
    const t = today();
    if (c.status === "approved") {
      const paid = ["paid", "waived"].includes(c.payment_status) || c.complimentary || c.is_house;
      if (!paid) return "unpaid";
      if (c.end_date < t) return "expired";
      return c.start_date > t ? "scheduled" : "live";
    }
    return c.status;
  }

  function publicUrl(path) { return path ? BUCKET + path.split("/").map(encodeURIComponent).join("/") : ""; }

  // Mini advert preview, using the same markup as the live site
  function slotPreview(p, imgUrl, mobile, alt) {
    if (!p) return "";
    let w = p.width, h = p.height;
    if (mobile && p.mobile_width && p.width > 400) { w = p.mobile_width; h = p.mobile_height; }
    const inner = imgUrl
      ? `<img src="${esc(imgUrl)}" alt="${esc(alt || "")}" style="width:100%;height:100%;object-fit:cover">`
      : (window.IMMA_ADS ? window.IMMA_ADS.houseAd(p, mobile) : "");
    return `<div class="ad-slot" style="--ad-w:${w};--ad-h:${h};max-width:${w}px;margin:0 auto">
      <span class="ad-label">Advertisement</span><div class="ad-frame">${inner}</div></div>`;
  }

  function csv(rows, name) {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const cell = (v) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const text = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv" }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // Validate an image file before upload
  function checkImage(file, expectW, expectH) {
    return new Promise((resolve) => {
      if (!file) return resolve({ ok: true });
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type))
        return resolve({ ok: false, msg: "Please use a JPEG, PNG, WebP or GIF image." });
      if (file.size > 2 * 1024 * 1024) return resolve({ ok: false, msg: "The image is larger than 2 MB. Please make it smaller." });
      const img = new Image();
      img.onload = () => {
        const r = img.naturalWidth / img.naturalHeight, want = expectW && expectH ? expectW / expectH : null;
        const warn = want && Math.abs(r - want) / want > 0.08
          ? `This image is ${img.naturalWidth} × ${img.naturalHeight} px. The space is ${expectW} × ${expectH} px, so parts may be cropped.` : "";
        const small = expectW && img.naturalWidth < expectW ? `The image is narrower than ${expectW} px and may look blurry.` : "";
        resolve({ ok: true, warn: [warn, small].filter(Boolean).join(" "), w: img.naturalWidth, h: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve({ ok: false, msg: "That file could not be read as an image." });
      img.src = URL.createObjectURL(file);
    });
  }

  const friendlyError = (e) => {
    const m = (e && (e.message || e.error_description || e.details)) || String(e || "Something went wrong.");
    if (/row-level security|permission denied/i.test(m)) return "You don't have permission to do that.";
    if (/duplicate key.*ad_payments_ref/i.test(m)) return "That payment reference has already been used.";
    return m.replace(/^.*?ERROR:\s*/, "");
  };

  return { BUCKET, esc, kes, date, dateTime, today, addDays, endDate, pct, num, badge, LABELS, displayStatus, publicUrl, slotPreview, csv, checkImage, friendlyError };
})();
