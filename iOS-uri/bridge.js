
        // 40ab8f0570368e1a4825b3005efe6927
        // f7128e6ef12e22fedaa65a8c9cea537a
// LANGUAGES
var lang = navigator.language;
var lang_device = {
    'en-US': 'Go to the app',
    'zh-CN': '前往应用',
    'zh-TW': '前往應用',
    'ja': 'アプリに移動',
    'ja-JP': 'アプリに移動'
};
var lang_store = {'en-US': 'Open in App Store?', 'ko-KR': '앱스토어에서 열기', 'ja-JP': 'アプリストアを開きますか?'};
var store_lang = lang;
var text_on_btn = null;

//  LANDING_PAGE
init = function () {
    var store_link = 'itms-apps://apps.apple.com/US/app/id1550796743?ls=1&mt=8';
    var web_store_link = 'https://apps.apple.com/US/app/id1550796743?mt=8';
    var app_link = 'afbasicapp://mainactivity?test=1&af_deeplink=true&af_dp=afbasicapp%3A%2F%2Fmainactivity%3Ftest%3D1&af_force_deeplink=true&af_xp=custom&campaign=aaaa&media_source=testa&onelink_id=xfPm&shortlink=ozmfsuhr&source_caller=ui';
    var app_icon = 'https://cdnappicons.appsflyer.com/id1550796743.ver-1.41.png';

    var parts = app_link.split('?', 2);
    var scheme = parts[0];
    var data = parts[1];
    var new_link = '';

    var reg = /(:\/\/)$/; //scheme ends with '://'
    var reg2 = /(:\/\/)/; //scheme contains '://'

    var openButton = document.getElementById('open');
    var mainContainer = document.getElementById('container');
    var logoElement = document.getElementById('logo');


    var didLeavePage = false;   // app/store opened
    var sentToStore = false;    // prevent loops
    var fallbackTimer = null;

    function showContainer() {
        if (!mainContainer) return;
        try {
            mainContainer.style.display = 'block';
            mainContainer.style.visibility = 'visible';
            mainContainer.style.opacity = '1';
        } catch (e) {
        }
    }

    showContainer();
    setTimeout(showContainer, 600);

    document.addEventListener('visibilitychange', function () {
        if (document.hidden && window.history.length > 1) {
            window.history.go(-1);
        }
    });

    if (!lang_device.hasOwnProperty(lang)) lang = 'en-US';
    if (!lang_store.hasOwnProperty(store_lang)) store_lang = 'en-US';

    text_on_btn = lang_device[lang];
    if (openButton) openButton.innerText = text_on_btn;

    if (logoElement) {
        var encodedIcon = encodeURI(app_icon || '');
        if (encodedIcon.indexOf('http') > -1) {
            var imgElement = document.createElement('img');
            imgElement.setAttribute('src', encodedIcon);
            imgElement.addEventListener('click', function () {
                redirect_to_web_store();
            });
            logoElement.appendChild(imgElement);
        } else {
            var placeholderElement = document.createElement('div');
            placeholderElement.setAttribute('class', 'placeholder');
            for (var i = 0; i < 3; i++) {
                var placeholderDot = document.createElement('div');
                placeholderDot.setAttribute('class', 'placeholder-dot');
                placeholderElement.appendChild(placeholderDot);
            }
            logoElement.appendChild(placeholderElement);
        }
    }

    function is_custom_redirection() {
        return (store_link && store_link.indexOf('http') === 0 && store_link.indexOf('https://apps.apple.com') !== 0);
    }

    function cancelFallback() {
        if (fallbackTimer) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }
    }

    function markLeft() {
        didLeavePage = true;
        cancelFallback();
    }

    window.addEventListener('pagehide', markLeft, true);
    window.addEventListener('blur', markLeft, true);
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) markLeft();
    }, true);

    function redirect_to_store() {
        sentToStore = true;
        if (document.hidden) return;

        if (is_custom_redirection()) {
            window.location.replace(store_link);
        } else {
            window.location.href = web_store_link || store_link;
        }
    }

    function redirect_to_web_store() {
        sentToStore = true;
        if (!document.hidden) window.location.href = web_store_link;
    }


    function valid_scheme() {
        if (reg.test(scheme)) {
            var new_scheme = scheme + 'af';
            new_link = new_scheme + '?' + data;
        } else if (reg2.test(scheme)) {
            new_link = scheme + '?' + data;
        } else {
            return false;
        }
        return true;
    }

    function redirect_to_app() {
        if (!new_link) return;
        window.location.href = new_link;
    }

    function redirect_to_app_and_store() {
        // A retry replaces the previous fallback and starts a fresh attempt.
        cancelFallback();
        didLeavePage = false;
        sentToStore = false;

        // Track the timer BEFORE scheme navigation so departure can cancel it.
        fallbackTimer = setTimeout(function () {
            if (!didLeavePage && !document.hidden && !sentToStore) {
                redirect_to_store();
            }
        }, 800);
        redirect_to_app();
    }

    try {
        if (valid_scheme()) {
            setTimeout(function () {
                redirect_to_app();
            }, 0);

            cancelFallback();
            fallbackTimer = setTimeout(function () {
                if (!didLeavePage && !document.hidden && !sentToStore) {
                    redirect_to_store();
                }
            }, 900);
        } else {
            redirect_to_store();
        }
    } catch (e) {
        redirect_to_store();
    }

    if (openButton) openButton.addEventListener('click', redirect_to_app_and_store);
};

    