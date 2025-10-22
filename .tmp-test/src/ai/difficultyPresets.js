"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIFFICULTY_PRESETS = void 0;
const constants_1 = require("../game/constants");
exports.DIFFICULTY_PRESETS = {
    EASY: {
        reactionDelayMs: 140,
        smoothingFactor: 0.06,
        errorJitter: 18,
        maxTrackSpeed: Math.max(3, constants_1.PADDLE.SPEED - 2),
    },
    NORMAL: {
        reactionDelayMs: 80,
        smoothingFactor: 0.08,
        errorJitter: 8,
        maxTrackSpeed: constants_1.PADDLE.SPEED,
    },
    HARD: {
        reactionDelayMs: 40,
        smoothingFactor: 0.11,
        errorJitter: 2,
        maxTrackSpeed: constants_1.PADDLE.SPEED,
    },
};
//# sourceMappingURL=difficultyPresets.js.map