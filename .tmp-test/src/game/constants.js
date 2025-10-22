"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RULES = exports.BALL = exports.PADDLE = exports.ARENA = void 0;
exports.ARENA = {
    PADDING_TOP: 10,
    PADDING_BOTTOM: 10,
    LEFT_X: 30,
    RIGHT_X_OFFSET: 30,
};
exports.PADDLE = {
    WIDTH: 8,
    HEIGHT: 80,
    SPEED: 6,
};
exports.BALL = {
    RADIUS: 6,
    INIT_SPEED_X: 3,
    INIT_SPEED_Y_RANGE: 4,
    SPEED_INC_FACTOR: 1.03,
    MAX_SPEED: 11,
};
exports.RULES = {
    WIN_SCORE: 11,
};
//# sourceMappingURL=constants.js.map