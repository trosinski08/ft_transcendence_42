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
  const newBall = { x: W / 2, y: H / 2, vx: direction * initVx, vy, r: radius };
  // ...existing code...
  return newBall;
}

export function updateBall(ball: Ball, p1Y: number, p1H: number, p2Y: number, p2H: number, params: {
  W: number; H: number; ARENA_LEFT_X: number; ARENA_RIGHT_X_OFFSET: number; ARENA_PADDING_TOP?: number; ARENA_PADDING_BOTTOM?: number; paddleW: number; BALL_SPEED_INC_FACTOR: number; BALL_MAX_SPEED: number
}) {
  const { W, H, ARENA_LEFT_X, ARENA_RIGHT_X_OFFSET, ARENA_PADDING_TOP = 0, ARENA_PADDING_BOTTOM = 0, paddleW, BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED } = params;
  // Diagnostic log for debugging arena and ball state
  // ...existing code...
  let scored: 'left' | 'right' | null = null;
  let lastHit: 1 | 2 | null = null;

  // Continuous-aware update: compute previous position then advance and
  // check whether the ball crossed a paddle plane between frames. This
  // prevents premature scoring when a fast ball should have hit the paddle.
  const prevX = ball.x;
  const prevY = ball.y;
  // advance
  ball.x += ball.vx;
  ball.y += ball.vy;

  // top/bottom bounce (now using ARENA_PADDING_TOP/BOTTOM)
  if (ball.y - ball.r < ARENA_PADDING_TOP) { ball.y = ARENA_PADDING_TOP + ball.r; ball.vy = -ball.vy; }
  if (ball.y + ball.r > H - ARENA_PADDING_BOTTOM) { ball.y = H - ARENA_PADDING_BOTTOM - ball.r; ball.vy = -ball.vy; }

  // paddles positions (rect left edges)
  const leftPaddleX = ARENA_LEFT_X;
  const rightPaddleX = W - ARENA_RIGHT_X_OFFSET - paddleW;

  // helper edges
  const newLeftEdge = ball.x - ball.r;
  const prevLeftEdge = prevX - ball.r;
  const newRightEdge = ball.x + ball.r;
  const prevRightEdge = prevX + ball.r;

  // LEFT: moving left and crossed paddle plane between frames?
  if (ball.vx < 0) {
    if (prevLeftEdge > leftPaddleX && newLeftEdge <= leftPaddleX) {
      // time fraction where collision plane is at x = leftPaddleX + r
      const denom = ball.vx;
      const t = denom !== 0 ? ((leftPaddleX + ball.r) - prevX) / denom : 0;
      const yAtCollision = prevY + ball.vy * t;
      if (yAtCollision >= p1Y && yAtCollision <= p1Y + p1H) {
        // reflect at collision point
        ball.x = leftPaddleX + ball.r;
        // compute outgoing based on hit position
        const rel = ((yAtCollision - (p1Y + p1H / 2)) / (p1H / 2));
        const MAX_ANGLE = (50 * Math.PI) / 180; // tuned angle
        const angle = rel * MAX_ANGLE;
        const speed = Math.min(Math.hypot(ball.vx, ball.vy) * BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED);
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        // Ensure ball always moves away from paddle
        if (vx <= 0) vx = Math.abs(vx) + 1;
        ball.vx = vx;
        ball.vy = vy;
        lastHit = 1;
      } else if (newLeftEdge <= 0) {
        // ball passed beyond left bound without hitting paddle -> score
        ball.x = ball.r;
        scored = 'left';
      }
    } else {
      // fallback: discrete collision at new position
      if (circleRectIntersect(ball.x, ball.y, ball.r, leftPaddleX, p1Y, paddleW, p1H)) {
        const rel = ((ball.y - (p1Y + p1H / 2)) / (p1H / 2));
        const MAX_ANGLE = (50 * Math.PI) / 180;
        const angle = rel * MAX_ANGLE;
        const speed = Math.min(Math.hypot(ball.vx, ball.vy) * BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED);
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        if (vx <= 0) vx = Math.abs(vx) + 1;
        ball.vx = vx;
        ball.vy = vy;
        lastHit = 1;
      }
    }
  }
  // Always check if ball is stuck or moving parallel at/behind left edge
  if (ball.x - ball.r <= 0) {
    ball.x = ball.r;
    scored = 'left';
  }

  // RIGHT: moving right and crossed paddle plane between frames?
  if (ball.vx > 0) {
    if (prevRightEdge < rightPaddleX && newRightEdge >= rightPaddleX) {
      const denom = ball.vx;
      const t = denom !== 0 ? ((rightPaddleX - ball.r) - prevX) / denom : 0;
      const yAtCollision = prevY + ball.vy * t;
      if (yAtCollision >= p2Y && yAtCollision <= p2Y + p2H) {
        ball.x = rightPaddleX - ball.r;
        const rel = ((yAtCollision - (p2Y + p2H / 2)) / (p2H / 2));
        const MAX_ANGLE = (50 * Math.PI) / 180;
        const angle = Math.PI - rel * MAX_ANGLE;
        const speed = Math.min(Math.hypot(ball.vx, ball.vy) * BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED);
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        // Ensure ball always moves away from paddle
        if (vx >= 0) vx = -Math.abs(vx) - 1;
        ball.vx = vx;
        ball.vy = vy;
        lastHit = 2;
      } else if (newRightEdge >= W) {
        ball.x = W - ball.r;
        scored = 'right';
      }
    } else {
      // fallback discrete collision
      if (circleRectIntersect(ball.x, ball.y, ball.r, rightPaddleX, p2Y, paddleW, p2H)) {
        const rel = ((ball.y - (p2Y + p2H / 2)) / (p2H / 2));
        const MAX_ANGLE = (50 * Math.PI) / 180;
        const angle = Math.PI - rel * MAX_ANGLE;
        const speed = Math.min(Math.hypot(ball.vx, ball.vy) * BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED);
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        if (vx >= 0) vx = -Math.abs(vx) - 1;
        ball.vx = vx;
        ball.vy = vy;
        lastHit = 2;
      }
    }
  }
  // Always check if ball is stuck or moving parallel at/behind right edge
  if (ball.x + ball.r >= W) {
    ball.x = W - ball.r;
    scored = 'right';
  }

  return { ball, lastHit, scored };
}
