import { AIConfig, AIDifficulty } from './aiTypes';
import { PADDLE } from '../game/constants';

export const DIFFICULTY_PRESETS: Record<AIDifficulty, AIConfig> = {
  // Removed duplicate EASY preset
  EASY: {
    reactionDelayMs: 200,
    smoothingFactor: 0.03,
    errorJitter: 25,
    maxTrackSpeed: PADDLE.SPEED * 0.7,
    mistakeChance: 0.20,
  },
  NORMAL: {
    reactionDelayMs: 100,
    smoothingFactor: 0.06,
    errorJitter: 12,
    maxTrackSpeed: PADDLE.SPEED * 0.9,
    mistakeChance: 0.08,
  },
  HARD: {
    reactionDelayMs: 50,
    smoothingFactor: 0.1,
    errorJitter: 5,
    maxTrackSpeed: PADDLE.SPEED,
    mistakeChance: 0.02,
  }
};
