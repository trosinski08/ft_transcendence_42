"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPlayers = fetchPlayers;
exports.fetchTournament = fetchTournament;
async function safeGet(path) {
    try {
        const res = await fetch(path, { headers: { 'Accept': 'application/json' } });
        if (!res.ok)
            return null;
        return await res.json();
    }
    catch {
        return null;
    }
}
async function fetchPlayers() {
    return await safeGet('/api/players');
}
async function fetchTournament() {
    return await safeGet('/api/tournament');
}
//# sourceMappingURL=apiClient.js.map