import {
  fetchPlayers, addPlayer as apiAddPlayer,
  fetchQueue, addQueueEntry, removeQueueEntry,
  fetchSchedule, addScheduleEntry, updateScheduleEntry, deleteAllSchedule,
  fetchPlayerStats, upsertPlayerStats, updateMatchStatus,
  deleteAllPlayers,
  fetchTournamentSchedule
} from '../apiClient';

import { updateTournamentView } from '../tournament/tournament';
import {TournamentSchedule, Match, MatchUpdatePayload} from '../tournament/tournamentTypes';
import type { CurrentUser } from '../apiClient';

export type Player = { id: string; alias: string };
export type PlayerStats = { id: string; playerId: string; wins: number; losses: number; streak: number; rating: number };
export type MatchEntry = { id: string; p1: Player; p2: Player; winnerId?: string; ts: number; score1: number; score2: number; status: string };
export type ScheduleEntry = MatchEntry;

let players: Player[] = [];

// mapPlayerAliases moved to utils/playerHelpers
let queue: { id: string; position: number; player: Player; playerId: string }[] = [];
let schedule: ScheduleEntry[] = [];
let playerStats: PlayerStats[] = [];
let matchHistory: MatchEntry[] = [];
let tournamentSchedule: TournamentSchedule | null = null;
export let currentMatchIndex: number | null = null;
let currentMatchId: string | null = null;

function loadBracketPlanFromStorage() {
  if (typeof window === 'undefined') return;
  if (bracketPlan) return;
  const stored = window.localStorage?.getItem(BRACKET_PLAN_STORAGE_KEY);
  if (!stored) return;
  try {
    bracketPlan = JSON.parse(stored) as BracketPlan;
  } catch (err) {
    console.warn('[gameState] Failed to parse stored bracket plan, clearing...', err);
    bracketPlan = null;
    try { window.localStorage.removeItem(BRACKET_PLAN_STORAGE_KEY); } catch {}
  }
}

function persistBracketPlan() {
  if (typeof window === 'undefined') return;
  try {
    if (!bracketPlan) {
      window.localStorage.removeItem(BRACKET_PLAN_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(BRACKET_PLAN_STORAGE_KEY, JSON.stringify(bracketPlan));
  } catch (err) {
    console.warn('[gameState] Failed to persist bracket plan', err);
  }
}

function setBracketPlan(plan: BracketPlan | null) {
  bracketPlan = plan;
  persistBracketPlan();
}

export function getBracketPlan(): BracketPlan | null {
  if (!bracketPlan) loadBracketPlanFromStorage();
  return bracketPlan;
}

export function clearBracketPlan() {
  setBracketPlan(null);
}

function getPlanMatch(round: number, index: number): BracketMatchPlan | null {
  const plan = getBracketPlan();
  if (!plan) return null;
  const roundMatches = plan[round - 1];
  if (!roundMatches) return null;
  return roundMatches[index] || null;
}

function resolveEntrant(entrant: BracketEntrant): string | null {
  if (entrant.kind === 'player') return entrant.playerId;
  const match = getPlanMatch(entrant.round, entrant.matchIndex);
  return match?.winnerId || null;
}

function propagateAutoAdvances(plan: BracketPlan): boolean {
  let changed = false;
  for (const round of plan) {
    for (const match of round) {
      if (!match.autoAdvance) continue;
      const p1Id = resolveEntrant(match.p1);
      if (p1Id && match.winnerId !== p1Id) {
        match.winnerId = p1Id;
        changed = true;
      }
    }
  }
  if (changed) persistBracketPlan();
  return changed;
}

function createBracketPlan(playerIds: string[]): BracketPlan {
  const plan: BracketPlan = [];
  let entrants: BracketEntrant[] = playerIds.map((playerId) => ({ kind: 'player', playerId }));
  const N = entrants.length;
  if (N < 2) return plan;

  // Determine the preliminary round size so that after R1 we have power-of-two/2 entrants
  const nextPow2 = (x: number) => { let p = 1; while (p < x) p <<= 1; return p; };
  const K = nextPow2(N);
  const targetAfterR1 = Math.max(2, K / 2);
  const prelimMatches = Math.max(0, N - targetAfterR1);
  let round = 1;

  // Round 1 (preliminaries) — pair first 2*prelimMatches players; rest get byes to round 2
  if (prelimMatches > 0) {
    const matchesThisRound: BracketMatchPlan[] = [];
    const prelimCount = prelimMatches * 2;
    const nextRoundEntrants: BracketEntrant[] = [];
    for (let i = 0; i < prelimCount; i += 2) {
      const p1 = entrants[i];
      const p2 = entrants[i + 1];
      const match: BracketMatchPlan = {
        round,
        index: matchesThisRound.length,
        p1,
        p2,
      };
      matchesThisRound.push(match);
      nextRoundEntrants.push({ kind: 'winner', round, matchIndex: match.index });
    }
    // Players with byes to round 2 (they keep their identity)
    for (let i = prelimCount; i < entrants.length; i++) {
      nextRoundEntrants.push(entrants[i]);
    }
    plan.push(matchesThisRound);
    entrants = nextRoundEntrants;
    round++;
  }

  // Subsequent rounds — pair sequentially, last one may auto-advance if odd
  while (entrants.length > 1) {
    const matchesThisRound: BracketMatchPlan[] = [];
    const nextRoundEntrants: BracketEntrant[] = [];
    for (let i = 0; i < entrants.length; i += 2) {
      const p1 = entrants[i];
      const p2 = entrants[i + 1] ?? null;
      const match: BracketMatchPlan = {
        round,
        index: matchesThisRound.length,
        p1,
        p2,
        autoAdvance: !p2,
      };
      matchesThisRound.push(match);
      if (p2) {
        nextRoundEntrants.push({ kind: 'winner', round, matchIndex: match.index });
      } else {
        nextRoundEntrants.push(p1); // bye propagates directly
      }
    }
    plan.push(matchesThisRound);
    entrants = nextRoundEntrants;
    round++;
  }

  return plan;
}

async function schedulePendingBracketMatches(): Promise<boolean> {
  const plan = getBracketPlan();
  if (!plan) return false;
  let created = false;

  for (const round of plan) {
    for (const match of round) {
      if (match.autoAdvance || match.matchId) continue;
      const p1Id = resolveEntrant(match.p1);
      const p2Id = match.p2 ? resolveEntrant(match.p2) : null;
      if (!p1Id || !p2Id) continue;
      try {
        const newMatch = await addScheduleEntry(p1Id, p2Id) as { id: string };
        match.matchId = newMatch.id;
        created = true;
      } catch (err) {
        console.error('[gameState] Failed to schedule match for bracket', { match, err });
      }
    }
  }

  if (created) persistBracketPlan();
  return created;
}

function updatePlanWithSchedule(matches: Match[]) {
  const plan = getBracketPlan();
  if (!plan) return;
  const matchMap = new Map(matches.map((m) => [m.id, m]));
  let changed = false;
  for (const round of plan) {
    for (const match of round) {
      if (!match.matchId) continue;
      const linked = matchMap.get(match.matchId);
      if (!linked) continue;
      if (linked.winnerId && match.winnerId !== linked.winnerId) {
        match.winnerId = linked.winnerId;
        changed = true;
      }
    }
  }
  if (changed) persistBracketPlan();
}

async function processBracketState(): Promise<void> {
  const plan = getBracketPlan();
  if (!plan) return;
  let changed = false;

  while (true) {
    const autoChanged = propagateAutoAdvances(plan);
    const scheduled = await schedulePendingBracketMatches();
    if (!autoChanged && !scheduled) break;
    changed = true;
  }

  if (changed) {
    await syncScheduleFromBackend();
  }
}

export async function initializeTournamentBracket(playerIds: string[]): Promise<void> {
  const plan = createBracketPlan(playerIds);
  setBracketPlan(plan);
  await processBracketState();
}

export async function progressBracketIfNeeded(): Promise<void> {
  await processBracketState();
}

type BracketEntrant =
  | { kind: 'player'; playerId: string }
  | { kind: 'winner'; round: number; matchIndex: number };

type BracketMatchPlan = {
  round: number;
  index: number;
  p1: BracketEntrant;
  p2: BracketEntrant | null;
  matchId?: string;
  winnerId?: string;
  autoAdvance?: boolean;
};

type BracketPlan = BracketMatchPlan[][];

const BRACKET_PLAN_STORAGE_KEY = 'tournamentBracketPlan';
let bracketPlan: BracketPlan | null = null;

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

// getPlayerAliasById moved to utils/playerHelpers

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
        player1Alias: playerMap.get(match.p1Id) || 'Unknown',
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
        updatePlanWithSchedule(enrichedMatches);
    } else {
      tournamentSchedule = null;
      clearBracketPlan();
    }

    console.log('Tournament schedule state updated:', tournamentSchedule); // Clarified log message for visibility
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
  console.log('[gameState] addPlayer: sync completed', {
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
  console.log('[gameState] addToQueue: sync completed', {
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
  console.log('[gameState] removeFromQueue: sync completed', {
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
  console.log('[gameState] addSchedule: sync completed', {
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
    console.log('[gameState] updateSchedule: sync completed', {
      players,
      queue,
      schedule,
      playerStats
    });
    if (status === 'completed') {
      await progressBracketIfNeeded();
      await recordChampionIfFinalCompleted();
    }
    return true;
  } catch (error) {
    console.error(`[gameState] Error updating match ${matchId} status:`, error);
    return false;
  }
}

let currentUser: CurrentUser | null = null;

export function setCurrentUser(user: CurrentUser | null) {
  currentUser = user;
}

export function getCurrentUser() {
  return currentUser;
}

export function clearAllStateOnLogout() {
  // Clear all local game/tournament state and user session
  players = [];
  queue = [];
  schedule = [];
  playerStats = [];
  matchHistory = [];
  tournamentSchedule = null;
  currentMatchIndex = null;
  currentMatchId = null;
  currentUser = null;
  // Inform UI to refresh views dependent on state
  try { updateTournamentView(); } catch {}
}


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
  clearBracketPlan();
}

export async function resetTournamentWithBackend(): Promise<boolean> {
  let backendResetOk = true;
  try {
    await deleteAllPlayers();
  } catch (err) {
    backendResetOk = false;
    console.error('[gameState] Failed to delete players from backend:', err);
    try {
      await deleteAllSchedule();
    } catch (fallbackErr) {
      console.error('[gameState] Fallback schedule delete failed:', fallbackErr);
    }
  }

  try { localStorage.removeItem('tournamentAlias'); } catch {}

  players = [];
  queue = [];
  schedule = [];
  playerStats = [];
  matchHistory = [];
  currentMatchIndex = null;
  currentMatchId = null;
  tournamentSchedule = null;
  clearBracketPlan();

  if (!backendResetOk) {
    console.warn('[gameState] Tournament reset fell back to local state only; ensure backend cleanup when possible.');
  }

  try { updateTournamentView(); } catch {}
  return backendResetOk;
}

export async function clearScheduleWithBackend() {
  try {
    await deleteAllSchedule();
  } catch (err) {
    console.error('[gameState] Failed to clear schedule from backend:', err);
  }
  schedule = [];
  tournamentSchedule = null;
  currentMatchIndex = null;
  currentMatchId = null;
  clearBracketPlan();
  try { updateTournamentView(); } catch {}
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

function getChampionIdFromPlan(): string | null {
  const plan = getBracketPlan();
  if (!plan || plan.length === 0) return null;
  const last = plan[plan.length - 1];
  if (!last || last.length !== 1) return null;
  return last[0]?.winnerId || null;
}

async function recordChampionIfFinalCompleted(): Promise<void> {
  const championId = getChampionIdFromPlan();
  if (!championId) return;

  const stats = getPlayerStats();
  const existing = Array.isArray(stats) ? stats.find(s => s.playerId === championId) : undefined;

  const payload = existing
    ? { ...existing, wins: (existing.wins || 0) + 1, rating: (existing.rating || 1000) + 25 }
    : { id: championId, playerId: championId, wins: 1, losses: 0, streak: 1, rating: 1025 };

  try {
    await upsertStats(payload as any);
  } catch (e) {
    console.warn('[gameState] Failed to record champion stats', e);
  }
}

export async function clearPlayersWithBackend() {
  await resetTournamentWithBackend();
}
