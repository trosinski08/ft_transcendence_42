export type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export interface AIConfig {
  reactionDelayMs: number; // intentional lag
  smoothingFactor: number; // 0..1
  errorJitter: number; // pixels of random offset
  maxTrackSpeed: number; // px per input tick (<= human paddle speed)
}
