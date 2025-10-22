"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAiState = loadAiState;
exports.persistAiState = persistAiState;
exports.setAiEnabled = setAiEnabled;
exports.setAiDifficulty = setAiDifficulty;
exports.getAiEnabled = getAiEnabled;
exports.getAiDifficulty = getAiDifficulty;
exports.wireAiUi = wireAiUi;
const difficultyPresets_1 = require("../ai/difficultyPresets");
let aiEnabled = false;
let aiDifficulty = 'NORMAL';
function loadAiState(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed.enabled === 'boolean')
                aiEnabled = parsed.enabled;
            if (typeof parsed.difficulty === 'string' && parsed.difficulty.toUpperCase() in difficultyPresets_1.DIFFICULTY_PRESETS)
                aiDifficulty = parsed.difficulty.toUpperCase();
        }
    }
    catch { }
}
function persistAiState(storageKey) { try {
    localStorage.setItem(storageKey, JSON.stringify({ enabled: aiEnabled, difficulty: aiDifficulty }));
}
catch { } }
function setAiEnabled(v) { aiEnabled = !!v; }
function setAiDifficulty(d) { aiDifficulty = d; }
function getAiEnabled() { return aiEnabled; }
function getAiDifficulty() { return aiDifficulty; }
function wireAiUi(onToggle, onChangeDifficulty) {
    const aiToggle = document.getElementById('ai-toggle');
    const aiSelect = document.getElementById('ai-difficulty');
    if (aiToggle) {
        aiToggle.checked = aiEnabled;
        aiToggle.addEventListener('change', () => { aiEnabled = aiToggle.checked; onToggle(aiEnabled); persistAiState('ft_transcendence_ai_settings_v1'); });
    }
    if (aiSelect) {
        aiSelect.value = aiDifficulty;
        aiSelect.addEventListener('change', () => { aiDifficulty = (aiSelect.value || 'NORMAL'); onChangeDifficulty(aiDifficulty); persistAiState('ft_transcendence_ai_settings_v1'); });
    }
}
//# sourceMappingURL=aiControls.js.map