// ====== CONFIG ======
const endpoint = "https://script.google.com/macros/s/AKfycbxhFEj8E2PiEFTLHMI37S08b0R2MJiBTdHkl54IxeBhTY310E8bwA3ESnn08MEGei68/exec"; // <-- your Web App URL
const API_KEY  = ""; // if your Apps Script API_KEY is '', leave this empty

// ====== HELPERS ======
const $ = (id) => document.getElementById(id);
const form = $("leadForm");

// Optional: basic validators (keep or remove)
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v||'').trim());
const phoneOk = v => /^\+?\d[\d\s-]{7,}$/.test((v||'').trim());

// Grab UTM params (nice to have)
const qs = new URLSearchParams(location.search);
const utm = {
  utm_source:   qs.get("utm_source")   || "",
  utm_medium:   qs.get("utm_medium")   || "",
  utm_campaign: qs.get("utm_campaign") || "",
  utm_term:     qs.get("utm_term")     || "",
  utm_content:  qs.get("utm_content")  || ""
};

if (!form) {
  console.error("leadForm not found in DOM. Check your index.html has <form id=\"leadForm\">…</form> and that app.js is loaded at the end of <body> or with defer.");
}

// ====== SUBMIT ======
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  // hide old messages if you have them
  ["err-name","err-email","err-phone","err-consent","success"].forEach(id=>{
    const el = $(id); if (el) el.style.display = "none";
  });

  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());

  // (optional) client validation
  let bad = false;
  if (!data.name || data.name.trim().length < 2) { const el=$("err-name"); if(el) el.style.display="block"; bad=true; }
  if (!emailOk(data.email)) { const el=$("err-email"); if(el) el.style.display="block"; bad=true; }
  if (!phoneOk(data.phone)) { const el=$("err-phone"); if(el) el.style.display="block"; bad=true; }
  if (!form.consent.checked) { const el=$("err-consent"); if(el) el.style.display="block"; bad=true; }
  if (bad) return;

  // Build URL-encoded payload (NO manual headers → no CORS preflight)
  const payload = new URLSearchParams({
    ...(API_KEY ? { apikey: API_KEY } : {}),
    source: "CPF Maximise Landing",
    ...data,
    consent: "true",  // ensure string "true"
    ...utm
  });

  try {
    console.log("Submitting to Apps Script…", endpoint);
    const res = await fetch(endpoint, { method: "POST", body: payload }); // no headers
    const json = await res.json().catch(()=>({ok:false,error:"Bad JSON"}));
    console.log("Server response:", json);

    if (!json.ok) throw new Error(json.error || "Server error");

    form.reset();
    const ok = $("success"); if (ok) ok.style.display = "block";
    window.scrollTo({ top: form.offsetTop - 80, behavior: "smooth" });
  } catch (err) {
    console.warn("Fetch failed; trying sendBeacon/no-cors fallback", err);
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload.toString()], { type: "application/x-www-form-urlencoded" });
        if (navigator.sendBeacon(endpoint, blob)) {
          form.reset();
          const ok = $("success"); if (ok) ok.style.display = "block";
          return;
        }
      }
      await fetch(endpoint, { method: "POST", body: payload, mode: "no-cors" });
      form.reset();
      const ok = $("success"); if (ok) ok.style.display = "block";
    } catch (e2) {
      alert("Submission failed. Please try again later.");
      console.error(e2);
    }
  }
});
