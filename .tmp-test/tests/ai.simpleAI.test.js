"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const simpleAI_1 = require("../src/ai/simpleAI");
const difficultyPresets_1 = require("../src/ai/difficultyPresets");
function approxEq(a, b, eps = 1e-6) { return Math.abs(a - b) <= eps; }
function run(assert) {
    const cfg = difficultyPresets_1.DIFFICULTY_PRESETS.NORMAL;
    const field = { width: 860, height: 420 };
    const rightX = 860 - 30 - 8; // W - ARENA.RIGHT_X_OFFSET - PADDLE.WIDTH (constants mirror)
    // Ball moving right should produce target near ball.y minus half paddle.
    const ai = { y: 200, height: 80 };
    const ball = { x: 430, y: 210, vx: 3, vy: 0, r: 6 };
    const next = (0, simpleAI_1.nextAIPaddleY)(ball, ai, field, cfg, rightX);
    assert(next >= 10 && next <= 420 - 10 - ai.height, 'AI next Y stays within arena vertical bounds');
    // Respect maxTrackSpeed (clamped step)
    const farBall = { x: 600, y: 410, vx: 5, vy: 0, r: 6 };
    const before = ai.y;
    const after = (0, simpleAI_1.nextAIPaddleY)(farBall, ai, field, cfg, rightX);
    assert(Math.abs(after - before) <= cfg.maxTrackSpeed + 0.001, 'AI step is limited by maxTrackSpeed');
    // When ball moves left, AI should follow lazily around current ball.y
    const leftBall = { x: 800, y: 100, vx: -2, vy: 0, r: 6 };
    const lazy = (0, simpleAI_1.nextAIPaddleY)(leftBall, ai, field, cfg, rightX);
    assert(lazy >= 10 && lazy <= 420 - 10 - ai.height, 'AI lazy follow stays within bounds');
}
