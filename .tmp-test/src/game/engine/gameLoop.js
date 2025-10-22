"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRAFLoop = createRAFLoop;
function createRAFLoop(stepFn) {
    let running = false;
    let rafId = null;
    function loop() {
        if (!running)
            return;
        try {
            stepFn();
        }
        catch (e) {
            console.error('Error in game loop step', e);
        }
        rafId = requestAnimationFrame(loop);
    }
    return {
        start() {
            if (running)
                return;
            running = true;
            rafId = requestAnimationFrame(loop);
        },
        stop() {
            running = false;
            if (rafId != null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        },
        isRunning() { return running; }
    };
}
//# sourceMappingURL=gameLoop.js.map