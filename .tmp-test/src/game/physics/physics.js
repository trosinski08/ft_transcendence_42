"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetBall = resetBall;
exports.updateBall = updateBall;
// Utility: circle-rect collision (paddle as rect)
function circleRectIntersect(cx, cy, r, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= r * r;
}
function resetBall(W, H, initVx, initVyRange, radius, direction = 1) {
    const vy = (Math.random() - 0.5) * initVyRange;
    return { x: W / 2, y: H / 2, vx: direction * initVx, vy, r: radius };
}
function updateBall(ball, p1Y, p1H, p2Y, p2H, params) {
    const { W, H, ARENA_LEFT_X, ARENA_RIGHT_X_OFFSET, paddleW, BALL_SPEED_INC_FACTOR, BALL_MAX_SPEED } = params;
    let scored = null;
    let lastHit = null;
    // advance
    ball.x += ball.vx;
    ball.y += ball.vy;
    // top/bottom bounce
    if (ball.y - ball.r < 0) {
        ball.y = ball.r;
        ball.vy = -ball.vy;
    }
    if (ball.y + ball.r > H) {
        ball.y = H - ball.r;
        ball.vy = -ball.vy;
    }
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
        if (ball.vx < 1)
            ball.vx = Math.abs(ball.vx) + 1; // ensure forward
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
        if (ball.vx > -1)
            ball.vx = -Math.abs(ball.vx) - 1;
        lastHit = 2;
    }
    // scoring: when ball edge crosses left/right arena
    if (ball.x - ball.r < 0)
        scored = 'left';
    else if (ball.x + ball.r > W)
        scored = 'right';
    return { ball, lastHit, scored };
}
//# sourceMappingURL=physics.js.map