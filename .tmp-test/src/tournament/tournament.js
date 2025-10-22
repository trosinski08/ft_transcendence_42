"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlayers = updatePlayers;
exports.updateQueue = updateQueue;
exports.renderSchedule = renderSchedule;
exports.renderBracket = renderBracket;
exports.renderStatsPage = renderStatsPage;
exports.startNextScheduledMatch = startNextScheduledMatch;
exports.initTournamentBindings = initTournamentBindings;
const translations_1 = require("../i18n/translations");
const gameState_1 = require("../state/gameState");
const validation_1 = require("../utils/validation");
function sanitize(input) {
    // Basic sanitization: remove angle brackets and control chars, collapse whitespace, trim ends.
    // Adjust as needed for your application's security requirements.
    return input.replace(/[\u0000-\u001F<>]/g, '').replace(/\s+/g, ' ').trim();
}
function updatePlayers() {
    const ul = document.getElementById('players-list');
    if (!ul)
        return;
    ul.innerHTML = '';
    gameState_1.players.forEach((p) => {
        const li = document.createElement('li');
        li.textContent = p;
        ul.appendChild(li);
    });
}
function updateQueue() {
    const ol = document.getElementById('queue-list');
    if (!ol)
        return;
    ol.innerHTML = '';
    gameState_1.queue.forEach((p) => {
        const li = document.createElement('li');
        li.textContent = p;
        ol.appendChild(li);
    });
}
function renderSchedule() {
    const list = document.getElementById('schedule-list');
    if (!list)
        return;
    list.innerHTML = '';
    gameState_1.schedule.forEach((m, idx) => {
        const li = document.createElement('li');
        const label = `${m.p1} ${(0, translations_1.t)(document.documentElement.lang || 'en', 'common.vs')} ${m.p2}`;
        let statusChar = '';
        if (m.status === 'pending')
            statusChar = '⏳';
        else if (m.status === 'playing')
            statusChar = '▶';
        else if (m.status === 'done')
            statusChar = `✔${m.winner ? ' ' + (0, translations_1.t)(document.documentElement.lang || 'en', 'tour.winner') + ': ' + m.winner : ''}`;
        li.textContent = `${label} ${statusChar}`;
        if (idx === gameState_1.currentMatchIndex)
            li.style.fontWeight = 'bold';
        list.appendChild(li);
    });
}
function renderBracket() {
    const container = document.getElementById('bracket');
    if (!container)
        return;
    container.innerHTML = '';
    gameState_1.schedule.forEach((m, idx) => {
        const div = document.createElement('div');
        div.style.marginBottom = '6px';
        div.textContent = (0, translations_1.t)(document.documentElement.lang || 'en', 'tour.match', { n: idx + 1, p1: m.p1, p2: m.p2 }) + (m.status === 'done' ? ' → ' + (m.winner || '') : '');
        container.appendChild(div);
    });
}
function renderStatsPage() {
    const top = document.getElementById('stats-top');
    const recent = document.getElementById('stats-recent');
    if (!top || !recent)
        return;
    top.innerHTML = '';
    recent.innerHTML = '';
    const entries = Object.entries(gameState_1.playerStats);
    if (!entries.length) {
        const p = document.createElement('p');
        p.textContent = (0, translations_1.t)(document.documentElement.lang || 'en', 'stats.noData');
        top.appendChild(p);
    }
    else {
        const sorted = entries.sort((a, b) => b[1].rating - a[1].rating).slice(0, 10);
        const maxRating = Math.max(...sorted.map(([, s]) => s.rating), 1200);
        sorted.forEach(([name, s]) => {
            const row = document.createElement('div');
            row.className = 'bar';
            const fill = document.createElement('i');
            const pct = Math.max(0.1, s.rating / maxRating);
            fill.style.width = (pct * 100).toFixed(1) + '%';
            const label = document.createElement('span');
            label.textContent = `${name} • ${(0, translations_1.t)(document.documentElement.lang || 'en', 'stats.rating')}: ${s.rating} • ${(0, translations_1.t)(document.documentElement.lang || 'en', 'stats.wins')}: ${s.wins} • ${(0, translations_1.t)(document.documentElement.lang || 'en', 'stats.losses')}: ${s.losses}`;
            row.appendChild(fill);
            row.appendChild(label);
            top.appendChild(row);
        });
    }
    const recentTen = [...gameState_1.matchHistory].sort((a, b) => b.ts - a.ts).slice(0, 10);
    recentTen.forEach(m => {
        const li = document.createElement('li');
        const date = new Date(m.ts).toLocaleString();
        li.textContent = `${date}: ${m.p1} ${m.score[0]} - ${m.score[1]} ${m.p2} → ${(0, translations_1.t)(document.documentElement.lang || 'en', 'tour.winner')}: ${m.winner}`;
        recent.appendChild(li);
    });
}
function startNextScheduledMatch() {
    const res = (0, gameState_1.startNextScheduledMatch)();
    if (!res)
        return;
    const { idx: nextIdx, p1, p2 } = res;
    const next = document.getElementById('next-match');
    if (next)
        next.textContent = `${p1} vs ${p2}`;
    const p1a = document.getElementById('p1-alias');
    const p2a = document.getElementById('p2-alias');
    if (p1a)
        p1a.textContent = p1;
    if (p2a)
        p2a.textContent = p2;
    // Reset current game state by calling window-level resetMatch if available
    try {
        window.resetMatch && window.resetMatch();
    }
    catch { }
    renderSchedule();
    renderBracket();
    try {
        window.navigateTo && window.navigateTo('/game');
    }
    catch { }
    try {
        window.updateP2Alias && window.updateP2Alias();
    }
    catch { }
}
function initTournamentBindings() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (ev) => {
            ev.preventDefault();
            const inputEl = document.getElementById('alias');
            const errEl = document.getElementById('alias-error');
            const raw = inputEl.value;
            const sanitized = sanitize(raw);
            const alias = sanitized;
            function showError(msg) {
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
            const res = (0, validation_1.validateAlias)(alias);
            if (!res.ok) {
                if (res.reason === 'required')
                    return showError((0, translations_1.t)(document.documentElement.lang || 'en', 'errors.alias.required'));
                return showError((0, translations_1.t)(document.documentElement.lang || 'en', 'errors.alias.invalid'));
            }
            const lower = alias.toLowerCase();
            if (gameState_1.players.some(p => p.toLowerCase() === lower))
                return showError((0, translations_1.t)(document.documentElement.lang || 'en', 'errors.alias.duplicate'));
            gameState_1.players.push(alias);
            if (!gameState_1.queue.some(p => p.toLowerCase() === lower))
                gameState_1.queue.push(alias);
            updatePlayers();
            updateQueue();
            (0, gameState_1.buildSchedule)();
            (0, gameState_1.saveState)();
            inputEl.value = '';
        });
    }
    const startBtn = document.getElementById('start-tournament');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (!gameState_1.schedule.length)
                (0, gameState_1.buildSchedule)();
            if (!gameState_1.schedule.length) {
                const next = document.getElementById('next-match');
                if (next)
                    next.textContent = (0, translations_1.t)(document.documentElement.lang || 'en', 'tour.needTwo');
                return;
            }
            startNextScheduledMatch();
            (0, gameState_1.saveState)();
            updateQueue();
        });
    }
    const newTourneyBtn = document.getElementById('new-tournament');
    if (newTourneyBtn) {
        newTourneyBtn.addEventListener('click', () => {
            (0, gameState_1.resetTournament)();
            try {
                window.resetMatch && window.resetMatch();
            }
            catch { }
            (0, gameState_1.saveState)();
            updatePlayers();
            updateQueue();
            renderSchedule();
            renderBracket();
            const next = document.getElementById('next-match');
            if (next)
                next.textContent = (0, translations_1.t)(document.documentElement.lang || 'en', 'tour.noMatch');
            const errEl = document.getElementById('alias-error');
            if (errEl) {
                errEl.textContent = '';
                errEl.style.display = 'none';
            }
            try {
                window.navigateTo && window.navigateTo('/register');
            }
            catch { }
        });
    }
}
//# sourceMappingURL=tournament.js.map