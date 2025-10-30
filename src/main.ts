import './styles.css';
import { applyTranslations, DEFAULT_LANG, isLang, t, type Lang } from './i18n/translations';
import { ARENA, PADDLE as PDL, BALL as BL, RULES } from './game/constants';
import { DIFFICULTY_PRESETS } from './ai/difficultyPresets';
import type { AIDifficulty } from './ai/aiTypes';
import { nextAIPaddleY } from './ai/simpleAI';
import {
  getPlayers, getQueue, getSchedule, getPlayerStats, getMatchHistory,
  addPlayer, addToQueue, removeFromQueue, addSchedule, updateSchedule, upsertStats,
  syncPlayersFromBackend, syncQueueFromBackend, syncScheduleFromBackend, syncPlayerStatsFromBackend,
  loadState, resetTournament, currentMatchIndex,
  getTournamentSchedule
} from './state/gameState';
import { initRouter, navigateTo } from './routing/router';
import { keys, initInputHandlers } from './game/input';
import * as physics from './game/physics/physics';
import { drawMain } from './rendering/renderer';
import { createRAFLoop } from './game/engine/gameLoop';
import { initTournamentBindings, updatePlayers, updateQueue, renderSchedule, renderBracket } from './tournament/tournament';
import { createFourController } from './game/fourPlayer';
import * as effects from './game/effects';
import * as aiControls from './game/aiControls';
import * as settingsUi from './game/settingsUi';
import { run } from 'node:test';

// --- ELK Logging ---
async function sendLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, metadata?: Record<string, any>) {
  // Only send logs in development/testing (avoid CORS in production)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return;
  // Local toggle: enable with localStorage.setItem('elk', 'on')
  try {
    if ((localStorage.getItem('elk') || 'off') !== 'on') return;
  } catch {}
  
  try {
    const sessionId = sessionStorage.getItem('sessionId') || (() => {
      const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      try { sessionStorage.setItem('sessionId', id); } catch {}
      return id;
    })();

    await fetch('http://localhost:8080', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        sessionId,
        eventType: metadata?.eventType || 'general',
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...metadata
      })
    });
  } catch (error) {
  // Silently fail - logging should never break the app
  }
}
// Utility functions moved to `src/utils`

// Debug marker to confirm JS is executing in production
try { document.body && document.body.setAttribute('data-js', 'ready'); } catch {}

// --- i18n setup ---
const LANG_STORAGE_KEY = 'ft_lang_v1';
function detectInitialLang(): Lang {
  try {
    const saved = (localStorage.getItem(LANG_STORAGE_KEY) || '').toLowerCase();
    if (isLang(saved)) return saved as Lang;
    const nav = (navigator.language || (navigator as any).userLanguage || 'en').toLowerCase();
    if (nav.startsWith('en')) return 'en';
    if (nav.startsWith('de')) return 'de';
  } catch {}
  return 'en';
}
let currentLang: Lang = detectInitialLang() || DEFAULT_LANG;
function setLanguage(lang: Lang) {
  currentLang = lang;
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch {}
  try { document.documentElement.lang = lang; } catch {}
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

let W = canvas?.width || 860;
let H = canvas?.height || 420;

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
  let ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: BALL_RADIUS };

  // Schedule state moved to `src/state/gameState`

  // Stats moved to `src/state/gameState`

  // AI state moved to src/game/aiControls
  const AI_STORAGE_KEY = 'ft_transcendence_ai_settings_v1';
  aiControls.loadAiState(AI_STORAGE_KEY);
  // Wire AI UI; update P2 alias when AI toggle changes
  aiControls.wireAiUi((enabled) => {
    const p2a = document.getElementById('p2-alias');
    if (!p2a) return;
    if (enabled) p2a.textContent = t(currentLang, 'game.ai');
  else if (currentMatchIndex != null && getSchedule()[currentMatchIndex]) p2a.textContent = getSchedule()[currentMatchIndex].p2.alias;
    else p2a.textContent = t(currentLang, 'game.player2');
  }, (d) => { /* difficulty changed, no-op */ });


  function resetMatch() {
    score1 = 0; score2 = 0; winner = null; updateScoreUI();
    ball = physics.resetBall(W, H, BALL_INIT_SPEED_X, BALL_INIT_SPEED_Y_RANGE, BALL_RADIUS);
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
  // ...existing code...
    if (winner) {
  // ...existing code...
      return;
    }
    running = val;
    if (!running)
        keys.clear();
    if (running) {
      // Jeśli piłka stoi, nadaj jej prędkość startową
      if (ball.vx === 0 && ball.vy === 0) {
        const direction = Math.random() < 0.5 ? 1 : -1;
        const vy = (Math.random() - 0.5) * BALL_INIT_SPEED_Y_RANGE;
        ball.vx = direction * BALL_INIT_SPEED_X;
        ball.vy = vy;
      }
      firstStartShown = false;
    }
    updatePlayButtonUI();
    try {
      drawMain(ctx, { W, H, p1Y, p2Y, p1H, p2H, paddleW, ball, pickup, puMsg, winner, running, firstStartShown, currentLang, particles, ballTrail });
    } catch (e) {
    }
  }

  function toggleRunning() { setRunning(!running); }

  function clear() {
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  }

  // --- Graphics Effects State (moved earlier to avoid TDZ in draw) ---
  type Particle = {
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; size: number;
    color: string; type: 'spark' | 'trail' | 'explosion';
  };

  let particles: Particle[] = [];
  let ballTrail: { x: number; y: number; life: number }[] = [];
  let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
  // Power-up display state used by draw() (hoisted to avoid TDZ)
  let pickup: { x:number; y:number; r:number; type: 'FAST'|'SLOW'|'BIG'|'SMALL'|'POINT' } | null = null;
  let puMsg: { text: string; until: number } | null = null;
  // Power-ups runtime toggles and timers (hoisted to avoid TDZ in settings)
  let puEnabled = false;
  let puIntervalMs = 12000;
  let nextPuAt = 0;
  let lastHit: 1|2|null = null;

  // drawing delegated to renderer

  function step() {
    if (running && !winner) {
      // delegate movement/collision to physics
      const physicsParams = {
         W, H,
        ARENA_LEFT_X: ARENA.LEFT_X,
        ARENA_RIGHT_X_OFFSET: ARENA.RIGHT_X_OFFSET,
        ARENA_PADDING_TOP: ARENA.PADDING_TOP,
        ARENA_PADDING_BOTTOM: ARENA.PADDING_BOTTOM,
        paddleW,
        BALL_SPEED_INC_FACTOR,
        BALL_MAX_SPEED
      };
      const result = physics.updateBall(ball, p1Y, p1H, p2Y, p2H, physicsParams);
      ball = result.ball;
      if (result.lastHit) lastHit = result.lastHit;
      handlePowerUps();
      if (result.scored) {
        // Ball reset: center, zero velocity, direction for next launch
        ball = physics.resetBall(W, H, BALL_INIT_SPEED_X, BALL_INIT_SPEED_Y_RANGE, BALL_RADIUS, (result.scored === 'left' ? 1 : -1));
        ball.vx = 0;
        ball.vy = 0;
  // ...existing code...
        running = false;
        firstStartShown = true;
        if (result.scored === 'left') {
          score2 += 1; updateScoreUI();
          afterScoreUpdateObserver();
          if (score2 >= WIN_SCORE) { winner = (document.getElementById('p2-alias')?.textContent || t(currentLang, 'game.player2')); }
        } else if (result.scored === 'right') {
          score1 += 1; updateScoreUI();
          afterScoreUpdateObserver();
          if (score1 >= WIN_SCORE) { winner = (document.getElementById('p1-alias')?.textContent || t(currentLang, 'game.player1')); }
        }
      }
    }
  drawMain(ctx, { W, H, p1Y, p2Y, p1H, p2H, paddleW, ball, pickup, puMsg, winner, running, firstStartShown, currentLang, particles, ballTrail });
  }

  // Initialize global input handlers
  // Space toggles pause/play, R resets match
  initInputHandlers(
    () => { if (!winner) toggleRunning(); },
    () => {
      // Reset: ball to center, zero velocity, scores zero
      score1 = 0; score2 = 0; winner = null; updateScoreUI();
      ball = physics.resetBall(W, H, BALL_INIT_SPEED_X, BALL_INIT_SPEED_Y_RANGE, BALL_RADIUS);
      ball.vx = 0;
      ball.vy = 0;
      running = false;
      firstStartShown = true;
      drawMain(ctx, { W, H, p1Y, p2Y, p1H, p2H, paddleW, ball, pickup, puMsg, winner, running, firstStartShown, currentLang, particles, ballTrail });
    },
    () => { aiControls.setAiEnabled(!aiControls.getAiEnabled()); }
  );

  function handleInput() {
    if (running) {
      if (keys.has('KeyW')) p1Y -= PADDLE_SPEED;
      if (keys.has('KeyS')) p1Y += PADDLE_SPEED;
        if (aiControls.getAiEnabled()) {
          const cfg = DIFFICULTY_PRESETS[aiControls.getAiDifficulty()];
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
    }
    setTimeout(handleInput, 12);
  }

  updateScoreUI();
  drawMain(ctx, { W, H, p1Y, p2Y, p1H, p2H, paddleW, ball, pickup, puMsg, winner, running, firstStartShown, currentLang, particles, ballTrail });
  handleInput();
  // start main RAF loop via createRAFLoop below

  (window as any).game = { start: () => setRunning(true), stop: () => setRunning(false) };

  // AI UI wiring handled by src/game/aiControls

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
  } catch {
    return defaultSettings();
  }
}
function saveSettings(s: Settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
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
// Router handles view switching and translation application

// --- Power-ups engine (1v1) ---
type PowerUpType = 'FAST'|'SLOW'|'BIG'|'SMALL'|'POINT';

// --- Graphics Effects System (definitions moved above draw) ---

function addParticles(x: number, y: number, count: number, type: 'spark' | 'trail' | 'explosion', color = '#00ff6a') {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      size: 2 + Math.random() * 3,
      color,
      type
    });
  }
}

function addScreenShake(intensity: number, duration: number) {
  screenShake.intensity = Math.max(screenShake.intensity, intensity);
  screenShake.duration = Math.max(screenShake.duration, duration);
}

function updateParticles() {
  // Update particles
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    p.vx *= 0.98; // friction
    p.vy *= 0.98;
    return p.life > 0;
  });

  // Update ball trail
  if (running && !winner) {
    ballTrail.push({ x: ball.x, y: ball.y, life: 15 });
  }
  ballTrail = ballTrail.filter(t => {
    t.life--;
    return t.life > 0;
  });

  // Update screen shake
  if (screenShake.duration > 0) {
    screenShake.duration--;
    const intensity = screenShake.intensity * (screenShake.duration / 60);
    screenShake.x = (Math.random() - 0.5) * intensity;
    screenShake.y = (Math.random() - 0.5) * intensity;
  } else {
    screenShake.x = 0;
    screenShake.y = 0;
  }
}

function drawParticles() {
  if (!ctx) return;
  
  // Draw ball trail
  ballTrail.forEach((t, i) => {
    const alpha = t.life / 15;
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 2 * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Draw particles
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    
    if (p.type === 'explosion') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.restore();
  });
}
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

// 4-player mode moved to src/game/fourPlayer

// Router functions provided by `src/routing/router`

// load/save state moved to `src/state/gameState`


// Hook into winner assignment (poll each frame)
async function afterScoreUpdateObserver() {
   const schedule = getTournamentSchedule();
  if (winner && currentMatchIndex != null && schedule && schedule.matches[currentMatchIndex]) {
    const match = schedule.matches[currentMatchIndex];
    if (match.status !== 'completed') {
      let winnerId: string | undefined;
      if (winner === match.player1Alias) {
        winnerId = match.p1Id;
      } else if (winner === match.player2Alias) {
        winnerId = match.p2Id;
      } else {
        winnerId = winner; // Fallback, rozważ bardziej solidną logikę dla AI
      }

      await updateSchedule(match.id, 'completed', winnerId, score1, score2);
      await syncScheduleFromBackend();
    }
  }
}


// AI controls removed (revert)

// tournament UI and bindings moved to src/tournament/tournament.ts

// Initial UI state load + route hydration
// initialize and hydrate tournament UI/state
loadState().finally(() => {
  updatePlayers();
  updateQueue();
  // schedule build and UI handled by tournament module
  initTournamentBindings();
});
// Hydrate initial path (supports deep-link reload); fallback handled inside showRoute
initRouter(() => currentLang);
navigateTo(window.location.pathname || '/', true);

// create RAF loops for main and 4-player (4p handled by module)
const loopMain = createRAFLoop(step);
const four = createFourController(600, 600, WIN_SCORE, PADDLE_SPEED);
document.addEventListener('keydown', (e) => { four.handleKey(e as KeyboardEvent); });
const loop4 = createRAFLoop(() => four.step());
// start main loop
loopMain.start();

// AI settings removed (revert)

// Global error handling
window.addEventListener('error', (event) => {
  // ...existing code...
});

window.addEventListener('unhandledrejection', (event) => {
  // ...existing code...
});

// Play/Pause button removed (revert)

// Initialize power-ups timer
nextPuAt = performance.now() + puIntervalMs;

// Forcefully update canvas sizing logic
function syncCanvasSize() {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  // Ensure minimum logical size
  const minW = 860, minH = 420;
  const logicalW = Math.max(rect.width, minW);
  const logicalH = Math.max(rect.height, minH);
  canvas.width = logicalW * dpr;
  canvas.height = logicalH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  W = logicalW;
  H = logicalH;
  // ...existing code...
}
syncCanvasSize();

// Update on resize
window.addEventListener('resize', () => {
  syncCanvasSize();
  // Optional: redraw game state on resize
  drawMain(ctx, { W, H, p1Y, p2Y, p1H, p2H, paddleW, ball, pickup, puMsg, winner, running, firstStartShown, currentLang, particles, ballTrail });
});
