import './styles.css';
import { fetchPlayers } from './apiClient';
import { applyTranslations, DEFAULT_LANG, isLang, t, type Lang } from './i18n/translations';
import { ARENA, PADDLE as PDL, BALL as BL, RULES } from './game/constants';
import { DIFFICULTY_PRESETS } from './ai/difficultyPresets';
import type { AIDifficulty } from './ai/aiTypes';
import { nextAIPaddleY } from './ai/simpleAI';
import { sendLog_frontend } from './elk_logs';


// Utility functions
function sanitize(str: string): string {
  // Collapse multiple whitespace to single space, trim
  return str.replace(/\s+/g, ' ').trim();
}

// Debug marker to confirm JS is executing in production
try { console.log('[pong] script loaded'); document.body && document.body.setAttribute('data-js', 'ready'); } catch {}

// --- i18n setup ---
const LANG_STORAGE_KEY = 'ft_lang_v1';
function detectInitialLang(): Lang {
  try {
    const saved = (localStorage.getItem(LANG_STORAGE_KEY) || '').toLowerCase();
    if (isLang(saved)) return saved as Lang;
    const nav = (navigator.language || (navigator as any).userLanguage || 'en').toLowerCase();
    if (nav.startsWith('pl')) return 'pl';
    if (nav.startsWith('de')) return 'de';
  } catch {}
  return 'en';
}
let currentLang: Lang = detectInitialLang() || DEFAULT_LANG;
function setLanguage(lang: Lang) {
  currentLang = lang;
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (err) {
    sendLog_frontend('error', 'Failed to save language setting', {
      error: err,
      lang
    });
  }
  try { document.documentElement.lang = lang; } catch (err) {
    sendLog_frontend('error', 'Failed to set document language', {
      error: err,
      lang
    });
  }
  applyTranslations(document, lang);
  const sel = document.getElementById('lang-select') as HTMLSelectElement | null;
  if (sel && sel.value !== lang) sel.value = lang;
}
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('lang-select') as HTMLSelectElement | null;
  if (sel) {
    sel.value = currentLang;
    sel.addEventListener('change', () => {
      const v = sel.value;
      if (isLang(v)) setLanguage(v);
    });
  }
  setLanguage(currentLang);
});

const canvas = document.getElementById('game') as HTMLCanvasElement | null;
const ctx = canvas?.getContext('2d') || null;

const W = canvas?.width || 860;
const H = canvas?.height || 420;

  // Gameplay constants (uniform rules)
  let PADDLE_SPEED = PDL.SPEED;
  let BALL_INIT_SPEED_X = BL.INIT_SPEED_X;
  let BALL_INIT_SPEED_Y_RANGE = BL.INIT_SPEED_Y_RANGE;
  const BALL_RADIUS = BL.RADIUS;
  let BALL_SPEED_INC_FACTOR = BL.SPEED_INC_FACTOR;
  let BALL_MAX_SPEED = BL.MAX_SPEED;

  // Scoring and match state
  let score1 = 0;
  let score2 = 0;
  let WIN_SCORE = RULES.WIN_SCORE;
  let winner: string | null = null;
  let firstStartShown = true; // controls initial "press space" prompt

  let running = false;
  let p1Y = H / 2 - PDL.HEIGHT / 2;
  let p2Y = H / 2 - PDL.HEIGHT / 2;
  // Base paddle dimensions and per-side derived heights
  let basePaddleH = PDL.HEIGHT;
  let paddleW = PDL.WIDTH;
  let p1H = basePaddleH;
  let p2H = basePaddleH;
  let p1Mul = 1.0, p2Mul = 1.0;
  let p1MulUntil = 0, p2MulUntil = 0;
  function recomputePaddleSizes() {
    p1H = clamp(Math.round(basePaddleH * p1Mul), 30, 200);
    p2H = clamp(Math.round(basePaddleH * p2Mul), 30, 200);
    // Keep paddles in bounds after size change
    p1Y = Math.max(ARENA.PADDING_TOP, Math.min(H - p1H - ARENA.PADDING_BOTTOM, p1Y));
    p2Y = Math.max(ARENA.PADDING_TOP, Math.min(H - p2H - ARENA.PADDING_BOTTOM, p2Y));
  }
  let ball = { x: W / 2, y: H / 2, vx: BALL_INIT_SPEED_X, vy: 2, r: BALL_RADIUS };

  // Schedule state must be defined before any function references it
  let schedule: Array<{ p1: string; p2: string; status: 'pending' | 'playing' | 'done'; winner?: string }> = [];
  let currentMatchIndex: number | null = null;

  // --- Stats state & types ---
  type PlayerStats = { wins: number; losses: number; streak: number; rating: number };
  type MatchEntry = { p1: string; p2: string; winner: string; ts: number; score: [number, number] };
  const STATS_PLAYERS_KEY = 'ft_stats_players_v1';
  const STATS_MATCHES_KEY = 'ft_stats_matches_v1';
  const playerStats: Record<string, PlayerStats> = {};
  const matchHistory: MatchEntry[] = [];

  function loadStats() {
    try {
      const ps = localStorage.getItem(STATS_PLAYERS_KEY);
      const mh = localStorage.getItem(STATS_MATCHES_KEY);
      if (ps) Object.assign(playerStats, JSON.parse(ps));
      if (mh) matchHistory.push(...JSON.parse(mh));
    } catch (err) {
      sendLog_frontend('error', 'Failed to load stats', {
        error: err
      });
    }
  }
  function saveStats() {
    try {
      localStorage.setItem(STATS_PLAYERS_KEY, JSON.stringify(playerStats));
      localStorage.setItem(STATS_MATCHES_KEY, JSON.stringify(matchHistory));
    } catch (err) {
      sendLog_frontend('error', 'Failed to save stats', {
        error: err
      });
    }
  }
  function resetStats() {
    for (const k of Object.keys(playerStats)) delete playerStats[k];
    matchHistory.length = 0;
    try {
      localStorage.removeItem(STATS_PLAYERS_KEY);
      localStorage.removeItem(STATS_MATCHES_KEY);
    } catch (err) {
      sendLog_frontend('error', 'Failed to reset stats', {
        error: err
      });
      }
  }
  function ensurePlayer(name: string) {
    if (!playerStats[name]) playerStats[name] = { wins: 0, losses: 0, streak: 0, rating: 1000 };
  }
  function recordMatch(p1: string, p2: string, winnerName: string, s1: number, s2: number) {
    ensurePlayer(p1); ensurePlayer(p2);
    const loser = winnerName === p1 ? p2 : p1;
    const wp = playerStats[winnerName];
    const lp = playerStats[loser];
    wp.wins += 1; wp.streak = Math.max(1, wp.streak + 1);
    lp.losses += 1; lp.streak = Math.min(-1, lp.streak - 1);
    // simple Elo-like update
    const K = 24;
    const Ra = wp.rating, Rb = lp.rating;
    const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
    const Eb = 1 - Ea;
    wp.rating = Math.round(Ra + K * (1 - Ea));
    lp.rating = Math.round(Rb + K * (0 - Eb));
    matchHistory.push({ p1, p2, winner: winnerName, ts: Date.now(), score: [s1, s2] });
    saveStats();
  }

  // --- Minimal AI state (feature-flagged) ---
  let aiEnabled = false;
  let aiDifficulty: AIDifficulty = 'NORMAL';
  try {
    const params = new URLSearchParams(window.location.search);
    const aiParam = params.get('ai');
    if (aiParam && /^(1|true|on|yes)$/i.test(aiParam)) aiEnabled = true;
    const diff = params.get('aiDifficulty');
    if (diff && (diff.toUpperCase() in DIFFICULTY_PRESETS)) {
      aiDifficulty = diff.toUpperCase() as AIDifficulty;
    }
  } catch (err) {
    sendLog_frontend('error', 'Failed to parse AI settings from URL', {
      error: err
    });
  }

  // Hydrate persisted AI settings (UI will sync below)
  const AI_STORAGE_KEY = 'ft_transcendence_ai_settings_v1';
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.enabled === 'boolean') aiEnabled = parsed.enabled;
      if (typeof parsed.difficulty === 'string' && parsed.difficulty.toUpperCase() in DIFFICULTY_PRESETS) {
        aiDifficulty = parsed.difficulty.toUpperCase() as AIDifficulty;
      }
    }
  } catch (err) {
    sendLog_frontend('error', 'Failed to load AI settings', {
      error: err
    });
  }

  function resetBall(direction: number = (Math.random() > 0.5 ? 1 : -1)) {
    const vy = (Math.random() - 0.5) * BALL_INIT_SPEED_Y_RANGE;
    ball = { x: W / 2, y: H / 2, vx: direction * BALL_INIT_SPEED_X, vy, r: BALL_RADIUS };
    running = false;
  }

  function resetMatch() {
    score1 = 0; score2 = 0; winner = null; updateScoreUI();
    resetBall();
    firstStartShown = true;
  }

  function updateScoreUI() {
    const s1 = document.getElementById('score1');
    const s2 = document.getElementById('score2');
    if (s1) s1.textContent = String(score1);
    if (s2) s2.textContent = String(score2);
    const next = document.getElementById('next-match');
  if (winner && next) next.textContent = `${winner}`;
  }

  function updatePlayButtonUI() {
    const btn = document.getElementById('play-toggle') as HTMLButtonElement | null;
    if (btn) {
      const label = running ? 'Pause' : 'Play';
      btn.textContent = label;
      btn.setAttribute('aria-pressed', running ? 'true' : 'false');
    }
  }

  function setRunning(val: boolean) {
    if (winner) return;
    running = val;
    if (running) firstStartShown = false;
    updatePlayButtonUI();
  }

  function toggleRunning() { setRunning(!running); }

  function clear() {
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  }

  function draw() {
    if (!ctx) return;
    clear();
    // Paddles
    ctx.fillStyle = '#0f0';
    ctx.fillRect(ARENA.LEFT_X, p1Y, paddleW, p1H);
    ctx.fillRect(W - ARENA.RIGHT_X_OFFSET - paddleW, p2Y, paddleW, p2H);
    // Ball
    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    // Power-ups on field
    if (pickup) {
      ctx.beginPath();
      const col = pickup.type === 'FAST' ? '#ffd166' : pickup.type === 'SLOW' ? '#118ab2' : pickup.type === 'BIG' ? '#06d6a0' : pickup.type === 'SMALL' ? '#ef476f' : '#a78bfa';
      ctx.fillStyle = col;
      ctx.arc(pickup.x, pickup.y, pickup.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Center line (cosmetic)
    ctx.strokeStyle = 'rgba(0,255,106,0.35)';
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);
    // Overlay messages
    if (winner) {
      ctx.fillStyle = '#00ff6a';
      ctx.font = '24px monospace';
      ctx.textAlign = 'center';
  ctx.fillText(t(currentLang, 'game.overlay.win', { name: winner || 'Player' }), W / 2, H / 2);
    } else if (!running && firstStartShown) {
      ctx.fillStyle = '#0f0';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
  ctx.fillText(t(currentLang, 'game.overlay.start'), W / 2, H / 2);
    }
    // transient power-up message
    if (puMsg && performance.now() < puMsg.until) {
      ctx.fillStyle = '#9fdc9f';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(puMsg.text, W/2, 28);
    }
  }

  function step() {
    if (running && !winner) {
      ball.x += ball.vx;
      ball.y += ball.vy;
      // Wall collision
      if (ball.y < ball.r || ball.y > H - ball.r) ball.vy *= -1;
      // Paddle collisions
      if (ball.x - ball.r < ARENA.LEFT_X + paddleW && ball.y > p1Y && ball.y < p1Y + p1H) {
        ball.vx = Math.min(Math.abs(ball.vx) * BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED);
        lastHit = 1;
      }
      if (ball.x + ball.r > W - ARENA.RIGHT_X_OFFSET - paddleW && ball.y > p2Y && ball.y < p2Y + p2H) {
        ball.vx = -Math.min(Math.abs(ball.vx) * BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED);
        lastHit = 2;
      }
      // Power-up spawn and pickup
      handlePowerUps();
      // Scoring
      if (ball.x < -ball.r) {
        score2 += 1; updateScoreUI();
        afterScoreUpdateObserver();
  if (score2 >= WIN_SCORE) { winner = (document.getElementById('p2-alias')?.textContent || t(currentLang, 'game.player2')); }
        resetBall(1);
      } else if (ball.x > W + ball.r) {
        score1 += 1; updateScoreUI();
        afterScoreUpdateObserver();
  if (score1 >= WIN_SCORE) { winner = (document.getElementById('p1-alias')?.textContent || t(currentLang, 'game.player1')); }
        resetBall(-1);
      }
    }
    draw();
    requestAnimationFrame(step);
  }


window.addEventListener('error', (event) => {
  sendLog_frontend('error', event.message || 'Uncaught error', {
    stack: event.error?.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error ? JSON.stringify(event.error) : undefined,
    eventType: 'window.error'
  });
});

window.addEventListener('unhandledrejection', (event) => {
  sendLog_frontend('error', 'Unhandled promise rejection', {
    reason: event.reason ? (typeof event.reason === 'string' ? event.reason : JSON.stringify(event.reason)) : undefined,
    eventType: 'window.unhandledrejection'
  });
});

  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space') {
      if (winner) return; // ignore after game end
      toggleRunning();
    }
    if (e.code === 'KeyA') {
      aiEnabled = !aiEnabled;
      syncAIControls();
      updateP2Alias();
      persistAI();
    }
    if (e.code === 'KeyR') {
      resetMatch();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  function handleInput() {


  if (keys.has('KeyW')) p1Y -= PADDLE_SPEED;
  if (keys.has('KeyS')) p1Y += PADDLE_SPEED;
    if (aiEnabled) {
      const cfg = DIFFICULTY_PRESETS[aiDifficulty];
      const nextY = nextAIPaddleY(
        { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, r: ball.r },
  { y: p2Y, height: p2H },
        { width: W, height: H },
        cfg,
        W - ARENA.RIGHT_X_OFFSET - paddleW
      );
      const delta = Math.max(-PADDLE_SPEED, Math.min(PADDLE_SPEED, nextY - p2Y));
      p2Y += delta;
    } else {
      if (keys.has('ArrowUp')) p2Y -= PADDLE_SPEED;
      if (keys.has('ArrowDown')) p2Y += PADDLE_SPEED;
    }
    p1Y = Math.max(ARENA.PADDING_TOP, Math.min(H - p1H - ARENA.PADDING_BOTTOM, p1Y));
    p2Y = Math.max(ARENA.PADDING_TOP, Math.min(H - p2H - ARENA.PADDING_BOTTOM, p2Y));
    setTimeout(handleInput, 12);
  }

  updateScoreUI();
  draw();
  handleInput();
  requestAnimationFrame(step);

  (window as any).game = { start: () => setRunning(true), stop: () => setRunning(false) };

  // --- AI UI controls + persistence ---
  const aiToggle = document.getElementById('ai-toggle') as HTMLInputElement | null;
  const aiSelect = document.getElementById('ai-difficulty') as HTMLSelectElement | null;

  function persistAI() {
    try {
      localStorage.setItem(AI_STORAGE_KEY, JSON.stringify({ enabled: aiEnabled, difficulty: aiDifficulty }));
    } catch (err) {
      sendLog_frontend('error', 'Failed to persist AI settings', {
        error: err
      });
    }
  }

  function syncAIControls() {
    if (aiToggle) aiToggle.checked = aiEnabled;
    if (aiSelect) aiSelect.value = aiDifficulty;
  }

  function updateP2Alias() {
    const p2a = document.getElementById('p2-alias');
    if (!p2a) return;
  if (aiEnabled) p2a.textContent = t(currentLang, 'game.ai');
    else if (currentMatchIndex != null && schedule[currentMatchIndex]) p2a.textContent = schedule[currentMatchIndex].p2;
  else p2a.textContent = t(currentLang, 'game.player2');
  }

  if (aiToggle) {
    aiToggle.addEventListener('change', () => {
      aiEnabled = aiToggle.checked;
      updateP2Alias();
      persistAI();
    });
  }
  if (aiSelect) {
    aiSelect.addEventListener('change', () => {
      aiDifficulty = (aiSelect.value || 'NORMAL') as AIDifficulty;
      persistAI();
    });
  }

  // Initial sync for UI + alias
  syncAIControls();
  updateP2Alias();

// --- Customization: rules & theme ---
type Settings = {
  winScore: number;
  paddleSpeed: number;
  paddleHeight: number;
  paddleWidth: number;
  ballInitX: number;
  ballInitYRange: number;
  ballInc: number;
  ballMax: number;
  puEnabled: boolean;
  puIntervalSec: number;
  theme: 'neon' | 'classic';
};
const SETTINGS_KEY = 'ft_transcendence_settings_v1';
function defaultSettings(): Settings {
  return {
    winScore: RULES.WIN_SCORE,
    paddleSpeed: PDL.SPEED,
    paddleHeight: PDL.HEIGHT,
    paddleWidth: PDL.WIDTH,
    ballInitX: BL.INIT_SPEED_X,
    ballInitYRange: BL.INIT_SPEED_Y_RANGE,
    ballInc: BL.SPEED_INC_FACTOR,
    ballMax: BL.MAX_SPEED,
    puEnabled: true,
    puIntervalSec: 12,
    theme: 'neon',
  };
}
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    const parsed = JSON.parse(raw);
    return { ...defaultSettings(), ...parsed } as Settings;
  } catch (err) {
    sendLog_frontend('error', 'Failed to load settings', {
      error: err
    });
    return defaultSettings();
  }
}
function saveSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (err) {
    sendLog_frontend('error', 'Failed to save settings', {
      error: err,
      settings: s
    });
  }
}
let settings = loadSettings();

function applySettingsToGame() {
  WIN_SCORE = clamp(settings.winScore, 3, 21) | 0;
  PADDLE_SPEED = clamp(settings.paddleSpeed, 3, 14);
  basePaddleH = clamp(settings.paddleHeight, 40, 160);
  paddleW = clamp(settings.paddleWidth, 6, 16);
  BALL_INIT_SPEED_X = clamp(settings.ballInitX, 2, 8);
  BALL_INIT_SPEED_Y_RANGE = clamp(settings.ballInitYRange, 2, 10);
  BALL_SPEED_INC_FACTOR = clamp(settings.ballInc, 1.0, 1.12);
  BALL_MAX_SPEED = clamp(settings.ballMax, 8, 20);
  // Power-ups runtime settings
  puEnabled = !!settings.puEnabled;
  puIntervalMs = clamp(settings.puIntervalSec, 5, 60) * 1000;
  // Ensure paddles remain on-screen after dimension change
  recomputePaddleSizes();
  // Theme application
  document.body?.setAttribute('data-theme', settings.theme);
}
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function syncSettingsUI() {
  const byId = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  const map: Array<[string, keyof Settings]> = [
    ['set-win-score', 'winScore'],
    ['set-paddle-speed', 'paddleSpeed'],
    ['set-paddle-height', 'paddleHeight'],
    ['set-paddle-width', 'paddleWidth'],
    ['set-ball-init-x', 'ballInitX'],
    ['set-ball-init-y', 'ballInitYRange'],
    ['set-ball-inc', 'ballInc'],
    ['set-ball-max', 'ballMax'],
    ['set-theme', 'theme'],
  ];
  for (const [id, key] of map) {
    const el = byId(id);
    if (!el) continue;
    if (el instanceof HTMLSelectElement && key === 'theme') {
      el.value = String(settings[key]);
    } else if (el instanceof HTMLInputElement) {
      el.value = String(settings[key] as any);
    }
  }
  // Special cases: checkbox and power-up interval
  const puChk = byId('set-pu-enabled') as HTMLInputElement | null;
  if (puChk) puChk.checked = !!settings.puEnabled;
  const puInt = byId('set-pu-interval') as HTMLInputElement | null;
  if (puInt) puInt.value = String(settings.puIntervalSec);
}
function bindSettingsUI() {
  const set = (key: keyof Settings, val: any) => {
    (settings as any)[key] = (key === 'theme') ? val : Number(val);
    saveSettings(settings);
    applySettingsToGame();
  };
  const add = (id: string, key: keyof Settings) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (!el) return;
    el.addEventListener('change', () => set(key, (el as any).value));
  };
  add('set-win-score', 'winScore');
  add('set-paddle-speed', 'paddleSpeed');
  add('set-paddle-height', 'paddleHeight');
  add('set-paddle-width', 'paddleWidth');
  add('set-ball-init-x', 'ballInitX');
  add('set-ball-init-y', 'ballInitYRange');
  add('set-ball-inc', 'ballInc');
  add('set-ball-max', 'ballMax');
  add('set-theme', 'theme');
  // power-ups
  const puChk = document.getElementById('set-pu-enabled') as HTMLInputElement | null;
  if (puChk) puChk.addEventListener('change', () => {
    settings.puEnabled = !!puChk.checked;
    saveSettings(settings);
    applySettingsToGame();
  });
  const puInt = document.getElementById('set-pu-interval') as HTMLInputElement | null;
  if (puInt) puInt.addEventListener('change', () => {
    const v = Math.max(5, Math.min(60, Number(puInt.value)||12));
    settings.puIntervalSec = v;
    saveSettings(settings);
    applySettingsToGame();
  });
}

applySettingsToGame();
syncSettingsUI();
bindSettingsUI();

// --- SPA + Tournament state ---
const pages = {
  home: document.getElementById('home-page') as HTMLElement | null,
  register: document.getElementById('register-page') as HTMLElement | null,
  tournament: document.getElementById('tournament-page') as HTMLElement | null,
  game: document.getElementById('game-page') as HTMLElement | null,
  settings: document.getElementById('settings-page') as HTMLElement | null,
  stats: document.getElementById('stats-page') as HTMLElement | null,
  multi: document.getElementById('multi-page') as HTMLElement | null,
};


const STORAGE_KEY = 'ft_transcendence_players_v1';
const QUEUE_KEY = 'ft_transcendence_queue_v1';
const players: string[] = [];
const queue: string[] = [];

function showRoute(path: string) {
  try { console.log('[nav] showRoute ->', path); } catch (err) {
    sendLog_frontend('error', 'Failed to log navigation', {
      error: err,
      path
    });
  }
  sendLog_frontend('error', 'Failed to log navigation', {
  error: "test",
  path
  });
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
      if (pages.stats) { pages.stats.classList.add('visible'); try { (renderStatsPage as any) && renderStatsPage(); } catch (err) {
        sendLog_frontend('error', 'Failed to render stats page', {
          error: err
        });
      } }
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
      if (pages.multi) { pages.multi.classList.add('visible'); startFourPlayerIfReady(); }
      break;
    default:
      // fallback to home for unknown paths
      if (pages.home) pages.home.classList.add('visible');
      path = '/';
  }
  try { document.body && document.body.setAttribute('data-route', path); } catch {}
  try { applyTranslations(document, currentLang); } catch (err) {
    sendLog_frontend('error', 'Failed to apply translations', {
      error: err,
      lang: currentLang
    });
  }
  return path; // return possibly normalized path
}

// --- Power-ups engine (1v1) ---
type PowerUpType = 'FAST'|'SLOW'|'BIG'|'SMALL'|'POINT';
let puEnabled = false;
let puIntervalMs = 12000;
let nextPuAt = 0;
let pickup: { x:number;y:number;r:number;type:PowerUpType } | null = null;
let puMsg: { text:string; until:number } | null = null;
let lastHit: 1|2|null = null;

function spawnPickup() {
  const margin = 50;
  const x = margin + Math.random() * (W - 2*margin);
  const y = margin + Math.random() * (H - 2*margin);
  const types: PowerUpType[] = ['FAST','SLOW','BIG','SMALL','POINT'];
  const type = types[Math.floor(Math.random()*types.length)];
  pickup = { x, y, r: 8, type };
}

function showPuMsg(key: string) {
  puMsg = { text: t(currentLang, key), until: performance.now() + 1200 };
}

function applyPowerUp(type: PowerUpType, collector: 1|2) {
  switch (type) {
    case 'FAST': {
      const inc = 1.25;
      const speed = Math.min(Math.hypot(ball.vx, ball.vy) * inc, BALL_MAX_SPEED);
      const ang = Math.atan2(ball.vy, ball.vx);
      ball.vx = Math.cos(ang) * speed;
      ball.vy = Math.sin(ang) * speed;
      showPuMsg('game.powerup.fast');
      break;
    }
    case 'SLOW': {
      const dec = 0.75;
      const speed = Math.max(Math.hypot(ball.vx, ball.vy) * dec, 2);
      const ang = Math.atan2(ball.vy, ball.vx);
      ball.vx = Math.cos(ang) * speed;
      ball.vy = Math.sin(ang) * speed;
      showPuMsg('game.powerup.slow');
      break;
    }
    case 'BIG': {
      const now = performance.now();
      if (collector === 1) { p1Mul = 1.35; p1MulUntil = now + 8000; }
      else { p2Mul = 1.35; p2MulUntil = now + 8000; }
      recomputePaddleSizes();
      showPuMsg('game.powerup.big');
      break;
    }
    case 'SMALL': {
      const now = performance.now();
      if (collector === 1) { p2Mul = 0.75; p2MulUntil = now + 8000; }
      else { p1Mul = 0.75; p1MulUntil = now + 8000; }
      recomputePaddleSizes();
      showPuMsg('game.powerup.small');
      break;
    }
    case 'POINT': {
      if (collector === 1) {
        score1 += 1; updateScoreUI(); afterScoreUpdateObserver();
        if (score1 >= WIN_SCORE) { winner = (document.getElementById('p1-alias')?.textContent || t(currentLang, 'game.player1')); }
      } else {
        score2 += 1; updateScoreUI(); afterScoreUpdateObserver();
        if (score2 >= WIN_SCORE) { winner = (document.getElementById('p2-alias')?.textContent || t(currentLang, 'game.player2')); }
      }
      showPuMsg('game.powerup.point');
      break;
    }
  }
}

function handlePowerUps() {
  const now = performance.now();
  // expire size effects
  if (p1MulUntil && now > p1MulUntil) { p1Mul = 1.0; p1MulUntil = 0; recomputePaddleSizes(); }
  if (p2MulUntil && now > p2MulUntil) { p2Mul = 1.0; p2MulUntil = 0; recomputePaddleSizes(); }
  if (!puEnabled) return;
  if (!pickup && now >= nextPuAt) {
    spawnPickup();
    nextPuAt = now + puIntervalMs;
  }
  if (pickup) {
    const dx = ball.x - pickup.x;
    const dy = ball.y - pickup.y;
    const rr = (ball.r + pickup.r) * (ball.r + pickup.r);
    if (dx*dx + dy*dy <= rr) {
      const collector: 1|2 = lastHit ?? (ball.vx >= 0 ? 1 : 2);
      applyPowerUp(pickup.type, collector);
      pickup = null;
    }
  }
}

// --- 4-player mode (front-only) ---
type P4 = { x: number; y: number; w: number; h: number; dir: 'H'|'V'; color: string; score: number; alias: string };
let p4ctx: CanvasRenderingContext2D | null = null;
let p4W = 600, p4H = 600;
let p4Ball = { x: 300, y: 300, vx: 4, vy: 3, r: 6 };
let P4_SPEED = Math.max(3, Math.min(10, PADDLE_SPEED));
let p4Players: P4[] = [];
let p4Running = false;
let p4Winner: string | null = null;
let p4FirstStart = true;

function initFourPlayers() {
  const cv = document.getElementById('game4') as HTMLCanvasElement | null;
  p4ctx = cv?.getContext('2d') || null;
  if (!cv || !p4ctx) return false;
  p4W = cv.width; p4H = cv.height;
  const names = players.slice(0,4);
  p4Players = [
    { x: 16, y: p4H/2 - 40, w: 10, h: 80, dir: 'V', color: '#00ff6a', score:0, alias: names[0] || 'P1' }, // left
    { x: p4W-26, y: p4H/2 - 40, w: 10, h: 80, dir: 'V', color: '#00c3ff', score:0, alias: names[1] || 'P2' }, // right
    { x: p4W/2 - 40, y: 16, w: 80, h: 10, dir: 'H', color: '#ffa500', score:0, alias: names[2] || 'P3' }, // top
    { x: p4W/2 - 40, y: p4H-26, w: 80, h: 10, dir: 'H', color: '#ff4d4f', score:0, alias: names[3] || 'P4' }, // bottom
  ];
  p4Ball = { x: p4W/2, y: p4H/2, vx: 4, vy: 3, r: 6 };
  p4Winner = null;
  p4FirstStart = true;
  return true;
}

function drawFour() {
  if (!p4ctx) return;
  p4ctx.fillStyle = '#000'; p4ctx.fillRect(0,0,p4W,p4H);
  // arena border
  p4ctx.strokeStyle = 'rgba(0,255,106,0.6)'; p4ctx.lineWidth = 4; p4ctx.strokeRect(2,2,p4W-4,p4H-4);
  // paddles
  p4Players.forEach(p => { p4ctx.fillStyle = p.color; p4ctx.fillRect(p.x, p.y, p.w, p.h); });
  // ball
  p4ctx.beginPath(); p4ctx.fillStyle = '#fff'; p4ctx.arc(p4Ball.x, p4Ball.y, p4Ball.r, 0, Math.PI*2); p4ctx.fill();
  // scores
  p4ctx.fillStyle = '#9fdc9f'; p4ctx.font='12px monospace';
  p4ctx.fillText(`${p4Players[0].alias}: ${p4Players[0].score}`, 10, 12);
  p4ctx.fillText(`${p4Players[1].alias}: ${p4Players[1].score}`, p4W-150, 12);
  p4ctx.fillText(`${p4Players[2].alias}: ${p4Players[2].score}`, 10, p4H-8);
  p4ctx.fillText(`${p4Players[3].alias}: ${p4Players[3].score}`, p4W-150, p4H-8);

  // overlays
  p4ctx.textAlign = 'center';
  if (p4Winner) {
    p4ctx.fillStyle = '#00ff6a';
    p4ctx.font = '20px monospace';
    p4ctx.fillText(t(currentLang, 'multi.win', { name: p4Winner }), p4W/2, p4H/2);
    p4ctx.font = '12px monospace';
    p4ctx.fillStyle = '#9fdc9f';
    p4ctx.fillText(t(currentLang, 'multi.resetHint'), p4W/2, p4H/2 + 24);
  } else if (!p4Running && p4FirstStart) {
    p4ctx.fillStyle = '#9fdc9f';
    p4ctx.font = '14px monospace';
    p4ctx.fillText(t(currentLang, 'multi.start'), p4W/2, p4H/2);
  }
}

function stepFour() {
  if (!p4Running) return;
  // move ball
  p4Ball.x += p4Ball.vx; p4Ball.y += p4Ball.vy;
  // reflect on walls if not scored
  let scoredIndex: number | null = null;
  // check paddles
  p4Players.forEach((p, idx) => {
    if (p.dir==='V') {
      // left/right goal lines
      const inY = p4Ball.y > p.y && p4Ball.y < p.y + p.h;
      if (idx===0 && p4Ball.x - p4Ball.r < p.x + p.w && inY) { p4Ball.vx = Math.abs(p4Ball.vx); }
      if (idx===1 && p4Ball.x + p4Ball.r > p.x && inY) { p4Ball.vx = -Math.abs(p4Ball.vx); }
      if (idx===0 && p4Ball.x < 0) scoredIndex = 1;
      if (idx===1 && p4Ball.x > p4W) scoredIndex = 0;
    } else {
      const inX = p4Ball.x > p.x && p4Ball.x < p.x + p.w;
      if (idx===2 && p4Ball.y - p4Ball.r < p.y + p.h && inX) { p4Ball.vy = Math.abs(p4Ball.vy); }
      if (idx===3 && p4Ball.y + p4Ball.r > p.y && inX) { p4Ball.vy = -Math.abs(p4Ball.vy); }
      if (idx===2 && p4Ball.y < 0) scoredIndex = 3;
      if (idx===3 && p4Ball.y > p4H) scoredIndex = 2;
    }
  });
  if (scoredIndex!=null) {
    p4Players[scoredIndex].score += 1;
    // check win
    if (!p4Winner && p4Players[scoredIndex].score >= WIN_SCORE) {
      p4Winner = p4Players[scoredIndex].alias || `P${scoredIndex+1}`;
      p4Running = false;
      // record stats: treat as winner vs each other player
      try {
        const wScore = p4Players[scoredIndex].score;
        p4Players.forEach((pl, idx) => {
          if (idx === scoredIndex) return;
          const lScore = pl.score;
          // ensure non-empty aliases for stats
          const w = p4Winner as string;
          const l = pl.alias || `P${idx+1}`;
          recordMatch(w, l, w, wScore, lScore);
        });
      } catch (err) {
        sendLog_frontend('error', 'Failed to record match stats', {
          error: err,
          winner: p4Winner,
          loser: p4Players[scoredIndex].alias || `P${scoredIndex+1}`,
        });
      }
    }
    // reset ball towards the scorer
    const dirX = scoredIndex===1 ? -1 : scoredIndex===0 ? 1 : 0;
    const dirY = scoredIndex===3 ? -1 : scoredIndex===2 ? 1 : 0;
    p4Ball = { x: p4W/2, y: p4H/2, vx: (dirX||1)*4, vy: (dirY||1)*3, r: 6 };
  }
  drawFour();
  requestAnimationFrame(stepFour);
}

function startFourPlayerIfReady() {
  const msg = document.getElementById('multi-msg');
  if (players.length < 4) { if (msg) msg.style.display='block'; return; }
  if (msg) msg.style.display='none';
  if (!initFourPlayers()) return;
  if (!p4Running) { p4Running = false; drawFour(); p4FirstStart = true; requestAnimationFrame(stepFour); }
}

// controls mapping for 4p
document.addEventListener('keydown', (e) => {
  if (!p4Players.length) return;
  switch (e.code) {
    case 'KeyW': p4Players[0].y -= P4_SPEED; break;
    case 'KeyS': p4Players[0].y += P4_SPEED; break;
    case 'ArrowUp': p4Players[1].y -= P4_SPEED; break;
    case 'ArrowDown': p4Players[1].y += P4_SPEED; break;
    case 'KeyA': p4Players[2].x -= P4_SPEED; break;
    case 'KeyD': p4Players[2].x += P4_SPEED; break;
    case 'KeyJ': p4Players[3].x -= P4_SPEED; break;
    case 'KeyL': p4Players[3].x += P4_SPEED; break;
    case 'Space':
      // prevent page scroll on space in some browsers
      e.preventDefault();
      if (!p4Winner) { p4Running = !p4Running; p4FirstStart = false; if (p4Running) requestAnimationFrame(stepFour); else drawFour(); }
      break;
    case 'KeyR':
      // reset 4p
      p4Players.forEach(p => p.score = 0);
      p4Winner = null;
      p4Ball = { x: p4W/2, y: p4H/2, vx: 4, vy: 3, r: 6 };
      p4Running = false; p4FirstStart = true; drawFour();
      break;
  }
  // clamp paddles
  if (p4Players[0]) p4Players[0].y = Math.max(8, Math.min(p4H - p4Players[0].h - 8, p4Players[0].y));
  if (p4Players[1]) p4Players[1].y = Math.max(8, Math.min(p4H - p4Players[1].h - 8, p4Players[1].y));
  if (p4Players[2]) p4Players[2].x = Math.max(8, Math.min(p4W - p4Players[2].w - 8, p4Players[2].x));
  if (p4Players[3]) p4Players[3].x = Math.max(8, Math.min(p4W - p4Players[3].w - 8, p4Players[3].x));
});

function navigateTo(path: string, replace = false) {
  const normalized = showRoute(path);
  if (normalized === window.location.pathname) {
    // if only hash/query changed we might handle separately later
    if (replace) history.replaceState({}, '', normalized);
    return;
  }
  if (replace) history.replaceState({}, '', normalized); else history.pushState({}, '', normalized);
  try { console.log('[nav] navigateTo ->', normalized); } catch (err) 
  {
    sendLog_frontend('error', 'Failed to log navigation', {
      error: err,
      normalized
    });
  }
}

// Handle browser back/forward
window.addEventListener('popstate', () => {
  showRoute(window.location.pathname);
});

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const a = (target.closest && target.closest('[data-link]')) as HTMLAnchorElement | null;
  if (a) {
    e.preventDefault();
    try { console.log('[nav] anchor click', a.getAttribute('href')); } catch (err) {
      sendLog_frontend('error', 'Failed to log anchor click', {
        error: err,
        href: a.getAttribute('href')
      });
    }
    navigateTo(a.getAttribute('href') || '/');
    return;
  }
  const btn = (target.closest && target.closest('[data-href]')) as HTMLButtonElement | null;
  if (btn) {
    e.preventDefault();
    try { console.log('[nav] button click', btn.getAttribute('data-href')); } catch {}
    navigateTo(btn.getAttribute('data-href') || '/');
  }

  const reset = (target.closest && target.closest('#stats-reset')) as HTMLButtonElement | null;
  if (reset) {
    e.preventDefault();
    resetStats();
    try { renderStatsPage(); } catch (err) {
      sendLog_frontend('error', 'Failed to render stats page', {
        error: err
      });
    }
  }
});

async function loadState() {
  // Attempt remote players first (non-blocking fallback)
  let remoteUsed = false;
  try {
    const remote = await fetchPlayers();
    if (remote && Array.isArray(remote) && remote.length) {
      remote.forEach(r => { if (!players.includes(r.alias)) players.push(r.alias); });
      // Build a naive queue from remote player order
      players.forEach(p => { if (!queue.includes(p)) queue.push(p); });
      remoteUsed = true;
      try { console.info('[api] loaded players from /api/players'); } catch (err) {
        sendLog_frontend('error', 'Failed to log player load', {
          error: err
        });
      }
    }
  } catch (err) {
    sendLog_frontend('error', 'Failed to fetch remote players', {
      error: err
    });
  }
  if (!remoteUsed) {
    try {
      const p = localStorage.getItem(STORAGE_KEY);
      const q = localStorage.getItem(QUEUE_KEY);
      if (p) JSON.parse(p).forEach((x: string) => players.push(x));
      if (q) JSON.parse(q).forEach((x: string) => queue.push(x));
    } catch (e) {
      sendLog_frontend('error', 'Failed to load stored players', {
        error: e
      });
      console.warn('Failed to load stored players', e);
    }
  }
}
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    sendLog_frontend('error', 'Failed to save players', {
      error: e
    });
    console.warn('Failed to save players', e);
  }
}

function updatePlayers() {
  const ul = document.getElementById('players-list');
  ul.innerHTML = '';
  players.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = p;
    ul.appendChild(li);
  });
}
function updateQueue() {
  const ol = document.getElementById('queue-list');
  ol.innerHTML = '';
  queue.forEach((p) => {
    const li = document.createElement('li');
    li.textContent = p;
    ol.appendChild(li);
  });
}

function buildSchedule() {
  schedule = [];
  // Simple round-robin pairing or sequential pairing if even count
  const playersCopy = [...players];
  if (playersCopy.length < 2) return;
  // Pair sequentially for MVP
  for (let i = 0; i < playersCopy.length - 1; i += 2) {
    if (playersCopy[i + 1]) schedule.push({ p1: playersCopy[i], p2: playersCopy[i + 1], status: 'pending' });
  }
  renderSchedule();
  renderBracket();
}

function renderSchedule() {
  const list = document.getElementById('schedule-list');
  if (!list) return;
  list.innerHTML = '';
  schedule.forEach((m, idx) => {
    const li = document.createElement('li');
    const label = `${m.p1} ${t(currentLang, 'common.vs')} ${m.p2}`;
    let statusChar = '';
    if (m.status === 'pending') statusChar = '⏳';
    else if (m.status === 'playing') statusChar = '▶';
    else if (m.status === 'done') statusChar = `✔${m.winner ? ' ' + t(currentLang, 'tour.winner') + ': ' + m.winner : ''}`;
    li.textContent = `${label} ${statusChar}`;
    if (idx === currentMatchIndex) li.style.fontWeight = 'bold';
    list.appendChild(li);
  });
}

function renderBracket() {
  const container = document.getElementById('bracket');
  if (!container) return;
  container.innerHTML = '';
  // MVP: simple vertical list; future: tree layout
  schedule.forEach((m, idx) => {
    const div = document.createElement('div');
    div.style.marginBottom = '6px';
    div.textContent = t(currentLang, 'tour.match', { n: idx + 1, p1: m.p1, p2: m.p2 }) + (m.status === 'done' ? ' → ' + (m.winner || '') : '');
    container.appendChild(div);
  });
}

// Stats page renderer
function renderStatsPage() {
  const top = document.getElementById('stats-top');
  const recent = document.getElementById('stats-recent');
  if (!top || !recent) return;
  top.innerHTML = '';
  recent.innerHTML = '';
  const entries = Object.entries(playerStats);
  if (!entries.length) {
    const p = document.createElement('p');
    p.textContent = t(currentLang, 'stats.noData');
    top.appendChild(p);
  } else {
    const sorted = entries.sort((a, b) => b[1].rating - a[1].rating).slice(0, 10);
    const maxRating = Math.max(...sorted.map(([, s]) => s.rating), 1200);
    sorted.forEach(([name, s]) => {
      const row = document.createElement('div'); row.className = 'bar';
      const fill = document.createElement('i');
      const pct = Math.max(0.1, s.rating / maxRating);
      fill.style.width = (pct * 100).toFixed(1) + '%';
      const label = document.createElement('span');
      label.textContent = `${name} • ${t(currentLang, 'stats.rating')}: ${s.rating} • ${t(currentLang, 'stats.wins')}: ${s.wins} • ${t(currentLang, 'stats.losses')}: ${s.losses}`;
      row.appendChild(fill); row.appendChild(label); top.appendChild(row);
    });
  }
  const recentTen = [...matchHistory].sort((a,b)=>b.ts-a.ts).slice(0, 10);
  recentTen.forEach(m => {
    const li = document.createElement('li');
    const date = new Date(m.ts).toLocaleString();
    li.textContent = `${date}: ${m.p1} ${m.score[0]} - ${m.score[1]} ${m.p2} → ${t(currentLang, 'tour.winner')}: ${m.winner}`;
    recent.appendChild(li);
  });
}

function startNextScheduledMatch() {
  if (!schedule.length) return;
  // Find next pending
  const nextIdx = schedule.findIndex(m => m.status === 'pending');
  if (nextIdx === -1) return; // none left
  currentMatchIndex = nextIdx;
  schedule[nextIdx].status = 'playing';
  const { p1, p2 } = schedule[nextIdx];
  const next = document.getElementById('next-match');
  if (next) next.textContent = `${p1} vs ${p2}`;
  const p1a = document.getElementById('p1-alias');
  const p2a = document.getElementById('p2-alias');
  if (p1a) p1a.textContent = p1;
  if (p2a) p2a.textContent = p2;
  // Reset current game state
  resetMatch();
  renderSchedule();
  renderBracket();
  navigateTo('/game');
  // Reflect AI alias if enabled
  try { (updateP2Alias as any) && updateP2Alias(); } catch (err) {
    sendLog_frontend('error', 'Failed to update P2 alias', {
      error: err
    });
  }
}

// Hook into winner assignment (poll each frame)
function afterScoreUpdateObserver() {
  if (winner && currentMatchIndex != null && schedule[currentMatchIndex]) {
    if (schedule[currentMatchIndex].status !== 'done') {
      schedule[currentMatchIndex].status = 'done';
      schedule[currentMatchIndex].winner = winner;
      const p1 = (document.getElementById('p1-alias')?.textContent || t(currentLang, 'game.player1'));
      const p2 = (document.getElementById('p2-alias')?.textContent || t(currentLang, 'game.player2'));
      recordMatch(p1, p2, winner, score1, score2);
      renderSchedule();
      renderBracket();
    }
  }
}

const registerForm = document.getElementById('register-form') as HTMLFormElement | null;
if (registerForm) {
  registerForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const inputEl = document.getElementById('alias') as HTMLInputElement;
    const errEl = document.getElementById('alias-error') as HTMLElement | null;
    const raw = inputEl.value;
    const sanitized = sanitize(raw);
    const alias = sanitized; // we only trim/collapse whitespace; disallow spaces below
    const ALIAS_RE = /^[A-Za-z0-9_\-]{2,20}$/;
    function showError(msg: string) {
      if (errEl) {
        errEl.textContent = msg;
        errEl.classList.add('visible');
      }
    }
    function clearError() {
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.remove('visible');
      }
    }
    clearError();
  if (!alias) return showError(t(currentLang, 'errors.alias.required'));
  if (!ALIAS_RE.test(alias)) return showError(t(currentLang, 'errors.alias.invalid'));
    // case-insensitive uniqueness
    const lower = alias.toLowerCase();
  if (players.some(p => p.toLowerCase() === lower)) return showError(t(currentLang, 'errors.alias.duplicate'));
    players.push(alias);
    if (!queue.some(p => p.toLowerCase() === lower)) queue.push(alias);
    updatePlayers();
    updateQueue();
    buildSchedule();
    saveState();
    inputEl.value = '';
  });
}

// AI controls removed (revert)

const startBtn = document.getElementById('start-tournament');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    // Use schedule instead of raw queue for matches
    if (!schedule.length) buildSchedule();
    if (!schedule.length) {
      const next = document.getElementById('next-match');
  if (next) next.textContent = t(currentLang, 'tour.needTwo');
      return;
    }
    startNextScheduledMatch();
    saveState();
    updateQueue();
  });
}

const newTourneyBtn = document.getElementById('new-tournament');
if (newTourneyBtn) {
  newTourneyBtn.addEventListener('click', () => {
    players.length = 0;
    queue.length = 0;
    schedule = [];
    currentMatchIndex = null;
    resetMatch();
    saveState();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(QUEUE_KEY);
    updatePlayers();
    updateQueue();
    renderSchedule();
    renderBracket();
    const next = document.getElementById('next-match');
  if (next) next.textContent = t(currentLang, 'tour.noMatch');
    const errEl = document.getElementById('alias-error') as HTMLElement | null;
    if (errEl) { errEl.textContent=''; errEl.style.display='none'; }
    navigateTo('/register');
  });
}

// Initial UI state load + route hydration
loadState();
// loadState is now async, but we can fire and continue; UI updates after resolution.
loadState().finally(() => {
  updatePlayers();
  updateQueue();
  buildSchedule();
});
// Hydrate initial path (supports deep-link reload); fallback handled inside showRoute
navigateTo(window.location.pathname || '/', true);

// AI settings removed (revert)

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Play/Pause button removed (revert)

// Initialize power-ups timer
nextPuAt = performance.now() + puIntervalMs;
