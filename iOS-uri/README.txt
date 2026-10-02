OneLink URI fallback test

Source: https://gabtraining.onelink.me/xfPm/ozmfsuhr
Captured: 2026-10-02, HTTP 200 for both synthetic Safari profiles.
SHA-256: de04252efab2d48b0f7e1762cab84d63ae2bec9ef5dff09cb81e93466bde0f15
App: OneLink Simulator, afbasicapp://mainactivity?test=1&...
Store: https://apps.apple.com/US/app/id1550796743?mt=8

Files
index.html: fixed test page. Automatically attempts the scheme once on load.
bridge.js: fixed behavior and persistent diagnostic event log.
original.html: exact captured response, including original 900/800 ms fallback logic.
original.headers.txt: original HTTP response headers.

Why this fix changes the fallback behavior
The original 900 ms timer guesses app failure using browser departure/visibility events.
The page-button 800 ms timer is untracked, is not cancelled, and does not check departure
or prior Store navigation. It can initiate Store navigation at an inappropriate time.
Native scheme confirmation has no reliable JS accept/cancel callback or installed-app
check. Increasing a timeout or adding blur handling cannot guarantee safe automatic
Store fallback. The fixed page therefore navigates to Store only through an explicit
Store-button click. It never infers 'not installed' from elapsed time.
There are no 800/900 ms timers, no focus-triggered redirect, and no history.go(-1).
An app-open request is not logged as confirmed app-open success.

Test paths after this directory is deployed on the user's existing GitHub Pages site
https://gapgap.github.io/iOS-uri/                 fixed, automatic scheme attempt
https://gapgap.github.io/iOS-uri/?autostart=0     fixed, button-only attempt
https://gapgap.github.io/iOS-uri/original.html    unchanged source for comparison
These are expected URLs after deployment; creation of local files does not publish them.

Test on a real iPhone with the OneLink Simulator installed
1. Open fixed page by both link tap and address-bar paste.
2. Cancel the first app-open dialog. Wait at least 5 seconds. Store must not open.
3. Press the page's Open app / Retry button, wait 5 seconds, then accept native Open.
   The app should open; this page must not initiate a Store navigation afterward.
4. Return to the browser and wait. No attempt or Store redirect should restart.
5. Repeat in ?autostart=0 mode and in the browser sheet opened through Slack.
6. Explicitly press Open App Store to check the manual fallback, including with the
   app uninstalled. Download the event log after returning and retain screen recording.
7. Compare original.html with the same conditions; it retains the original behavior.

The fixed page targets the simulator app, not United Arrows. GitHub Pages is a different
origin from OneLink and this page does not reproduce domain association, attribution
requests, native smart-app banners, cookies, or Universal Link routing. It isolates the
scheme/fallback behavior using the same captured destinations and query parameters.
Tests of mocked JS events verify that this page does not queue a Store navigation;
they do not reproduce iOS/WebKit native confirmation or prove the video root cause.
If this fixed page opens the app and Store still follows WITHOUT a store-button event,
the Store open was not initiated by this page's fallback; inspect app-side outgoing URLs
and other navigation sources. No original hosted OneLink page was modified.
