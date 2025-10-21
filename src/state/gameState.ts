import { fetchPlayers } from '../apiClient';
import { t } from '../i18n/translations';

export type PlayerStats = { wins: number; losses: number; streak: number; rating: number };
export type MatchEntry = { p1: string; p2: string; winner: string; ts: number; score: [number, number] };
export type ScheduleEntry = { p1: string; p2: string; status: 'pending' | 'playing' | 'done'; winner?: string };

const STORAGE_KEY = 'ft_transcendence_players_v1';
const QUEUE_KEY = 'ft_transcendence_queue_v1';
const STATS_PLAYERS_KEY = 'ft_stats_players_v1';
const STATS_MATCHES_KEY = 'ft_stats_matches_v1';

export const players: string[] = [];
export const queue: string[] = [];
export const schedule: ScheduleEntry[] = [];
export let currentMatchIndex: number | null = null;

export const playerStats: Record<string, PlayerStats> = {};
export const matchHistory: MatchEntry[] = [];

export async function loadState(): Promise<void> {
  let remoteUsed = false;
  try {
    const remote = await fetchPlayers();
    if (remote && Array.isArray(remote) && remote.length) {
      remote.forEach((r: any) => { if (!players.includes(r.alias)) players.push(r.alias); });
      players.forEach(p => { if (!queue.includes(p)) queue.push(p); });
      remoteUsed = true;
    }
  } catch {}
  if (!remoteUsed) {
    try {
      const p = localStorage.getItem(STORAGE_KEY);
      const q = localStorage.getItem(QUEUE_KEY);
      if (p) JSON.parse(p).forEach((x: string) => players.push(x));
      if (q) JSON.parse(q).forEach((x: string) => queue.push(x));
    } catch (e) {
      console.warn('Failed to load stored players', e);
    }
  }
  // load stats
  try {
    const ps = localStorage.getItem(STATS_PLAYERS_KEY);
    const mh = localStorage.getItem(STATS_MATCHES_KEY);
    if (ps) Object.assign(playerStats, JSON.parse(ps));
    if (mh) matchHistory.push(...JSON.parse(mh));
  } catch {}
}

export function saveState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    localStorage.setItem(STATS_PLAYERS_KEY, JSON.stringify(playerStats));
    localStorage.setItem(STATS_MATCHES_KEY, JSON.stringify(matchHistory));
  } catch (e) {
    console.warn('Failed to save state', e);
  }
}

export function resetStats(): void {
  for (const k of Object.keys(playerStats)) delete playerStats[k];
  matchHistory.length = 0;
  try {
    localStorage.removeItem(STATS_PLAYERS_KEY);
    localStorage.removeItem(STATS_MATCHES_KEY);
  } catch {}
}

export function ensurePlayer(name: string) {
  if (!playerStats[name]) playerStats[name] = { wins: 0, losses: 0, streak: 0, rating: 1000 };
}

export function recordMatch(p1: string, p2: string, winnerName: string, s1: number, s2: number) {
  ensurePlayer(p1); ensurePlayer(p2);
  const loser = winnerName === p1 ? p2 : p1;
  const wp = playerStats[winnerName];
  const lp = playerStats[loser];
  wp.wins += 1; wp.streak = Math.max(1, wp.streak + 1);
  lp.losses += 1; lp.streak = Math.min(-1, lp.streak - 1);
  const K = 24;
  const Ra = wp.rating, Rb = lp.rating;
  const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));
  const Eb = 1 - Ea;
  wp.rating = Math.round(Ra + K * (1 - Ea));
  lp.rating = Math.round(Rb + K * (0 - Eb));
  matchHistory.push({ p1, p2, winner: winnerName, ts: Date.now(), score: [s1, s2] });
  saveState();
  // mark schedule if currently playing
  if (currentMatchIndex != null && schedule[currentMatchIndex]) {
    schedule[currentMatchIndex].status = 'done';
    schedule[currentMatchIndex].winner = winnerName;
  }
}

export function buildSchedule() {
  schedule.length = 0;
  const playersCopy = [...players];
  if (playersCopy.length < 2) return;
  for (let i = 0; i < playersCopy.length - 1; i += 2) {
    if (playersCopy[i + 1]) schedule.push({ p1: playersCopy[i], p2: playersCopy[i + 1], status: 'pending' });
  }
}

export function startNextScheduledMatch(): { idx: number; p1: string; p2: string } | null {
  if (!schedule.length) return null;
  const nextIdx = schedule.findIndex(m => m.status === 'pending');
  if (nextIdx === -1) return null;
  currentMatchIndex = nextIdx;
  schedule[nextIdx].status = 'playing';
  const { p1, p2 } = schedule[nextIdx];
  return { idx: nextIdx, p1, p2 };
}

export function resetTournament() {
  players.length = 0;
  queue.length = 0;
  schedule.length = 0;
  currentMatchIndex = null;
  saveState();
}

export function setCurrentMatchIndex(idx: number | null) {
  currentMatchIndex = idx;
}
