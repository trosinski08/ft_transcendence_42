"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchHistory = exports.playerStats = exports.currentMatchIndex = exports.schedule = exports.queue = exports.players = void 0;
exports.loadState = loadState;
exports.saveState = saveState;
exports.resetStats = resetStats;
exports.ensurePlayer = ensurePlayer;
exports.recordMatch = recordMatch;
exports.buildSchedule = buildSchedule;
exports.startNextScheduledMatch = startNextScheduledMatch;
exports.resetTournament = resetTournament;
exports.setCurrentMatchIndex = setCurrentMatchIndex;
const apiClient_1 = require("../apiClient");
const STORAGE_KEY = 'ft_transcendence_players_v1';
const QUEUE_KEY = 'ft_transcendence_queue_v1';
const STATS_PLAYERS_KEY = 'ft_stats_players_v1';
const STATS_MATCHES_KEY = 'ft_stats_matches_v1';
exports.players = [];
exports.queue = [];
exports.schedule = [];
exports.currentMatchIndex = null;
exports.playerStats = {};
exports.matchHistory = [];
async function loadState() {
    let remoteUsed = false;
    try {
        const remote = await (0, apiClient_1.fetchPlayers)();
        if (remote && Array.isArray(remote) && remote.length) {
            remote.forEach((r) => { if (!exports.players.includes(r.alias))
                exports.players.push(r.alias); });
            exports.players.forEach(p => { if (!exports.queue.includes(p))
                exports.queue.push(p); });
            remoteUsed = true;
        }
    }
    catch { }
    if (!remoteUsed) {
        try {
            const p = localStorage.getItem(STORAGE_KEY);
            const q = localStorage.getItem(QUEUE_KEY);
            if (p)
                JSON.parse(p).forEach((x) => exports.players.push(x));
            if (q)
                JSON.parse(q).forEach((x) => exports.queue.push(x));
        }
        catch (e) {
            console.warn('Failed to load stored players', e);
        }
    }
    // load stats
    try {
        const ps = localStorage.getItem(STATS_PLAYERS_KEY);
        const mh = localStorage.getItem(STATS_MATCHES_KEY);
        if (ps)
            Object.assign(exports.playerStats, JSON.parse(ps));
        if (mh)
            exports.matchHistory.push(...JSON.parse(mh));
    }
    catch { }
}
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(exports.players));
        localStorage.setItem(QUEUE_KEY, JSON.stringify(exports.queue));
        localStorage.setItem(STATS_PLAYERS_KEY, JSON.stringify(exports.playerStats));
        localStorage.setItem(STATS_MATCHES_KEY, JSON.stringify(exports.matchHistory));
    }
    catch (e) {
        console.warn('Failed to save state', e);
    }
}
function resetStats() {
    for (const k of Object.keys(exports.playerStats))
        delete exports.playerStats[k];
    exports.matchHistory.length = 0;
    try {
        localStorage.removeItem(STATS_PLAYERS_KEY);
        localStorage.removeItem(STATS_MATCHES_KEY);
    }
    catch { }
}
function ensurePlayer(name) {
    if (!exports.playerStats[name])
        exports.playerStats[name] = { wins: 0, losses: 0, streak: 0, rating: 1000 };
}
function recordMatch(p1, p2, winnerName, s1, s2) {
    ensurePlayer(p1);
    ensurePlayer(p2);
    const loser = winnerName === p1 ? p2 : p1;
    const wp = exports.playerStats[winnerName];
    const lp = exports.playerStats[loser];
    wp.wins += 1;
    wp.streak = Math.max(1, wp.streak + 1);
    lp.losses += 1;
    lp.streak = Math.min(-1, lp.streak - 1);
    const K = 24;
    const Ra = wp.rating, Rb = lp.rating;
    const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
    const Eb = 1 - Ea;
    wp.rating = Math.round(Ra + K * (1 - Ea));
    lp.rating = Math.round(Rb + K * (0 - Eb));
    exports.matchHistory.push({ p1, p2, winner: winnerName, ts: Date.now(), score: [s1, s2] });
    saveState();
    // mark schedule if currently playing
    if (exports.currentMatchIndex != null && exports.schedule[exports.currentMatchIndex]) {
        exports.schedule[exports.currentMatchIndex].status = 'done';
        exports.schedule[exports.currentMatchIndex].winner = winnerName;
    }
}
function buildSchedule() {
    exports.schedule.length = 0;
    const playersCopy = [...exports.players];
    if (playersCopy.length < 2)
        return;
    for (let i = 0; i < playersCopy.length - 1; i += 2) {
        if (playersCopy[i + 1])
            exports.schedule.push({ p1: playersCopy[i], p2: playersCopy[i + 1], status: 'pending' });
    }
}
function startNextScheduledMatch() {
    if (!exports.schedule.length)
        return null;
    const nextIdx = exports.schedule.findIndex(m => m.status === 'pending');
    if (nextIdx === -1)
        return null;
    exports.currentMatchIndex = nextIdx;
    exports.schedule[nextIdx].status = 'playing';
    const { p1, p2 } = exports.schedule[nextIdx];
    return { idx: nextIdx, p1, p2 };
}
function resetTournament() {
    exports.players.length = 0;
    exports.queue.length = 0;
    exports.schedule.length = 0;
    exports.currentMatchIndex = null;
    saveState();
}
function setCurrentMatchIndex(idx) {
    exports.currentMatchIndex = idx;
}
//# sourceMappingURL=gameState.js.map