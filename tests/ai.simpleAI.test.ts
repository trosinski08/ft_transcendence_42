import { nextAIPaddleY } from '../src/ai/simpleAI';
import { DIFFICULTY_PRESETS } from '../src/ai/difficultyPresets';

function approxEq(a: number, b: number, eps = 1e-6) { return Math.abs(a - b) <= eps; }

export function run(assert: (cond: any, msg?: string) => void) {
  const cfg = DIFFICULTY_PRESETS.NORMAL;
  const field = { width: 860, height: 420 };
  const rightX = 860 - 30 - 8; // W - ARENA.RIGHT_X_OFFSET - PADDLE.WIDTH (constants mirror)

  // Ball moving right should produce target near ball.y minus half paddle.
  const ai = { y: 200, height: 80 };
  const ball = { x: 430, y: 210, vx: 3, vy: 0, r: 6 };
  const next = nextAIPaddleY(ball, ai, field as any, cfg, rightX);
  assert(next >= 10 && next <= 420 - 10 - ai.height, 'AI next Y stays within arena vertical bounds');

  // Respect maxTrackSpeed (clamped step)
  const farBall = { x: 600, y: 410, vx: 5, vy: 0, r: 6 };
  const before = ai.y;
  const after = nextAIPaddleY(farBall, ai, field as any, cfg, rightX);
  assert(Math.abs(after - before) <= cfg.maxTrackSpeed + 0.001, 'AI step is limited by maxTrackSpeed');

  // When ball moves left, AI should follow lazily around current ball.y
  const leftBall = { x: 800, y: 100, vx: -2, vy: 0, r: 6 };
  const lazy = nextAIPaddleY(leftBall, ai, field as any, cfg, rightX);
  assert(lazy >= 10 && lazy <= 420 - 10 - ai.height, 'AI lazy follow stays within bounds');
}
