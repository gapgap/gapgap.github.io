/* Destinations copied verbatim from the supplied OneLink response, 2026-10-02.
 * One cancellable fallback per attempt, shared by page-load and button attempts.
 * Scheme failure cannot be confirmed by browser JS; the fallback is a heuristic.
 */
(() => {
  "use strict";

  const APP_URL = "afbasicapp://mainactivity?test=1&af_deeplink=true&af_dp=afbasicapp%3A%2F%2Fmainactivity%3Ftest%3D1&af_force_deeplink=true&af_xp=custom&campaign=aaaa&media_source=testa&onelink_id=xfPm&shortlink=ozmfsuhr&source_caller=ui";
  const STORE_URL = "https://apps.apple.com/US/app/id1550796743?mt=8";
  const LOG_KEY = "ios-uri-test-events-v1";
  const FALLBACK_WAIT_MS = 1500;
  const CHECK_INTERVAL_MS = 100;
  const MAX_TICK_GAP_MS = 500;
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const openButton = document.getElementById("open");
  const mainContainer = document.getElementById("container");
  const logo = document.getElementById("logo");
  const labels = {
    "en-US": "Go to the app", "zh-CN": "前往应用", "zh-TW": "前往應用",
    "ja": "アプリに移動", "ja-JP": "アプリに移動"
  };
  openButton.innerText = labels[navigator.language] || labels["en-US"];
  mainContainer.style.display = "block";
  mainContainer.style.visibility = "visible";
  mainContainer.style.opacity = "1";
  openButton.setAttribute("role", "button");
  openButton.setAttribute("tabindex", "0");
  const icon = document.createElement("img");
  icon.setAttribute("src", "https://cdnappicons.appsflyer.com/id1550796743.ver-1.41.png");
  icon.setAttribute("alt", "");
  icon.setAttribute("role", "button");
  icon.setAttribute("tabindex", "0");
  icon.setAttribute("aria-label", "Open in App Store");
  logo.appendChild(icon);
  let attempt = 0;
  let leftPage = false;
  let storeRequested = false;
  let loaded = false;
  let fallbackTimer = null;
  let fallbackPending = false;
  let quietSince = 0;
  let lastTickAt = 0;
  let exportUrl = null;
  let entries = [];

  try {
    const saved = JSON.parse(sessionStorage.getItem(LOG_KEY) || "[]");
    if (Array.isArray(saved)) entries = saved.filter(entry => entry && typeof entry === "object").slice(-150);
  } catch (_) { /* Storage may be unavailable in a restricted browser. */ }

  function log(event, detail = {}) {
    const entry = {
      runId, time: new Date().toISOString(), elapsedMs: Math.round(performance.now()),
      event, attempt, leftPage, storeRequested, fallbackPending, hidden: document.hidden,
      visibility: document.visibilityState, focus: document.hasFocus(),
      userActivation: navigator.userActivation ? navigator.userActivation.isActive : null,
      ...detail
    };
    entries.push(entry);
    entries = entries.slice(-200);
    // Save before navigation so the initiating event survives returning to this tab.
    try { sessionStorage.setItem(LOG_KEY, JSON.stringify(entries)); } catch (_) {}
    console.info("[iOS-uri]", entry);
  }

  function cancelFallback(reason) {
    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    const wasPending = fallbackPending;
    fallbackPending = false;
    if (wasPending) log("fallback-cancelled", { reason });
  }

  function checkFallback(expectedAttempt) {
    // A callback belonging to an earlier click must not affect the newer attempt.
    if (expectedAttempt !== attempt || !fallbackPending) return;
    fallbackTimer = null;
    if (leftPage || document.hidden || storeRequested || !document.hasFocus()) {
      cancelFallback("page-left-hidden-unfocused-or-store-requested");
      return;
    }
    const now = performance.now();
    const tickGap = now - lastTickAt;
    lastTickAt = now;
    if (tickGap > MAX_TICK_GAP_MS) {
      // Dialog pause, throttling or a busy main thread may deliver an overdue timer.
      // Do not navigate immediately on resume; require a new foreground interval.
      // A gap is not proof that a native confirmation dialog was present.
      quietSince = now;
      log("fallback-deferred", { reason: "late-timer", tickGapMs: Math.round(tickGap) });
    }
    if (now - quietSince >= FALLBACK_WAIT_MS) {
      openStore("automatic-fallback", expectedAttempt);
      return;
    }
    fallbackTimer = setTimeout(() => checkFallback(expectedAttempt), CHECK_INTERVAL_MS);
  }

  function openApp(trigger) {
    if (document.hidden) {
      log("app-attempt-blocked", { trigger, reason: "page-hidden" });
      return;
    }
    cancelFallback("new-attempt");
    attempt += 1;
    leftPage = false;
    storeRequested = false;
    fallbackPending = true;
    quietSince = lastTickAt = performance.now();
    const expectedAttempt = attempt;
    // Arm BEFORE assigning the scheme so synchronous departure can cancel it.
    fallbackTimer = setTimeout(() => checkFallback(expectedAttempt), CHECK_INTERVAL_MS);
    log("fallback-scheduled", { waitMs: FALLBACK_WAIT_MS });
    log("app-navigation-requested", { trigger, destination: APP_URL });
    try {
      window.location.href = APP_URL;
    } catch (error) {
      log("app-navigation-error", { message: String(error) });
    }
    // No second, untracked timeout is scheduled after the scheme assignment.
  }

  function markLeft(event) {
    leftPage = true; // Departure heuristic only; not proof the app opened.
    cancelFallback(event.type);
    log(event.type);
  }

  window.addEventListener("blur", markLeft, true);
  window.addEventListener("pagehide", markLeft, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      leftPage = true;
      cancelFallback("visibility-hidden");
    }
    log("visibilitychange");
  }, true);
  window.addEventListener("focus", () => log("focus"), true);
  window.addEventListener("pageshow", event => {
    if (event.persisted) cancelFallback("bfcache-return");
    storeRequested = false;
    log("pageshow", { persisted: event.persisted });
    // Returning from the app or BFCache never restarts an attempt or opens Store.
  });

  function openStore(trigger, expectedAttempt = attempt) {
    if (trigger === "automatic-fallback" &&
        (expectedAttempt !== attempt || !fallbackPending || leftPage || !document.hasFocus())) {
      log("store-navigation-blocked", { trigger, reason: "inactive-attempt" });
      return;
    }
    if (document.hidden || storeRequested) {
      log("store-navigation-blocked", { reason: document.hidden ? "page-hidden" : "already-requested" });
      return;
    }
    cancelFallback("store-navigation");
    storeRequested = true;
    log("store-navigation-requested", { trigger, destination: STORE_URL });
    try {
      window.location.href = STORE_URL;
    } catch (error) {
      storeRequested = false;
      log("store-navigation-error", { message: String(error) });
    }
  }
  openButton.addEventListener("click", () => openApp("page-button"));
  icon.addEventListener("click", () => openStore("app-icon"));
  // Accessibility support does not alter the original layout or appearance.
  function activateWithKeyboard(element, action) {
    element.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    });
  }
  activateWithKeyboard(openButton, () => openApp("page-button"));
  activateWithKeyboard(icon, () => openStore("app-icon"));

  function downloadLog() {
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
  }
  window.iosUriTest = Object.freeze({
    getLog: () => JSON.parse(JSON.stringify({ userAgent: navigator.userAgent, entries })),
    downloadLog,
    clearLog: () => {
      entries = [];
      log("log-cleared");
    }
  });

  const autostart = new URLSearchParams(window.location.search).get("autostart") !== "0";
  log("initialized", { userAgent: navigator.userAgent, historyLength: window.history.length, autostart });
  window.addEventListener("load", () => {
    if (loaded) return;
    loaded = true;
    log("load");
    if (autostart) openApp("page-load");
  }, { once: true });
})();
