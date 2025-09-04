// ---------- Elements ----------
const logDiv = document.getElementById("log");
const manualPanel = document.getElementById("manualPanel");
const friPanel = document.getElementById("friPanel");
const sendAtWrap = document.getElementById("sendAtWrap");
const sendAtInput = document.getElementById("sendAt");
const nextSendEl = document.getElementById("nextSend");
const countdownEl = document.getElementById("countdown");
const friDateEl = document.getElementById("friDate");
const friSlotsEl = document.getElementById("friSlots");
const scheduleInfo = document.getElementById("scheduleInfo");

const modeEl = document.getElementById("mode");
const sendOptionEl = document.getElementById("sendOption");
const manualDateEl = document.getElementById("manualDate");
const manualHourEl = document.getElementById("manualHour");
const paymentMethodEl = document.getElementById("paymentMethod");
const amountEl = document.getElementById("amount");
const retryCountEl = document.getElementById("retryCount");

const profileSelect = document.getElementById("profileSelect");
const profileName = document.getElementById("profileName");
const tokenInput = document.getElementById("token");
const deviceInput = document.getElementById("device_id");

const btnTest = document.getElementById("btnTest");
const btnSubmit = document.getElementById("btnSubmit");
const btnClearLog = document.getElementById("btnClearLog");
const btnSaveProfile = document.getElementById("btnSaveProfile");
const btnNewProfile = document.getElementById("btnNewProfile");
const btnDeleteProfile = document.getElementById("btnDeleteProfile");
const btnExportProfiles = document.getElementById("btnExportProfiles");
const inputImportProfiles = document.getElementById("inputImportProfiles");

let countdownTimer = null;

// ---------- Utils ----------
function fmt(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  const ss = String(dt.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}
function log(msg) { logDiv.innerText = `[${fmt(new Date())}] ${msg}\n` + logDiv.innerText; }
function clearLog() { logDiv.innerText = ""; }

// ---------- Modes & Send Option ----------
function onModeChange() {
  const mode = modeEl.value;
  manualPanel.style.display = mode === "manual" ? "block" : "none";
  friPanel.style.display = mode === "friday" ? "block" : "none";
  updateFridayInfo();
  saveSettings();
}
function onSendOptionChange() {
  const opt = sendOptionEl.value;
  sendAtWrap.style.display = opt === "schedule" ? "block" : "none";
  scheduleInfo.style.display = "none";
  stopCountdown();
  saveSettings();
}

function stopCountdown() { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; } }
function startCountdown(target) {
  stopCountdown();
  const tick = () => {
    const now = new Date();
    const s = Math.max(0, Math.floor((target - now) / 1000));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    countdownEl.textContent = `${hh}:${mm}:${ss}`;
  };
  tick(); countdownTimer = setInterval(tick, 1000);
}

// ---------- Time helpers (TH -> epoch) ----------
function toEpochThailand(dateStr, hour) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, hour - 7, 0, 0)); // THA = UTC+7
  return Math.floor(utc.getTime() / 1000);
}
function getNextWeekFriday() {
  const now = new Date();
  const day = now.getDay(); // 0..6
  const daysUntilThisFri = (5 - day + 7) % 7;
  const thisFri = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilThisFri, 0, 0, 0, 0);
  return new Date(thisFri.getTime() + 7 * 24 * 3600 * 1000);
}
function updateFridayInfo() {
  if (modeEl.value !== "friday") return;
  const nextFri = getNextWeekFriday();
  const y = nextFri.getFullYear();
  const m = String(nextFri.getMonth() + 1).padStart(2, "0");
  const d = String(nextFri.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;
  friDateEl.textContent = `${dateStr} (TH)`;
  friSlotsEl.textContent = `${dateStr} 19:00–20:00, ${dateStr} 20:00–21:00 (TH)`;
}

// ---------- Settings (front-end state) ----------
const SETTINGS_KEY = "apiScheduler_v2";
function saveSettings() {
  const data = {
    mode: modeEl.value,
    sendOption: sendOptionEl.value,
    sendAt: sendAtInput.value,
    manualDate: manualDateEl.value,
    manualHour: manualHourEl.value,
    paymentMethod: paymentMethodEl.value,
    amount: amountEl.value,
    retryCount: retryCountEl.value,
    selectedProfileId: profileSelect.value || "",
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}
function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    try {
      const d = JSON.parse(saved);
      modeEl.value = d.mode ?? "manual";
      sendOptionEl.value = d.sendOption ?? "now";
      sendAtInput.value = d.sendAt ?? "";
      manualDateEl.value = d.manualDate ?? "";
      manualHourEl.value = d.manualHour ?? "17";
      paymentMethodEl.value = d.paymentMethod ?? "9";
      amountEl.value = d.amount ?? "2";
      retryCountEl.value = d.retryCount ?? "5";
    } catch { log("⚠️ Failed to load settings"); }
  }
  onModeChange(); onSendOptionChange(); updateFridayInfo();
  // autosave on change
  [
    modeEl, sendOptionEl, sendAtInput, manualDateEl, manualHourEl,
    paymentMethodEl, amountEl, retryCountEl
  ].forEach(el => {
    const ev = (el.tagName === "INPUT" && (el.type === "text" || el.type === "password" || el.type === "datetime-local")) ? "input" : "change";
    el.addEventListener(ev, saveSettings);
  });
}

// ---------- Profiles (LOCAL, GitHub Pages-friendly) ----------
const PROFILES_KEY = "apiScheduler_profiles_v2";
function getLocalProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}
function setLocalProfiles(list) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list || []));
}
function renderProfilesDropdownLocal(selectedId) {
  const list = getLocalProfiles();
  profileSelect.innerHTML = "";
  const optNone = document.createElement("option");
  optNone.value = "";
  optNone.textContent = "— Select profile —";
  profileSelect.appendChild(optNone);
  list.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name || `(unnamed) ${p.id.slice(-4)}`;
    profileSelect.appendChild(opt);
  });
  if (selectedId) profileSelect.value = selectedId;
}
function uuid() {
  return "p-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function onProfileSelectChangeLocal() {
  const id = profileSelect.value;
  if (!id) {
    profileName.value = ""; tokenInput.value = ""; deviceInput.value = "";
    saveSettings(); return;
  }
  const list = getLocalProfiles();
  const p = list.find(x => x.id === id);
  if (!p) { log("ℹ️ Profile not found"); return; }

  profileName.value = p.name || "";
  tokenInput.value = p.token || "";
  deviceInput.value = p.device_id || "";

  paymentMethodEl.value = p.paymentMethod || "9";
  amountEl.value = p.amount || "2";
  retryCountEl.value = p.retryCount || "5";
  modeEl.value = p.mode || "manual";
  sendOptionEl.value = p.sendOption || "now";
  manualDateEl.value = p.manualDate || "";
  manualHourEl.value = p.manualHour || "17";
  sendAtInput.value = p.sendAt || "";

  onModeChange(); onSendOptionChange(); updateFridayInfo();

  const st = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  st.selectedProfileId = id;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(st));
  log(`👤 Loaded profile: ${p.name || id}`);
}
function saveOrUpdateProfileLocal() {
  const name = (profileName.value || "").trim();
  const token = tokenInput.value || "";
  const device_id = deviceInput.value || "";
  if (!token || !device_id) { log("⛔ token & device_id are required"); return; }

  const payload = {
    name, token, device_id,
    paymentMethod: paymentMethodEl.value || "9",
    amount: amountEl.value || "2",
    retryCount: retryCountEl.value || "5",
    mode: modeEl.value || "manual",
    sendOption: sendOptionEl.value || "now",
    manualDate: manualDateEl.value || "",
    manualHour: manualHourEl.value || "17",
    sendAt: sendAtInput.value || ""
  };

  const id = profileSelect.value;
  const list = getLocalProfiles();
  if (id) {
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = { ...list[idx], ...payload, id };
    log(`💾 Updated profile: ${name || id}`);
  } else {
    const newId = uuid();
    list.push({ id: newId, ...payload });
    profileSelect.value = newId;
    log(`💾 Saved new profile: ${name || newId}`);
  }
  setLocalProfiles(list);
  renderProfilesDropdownLocal(profileSelect.value);

  const st = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  st.selectedProfileId = profileSelect.value;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(st));
  saveSettings();
}
function newProfileLocal() {
  profileSelect.value = "";
  profileName.value = "";
  tokenInput.value = "";
  deviceInput.value = "";
  saveSettings();
}
function deleteProfileLocal() {
  const id = profileSelect.value;
  if (!id) { log("ℹ️ No profile selected"); return; }
  const list = getLocalProfiles();
  const idx = list.findIndex(x => x.id === id);
  if (idx < 0) { log("ℹ️ Selected profile not found"); return; }
  const name = list[idx].name || id;
  list.splice(idx, 1);
  setLocalProfiles(list);
  renderProfilesDropdownLocal("");
  profileName.value = ""; tokenInput.value = ""; deviceInput.value = "";
  log(`🗑️ Deleted profile: ${name}`);
}
// Export/Import
function exportProfilesToFile() {
  const data = JSON.stringify(getLocalProfiles(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "profiles.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  log("📤 Exported profiles to profiles.json");
}
function importProfilesFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const list = JSON.parse(reader.result);
      if (!Array.isArray(list)) throw new Error("Invalid file format");
      setLocalProfiles(list);
      renderProfilesDropdownLocal();
      log(`📥 Imported ${list.length} profiles`);
    } catch (e) { log("❌ Import failed: " + e.message); }
  };
  reader.readAsText(file);
}

// ---------- Requests & Retry ----------
function buildParams(start, end, paymentMethod, amount) {
  return new URLSearchParams({
    token: tokenInput.value || "",
    device_id: deviceInput.value || "",
    card_id: "6364",
    slot_id: "12489",
    contact: "0818855930",
    remark: "",
    start: start,
    end: end,
    payment_method: paymentMethod,
    cuid: "",
    amount: amount,
    return_uri: "https://client.loga.app/card/6364/shop/approve-order",
  });
}
async function doFetchOnce(start, end, paymentMethod, amount) {
  const url = "https://www.loga.app/privateapi/booking/create_appointment";
  const params = buildParams(start, end, paymentMethod, amount);
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const status = resp.status;
  const text = await resp.text();
  let data = null; try { data = JSON.parse(text); } catch {}
  return { ok: resp.ok, status, data, raw: text };
}
async function sendPostWithRetry(start, end, paymentMethod, amount, dryRun = false, retries = 5) {
  const url = "https://www.loga.app/privateapi/booking/create_appointment";
  const params = buildParams(start, end, paymentMethod, amount);

  if (dryRun) {
    log(`🧪 [Dry Run] POST ${url}`);
    log(`Payload:\n${params.toString().replaceAll("&", "\n")}`);
    return;
  }
  if (!(tokenInput.value && deviceInput.value)) { log("⛔ token/device_id required for real request"); return; }

  const totalAttempts = Math.max(1, parseInt(retries, 10) || 0) + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    log(`➡️ Attempt ${attempt}/${totalAttempts} ...`);
  
    try {
      const res = await doFetchOnce(start, end, paymentMethod, amount);
      if (!res.ok) {
        log(`❌ HTTP Error (status ${res.status})`);
      } else {
        const body = res.data; // parse the real API response
        if (body.code === 200) {
          log(`✅ Success (API ${body.code}) - ${body.msg}`);
          // Try to extract payment_uri from nested structures
          let paymentUri =
            body?.data?.data?.data?.payment_uri ??
            body?.data?.data?.payment_uri ??
            body?.data?.payment_uri ??
            null;
          if (paymentUri) {
            log(`🔗 Opening payment_uri in new tab: ${paymentUri}`);
            window.open(paymentUri, "_blank");
          } else {
            log(`ℹ️ payment_uri not found in response`);
          }
          return; // success, stop retry loop
        } else {
          log(`⚠️ Failed (API ${body.code}) - ${body.msg}`);
        }
      }
    } catch (e) {
      log(`❌ Error: ${e}`);
    }
    if (attempt < totalAttempts) {
      await new Promise(r => setTimeout(r, 500)); // 0.5s retry delay
    }
  }
  log("🛑 All attempts exhausted");
}

// ---------- Submit Handler ----------
async function handleSubmit(dryRun = false) {
  saveSettings();
  const mode = modeEl.value;
  const sendOpt = sendOptionEl.value;
  const paymentMethod = paymentMethodEl.value;
  const amount = amountEl.value;
  const retries = parseInt(retryCountEl.value) || 0;

  if (mode === "manual") {
    const date = manualDateEl.value;
    const hour = parseInt(manualHourEl.value);
    if (!date || isNaN(hour)) { log('⛔ Please select both date and hour'); return; }
    const startUnix = toEpochThailand(date, hour);
    const endUnix = toEpochThailand(date, hour + 1);

    if (sendOpt === "now") {
      await sendPostWithRetry(startUnix, endUnix, paymentMethod, amount, dryRun, retries);
    } else {
      const sendAtStr = sendAtInput.value; if (!sendAtStr) { log('⛔ Please choose "Send at" time'); return; }
      const target = new Date(sendAtStr); if (target <= new Date()) { log('⛔ "Send at" must be in the future'); return; }
      nextSendEl.textContent = fmt(target) + " (TH)";
      scheduleInfo.style.display = "block";
      startCountdown(target);
      const delay = target.getTime() - Date.now();
      log(`⏳ Scheduled manual request at ${fmt(target)} (TH)`);
      setTimeout(() => { log("🚀 Sending manual request"); sendPostWithRetry(startUnix, endUnix, paymentMethod, amount, dryRun, retries); }, delay);
    }
    return;
  }

  // friday booking — next week's Friday 19–20 and 20–21 (async)
  const nextFri = getNextWeekFriday();
  const y = nextFri.getFullYear();
  const m = String(nextFri.getMonth() + 1).padStart(2, "0");
  const d = String(nextFri.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;
  const slot1 = { start: toEpochThailand(dateStr, 19), end: toEpochThailand(dateStr, 20) };
  const slot2 = { start: toEpochThailand(dateStr, 20), end: toEpochThailand(dateStr, 21) };

  if (sendOpt === "now") {
    log(`🚀 Sending Friday booking NOW for ${dateStr} 19–21 (2 requests, async)`);
    await Promise.allSettled([
      sendPostWithRetry(slot1.start, slot1.end, paymentMethod, amount, dryRun, retries),
      sendPostWithRetry(slot2.start, slot2.end, paymentMethod, amount, dryRun, retries),
    ]);
  } else {
    const sendAtStr = sendAtInput.value; if (!sendAtStr) { log('⛔ Please choose "Send at" time'); return; }
    const target = new Date(sendAtStr); if (target <= new Date()) { log('⛔ "Send at" must be in the future'); return; }
    nextSendEl.textContent = fmt(target) + " (TH)";
    scheduleInfo.style.display = "block";
    startCountdown(target);
    const delay = target.getTime() - Date.now();
    log(`⏳ Scheduled Friday booking at ${fmt(target)} (TH) for ${dateStr} 19–21 (2 requests, async) with ${retries} retries each`);
    setTimeout(() => {
      log("🚀 Sending 2 Friday booking requests concurrently");
      Promise.allSettled([
        sendPostWithRetry(slot1.start, slot1.end, paymentMethod, amount, dryRun, retries),
        sendPostWithRetry(slot2.start, slot2.end, paymentMethod, amount, dryRun, retries),
      ]).then(() => log("🟢 Both Friday requests finished (see logs above)"));
    }, delay);
  }
}

// ---------- Wire up ----------
function attachHandlers() {
  modeEl.addEventListener("change", onModeChange);
  sendOptionEl.addEventListener("change", onSendOptionChange);
  btnTest.addEventListener("click", () => handleSubmit(true));
  btnSubmit.addEventListener("click", () => handleSubmit(false));
  btnClearLog.addEventListener("click", clearLog);

  btnSaveProfile.addEventListener("click", saveOrUpdateProfileLocal);
  btnNewProfile.addEventListener("click", newProfileLocal);
  btnDeleteProfile.addEventListener("click", deleteProfileLocal);
  btnExportProfiles.addEventListener("click", exportProfilesToFile);
  inputImportProfiles.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) importProfilesFromFile(f);
  });
  profileSelect.addEventListener("change", onProfileSelectChangeLocal);
}

function init() {
  attachHandlers();
  loadSettings();
  renderProfilesDropdownLocal(); // fill dropdown

  // restore previously selected profile
  const st = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  if (st.selectedProfileId) {
    profileSelect.value = st.selectedProfileId;
    onProfileSelectChangeLocal();
  }
}
init();
