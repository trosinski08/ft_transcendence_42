import { sendLog_frontend } from '../elk_logs';
import { applyTranslations } from '../i18n/translations';
import type { Lang } from '../i18n/translations';

let getLang: (() => Lang) | null = null;

export function showRoute(path: string) {
  try { console.log('[nav] showRoute ->', path); } catch {}
  const pages = {
    home: document.getElementById('home-page') as HTMLElement | null,
    register: document.getElementById('register-page') as HTMLElement | null,
    tournament: document.getElementById('tournament-page') as HTMLElement | null,
    game: document.getElementById('game-page') as HTMLElement | null,
    settings: document.getElementById('settings-page') as HTMLElement | null,
    stats: document.getElementById('stats-page') as HTMLElement | null,
    multi: document.getElementById('multi-page') as HTMLElement | null,
  };

  [pages.home, pages.register, pages.tournament, pages.game, pages.settings, pages.stats, pages.multi].forEach((p) => {
    if (p) { p.classList.remove('visible'); }
  });

  switch (path) {
    case '/':
      if (pages.home) pages.home.classList.add('visible');
      break;
    case '/settings':
      if (pages.settings) pages.settings.classList.add('visible');
      break;
    case '/stats':
      if (pages.stats) { pages.stats.classList.add('visible'); try { (window as any).renderStatsPage && (window as any).renderStatsPage(); } catch {} }
      break;
    case '/register':
      if (pages.register) pages.register.classList.add('visible');
      break;
    case '/tournament':
      if (pages.tournament) pages.tournament.classList.add('visible');
      break;
    case '/game':
      if (pages.game) pages.game.classList.add('visible');
      break;
    case '/multiplayer':
      if (pages.multi) { pages.multi.classList.add('visible'); try { (window as any).startFourPlayerIfReady && (window as any).startFourPlayerIfReady(); } catch {} }
      break;
    default:
      if (pages.home) pages.home.classList.add('visible');
      path = '/';
  }
  try { document.body && document.body.setAttribute('data-route', path); } catch {}
  try {
    if (getLang) applyTranslations(document, getLang());
  } catch {}
  return path;
}

export function navigateTo(path: string, replace = false) {

  sendLog_frontend('navigateTo',"Navigating to " + path, { path });
  
  const normalized = showRoute(path);
  if (normalized === window.location.pathname) {
    if (replace) history.replaceState({}, '', normalized);
    return;
  }
  if (replace) history.replaceState({}, '', normalized); else history.pushState({}, '', normalized);
  try { console.log('[nav] navigateTo ->', normalized); } catch {}
}

export function initRouter(langGetter: () => Lang) {
  getLang = langGetter;
  window.addEventListener('popstate', () => {
    showRoute(window.location.pathname);
  });

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const a = (target.closest && target.closest('[data-link]')) as HTMLAnchorElement | null;
    if (a) {
      e.preventDefault();
      try { console.log('[nav] anchor click', a.getAttribute('href')); } catch {}
      navigateTo(a.getAttribute('href') || '/');
      return;
    }
    const btn = (target.closest && target.closest('[data-href]')) as HTMLButtonElement | null;
    if (btn) {
      e.preventDefault();
      try { console.log('[nav] button click', btn.getAttribute('data-href')); } catch {}
      navigateTo(btn.getAttribute('data-href') || '/');
    }
  });
}

