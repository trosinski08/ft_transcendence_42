import { sendLog_frontend } from '../elk_logs';
import { getCurrentUser } from '../state/gameState';
import { applyTranslations } from '../i18n/translations';
import type { Lang } from '../i18n/translations';

let getLang: (() => Lang) | null = null;

export function showRoute(path: string) {
  sendLog_frontend('INFO', `Displaying route: ${path}`, { eventType: 'route_display', path});
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

  // Stop the game loop if navigating away from the game page
  const currentPath = window.location.pathname;
  if (currentPath === '/game' && path !== '/game') {
    console.log('[nav] Navigating away from /game. Attempting to stop game.');
    try {
      if ((window as any).game && (window as any).game.stop) {
        (window as any).game.stop();
        console.log('[nav] Game stop function called successfully.');
      } else {
        console.warn('[nav] Game stop function not found on window.game.');
      }
    } catch (e) {
      console.error('[nav] Error stopping game:', e);
    }
  }

  // Guarded routes: require login
  const requiresRegistration = path === '/tournament' || path === '/stats';
  const hasAlias = typeof window !== 'undefined'
  ? (() => {
    try {
      return !!localStorage.getItem('tournamentAlias');
        } catch {
          return false;
    }
  }) ()
  : false;

  if (requiresRegistration && !getCurrentUser() && !hasAlias) {
    // redirect to register without changing history here; return normalized path
    console.log('[nav] User not logged in, redirecting to /register')
    history.replaceState({}, '', '/register');
    path = '/register';
  }

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
      // When entering the game view, sync UI with match context and ensure a clean start
      try {
        const forced = localStorage.getItem('forceGameMode');
        if (forced === 'local-ai') {
          (window as any).updateGameUIForMatchContext && (window as any).updateGameUIForMatchContext();
          (window as any).resetMatch && (window as any).resetMatch();
          (window as any).game && (window as any).game.ensureLoop && (window as any).game.ensureLoop();
        }
      } catch (e) {
        console.warn('[nav] Failed to prepare game view:', e);
      }
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
      const href = (a.getAttribute('href') || '/');
      if (href === '/game' || href ==='/play') {
        try { localStorage.setItem('forceGameMode', 'local-ai'); } catch {}
      }
      navigateTo(href);
    }
    const btn = (target.closest && target.closest('[data-href]')) as HTMLButtonElement | null;
    if (btn) {
      e.preventDefault();
      try { console.log('[nav] button click', btn.getAttribute('data-href')); } catch {}
      const bhref = btn.getAttribute('data-href') || '/';
      if (bhref ==='/game' || bhref === '/play') {
          try {localStorage.setItem('forceGameMode', 'local-ai'); } catch {}
      }
      navigateTo
    }
  });
}

