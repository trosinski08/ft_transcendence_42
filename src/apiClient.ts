// Lightweight optional API client. Attempts remote endpoints; falls back silently.
// This is intentionally minimal to satisfy a remote-ready integration without altering core logic.

import { TournamentSchedule, Match, MatchUpdatePayload } from "./tournament/tournamentTypes";

export interface RemotePlayer { id: string; alias: string }
export interface RemoteTournament { players: RemotePlayer[]; schedule: any[]; currentMatchIndex: number|null }

const API_URL = '/api';

export async function fetchPlayers() {
  return fetch(`${API_URL}/players`).then(res => res.json());
}
export async function addPlayer(alias: string) {
  return fetch(`${API_URL}/players`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alias })
  }).then(res => res.json());
}
export async function fetchQueue() {
  return fetch(`${API_URL}/queue`).then(res => res.json());
}
export async function addQueueEntry(playerId: string) {
  return fetch(`${API_URL}/queue`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId })
  }).then(res => res.json());
}
export async function removeQueueEntry(playerId: string) {
  return fetch(`${API_URL}/queue/${playerId}`, { method: 'DELETE' }).then(res => res.json());
}
export async function fetchSchedule() {
  return fetch(`${API_URL}/schedule`).then(res => res.json());
}
export async function addScheduleEntry(p1Id: string, p2Id: string) {
  return fetch(`${API_URL}/schedule`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p1Id, p2Id })
  }).then(res => res.json());
}
export async function updateScheduleEntry(id: string, data: any) {
  return fetch(`${API_URL}/schedule/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}
export async function fetchPlayerStats() {
  return fetch(`${API_URL}/playerStats`).then(res => res.json());
}
export async function upsertPlayerStats(stats: any) {
  return fetch(`${API_URL}/playerStats`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stats)
  }).then(res => res.json());
}

export async function fetchTournamentSchedule(): Promise<TournamentSchedule> {
  return fetch(`${API_URL}/tournament/schedule`).then(res => res.json());
}

export async function updateMatchStatus(matchId: string, status: string, winnerId: string, score1: number, score2: number, payload: MatchUpdatePayload): Promise<Match> {
  return fetch(`${API_URL}/tournament/matches/${matchId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(res => res.json());
}
