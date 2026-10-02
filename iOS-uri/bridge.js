/* Destinations copied verbatim from the supplied OneLink response, 2026-10-02.
 * Deliberate fix: no timer, focus callback, or departure callback navigates to Store.
 * Store navigation requires an explicit click on #open-store.
 */
(() => {
  "use strict";

  const APP_URL = "afbasicapp://mainactivity?test=1&af_deeplink=true&af_dp=afbasicapp%3A%2F%2Fmainactivity%3Ftest%3D1&af_force_deeplink=true&af_xp=custom&campaign=aaaa&media_source=testa&onelink_id=xfPm&shortlink=ozmfsuhr&source_caller=ui";
  const STORE_URL = "https://apps.apple.com/US/app/id1550796743?mt=8";
  const LOG_KEY = "ios-uri-test-events-v1";
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const status = document.getElementById("status");
  const logView = document.getElementById("event-log");
  let attempt = 0;
  let leftPage = false;
  let storeRequested = false;
  let loaded = false;
  let exportUrl = null;
  let entries = [];

  try {
    const saved = JSON.parse(sessionStorage.getItem(LOG_KEY) || "[]");
    if (Array.isArray(saved)) entries = saved.filter(entry => entry && typeof entry === "object").slice(-150);
  } catch (_) { /* Storage may be unavailable in a restricted browser. */ }

  function log(event, detail = {}) {
    const entry = {
      runId, time: new Date().toISOString(), elapsedMs: Math.round(performance.now()),
      event, attempt, leftPage, storeRequested, hidden: document.hidden,
      visibility: document.visibilityState, focus: document.hasFocus(),
      userActivation: navigator.userActivation ? navigator.userActivation.isActive : null,
      ...detail
    };
    entries.push(entry);
    entries = entries.slice(-200);
    // Save before navigation so the initiating event survives returning to this tab.
    try { sessionStorage.setItem(LOG_KEY, JSON.stringify(entries)); } catch (_) {}
    logView.textContent = entries.map(item => JSON.stringify(item)).join("\n");
    logView.scrollTop = logView.scrollHeight;
    console.info("[iOS-uri]", entry);
  }

  function openApp(trigger) {
    if (document.hidden) {
      log("app-attempt-blocked", { trigger, reason: "page-hidden" });
      return;
    }
    attempt += 1;
    leftPage = false;
    storeRequested = false;
    status.textContent = "หากมี dialog ให้เลือกเปิดแอป หากยกเลิก สามารถลองอีกครั้งหรือกดเปิด App Store ได้";
    log("app-navigation-requested", { trigger, destination: APP_URL });
    try {
      window.location.href = APP_URL;
    } catch (error) {
      status.textContent = "เปิดแอปไม่ได้ ลองกดเปิดแอปอีกครั้ง หรือเลือกเปิด App Store";
      log("app-navigation-error", { message: String(error) });
    }
    // A native confirmation has no dependable JS accept/cancel callback.
    // Do not infer 'not installed' from elapsed time or queue a Store navigation.
  }

  function markLeft(event) {
    leftPage = true; // Departure heuristic only; not proof the app opened.
    log(event.type);
  }

  window.addEventListener("blur", markLeft, true);
  window.addEventListener("pagehide", markLeft, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) leftPage = true;
    log("visibilitychange");
  }, true);
  window.addEventListener("focus", () => log("focus"), true);
  window.addEventListener("pageshow", event => {
    storeRequested = false;
    log("pageshow", { persisted: event.persisted });
    if (loaded && attempt > 0) {
      status.textContent = "กลับมาที่หน้าทดสอบแล้ว หากต้องการ ให้เลือกเปิดแอปอีกครั้งหรือเปิด App Store";
    }
    // Returning from the app or BFCache never restarts an attempt or opens Store.
  });

  document.getElementById("open-app").addEventListener("click", () => openApp("page-button"));
  document.getElementById("open-store").addEventListener("click", () => {
    if (document.hidden || storeRequested) {
      log("store-navigation-blocked", { reason: document.hidden ? "page-hidden" : "already-requested" });
      return;
    }
    storeRequested = true;
    log("store-navigation-requested", { trigger: "store-button", destination: STORE_URL });
    try {
      window.location.href = STORE_URL;
    } catch (error) {
      storeRequested = false;
      log("store-navigation-error", { message: String(error) });
    }
  });

  document.getElementById("download-log").addEventListener("click", () => {
    log("log-export");
    const blob = new Blob([JSON.stringify({ userAgent: navigator.userAgent, entries }, null, 2)], { type: "application/json" });
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    exportUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = exportUrl;
    link.download = `ios-uri-log-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Keep the URL alive while Safari starts the download; revoke on next export.
  });
  document.getElementById("clear-log").addEventListener("click", () => {
    entries = [];
    log("log-cleared");
  });

  const autostart = new URLSearchParams(window.location.search).get("autostart") !== "0";
  log("initialized", { userAgent: navigator.userAgent, historyLength: window.history.length, autostart });
  window.addEventListener("load", () => {
    if (loaded) return;
    loaded = true;
    log("load");
    if (autostart) openApp("page-load");
    else status.textContent = "กดเปิดแอปเพื่อเริ่มทดสอบ";
  }, { once: true });
})();
