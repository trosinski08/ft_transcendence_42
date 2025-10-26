import { AIConfig } from './aiTypes';
import { BALL, ARENA, PADDLE } from '../game/constants';

export interface BallState { x: number; y: number; vx: number; vy: number; r: number }
export interface PaddleState { y: number; height: number }

export function nextAIPaddleY(ball: BallState, ai: PaddleState, field: { width: number; height: number }, cfg: AIConfig, rightPaddleX: number): number {
  // Predict impact Y when ball moves towards the right; else follow current ball Y lazily
  let targetY = ball.y - ai.height / 2;
  if (ball.vx > 0) {
    const timeToReach = (rightPaddleX - ball.x) / Math.max(0.0001, ball.vx);
    targetY = ball.y + ball.vy * timeToReach - ai.height / 2;
  }
  // Clamp within arena bounds
  targetY = Math.max(ARENA.PADDING_TOP, Math.min(field.height - ARENA.PADDING_BOTTOM - ai.height, targetY));
  // Random AI mistake: chance to miss by a larger amount
  if (cfg.mistakeChance && Math.random() < cfg.mistakeChance) {
    const missDirection = Math.random() > 0.5 ? 1 : -1;
    const missAmount = (field.height / 3) * Math.random();
    targetY += missDirection * missAmount;
  }
  // Add jitter for non-perfect play
  if (cfg.errorJitter > 0) {
    targetY += (Math.random() - 0.5) * 2 * cfg.errorJitter;
  }
  // Smooth movement towards target
  const dy = targetY - ai.y;
  const step = dy * cfg.smoothingFactor;
  // Enforce max tracking speed (<= human speed)
  const clamped = Math.max(-cfg.maxTrackSpeed, Math.min(cfg.maxTrackSpeed, step));
  return ai.y + clamped;
}
