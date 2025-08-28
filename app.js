// =====================
// app.js (no consent checkbox)
// =====================

// ---- CONFIG ----
const endpoint = "https://script.google.com/macros/s/AKfycbxhFEj8E2PiEFTLHMI37S08b0R2MJiBTdHkl54IxeBhTY310E8bwA3ESnn08MEGei68/exec"; // Web App URL
const API_KEY  = ""; // leave "" unless you enabled a key in Apps Script

// ---- ELEMENTS ----
const $    = (id) => document.getElementById(id);
const form = $("leadForm");

// Footer year (nice touch)
const yearEl = $("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---- Basic validators ----
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
const phoneOk = (v) => /^\+?\d[\d\s-]{7,}$/.test((v || "").trim());

// ---- UTM capture ----
const qs  = new URLSearchParams(location.search);
const utm = {
  utm_source:   qs.get("utm_source")   || "",
  utm_medium:   qs.get("utm_medium")   || "",
  utm_campaign: qs.get("utm_campaign") || "",
  utm_term:     qs.get("utm_term")     || "",
  utm_content:  qs.get("utm_content")  || ""
};

// ---- Guard if form missing ----
if (!form) {
  console.error('Form #leadForm not found. Ensure <form id="leadForm"> exists and app.js is loaded after it.');
}

// ---- Submit handler ----
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Clear prior UI states
  ["err-name","err-email","err-phone","success"].forEach(id => {
    const el = $(id); if (el) el.style.display = "none";
  });

  // Collect form data
  const fd   = new FormData(form);
  const data = Object.fromEntries(fd.entries());

  // Client-side validation
  let bad = false;
  if (!data.name || data.name.trim().length < 2) { const el=$("err-name");  if (el) el.style.display="block";  bad = true; }
  if (!emailOk(data.email))                        { const el=$("err-email"); if (el) el.style.display="block"; bad = true; }
  if (!phoneOk(data.phone))                        { const el=$("err-phone"); if (el) el.style.display="block"; bad = true; }
  if (bad) return;

  // Build URL-encoded payload (simple request: no custom headers → no CORS preflight)
  const payload = new URLSearchParams({
    ...(API_KEY ? { apikey: API_KEY } : {}),
    source: "CPF Maximise Landing",
    ...data,            // name, age, email, phone, time, method, message
    consent: "true",    // keep for backend compatibility (no checkbox on UI)
    ...utm
  });

  // Disable submit to avoid double posts
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn?.setAttribute("disabled","disabled");

  try {
    // Primary attempt (expect JSON)
    const res  = await fetch(endpoint, { method: "POST", body: payload });
    const json = await res.json().catch(() => ({ ok:false, error:"Bad JSON" }));
    if (!json.ok) throw new Error(json.error || "Server error");

    // Success UI
    form.reset();
    const ok = $("success"); if (ok) ok.style.display = "block";
    window.scrollTo({ top: form.offsetTop - 80, behavior: "smooth" });

  } catch (err) {
    console.warn("Fetch failed; trying Beacon/no-cors fallback", err);

    try {
      // Try Beacon first
      if (navigator.sendBeacon) {
        const blob = new Blob([payload.toString()], { type: "application/x-www-form-urlencoded" });
        if (navigator.sendBeacon(endpoint, blob)) {
          form.reset();
          const ok = $("success"); if (ok) ok.style.display = "block";
          return;
        }
      }
      // Last resort: fire-and-forget POST (no-cors)
      await fetch(endpoint, { method: "POST", body: payload, mode: "no-cors" });
      form.reset();
      const ok = $("success"); if (ok) ok.style.display = "block";
    } catch (e2) {
      alert("Submission failed. Please try again later.");
      console.error(e2);
    }
  } finally {
    submitBtn?.removeAttribute("disabled");
  }
});
