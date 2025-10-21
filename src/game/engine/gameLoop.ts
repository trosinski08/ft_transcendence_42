export function createRAFLoop(stepFn: () => void) {
  let running = false;
  let rafId: number | null = null;

  function loop() {
    if (!running) return;
    try { stepFn(); } catch (e) { console.error('Error in game loop step', e); }
    rafId = requestAnimationFrame(loop);
  }

  return {
    start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    },
    isRunning() { return running; }
  };
}
