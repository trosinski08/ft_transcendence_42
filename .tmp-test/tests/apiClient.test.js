"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const apiClient_1 = require("../src/apiClient");
function run(assert) {
    const origFetch = global.fetch;
    return (async () => {
        // Happy path: /api/players returns one item
        global.fetch = async (path) => {
            if (path === '/api/players') {
                return { ok: true, json: async () => ([{ id: 'p1', alias: 'Alice' }]) };
            }
            return { ok: false, status: 404, json: async () => ({}) };
        };
        let players = await (0, apiClient_1.fetchPlayers)();
        assert(Array.isArray(players) && players.length === 1 && players[0].alias === 'Alice', 'fetchPlayers returns mocked data');
        // Error path: non-ok response -> null
        global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
        players = await (0, apiClient_1.fetchPlayers)();
        assert(players === null, 'fetchPlayers returns null on non-ok response');
        // Tournament shape
        global.fetch = async (path) => {
            if (path === '/api/tournament') {
                return { ok: true, json: async () => ({ players: [{ id: 'p1', alias: 'Alice' }], schedule: [{ p1: 'Alice', p2: 'Bob', status: 'pending' }], currentMatchIndex: null }) };
            }
            return { ok: false, status: 404, json: async () => ({}) };
        };
        const tour = await (0, apiClient_1.fetchTournament)();
        assert(!!tour && Array.isArray(tour.players) && Array.isArray(tour.schedule), 'fetchTournament returns expected shape');
        // Restore global fetch
        global.fetch = origFetch;
    })();
}
//# sourceMappingURL=apiClient.test.js.map