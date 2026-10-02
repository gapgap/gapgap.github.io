OneLink URI fallback test — second-attempt-only patch

Source: https://gabtraining.onelink.me/xfPm/ozmfsuhr
Captured: 2026-10-02, HTTP 200 for both synthetic Safari profiles.
Original SHA-256: de04252efab2d48b0f7e1762cab84d63ae2bec9ef5dff09cb81e93466bde0f15

index.html uses the original UI and body onload initialization. Its inline script
is extracted into bridge.js. original.html is the unmodified captured response.
The app URI, Store URL, language handling, icon behavior, scheme validation,
history behavior and 900 ms startup fallback are retained from the original.

Only JavaScript change: redirect_to_app_and_store()
1. Cancel any existing fallback before a button retry.
2. Reset didLeavePage and sentToStore for that new attempt.
3. Store the retry's 800 ms timeout in fallbackTimer BEFORE URI navigation,
   allowing existing blur/pagehide/hidden handlers to cancel it even if departure
   occurs synchronously during the scheme assignment.
4. In the retry callback, require !didLeavePage, !document.hidden and !sentToStore
   before redirecting to Store.

Automatic Store fallback remains: startup at 900 ms; button attempts at 800 ms.
There is no 1500 ms replacement delay, watchdog, polling, timer-gap detection,
focus-based scheduling, extra UI, logging API or autostart query option.
The prior broader changes have been removed to keep this test narrowly scoped.

Test after publishing these local changes on the user's existing GitHub Pages site
https://gapgap.github.io/iOS-uri/                 second-attempt patch
https://gapgap.github.io/iOS-uri/original.html    exact original for comparison
1. Cancel the first app-open confirmation.
2. Press Go to the app, then accept Open on the second confirmation.
3. Verify the app opens without a subsequent Store redirect when departure events
   cancel the retry timer. Also return to the browser before/after 800 ms and verify
   that a cancelled timer does not restart.
4. With the app unavailable, verify the retry still falls back to Store after
   approximately 800 ms if no departure event cancels it.
5. Repeat with immediate/delayed confirmation, link tap/address-bar paste, and
   the browser sheet opened through Slack. Compare original.html.

Verification performed
Simulated events reproduce the uncancelled retry Store redirect in the original
source and prevent it with the patch. Tests also preserve 900 ms startup fallback,
800 ms failed-retry fallback, replacement of old/repeated timers and cancellation
when departure occurs synchronously during URI assignment.

These tests are not native iOS confirmation tests. The patch fixes the identified
untracked retry timer; it does not establish the recording's complete root cause.
If Safari gives no departure signal before the timer fires, or Store navigation
already started, this small patch cannot guarantee prevention. It also retains the
original blur heuristic, which is not proof that the app opened successfully.
The second automatic native dialog's origin, if no page button was pressed, remains
unverified; this patch targets the source's explicit button retry path.

This test targets OneLink Simulator using afbasicapp://, not United Arrows.
The cloned page is hosted on a different origin and does not reproduce OneLink
attribution, native smart-app banners or Universal Link domain association.
No hosted OneLink was modified; files are local and have not been pushed/deployed.
