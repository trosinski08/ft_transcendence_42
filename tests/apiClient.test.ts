import { fetchPlayers, fetchTournament } from '../src/apiClient';

export function run(assert: (cond: any, msg?: string) => void) {
  const origFetch = (global as any).fetch;

  return (async () => {
    // Happy path: /api/players returns one item
    (global as any).fetch = async (path: string) => {
      if (path === '/api/players') {
        return { ok: true, json: async () => ([{ id: 'p1', alias: 'Alice' }]) } as any;
      }
      return { ok: false, status: 404, json: async () => ({}) } as any;
    };
    let players = await fetchPlayers();
    assert(Array.isArray(players) && players!.length === 1 && players![0].alias === 'Alice', 'fetchPlayers returns mocked data');

    // Error path: non-ok response -> null
    (global as any).fetch = async () => ({ ok: false, status: 500, json: async () => ({}) }) as any;
    players = await fetchPlayers();
    assert(players === null, 'fetchPlayers returns null on non-ok response');

    // Tournament shape
    (global as any).fetch = async (path: string) => {
      if (path === '/api/tournament') {
        return { ok: true, json: async () => ({ players: [{ id: 'p1', alias: 'Alice' }], schedule: [{ p1: 'Alice', p2: 'Bob', status: 'pending' }], currentMatchIndex: null }) } as any;
      }
      return { ok: false, status: 404, json: async () => ({}) } as any;
    };
    const tour = await fetchTournament();
    assert(!!tour && Array.isArray(tour!.players) && Array.isArray(tour!.schedule), 'fetchTournament returns expected shape');

    // Restore global fetch
    (global as any).fetch = origFetch;
  })();
}
