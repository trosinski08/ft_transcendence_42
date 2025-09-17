import { AIConfig, AIDifficulty } from './aiTypes';
import { PADDLE } from '../game/constants';

export const DIFFICULTY_PRESETS: Record<AIDifficulty, AIConfig> = {
  EASY: {
    reactionDelayMs: 140,
    smoothingFactor: 0.06,
    errorJitter: 18,
    maxTrackSpeed: Math.max(3, PADDLE.SPEED - 2),
  },
  NORMAL: {
    reactionDelayMs: 80,
    smoothingFactor: 0.08,
    errorJitter: 8,
    maxTrackSpeed: PADDLE.SPEED,
  },
  HARD: {
    reactionDelayMs: 40,
    smoothingFactor: 0.11,
    errorJitter: 2,
    maxTrackSpeed: PADDLE.SPEED,
  },
};
