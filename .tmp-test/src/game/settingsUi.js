"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSettings = defaultSettings;
exports.loadSettings = loadSettings;
exports.saveSettings = saveSettings;
exports.syncSettingsUI = syncSettingsUI;
exports.bindSettingsUI = bindSettingsUI;
const constants_1 = require("../game/constants");
const SETTINGS_KEY = 'ft_transcendence_settings_v1';
function defaultSettings() { return { winScore: constants_1.RULES.WIN_SCORE, paddleSpeed: constants_1.PADDLE.SPEED, paddleHeight: constants_1.PADDLE.HEIGHT, paddleWidth: constants_1.PADDLE.WIDTH, ballInitX: constants_1.BALL.INIT_SPEED_X, ballInitYRange: constants_1.BALL.INIT_SPEED_Y_RANGE, ballInc: constants_1.BALL.SPEED_INC_FACTOR, ballMax: constants_1.BALL.MAX_SPEED, puEnabled: true, puIntervalSec: 12, theme: 'neon' }; }
function loadSettings() { try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw)
        return defaultSettings();
    const parsed = JSON.parse(raw);
    return { ...defaultSettings(), ...parsed };
}
catch {
    return defaultSettings();
} }
function saveSettings(s) { try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
catch { } }
function syncSettingsUI(settings) { const byId = (id) => document.getElementById(id); const map = [['set-win-score', 'winScore'], ['set-paddle-speed', 'paddleSpeed'], ['set-paddle-height', 'paddleHeight'], ['set-paddle-width', 'paddleWidth'], ['set-ball-init-x', 'ballInitX'], ['set-ball-init-y', 'ballInitYRange'], ['set-ball-inc', 'ballInc'], ['set-ball-max', 'ballMax'], ['set-theme', 'theme']]; for (const [id, key] of map) {
    const el = byId(id);
    if (!el)
        continue;
    if (el instanceof HTMLSelectElement && key === 'theme') {
        el.value = String(settings[key]);
    }
    else if (el instanceof HTMLInputElement) {
        el.value = String(settings[key]);
    }
} const puChk = byId('set-pu-enabled'); if (puChk)
    puChk.checked = !!settings.puEnabled; const puInt = byId('set-pu-interval'); if (puInt)
    puInt.value = String(settings.puIntervalSec); }
function bindSettingsUI(settings, onChange) { const set = (key, val) => { settings[key] = (key === 'theme') ? val : Number(val); saveSettings(settings); onChange(settings); }; const add = (id, key) => { const el = document.getElementById(id); if (!el)
    return; el.addEventListener('change', () => set(key, el.value)); }; add('set-win-score', 'winScore'); add('set-paddle-speed', 'paddleSpeed'); add('set-paddle-height', 'paddleHeight'); add('set-paddle-width', 'paddleWidth'); add('set-ball-init-x', 'ballInitX'); add('set-ball-init-y', 'ballInitYRange'); add('set-ball-inc', 'ballInc'); add('set-ball-max', 'ballMax'); add('set-theme', 'theme'); const puChk = document.getElementById('set-pu-enabled'); if (puChk)
    puChk.addEventListener('change', () => { settings.puEnabled = !!puChk.checked; saveSettings(settings); onChange(settings); }); const puInt = document.getElementById('set-pu-interval'); if (puInt)
    puInt.addEventListener('change', () => { const v = Math.max(5, Math.min(60, Number(puInt.value) || 12)); settings.puIntervalSec = v; saveSettings(settings); onChange(settings); }); }
//# sourceMappingURL=settingsUi.js.map