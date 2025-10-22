"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keys = void 0;
exports.initInputHandlers = initInputHandlers;
exports.stopInputHandlers = stopInputHandlers;
exports.keys = new Set();
function initInputHandlers(onToggleRunning, onResetMatch, onAIPersistToggle) {
    window.addEventListener('keydown', (e) => {
        exports.keys.add(e.code);
        if (e.code === 'Space') {
            onToggleRunning();
        }
        if (e.code === 'KeyA') {
            onAIPersistToggle();
        }
        if (e.code === 'KeyR') {
            onResetMatch();
        }
    });
    window.addEventListener('keyup', (e) => exports.keys.delete(e.code));
}
function stopInputHandlers() {
    // no-op for now; could remove listeners if we stored references
}
//# sourceMappingURL=input.js.map