// Lightweight optional API client. Attempts remote endpoints; falls back silently.
// This is intentionally minimal to satisfy a remote-ready integration without altering core logic.

import { TournamentSchedule, Match, MatchUpdatePayload } from "./tournament/tournamentTypes";

export interface RemotePlayer { id: string; alias: string }
export interface RemoteTournament { players: RemotePlayer[]; schedule: any[]; currentMatchIndex: number|null }

const API_URL = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Accept': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);
  if (!res.ok) {
    const err: any = new Error(typeof body === 'string' ? body : (body?.error || `HTTP ${res.status}`));
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body as T;
}

export type ApiPlayer = { id: string; alias: string };
export async function fetchPlayers(): Promise<ApiPlayer[]> { return request<ApiPlayer[]>(`${API_URL}/players`); }
export async function addPlayer(alias: string) {
  return request(`${API_URL}/players`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alias })
  });
}
export type ApiQueueEntry = { id: string; position: number; player: ApiPlayer; playerId: string };
export async function fetchQueue(): Promise<ApiQueueEntry[]> { return request<ApiQueueEntry[]>(`${API_URL}/queue`); }
export async function addQueueEntry(playerId: string) {
  return request(`${API_URL}/queue`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId })
  });
}
export async function removeQueueEntry(playerId: string) { return request(`${API_URL}/queue/${playerId}`, { method: 'DELETE' }); }
export async function fetchSchedule(): Promise<any[]> { return request<any[]>(`${API_URL}/schedule`); }
export async function addScheduleEntry(p1Id: string, p2Id: string) {
  return request(`${API_URL}/schedule`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p1Id, p2Id })
  });
}
export async function updateScheduleEntry(id: string, data: any) {
  return request(`${API_URL}/schedule/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}
export type ApiPlayerStats = { id: string; playerId: string; wins: number; losses: number; streak: number; rating: number };
export async function fetchPlayerStats(): Promise<ApiPlayerStats[]> { return request<ApiPlayerStats[]>(`${API_URL}/playerStats`); }
export async function upsertPlayerStats(stats: any) {
  return request(`${API_URL}/playerStats`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stats)
  });
}

export async function fetchTournamentSchedule(): Promise<Match[]> {
  try {
    return await request<Match[]>(`${API_URL}/schedule`);
  } catch (error) {
    console.error('Error fetching tournament schedule:', error);
    return [];
  }
}

export async function updateMatchStatus(matchId: string, status: string, winnerId: string, score1: number, score2: number, payload: MatchUpdatePayload): Promise<Match> {
  return request(`${API_URL}/schedule/${matchId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
