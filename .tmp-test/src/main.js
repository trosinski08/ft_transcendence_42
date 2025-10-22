"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("./styles.css");
const translations_1 = require("./i18n/translations");
const constants_1 = require("./game/constants");
const difficultyPresets_1 = require("./ai/difficultyPresets");
const simpleAI_1 = require("./ai/simpleAI");
const gameState_1 = require("./state/gameState");
const router_1 = require("./routing/router");
const input_1 = require("./game/input");
/* Minimal in-file physics shim to satisfy usages in main.ts:
   Provides updateBall(...) returning { ball, lastHit?, scored? }
   and resetBall(...) returning a new ball object. This avoids a
   missing-module build error; replace with the real physics module
   when available. */
const physics = {
    updateBall(ball, p1Y, p1H, p2Y, p2H, params) {
        const res = { ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, r: ball.r }, lastHit: null, scored: null };
        // advance
        res.ball.x += res.ball.vx;
        res.ball.y += res.ball.vy;
        // top/bottom bounce
        if (res.ball.y - res.ball.r <= 0) {
            res.ball.y = res.ball.r;
            res.ball.vy = -res.ball.vy;
        }
        if (res.ball.y + res.ball.r >= params.H) {
            res.ball.y = params.H - res.ball.r;
            res.ball.vy = -res.ball.vy;
        }
        // paddle geometry
        const leftPaddleX = params.ARENA_LEFT_X + params.paddleW;
        const rightPaddleX = params.W - params.ARENA_RIGHT_X_OFFSET - params.paddleW;
        // left paddle collision or left score
        if (res.ball.x - res.ball.r <= leftPaddleX) {
            if (res.ball.y >= p1Y && res.ball.y <= p1Y + p1H) {
                res.ball.x = leftPaddleX + res.ball.r;
                res.ball.vx = -res.ball.vx * params.BALL_SPEED_INC_FACTOR;
                const speed = Math.min(Math.hypot(res.ball.vx, res.ball.vy), params.BALL_MAX_SPEED);
                const ang = Math.atan2(res.ball.vy, res.ball.vx);
                res.ball.vx = Math.cos(ang) * speed;
                res.ball.vy = Math.sin(ang) * speed;
                res.lastHit = 1;
            }
            else {
                res.scored = 'left';
            }
        }
        // right paddle collision or right score
        if (res.ball.x + res.ball.r >= rightPaddleX) {
            if (res.ball.y >= p2Y && res.ball.y <= p2Y + p2H) {
                res.ball.x = rightPaddleX - res.ball.r;
                res.ball.vx = -res.ball.vx * params.BALL_SPEED_INC_FACTOR;
                const speed = Math.min(Math.hypot(res.ball.vx, res.ball.vy), params.BALL_MAX_SPEED);
                const ang = Math.atan2(res.ball.vy, res.ball.vx);
                res.ball.vx = Math.cos(ang) * speed;
                res.ball.vy = Math.sin(ang) * speed;
                res.lastHit = 2;
            }
            else {
                res.scored = 'right';
            }
        }
        return res;
    },
    resetBall(W, H, initX, initYRange, radius, direction) {
        const vy = (Math.random() - 0.5) * initYRange;
        return { x: W / 2, y: H / 2, vx: direction * initX, vy, r: radius };
    }
};
const renderer_1 = require("./rendering/renderer");
const gameLoop_1 = require("./game/engine/gameLoop");
const tournament_1 = require("./tournament/tournament");
const fourPlayer_1 = require("./game/fourPlayer");
const aiControls = __importStar(require("./game/aiControls"));
// --- ELK Logging ---
async function sendLog(level, message, metadata) {
    // Only send logs in development/testing (avoid CORS in production)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
        return;
    // Local toggle: enable with localStorage.setItem('elk', 'on')
    try {
        if ((localStorage.getItem('elk') || 'off') !== 'on')
            return;
    }
    catch { }
    try {
        const sessionId = sessionStorage.getItem('sessionId') || (() => {
            const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            try {
                sessionStorage.setItem('sessionId', id);
            }
            catch { }
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
    }
    catch (error) {
        // Silently fail - logging should never break the app
        console.debug('ELK log send failed:', error);
    }
}
// Utility functions moved to `src/utils`
// Debug marker to confirm JS is executing in production
try {
    console.log('[pong] script loaded');
    document.body && document.body.setAttribute('data-js', 'ready');
}
catch { }
// --- i18n setup ---
const LANG_STORAGE_KEY = 'ft_lang_v1';
function detectInitialLang() {
    try {
        const saved = (localStorage.getItem(LANG_STORAGE_KEY) || '').toLowerCase();
        if ((0, translations_1.isLang)(saved))
            return saved;
        const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        if (nav.startsWith('pl'))
            return 'pl';
        if (nav.startsWith('de'))
            return 'de';
    }
    catch { }
    return 'en';
}
let currentLang = detectInitialLang() || translations_1.DEFAULT_LANG;
function setLanguage(lang) {
    currentLang = lang;
    try {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
    }
    catch { }
    try {
        document.documentElement.lang = lang;
    }
    catch { }
    (0, translations_1.applyTranslations)(document, lang);
    const sel = document.getElementById('lang-select');
    if (sel && sel.value !== lang)
        sel.value = lang;
}
document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('lang-select');
    if (sel) {
        sel.value = currentLang;
        sel.addEventListener('change', () => {
            const v = sel.value;
            if ((0, translations_1.isLang)(v))
                setLanguage(v);
        });
    }
    setLanguage(currentLang);
});
const canvas = document.getElementById('game');
const ctx = canvas?.getContext('2d') || null;
const W = canvas?.width || 860;
const H = canvas?.height || 420;
// Gameplay constants (uniform rules)
let PADDLE_SPEED = constants_1.PADDLE.SPEED;
let BALL_INIT_SPEED_X = constants_1.BALL.INIT_SPEED_X;
let BALL_INIT_SPEED_Y_RANGE = constants_1.BALL.INIT_SPEED_Y_RANGE;
const BALL_RADIUS = constants_1.BALL.RADIUS;
let BALL_SPEED_INC_FACTOR = constants_1.BALL.SPEED_INC_FACTOR;
let BALL_MAX_SPEED = constants_1.BALL.MAX_SPEED;
// Scoring and match state
let score1 = 0;
let score2 = 0;
let WIN_SCORE = constants_1.RULES.WIN_SCORE;
let winner = null;
let firstStartShown = true; // controls initial "press space" prompt
let running = false;
let p1Y = H / 2 - constants_1.PADDLE.HEIGHT / 2;
let p2Y = H / 2 - constants_1.PADDLE.HEIGHT / 2;
// Base paddle dimensions and per-side derived heights
let basePaddleH = constants_1.PADDLE.HEIGHT;
let paddleW = constants_1.PADDLE.WIDTH;
let p1H = basePaddleH;
let p2H = basePaddleH;
let p1Mul = 1.0, p2Mul = 1.0;
let p1MulUntil = 0, p2MulUntil = 0;
function recomputePaddleSizes() {
    p1H = clamp(Math.round(basePaddleH * p1Mul), 30, 200);
    p2H = clamp(Math.round(basePaddleH * p2Mul), 30, 200);
    // Keep paddles in bounds after size change
    p1Y = Math.max(constants_1.ARENA.PADDING_TOP, Math.min(H - p1H - constants_1.ARENA.PADDING_BOTTOM, p1Y));
    p2Y = Math.max(constants_1.ARENA.PADDING_TOP, Math.min(H - p2H - constants_1.ARENA.PADDING_BOTTOM, p2Y));
}
let ball = { x: W / 2, y: H / 2, vx: BALL_INIT_SPEED_X, vy: 2, r: BALL_RADIUS };
// Schedule state moved to `src/state/gameState`
// Stats moved to `src/state/gameState`
// AI state moved to src/game/aiControls
const AI_STORAGE_KEY = 'ft_transcendence_ai_settings_v1';
aiControls.loadAiState(AI_STORAGE_KEY);
// Wire AI UI; update P2 alias when AI toggle changes
aiControls.wireAiUi((enabled) => {
    const p2a = document.getElementById('p2-alias');
    if (!p2a)
        return;
    if (enabled)
        p2a.textContent = (0, translations_1.t)(currentLang, 'game.ai');
    else if (gameState_1.currentMatchIndex != null && gameState_1.schedule[gameState_1.currentMatchIndex])
        p2a.textContent = gameState_1.schedule[gameState_1.currentMatchIndex].p2;
    else
        p2a.textContent = (0, translations_1.t)(currentLang, 'game.player2');
}, (d) => { });
function resetBall(direction = (Math.random() > 0.5 ? 1 : -1)) {
    const vy = (Math.random() - 0.5) * BALL_INIT_SPEED_Y_RANGE;
    ball = { x: W / 2, y: H / 2, vx: direction * BALL_INIT_SPEED_X, vy, r: BALL_RADIUS };
    running = false;
}
function resetMatch() {
    score1 = 0;
    score2 = 0;
    winner = null;
    updateScoreUI();
    resetBall();
    firstStartShown = true;
}
function updateScoreUI() {
    const s1 = document.getElementById('score1');
    const s2 = document.getElementById('score2');
    if (s1)
        s1.textContent = String(score1);
    if (s2)
        s2.textContent = String(score2);
    const next = document.getElementById('next-match');
    if (winner && next)
        next.textContent = `${winner}`;
}
function updatePlayButtonUI() {
    const btn = document.getElementById('play-toggle');
    if (btn) {
        const label = running ? 'Pause' : 'Play';
        btn.textContent = label;
        btn.setAttribute('aria-pressed', running ? 'true' : 'false');
    }
}
function setRunning(val) {
    if (winner)
        return;
    running = val;
    if (running)
        firstStartShown = false;
    updatePlayButtonUI();
}
function toggleRunning() { setRunning(!running); }
function clear() {
    if (!ctx)
        return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
}
let particles = [];
let ballTrail = [];
let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
// Power-up display state used by draw() (hoisted to avoid TDZ)
let pickup = null;
let puMsg = null;
// Power-ups runtime toggles and timers (hoisted to avoid TDZ in settings)
let puEnabled = false;
let puIntervalMs = 12000;
let nextPuAt = 0;
let lastHit = null;
// drawing delegated to renderer
function step() {
    if (running && !winner) {
        // delegate movement/collision to physics
        const physicsParams = {
            W, H,
            ARENA_LEFT_X: constants_1.ARENA.LEFT_X,
            ARENA_RIGHT_X_OFFSET: constants_1.ARENA.RIGHT_X_OFFSET,
            paddleW,
            BALL_SPEED_INC_FACTOR,
            BALL_MAX_SPEED
        };
        const result = physics.updateBall(ball, p1Y, p1H, p2Y, p2H, physicsParams);
        ball = result.ball;
        if (result.lastHit)
            lastHit = result.lastHit;
        // Power-up spawn and pickup
        handlePowerUps();
        // Scoring: update scores if physics reported scoring
        if (result.scored === 'left') {
            score2 += 1;
            updateScoreUI();
            afterScoreUpdateObserver();
            if (score2 >= WIN_SCORE) {
                winner = (document.getElementById('p2-alias')?.textContent || (0, translations_1.t)(currentLang, 'game.player2'));
            }
            ball = physics.resetBall(W, H, BALL_INIT_SPEED_X, BALL_INIT_SPEED_Y_RANGE, BALL_RADIUS, 1);
        }
        else if (result.scored === 'right') {
            score1 += 1;
            updateScoreUI();
            afterScoreUpdateObserver();
            if (score1 >= WIN_SCORE) {
                winner = (document.getElementById('p1-alias')?.textContent || (0, translations_1.t)(currentLang, 'game.player1'));
            }
            ball = physics.resetBall(W, H, BALL_INIT_SPEED_X, BALL_INIT_SPEED_Y_RANGE, BALL_RADIUS, -1);
        }
    }
    (0, renderer_1.drawMain)(ctx, { W, H, p1Y, p2Y, p1H, p2H, paddleW, ball, pickup, puMsg, winner, running, firstStartShown, currentLang, particles, ballTrail });
}
// Initialize global input handlers
(0, input_1.initInputHandlers)(() => { if (!winner)
    toggleRunning(); }, () => resetMatch(), () => { aiControls.setAiEnabled(!aiControls.getAiEnabled()); });
function handleInput() {
    if (input_1.keys.has('KeyW'))
        p1Y -= PADDLE_SPEED;
    if (input_1.keys.has('KeyS'))
        p1Y += PADDLE_SPEED;
    if (aiControls.getAiEnabled()) {
        const cfg = difficultyPresets_1.DIFFICULTY_PRESETS[aiControls.getAiDifficulty()];
        const nextY = (0, simpleAI_1.nextAIPaddleY)({ x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, r: ball.r }, { y: p2Y, height: p2H }, { width: W, height: H }, cfg, W - constants_1.ARENA.RIGHT_X_OFFSET - paddleW);
        const delta = Math.max(-PADDLE_SPEED, Math.min(PADDLE_SPEED, nextY - p2Y));
        p2Y += delta;
    }
    else {
        if (input_1.keys.has('ArrowUp'))
            p2Y -= PADDLE_SPEED;
        if (input_1.keys.has('ArrowDown'))
            p2Y += PADDLE_SPEED;
    }
    p1Y = Math.max(constants_1.ARENA.PADDING_TOP, Math.min(H - p1H - constants_1.ARENA.PADDING_BOTTOM, p1Y));
    p2Y = Math.max(constants_1.ARENA.PADDING_TOP, Math.min(H - p2H - constants_1.ARENA.PADDING_BOTTOM, p2Y));
    setTimeout(handleInput, 12);
}
updateScoreUI();
(0, renderer_1.drawMain)(ctx, { W, H, p1Y, p2Y, p1H, p2H, paddleW, ball, pickup, puMsg, winner, running, firstStartShown, currentLang, particles, ballTrail });
handleInput();
// start main RAF loop via createRAFLoop below
window.game = { start: () => setRunning(true), stop: () => setRunning(false) };
const SETTINGS_KEY = 'ft_transcendence_settings_v1';
function defaultSettings() {
    return {
        winScore: constants_1.RULES.WIN_SCORE,
        paddleSpeed: constants_1.PADDLE.SPEED,
        paddleHeight: constants_1.PADDLE.HEIGHT,
        paddleWidth: constants_1.PADDLE.WIDTH,
        ballInitX: constants_1.BALL.INIT_SPEED_X,
        ballInitYRange: constants_1.BALL.INIT_SPEED_Y_RANGE,
        ballInc: constants_1.BALL.SPEED_INC_FACTOR,
        ballMax: constants_1.BALL.MAX_SPEED,
        puEnabled: true,
        puIntervalSec: 12,
        theme: 'neon',
    };
}
function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw)
            return defaultSettings();
        const parsed = JSON.parse(raw);
        return { ...defaultSettings(), ...parsed };
    }
    catch {
        return defaultSettings();
    }
}
function saveSettings(s) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    }
    catch { }
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
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function syncSettingsUI() {
    const byId = (id) => document.getElementById(id);
    const map = [
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
        if (!el)
            continue;
        if (el instanceof HTMLSelectElement && key === 'theme') {
            el.value = String(settings[key]);
        }
        else if (el instanceof HTMLInputElement) {
            el.value = String(settings[key]);
        }
    }
    // Special cases: checkbox and power-up interval
    const puChk = byId('set-pu-enabled');
    if (puChk)
        puChk.checked = !!settings.puEnabled;
    const puInt = byId('set-pu-interval');
    if (puInt)
        puInt.value = String(settings.puIntervalSec);
}
function bindSettingsUI() {
    const set = (key, val) => {
        settings[key] = (key === 'theme') ? val : Number(val);
        saveSettings(settings);
        applySettingsToGame();
    };
    const add = (id, key) => {
        const el = document.getElementById(id);
        if (!el)
            return;
        el.addEventListener('change', () => set(key, el.value));
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
    const puChk = document.getElementById('set-pu-enabled');
    if (puChk)
        puChk.addEventListener('change', () => {
            settings.puEnabled = !!puChk.checked;
            saveSettings(settings);
            applySettingsToGame();
        });
    const puInt = document.getElementById('set-pu-interval');
    if (puInt)
        puInt.addEventListener('change', () => {
            const v = Math.max(5, Math.min(60, Number(puInt.value) || 12));
            settings.puIntervalSec = v;
            saveSettings(settings);
            applySettingsToGame();
        });
}
applySettingsToGame();
syncSettingsUI();
bindSettingsUI();
// --- Graphics Effects System (definitions moved above draw) ---
function addParticles(x, y, count, type, color = '#00ff6a') {
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
function addScreenShake(intensity, duration) {
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
    }
    else {
        screenShake.x = 0;
        screenShake.y = 0;
    }
}
function drawParticles() {
    if (!ctx)
        return;
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
        }
        else {
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.restore();
    });
}
function spawnPickup() {
    const margin = 50;
    const x = margin + Math.random() * (W - 2 * margin);
    const y = margin + Math.random() * (H - 2 * margin);
    const types = ['FAST', 'SLOW', 'BIG', 'SMALL', 'POINT'];
    const type = types[Math.floor(Math.random() * types.length)];
    pickup = { x, y, r: 8, type };
}
function showPuMsg(key) {
    puMsg = { text: (0, translations_1.t)(currentLang, key), until: performance.now() + 1200 };
}
function applyPowerUp(type, collector) {
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
            if (collector === 1) {
                p1Mul = 1.35;
                p1MulUntil = now + 8000;
            }
            else {
                p2Mul = 1.35;
                p2MulUntil = now + 8000;
            }
            recomputePaddleSizes();
            showPuMsg('game.powerup.big');
            break;
        }
        case 'SMALL': {
            const now = performance.now();
            if (collector === 1) {
                p2Mul = 0.75;
                p2MulUntil = now + 8000;
            }
            else {
                p1Mul = 0.75;
                p1MulUntil = now + 8000;
            }
            recomputePaddleSizes();
            showPuMsg('game.powerup.small');
            break;
        }
        case 'POINT': {
            if (collector === 1) {
                score1 += 1;
                updateScoreUI();
                afterScoreUpdateObserver();
                if (score1 >= WIN_SCORE) {
                    winner = (document.getElementById('p1-alias')?.textContent || (0, translations_1.t)(currentLang, 'game.player1'));
                }
            }
            else {
                score2 += 1;
                updateScoreUI();
                afterScoreUpdateObserver();
                if (score2 >= WIN_SCORE) {
                    winner = (document.getElementById('p2-alias')?.textContent || (0, translations_1.t)(currentLang, 'game.player2'));
                }
            }
            showPuMsg('game.powerup.point');
            break;
        }
    }
}
function handlePowerUps() {
    const now = performance.now();
    // expire size effects
    if (p1MulUntil && now > p1MulUntil) {
        p1Mul = 1.0;
        p1MulUntil = 0;
        recomputePaddleSizes();
    }
    if (p2MulUntil && now > p2MulUntil) {
        p2Mul = 1.0;
        p2MulUntil = 0;
        recomputePaddleSizes();
    }
    if (!puEnabled)
        return;
    if (!pickup && now >= nextPuAt) {
        spawnPickup();
        nextPuAt = now + puIntervalMs;
    }
    if (pickup) {
        const dx = ball.x - pickup.x;
        const dy = ball.y - pickup.y;
        const rr = (ball.r + pickup.r) * (ball.r + pickup.r);
        if (dx * dx + dy * dy <= rr) {
            const collector = lastHit ?? (ball.vx >= 0 ? 1 : 2);
            applyPowerUp(pickup.type, collector);
            pickup = null;
        }
    }
}
// 4-player mode moved to src/game/fourPlayer
// Router functions provided by `src/routing/router`
// load/save state moved to `src/state/gameState`
// Hook into winner assignment (poll each frame)
function afterScoreUpdateObserver() {
    if (winner && gameState_1.currentMatchIndex != null && gameState_1.schedule[gameState_1.currentMatchIndex]) {
        if (gameState_1.schedule[gameState_1.currentMatchIndex].status !== 'done') {
            gameState_1.schedule[gameState_1.currentMatchIndex].status = 'done';
            gameState_1.schedule[gameState_1.currentMatchIndex].winner = winner;
            const p1 = (document.getElementById('p1-alias')?.textContent || (0, translations_1.t)(currentLang, 'game.player1'));
            const p2 = (document.getElementById('p2-alias')?.textContent || (0, translations_1.t)(currentLang, 'game.player2'));
            (0, gameState_1.recordMatch)(p1, p2, winner, score1, score2);
            (0, tournament_1.renderSchedule)();
            (0, tournament_1.renderBracket)();
        }
    }
}
// AI controls removed (revert)
// tournament UI and bindings moved to src/tournament/tournament.ts
// Initial UI state load + route hydration
// initialize and hydrate tournament UI/state
(0, gameState_1.loadState)().finally(() => {
    (0, tournament_1.updatePlayers)();
    (0, tournament_1.updateQueue)();
    // schedule build and UI handled by tournament module
    (0, tournament_1.initTournamentBindings)();
});
// Hydrate initial path (supports deep-link reload); fallback handled inside showRoute
(0, router_1.initRouter)(() => currentLang);
(0, router_1.navigateTo)(window.location.pathname || '/', true);
// create RAF loops for main and 4-player (4p handled by module)
const loopMain = (0, gameLoop_1.createRAFLoop)(step);
const four = (0, fourPlayer_1.createFourController)(600, 600, WIN_SCORE, PADDLE_SPEED);
document.addEventListener('keydown', (e) => { four.handleKey(e); });
const loop4 = (0, gameLoop_1.createRAFLoop)(() => four.step());
// start main loop
loopMain.start();
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
//# sourceMappingURL=main.js.map