export type Ball = { x: number; y: number; vx: number; vy: number; r: number };

// Utility: circle-rect collision (paddle as rect)
function circleRectIntersect(cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= r * r;
}

export function resetBall(W: number, H: number, initVx: number, initVyRange: number, radius: number, direction: number = 1): Ball {
  const vy = (Math.random() - 0.5) * initVyRange;
  return { x: W / 2, y: H / 2, vx: direction * initVx, vy, r: radius };
}

export function updateBall(ball: Ball, p1Y: number, p1H: number, p2Y: number, p2H: number, params: {
  W: number; H: number; ARENA_LEFT_X: number; ARENA_RIGHT_X_OFFSET: number; paddleW: number; BALL_SPEED_INC_FACTOR: number; BALL_MAX_SPEED: number
}) {
  const { W, H, ARENA_LEFT_X, ARENA_RIGHT_X_OFFSET, paddleW, BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED } = params;
  let scored: 'left' | 'right' | null = null;
  let lastHit: 1 | 2 | null = null;

  // advance
  ball.x += ball.vx;
  ball.y += ball.vy;

  // top/bottom bounce
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = -ball.vy; }
  if (ball.y + ball.r > H) { ball.y = H - ball.r; ball.vy = -ball.vy; }

  // paddles positions
  const leftPaddleX = ARENA_LEFT_X;
  const rightPaddleX = W - ARENA_RIGHT_X_OFFSET - paddleW;

  // left paddle collision
  if (ball.vx < 0 && circleRectIntersect(ball.x, ball.y, ball.r, leftPaddleX, p1Y, paddleW, p1H)) {
    // compute relative hit point (-1..1)
    const rel = ((ball.y - (p1Y + p1H / 2)) / (p1H / 2));
    const MAX_ANGLE = (60 * Math.PI) / 180; // 60deg
    const angle = rel * MAX_ANGLE;
    const speed = Math.min(Math.hypot(ball.vx, ball.vy) * BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED);
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    if (ball.vx < 1) ball.vx = Math.abs(ball.vx) + 1; // ensure forward
    lastHit = 1;
  }

  // right paddle collision
  if (ball.vx > 0 && circleRectIntersect(ball.x, ball.y, ball.r, rightPaddleX, p2Y, paddleW, p2H)) {
    const rel = ((ball.y - (p2Y + p2H / 2)) / (p2H / 2));
    const MAX_ANGLE = (60 * Math.PI) / 180;
    const angle = Math.PI - rel * MAX_ANGLE; // reflect
    const speed = Math.min(Math.hypot(ball.vx, ball.vy) * BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED);
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    if (ball.vx > -1) ball.vx = -Math.abs(ball.vx) - 1;
    lastHit = 2;
  }

  // scoring: when ball edge crosses left/right arena
  if (ball.x - ball.r < 0) scored = 'left';
  else if (ball.x + ball.r > W) scored = 'right';

  return { ball, lastHit, scored };
}
