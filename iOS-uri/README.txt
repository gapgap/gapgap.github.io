OneLink URI fallback test — automatic fallback revision

Source: https://gabtraining.onelink.me/xfPm/ozmfsuhr
Captured: 2026-10-02, HTTP 200 for both synthetic Safari profiles.
Original SHA-256: de04252efab2d48b0f7e1762cab84d63ae2bec9ef5dff09cb81e93466bde0f15
App: OneLink Simulator, afbasicapp://mainactivity?test=1&...
Store: https://apps.apple.com/US/app/id1550796743?mt=8

Files and UI
index.html: original page markup/CSS with replacement bridge.js; same icon,
app name, card and localized Go to the app button. No additional visible controls.
bridge.js: attempts the app automatically on load and on each page-button click;
automatic Store fallback is restored. The icon still opens Store manually.
original.html: exact captured source, including the original 900/800 ms paths.
original.headers.txt: original HTTP response headers.

Fallback changes
Every app attempt has one tracked timeout chain instead of separate initialization
and button fallback paths. The current attempt is checked every 100 ms.
Default FALLBACK_WAIT_MS is 1500; CHECK_INTERVAL_MS is 100 and MAX_TICK_GAP_MS is 500.
After 1500 ms of continuously observed visible/focused activity without departure,
the page initiates the HTTPS Store navigation once. This is a fallback heuristic,
not proof of an uninstalled app or a scheme-launch failure.

The tracked timer is armed before the scheme assignment, so departure that happens
synchronously during that assignment can cancel it. Each retry cancels the previous
attempt; attempt IDs also reject obsolete callbacks. Blur, pagehide, hidden
visibilitychange, loss of focus observed by the watchdog, and BFCache return cancel
fallback. Focus/return does not restart a cancelled fallback. Explicit icon navigation
also cancels fallback, preventing a later duplicate Store redirect. There is no
history.go(-1), separate untracked button timer or unconditional focus redirect.

A timer gap greater than 500 ms (a delayed callback) starts a fresh 1500 ms grace
period, allowing departure events to arrive before a resumed timer navigates to Store.
A gap can come from a blocked main thread, throttling or other causes; the code does
not assume native dialogs pause timers and does not label a gap as confirmed dialog
activity. FALLBACK_WAIT_MS and MAX_TICK_GAP_MS are tunable test constants, not
real-device-calibrated guarantees.

Limits of automatic fallback
Browser JavaScript does not have a reliable native scheme-launch result or native
confirmation accept/cancel callback. If a dialog lets timers run while keeping the
page visible/focused and emits no departure event, the page cannot distinguish that
from app launch failure, and premature fallback remains possible. Conversely, if
an unsuccessful attempt emits blur, automatic fallback is deliberately cancelled
for safety; the user can retry the app button or use the existing icon to open Store.
This tradeoff cannot be eliminated by adding more timers. An app-open request is
never logged as confirmed app-open success. Real-device testing is required.

Expected URLs after deploying the user's existing GitHub Pages site
https://gapgap.github.io/iOS-uri/                 modified, automatic scheme attempt
https://gapgap.github.io/iOS-uri/?autostart=0     modified, button-only scheme attempt
https://gapgap.github.io/iOS-uri/original.html    unchanged source for comparison
Files are local changes; writing them does not publish or deploy the site.

Real-device test
1. With the simulator app installed, compare link tap and address-bar paste.
   Accept native Open immediately, after 2 s and after 5 s; record the screen.
2. Cancel the first prompt, then press Go to the app again and accept the second.
   Check that only the current attempt remains eligible for fallback.
3. Return from the app and wait. A cancelled fallback must not restart.
4. Uninstall the simulator and repeat. If the page remains visible/focused with no
   departure signal, automatic Store fallback should occur. If blur cancels it,
   retain the log rather than treating cancellation as a confirmed app launch.
5. Repeat with ?autostart=0 and in the browser sheet opened through Slack.
6. Tap the icon to verify manual Store navigation. Compare original.html with the
   same conditions. Capture logs around the actual Store navigation and departure.

Console diagnostics (also persisted in this tab's sessionStorage)
window.iosUriTest.getLog()
window.iosUriTest.downloadLog()
window.iosUriTest.clearLog()
Look for fallback-scheduled/cancelled/deferred and store-navigation-requested,
including trigger (automatic-fallback or app-icon), attempt ID, hidden, focus and
elapsed time. If the app opens and Store follows without this page logging a Store
navigation request, inspect app-side outgoing URLs and other navigation sources.

Testing performed
Mocked JavaScript events verify automatic fallback, one active timer, cancellation,
return behavior, delayed-callback grace, retry/stale callback guards, manual Store,
synchronous scheme departure/error, focus guards and keyboard/button-only mode.
These are not real iOS/WebKit or native confirmation tests.

This page targets the simulator, not United Arrows. GitHub Pages differs from the
OneLink origin: it does not reproduce domain association, attribution requests,
native smart-app banners, cookies or Universal Link routing. It isolates scheme
and fallback logic using the captured destinations. No hosted OneLink was modified.
