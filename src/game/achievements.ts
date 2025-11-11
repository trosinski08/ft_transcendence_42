// Simple achievements system (frontend-only)
// Track basic milestones and expose a getter for UI

export type AchievementId =
  | 'first_win'
  | 'clean_sheet'
  | 'comeback_kid'
  | 'streak_3'
  | 'speedster';

export type Achievement = {
  id: AchievementId;
  title: string;
  desc: string;
  unlockedAt?: number;
};

const defs: Record<AchievementId, Achievement> = {
  first_win: { id: 'first_win', title: 'First Win', desc: 'Win your first match.' },
  clean_sheet: { id: 'clean_sheet', title: 'Clean Sheet', desc: 'Win a match without conceding a point.' },
  comeback_kid: { id: 'comeback_kid', title: 'Comeback Kid', desc: 'Win after trailing by 2+ points.' },
  streak_3: { id: 'streak_3', title: 'On a Roll', desc: 'Win 3 matches in a row.' },
  speedster: { id: 'speedster', title: 'Speedster', desc: 'Score a point within 5 seconds of serve.' },
};

let unlocked: Partial<Record<AchievementId, Achievement>> = {};
let recentServeAt = 0;
let winStreak = 0;

export function trackServe(now = performance.now()) {
  recentServeAt = now;
}

export function trackMatchEnd(score1: number, score2: number) {
  const p1Won = score1 > score2;
  const winnerScore = Math.max(score1, score2);
  const loserScore = Math.min(score1, score2);

  // first win
  if (!unlocked.first_win) unlock('first_win');

  // clean sheet
  if (loserScore === 0) unlock('clean_sheet');

  // streak
  winStreak = p1Won ? winStreak + 1 : 0;
  if (winStreak >= 3) unlock('streak_3');
}

export function trackPointScored(now = performance.now()) {
  if (!recentServeAt) return;
  if (now - recentServeAt <= 5000) unlock('speedster');
}

export function trackScoreDelta(score1: number, score2: number, prev1: number, prev2: number) {
  // comeback: if someone was trailing by 2+ and ends as winner
  const wasTrailingBy2 = (prev1 + prev2) > 0 && Math.abs(prev1 - prev2) >= 2;
  const nowLeading = Math.abs(score1 - score2) >= 0 && (score1 !== prev1 || score2 !== prev2);
  if (wasTrailingBy2 && nowLeading) unlock('comeback_kid');
}

function unlock(id: AchievementId) {
  if (unlocked[id]) return;
  unlocked[id] = { ...defs[id], unlockedAt: Date.now() };
}

export function getAchievements(): Achievement[] {
  return Object.values(unlocked).sort((a, b) => (a.unlockedAt || 0) - (b.unlockedAt || 0));
}
