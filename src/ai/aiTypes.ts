export type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD';

export interface AIConfig {
  reactionDelayMs: number; // intentional lag
  smoothingFactor: number; // 0..1
  errorJitter: number; // pixels of random offset
  mistakeChance?: number; // chance (0..1) of an occasional larger mistake (miss) per decision tick
  maxTrackSpeed: number; // px per input tick (<= human paddle speed)
}
