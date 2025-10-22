"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showRoute = showRoute;
exports.navigateTo = navigateTo;
exports.initRouter = initRouter;
const translations_1 = require("../i18n/translations");
let getLang = null;
function showRoute(path) {
    try {
        console.log('[nav] showRoute ->', path);
    }
    catch { }
    const pages = {
        home: document.getElementById('home-page'),
        register: document.getElementById('register-page'),
        tournament: document.getElementById('tournament-page'),
        game: document.getElementById('game-page'),
        settings: document.getElementById('settings-page'),
        stats: document.getElementById('stats-page'),
        multi: document.getElementById('multi-page'),
    };
    [pages.home, pages.register, pages.tournament, pages.game, pages.settings, pages.stats, pages.multi].forEach((p) => {
        if (p) {
            p.classList.remove('visible');
        }
    });
    switch (path) {
        case '/':
            if (pages.home)
                pages.home.classList.add('visible');
            break;
        case '/settings':
            if (pages.settings)
                pages.settings.classList.add('visible');
            break;
        case '/stats':
            if (pages.stats) {
                pages.stats.classList.add('visible');
                try {
                    window.renderStatsPage && window.renderStatsPage();
                }
                catch { }
            }
            break;
        case '/register':
            if (pages.register)
                pages.register.classList.add('visible');
            break;
        case '/tournament':
            if (pages.tournament)
                pages.tournament.classList.add('visible');
            break;
        case '/game':
            if (pages.game)
                pages.game.classList.add('visible');
            break;
        case '/multiplayer':
            if (pages.multi) {
                pages.multi.classList.add('visible');
                try {
                    window.startFourPlayerIfReady && window.startFourPlayerIfReady();
                }
                catch { }
            }
            break;
        default:
            if (pages.home)
                pages.home.classList.add('visible');
            path = '/';
    }
    try {
        document.body && document.body.setAttribute('data-route', path);
    }
    catch { }
    try {
        if (getLang)
            (0, translations_1.applyTranslations)(document, getLang());
    }
    catch { }
    return path;
}
function navigateTo(path, replace = false) {
    const normalized = showRoute(path);
    if (normalized === window.location.pathname) {
        if (replace)
            history.replaceState({}, '', normalized);
        return;
    }
    if (replace)
        history.replaceState({}, '', normalized);
    else
        history.pushState({}, '', normalized);
    try {
        console.log('[nav] navigateTo ->', normalized);
    }
    catch { }
}
function initRouter(langGetter) {
    getLang = langGetter;
    window.addEventListener('popstate', () => {
        showRoute(window.location.pathname);
    });
    document.addEventListener('click', (e) => {
        const target = e.target;
        const a = (target.closest && target.closest('[data-link]'));
        if (a) {
            e.preventDefault();
            try {
                console.log('[nav] anchor click', a.getAttribute('href'));
            }
            catch { }
            navigateTo(a.getAttribute('href') || '/');
            return;
        }
        const btn = (target.closest && target.closest('[data-href]'));
        if (btn) {
            e.preventDefault();
            try {
                console.log('[nav] button click', btn.getAttribute('data-href'));
            }
            catch { }
            navigateTo(btn.getAttribute('data-href') || '/');
        }
    });
}
//# sourceMappingURL=router.js.map