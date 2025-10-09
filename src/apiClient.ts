// Lightweight optional API client. Attempts remote endpoints; falls back silently.
// This is intentionally minimal to satisfy a remote-ready integration without altering core logic.
export interface RemotePlayer { id: string; alias: string }
export interface RemoteTournament { players: RemotePlayer[]; schedule: any[]; currentMatchIndex: number|null }

async function safeGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchPlayers(): Promise<RemotePlayer[] | null> {
  return await safeGet<RemotePlayer[]>('/api/players');
}

export async function fetchTournament(): Promise<RemoteTournament | null> {
  return await safeGet<RemoteTournament>('/api/tournament');
}
