import {
  fetchPlayers, addPlayer as apiAddPlayer,
  fetchQueue, addQueueEntry, removeQueueEntry,
  fetchSchedule, addScheduleEntry, updateScheduleEntry,
  fetchPlayerStats, upsertPlayerStats, updateMatchStatus,
  fetchTournamentSchedule
} from '../apiClient';

import {TournamentSchedule, Match, MatchUpdatePayload} from '../tournament/tournamentTypes';
import { t } from '../i18n/translations';

export type Player = { id: string; alias: string };
export type PlayerStats = { id: string; playerId: string; wins: number; losses: number; streak: number; rating: number };
export type MatchEntry = { id: string; p1: Player; p2: Player; winnerId?: string; ts: number; score1: number; score2: number; status: string };
export type ScheduleEntry = MatchEntry;

let players: Player[] = [];
let queue: { id: string; position: number; player: Player; playerId: string }[] = [];
let schedule: ScheduleEntry[] = [];
let playerStats: PlayerStats[] = [];
let matchHistory: MatchEntry[] = [];
let tournamentSchedule: TournamentSchedule | null = null;
export let currentMatchIndex: number | null = null;

export async function syncPlayersFromBackend() {
  players = await fetchPlayers();
}
export async function syncQueueFromBackend() {
  queue = await fetchQueue();
}
export async function syncScheduleFromBackend() {
  try {
    tournamentSchedule = await fetchTournamentSchedule();
    console.log('Tournament schedule synced from backend:', tournamentSchedule);
    return true;
  } catch (error) {
    console.error('Error syncing tournament schedule from backend:', error);
    tournamentSchedule = null;
    return false; 
  }
}
export async function syncPlayerStatsFromBackend() {
  playerStats = await fetchPlayerStats();
}
export async function addPlayer(alias: string) {
  await apiAddPlayer(alias);
  await syncPlayersFromBackend();
}
export async function addToQueue(playerId: string) {
  await addQueueEntry(playerId);
  await syncQueueFromBackend();
}
export async function removeFromQueue(playerId: string) {
  await removeQueueEntry(playerId);
  await syncQueueFromBackend();
}
export async function addSchedule(p1Id: string, p2Id: string) {
  await addScheduleEntry(p1Id, p2Id);
  // await syncScheduleFromBackend();
}
export async function updateSchedule(matchId: string, status: 'pending' | 'playing' | 'completed', winnerId?: string, score1?: number, score2?: number) {
  try {
    const payload: MatchUpdatePayload = { status, winnerId, score1, score2 };
    const updatedMatch = await updateMatchStatus(matchId, status, winnerId, score1, score2, payload);
    if (tournamentSchedule && tournamentSchedule.matches) {
      const matchIndex = tournamentSchedule.matches.findIndex(m => m.id === matchId);
      if (matchIndex !== -1) {
        tournamentSchedule.matches[matchIndex] = {...tournamentSchedule.matches[matchIndex], ...updatedMatch};
        console.log(`[gameState] Match ${matchId} updated to status ${status}`);
      }
    }
    return true;
  } catch (error) {
    console.error(`[gameState] Error updating match ${matchId} status:`, error);
    return false;
  }
}

// export async function updateSchedule(id: string, data: Partial<ScheduleEntry>) {
//   await updateScheduleEntry(id, data);
//   await syncScheduleFromBackend();
// }
export async function upsertStats(stats: PlayerStats) {
  await upsertPlayerStats(stats);
  await syncPlayerStatsFromBackend();
}
export function getPlayers() { return players; }
export function getQueue() { return queue; }
export function getSchedule() { return schedule; }
export function getPlayerStats() { return playerStats; }
export function getMatchHistory() { return matchHistory; }
export async function loadState() {
  await Promise.all([
    syncPlayersFromBackend(),
    syncQueueFromBackend(),
    syncScheduleFromBackend(),
    syncPlayerStatsFromBackend()
  ]);
}
export function resetTournament() {
  // Optionally, add backend endpoints to clear queue/schedule/stats
  players = [];
  queue = [];
  schedule = [];
  playerStats = [];
  matchHistory = [];
  currentMatchIndex = null;
}

export function getTournamentSchedule() {
  return tournamentSchedule;
}

export function setTournamentSchedule(schedule: TournamentSchedule) {
  tournamentSchedule = schedule;
}

export function setCurrentMatchIndex(index: number | null) {
  currentMatchIndex = index;
}


