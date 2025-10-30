import {
  fetchPlayers, addPlayer as apiAddPlayer,
  fetchQueue, addQueueEntry, removeQueueEntry,
  fetchSchedule, addScheduleEntry, updateScheduleEntry,
  fetchPlayerStats, upsertPlayerStats, updateMatchStatus,
  fetchTournamentSchedule
} from '../apiClient';

// Import funkcji odświeżających UI
import { updateTournamentView } from '../tournament/tournament';
// Removed duplicate 'from' statement

import {TournamentSchedule, Match, MatchUpdatePayload} from '../tournament/tournamentTypes';
import { t } from '../i18n/translations';
import { get } from 'http';

export type Player = { id: string; alias: string };
export type PlayerStats = { id: string; playerId: string; wins: number; losses: number; streak: number; rating: number };
export type MatchEntry = { id: string; p1: Player; p2: Player; winnerId?: string; ts: number; score1: number; score2: number; status: string };
export type ScheduleEntry = MatchEntry;

let players: Player[] = [];

/**
 * Mapuje identyfikatory graczy na aliasy/nazwy z backendu.
 * @param playerIds - tablica identyfikatorów graczy
 * @returns tablica aliasów/nazw graczy
 */
export function mapPlayerAliases(playerIds: string[]): string[] {
  return playerIds.map(id => {
    const found = players.find(p => p.id === id);
    return found?.alias || 'unknown';
  });
}
let queue: { id: string; position: number; player: Player; playerId: string }[] = [];
let schedule: ScheduleEntry[] = [];
let playerStats: PlayerStats[] = [];
let matchHistory: MatchEntry[] = [];
let tournamentSchedule: TournamentSchedule | null = null;
export let currentMatchIndex: number | null = null;
let currentMatchId: string | null = null;

export function setCurrentMatch(matchId: string | null) {
  currentMatchId = matchId;
  if (matchId && tournamentSchedule) {
    currentMatchIndex = tournamentSchedule.matches.findIndex(m => m.id === matchId);
  } else {
    currentMatchIndex = null;
  }
}

export function getCurrentMatch() {
  if (!tournamentSchedule || !currentMatchId) return null;
  return tournamentSchedule.matches.find(m => m.id === currentMatchId) || null;
}

export async function syncPlayersFromBackend() {
  players = await fetchPlayers();
  updateTournamentView();
}
export async function syncQueueFromBackend() {
  queue = await fetchQueue();
  updateTournamentView();
}
export async function syncScheduleFromBackend() {
  try {
    const matchesFromBackend: Match[] = await fetchTournamentSchedule();
    if (matchesFromBackend && matchesFromBackend.length > 0) {
      await syncPlayersFromBackend(); 
      const allPlayers = getPlayers();
      const playerMap = new Map(allPlayers.map(p => [p.id, p.alias]));
      const enrichedMatches = matchesFromBackend.map(match => ({
        ...match,
        p1IdAlias: playerMap.get(match.p1Id) || 'Unknown',
        player2Alias: playerMap.get(match.p2Id) || 'Unknown',
      }));
        tournamentSchedule = {
          id: 'current-tournament',
          name: 'Current Tournament',
          status: 'started',
          players: getPlayers(),
          matches: enrichedMatches,
          currentRound: 1
        };
    } else {
      tournamentSchedule = null;
    }

    console.log('Tournament schedule state updated:', tournamentSchedule); // Zmieniony log dla jasności
    updateTournamentView();
    return true;
  } catch (error) {
    console.error('Error syncing tournament schedule from backend:', error);
    tournamentSchedule = null;
    updateTournamentView();
    return false; 
  }
}

export async function syncPlayerStatsFromBackend() {
  playerStats = await fetchPlayerStats();
}
export async function addPlayer(alias: string) {
  await apiAddPlayer(alias);
  await syncPlayersFromBackend();
  await syncQueueFromBackend();
  await syncScheduleFromBackend();
  await syncPlayerStatsFromBackend();
  console.log('[gameState] addPlayer: synchronizacja zakończona', {
    players,
    queue,
    schedule,
    playerStats
  });
}
export async function addToQueue(playerId: string) {
  await addQueueEntry(playerId);
  await syncQueueFromBackend();
  await syncPlayersFromBackend();
  await syncScheduleFromBackend();
  await syncPlayerStatsFromBackend();
  console.log('[gameState] addToQueue: synchronizacja zakończona', {
    players,
    queue,
    schedule,
    playerStats
  });
}
export async function removeFromQueue(playerId: string) {
  await removeQueueEntry(playerId);
  await syncQueueFromBackend();
  await syncPlayersFromBackend();
  await syncScheduleFromBackend();
  await syncPlayerStatsFromBackend();
  console.log('[gameState] removeFromQueue: synchronizacja zakończona', {
    players,
    queue,
    schedule,
    playerStats
  });
}
export async function addSchedule(p1Id: string, p2Id: string) {
  await addScheduleEntry(p1Id, p2Id);
  await syncScheduleFromBackend();
  await syncPlayersFromBackend();
  await syncQueueFromBackend();
  await syncPlayerStatsFromBackend();
  console.log('[gameState] addSchedule: synchronizacja zakończona', {
    players,
    queue,
    schedule,
    playerStats
  });
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
    await syncScheduleFromBackend();
    await syncPlayersFromBackend();
    await syncQueueFromBackend();
    await syncPlayerStatsFromBackend();
    console.log('[gameState] updateSchedule: synchronizacja zakończona', {
      players,
      queue,
      schedule,
      playerStats
    });
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
  tournamentSchedule = null;
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


